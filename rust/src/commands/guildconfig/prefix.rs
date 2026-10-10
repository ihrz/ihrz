use super::*;

/// Setprefix command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "setprefix",
    aliases("prefix", "changeprefix"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_prefix(
    ctx: Ctx<'_>,
    #[description = "New prefix (max 4 chars) or 'mention' to revert (slash only)"] prefix: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let is_prefix = matches!(ctx, poise::Context::Prefix(_));
    // Mention-revert. Mirrors `action === "mention"` in !prefix.ts:
    // the slash `action` choice is exact, and the prefix path forces
    // `action = "change"`, so only a slash call with the exact input
    // `mention` reverts (`client.db.delete(`${guildId}.BOT.prefix`)`).
    // A prefix call stores `mention` literally, like TS. There is no
    // `reset` action in TS.
    if !is_prefix && prefix == "mention" {
        crate::db::clear_guild_prefix(&ctx.data().pool, &gid).await?;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_now_mention").unwrap_or_else(
                || "The bot prefix for Message's command is now mention! `@Ping-Me`".to_string(),
            ),
        )
        .await?;
        return Ok(());
    }
    if prefix.is_empty() {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "You need to specify the bot prefix.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // CapGate: TS rejects `prefix.length >= 5` (4 chars max). The
    // prefix path forces the `change` action, so the input is stored
    // literally (`prefix.split(" ")[0]`), like TS.
    if crate::db::prefix_too_long(&prefix) {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_too_long").unwrap_or_else(
                || "The bot prefix is too long, it will be too difficult to use.".to_string(),
            ),
        )
        .await?;
        return Ok(());
    }
    // Truncation: TS stores `prefix.split(" ")[0]`.
    let formated = crate::db::truncate_prefix(&prefix);
    if formated.is_empty() {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "You need to specify the bot prefix.".to_string()),
        )
        .await?;
        return Ok(());
    }
    crate::db::set_guild_prefix(&ctx.data().pool, &gid, &formated).await?;
    ctx.say(
        crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_is_good")
            .map(|s| s.replace("${formatedPrefix}", &formated))
            .unwrap_or_else(|| format!("Prefix set to `{formated}`.")),
    )
    .await?;
    Ok(())
}
