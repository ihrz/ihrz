use super::*;

/// Wlroles list command.
#[poise::command(
    prefix_command,
    category = "utils",
    rename = "wlroles-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn wlroles_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    show_wlroles_list(&ctx).await
}
