use super::*;

/// Define allowed roles for addrole & delrole command
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles",
    aliases("wlrole"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir les rôles autorisés pour les commandes addrole et delrole"
    ),
    description_localized("ja", "addrole と delrole コマンドの許可ロールを定義"),
    description_localized("ru", "Определить разрешенные роли для команд addrole и delrole"),
    description_localized(
        "es-ES",
        "Definir roles permitidos para los comandos addrole y delrole"
    )
)]
// List the whitelisted roles panel. Mirrors !wlroles.ts.
// Embed uses `utils_wlroles_embed_title`/`desc` with the `<@&id>`
// field (`setjoinroles_var_none` fallback); add/remove flow lives in
// `wlroles-add`, which carries the dangerous-permission and
// hierarchy guards.
pub async fn wlroles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    show_wlroles_list(&ctx).await
}
