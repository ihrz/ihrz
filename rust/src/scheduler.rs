// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Background schedulers. Mirrors src/core/modules/* timers +
// StreamNotifier/Blogger polling + ready.ts table sweeps.
//
// Implemented for real: expired SCHEDULE entries, expired giveaways,
// temp roles/bans, membercount refresh (5min), pfps poster (45s),
// auto-renew, Blogger poll (60s), nightmode (60s), protection
// structure backup (60s), idle player destroy (60s). The only remaining
// skeleton is the 120s StreamNotifier tick, blocked on the
// Twitch/YouTube/Kick live APIs (see Blocked in MIGRATION.md).

use crate::db::Pool;
use crate::events_handler::{wipe_queue_due, PendingGuildDeletion, GUILD_DELETE_QUEUE_KEY};
use std::collections::{HashMap, HashSet};
use std::time::Duration;

pub const SCHEDULE_SWEEP_SECS: u64 = 60;
pub const TEMP_EXPIRY_SECS: u64 = 30;
pub const MEMBERCOUNT_SECS: u64 = 300;
pub const NIGHTMODE_SECS: u64 = 60;
pub const GIVEAWAY_SECS: u64 = 60;
pub const NOTIFIER_SECS: u64 = 120;
pub const PROTECTION_BACKUP_SECS: u64 = 60;
pub const IDLE_SWEEP_SECS: u64 = 60;
/// Wipe-queue sweep interval. Poll-based instead of the TS
/// per-guild timers so pending wipes survive restarts; the first
/// tick after boot is the ready recovery.
pub const WIPE_QUEUE_SWEEP_SECS: u64 = 60;

/// Ended-giveaway retention, 345.6M ms (4 days). Mirrors
/// endedGiveawaysLifetime in src/core/core.ts: rows past this age
/// are deleted even when already ended.
pub const ENDED_GIVEAWAY_LIFETIME_MS: i64 = 345_600_000;

/// Membercount slot gate. TS memberCountManager.Refresh() processes
/// every configured slot with no enable check; only an explicit
/// `enable: false` opts a slot out (missing key stays active).
pub fn membercount_slot_enabled(cfg: &serde_json::Value) -> bool {
    cfg.get("enable").and_then(|e| e.as_bool()).unwrap_or(true)
}

/// Half-time warning window: |elapsed - max/2| < 15s. Mirrors
/// autorenewManager.ts isHalfTimeWindow.
pub fn autorenew_half_window(timestamp_ms: i64, max_ms: i64, now_ms: i64) -> bool {
    (now_ms - timestamp_ms - max_ms / 2).abs() < 15_000
}

/// Autorenew expiry with saturating add (mirrors timeElapsed >= maxTime).
pub fn autorenew_expired(timestamp_ms: i64, max_ms: i64, now_ms: i64) -> bool {
    now_ms >= timestamp_ms.saturating_add(max_ms)
}

/// Night window over minute-of-day values. Mirrors
/// nightModeManager calculate_window_time (overnight wrap included).
pub fn night_window_started(start_min: i64, end_min: i64, now_min: i64) -> bool {
    if start_min > end_min {
        now_min >= start_min || now_min <= end_min
    } else {
        now_min >= start_min && now_min <= end_min
    }
}

/// Guild-local minute of day from a UTC offset in hours. Fixed-offset
/// approximation of the IANA-timezone branch of calculate_window_time
/// (see utcTimezones in src/core/locales.ts).
pub fn guild_now_minutes(now_secs: i64, utc_offset_hours: i64) -> i64 {
    (now_secs.div_euclid(60) + utc_offset_hours * 60).rem_euclid(1440)
}

/// Anti-repeat pick: index rand % len, stepping forward when it
/// repeats the previous pick. Mirrors the usr-map guard in
/// pfpsManager.ts. Returns None when empty.
pub fn pick_pfps_index(len: usize, last: Option<usize>, rand: usize) -> Option<usize> {
    if len == 0 {
        return None;
    }
    let mut idx = rand % len;
    if Some(idx) == last && len > 1 {
        idx = (idx + 1) % len;
    }
    Some(idx)
}

/// Sort + dedup entries in place. Mirrors AvoidDoubleEntries in
/// giveawaysDatabaseManager.ts (called on every refresh).
pub fn dedup_entries(entries: &mut Vec<String>) {
    entries.sort();
    entries.dedup();
}

/// Ended-giveaway lifetime check (mirrors the cooldownTime branch
/// of giveawaysManager refresh()).
pub fn giveaway_lifetime_due(expire_in_ms: i64, now_ms: i64) -> bool {
    now_ms - expire_in_ms >= ENDED_GIVEAWAY_LIFETIME_MS
}

/// Delete expired SCHEDULE.* entries across all guilds.
/// Returns number of rows removed.
pub async fn sweep_expired_schedules(pool: &Pool, now_ms: i64) -> u64 {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT guild_id, key_name FROM kv WHERE key_name LIKE 'SCHEDULE.%'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut removed = 0u64;
    for (gid, key) in rows {
        let expired = match crate::db::kv_get(pool, &gid, &key).await {
            Some(raw) => serde_json::from_str::<serde_json::Value>(&raw)
                .ok()
                .and_then(|v| v.get("expires_at_ms").and_then(|n| n.as_i64()))
                .map(|exp| now_ms >= exp)
                .unwrap_or(false),
            None => false,
        };
        if expired
            && sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(pool)
                .await
                .map(|r| r.rows_affected() > 0)
                .unwrap_or(false)
        {
            removed += 1;
        }
    }
    removed
}

/// Seconds between giveaway expiry sweeps (mirrors the 15s refresh loop).
const GIVEAWAY_REFRESH_SECS: u64 = 15;

