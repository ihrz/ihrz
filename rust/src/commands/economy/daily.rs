use super::*;

/// Claim a daily reward!
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "daily",
    description_localized("fr", "Réclamez une récompense quotidienne"),
    description_localized("ja", "デイリー報酬を獲得！"),
    description_localized("ru", "Получить ежедневную награду!"),
    description_localized("es-ES", "Reclamar una recompensa diaria!")
)]
// Mirrors economy !daily.ts.
pub async fn eco_daily(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    claim_inner(
        &ctx,
        &ClaimText {
            kind: "daily",
            title_key: "daily_embed_title",
            desc_key: "daily_embed_description",
            fields_key: "daily_embed_fields",
            cooldown_key: "daily_cooldown_error",
        },
        false,
    )
    .await
}
