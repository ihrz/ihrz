use super::*;

/// Inside joke reply. Mirrors MessageCommands bot @ (grosbg), verbatim.
// No fun guard: `MessageCommands/bot/@.ts` has no `GUILD.FUN.states`
// check, so the reply runs even with fun disabled — same precedent as
// dice/rate/coinflip (`!dice.ts`, `!rate.ts`, `!heads-tails.ts`).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "grosbg")]
pub async fn grosbg(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("kly ( @hjcbebcbknckehcbckb ) le plus beau").await?;
    Ok(())
}
