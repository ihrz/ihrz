use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-to-give",
    default_member_permissions = "ADMINISTRATOR"
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
