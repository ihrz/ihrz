use super::*;

/// Claim your monthly reward!
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "monthly"
)]
// Mirrors economy !monthly.ts.
pub async fn eco_monthly(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    claim_inner(
        &ctx,
        &ClaimText {
            kind: "monthly",
            title_key: "monthly_embed_title",
            desc_key: "monthly_embed_description",
            fields_key: "monthly_embed_fields",
            cooldown_key: "monthly_cooldown_error",
        },
        false,
    )
    .await
}
