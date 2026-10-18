#[allow(unused_imports)]
use super::{entry::*, helpers::*, scope::*, store::*};
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

async fn owner_remove_inner(ctx: Ctx<'_>, user: serenity::User) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    // Neither bot nor guild owner: TS `unowner.ts` top-level `run` returns
    // silently (if/else-if with no else). Verified live HZ66: prod silent
    // on `+unblacklist`, same TS shape here, so test must match.
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let done = lt(
        &code,
        "unowner_command_work",
        "${member.username} is no longer an owner",
    )
    .replace("${member.username}", &user.name);
    match scope {
        OwnerScope::Bot => {
            // Mirrors the `isBotDev` guard in TS `run_for_bot_owner`.
            if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            crate::db::remove_bot_owner(&ctx.data().pool, user.id.get()).await?;
            ctx.say(done).await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            // Mirrors the `guild.ownerId` guard in TS `run_for_guild_owner`.
            if discord_owner_id(&ctx, gid) == Some(user.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            crate::db::remove_guild_owner(&ctx.data().pool, &gid.get().to_string(), user.id.get())
                .await?;
            ctx.say(done).await?;
            Ok(())
        }
    }
}
/// The member who wants to delete of the owner list (Only Owner of ihorizon)!
// Top-level old spelling (unowner); flat TS-exact form (no subcommands).
// FLATTEN-B2: blacklist, unblacklist, blinfo, bledit and eval are
// top-level slash commands now (exact TS names, registered in
// crate::commands::all()). Only `unowner` remains a thin delegate
// restoring the old surface (forwards to the body). `bl` lives as
// a prefix alias (aliases: ["bl"] on flat /blacklist), never as its
// own slash command (A1).
#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "unowner",
    description_localized(
        "fr",
        "Le membre que vous souhaitez supprimer de la liste des propriétaires (uniquement pour les dev)"
    ),
    description_localized(
        "ja",
        "オーナーリストから削除したいメンバー（iHorizonオーナーのみ）！"
    ),
    description_localized(
        "ru",
        "Участник для удаления из списка владельцев (Только владелец iHorizon)!"
    ),
    description_localized(
        "es-ES",
        "El miembro que quiere eliminar de la lista de propietarios (Solo propietario de iHorizon)!"
    )
)]
pub async fn unowner_alias(
    ctx: Ctx<'_>,
    #[description = "The member who wants to delete of the owner list"]
    #[description_localized(
        "fr",
        "Le membre que vous souhaitez supprimer de la liste des propriétaires"
    )]
    #[description_localized("ja", "オーナーリストから削除したいメンバー")]
    #[description_localized("ru", "Участник для удаления из списка владельцев")]
    #[description_localized("es-ES", "El miembro que quiere eliminar de la lista de propietarios")]
    // TS HybridCommands/owner/unowner.ts registers "member".
    #[rename = "member"]
    user: serenity::User,
) -> Result<(), anyhow::Error> {
    owner_remove_inner(ctx, user).await
}
