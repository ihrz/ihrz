use super::*;

/// Gay rate. Mirrors fun !gay.ts.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "gay")]
pub async fn gay(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
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
