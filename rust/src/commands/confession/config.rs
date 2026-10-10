use super::*;
use poise::serenity_prelude as serenity;

/// Audit entry for enable/disable. Mirrors `client.func.ihorizon_logs`
/// in !config.ts (called on both `on` and `off`; the off branch keeps
/// the TS quirk of reusing the on-enable title). Best-effort, silent
/// when the `ihorizon-logs` channel is missing.
pub async fn post_config_log(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    lang_code: &str,
    author_id: u64,
    enabled: bool,
) {
    let Ok(channels) = http.get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let title = crate::lang::get(lang_code, "confession_log_embed_title_on_enable")
        .unwrap_or_else(|| "Confession Enable/Disable".to_string());
    let desc_key = if enabled {
        "confession_log_embed_desc_on_enable"
    } else {
        "confession_log_embed_desc_on_disabled"
    };
    let desc = crate::lang::get(lang_code, desc_key)
        .map(|s| s.replace("${interaction.user}", &format!("<@{author_id}>")))
        .unwrap_or_else(|| format!("<@{author_id}> toggled the Confession module."));
    let embed = serenity::CreateEmbed::default()
        .colour(0xbf_0b_b9)
        .title(title)
        .description(desc);
    let _ = ch
        .id
        .send_message(http, serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Enable or disable the confession module. Mirrors !config.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("confess-config"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    // Unknown actions are a silent no-op, mirroring !config.ts (its
    // if/else-if simply falls through with no reply).
    let Some(enabled) = parse_on_off(&action) else {
        return Ok(());
    };
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    // TS !config.ts writes the legacy `CONFESSION.disable` boolean; keep
    // the namespaced `GUILD.CONFESSION.disable` too so both readers
    // (TS legacy, Rust namespaced) agree. Both are real JSON booleans
    // like TS (`client.db.set(key, bool)`); readers stay tolerant of
    // the legacy `"0"`/`"1"` strings on both sides.
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "CONFESSION.disable",
        if enabled { "false" } else { "true" },
    )
    .await?;
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "GUILD.CONFESSION.disable",
        if enabled { "false" } else { "true" },
    )
    .await?;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "confession_disable_command_work_on"
    } else {
        "confession_disable_command_work_off"
    };
    ctx.say(crate::lang::get(&code, key).unwrap_or_else(|| key.to_string()))
        .await?;
    // Audit entry on both states, mirroring ihorizon_logs in !config.ts.
    if let Some(guild_id) = ctx.guild_id() {
        post_config_log(ctx.http(), guild_id, &code, ctx.author().id.get(), enabled).await;
    }
    Ok(())
}
