use super::*;

/// Custom the bot profile in your discord server.
#[poise::command(
    slash_command,
    prefix_command,
    category = "profil",
    rename = "custom",
    subcommands("custom_name", "custom_avatar", "custom_banner", "custom_bio"),
    subcommand_required,
    description_localized("fr", "Customiser le profil du bot sur le serveur Discord"),
    description_localized("ja", "Discordサーバーでボットのプロフィールをカスタマイズ"),
    description_localized("ru", "Настроить профиль бота на вашем сервере"),
    description_localized("es-ES", "Personalizar el perfil del bot en tu servidor de Discord")
)]
pub async fn custom(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Diverges from checkCustomSdkGate on purpose: TS has the paywall call commented out.
    Ok(())
}

pub use super::avatar::custom_avatar;
pub use super::banner::custom_banner;
pub use super::bio::custom_bio;
pub use super::name::custom_name;
