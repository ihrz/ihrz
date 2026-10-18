#[allow(unused_imports)]
use super::{entry::*, helpers::*, scope::*, store::*};
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// Add a user to the blacklist!
// FLATTEN-B2: top-level slash command (TS `blacklist.ts`, flat
// /blacklist with aliases ["bl"]); no longer nested under `owner`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "blacklist",
    aliases("bl"),
    description_localized("fr", "Ajoutez un utilisateur à la liste noir"),
    description_localized("ja", "ユーザーをブラックリストに追加！"),
    description_localized("ru", "Добавить пользователя в черный список!"),
    description_localized("es-ES", "Añadir un usuario a la lista negra!")
)]
pub async fn blacklist(
    ctx: Ctx<'_>,
    #[description = "The user you want to blacklist..."]
    #[description_localized("fr", "L'utilisateur que vous voulez blacklist")]
    #[description_localized("ja", "ブラックリストに入れたいユーザー...")]
    #[description_localized("ru", "Пользователь, которого вы хотите добавить в черный список...")]
    #[description_localized("es-ES", "El usuario que quieres poner en lista negra...")]
    user: Option<crate::reply_user::ReplyUser>,
    // Rest-of-line like TS `longString(args, 1)`: multi-word reasons
    // survive prefix parsing (same `#[rest]` pattern as fun/catsay).
    // Slash use is unaffected (`#[rest]` is prefix-only).
    #[description = "The reason why you want to blacklist this member"]
    #[description_localized(
        "fr",
        "La raison de pourquoi vous voulez le mettre dans la liste-noire"
    )]
    #[description_localized("ja", "このメンバーをブラックリストに入れる理由")]
    #[description_localized("ru", "Причина добавления в черный список")]
    #[description_localized(
        "es-ES",
        "La razón por la que quieres poner en lista negra a este miembro"
    )]
    #[rest]
    reason: Option<String>,
) -> Result<(), anyhow::Error> {
    blacklist_inner(ctx, user, reason).await
}

