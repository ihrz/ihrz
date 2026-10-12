use super::*;

/// Show how gay you are
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "gay",
    description_localized("fr", "Affiche au combien tu es gay"),
    description_localized("ja", "あなたのゲイ度を表示"),
    description_localized("ru", "Показать, насколько вы гей"),
    description_localized("es-ES", "Mostrar qué tan gay eres")
)]
// Mirrors fun !gay.ts.
pub async fn gay(
    ctx: Ctx<'_>,
    #[description_localized("fr", "l'user")]
    #[description_localized("ja", "ユーザー")]
    #[description_localized("ru", "пользователь")]
    #[description_localized("es-ES", "el usuario")]
    #[description = "the user"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!gay.ts`: no fun_guard here.
    percent_user(
        &ctx,
        user,
        "fun_gay_command_ok",
        "The user ${user} is **${random}%** gay 🏳️‍🌈",
    )
    .await
}
