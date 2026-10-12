use crate::bot::Ctx;

/// Change the bot prefix on the guild
#[poise::command(
    prefix_command,
    category = "bot",
    rename = "prefix",
    aliases("setprefix", "changeprefix"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Changer le préfixe du bot sur le serveur"),
    description_localized("ja", "サーバーのボットプレフィックスを変更"),
    description_localized("ru", "Изменить префикс бота на сервере"),
    description_localized("es-ES", "Cambiar el prefijo del bot en el servidor")
)]
// Thin top-level wrapper over the !prefix.ts run (see
// MessageCommands/bot/@prefix.ts): same ADMIN gate + aliases as the
// nested setprefix leaf, whose shared run it delegates to.
pub async fn prefix_top(
    ctx: Ctx<'_>,
    #[description = "New prefix (max 4 chars) or 'mention' to revert"] prefix: Option<String>,
) -> Result<(), anyhow::Error> {
    // TS `!prefix.ts` message path reads `string(args, 0)` (undefined
    // with no args) into the `change` branch, which replies the
    // specify-prefix message — mirror that instead of a poise arg error.
    crate::commands::guildconfig::prefix::run_prefix_change(ctx, prefix.unwrap_or_default()).await
}
