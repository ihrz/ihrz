use super::tempvoice_select::handle_tempvoice_select;
use super::*;

/// Dashboard button handler. Called from events_handler interaction_create.
pub async fn handle_tempvoice_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(action) = comp.data.custom_id.strip_prefix(TEMPVOICE_PREFIX) else {
        return Ok(());
    };
    if action.ends_with("-select") {
        return handle_tempvoice_select(ctx, comp, pool).await;
    }
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let user_id = comp.user.id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    // Interface-channel guard (mirrors `result.interface?.channelId !==
    // interaction.channelId → deferUpdate` in every temporary_voice_*
    // button): presses from any other text channel are ignored.
    let panel_ch = interface_channel_id(pool, &gid).await;
    if panel_ch.as_deref() != Some(comp.channel_id.get().to_string().as_str()) {
        ack_press(ctx, comp).await;
        return Ok(());
    }
    // Button target: the presser's live voice channel (mirrors
    // `member.voice.channel`), never the interaction text channel.
    // Ownership below is the presser's own row matching that channel
    // (mirrors `getChannelOwner !== targetedChannel?.id → deferUpdate`).
    let Some(target) = presser_voice(ctx, guild_id, comp.user.id) else {
        ack_press(ctx, comp).await;
        return Ok(());
    };
    let target_s = target.get().to_string();
    let temps = load_temps(pool, &gid).await;
    let owned = owned_channel_id(&temps, &user_id).as_deref() == Some(target_s.as_str());
    match action {
        "claim" => {
            // Full claim flow (mirrors temporary_voice_claim_button.ts):
            // the presser's channel must be a temp channel whose
            // recorded owner has left it; the claimer must sit in voice.
            let Some(prev_uid) = temps
                .iter()
                .find(|(_, ch)| *ch == target_s)
                .map(|(u, _)| u.clone())
            else {
                ack_press(ctx, comp).await;
                return Ok(());
            };
            let Ok(prev_num) = prev_uid.parse::<u64>() else {
                ack_press(ctx, comp).await;
                return Ok(());
            };
            // Previous owner still inside their channel: nothing to claim.
            if presser_voice(ctx, guild_id, serenity::UserId::new(prev_num)) == Some(target) {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            // Slow leg: prior-channel fetch/delete, DB moves, rename and
            // permission swaps are 3+ sequential DB/HTTP roundtrips before
            // the first response. Defer now (component idiom for the
            // ctx.defer precedent: ticket create Defer+edit_response) so
            // the 3s window never blows; the receipt edits below.
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Defer(
                    serenity::CreateInteractionResponseMessage::new().ephemeral(true),
                ),
            )
            .await?;
            // The claimer's own prior channel: refuse while it is still
            // occupied, otherwise delete it and drop the row (mirrors
            // the existingOwnedChannel leg).
            if let Some(prior) = owned_channel_id(&temps, &user_id) {
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
                        &format!("CUSTOM_VOICE.{gid}.{user_id}"),
                    )
                    .await;
                }
            }
            // Move the DB key from the previous owner to the claimer.
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{prev_uid}"),
            )
            .await;
            let _ = crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                &crate::events::temp_voice_key(guild_id.get(), comp.user.id.get()),
                &target_s,
            )
            .await;
            // Rename for the new owner (`displayName || username`).
            rename_for(
                pool,
                &gid,
                &lang_code,
                &ctx.http,
                target,
                comp.user.display_name(),
            )
            .await;
            // Swap overwrites: the previous owner loses theirs, the
            // claimer gets the full owner set.
            let _ = target
                .delete_permission(
                    &ctx.http,
                    serenity::PermissionOverwriteType::Member(serenity::UserId::new(prev_num)),
                )
                .await;
            let _ = target
                .create_permission(
                    &ctx.http,
                    serenity::PermissionOverwrite {
                        allow: owner_voice_allow(),
                        deny: serenity::Permissions::empty(),
                        kind: serenity::PermissionOverwriteType::Member(comp.user.id),
                    },
                )
                .await;
            // Claim receipt (mirrors the TS new/old-owner embed).
            let embed = claim_transfer_embed(
                &lang_code,
                pool,
                &gid,
                &format!("<@{}>", comp.user.id.get()),
                &format!("<@{prev_uid}>"),
            )
            .await;
            // Deferred above: edit the thinking reply with the receipt.
            comp.edit_response(
                &ctx.http,
                serenity::EditInteractionResponse::new().embed(embed),
            )
            .await?;
        }
        "delete" => {
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            // Slow leg: channel delete + DB drop + banner fetch before the
            // first response. Defer now; the receipt edits below.
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Defer(
                    serenity::CreateInteractionResponseMessage::new().ephemeral(true),
                ),
            )
            .await?;
            let _ = target.delete(&ctx.http).await;
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{user_id}"),
            )
            .await;
            let embed = serenity::CreateEmbed::default()
                .description(
                    crate::lang::get(&lang_code, "temporary_voice_delete_button_desc_embed")
                        .unwrap_or_default(),
                )
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await);
            // Deferred above: edit the thinking reply with the receipt.
            comp.edit_response(
                &ctx.http,
                serenity::EditInteractionResponse::new().embed(embed),
            )
            .await?;
        }
        "privacy" => {
            // Privacy menu with the 6 TS options (lock/unlock,
            // invisible/visible, closechat/openchat). Mirrors
            // temporary_voice_privacy_button.ts.
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let opt = |label_key: &str, desc_key: &str, value: &str| {
                serenity::CreateSelectMenuOption::new(
                    crate::lang::get(&lang_code, label_key).unwrap_or_default(),
                    value.to_string(),
                )
                .description(crate::lang::get(&lang_code, desc_key).unwrap_or_default())
            };
            let options = vec![
                opt(
                    "temporary_voice_privacy_menu_lock_label",
                    "temporary_voice_privacy_menu_lock_desc",
                    PRIVACY_LOCK,
                ),
                opt(
                    "temporary_voice_privacy_menu_unlock_label",
                    "temporary_voice_privacy_menu_unlock_desc",
                    PRIVACY_UNLOCK,
                ),
                opt(
                    "temporary_voice_privacy_menu_invisible_label",
                    "temporary_voice_privacy_menu_invisible_desc",
                    PRIVACY_INVISIBLE,
                ),
                opt(
                    "temporary_voice_privacy_menu_visible_label",
                    "temporary_voice_privacy_menu_visible_desc",
                    PRIVACY_VISIBLE,
                ),
                opt(
                    "temporary_voice_privacy_menu_closechat_label",
                    "temporary_voice_privacy_menu_closechat_desc",
                    PRIVACY_CLOSECHAT,
                ),
                opt(
                    "temporary_voice_privacy_menu_openchat_label",
                    "temporary_voice_privacy_menu_openchat_desc",
                    PRIVACY_OPENCHAT,
                ),
            ];
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_PRIVACY_SELECT,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_privacy_menu_placeholder")
                    .unwrap_or_default(),
            );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "region" => {
            // Region menu with the 14 TS options. Mirrors
            // temporary_voice_region_button.ts (owner gate + menu).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let options: Vec<serenity::CreateSelectMenuOption> = VOICE_REGIONS
                .iter()
                .map(|(label, value)| {
                    serenity::CreateSelectMenuOption::new(label.to_string(), value.to_string())
                })
                .collect();
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_REGION_SELECT,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_region_menu_placeholder")
                    .unwrap_or_default(),
            );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "block" | "unblock" => {
            // Block menu: selected members get deny overwrites; unblock
            // shares the shape (mirrors temporary_voice_unblock_button.ts,
            // whose added members get the same deny set while removed ones
            // are cleared, like the block collector).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let (custom_id, placeholder_key, placeholder_fb) = if action == "block" {
                (
                    TEMPVOICE_BLOCK_SELECT,
                    "temporary_voice_block_button_menu_placeholder",
                    "Selected users will be untrusted to join",
                )
            } else {
                (
                    TEMPVOICE_UNBLOCK_SELECT,
                    "temporary_voice_transfer_unblocked_placeholder",
                    "Selected users will be unblocked to join",
                )
            };
            let menu = serenity::CreateSelectMenu::new(
                custom_id,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, placeholder_key)
                    .unwrap_or_else(|| placeholder_fb.to_string()),
            )
            .min_values(0)
            .max_values(10);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "trust" | "untrust" => {
            // Trust menu: selected members get full allow overwrites;
            // untrust removes them. Mirrors
            // temporary_voice_trust_button.ts (+ untrust variant).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let custom_id = if action == "trust" {
                TEMPVOICE_TRUST_SELECT
            } else {
                TEMPVOICE_UNTRUST_SELECT
            };
            let menu = serenity::CreateSelectMenu::new(
                custom_id,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_transfer_trust_placeholder")
                    .unwrap_or_default(),
            )
            .min_values(0)
            .max_values(10);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "transfer" => {
            // Member picker for the new owner (mirrors the
            // `temporary_voice_transfer_selectmenue` user-select menu;
            // the follow-up runs in handle_tempvoice_select).
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_TRANSFER_SELECT,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_transfer_menu_placeholder")
                    .unwrap_or_default(),
            )
            .min_values(1)
            .max_values(1);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "name" | "limit" => {
            if !owned {
                ack_press(ctx, comp).await;
                return Ok(());
            }
            // TS modal bounds: name 2-20, limit 1-20; title/label from
            // lang (no hardcoded strings).
            let (modal_id, label_key, max_len, min_len) = if action == "name" {
                (
                    "tempvoice-name",
                    "temporary_voice_name_button_menu_label",
                    20,
                    2,
                )
            } else {
                (
                    "tempvoice-limit",
                    "temporary_voice_limit_button_menu_label",
                    20,
                    1,
                )
            };
            let modal_title =
                crate::lang::get(&lang_code, "temporary_voice_modal_title").unwrap_or_default();
            let modal_label = crate::lang::get(&lang_code, label_key).unwrap_or_default();
            let mut modal_opts = crate::modal_helper::ModalOptions::new(&modal_title, modal_id);
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "value".to_string(),
                        label: modal_label,
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(max_len),
                        min_length: Some(min_len),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) = crate::commands::await_modal_submit(ctx, comp, modal_id).await
            else {
                return Ok(());
            };
            let reply = |embed: serenity::CreateEmbed| {
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                )
            };
            let value = crate::modal_helper::text_value(&submit, "value");
            if action == "name" {
                let raw = value.clone();
                let _ = target
                    .edit(
                        &ctx.http,
                        serenity::EditChannel::new().name(crate::funcs::mask_link(raw.trim())),
                    )
                    .await;
                let emoji = crate::emojis::app_emoji_markup(&ctx.http, "VC_Name")
                    .await
                    .unwrap_or_default();
                let embed = receipt_embed(
                    &lang_code,
                    pool,
                    &gid,
                    "temporary_voice_new_name",
                    format!("{emoji} **{}**", raw.trim()),
                )
                .await;
                let _ = submit.create_response(ctx, reply(embed)).await;
            } else if let Some(limit) = parse_limit(&value) {
                let _ = target
                    .edit(&ctx.http, serenity::EditChannel::new().user_limit(limit))
                    .await;
                let emoji = crate::emojis::app_emoji_markup(&ctx.http, "VC_Limit")
                    .await
                    .unwrap_or_default();
                let embed = receipt_embed(
                    &lang_code,
                    pool,
                    &gid,
                    "temporary_voice_new_userlimit",
                    format!("{emoji} **{}**", value.trim()),
                )
                .await;
                let _ = submit.create_response(ctx, reply(embed)).await;
            } else {
                // `if (!userLimit)` reject (0 / not a number), like TS.
                let tpl = crate::lang::get(&lang_code, "temporary_voice_limit_button_not_integer")
                    .unwrap_or_default();
                let no = crate::emojis::app_emoji_markup(&ctx.http, "No")
                    .await
                    .unwrap_or_default();
                let content = tpl.replace("${interaction.client.iHorizon_Emojis.No}", &no);
                let _ = submit
                    .create_response(
                        ctx,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(content)
                                .ephemeral(true),
                        ),
                    )
                    .await;
            }
        }
        _ => {}
    }
    Ok(())
}
