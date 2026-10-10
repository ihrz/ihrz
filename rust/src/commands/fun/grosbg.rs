use super::*;

/// Inside joke reply. Mirrors MessageCommands bot @ (grosbg), verbatim.
// SCOPE (prefix-only vs dual): the TS source (`@.ts`, name `grosbg`)
// declares `type: "PREFIX_IHORIZON_COMMAND"` (prefix-only intent).
// This port keeps dual registration (slash + prefix) like every other
// legacy @-command: narrowing one command alone would fragment the
// registry, so prefix-only narrowing is deferred to a port-wide
// legacy-scope pass. Do not flip this registration without that pass.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "grosbg")]
pub async fn grosbg(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    ctx.say("kly ( @hjcbebcbknckehcbckb ) le plus beau").await?;
    Ok(())
}
