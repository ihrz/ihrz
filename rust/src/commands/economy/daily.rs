use super::*;

/// Mirrors `!daily.ts`.
/// Claim daily reward. Mirrors economy !daily.ts.
#[poise::command(slash_command, prefix_command, category = "economy", rename = "daily")]
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
