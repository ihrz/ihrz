#[allow(unused_imports)]
use super::{entry::*, helpers::*, scope::*, store::*};
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// The user you want to unblacklist (Only Owner of ihorizon)!
// FLATTEN-B2: top-level slash command (TS `unblacklist.ts`, flat
// /unblacklist with aliases ["unbl"], standalone hybrid); no longer
// nested under `owner`. Replaces `unblacklist_alias`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "unblacklist",
    aliases("unbl"),
    description_localized(
        "fr",
        "Enlever un utilisateur de la liste noir.(Seulement pour les dev)"
    ),
    description_localized("ja", "ブラックリストから解除したいユーザー（iHorizonオーナーのみ）！"),
    description_localized(
        "ru",
        "Пользователь для удаления из черного списка (Только владелец iHorizon)!"
    ),
    description_localized(
        "es-ES",
        "El usuario que quieres quitar de la lista negra (Solo propietario de iHorizon)!"
    )
)]
pub async fn unblacklist(
    ctx: Ctx<'_>,
    #[description = "The user you want to unblacklist (Only Owner of ihorizon)"]
    #[description_localized(
        "fr",
        "L'utilisateur que vous souhaitez supprimer de la liste noire (uniquement propriétaire d'ihorizon)"
    )]
    #[description_localized("ja", "ブラックリストから解除したいユーザー（iHorizonオーナーのみ）")]
    #[description_localized(
        "ru",
        "Пользователь для удаления из черного списка (Только владелец iHorizon)"
    )]
    #[description_localized(
        "es-ES",
        "El usuario que quieres quitar de la lista negra (Solo propietario de iHorizon)"
    )]
    user: serenity::User,
) -> Result<(), anyhow::Error> {
    unblacklist_inner(ctx, user).await
}

async fn unblacklist_inner(ctx: Ctx<'_>, user: serenity::User) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    // Neither bot nor guild owner: TS `unblacklist.ts` top-level `run`
    // returns silently (if/else-if with no else). Verified live HZ66:
    // prod `+unblacklist <@member>` silent, test must match.
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let no = no_emoji(&ctx).await;
    let not_listed = lt(
        &code,
        "unblacklist_not_blacklisted",
        "<@${member.id}> was not blacklisted",
    )
    .replace("${member.id}", &user.id.get().to_string());
    match scope {
        OwnerScope::Bot => {
            let Some(raw) = bl_raw(&ctx.data().pool, user.id.get()).await else {
                ctx.say(not_listed).await?;
                return Ok(());
            };
            let entry = parse_bl_entry(&raw);
            // Transphobia refusal (hardcoded in TS, no YAML key).
            if entry
                .reason
                .as_deref()
                .map(is_transphobia_reason)
                .unwrap_or(false)
            {
                ctx.say(format!("{no}{TRANSPHOBIA_REFUSAL}")).await?;
                return Ok(());
            }
            let fetched = match serenity::UserId::new(user.id.get())
                .to_user(ctx.http())
                .await
            {
                Ok(u) => u,
                Err(_) => {
                    ctx.say(lt(
                        &code,
                        "unblacklist_user_is_not_exist",
                        "I couldn't find the user.",
                    ))
                    .await?;
                    return Ok(());
                }
            };
            bl_del(&ctx.data().pool, user.id.get()).await?;
            let unbanned_here = match ctx.guild_id() {
                Some(gid) => gid.unban(ctx.http(), user.id).await.is_ok(),
                None => true,
            };
            if unbanned_here {
                ctx.say(
                    lt(
                        &code,
                        "unblacklist_command_work",
                        "<@${member.id}> is no longer blacklisted",
                    )
                    .replace("${member.id}", &user.id.get().to_string()),
                )
                .await?;
            } else {
                ctx.say(lt(
                        &code,
                        "unblacklist_unblacklisted_but_can_unban_him",
                        "${client.iHorizon_Emojis.No} has been removed from the blacklist, but I can't unban this member here; missing permission or already unbanned?",
                    )
                    .replace("${client.iHorizon_Emojis.No}", &no),
                )
                .await?;
            }
            // Cross-guild sweep with progress + final shard report.
            ctx.say(lt(
                    &code,
                    "batch_unblacklist_process",
                    "🔄 Unblacklisting ${bannedMember.username} from ${guildObjects.length} servers in progress...",
                )
                .replace("${bannedMember.username}", &fetched.name)
                .replace("${guildObjects.length}", "all shards"),
            )
            .await?;
            let (total_success, total_guilds) = sweep_unban(&ctx, user.id.get()).await;
            let score = format!("{total_success}/{total_guilds}");
            ctx.say(lt(
                    &code,
                    "unblacklist_command_work_across_all_shard",
                    "✅ ${bannedMember.username} is now unbanned on **${totalSuccess}** server(s) across all shards (`${score}`)",
                )
                .replace("${bannedMember.username}", &fetched.name)
                .replace("${totalSuccess}", &total_success.to_string())
                .replace("${score}", &score),
            )
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            // TS deletes before fetching (`client.db.delete(...)` doubles
            // as the existence check), so the row is already gone when the
            // later user fetch fails. Mirror that delete-first order here.
            if !gbl_del(&ctx.data().pool, &gid_s, user.id.get()).await? {
                ctx.say(not_listed).await?;
                return Ok(());
            }
            if serenity::UserId::new(user.id.get())
                .to_user(ctx.http())
                .await
                .is_err()
            {
                ctx.say(lt(
                    &code,
                    "unblacklist_user_is_not_exist",
                    "I couldn't find the user.",
                ))
                .await?;
                return Ok(());
            }
            // Row already deleted above (delete-first); TS's second delete
            // here is a no-op.
            if gid.unban(ctx.http(), user.id).await.is_ok() {
                ctx.say(
                    lt(
                        &code,
                        "unblacklist_command_work",
                        "<@${member.id}> is no longer blacklisted",
                    )
                    .replace("${member.id}", &user.id.get().to_string()),
                )
                .await?;
            } else {
                ctx.say(lt(
                        &code,
                        "unblacklist_unblacklisted_but_can_unban_him",
                        "${client.iHorizon_Emojis.No} has been removed from the blacklist, but I can't unban this member here; missing permission or already unbanned?",
                    )
                    .replace("${client.iHorizon_Emojis.No}", &no),
                )
                .await?;
            }
            Ok(())
        }
    }
}
