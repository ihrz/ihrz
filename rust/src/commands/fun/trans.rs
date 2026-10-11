use super::*;

/// Measure a member's trans rate!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "trans",
    description_localized("fr", "Affiche au combien tu es trans"),
    description_localized("ja", "あなたのトランス度を表示"),
    description_localized("ru", "Показать, насколько вы транс"),
    description_localized("es-ES", "Mostrar qué tan trans eres")
)]
// Mirrors !trans.ts (random 0-99, fun_trans_command_ok).
pub async fn trans(
    ctx: Ctx<'_>,
    #[description_localized("fr", "l'user")]
    #[description_localized("ja", "ユーザー")]
    #[description_localized("ru", "пользователь")]
    #[description_localized("es-ES", "el usuario")]
    #[description = "Member"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!trans.ts`: no fun_guard here.
    percent_user(
        &ctx,
        user,
        "fun_trans_command_ok",
        "The user ${user} is **${random}%** transgender 🏳️‍⚧️",
    )
    .await
}

#[cfg(test)]
mod trans_tests {
    #[test]
    fn fallback_carries_both_tokens() {
        let fb = "The user ${user} is **${random}%** transgender 🏳️‍⚧️";
        assert!(fb.contains("${user}"));
        assert!(fb.contains("${random}"));
    }
}
