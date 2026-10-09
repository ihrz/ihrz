use super::*;

/// Stench rate. Mirrors fun !stench.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "stench",
    aliases("odeur", "odeurs", "puanteurs", "puanteur", "arf", "pue")
)]
pub async fn stench(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    percent_user(
        &ctx,
        user,
        "fun_stench_command_ok",
        "The user ${user} is **${random}%** stinky",
    )
    .await
}
