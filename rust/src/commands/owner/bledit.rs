#[allow(unused_imports)]
use super::{entry::*, helpers::*, scope::*, store::*};
use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// edit blacklist reason
// Mirrors !bledit.ts (kept out of the doc comment so poise does not
// publish the internal note as the slash-command description).
// FLATTEN-B2: top-level slash command (TS `bledit.ts`, flat
// /bledit); no longer nested under `owner`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "bledit",
    aliases("blacklistedit", "editbl"),
    description_localized("fr", "modifier la raison d'un blacklist"),
    description_localized("ja", "ブラックリスト理由を編集"),
    description_localized("ru", "изменить причину черного списка"),
    description_localized("es-ES", "editar razón de lista negra")
)]
pub async fn bledit(
    ctx: Ctx<'_>,
    #[description = "The user you want to edit the reason"]
    #[description_localized(
        "fr",
        "L'utilisateur que vous souhaitez modifier la raison de sont blacklist"
    )]
    #[description_localized("ja", "理由を編集したいユーザー")]
    #[description_localized("ru", "Пользователь, для которого нужно изменить причину")]
    #[description_localized("es-ES", "El usuario del que quieres editar la razón")]
    user: serenity::User,
    // Rest-of-line like TS `longString(args, 1)` (see blacklist).
    #[description = "the new reason"]
    #[description_localized("fr", "la nouvelle raison")]
    #[description_localized("ja", "新しい理由")]
    #[description_localized("ru", "новая причина")]
    #[description_localized("es-ES", "la nueva razón")]
    #[rest]
    new_reason: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let denied = lt(
        &code,
        "unblacklist_not_blacklisted",
        "<@${member.id}> was not blacklisted",
    )
    .replace("${member.id}", &user.id.get().to_string());
    // TS answers the not-blacklisted message for devs in both scopes.
    if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
        ctx.say(denied).await?;
        return Ok(());
    }
    let full_reason = format!("iHorizon Project Blacklist - {}", new_reason.trim());
    let unknown = lt(&code, "profil_unknown", "Unknown");
    let no_reason = lt(&code, "blacklist_var_no_reason", "No reason found");
    // Verdict: TS writes the reason leaf BEFORE the existence check
    // (`blacklistTable.set(`${id}.reason`)` then `if (!userObj)`), so a
    // bledit on a non-listed user still plants a partial row. Kept fixed
    // deliberately — both legs below check existence first and write
    // nothing for missing users.
    match scope {
        OwnerScope::Bot => {
            let Some(raw) = bl_raw(&ctx.data().pool, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            let updated = bl_entry_with_reason(&raw, &full_reason);
            bl_set(&ctx.data().pool, user.id.get(), &updated).await?;
            send_blinfo_embed(&ctx, &user, &parse_bl_entry(&updated), &unknown, &no_reason).await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            let Some(raw) = gbl_raw(&ctx.data().pool, &gid_s, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            let updated = bl_entry_with_reason(&raw, &full_reason);
            gbl_set(&ctx.data().pool, &gid_s, user.id.get(), &updated).await?;
            send_blinfo_embed(&ctx, &user, &parse_bl_entry(&updated), &unknown, &no_reason).await?;
            Ok(())
        }
    }
}
