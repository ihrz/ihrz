use super::*;

/// Inside joke reply. Mirrors MessageCommands bot @ (grosbg), verbatim.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "grosbg")]
pub async fn grosbg(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    ctx.say("kly ( @hjcbebcbknckehcbckb ) le plus beau").await?;
    Ok(())
}
