use super::*;

/// Show how much stench you are
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "stench",
    aliases("odeur", "odeurs", "puanteurs", "puanteur", "arf", "pue"),
    description_localized("fr", "Affiche au combien tu pue"),
    description_localized("ja", "あなたの臭さ度を表示"),
    description_localized("ru", "Показать, насколько вы вонючий"),
    description_localized("es-ES", "Mostrar qué tan apestoso eres")
)]
// Mirrors fun !stench.ts.
pub async fn stench(
    ctx: Ctx<'_>,
    #[description_localized("fr", "l'user")]
    #[description_localized("ja", "ユーザー")]
    #[description_localized("ru", "пользователь")]
    #[description_localized("es-ES", "el usuario")]
    #[description = "the user"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!stench.ts`: no fun_guard here.
    percent_user(
        &ctx,
        user,
        "fun_stench_command_ok",
        "The user ${user} is **${random}%** stinky 👃🛀",
    )
    .await
}
