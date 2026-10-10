use super::*;
use poise::serenity_prelude as serenity;

/// Rename this ticket channel. Mirrors !rename.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "rename",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_rename(
    ctx: Ctx<'_>,
    // Option (not required): TS reads `getString("name")!` (slash,
    // required) / `longString(args, 0)!` (prefix, nullable,
    // !rename.ts). Slash-Option is deliberate, same pattern as the
    // giveaway winner count: a missing name must reach the in-handler
    // reply below (`ticket_rename_error`, like the TS setName throw ->
    // .catch leg) instead of a poise parse error on the bare form.
    // Rest-of-line like TS `longString(args, 0)`: multi-word panel names
    // survive prefix parsing (same `#[rest]` pattern as fun/caracteres);
    // `#[rest]` only affects prefix parsing, the slash `name` option
    // still registers (now optional).
    #[description = "New name"]
    #[rest]
    name: Option<String>,
) -> Result<(), anyhow::Error> {
    // Mirrors !rename.ts guards (disable + delete_not_in_ticket) and
    // the rename error reply.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &code,
        ctx.channel_id(),
        "delete_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    // Missing name answers `ticket_rename_error`: the TS prefix path
    // (`longString(args, 0)!` -> null) throws in setName and lands in
    // the .catch leg with the same key.
    let Some(name) = name else {
        ctx.say(
            crate::lang::get(&code, "ticket_rename_error")
                .unwrap_or_else(|| "Error when renaming the text channel".to_string()),
        )
        .await?;
        return Ok(());
    };
    if ctx
        .channel_id()
        // Trim is deliberate: Discord rejects leading/trailing whitespace
        // in channel names, and the TS guard shape (`setName(name)`
        // throw -> error reply) is preserved — a blank name just lands
        // in the error reply below.
        .edit(&ctx.http(), serenity::EditChannel::new().name(name.trim()))
        .await
        .is_ok()
    {
        ctx.say(
            crate::lang::get(&code, "ticket_rename_ok")
                .unwrap_or_else(|| "Ticket channel has been renamed!".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&code, "ticket_rename_error")
                .unwrap_or_else(|| "Error when renaming the text channel".to_string()),
        )
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rest_keeps_slash_name_option() {
        // `#[rest]` only affects prefix parsing (rest-of-line, like TS
        // `longString(args, 0)`); the same parameter still registers as
        // the slash `name` option, so it is harmless on slash. The
        // option is optional (slash-Option deliberate): a missing name
        // reaches the in-handler `ticket_rename_error` reply instead of
        // a poise parse error.
        let cmd = ticket_rename();
        assert!(cmd.slash_action.is_some());
        assert!(cmd.prefix_action.is_some());
        let param = cmd
            .parameters
            .iter()
            .find(|p| p.name == "name")
            .expect("slash `name` option");
        assert!(!param.required);
    }
}
