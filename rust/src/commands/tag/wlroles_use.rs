use super::*;

/// Whitelist roles for tag use/create.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wlroles-use",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn tag_wl_use(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    toggle_tag_wl(&ctx, "whitelist_use", role).await
}
