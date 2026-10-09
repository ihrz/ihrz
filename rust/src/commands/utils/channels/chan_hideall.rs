use super::*;

/// Hide/unhide every text channel. Mirrors chanel hideall/unhideall.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hideall",
    aliases("masquer-tout"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn chan_hideall(
    ctx: Ctx<'_>,
    #[description = "Role, defaults to @everyone"] role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| ctx.guild_id().map(|g| g.get()).unwrap_or_default());
    hide_all_inner(&ctx, false, role_id).await
}
