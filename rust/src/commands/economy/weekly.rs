use super::*;

/// Claim your weekly reward!
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "weekly",
    description_localized("fr", "Réclamez une récompense hebdomadaire"),
    description_localized("ja", "ウィークリー報酬を獲得！"),
    description_localized("ru", "Получить еженедельную награду!"),
    description_localized("es-ES", "Reclamar una recompensa semanal!")
)]
// Mirrors economy !weekly.ts.
pub async fn eco_weekly(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    claim_inner(
        &ctx,
        &ClaimText {
            kind: "weekly",
            title_key: "weekly_embed_title",
            desc_key: "weekly_embed_description",
            fields_key: "weekly_embed_fields",
            cooldown_key: "weekly_cooldown_error",
        },
        false,
    )
    .await
}