/// End expired giveaways, picking winners deterministically.
/// Mirrors giveawaysManager refresh() -> finish(): expired + !ended
/// get winners, an ended-board edit and a winners reply. With
/// `http: None` (tests) only keys are updated. Returns number of
/// giveaways ended.
pub async fn sweep_expired_giveaways(
    pool: &Pool,
    http: Option<std::sync::Arc<poise::serenity_prelude::Http>>,
    now_ms: i64,
) -> u64 {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT guild_id, key_name FROM kv WHERE key_name LIKE 'GIVEAWAY.%'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut ended = 0u64;
    for (gid, key) in rows {
        let mid: u64 = key
            .strip_prefix("GIVEAWAY.")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        if mid == 0 {
            continue;
        }
        let raw = crate::db::kv_get(pool, &gid, &key).await;
        let Some(raw) = raw else { continue };
        let mut gw: crate::commands::giveaway::main::Giveaway = match serde_json::from_str(&raw) {
            Ok(gw) => gw,
            Err(_) => continue,
        };
        // Ended-giveaway retention (mirrors the cooldownTime branch of
        // giveawaysManager refresh()): rows past the lifetime are
        // deleted even when already ended.
        if giveaway_lifetime_due(gw.expire_in_ms, now_ms) {
            let _ = crate::db::kv_del(pool, &gid, &key).await;
            continue;
        }
        // Entry dedup on every pass (mirrors AvoidDoubleEntries,
        // called at the top of refresh()); persisted when changed.
        let mut clean = gw.entries.clone();
        dedup_entries(&mut clean);
        if clean != gw.entries {
            gw.entries = clean;
            let _ = crate::db::kv_set(
                pool,
                &gid,
                &key,
                &serde_json::to_string(&gw).unwrap_or_default(),
            )
            .await;
        }
        if gw.ended || now_ms < gw.expire_in_ms {
            continue;
        }
        let code = crate::db::guild_lang(pool, gid.parse::<u64>().ok()).await;
        if let Some(http) = &http {
            // Shared end flow (board edit + winners reply). A gone
            // board drops the row like the TS fetch catch.
            let lived = crate::commands::giveaway::main::finish_giveaway(
                pool,
                http,
                &gid,
                mid,
                &mut gw,
                now_ms as u64,
                &code,
                now_ms / 1000,
            )
            .await;
            if !lived {
                let _ = crate::db::kv_del(pool, &gid, &key).await;
                continue;
            }
        } else {
            let winners = crate::commands::giveaway::main::pick_winners(
                &gw.entries,
                &gw.winners,
                gw.winner_count as usize,
                now_ms as u64,
            );
            gw.winners = winners;
            gw.ended = true;
            let _ = crate::db::kv_set(
                pool,
                &gid,
                &key,
                &serde_json::to_string(&gw).unwrap_or_default(),
            )
            .await;
        }
        ended += 1;
    }
    ended
}

/// Sweep expired GUILD.TEMPROLE.* / GUILD.TEMPBAN.* entries.
/// Mirrors tempRoleManager/checkExpiredRoles + tempbanManager (30s):
/// removes the role / unbans via HTTP, then deletes the key.
/// With `http: None` (tests) only keys are deleted.
/// Returns (roles_removed, unbans).
pub async fn sweep_temp_expiry(
    pool: &Pool,
    http: Option<std::sync::Arc<poise::serenity_prelude::Http>>,
    now_ms: i64,
) -> (u64, u64) {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT guild_id, key_name FROM kv WHERE key_name LIKE 'GUILD.TEMPROLE.%' OR key_name LIKE 'GUILD.TEMPBAN.%'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let (mut roles, mut unbans) = (0u64, 0u64);
    for (gid, key) in rows {
        let expired = match crate::db::kv_get(pool, &gid, &key).await {
            Some(raw) => serde_json::from_str::<serde_json::Value>(&raw)
                .ok()
                .and_then(|v| v.get("expires_at_ms").and_then(|n| n.as_i64()))
                .map(|exp| now_ms >= exp)
                .unwrap_or(false),
            None => continue,
        };
        if !expired {
            continue;
        }
        let rest = key
            .strip_prefix("GUILD.TEMPROLE.")
            .or_else(|| key.strip_prefix("GUILD.TEMPBAN."));
        let Some(rest) = rest else { continue };
        let parts: Vec<u64> = rest.split('.').filter_map(|p| p.parse().ok()).collect();
        let guild_id: u64 = gid.parse().unwrap_or(0);
        if key.starts_with("GUILD.TEMPROLE.") && parts.len() == 2 && guild_id != 0 {
            if let Some(http) = &http {
                use poise::serenity_prelude::{GuildId, RoleId, UserId};
                // Member-left cleanup (mirrors tempRoleManager
                // checkExpiredRoles: a member that can no longer be
                // fetched has left, so its entry is dropped).
                if http
                    .get_member(GuildId::new(guild_id), UserId::new(parts[0]))
                    .await
                    .is_err()
                {
                    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                        .bind(&gid)
                        .bind(&key)
                        .execute(pool)
                        .await;
                    roles += 1;
                    continue;
                }
                let _ = http
                    .remove_member_role(
                        GuildId::new(guild_id),
                        UserId::new(parts[0]),
                        RoleId::new(parts[1]),
                        None,
                    )
                    .await;
            }
            roles += 1;
        } else if key.starts_with("GUILD.TEMPBAN.") && parts.len() == 1 && guild_id != 0 {
            if let Some(http) = &http {
                use poise::serenity_prelude::{GuildId, UserId};
                let _ = http
                    .remove_ban(GuildId::new(guild_id), UserId::new(parts[0]), None)
                    .await;
            }
            unbans += 1;
        }
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind(&key)
            .execute(pool)
            .await;
    }
    (roles, unbans)
}

/// Membercount refresh. Mirrors memberCountManager 5min tick: for each
/// GUILD.MCOUNT.<slot> config, fetch the preview count and rename the
/// voice channel from its template ({MemberCount} supported live).
pub async fn sweep_membercount(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use poise::serenity_prelude::{ChannelId, GuildId};
    let rows: Vec<(String, String, String)> = sqlx::query_as::<_, (String, String, String)>(
        "SELECT guild_id, key_name, value FROM kv WHERE key_name LIKE 'GUILD.MCOUNT.%'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut done = 0u64;
    for (gid, _key, raw) in rows {
        let Ok(gid_num) = gid.parse::<u64>() else {
            continue;
        };
        let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) else {
            continue;
        };
        // TS memberCountManager has no enable gate; only an explicit
        // `enable: false` opts a slot out (missing key stays active).
        if !membercount_slot_enabled(&cfg) {
            continue;
        }
        let (Some(tpl), Some(ch)) = (
            cfg.get("name").and_then(|n| n.as_str()),
            cfg.get("channel").and_then(|c| c.as_str()),
        ) else {
            continue;
        };
        let Ok(ch_num) = ch.parse::<u64>() else {
            continue;
        };
        let count = http
            .get_guild_preview(GuildId::new(gid_num))
            .await
            .map(|p| p.approximate_member_count)
            .unwrap_or(0);
        // Full guild fetch for role/channel/boost counts (best-effort).
        let (roles, channels, boosts) = match http.get_guild(GuildId::new(gid_num)).await {
            Ok(g) => {
                let chans = http
                    .get_channels(GuildId::new(gid_num))
                    .await
                    .map(|c| c.len() as u64)
                    .unwrap_or(0);
                (
                    g.roles.len() as u64,
                    chans,
                    g.premium_subscription_count.unwrap_or(0),
                )
            }
            Err(_) => (0, 0, 0),
        };
        let name = tpl
            .replace("{MemberCount}", &count.to_string())
            .replace("{RolesCount}", &roles.to_string())
            .replace("{ChannelCount}", &channels.to_string())
            .replace("{BoostCount}", &boosts.to_string());
        if ChannelId::new(ch_num)
            .edit(
                http,
                poise::serenity_prelude::EditChannel::new().name(&name),
            )
            .await
            .is_ok()
        {
            done += 1;
        }
    }
    done
}

