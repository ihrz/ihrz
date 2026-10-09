use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "wlroles-create",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn tag_wl_create(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    toggle_tag_wl(&ctx, "whitelist_create", role).await
}
