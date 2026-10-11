use super::*;
use poise::serenity_prelude as serenity;

/// The role that will be removed to new member(s) when process to the Captcha verification!
// Verdict (ADMINISTRATOR default, kept): mirrors the TS per-leg
// `permission: Administrator` gate (`security.ts`, role-to-remove leg).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-to-remove",
    default_member_permissions = "ADMINISTRATOR",
    name_localized("fr", "role-à-enlever"),
    name_localized("ja", "role-to-remove"),
    name_localized("ru", "role-to-remove"),
    name_localized("es-ES", "role-to-remove"),
    description_localized(
        "fr",
        "Le rôle qui sera enlevé aux nouveaux membre(s) lors du processus de vérification Captcha"
    ),
    description_localized("ja", "キャプチャ認証時に新規メンバーから削除されるロール！"),
    description_localized(
        "ru",
        "Роль, которая будет снята с новых участников при прохождении капчи!"
    ),
    description_localized(
        "es-ES",
        "El rol que se quitará a los nuevos miembros cuando pasen la verificación Captcha!"
    )
)]
pub async fn security_remove(
    ctx: Ctx<'_>,
    #[description = "Role to remove"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    save_security_string(
        &ctx.data().pool,
        &gid,
        "SECURITY.role2",
        &role.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "security_role_to_give_command_work")
            .map(|s| {
                s.replace("${role}", &format!("<@&{}>", role.id.get()))
                    .replace("${interaction.user}", &ctx.author().to_string())
            })
            .unwrap_or_else(|| {
                "${interaction.user}, you have set the role to ${role} for the Security Module!"
                    .to_string()
            }),
    )
    .await?;
    Ok(())
}