/// PFPS poster. Mirrors pfpsManager 45s tick: random non-bot member
/// avatar embeds (guild + user) with download link buttons, skipping
/// repeat picks per guild.
/// Last pfps pick per guild (user id), mirroring the in-memory
/// usr map in pfpsManager.ts.
static PFPS_LAST: std::sync::OnceLock<std::sync::Mutex<HashMap<String, String>>> =
    std::sync::OnceLock::new();

fn pfps_last() -> &'static std::sync::Mutex<HashMap<String, String>> {
    PFPS_LAST.get_or_init(Default::default)
}

pub async fn sweep_pfps(pool: &Pool, http: &std::sync::Arc<poise::serenity_prelude::Http>) -> u64 {
    use poise::serenity_prelude::{
        ChannelId, CreateActionRow, CreateButton, CreateEmbed, CreateMessage, GuildId,
    };
    let rows: Vec<(String, String, String)> =
        sqlx::query_as::<_, (String, String, String)>(
            "SELECT guild_id, key_name, value FROM kv WHERE key_name = 'PFPS.channel' OR key_name = 'PFPS.disable'",
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();
    let mut channels: std::collections::HashMap<String, String> = Default::default();
    let mut disabled: std::collections::HashSet<String> = Default::default();
    for (gid, key, value) in rows {
        if key == "PFPS.channel" {
            channels.insert(gid, value);
        } else if value == "1" {
            disabled.insert(gid);
        }
    }
    let mut done = 0u64;
    for (gid, ch) in channels {
        if disabled.contains(&gid) {
            continue;
        }
        let (Ok(gid_num), Ok(ch_num)) = (gid.parse::<u64>(), ch.parse::<u64>()) else {
            continue;
        };
        let code = crate::db::guild_lang(pool, Some(gid_num)).await;
        let Ok(members) = http
            .get_guild_members(GuildId::new(gid_num), Some(200), None)
            .await
        else {
            continue;
        };
        // Bot filter (mirrors `.filter((user) => !user.user.bot)`).
        let members: Vec<_> = members.iter().filter(|m| !m.user.bot).collect();
        if members.is_empty() {
            continue;
        }
        let rand = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as usize)
            .unwrap_or(0);
        // Anti-repeat: step forward when the pick matches the last one.
        let last_id = pfps_last().lock().ok().and_then(|m| m.get(&gid).cloned());
        let last_idx = last_id.as_deref().and_then(|id| {
            id.parse::<u64>()
                .ok()
                .and_then(|n| members.iter().position(|m| m.user.id.get() == n))
        });
        let Some(idx) = pick_pfps_index(members.len(), last_idx, rand) else {
            continue;
        };
        let pick = members[idx];
        if let Ok(mut m) = pfps_last().lock() {
            m.insert(gid.clone(), pick.user.id.get().to_string());
        }
        let username = pick
            .user
            .global_name
            .clone()
            .unwrap_or_else(|| pick.user.name.clone());
        let user_url = pick.user.face();
        let user_title = crate::lang::get(&code, "pfps_embed_user_title")
            .map(|s| s.replace("{username}", &username))
            .unwrap_or_else(|| format!("{username}'s **User** avatar"));
        let guild_title = crate::lang::get(&code, "pfps_embed_guild_title")
            .map(|s| s.replace("{username}", &username))
            .unwrap_or_else(|| format!("{username}'s **Guild** avatar"));
        // Guild-avatar embed (only when the member has one) plus the
        // always-present user-avatar embed, with one download link
        // button each. Mirrors the embeds/buttons in SendMessage.
        let mut embeds = Vec::with_capacity(2);
        let mut buttons = Vec::with_capacity(2);
        if let Some(guild_url) = pick.avatar_url() {
            embeds.push(
                CreateEmbed::default()
                    .colour(poise::serenity_prelude::Colour::new(0xa2add0))
                    .title(guild_title)
                    .image(guild_url.clone()),
            );
            buttons.push(
                CreateButton::new_link(guild_url).label(
                    crate::lang::get(&code, "pfps_download_guild_button")
                        .unwrap_or_else(|| "Download Guild Avatar".to_string()),
                ),
            );
        }
        embeds.push(
            CreateEmbed::default()
                .colour(poise::serenity_prelude::Colour::new(0xa2add0))
                .title(user_title)
                .image(user_url.clone())
                .timestamp(poise::serenity_prelude::Timestamp::now()),
        );
        buttons.push(
            CreateButton::new_link(user_url).label(
                crate::lang::get(&code, "pfps_download_user_button")
                    .unwrap_or_else(|| "Download User Avatar".to_string()),
            ),
        );
        let mut msg = CreateMessage::new().embeds(embeds);
        if !buttons.is_empty() {
            msg = msg.components(vec![CreateActionRow::Buttons(buttons)]);
        }
        if ChannelId::new(ch_num).send_message(http, msg).await.is_ok() {
            done += 1;
        }
    }
    done
}

