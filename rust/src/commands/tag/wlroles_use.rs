use super::*;

/// Whitelist roles for tag use/create.
// Gap note (O3, documented): TS `!wlroles-use.ts` shows an
// interactive multi-select panel — role picker (`max 25`, current
// list as defaults), `ManageRoles` gate + hierarchy warning on
// collect, save-confirm button, 240s collectors disabled on end —
// which has no poise prefix/slash dispatch equivalent. This keeps
// the single-role toggle leg (present -> removed, absent -> added,
// whole-list rewrite on save) against `whitelist_use`.
// Verdict (kept): single-role toggle only; the multi-select panel in
// `HybridCommands/tag/!wlroles-use.ts` is intentionally unported.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wlroles-use",
    aliases("tag-wluse"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Rôles whitelist pour utiliser les tags"),
    description_localized("ja", "タグ使用用のホワイトリストロール"),
    description_localized("ru", "Белый список ролей для использования тегов"),
    description_localized("es-ES", "Roles de lista blanca para usar etiquetas")
)]
pub async fn tag_wl_use(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    toggle_tag_wl(&ctx, "whitelist_use", role).await
}
