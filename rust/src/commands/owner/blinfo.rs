#[allow(unused_imports)]
use super::{entry::*, helpers::*, scope::*, store::*};
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// Show informations about blacklisted user!
// FLATTEN-B2: top-level slash command (TS `blinfo.ts`, flat
// /blinfo); no longer nested under `owner`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "blinfo",
    aliases("blacklistinfo", "lookbl", "blook"),
    description_localized("fr", "Afficher des informations sur un utilisateur blacklisté"),
    description_localized("ja", "ブラックリストユーザーの情報を表示！"),
    description_localized("ru", "Показать информацию о пользователе в черном списке!"),
    description_localized("es-ES", "Mostrar información sobre el usuario en la lista negra!")
)]
pub async fn blinfo(
    ctx: Ctx<'_>,
    #[description = "The user you want to look at..."]
    #[description_localized("fr", "L'utilisateur que vous voulez obtenir ces informations de bl")]
    #[description_localized("ja", "確認したいユーザー...")]
    #[description_localized("ru", "Пользователь, которого вы хотите посмотреть...")]
    #[description_localized("es-ES", "El usuario que quieres mirar...")]
    user: serenity::User,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let unknown = lt(&code, "profil_unknown", "Unknown");
    let no_reason = lt(&code, "blacklist_var_no_reason", "No reason found");
    let denied = lt(
        &code,
        "unblacklist_not_blacklisted",
        "<@${member.id}> was not blacklisted",
    )
    .replace("${member.id}", &user.id.get().to_string());
    match scope {
        OwnerScope::Bot => {
            // TS answers the not-blacklisted message for devs too.
            if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
                ctx.say(denied).await?;
                return Ok(());
            }
            let Some(raw) = bl_raw(&ctx.data().pool, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            send_blinfo_embed(&ctx, &user, &parse_bl_entry(&raw), &unknown, &no_reason).await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
                ctx.say(denied).await?;
                return Ok(());
            }
            let gid_s = gid.get().to_string();
            let Some(raw) = gbl_raw(&ctx.data().pool, &gid_s, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            send_blinfo_embed(&ctx, &user, &parse_bl_entry(&raw), &unknown, &no_reason).await?;
            Ok(())
        }
    }
}