async fn blacklist_inner(
    ctx: Ctx<'_>,
    user: Option<crate::reply_user::ReplyUser>,
    reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    // Neither bot nor guild owner: TS `blacklist.ts` top-level `run`
    // returns silently (if/else-if with no else). Same TS shape as the
    // HZ66 `+unblacklist` live proof, so test must match.
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let no = no_emoji(&ctx).await;
    match scope {
        OwnerScope::Bot => {
            let entries = bl_list(&ctx.data().pool).await;
            let Some(target) = user else {
                if entries.is_empty() {
                    // TS sends the empty list with `flags: [1 << 6]` (ephemeral).
                    ctx.send(
                        poise::CreateReply::default()
                            .content(
                                lt(
                                    &code,
                                    "blacklist_no_one_blacklist",
                                    "${client.iHorizon_Emojis.No} No blacklisted users found!",
                                )
                                .replace("${client.iHorizon_Emojis.No}", &no),
                            )
                            .ephemeral(true),
                    )
                    .await?;
                    return Ok(());
                }
                return send_bl_pager(&ctx, &code, &entries).await;
            };
            // Mirrors the `isBotDev` guard in TS `run_for_bot_owner`.
            if is_bot_dev(&ctx.data().config.owners, target.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            let self_id = ctx.serenity_context().cache.current_user().id;
            if target.id == self_id {
                ctx.say(lt(&code, "blacklist_bot_lol", "Can't blacklist myself x)"))
                    .await?;
                return Ok(());
            }
            if bl_get(&ctx.data().pool, target.id.get()).await.is_some() {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_already_blacklisted",
                        "${member.user.username} is already blacklisted!",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
                return Ok(());
            }
            let full_reason = format!(
                "iHorizon Project Blacklist - {}",
                reason.unwrap_or_else(|| "blacklisted!".to_string())
            );
            // TS stores `{blacklisted,reason,owner,createdAt}`.
            bl_set(
                &ctx.data().pool,
                target.id.get(),
                &bl_entry_json(&full_reason, ctx.author().id.get(), crate::bot::now_ms()),
            )
            .await?;
            if let Some(gid) = ctx.guild_id() {
                if gid
                    .ban_with_reason(ctx.http(), target.id, 0, &full_reason)
                    .await
                    .is_ok()
                {
                    ctx.say(
                        lt(
                            &code,
                            "blacklist_command_work",
                            "${member.user.username} is now blacklisted",
                        )
                        .replace("${member.user.username}", &display_name(&target)),
                    )
                    .await?;
                } else {
                    ctx.say(lt(
                            &code,
                            "blacklist_blacklisted_but_can_ban_him",
                            "${client.iHorizon_Emojis.No} is now blacklisted. I can't ban this member here, missing permission?",
                        )
                        .replace("${client.iHorizon_Emojis.No}", &no),
                    )
                    .await?;
                }
            } else {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_command_work",
                        "${member.user.username} is now blacklisted",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
            }
            // Cross-guild sweep with progress + final shard report.
            // TS names the plain `member.user.username` when the target
            // is a cached guild member, and `globalName || username`
            // otherwise (targetUser branch) — mirror that split here.
            let sweep_name = if ctx
                .guild_id()
                .and_then(|gid| {
                    ctx.serenity_context()
                        .cache
                        .guild(gid)
                        .map(|g| g.members.contains_key(&target.id))
                })
                .unwrap_or(false)
            {
                target.name.clone()
            } else {
                display_name(&target)
            };
            ctx.say(
                lt(
                    &code,
                    "batch_ban_process",
                    "🔄 Banning ${member.user.username} in progress on ${guilds.length} servers...",
                )
                .replace("${member.user.username}", &sweep_name)
                .replace("${guilds.length}", "all shards"),
            )
            .await?;
            let (total_success, total_guilds) =
                sweep_ban(&ctx, target.id.get(), &full_reason).await;
            let score = format!("{total_success}/{total_guilds}");
            ctx.say(lt(
                    &code,
                    "blacklist_command_work_shard",
                    "✅ ${username} banned on **${totalSuccess}** server(s) across all shards (`{score}`)",
                )
                .replace("{score}", &score)
                // TS names the plain `member.user.username` here for cached
                // guild members and `globalName || username` otherwise
                // (see `sweep_name` above).
                .replace("{username}", &sweep_name)
                .replace("${totalSuccess}", &total_success.to_string()),
            )
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            let entries = gbl_list(&ctx.data().pool, &gid_s).await;
            let Some(target) = user else {
                if entries.is_empty() {
                    // TS sends the empty list with `flags: [1 << 6]` (ephemeral).
                    ctx.send(
                        poise::CreateReply::default()
                            .content(
                                lt(
                                    &code,
                                    "blacklist_no_one_blacklist",
                                    "${client.iHorizon_Emojis.No} No blacklisted users found!",
                                )
                                .replace("${client.iHorizon_Emojis.No}", &no),
                            )
                            .ephemeral(true),
                    )
                    .await?;
                    return Ok(());
                }
                return send_bl_pager(&ctx, &code, &entries).await;
            };
            // Mirrors the `guild.ownerId` guard in TS `run_for_guild_owner`.
            if discord_owner_id(&ctx, gid) == Some(target.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            let self_id = ctx.serenity_context().cache.current_user().id;
            if target.id == self_id {
                ctx.say(lt(&code, "blacklist_bot_lol", "Can't blacklist myself x)"))
                    .await?;
                return Ok(());
            }
            if gbl_get(&ctx.data().pool, &gid_s, target.id.get())
                .await
                .is_some()
            {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_already_blacklisted",
                        "${member.user.username} is already blacklisted!",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
                return Ok(());
            }
            let full_reason = format!(
                "Blacklist - {}",
                reason.unwrap_or_else(|| "blacklisted!".to_string())
            );
            gbl_set(
                &ctx.data().pool,
                &gid_s,
                target.id.get(),
                &bl_entry_json(&full_reason, ctx.author().id.get(), crate::bot::now_ms()),
            )
            .await?;
            if gid
                .ban_with_reason(ctx.http(), target.id, 0, &full_reason)
                .await
                .is_ok()
            {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_command_work",
                        "${member.user.username} is now blacklisted",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
            } else {
                ctx.say(lt(
                        &code,
                        "blacklist_blacklisted_but_can_ban_him",
                        "${client.iHorizon_Emojis.No} is now blacklisted. I can't ban this member here, missing permission?",
                    )
                    .replace("${client.iHorizon_Emojis.No}", &no),
                )
                .await?;
            }
            Ok(())
        }
    }
}