/// Auto-renew sweep. Mirrors autorenewManager 30s tick: at half time
/// a warning is sent and pinned, at expiry the channel is cloned
/// (name/kind/parent/overwrites/nsfw/position, system-channel kept)
/// and replaced, keys rotated, and a renewed notice is posted.
pub async fn sweep_autorenew(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
    now_ms: i64,
) -> u64 {
    use poise::serenity_prelude::{ChannelId, CreateChannel, CreateMessage, GuildId};
    let rows: Vec<(String, String, String)> = sqlx::query_as::<_, (String, String, String)>(
        "SELECT guild_id, key_name, value FROM kv WHERE key_name LIKE 'UTILS.renew_channel.%'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut done = 0u64;
    for (gid, key, raw) in rows {
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) else {
            continue;
        };
        let (Some(ts), Some(max)) = (
            v.get("timestamp").and_then(|n| n.as_i64()),
            v.get("maxTime").and_then(|n| n.as_i64()),
        ) else {
            continue;
        };
        let Some(ch_id) = key
            .strip_prefix("UTILS.renew_channel.")
            .and_then(|s| s.parse::<u64>().ok())
        else {
            continue;
        };
        let Ok(gid_num) = gid.parse::<u64>() else {
            continue;
        };
        let code = crate::db::guild_lang(pool, Some(gid_num)).await;
        if !autorenew_expired(ts, max, now_ms) {
            // Half-time warning, pinned (mirrors the
            // isHalfTimeWindow branch: `<t:expiry:R>` + pin).
            if !autorenew_half_window(ts, max, now_ms) {
                continue;
            }
            let Ok(channel) = http.get_channel(ChannelId::new(ch_id)).await else {
                let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                    .bind(&gid)
                    .bind(&key)
                    .execute(pool)
                    .await;
                continue;
            };
            let Some(guild_ch) = channel.guild() else {
                continue;
            };
            let expire_secs = ts.saturating_add(max) / 1000;
            let text = crate::lang::get(&code, "event_autorenew_channel_warning")
                .map(|s| s.replace("${time}", &format!("<t:{expire_secs}:R>")))
                .unwrap_or_else(|| {
                    format!("The AutoRenew module is configured to renew this channel. Next renewal is in <t:{expire_secs}:R>.")
                });
            if let Ok(sent) = guild_ch
                .id
                .send_message(http, CreateMessage::new().content(text))
                .await
            {
                let _ = http.pin_message(guild_ch.id, sent.id, None).await;
            }
            continue;
        }
        let Ok(channel) = http.get_channel(ChannelId::new(ch_id)).await else {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(pool)
                .await;
            continue;
        };
        let Some(guild_ch) = channel.guild() else {
            continue;
        };
        // Clone fidelity (mirrors channel.clone({name, parent,
        // permissionOverwrites, nsfw, reason, position})).
        let mut builder = CreateChannel::new(guild_ch.name.clone())
            .kind(guild_ch.kind)
            .nsfw(guild_ch.nsfw)
            .permissions(guild_ch.permission_overwrites.clone())
            .position(guild_ch.position);
        if let Some(parent) = guild_ch.parent_id {
            builder = builder.category(parent);
        }
        let Ok(new_ch) = GuildId::new(gid_num).create_channel(http, builder).await else {
            continue;
        };
        // Keep the system channel pointing at the replacement
        // (mirrors guild.setSystemChannel(newChannel.id)).
        if let Ok(guild) = http.get_guild(GuildId::new(gid_num)).await {
            if guild.system_channel_id == Some(ChannelId::new(ch_id)) {
                let _ = GuildId::new(gid_num)
                    .edit(
                        http,
                        poise::serenity_prelude::EditGuild::new()
                            .system_channel_id(Some(new_ch.id)),
                    )
                    .await;
            }
        }
        let _ = crate::db::kv_set(
            pool,
            &gid,
            &format!("UTILS.renew_channel.{}", new_ch.id.get()),
            &serde_json::json!({"timestamp": now_ms, "maxTime": max}).to_string(),
        )
        .await;
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind(&key)
            .execute(pool)
            .await;
        let _ = ChannelId::new(ch_id).delete(http).await;
        // Renewed notice in the replacement (mirrors the post-clone
        // newChannel.send(event_autorenew_channel_renewed)).
        let notice = crate::lang::get(&code, "event_autorenew_channel_renewed")
            .unwrap_or_else(|| "The AutoRenew has renewed the channel!".to_string());
        let _ = new_ch
            .id
            .send_message(http, CreateMessage::new().content(notice))
            .await;
        done += 1;
    }
    done
}

/// Blogger RSS poll. Mirrors Blogger.ts 60s refresh: latest article per
/// configured blog, skip when already notified, post + record otherwise.
pub async fn sweep_blogger(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use poise::serenity_prelude::ChannelId;
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT guild_id, value FROM kv WHERE key_name = 'BLOGGER.blogs'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut posted = 0u64;
    for (gid, raw) in rows {
        let blogs: Vec<crate::commands::blogger::main::BlogEntry> =
            serde_json::from_str(&raw).unwrap_or_default();
        for blog in blogs {
            let body = match reqwest::Client::new().get(&blog.rss).send().await {
                Ok(r) => r.text().await.unwrap_or_default(),
                Err(_) => continue,
            };
            let Some(item) = crate::commands::blogger::main::latest_rss_item(&body) else {
                continue;
            };
            let notified_raw = crate::db::kv_get(pool, &gid, "BLOGGER.lastArticleNotified").await;
            let mut notified: Vec<(String, String)> = notified_raw
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            if crate::commands::blogger::main::already_notified(&notified, &blog.id, &item.id) {
                continue;
            }
            if let Ok(ch_num) = blog.channel_id.parse::<u64>() {
                let _ = ChannelId::new(ch_num)
                    .send_message(
                        http,
                        poise::serenity_prelude::CreateMessage::new()
                            .content(format!("**{}**\n{}", item.title, item.link)),
                    )
                    .await;
            }
            notified.push((blog.id.clone(), item.id));
            let _ = crate::db::kv_set(
                pool,
                &gid,
                "BLOGGER.lastArticleNotified",
                &serde_json::to_string(&notified).unwrap_or_default(),
            )
            .await;
            posted += 1;
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
    }
    posted
}

/// Nightmode tick. Mirrors nightModeManager 60s refresh: per-guild
/// timezone minute window ([startHour, startMinute, endHour,
/// endMinute]), transitions tracked by UTILS.NIGHT_MODE.last_state so
/// they run once, owner DM when `notify` is set, @everyone
/// SEND_MESSAGES toggled on text channels at window edges.
pub async fn sweep_nightmode(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use poise::serenity_prelude::{
        ChannelType, GuildId, GuildPagination, PermissionOverwrite, PermissionOverwriteType,
        Permissions, RoleId,
    };
    /// TS state key (UTILS.NIGHT_MODE.last_state, "started" | "ended").
    const LAST_STATE_KEY: &str = "UTILS.NIGHT_MODE.last_state";
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let mut done = 0u64;
    let mut after: Option<GuildId> = None;
    for _ in 0..10 {
        let page = match http
            .get_guilds(after.map(GuildPagination::After), Some(200))
            .await
        {
            Ok(p) if !p.is_empty() => p,
            _ => break,
        };
        after = page.last().map(|g| g.id);
        for partial in &page {
            let gid = partial.id.get().to_string();
            let raw = match crate::db::kv_get(pool, &gid, "UTILS.NIGHT_MODE").await {
                Some(raw) => raw,
                None => continue,
            };
            let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) else {
                continue;
            };
            if !cfg
                .get("enabled")
                .and_then(|e| e.as_bool())
                .unwrap_or(false)
            {
                continue;
            }
            // TS time shape: [startHour, startMinute, endHour, endMinute].
            let time: Vec<i64> = cfg
                .get("time")
                .and_then(|t| t.as_array())
                .map(|a| a.iter().filter_map(|n| n.as_i64()).collect())
                .unwrap_or_default();
            if time.len() != 4 {
                continue;
            }
            let utc = cfg.get("utc").and_then(|u| u.as_i64()).unwrap_or(0);
            let notify = cfg.get("notify").and_then(|n| n.as_bool()).unwrap_or(false);
            let now_min = guild_now_minutes(now_secs, utc);
            let night =
                night_window_started(time[0] * 60 + time[1], time[2] * 60 + time[3], now_min);
            let want = if night { "started" } else { "ended" };
            let current = crate::db::kv_get(pool, &gid, LAST_STATE_KEY).await;
            if current.as_deref() == Some(want) {
                continue;
            }
            let channels = http.get_channels(partial.id).await.unwrap_or_default();
            let everyone = RoleId::new(partial.id.get());
            for ch in channels.iter().filter(|c| c.kind == ChannelType::Text) {
                if night {
                    let _ = ch
                        .id
                        .create_permission(
                            http,
                            PermissionOverwrite {
                                allow: Permissions::empty(),
                                deny: Permissions::SEND_MESSAGES,
                                kind: PermissionOverwriteType::Role(everyone),
                            },
                        )
                        .await;
                } else {
                    let _ = ch
                        .id
                        .delete_permission(http, PermissionOverwriteType::Role(everyone))
                        .await;
                }
            }
            let _ = crate::db::kv_set(pool, &gid, LAST_STATE_KEY, want).await;
            // Owner notify (mirrors Notify_Server_Owner on transition).
            if notify {
                let code = crate::db::guild_lang(pool, partial.id.get().into()).await;
                notify_nightmode_owner(
                    http,
                    partial.id,
                    &code,
                    night,
                    &format!(
                        "{:02}:{:02}-{:02}:{:02}",
                        time[0], time[1], time[2], time[3]
                    ),
                    utc,
                )
                .await;
            }
            done += 1;
        }
        if after.is_none() {
            break;
        }
    }
    done
}

