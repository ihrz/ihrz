use super::*;

/// Follow-up select menus posted by the block/trust/untrust/privacy
/// buttons. Mirrors the TS message collectors in
/// temporary_voice_{block,trust,privacy}_button.ts (owner gate +
/// overwrite sync + summary embed).
pub async fn handle_tempvoice_select(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let self_id = comp.user.id.get().to_string();
    // Select target: the presser's live voice channel (mirrors
    // `member.voice.channel`), never the interaction text channel.
    // Ownership is the presser's own row matching that channel.
    let Some(voice_id) = presser_voice(ctx, guild_id, comp.user.id) else {
        ack_press(ctx, comp).await;
        return Ok(());
    };
    let temps = load_temps(pool, &gid).await;
    if owned_channel_id(&temps, &self_id).as_deref() != Some(voice_id.get().to_string().as_str()) {
        ack_press(ctx, comp).await;
        return Ok(());
    }
    let target_s = voice_id.get().to_string();
    let current: Vec<String> = match voice_id.to_channel(&ctx.http).await {
        Ok(serenity::Channel::Guild(gc)) => gc
            .permission_overwrites
            .iter()
            .filter_map(|o| match o.kind {
                serenity::PermissionOverwriteType::Member(uid) => Some(uid.get().to_string()),
                _ => None,
            })
            .collect(),
        _ => vec![],
    };
    let no_one = crate::lang::get(&lang_code, "temporary_voice_no_one").unwrap_or_default();
    let list = |ids: &[String]| {
        if ids.is_empty() {
            no_one.clone()
        } else {
            ids.iter()
                .map(|id| format!("<@{id}>"))
                .collect::<Vec<_>>()
                .join(" ")
        }
    };
    match comp.data.custom_id.as_str() {
        TEMPVOICE_TRUST_SELECT
        | TEMPVOICE_UNTRUST_SELECT
        | TEMPVOICE_BLOCK_SELECT
        | TEMPVOICE_UNBLOCK_SELECT => {
            let selected: Vec<String> = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::UserSelect { values } => {
                    values.iter().map(|u| u.get().to_string()).collect()
                }
                _ => vec![],
            };
            let (added, removed) = sync_members(&selected, &current, &self_id);
            for id in &removed {
                if let Ok(uid) = id.parse::<u64>() {
                    let _ = voice_id
                        .delete_permission(
                            &ctx.http,
                            serenity::PermissionOverwriteType::Member(serenity::UserId::new(uid)),
                        )
                        .await;
                }
            }
            let is_block = matches!(
                comp.data.custom_id.as_str(),
                TEMPVOICE_BLOCK_SELECT | TEMPVOICE_UNBLOCK_SELECT
            );
            for id in &added {
                if let Ok(uid) = id.parse::<u64>() {
                    let (allow, deny) = if is_block {
                        (
                            serenity::Permissions::VIEW_CHANNEL,
                            serenity::Permissions::SEND_MESSAGES
                                | serenity::Permissions::ADD_REACTIONS
                                | serenity::Permissions::CONNECT
                                | serenity::Permissions::SPEAK,
                        )
                    } else {
                        (
                            serenity::Permissions::VIEW_CHANNEL
                                | serenity::Permissions::CONNECT
                                | serenity::Permissions::SPEAK
                                | serenity::Permissions::STREAM
                                | serenity::Permissions::SEND_MESSAGES
                                | serenity::Permissions::READ_MESSAGE_HISTORY
                                | serenity::Permissions::ATTACH_FILES
                                | serenity::Permissions::USE_APPLICATION_COMMANDS,
                            serenity::Permissions::empty(),
                        )
                    };
                    let _ = voice_id
                        .create_permission(
                            &ctx.http,
                            serenity::PermissionOverwrite {
                                allow,
                                deny,
                                kind: serenity::PermissionOverwriteType::Member(
                                    serenity::UserId::new(uid),
                                ),
                            },
                        )
                        .await;
                }
            }
            // Field mapping mirrors the TS summary embeds verbatim
            // (block: added -> unblocked field, removed -> blocked field).
            let title =
                crate::lang::get(&lang_code, "temporary_voice_title_embec").unwrap_or_default();
            let (first_key, second_key) = if is_block {
                (
                    "temporary_voice_unblocked_member",
                    "temporary_voice_blocked_mmeber",
                )
            } else {
                (
                    "temporary_voice_untrusted_member",
                    "temporary_voice_trusted_member",
                )
            };
            let (first_val, second_val) = if is_block {
                (list(&added), list(&removed))
            } else {
                (list(&removed), list(&added))
            };
            let embed = serenity::CreateEmbed::default()
                .description(title)
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, first_key).unwrap_or_default(),
                    first_val,
                    false,
                )
                .field(
                    crate::lang::get(&lang_code, second_key).unwrap_or_default(),
                    second_val,
                    false,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_PRIVACY_SELECT => {
            let value = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => String::new(),
            };
            let Some((allow_bits, deny_bits)) = privacy_rule(&value) else {
                return Ok(());
            };
            let allow = serenity::Permissions::from_bits_truncate(allow_bits);
            let deny = serenity::Permissions::from_bits_truncate(deny_bits);
            let _ = voice_id
                .create_permission(
                    &ctx.http,
                    serenity::PermissionOverwrite {
                        allow,
                        deny,
                        kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(
                            guild_id.get(),
                        )),
                    },
                )
                .await;
            let label_key = match value.as_str() {
                PRIVACY_LOCK => "temporary_voice_privacy_menu_lock_label",
                PRIVACY_UNLOCK => "temporary_voice_privacy_menu_unlock_label",
                PRIVACY_INVISIBLE => "temporary_voice_privacy_menu_invisible_label",
                PRIVACY_VISIBLE => "temporary_voice_privacy_menu_visible_label",
                PRIVACY_CLOSECHAT => "temporary_voice_privacy_menu_closechat_label",
                _ => "temporary_voice_privacy_menu_openchat_label",
            };
            // Receipt mirrors the TS switch replies: the option label as
            // field name, `{VC_*} **Yes**` as value, and the
            // `temporary_voice_title_embec` description (whose en-US text
            // is exactly the TS hardcoded description).
            let receipt_emoji =
                crate::emojis::app_emoji_markup(&ctx.http, privacy_receipt_emoji(&value))
                    .await
                    .unwrap_or_default();
            let embed = serenity::CreateEmbed::default()
                .description(
                    crate::lang::get(&lang_code, "temporary_voice_title_embec").unwrap_or_default(),
                )
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, label_key).unwrap_or_default(),
                    format!("{receipt_emoji} **Yes**"),
                    true,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_REGION_SELECT => {
            // Apply the picked RTC region to the owner's temp channel.
            // Mirrors the starter-menu collector (setRTCRegion + summary).
            let value = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => String::new(),
            };
            if !VOICE_REGIONS.iter().any(|(_, v)| *v == value) {
                return Ok(());
            }
            let target = voice_id;
            let _ = target
                .edit(
                    &ctx.http,
                    serenity::EditChannel::new().voice_region(Some(value.clone())),
                )
                .await;
            let region_emoji = crate::emojis::app_emoji_markup(&ctx.http, "VC_Region")
                .await
                .unwrap_or_default();
            let embed = serenity::CreateEmbed::default()
                .description(
                    crate::lang::get(&lang_code, "temporary_voice_title_embec").unwrap_or_default(),
                )
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, "temporary_voice_new_region").unwrap_or_default(),
                    format!("{region_emoji} **{value}**"),
                    true,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_TRANSFER_SELECT => {
            // New-owner picker follow-up (mirrors the
            // `temporary_voice_transfer_selectmenue` collector): the
            // picked member must sit in the owner's channel; their own
            // prior channel is refused while occupied, else deleted;
            // then the DB key moves, the channel is renamed and the
            // overwrites swap from the old owner to the new one.
            let new_owner: Option<u64> = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::UserSelect { values } => {
                    values.first().map(|u| u.get())
                }
                _ => None,
            };
            let Some(new_owner) = new_owner else {
                ack_press(ctx, comp).await;
                return Ok(());
            };
            if presser_voice(ctx, guild_id, serenity::UserId::new(new_owner)) != Some(voice_id) {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let new_owner_s = new_owner.to_string();
            if let Some(prior) = owned_channel_id(&temps, &new_owner_s) {
                if prior != target_s {
                    if let Ok(prior_num) = prior.parse::<u64>() {
                        let prior_ch = serenity::ChannelId::new(prior_num);
                        if fetch_voice_channel(&ctx.http, prior_ch).await.is_some()
                            && voice_occupants(ctx, guild_id, prior_ch) > 0
                        {
                            ack_press(ctx, comp).await;
                            return Ok(());
                        }
                        let _ = prior_ch.delete(&ctx.http).await;
                    }
                    let _ = crate::commands::owner::main::routed_del(
                        pool,
                        &gid,
                        &gid,
                        &format!("CUSTOM_VOICE.{gid}.{new_owner_s}"),
                    )
                    .await;
                }
            }
            // Slow leg: DB moves, user fetch, rename and permission swaps
            // are 3+ sequential DB/HTTP roundtrips before the first
            // response. Defer now; the receipt edits below.
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Defer(
                    serenity::CreateInteractionResponseMessage::new().ephemeral(true),
                ),
            )
            .await?;
            // Move the DB key from the old owner to the new one.
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{self_id}"),
            )
            .await;
            let _ = crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                &crate::events::temp_voice_key(guild_id.get(), new_owner),
                &target_s,
            )
            .await;
            // Rename for the new owner (`displayName || username`).
            if let Ok(user) = serenity::UserId::new(new_owner).to_user(&ctx.http).await {
                rename_for(
                    pool,
                    &gid,
                    &lang_code,
                    &ctx.http,
                    voice_id,
                    user.display_name(),
                )
                .await;
            }
            // Swap overwrites: the old owner loses theirs, the new
            // owner gets the full owner set.
            let _ = voice_id
                .delete_permission(
                    &ctx.http,
                    serenity::PermissionOverwriteType::Member(comp.user.id),
                )
                .await;
            let _ = voice_id
                .create_permission(
                    &ctx.http,
                    serenity::PermissionOverwrite {
                        allow: owner_voice_allow(),
                        deny: serenity::Permissions::empty(),
                        kind: serenity::PermissionOverwriteType::Member(serenity::UserId::new(
                            new_owner,
                        )),
                    },
                )
                .await;
            let embed = claim_transfer_embed(
                &lang_code,
                pool,
                &gid,
                &format!("<@{new_owner}>"),
                &format!("<@{}>", comp.user.id.get()),
            )
            .await;
            // Deferred above: edit the thinking reply with the receipt.
            comp.edit_response(
                &ctx.http,
                serenity::EditInteractionResponse::new().embed(embed),
            )
            .await?;
        }
        _ => {}
    }
    Ok(())
}
