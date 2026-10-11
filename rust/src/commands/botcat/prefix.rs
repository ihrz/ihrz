use crate::bot::Ctx;

/// Change the bot prefix on the guild.
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
    #[description = "New prefix (max 4 chars) or 'mention' to revert"] prefix: String,
) -> Result<(), anyhow::Error> {
    crate::commands::guildconfig::prefix::run_prefix_change(ctx, prefix).await
}
