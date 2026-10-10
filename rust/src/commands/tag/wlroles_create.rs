use super::*;

/// Roles whitelist for creating tags.
// Gap note (O3, documented): TS `!wlroles-create.ts` shows an
// interactive multi-select panel — role picker (`max 25`, current
// list as defaults), `ManageRoles` gate + hierarchy warning on
// collect, save-confirm button, 240s collectors disabled on end —
// which has no poise prefix/slash dispatch equivalent. This keeps
// the single-role toggle leg (present -> removed, absent -> added,
// whole-list rewrite on save) against `whitelist_create`.
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
