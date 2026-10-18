#[allow(unused_imports)]
use super::{entry::*, helpers::*, scope::*, store::*};
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// add user to owner list (can't be used by normal member)!
#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "owner",
    aliases("addowner", "owneradd", "owners", "ownerlist"),
    description_localized(
        "fr",
        "Ajoutez un membre dans la liste des propriétaire de iHorizon. (Seulement pour les dev)"
    ),
    description_localized("ja", "ユーザーをオーナーリストに追加（一般メンバーは使用不可）！"),
    description_localized(
        "ru",
        "Добавить пользователя в список владельцев (не для обычных участников)!"
    ),
    description_localized(
        "es-ES",
        "Añadir usuario a la lista de propietarios (no puede ser usado por miembros normales)!"
    )
)]
pub async fn owner(
    ctx: Ctx<'_>,
    #[description = "The member you want to made owner of the iHorizon Projects"]
    #[description_localized(
        "fr",
        "Le membre que vous souhaitez rendre propriétaire des projets iHorizon"
    )]
    #[description_localized("ja", "iHorizonプロジェクトのオーナーにしたいメンバー")]
    #[description_localized(
        "ru",
        "Участник, которого вы хотите сделать владельцем проектов iHorizon"
    )]
    #[description_localized(
        "es-ES",
        "El miembro que quieres hacer propietario de los proyectos iHorizon"
    )]
    // TS HybridCommands/owner/owner.ts registers "member".
    #[rename = "member"]
    user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    // Neither bot nor guild owner: TS `run` returns silently (no reply).
    // Verified live WAVE-20261015N: prod `+owner` silent, test must match.
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    match scope {
        OwnerScope::Bot => {
            let owners =
                crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
            let Some(target) = user else {
                let gid_s = ctx
                    .guild_id()
                    .map(|g| g.get().to_string())
                    .unwrap_or_default();
                let (footer_name, footer_bytes) =
                    crate::commands::utils::footer_parts(&ctx, &gid_s).await;
                let mut reply = poise::CreateReply::default().embed(owners_embed(
                    "Owners [Bot]",
                    &owners,
                    &footer_name,
                    footer_bytes.is_some(),
                ));
                if let Some(bytes) = footer_bytes {
                    reply = reply
                        .attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
                }
                ctx.send(reply).await?;
                return Ok(());
            };
            if owners.iter().any(|o| o == &target.id.get().to_string()) {
                ctx.say(lt(
                    &code,
                    "owner_already_owner",
                    "This user is already an owner!",
                ))
                .await?;
                return Ok(());
            }
            crate::db::add_bot_owner(&ctx.data().pool, target.id.get()).await?;
            ctx.say(
                lt(
                    &code,
                    "owner_is_now_owner",
                    "${member.user.username} is now an owner of the iHorizon Project!",
                )
                .replace("${member.user.username}", &display_name(&target)),
            )
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            let owners =
                crate::db::guild_owner_ids(&ctx.data().pool, &gid_s, discord_owner_id(&ctx, gid))
                    .await;
            let Some(target) = user else {
                let (footer_name, footer_bytes) =
                    crate::commands::utils::footer_parts(&ctx, &gid_s).await;
                let mut reply = poise::CreateReply::default().embed(owners_embed(
                    "Owners [Guild]",
                    &owners,
                    &footer_name,
                    footer_bytes.is_some(),
                ));
                if let Some(bytes) = footer_bytes {
                    reply = reply
                        .attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
                }
                ctx.send(reply).await?;
                return Ok(());
            };
            if owners.iter().any(|o| o == &target.id.get().to_string()) {
                ctx.say(lt(
                    &code,
                    "owner_already_owner",
                    "This user is already an owner!",
                ))
                .await?;
                return Ok(());
            }
            crate::db::add_guild_owner(&ctx.data().pool, &gid_s, target.id.get()).await?;
            ctx.say(
                lt(
                    &code,
                    "owner_is_now_owner",
                    "${member.user.username} is now an owner of the iHorizon Project!",
                )
                .replace("${member.user.username}", &display_name(&target)),
            )
            .await?;
            Ok(())
        }
    }
}
