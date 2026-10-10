use super::*;

/// Whitelist roles for tag use/create.
// Gap note (O3, documented): TS `!wlroles-use.ts` shows an
// interactive multi-select panel — role picker (`max 25`, current
// list as defaults), `ManageRoles` gate + hierarchy warning on
// collect, save-confirm button, 240s collectors disabled on end —
// which has no poise prefix/slash dispatch equivalent. This keeps
// the single-role toggle leg (present -> removed, absent -> added,
// whole-list rewrite on save) against `whitelist_use`.
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
