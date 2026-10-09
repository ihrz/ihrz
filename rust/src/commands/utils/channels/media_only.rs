use super::*;

/// Media-only channel toggle. Mirrors !media-only.ts (flattened to a toggle).
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
    let raw =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, "UTILS.picOnly")
            .await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = channel.id.get().to_string();
    let msg = if let Some(pos) = list.iter().position(|c| c == &id) {
        list.remove(pos);
        "Media-only off."
    } else {
        list.push(id);
        "Media-only on."
    };
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.picOnly",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say(msg).await?;
    Ok(())
}

/// Media-only panel config math. Mirrors !media-only.ts
/// (`UTILS.picOnlyConfig` defaults + modal clamps).
pub const PICONLY_DEFAULT_THRESHOLD: i64 = 3;
/// Default mute time in ms (10 minutes, the TS `|| 600000` fallback).
pub const PICONLY_DEFAULT_MUTE_MS: i64 = 600_000;
/// Mute times above 15 days reset to the default (`1296000000 < t`).
pub const PICONLY_MAX_MUTE_MS: i64 = 1_296_000_000;
/// Thresholds above 15 reset to the default (`15 < threshold`).
pub const PICONLY_MAX_THRESHOLD: i64 = 15;

/// Clamp a modal mute time: over-limit values fall back to the default.
pub fn clamp_pic_mute_time(ms: i64) -> i64 {
    if PICONLY_MAX_MUTE_MS < ms {
        PICONLY_DEFAULT_MUTE_MS
    } else {
        ms
    }
}

/// Clamp a modal threshold: over-limit values fall back to the default.
pub fn clamp_pic_threshold(threshold: i64) -> i64 {
    if PICONLY_MAX_THRESHOLD < threshold {
        PICONLY_DEFAULT_THRESHOLD
    } else {
        threshold
    }
}

/// Toggle the `createThread` yes/no flag.
pub fn toggle_pic_thread(current: &str) -> &'static str {
    if current == "no" {
        "yes"
    } else {
        "no"
    }
}

/// Render the channel list field (`<#id>` joins, `none` fallback).
pub fn pic_channels_field(channels: &[String], none: &str) -> String {
    if channels.is_empty() {
        none.to_string()
    } else {
        channels
            .iter()
            .map(|c| format!("<#{c}>"))
            .collect::<Vec<_>>()
            .join(", ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mute_time_clamp_mirrors_ts() {
        assert_eq!(clamp_pic_mute_time(600_000), 600_000);
        assert_eq!(clamp_pic_mute_time(1_296_000_000), 1_296_000_000);
        assert_eq!(clamp_pic_mute_time(1_296_000_001), PICONLY_DEFAULT_MUTE_MS);
    }

    #[test]
    fn threshold_clamp_mirrors_ts() {
        assert_eq!(clamp_pic_threshold(3), 3);
        assert_eq!(clamp_pic_threshold(15), 15);
        assert_eq!(clamp_pic_threshold(16), PICONLY_DEFAULT_THRESHOLD);
    }

    #[test]
    fn thread_toggle_flips() {
        assert_eq!(toggle_pic_thread("yes"), "no");
        assert_eq!(toggle_pic_thread("no"), "yes");
    }

    #[test]
    fn channels_field_renders() {
        assert_eq!(pic_channels_field(&[], "None"), "None");
        assert_eq!(
            pic_channels_field(&["1".to_string(), "2".to_string()], "None"),
            "<#1>, <#2>"
        );
    }
}
