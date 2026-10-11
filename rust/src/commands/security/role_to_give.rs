use super::*;
use poise::serenity_prelude as serenity;

/// The role that will be given to new member(s) when process to the Captcha verification!
// Verdict (ADMINISTRATOR default, kept): mirrors the TS per-leg
// `permission: Administrator` gate (`security.ts`, role-to-give leg).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-to-give",
    default_member_permissions = "ADMINISTRATOR",
    name_localized("fr", "role-à-donner"),
    name_localized("ja", "role-to-give"),
    name_localized("ru", "role-to-give"),
    name_localized("es-ES", "role-to-give"),
    description_localized("fr", "Le rôle qui sera attribué aux nouveaux membre(s) lors du processus de vérification Captcha"),
    description_localized("ja", "キャプチャ認証時に新規メンバーに付与されるロール！"),
    description_localized("ru", "Роль, которая будет выдана новым участникам при прохождении капчи!"),
    description_localized("es-ES", "El rol que se dará a los nuevos miembros cuando pasen la verificación Captcha!"),
)]
pub async fn security_give(
    ctx: Ctx<'_>,
    #[description = "Role to give"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    save_security_string(
        &ctx.data().pool,
        &gid,
        "SECURITY.role",
        &role.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "security_role_to_give_command_work")
        .map(|s| {
            s.replace("${interaction.user}", &ctx.author().to_string())
                .replace("${role}", &format!("<@&{}>", role.id.get()))
        })
        .unwrap_or_else(|| {
            "${interaction.user}, you have set the role to ${role} for the Security Module!"
                .to_string()
        });
    ctx.say(msg).await?;
    Ok(())
}
