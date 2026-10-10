use super::*;

/// Media-only channel toggle. Mirrors !media-only.ts.
// Entry toggles `UTILS.picOnly`. The threshold/mute/thread config
// surface (`UTILS.picOnlyConfig` panel: collectors, modals, clamps)
// is documented, not ported — the live enforcement fallbacks live in
// events_handler.rs (`PICONLY_DEFAULT_*` below).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "media-only",
    aliases("piconly", "mediaonly"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn media_only(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let raw =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, "UTILS.picOnly")
            .await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = channel.id.get().to_string();
    let enabled = list.iter().any(|c| c == &id);
    if enabled {
        list.retain(|c| c != &id);
    } else {
        list.push(id);
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.picOnly",
        &serde_json::to_string(&list)?,
    )
    .await?;
    // No hardcoded English: use the panel lang keys for the toggle echo.
    let title = crate::lang::get(&code, "utils_pic_only_embed_title")
        .unwrap_or_else(|| "Media Only Channels".to_string());
    let state = if enabled {
        crate::lang::get(&code, "setjoinroles_var_none").unwrap_or_else(|| "None".to_string())
    } else {
        crate::lang::get(&code, "var_yes").unwrap_or_else(|| "Yes".to_string())
    };
    ctx.say(format!("{title}: <#{0}> {state}", channel.id.get()))
        .await?;
    Ok(())
}

/// Media-only panel config defaults. Mirrors !media-only.ts
/// (`UTILS.picOnlyConfig` fallbacks: threshold 3, muteTime 600000).
/// These feed the live enforcement in events_handler.rs. The TS panel
/// helpers (modal clamps, thread toggle, channel-list rendering) have
/// no config surface here and are deleted, not kept as dead code.
pub const PICONLY_DEFAULT_THRESHOLD: i64 = 3;
/// Default mute time in ms (10 minutes, the TS `|| 600000` fallback).
pub const PICONLY_DEFAULT_MUTE_MS: i64 = 600_000;
