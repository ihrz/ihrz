use super::*;

/// Toggle the discussion thread under each confession. Mirrors !thread.ts.
// The raw action string is stored as-is (prefix defaults to `"0s"`
// when missing, like `string(args!, 0) || "0s"`); only the exact
// `"yes"` replies enabled, everything else replies disabled.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "thread",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: Option<String>,
) -> Result<(), anyhow::Error> {
    let raw = action.as_deref().unwrap_or("0s");
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    crate::commands::owner::main::routed_set(pool, &gid, &gid, "GUILD.CONFESSION.thread", raw)
        .await?;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Exact match like TS (`action === "yes" ? enabled : disabled`).
    let key = if parse_yes_no(raw).unwrap_or(false) {
        "confession_thread_enabled"
    } else {
        "confession_thread_disabled"
    };
    ctx.say(crate::lang::get(&code, key).unwrap_or_else(|| key.to_string()))
        .await?;
    Ok(())
}