/// Owner DM on a nightmode transition. Mirrors Notify_Server_Owner
/// (title + type line + time-range field). Best-effort.
async fn notify_nightmode_owner(
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
    guild_id: poise::serenity_prelude::GuildId,
    code: &str,
    started: bool,
    range: &str,
    utc: i64,
) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let guild = match http.get_guild(guild_id).await {
        Ok(g) => g,
        Err(_) => return,
    };
    let type_word = crate::lang::get(
        code,
        if started {
            "var_nm_running2"
        } else {
            "var_nm_stopping2"
        },
    )
    .unwrap_or_else(|| {
        if started {
            "starts".to_string()
        } else {
            "ends".to_string()
        }
    });
    let title = crate::lang::get(code, "var_nm_title").unwrap_or_else(|| "Night Mode".to_string());
    let desc = crate::lang::get(code, "var_nm_ping_embed_title")
        .map(|s| s.replace("${type}", &type_word))
        .unwrap_or_else(|| format!("Night mode {type_word}"));
    let field_name = crate::lang::get(code, "var_nm_ping_embed_fields_0_name")
        .unwrap_or_else(|| "Time Range".to_string());
    let tz_word = crate::lang::get(code, "nightmode_utc_timezone_on")
        .unwrap_or_else(|| "UTC timezone on".to_string());
    let embed = CreateEmbed::default().title(title).description(desc).field(
        field_name,
        format!("{range} ({tz_word} UTC{utc:+})"),
        true,
    );
    let Ok(dm) = guild.owner_id.create_dm_channel(http).await else {
        return;
    };
    let _ = dm
        .send_message(http, CreateMessage::new().embed(embed))
        .await;
}

/// Protection structure backup. Mirrors backupGuildStructure in
/// src/Events/protection/ready.ts (60s tick): snapshot each guild's
/// categories/channels/role membership for the avoidChannelDelete /
/// avoidRoleDelete restore paths, persisted per guild under
/// PROTECTION.BACKUP (see commands::protection::backup for the TS key
/// shapes and the restore mapping). Role-member enumeration is
/// best-effort and capped; a guild whose channel/role fetch fails keeps
/// its previous snapshot. Returns number of guilds snapshotted.
pub async fn sweep_protection_backup(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use crate::commands::protection::backup::{build_backup, save_backup, BackupRole, RawChannel};
    use poise::serenity_prelude::{GuildId, GuildPagination, RoleId};
    use std::collections::HashMap;

    /// Member pages fetched per guild (1000 members each).
    const MAX_MEMBER_PAGES: usize = 5;

    let mut done = 0u64;
    let mut after: Option<GuildId> = None;
    for _ in 0..10 {
        let page = match http
            .get_guilds(after.map(GuildPagination::After), Some(200))
            .await
        {
            Ok(p) if !p.is_empty() => p,
            _ => break,
        };
        after = page.last().map(|g| g.id);
        for partial in &page {
            let gid = partial.id.get().to_string();
            let channels = http.get_channels(partial.id).await.unwrap_or_default();
            let guild = match http.get_guild(partial.id).await {
                Ok(g) => g,
                Err(_) => continue,
            };
            if channels.is_empty() && guild.roles.is_empty() {
                continue;
            }
            // Best-effort role -> member ids (TS role.members cache).
            let mut members_of: HashMap<RoleId, Vec<String>> = HashMap::new();
            let mut cursor: Option<u64> = None;
            for _ in 0..MAX_MEMBER_PAGES {
                let members = http
                    .get_guild_members(partial.id, Some(1000), cursor)
                    .await
                    .unwrap_or_default();
                if members.is_empty() {
                    break;
                }
                cursor = members.last().map(|m| m.user.id.get());
                for m in &members {
                    let uid = m.user.id.get().to_string();
                    for role in &m.roles {
                        members_of.entry(*role).or_default().push(uid.clone());
                    }
                }
                if members.len() < 1000 {
                    break;
                }
            }
            let raws: Vec<RawChannel> = channels.iter().map(RawChannel::from).collect();
            let roles: Vec<BackupRole> = guild
                .roles
                .keys()
                .map(|id| BackupRole {
                    id: id.get().to_string(),
                    members: members_of.remove(id).unwrap_or_default(),
                })
                .collect();
            if save_backup(pool, &gid, &build_backup(&raws, roles))
                .await
                .is_ok()
            {
                done += 1;
            }
        }
        if after.is_none() {
            break;
        }
    }
    done
}

