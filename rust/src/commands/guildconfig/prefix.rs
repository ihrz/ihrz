use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "setprefix",
    aliases("prefix", "changeprefix"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_prefix(
    ctx: Ctx<'_>,
    #[description = "New prefix (max 4 chars) or 'mention' to revert"] prefix: String,
) -> Result<(), anyhow::Error> {
    let raw = prefix.trim().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Mention-revert. Mirrors `action === "mention"` in !prefix.ts
    // (`client.db.delete(`${guildId}.BOT.prefix`)`).
    if raw.eq_ignore_ascii_case("mention") || raw.eq_ignore_ascii_case("reset") {
        crate::db::clear_guild_prefix(&ctx.data().pool, &gid).await?;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_now_mention")
                .unwrap_or_else(|| "Prefix reverted to mention.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if raw.is_empty() {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "Prefix must be 1-5 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // CapGate: TS rejects `prefix.length >= 5` (4 chars max).
    if crate::db::prefix_too_long(&raw) {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_too_long")
                .unwrap_or_else(|| "Prefix must be 1-5 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Truncation: TS stores `prefix.split(" ")[0]`.
    let formated = crate::db::truncate_prefix(&raw);
    if formated.is_empty() {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "Prefix must be 1-5 characters.".to_string()),
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
