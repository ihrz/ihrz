use super::*;

/// Mirrors `!weekly.ts`.
/// Claim weekly reward. Mirrors economy !weekly.ts.
#[poise::command(slash_command, prefix_command, category = "economy", rename = "weekly")]
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