/// Load the global deferred-wipe queue. Missing or malformed rows
/// read as empty (best effort, never panic).
pub async fn load_wipe_queue(pool: &Pool) -> HashMap<String, PendingGuildDeletion> {
    match crate::db::kv_get(
        pool,
        crate::events_handler::GUILD_WIPE_QUEUE_SCOPE,
        GUILD_DELETE_QUEUE_KEY,
    )
    .await
    {
        Some(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        None => HashMap::new(),
    }
}

/// Persist the global deferred-wipe queue (best effort).
pub async fn save_wipe_queue(pool: &Pool, queue: &HashMap<String, PendingGuildDeletion>) {
    let raw = serde_json::to_string(queue).unwrap_or_else(|_| "{}".to_string());
    if let Err(e) = crate::db::kv_set(
        pool,
        crate::events_handler::GUILD_WIPE_QUEUE_SCOPE,
        GUILD_DELETE_QUEUE_KEY,
        &raw,
    )
    .await
    {
        tracing::warn!("scheduler: wipe queue save failed: {e}");
    }
}

/// Delete one guild's rows. Mirrors client.db.delete(guildId) in
/// clearGuildData (kv rows plus the Rust-side lang row).
async fn wipe_guild_data(pool: &Pool, guild_id: &str) {
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ?")
        .bind(guild_id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM guild_lang WHERE guild_id = ?")
        .bind(guild_id)
        .execute(pool)
        .await;
}

/// Sweep due deferred guild wipes. Loads the global wipe queue,
/// wipes guilds past their deadline (skipping guilds in `present`,
/// which mirrors clearGuildData's cache guard for rejoined guilds),
/// and persists the remainder. Returns guilds wiped. The timer tick
/// passes an empty `present` set; the first tick after boot doubles
/// as the ready recovery (mirrors
/// recoverPendingGuildDataDeletions).
pub async fn sweep_guild_wipe_queue(pool: &Pool, now_ms: i64, present: &HashSet<String>) -> u64 {
    let mut queue = load_wipe_queue(pool).await;
    if queue.is_empty() {
        return 0;
    }
    let due = wipe_queue_due(&queue, now_ms, present);
    if due.is_empty() {
        return 0;
    }
    for gid in &due {
        wipe_guild_data(pool, gid).await;
        queue.remove(gid);
    }
    save_wipe_queue(pool, &queue).await;
    let n = due.len() as u64;
    if n > 0 {
        tracing::info!("scheduler: wiped {n} left guilds");
    }
    n
}

/// Idle player sweep. Mirrors onEmptyQueue.destroyAfterMs (120s) +
/// queueEnd in playerManager.ts: players idle past the window get
/// their node player REST-destroyed, an OP4 leave on the serving
/// shard, and their voice-channel status cleared. `http: None`
/// (tests) skips the status clear; the OP4 leg no-ops until a shard
/// messenger registers at ready. Returns players destroyed.
pub async fn sweep_idle_players(
    http: Option<&std::sync::Arc<poise::serenity_prelude::Http>>,
    now_ms: i64,
) -> u64 {
    let targets = crate::lavalink::manager().sweep_idle_destroy(now_ms).await;
    let n = targets.len() as u64;
    for t in targets {
        if let Some(http) = http {
            if let Some(vc) = t.voice_channel {
                crate::lavalink::LavalinkManager::clear_voice_status(http, vc).await;
            }
        }
        crate::lavalink::manager().leave_voice(t.guild_id).await;
    }
    if n > 0 {
        tracing::info!("scheduler: destroyed {n} idle players");
    }
    n
}

pub fn spawn(pool: Pool, http: std::sync::Arc<poise::serenity_prelude::Http>) {
    // Schedule expiry (real).
    {
        let pool = pool.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(SCHEDULE_SWEEP_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let n = sweep_expired_schedules(&pool, now).await;
                if n > 0 {
                    tracing::info!("scheduler: swept {n} expired schedules");
                }
            }
        });
    }

    // Giveaway expiry (real, mirrors the 15s refresh loop).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(GIVEAWAY_REFRESH_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let g = sweep_expired_giveaways(&pool, Some(http.clone()), now).await;
                if g > 0 {
                    tracing::info!("scheduler: ended {g} expired giveaways");
                }
            }
        });
    }

    // Infrastructure monitoring (real, mirrors 60s manager tick).
    {
        let pool = pool.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(60));
            loop {
                t.tick().await;
                crate::monitor::tick(&pool, 0).await;
            }
        });
    }

    // Temp roles/bans expiry (real, mirrors 30s managers).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(TEMP_EXPIRY_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let (r, u) = sweep_temp_expiry(&pool, Some(http.clone()), now).await;
                if r + u > 0 {
                    tracing::info!("scheduler: expired {r} temproles, {u} tempbans");
                }
            }
        });
    }

    // Membercount refresh (real, mirrors 5min manager tick).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(MEMBERCOUNT_SECS));
            loop {
                t.tick().await;
                sweep_membercount(&pool, &http).await;
            }
        });
    }

    // PFPS poster (real, mirrors 45s manager tick).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(45));
            loop {
                t.tick().await;
                sweep_pfps(&pool, &http).await;
            }
        });
    }

    // Auto-renew sweep (real, mirrors 30s manager tick).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(TEMP_EXPIRY_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                sweep_autorenew(&pool, &http, now).await;
            }
        });
    }

    // Blogger RSS poll (real, mirrors 60s Blogger refresh).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(60));
            loop {
                t.tick().await;
                sweep_blogger(&pool, &http).await;
            }
        });
    }

    // Nightmode tick (real, mirrors 60s manager refresh).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(NIGHTMODE_SECS));
            loop {
                t.tick().await;
                sweep_nightmode(&pool, &http).await;
            }
        });
    }

    // Protection structure backup (real, mirrors 60s ready.ts tick).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(PROTECTION_BACKUP_SECS));
            loop {
                t.tick().await;
                let n = sweep_protection_backup(&pool, &http).await;
                if n > 0 {
                    tracing::info!("scheduler: backed up {n} guild structures");
                }
            }
        });
    }

    // Idle player sweep (real, mirrors onEmptyQueue.destroyAfterMs 120s
    // + queueEnd: rest_destroy + OP4 leave + status clear).
    {
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(IDLE_SWEEP_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                sweep_idle_players(Some(&http), now).await;
            }
        });
    }

    // Deferred guild-wipe queue (real, mirrors the 10h cancellable
    // deletion in deleteDatabaseDataOnGuildLeave.ts). Poll-based so
    // pending wipes survive restarts; the first tick after boot is
    // the ready recovery (mirrors
    // recoverPendingGuildDataDeletions). No cache access here, so
    // the tick passes an empty present set; rejoin safety comes
    // from the guild_create cancel.
    {
        let pool = pool.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(WIPE_QUEUE_SWEEP_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let n = sweep_guild_wipe_queue(&pool, now, &HashSet::new()).await;
                if n > 0 {
                    tracing::info!("scheduler: wiped {n} left guilds");
                }
            }
        });
    }

    // Skeleton tick for the StreamNotifier module (timing mirrors the
    // 120s refresh in core/StreamNotifier.ts). Blocked on the
    // Twitch/YouTube/Kick live APIs — see Blocked in MIGRATION.md.
    {
        let (name, secs) = ("notifier", NOTIFIER_SECS);
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(secs));
            loop {
                t.tick().await;
                tracing::debug!("scheduler tick: {name} (module pending)");
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
    use std::str::FromStr;

    async fn pool() -> Pool {
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let p = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&p).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&p).await.unwrap();
        p
    }

    #[tokio::test]
    async fn sweep_removes_only_expired() {
        let p = pool().await;
        crate::db::kv_set(
            &p,
            "g",
            "SCHEDULE.1.old",
            r#"{"code":"old","title":"t","description":"d","expires_at_ms":100}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(
            &p,
            "g",
            "SCHEDULE.1.new",
            r#"{"code":"new","title":"t","description":"d","expires_at_ms":9999999999999}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(&p, "g", "OTHER.key", "v").await.unwrap();
        let n = sweep_expired_schedules(&p, 200).await;
        assert_eq!(n, 1);
        assert!(crate::db::kv_get(&p, "g", "SCHEDULE.1.old").await.is_none());
        assert!(crate::db::kv_get(&p, "g", "SCHEDULE.1.new").await.is_some());
        assert!(crate::db::kv_get(&p, "g", "OTHER.key").await.is_some());
    }

    #[tokio::test]
    async fn sweep_ignores_malformed_json() {
        let p = pool().await;
        crate::db::kv_set(&p, "g", "SCHEDULE.1.bad", "not-json")
            .await
            .unwrap();
        let n = sweep_expired_schedules(&p, i64::MAX).await;
        assert_eq!(n, 0);
    }

    #[tokio::test]
    async fn giveaway_sweep_ends_expired_with_winners() {
        let p = pool().await;
        crate::db::kv_set(&p, "g", "GIVEAWAY.1", r#"{"guild_id":"g","channel_id":"c","winner_count":1,"prize":"p","hosted_by":"h","expire_in_ms":100,"ended":false,"entries":["a","b"],"winners":[]}"#).await.unwrap();
        crate::db::kv_set(&p, "g", "GIVEAWAY.2", r#"{"guild_id":"g","channel_id":"c","winner_count":1,"prize":"p","hosted_by":"h","expire_in_ms":9999999999999,"ended":false,"entries":["a"],"winners":[]}"#).await.unwrap();
        let n = sweep_expired_giveaways(&p, None, 200).await;
        assert_eq!(n, 1);
        let raw = crate::db::kv_get(&p, "g", "GIVEAWAY.1").await.unwrap();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(v.get("ended"), Some(&serde_json::Value::Bool(true)));
        assert_eq!(
            v.get("winners").and_then(|w| w.as_array()).map(|a| a.len()),
            Some(1)
        );
        let n2 = sweep_expired_giveaways(&p, None, 200).await;
        assert_eq!(n2, 0);
    }

    #[tokio::test]
    async fn temp_sweep_removes_expired_keys() {
        let p = pool().await;
        crate::db::kv_set(&p, "1", "GUILD.TEMPROLE.2.3", r#"{"expires_at_ms":100}"#)
            .await
            .unwrap();
        crate::db::kv_set(&p, "1", "GUILD.TEMPBAN.4", r#"{"expires_at_ms":100}"#)
            .await
            .unwrap();
        crate::db::kv_set(
            &p,
            "1",
            "GUILD.TEMPROLE.5.6",
            r#"{"expires_at_ms":9999999999999}"#,
        )
        .await
        .unwrap();
        let (r, u) = sweep_temp_expiry(&p, None, 200).await;
        assert_eq!((r, u), (1, 1));
        assert!(crate::db::kv_get(&p, "1", "GUILD.TEMPROLE.5.6")
            .await
            .is_some());
    }

    #[tokio::test]
    async fn idle_sweep_destroys_only_aged_players_offline() {
        // Unique guild so this never races other manager() users.
        const GID: u64 = 918_273_645;
        const OLD: u64 = 918_273_646;
        let m = crate::lavalink::manager();
        // GID idle a full 120s -> destroyed; OLD only 60s -> kept.
        let now = 1000 + crate::lavalink::EMPTY_QUEUE_DESTROY_AFTER_MS;
        m.with_player(GID, |p| {
            p.voice_channel = Some(7);
            p.stop(1000);
        })
        .await;
        m.with_player(OLD, |p| {
            p.stop(now - 60_000);
        })
        .await;
        assert_eq!(sweep_idle_players(None, now - 60_000).await, 0);
        assert_eq!(sweep_idle_players(None, now).await, 1);
        assert!(m.snapshot(GID).await.is_none());
        assert!(m.snapshot(OLD).await.is_some());
        // Cleanup so later suites see a clean manager.
        m.remove_player(OLD).await;
        assert_eq!(sweep_idle_players(None, now).await, 0);
    }

    #[tokio::test]
    async fn wipe_sweep_wipes_only_due_and_absent() {
        use crate::events_handler::wipe_queue_enqueue;
        let p = pool().await;
        for gid in ["gone", "back", "fresh"] {
            crate::db::kv_set(&p, gid, "GUILD.LANG", "en-US")
                .await
                .unwrap();
        }
        let mut q = HashMap::new();
        // All three left at t=0, so all expire at the 10h deadline.
        for (gid, name) in [("gone", "Gone"), ("back", "Back"), ("fresh", "Fresh")] {
            wipe_queue_enqueue(&mut q, gid, name, "o1", 0);
        }
        save_wipe_queue(&p, &q).await;
        let deadline = crate::events_handler::GUILD_WIPE_DELAY_MS;
        // Before the deadline nothing happens (ready recovery keeps all).
        assert_eq!(
            sweep_guild_wipe_queue(&p, deadline - 1, &HashSet::new()).await,
            0
        );
        // At the deadline the absent guild is wiped; the rejoined
        // guild ("back", present in cache) is spared.
        let present = HashSet::from(["back".to_string()]);
        assert_eq!(sweep_guild_wipe_queue(&p, deadline, &present).await, 2);
        assert!(crate::db::kv_get(&p, "gone", "GUILD.LANG").await.is_none());
        assert!(crate::db::kv_get(&p, "fresh", "GUILD.LANG").await.is_none());
        assert!(crate::db::kv_get(&p, "back", "GUILD.LANG").await.is_some());
        // Wiped guilds leave the queue; the spared one stays queued.
        let rest = load_wipe_queue(&p).await;
        assert!(!rest.contains_key("gone"));
        assert!(!rest.contains_key("fresh"));
        assert!(rest.contains_key("back"));
        // Second sweep is a no-op.
        assert_eq!(sweep_guild_wipe_queue(&p, deadline, &present).await, 0);
    }

    #[test]
    fn membercount_gate_only_explicit_false_opts_out() {
        let missing = serde_json::json!({"name": "x", "channel": "1"});
        assert!(membercount_slot_enabled(&missing));
        assert!(membercount_slot_enabled(
            &serde_json::json!({"enable": true})
        ));
        assert!(!membercount_slot_enabled(
            &serde_json::json!({"enable": false})
        ));
    }

    #[test]
    fn autorenew_half_window_matches_ts() {
        // ts=0, max=60_000 -> half at 30_000, window +/-15s.
        assert!(autorenew_half_window(0, 60_000, 30_000));
        assert!(autorenew_half_window(0, 60_000, 30_000 + 14_999));
        assert!(autorenew_half_window(0, 60_000, 30_000 - 14_999));
        assert!(!autorenew_half_window(0, 60_000, 30_000 + 15_000));
        assert!(!autorenew_half_window(0, 60_000, 0));
        assert!(!autorenew_half_window(0, 60_000, 60_000));
        assert!(autorenew_expired(0, 60_000, 60_000));
        assert!(!autorenew_expired(0, 60_000, 59_999));
    }

    #[test]
    fn night_window_covers_overnight_and_day() {
        // Day window 09:00-18:00.
        assert!(night_window_started(540, 1080, 540));
        assert!(night_window_started(540, 1080, 1080));
        assert!(night_window_started(540, 1080, 720));
        assert!(!night_window_started(540, 1080, 539));
        assert!(!night_window_started(540, 1080, 1081));
        // Overnight 22:30-06:15.
        assert!(night_window_started(1350, 375, 1350));
        assert!(night_window_started(1350, 375, 0));
        assert!(night_window_started(1350, 375, 375));
        assert!(night_window_started(1350, 375, 1400));
        assert!(!night_window_started(1350, 375, 376));
        assert!(!night_window_started(1350, 375, 1349));
    }

    #[test]
    fn guild_minutes_apply_utc_offset() {
        // Epoch = 00:00 UTC.
        assert_eq!(guild_now_minutes(0, 0), 0);
        assert_eq!(guild_now_minutes(0, 1), 60);
        assert_eq!(guild_now_minutes(0, -5), 1140);
        assert_eq!(guild_now_minutes(3600, 2), 180);
    }

    #[test]
    fn pfps_pick_steps_forward_on_repeat() {
        assert_eq!(pick_pfps_index(0, None, 7), None);
        assert_eq!(pick_pfps_index(1, Some(0), 0), Some(0));
        assert_eq!(pick_pfps_index(3, None, 4), Some(1));
        assert_eq!(pick_pfps_index(3, Some(1), 4), Some(2));
        assert_eq!(pick_pfps_index(3, Some(2), 5), Some(0));
        assert_eq!(pick_pfps_index(3, Some(0), 4), Some(1));
    }

    #[test]
    fn giveaway_lifetime_and_dedup() {
        assert!(!giveaway_lifetime_due(100, 200));
        assert!(giveaway_lifetime_due(0, ENDED_GIVEAWAY_LIFETIME_MS));
        assert!(giveaway_lifetime_due(0, ENDED_GIVEAWAY_LIFETIME_MS + 1));
        let mut e = vec!["b".to_string(), "a".to_string(), "b".to_string()];
        dedup_entries(&mut e);
        assert_eq!(e, vec!["a".to_string(), "b".to_string()]);
    }

    #[tokio::test]
    async fn giveaway_sweep_deletes_past_lifetime_and_dedups() {
        let p = pool().await;
        // Already-ended row past the 345.6M ms lifetime: deleted, not counted.
        crate::db::kv_set(&p, "g", "GIVEAWAY.9", &format!("{{\"guild_id\":\"g\",\"channel_id\":\"c\",\"winner_count\":1,\"prize\":\"p\",\"hosted_by\":\"h\",\"expire_in_ms\":0,\"ended\":true,\"entries\":[],\"winners\":[\"a\"]}}")).await.unwrap();
        // Live row with doubled entries: deduped, kept.
        crate::db::kv_set(&p, "g", "GIVEAWAY.8", r#"{"guild_id":"g","channel_id":"c","winner_count":1,"prize":"p","hosted_by":"h","expire_in_ms":9999999999999,"ended":false,"entries":["b","a","b"],"winners":[]}"#).await.unwrap();
        let n = sweep_expired_giveaways(&p, None, ENDED_GIVEAWAY_LIFETIME_MS + 1000).await;
        assert_eq!(n, 0);
        assert!(crate::db::kv_get(&p, "g", "GIVEAWAY.9").await.is_none());
        let raw = crate::db::kv_get(&p, "g", "GIVEAWAY.8").await.unwrap();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        let entries: Vec<&str> = v
            .get("entries")
            .and_then(|e| e.as_array())
            .map(|a| a.iter().filter_map(|s| s.as_str()).collect())
            .unwrap();
        assert_eq!(entries, vec!["a", "b"]);
    }

    #[tokio::test]
    async fn wipe_sweep_tolerates_malformed_queue() {
        let p = pool().await;
        crate::db::kv_set(
            &p,
            crate::events_handler::GUILD_WIPE_QUEUE_SCOPE,
            GUILD_DELETE_QUEUE_KEY,
            "not-json",
        )
        .await
        .unwrap();
        assert_eq!(
            sweep_guild_wipe_queue(&p, i64::MAX, &HashSet::new()).await,
            0
        );
    }
}
