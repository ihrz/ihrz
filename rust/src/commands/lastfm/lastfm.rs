use super::*;
use super::{config::lastfm_config, login::lastfm_login};

/// Connect your Last.fm account and control music scrobbling.
#[poise::command(
    slash_command,
    prefix_command,
    category = "lastfm",
    rename = "lastfm",
    subcommands("lastfm_config", "lastfm_login"),
    subcommand_required,
    description_localized("fr", "Connectez votre compte Last.fm et gérez le scrobbling musical."),
    description_localized("ja", "Last.fmアカウントを接続してスクロブルを管理。"),
    description_localized("ru", "Подключите аккаунт Last.fm и управляйте скробблингом."),
    description_localized(
        "es-ES",
        "Conecta tu cuenta de Last.fm y controla el scrobbling de música."
    )
)]
pub async fn lastfm(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
