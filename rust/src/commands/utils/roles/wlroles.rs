use super::*;

/// Define allowed roles for addrole & delrole command
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles",
    aliases("wlrole"),
    default_member_permissions = "ADMINISTRATOR"
)]
// List the whitelisted roles panel. Mirrors !wlroles.ts.
// Embed uses `utils_wlroles_embed_title`/`desc` with the `<@&id>`
// field (`setjoinroles_var_none` fallback); add/remove flow lives in
// `wlroles-add`, which carries the dangerous-permission and
// hierarchy guards.
pub async fn wlroles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    show_wlroles_list(&ctx).await
}
