use super::*;

/// Banner parent. Mirrors utils banner/banner.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner",
    subcommands("banner_user", "banner_server"),
    subcommand_required,
    description_localized(
        "fr",
        "Récuperer la bannière des éléments spécifiés (serveur/utilisateur)"
    ),
    description_localized("ja", "指定されたもののバナーを取得（サーバー/ユーザー）"),
    description_localized("ru", "Взять баннер указанного объекта (Сервер/Пользователь)"),
    description_localized("es-ES", "Tomar el banner de cosas especificadas (Servidor/Usuario)")
)]
pub async fn banner(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
