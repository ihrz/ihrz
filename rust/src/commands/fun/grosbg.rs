use super::*;

pub const GROSGB_REPLY: &str = "kly ( @hjcbebcbknckehcbckb ) le plus beau";
// No fun guard: `MessageCommands/bot/@.ts` has no `GUILD.FUN.states`
// check, so the reply runs even with fun disabled — same precedent as
// dice/rate/coinflip (`!dice.ts`, `!rate.ts`, `!heads-tails.ts`).
/// Inside joke reply. Mirrors MessageCommands bot @ (grosbg), verbatim.
#[poise::command(prefix_command, category = "fun", rename = "grosbg")]
pub async fn grosbg(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(GROSGB_REPLY).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reply_text_matches_ts_verbatim() {
        // MessageCommands/bot/@.ts replies this exact string on every
        // invocation (no guards, no args): the probe `.grosbg` must
        // always produce exactly this reply.
        assert_eq!(GROSGB_REPLY, "kly ( @hjcbebcbknckehcbckb ) le plus beau");
    }

    #[test]
    fn registered_top_level_prefix_only_like_ts() {
        // PREFIX_IHORIZON_COMMAND, category 404, never slash: `.grosbg`
        // must resolve at top level on the prefix leg with no params
        // (so no ArgumentParse denial is possible).
        let cmds = crate::commands::all();
        let cmd = cmds
            .iter()
            .find(|c| c.name == "grosbg")
            .expect("grosbg missing");
        assert!(cmd.prefix_action.is_some());
        assert!(cmd.slash_action.is_none());
        assert!(cmd.parameters.is_empty());
    }
}
