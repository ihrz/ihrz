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

pub const SCHEDULE_SWEEP_SECS: u64 = 50;
pub const TEMP_EXPIRY_SECS: u64 = 30;
pub const MEMBERCOUNT_SECS: u64 = 300;
pub const NIGHTMODE_SECS: u64 = 60;
pub const NOTIFIER_SECS: u64 = 120;
pub const PROTECTION_BACKUP_SECS: u64 = 60;
pub const IDLE_SWEEP_SECS: u64 = 60;
/// H24/7 watchdog interval. Mirrors `setInterval(watchdogH247Sessions,
/// 60_000)` in src/Events/client/ready.ts.
pub const H247_WATCHDOG_SECS: u64 = 60;
/// Temp-voice recovery interval. Mirrors `setInterval(()
/// => recoverCustomVoiceChannels(client), 120_000)` in ready.ts.
pub const TEMPVOICE_RECOVERY_SECS: u64 = 120;
/// Wipe-queue sweep interval. Poll-based instead of the TS
/// per-guild timers so pending wipes survive restarts; the first
/// tick after boot is the ready recovery.
pub const WIPE_QUEUE_SWEEP_SECS: u64 = 60;

/// get_guilds page size used by every guild-enumerating sweep.
pub const GUILD_PAGE_LIMIT: u64 = 200;

/// True when a get_guilds page is the final one: Discord returns
/// fewer rows than the requested limit only at the end, so the sweep
/// stops instead of firing one more (empty, rate-limit-delayed) page.
pub fn guild_page_is_last(page_len: usize) -> bool {
    page_len < GUILD_PAGE_LIMIT as usize
}

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

/// Expiry date line, mirroring TS `format(date, "YYYY/MM/DD HH:mm:ss")`
/// in ready.ts `refreshSchedule` (chrono is already a dependency).
pub fn schedule_expiry_stamp(expires_at_ms: i64) -> String {
    chrono::DateTime::from_timestamp_millis(expires_at_ms)
        .map(|d| d.format("%Y/%m/%d %H:%M:%S").to_string())
        .unwrap_or_default()
}

/// Expiry embed body: date + triple-backtick title + triple-backtick
/// description, mirroring the `desc +=` lines in `refreshSchedule`.
pub fn schedule_expiry_desc(entry: &crate::commands::schedule::ScheduleEntry) -> String {
    format!(
        "{stamp}```{title}``````{desc}```",
        stamp = schedule_expiry_stamp(entry.expires_at_ms),
        title = entry.title,
        desc = entry.description,
    )
}

/// Expiry embed title: `#<code> Schedule has been expired!`
/// (exact en-US fallback, no YAML touch).
pub fn schedule_expiry_title(code: &str) -> String {
    format!("#{code} Schedule has been expired!")
}

/// Honeypot second-sweep delay (8s). Mirrors
/// HONEYPOT_SECOND_PASS_DELAY_MS in src/core/modules/honeypotManager.ts.
/// The trap itself is event-driven (messageCreate -> debounced pipeline
/// in crate::commands::honeypot), so the scheduler owns no interval here:
/// this hook only specs when the second cleanup pass is due.
pub const HONEYPOT_SECOND_PASS_DELAY_MS: i64 = 8000;

/// Second-pass due check: first cleanup pass ran at `first_pass_ms`,
/// the safety-net sweep fires 8s later.
pub fn honeypot_second_pass_due(first_pass_ms: i64, now_ms: i64) -> bool {
    now_ms - first_pass_ms >= HONEYPOT_SECOND_PASS_DELAY_MS
}

/// Delete expired SCHEDULE.* entries across all guilds, DMing each
/// owner the expiry embed first. Mirrors ready.ts `refreshSchedule`:
/// per expired entry build the `#<code> Schedule has been expired!`
/// embed (date + title + desc, nerd thumbnail, iHorizon footer with
/// icon attachment, timestamp) addressed to the schedule owner, send
/// it best-effort (DM-closed users just skip, like the TS
/// `.catch(() => {})`), then delete the row. With `http: None`
/// (tests) only keys are deleted. Returns rows removed.
pub async fn sweep_expired_schedules(
    pool: &Pool,
    http: Option<std::sync::Arc<poise::serenity_prelude::Http>>,
    now_ms: i64,
) -> u64 {
    let rows: Vec<(String, String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| key.starts_with("SCHEDULE."))
        .collect();

    let mut removed = 0u64;
    for (gid, key, raw) in rows {
        let rest = match key.strip_prefix("SCHEDULE.") {
            Some(rest) => rest,
            None => continue,
        };
        let (user_part, code) = match rest.rsplit_once('.') {
            Some(pair) => pair,
            None => continue,
        };
        let Ok(user_id) = user_part.parse::<u64>() else {
            continue;
        };
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) else {
            continue;
        };
        let Some(entry) = crate::commands::schedule::entry_from_value(&v, code) else {
            continue;
        };
        if now_ms < entry.expires_at_ms {
            continue;
        }
        if let Some(http) = &http {
            notify_schedule_expiry(pool, http, &gid, user_id, &entry).await;
        }
        if crate::db::kv_del(pool, &gid, &key).await.is_ok() {
            removed += 1;
        }
    }
    removed
}

/// DM one schedule-expiry embed. Best-effort: any failure is dropped
/// (mirrors the TS `.catch(() => {})`); the caller deletes the row
/// either way.
async fn notify_schedule_expiry(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
    guild_id: &str,
    user_id: u64,
    entry: &crate::commands::schedule::ScheduleEntry,
) {
    use poise::serenity_prelude::{CreateAttachment, CreateEmbed, CreateMessage, UserId};
    let user = match UserId::new(user_id).to_user(http).await {
        Ok(user) => user,
        Err(_) => return,
    };
    let name = crate::commands::shared::bot_footer_name(
        crate::db::kv_get(pool, guild_id, crate::commands::shared::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let stored = crate::db::kv_get(pool, guild_id, crate::commands::shared::BOT_PFP_KEY).await;
    let icon: Option<Vec<u8>> = match crate::commands::shared::footer_icon_bytes(stored.as_deref())
    {
        Some(bytes) => Some(bytes),
        None => {
            let face = http
                .get_current_user()
                .await
                .map(|u| u.face())
                .unwrap_or_default();
            if face.is_empty() {
                None
            } else {
                crate::commands::shared::download_bytes(&face).await
            }
        }
    };
    let embed = CreateEmbed::default()
        .colour(poise::serenity_prelude::Colour::new(0x56a0d3))
        .title(schedule_expiry_title(&entry.code))
        .description(schedule_expiry_desc(entry))
        .thumbnail(crate::funcs::expression_url("Nerd"))
        .timestamp(poise::serenity_prelude::Timestamp::now())
        .footer(if icon.is_some() {
            poise::serenity_prelude::CreateEmbedFooter::new(name)
                .icon_url("attachment://footer_icon.png")
        } else {
            poise::serenity_prelude::CreateEmbedFooter::new(name)
        });
    let Ok(dm) = user.create_dm_channel(http).await else {
        return;
    };
    let mut msg = CreateMessage::new().content(user.to_string()).embed(embed);
    if let Some(bytes) = icon {
        msg = msg.add_file(CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = dm.send_message(http, msg).await;
}

/// Seconds between giveaway expiry sweeps. Mirrors `forceUpdateEvery:
/// 3600` in src/core/core.ts (the `setInterval(refresh, ...)` period in
/// the GiveawayManager constructor, ~4s).
const GIVEAWAY_REFRESH_SECS: u64 = 4;

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
    let rows: Vec<(String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| key.starts_with("GIVEAWAY."))
        .map(|(gid, key, _)| (gid, key))
        .collect();

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
        // End gates (mirror giveawaysManager refresh() + end()):
        // expired + not already ended finishes; an already-ended row
        // is rejected here exactly like end() rejects it with
        // "Invalid Giveaway". Cross-shard no-op is preserved by
        // construction: TS skips guilds outside the serving shard
        // (`!client.inShard(...)`) because every shard runs refresh();
        // here one scheduler pass owns every guild, so there is no
        // foreign shard to skip.
        if !gw.ended && now_ms >= gw.expire_in_ms {
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
        // Ended-giveaway retention, after the finish pass like the TS
        // refresh() (finish, then the cooldownTime branch): an overdue
        // board still gets its winners notice before the row is
        // deleted, even when already ended.
        if giveaway_lifetime_due(gw.expire_in_ms, now_ms) {
            let _ = crate::db::kv_del(pool, &gid, &key).await;
        }
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
    let rows: Vec<(String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| {
            key.starts_with("GUILD.TEMPROLE.") || key.starts_with("GUILD.TEMPBAN.")
        })
        .map(|(gid, key, _)| (gid, key))
        .collect();

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
                    let _ = crate::db::kv_del(pool, &gid, &key).await;
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
        let _ = crate::db::kv_del(pool, &gid, &key).await;
    }
    (roles, unbans)
}

/// Table-routed guild id scope. Mirrors `tbl:<table>` in backends.rs:
/// table rows live under guild_id `tbl:<gid>` with the dot-root key.
pub fn mcount_table_guild_id(row_guild_id: &str) -> Option<&str> {
    row_guild_id.strip_prefix("tbl:")
}

/// Slot suffix of a `GUILD.MCOUNT.<slot>` key.
pub fn mcount_slot_of_key(key: &str) -> Option<&str> {
    key.strip_prefix("GUILD.MCOUNT.")
}

/// Slot config: template name + voice channel id. The channel accepts
/// the TS string shape and numeric ids; the enable gate stays in
/// `membercount_slot_enabled` (only explicit `false` opts out).
pub fn mcount_slot_config(cfg: &serde_json::Value) -> Option<(&str, u64)> {
    let tpl = cfg.get("name")?.as_str()?;
    let ch = match cfg.get("channel")? {
        serde_json::Value::String(s) => s.parse::<u64>().ok()?,
        serde_json::Value::Number(n) => n.as_u64()?,
        _ => return None,
    };
    Some((tpl, ch))
}

/// Extract per-slot configs from a table-routed `GUILD` root object
/// (`value.MCOUNT.<slot>`), the write shape of `save_mcount`.
pub fn mcount_table_slots(root: &serde_json::Value) -> Vec<(String, serde_json::Value)> {
    root.get("MCOUNT")
        .and_then(|m| m.as_object())
        .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
        .unwrap_or_default()
}

/// Membercount refresh. Mirrors memberCountManager 5min tick: for each
/// GUILD.MCOUNT.<slot> config, render all 7 placeholders from live
/// counts (exact `guild.member_count` preferred over the preview
/// approximation) and rename the voice channel from its template.
///
/// Sources: table-routed `tbl:<gid>` GUILD roots first, legacy flat
/// `GUILD.MCOUNT.%` rows as fallback (table wins per slot).
/// Note: TS Refresh renders the channel slot with the roles count
/// (upstream quirk); the sweep uses the real channel count instead.
pub async fn sweep_membercount(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use poise::serenity_prelude::{ChannelId, GuildId};
    use std::collections::HashMap;

    // slot configs keyed by (gid, slot); table rows win over legacy.
    let mut slots: HashMap<(String, String), serde_json::Value> = HashMap::new();
    let legacy: Vec<(String, String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| key.starts_with("GUILD.MCOUNT."))
        .collect();
    for (gid, key, raw) in legacy {
        if mcount_table_guild_id(&gid).is_some() {
            continue;
        }
        let Some(slot) = mcount_slot_of_key(&key) else {
            continue;
        };
        if slot.contains('.') {
            continue;
        }
        if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
            slots.entry((gid, slot.to_string())).or_insert(cfg);
        }
    }
    let table_roots: Vec<(String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(gid, key, _)| gid.starts_with("tbl:") && key == "GUILD")
        .map(|(gid, _, value)| (gid, value))
        .collect();
    for (row_gid, raw) in table_roots {
        let Some(gid) = mcount_table_guild_id(&row_gid) else {
            continue;
        };
        let Ok(root) = serde_json::from_str::<serde_json::Value>(&raw) else {
            continue;
        };
        // Table values may be stored doubly-encoded (string of JSON)
        // by string-taking writers; accept both shapes.
        let parsed: Option<serde_json::Value> = match &root {
            serde_json::Value::String(s) => serde_json::from_str(s).ok(),
            _ => None,
        };
        let root_ref = parsed.as_ref().unwrap_or(&root);
        for (slot, cfg) in mcount_table_slots(root_ref) {
            let cfg = match &cfg {
                serde_json::Value::String(s) => {
                    serde_json::from_str(s).unwrap_or(serde_json::Value::Null)
                }
                other => other.clone(),
            };
            slots.insert((gid.to_string(), slot), cfg);
        }
    }

    let mut done = 0u64;
    for ((gid, _slot), cfg) in slots {
        let Ok(gid_num) = gid.parse::<u64>() else {
            continue;
        };
        // TS memberCountManager has no enable gate; only an explicit
        // `enable: false` opts a slot out (missing key stays active).
        if !membercount_slot_enabled(&cfg) {
            continue;
        }
        let Some((tpl, ch_num)) = mcount_slot_config(&cfg) else {
            continue;
        };
        let counts = crate::commands::membercount::membercount::fetch_channel_counts(
            http,
            GuildId::new(gid_num),
        )
        .await;
        let name = crate::commands::membercount::render_name(tpl, &counts);
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
    let rows: Vec<(String, String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| key == "PFPS.channel" || key == "PFPS.disable")
        .collect();
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
    let rows: Vec<(String, String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| key.starts_with("UTILS.renew_channel."))
        .collect();
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
                let _ = crate::db::kv_del(pool, &gid, &key).await;
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
            let _ = crate::db::kv_del(pool, &gid, &key).await;
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
        let _ = crate::db::kv_del(pool, &gid, &key).await;
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

/// Blogger RSS poll. Mirrors Blogger.ts 60s refresh: per guild with
/// BLOGGER.enabled set, latest article per configured blog, skip
/// when already notified, post the rendered message + link button
/// (nonce + enforceNonce, like the TS channel.send). The notified row
/// and the posted count land only on a successful send, like the TS
/// push inside `if (channel)`. 5s pacing between blogs mirrors the
/// fetchBlogsFeeds delay.
pub async fn sweep_blogger(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use crate::commands::blogger::{
        article_already_notified, latest_rss_item, load_blogger_enabled, NotifiedArticle,
    };
    use poise::serenity_prelude::{ChannelId, CreateActionRow, CreateButton, CreateMessage, Nonce};
    let gids = blogger_guild_ids(pool).await;
    let web = reqwest::Client::new();
    let mut posted = 0u64;
    for gid in &gids {
        // Skip if module is disabled (Blogger.ts refresh leg).
        if !load_blogger_enabled(pool, gid).await {
            continue;
        }
        let blogs = crate::commands::blogger::load_blogs(pool, gid).await;
        if blogs.is_empty() {
            continue;
        }
        let code = crate::db::guild_lang(pool, gid.parse::<u64>().ok()).await;
        let say = |key: &str, fallback: &str| {
            crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
        };
        let template = say(
            "blogger_on_new_article_default_message",
            "New article published!\n**{articleTitle}** by {articleAuthor}\n{articleLink}",
        );
        let button_label = say("blogger_read_article", "Read Article");
        for blog in &blogs {
            let body = match web.get(&blog.rss).send().await {
                Ok(r) => r.text().await.unwrap_or_default(),
                Err(_) => {
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    continue;
                }
            };
            let Some(item) = latest_rss_item(&body) else {
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            };
            let notified = load_notified_articles(pool, gid).await;
            if article_already_notified(&notified, &blog.id, &item.id, item.pub_ms) {
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            }
            let blog_name = crate::commands::blogger::fetch_rss_title(&blog.rss).await;
            let message = render_blogger_announce(
                &template,
                &item.title,
                &item.author,
                &item.link,
                blog_name.as_deref().unwrap_or("Unknown Blog"),
                gid,
            );
            // TS only pushes lastArticleNotified inside `if (channel)`;
            // the row and the posted count land only on a successful
            // send, so a failed post is retried on the next tick.
            if let Ok(ch_num) = blog.channel_id.parse::<u64>() {
                let nonce_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis())
                    .unwrap_or(0);
                let msg = CreateMessage::new()
                    .content(message)
                    .components(vec![CreateActionRow::Buttons(vec![
                        CreateButton::new_link(item.link.clone()).label(button_label.clone()),
                    ])])
                    .nonce(Nonce::String(format!("blogger-{}-{nonce_ms}", blog.id)))
                    .enforce_nonce(true);
                if ChannelId::new(ch_num).send_message(http, msg).await.is_ok() {
                    let mut list = notified;
                    list.push(NotifiedArticle {
                        blog_id: blog.id.clone(),
                        article_id: item.id.clone(),
                        timestamp_ms: item.pub_ms,
                    });
                    let _ = record_notified_articles(pool, gid, &list).await;
                    posted += 1;
                }
            }
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
    }
    posted
}

/// Guild ids with a BLOGGER.blogs config (legacy rows + table roots).
async fn blogger_guild_ids(pool: &Pool) -> Vec<String> {
    let mut ids: HashSet<String> = HashSet::new();
    for (gid, _, _) in crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| key == "BLOGGER.blogs")
    {
        match gid.strip_prefix("tbl:") {
            Some(real) => {
                ids.insert(real.to_string());
            }
            None => {
                ids.insert(gid);
            }
        }
    }
    ids.into_iter().collect()
}

/// Store read for BLOGGER.lastArticleNotified: guild-table row
/// first, legacy kv fallback.
pub async fn load_notified_articles(
    pool: &Pool,
    gid: &str,
) -> Vec<crate::commands::blogger::NotifiedArticle> {
    use crate::commands::blogger::parse_notified_articles;
    let backend = crate::backends::Backend::sqlite(pool.clone());
    if let Ok(Some(value)) = backend
        .table(gid)
        .get::<serde_json::Value>("BLOGGER.lastArticleNotified")
        .await
    {
        let raw = match &value {
            serde_json::Value::String(s) => s.clone(),
            _ => value.to_string(),
        };
        return parse_notified_articles(Some(&raw));
    }
    parse_notified_articles(
        crate::db::kv_get(pool, gid, "BLOGGER.lastArticleNotified")
            .await
            .as_deref(),
    )
}

/// Store write for BLOGGER.lastArticleNotified: guild-table row plus
/// legacy kv (routed dual-write).
pub async fn record_notified_articles(
    pool: &Pool,
    gid: &str,
    list: &[crate::commands::blogger::NotifiedArticle],
) -> anyhow::Result<()> {
    let raw = serde_json::to_string(list).unwrap_or_else(|_| "[]".to_string());
    crate::backends::Backend::sqlite(pool.clone())
        .table(gid)
        .set("BLOGGER.lastArticleNotified", &raw)
        .await?;
    crate::db::kv_set(pool, gid, "BLOGGER.lastArticleNotified", &raw).await?;
    Ok(())
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
    // Paginate to exhaustion (no page cap): TS iterates the whole
    // guild cache, so a capped scan would silently skip guilds.
    loop {
        let page = match http
            .get_guilds(after.map(GuildPagination::After), Some(GUILD_PAGE_LIMIT))
            .await
        {
            Ok(p) if !p.is_empty() => p,
            _ => break,
        };
        after = page.last().map(|g| g.id);
        // Short page = last page (a full page may still end the list,
        // which the next fetch reports as empty — one extra call at
        // most, same as before).
        let last_page = guild_page_is_last(page.len());
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
        if last_page {
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
    // Paginate to exhaustion (no page cap): TS iterates the whole
    // guild cache, so a capped scan would silently skip guilds.
    loop {
        let page = match http
            .get_guilds(after.map(GuildPagination::After), Some(GUILD_PAGE_LIMIT))
            .await
        {
            Ok(p) if !p.is_empty() => p,
            _ => break,
        };
        after = page.last().map(|g| g.id);
        // Short page = last page (a full page may still end the list,
        // which the next fetch reports as empty — one extra call at
        // most, same as before).
        let last_page = guild_page_is_last(page.len());
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
        if last_page {
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
    let _ = crate::db::kv_del_guild(pool, guild_id).await;
    let _ = crate::db::clear_guild_lang(pool, guild_id).await;
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

/// Parked H24/7 channel for a guild, table-first with legacy fallback
/// (keys unchanged). Reads the table-routed `tbl:<gid>` GUILD root
/// (doubly-encoded accepted, like the membercount sweep) then the
/// legacy `GUILD.H247` kv row; parses with the grant decoder (enabled
/// + voiceChannelId string shape).
pub async fn h247_parked_channel(pool: &Pool, gid: &str) -> Option<u64> {
    let table_root: Option<u64> = crate::db::kv_get(pool, &format!("tbl:{gid}"), "GUILD")
        .await
        .and_then(|raw| {
            let root: serde_json::Value = serde_json::from_str(&raw).ok()?;
            let root_ref = match &root {
                serde_json::Value::String(s) => serde_json::from_str(s).ok()?,
                v => v.clone(),
            };
            let h247 = root_ref.get("H247")?;
            let text = match h247 {
                serde_json::Value::String(s) => serde_json::from_str::<serde_json::Value>(s)
                    .map(|v| v.to_string())
                    .unwrap_or_else(|_| s.clone()),
                v => v.to_string(),
            };
            crate::commands::h247::grant::parse_h247(&text).map(|c| c.voice_channel_id)
        });
    if table_root.is_some() {
        return table_root;
    }
    let raw = crate::db::kv_get(pool, gid, "GUILD.H247").await?;
    crate::commands::h247::grant::parse_h247(&raw).map(|c| c.voice_channel_id)
}

/// Idle player sweep. Mirrors onEmptyQueue.destroyAfterMs (120s) +
/// queueEnd in playerManager.ts: players idle past the window get
/// their node player REST-destroyed, an OP4 leave on the serving
/// shard, and their voice-channel status cleared. `http: None`
/// (tests) skips the status clear; the OP4 leg no-ops until a shard
/// messenger registers at ready. Returns players destroyed.
///
/// H24/7 park leg (mirrors handleH247PlayerIdleDestroy): when the
/// destroyed player sat in the parked H24/7 channel, the OP4 leave and
/// the status clear are skipped so the bot never visibly disconnects,
/// and a detached post-destroy rejoin (mirrors
/// handleH247PlayerDestroyed) re-emits the voice presence.
pub async fn sweep_idle_players(
    pool: &Pool,
    http: Option<&std::sync::Arc<poise::serenity_prelude::Http>>,
    now_ms: i64,
) -> u64 {
    let targets = crate::lavalink::manager().sweep_idle_destroy(now_ms).await;
    let n = targets.len() as u64;
    for t in targets {
        let gid = t.guild_id.to_string();
        let parked = h247_parked_channel(pool, &gid).await;
        if crate::voice::h247_idle_keep_voice(parked, t.voice_channel) {
            tracing::info!(
                "scheduler: kept parked H247 voice for guild {} (channel {})",
                t.guild_id,
                t.voice_channel.unwrap_or(0),
            );
            if let Some(ch) = t.voice_channel {
                spawn_h247_post_destroy_rejoin(t.guild_id, ch);
            }
            continue;
        }
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

/// Post-destroy H24/7 rejoin. Mirrors handleH247PlayerDestroyed.
/// Known delta (kept per product sign-off): TS destroys the player with
/// `disconnect=false` synchronously on the empty-queue event
/// (handleH247PlayerIdleDestroy, h247Manager.ts:353-369), so the bot
/// never visibly leaves; here the destroy goes through first and the
/// rejoin is post-hoc, so a brief disconnect/rejoin can show in the
/// client during the retry window. Closing the gap would need the
/// synchronous pre-destroy hook lavalink.rs does not expose.
///
/// Retry shape: skip when a player already exists, then up to 3 force
/// re-emits (1s then 2s delays) with a connect confirm between
/// attempts. The confirm
/// polls the cached Discord handshake (no guild cache is reachable
/// from the scheduler, so the TS disconnect-observe leg is
/// approximated: the force update is idempotent, and a handshake that
/// already names the parked channel counts as confirmed). Detached so
/// the sweep tick never blocks on the retry delays.
pub fn spawn_h247_post_destroy_rejoin(guild_id: u64, channel_id: u64) {
    tokio::spawn(async move {
        use crate::commands::h247::session;
        let mgr = crate::lavalink::manager();
        for attempt in 0..crate::voice::H247_REJOIN_MAX_ATTEMPTS {
            let wait_ms = if attempt == 0 {
                crate::voice::H247_REJOIN_DELAY_MS
            } else {
                crate::voice::H247_REJOIN_RETRY_MS
            };
            tokio::time::sleep(std::time::Duration::from_millis(wait_ms as u64)).await;
            // The player always disconnects before destroy, but a fresh
            // player (music/TTS leg) may already own the connection.
            if mgr.snapshot(guild_id).await.is_some() {
                return;
            }
            let Some(messenger) = session::messenger_for(guild_id).await else {
                continue;
            };
            // Force re-emit: idempotent on Discord's side and repairs a
            // dead session the noted state wrongly reports as alive.
            crate::lavalink::LavalinkManager::send_voice_state(
                &messenger,
                guild_id,
                Some(channel_id),
            );
            if confirm_h247_parked(guild_id, channel_id).await {
                session::clear_warn(guild_id).await;
                tracing::info!(
                    "scheduler: restored H247 voice for guild {guild_id} (channel {channel_id})"
                );
                return;
            }
        }
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        if session::warn_due(guild_id, now).await {
            tracing::warn!(
                "Unable to restore the H24/7 voice connection for guild {guild_id} after the player was destroyed"
            );
        }
    });
}

/// Connect confirm for scheduler-driven H247 rejoins. Polls the noted
/// Discord handshake (up to 8 x 300ms, like
/// H247_JOIN_CONFIRM_ATTEMPTS x H247_JOIN_CONFIRM_INTERVAL_MS) for the
/// parked channel.
pub async fn confirm_h247_parked(guild_id: u64, channel_id: u64) -> bool {
    use crate::voice::{H247_JOIN_CONFIRM_ATTEMPTS, H247_JOIN_CONFIRM_INTERVAL_MS};
    for _ in 0..H247_JOIN_CONFIRM_ATTEMPTS {
        tokio::time::sleep(std::time::Duration::from_millis(
            H247_JOIN_CONFIRM_INTERVAL_MS as u64,
        ))
        .await;
        let noted = crate::lavalink::manager()
            .take_pending_voice(guild_id)
            .await
            .and_then(|v| v.channel_id.parse::<u64>().ok());
        if noted == Some(channel_id) {
            return true;
        }
    }
    false
}

/// Parked-channel fetch. Mirrors fetchH247VoiceChannel in
/// src/core/modules/h247Manager.ts (`channel.type !== GuildVoice`
/// returns null): Some only when the channel still exists and is a
/// plain voice channel (Stage and other kinds never restore).
async fn h247_parked_voice_channel(
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
    guild_id: poise::serenity_prelude::GuildId,
    expected: u64,
) -> Option<poise::serenity_prelude::GuildChannel> {
    use poise::serenity_prelude::{ChannelId, ChannelType};
    let channel = http.get_channel(ChannelId::new(expected)).await.ok()?;
    let guild_channel = channel.guild()?;
    if guild_channel.guild_id != guild_id || guild_channel.kind != ChannelType::Voice {
        return None;
    }
    Some(guild_channel.clone())
}

/// Effective channel permissions for one member. Mirrors the
/// discord.js `permissionsIn` aggregation joinH247VoiceChannel relies
/// on: base union (@everyone + member roles, ADMINISTRATOR
/// short-circuits), then @everyone / combined-role / member
/// overwrites applied in order, with a final ADMINISTRATOR check.
pub fn effective_channel_perms(
    everyone_base: poise::serenity_prelude::Permissions,
    member_role_bases: &[poise::serenity_prelude::Permissions],
    overwrites: &[poise::serenity_prelude::PermissionOverwrite],
    guild_id: u64,
    member_id: u64,
    member_roles: &[u64],
) -> poise::serenity_prelude::Permissions {
    use poise::serenity_prelude::{PermissionOverwriteType, Permissions, RoleId, UserId};
    let mut perms = everyone_base;
    for p in member_role_bases {
        perms |= *p;
    }
    if perms.contains(Permissions::ADMINISTRATOR) {
        return Permissions::all();
    }
    let apply = |perms: Permissions, ow: &poise::serenity_prelude::PermissionOverwrite| {
        (perms & !ow.deny) | ow.allow
    };
    for ow in overwrites
        .iter()
        .filter(|o| o.kind == PermissionOverwriteType::Role(RoleId::new(guild_id)))
    {
        perms = apply(perms, ow);
    }
    let (mut allow, mut deny) = (Permissions::empty(), Permissions::empty());
    for ow in overwrites.iter().filter(|o| match o.kind {
        PermissionOverwriteType::Role(r) => member_roles.contains(&r.get()),
        _ => false,
    }) {
        allow |= ow.allow;
        deny |= ow.deny;
    }
    perms = (perms & !deny) | allow;
    for ow in overwrites
        .iter()
        .filter(|o| o.kind == PermissionOverwriteType::Member(UserId::new(member_id)))
    {
        perms = apply(perms, ow);
    }
    if perms.contains(Permissions::ADMINISTRATOR) {
        return Permissions::all();
    }
    perms
}

/// Bot Connect + Speak check for a voice channel over HTTP only (the
/// scheduler has no guild cache). Mirrors the `permissionsIn` gate in
/// joinH247VoiceChannel; failures (gone guild/member/roles) read as
/// no permission, like the TS `!me` / fetch-catch legs.
async fn h247_bot_may_join_http(
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
    guild_id: poise::serenity_prelude::GuildId,
    channel: &poise::serenity_prelude::GuildChannel,
) -> bool {
    let bot_id = match http.get_current_user().await {
        Ok(u) => u.id,
        Err(_) => return false,
    };
    let guild = match http.get_guild(guild_id).await {
        Ok(g) => g,
        Err(_) => return false,
    };
    if guild.owner_id == bot_id {
        return true;
    }
    let member = match http.get_member(guild_id, bot_id).await {
        Ok(m) => m,
        Err(_) => return false,
    };
    let roles = http.get_guild_roles(guild_id).await.unwrap_or_default();
    let perm_of = |id: u64| {
        roles
            .iter()
            .find(|r| r.id.get() == id)
            .map(|r| r.permissions)
            .unwrap_or(poise::serenity_prelude::Permissions::empty())
    };
    let everyone_base = perm_of(guild_id.get());
    let member_roles: Vec<u64> = member.roles.iter().map(|r| r.get()).collect();
    let member_role_bases: Vec<poise::serenity_prelude::Permissions> =
        member_roles.iter().map(|r| perm_of(*r)).collect();
    let perms = effective_channel_perms(
        everyone_base,
        &member_role_bases,
        &channel.permission_overwrites,
        guild_id.get(),
        bot_id.get(),
        &member_roles,
    );
    crate::commands::h247::join::h247_bot_may_join(perms)
}

/// H24/7 watchdog. Mirrors watchdogH247Sessions + ensureH247VoicePresence
/// in src/core/modules/h247Manager.ts: the periodic safety net for
/// everything the event-driven paths miss (guilds unavailable at boot,
/// dropped gateway events, expired sessions after long uptimes).
/// Steady-state cost is a session-map lookup per guild; the database
/// is only read on unknown guilds (negative-cached for 30min when
/// H24/7 is not enabled). On mismatch an OP4 rejoin goes out on the
/// noted serving-shard messenger (send-only, like recoverH247Sessions
/// with confirm=false); failures warn at most every 30min per guild.
/// Returns guilds restored.
pub async fn sweep_h247_watchdog(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use crate::commands::h247::session;
    use poise::serenity_prelude::{GuildId, GuildPagination};
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let mut restored = 0u64;
    let mut after: Option<GuildId> = None;
    // Paginate to exhaustion (no page cap): TS iterates the whole
    // guild cache, so a capped scan would silently skip guilds.
    loop {
        let page = match http
            .get_guilds(after.map(GuildPagination::After), Some(GUILD_PAGE_LIMIT))
            .await
        {
            Ok(p) if !p.is_empty() => p,
            _ => break,
        };
        after = page.last().map(|g| g.id);
        // Short page = last page (a full page may still end the list,
        // which the next fetch reports as empty — one extra call at
        // most, same as before).
        let last_page = guild_page_is_last(page.len());
        for partial in &page {
            let gid_num = partial.id.get();
            let gid = gid_num.to_string();
            // Expected channel: session mirror first, DB on miss.
            let expected = match session::parked_channel(gid_num).await {
                Some(ch) => Some(ch),
                None => {
                    if session::negative_hit(gid_num, now).await {
                        continue;
                    }
                    match h247_parked_channel(pool, &gid).await {
                        Some(ch) => {
                            session::prime_session(gid_num, ch).await;
                            Some(ch)
                        }
                        None => {
                            session::note_negative(gid_num, now).await;
                            continue;
                        }
                    }
                }
            };
            let Some(expected) = expected else {
                continue;
            };
            // Noted Discord presence (mirrors
            // `guild.members.me?.voice.channelId` in
            // watchdogH247Sessions / ensureH247VoicePresence): the
            // last-known live voice channel from the bot's own gateway
            // updates — never the lavalink handshake cache, which also
            // needs token/endpoint/session legs and goes blind while
            // the handshake is incomplete.
            let noted = session::live_voice_channel(gid_num).await.flatten();
            if noted == Some(expected) {
                continue;
            }
            let Some(messenger) = session::messenger_for(gid_num).await else {
                if session::warn_due(gid_num, now).await {
                    tracing::warn!(
                        "H24/7 watchdog for guild {gid}: not in parked channel {expected}, no serving shard noted yet"
                    );
                }
                continue;
            };
            // Channel fetch (mirrors fetchH247VoiceChannel in
            // h247Manager.ts: a gone channel or a non-GuildVoice
            // channel — e.g. converted to Stage — never restores).
            let Some(voice_channel) = h247_parked_voice_channel(http, partial.id, expected).await
            else {
                if session::warn_due(gid_num, now).await {
                    tracing::warn!(
                        "H24/7 watchdog for guild {gid}: parked channel {expected} is gone or not a voice channel"
                    );
                }
                continue;
            };
            // Permission gate (mirrors the Connect + Speak
            // permissionsIn check in joinH247VoiceChannel): without
            // both, the join would fail like TS, so the watchdog
            // does not send and does not count the guild restored.
            if !h247_bot_may_join_http(http, partial.id, &voice_channel).await {
                if session::warn_due(gid_num, now).await {
                    tracing::warn!(
                        "H24/7 watchdog for guild {gid}: missing Connect/Speak in parked channel {expected}"
                    );
                }
                continue;
            }
            crate::lavalink::LavalinkManager::send_voice_state(&messenger, gid_num, Some(expected));
            session::clear_warn(gid_num).await;
            tracing::info!("scheduler: restored H247 voice for guild {gid} (channel {expected})");
            restored += 1;
        }
        if last_page {
            break;
        }
    }
    restored
}

/// Temp-voice recovery sweep. Mirrors recoverCustomVoiceChannels in
/// src/Events/voicedashboard/voiceState.ts on the 120s ready.ts timer:
/// drop malformed CUSTOM_VOICE rows and rows whose channel no longer
/// exists (channel fetch fails).
///
/// Documented delta: the TS memberless leg (delete emptied temp
/// channels) needs the gateway voice-state cache, which the scheduler
/// cannot reach (spawn takes pool + http only). Emptied channels are
/// still reclaimed by the voice_state_update sweep and the
/// guild_create recovery, which both see full voice states.
pub async fn sweep_temp_voice_recovery(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use poise::serenity_prelude::{ChannelId, GuildId, GuildPagination};
    let mut dropped = 0u64;
    let mut after: Option<GuildId> = None;
    // Paginate to exhaustion (no page cap): TS iterates the whole
    // guild cache, so a capped scan would silently skip guilds.
    loop {
        let page = match http
            .get_guilds(after.map(GuildPagination::After), Some(GUILD_PAGE_LIMIT))
            .await
        {
            Ok(p) if !p.is_empty() => p,
            _ => break,
        };
        after = page.last().map(|g| g.id);
        // Short page = last page (a full page may still end the list,
        // which the next fetch reports as empty — one extra call at
        // most, same as before).
        let last_page = guild_page_is_last(page.len());
        for partial in &page {
            let gid = partial.id.get().to_string();
            let rows: Vec<(String, String)> =
                crate::db::kv_scan_prefix(pool, &gid, "CUSTOM_VOICE.").await;
            for (key, raw) in rows {
                // Strip JSON quoting from string-taking writers.
                let text = raw.trim().trim_matches('"').to_string();
                let Ok(ch_num) = text.parse::<u64>() else {
                    let _ = crate::db::kv_del(pool, &gid, &key).await;
                    dropped += 1;
                    continue;
                };
                if ch_num == 0 {
                    let _ = crate::db::kv_del(pool, &gid, &key).await;
                    dropped += 1;
                    continue;
                }
                // Channel gone (deleted externally): drop the row like TS.
                if http.get_channel(ChannelId::new(ch_num)).await.is_err() {
                    let _ = crate::db::kv_del(pool, &gid, &key).await;
                    dropped += 1;
                }
            }
        }
        if last_page {
            break;
        }
    }
    if dropped > 0 {
        tracing::info!("scheduler: dropped {dropped} stale temp-voice rows");
    }
    dropped
}

pub fn spawn(pool: Pool, http: std::sync::Arc<poise::serenity_prelude::Http>) {
    // Schedule expiry (real).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(SCHEDULE_SWEEP_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let n = sweep_expired_schedules(&pool, Some(http.clone()), now).await;
                if n > 0 {
                    tracing::info!("scheduler: swept {n} expired schedules");
                }
            }
        });
    }

    // Giveaway expiry (real, mirrors the forceUpdateEvery sweep).
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

    // Infrastructure monitoring (real, mirrors 60s manager tick:
    // probe + INFRA.status record, then the status-panel broadcast
    // to every MISC.statusEmbed channel).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(60));
            loop {
                t.tick().await;
                let status = crate::monitor::tick(&pool, 0).await;
                let now_secs = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                let n = crate::monitor::sweep_status_panel(
                    &pool,
                    Some(&http),
                    &status.services,
                    now_secs,
                )
                .await;
                if n > 0 {
                    tracing::info!("scheduler: updated {n} status panels");
                }
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
    // + queueEnd: rest_destroy + OP4 leave + status clear, parked-H247
    // keep-voice leg included).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(IDLE_SWEEP_SECS));
            loop {
                t.tick().await;
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                sweep_idle_players(&pool, Some(&http), now).await;
            }
        });
    }

    // H24/7 watchdog (real, mirrors the 60s watchdogH247Sessions tick
    // in ready.ts: session-mirror lookup, DB prime with negative
    // cache, OP4 rejoin on mismatch, 30min warn throttle).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(H247_WATCHDOG_SECS));
            loop {
                t.tick().await;
                let n = sweep_h247_watchdog(&pool, &http).await;
                if n > 0 {
                    tracing::info!("scheduler: watchdog restored {n} H247 sessions");
                }
            }
        });
    }

    // Temp-voice recovery (real, mirrors the 120s
    // recoverCustomVoiceChannels tick in ready.ts: malformed rows +
    // channels deleted externally).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(TEMPVOICE_RECOVERY_SECS));
            loop {
                t.tick().await;
                sweep_temp_voice_recovery(&pool, &http).await;
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

    // StreamNotifier poll (mirrors the 120s refresh in
    // core/StreamNotifier.ts: per-watch fetch + gate + send).
    {
        let pool = pool.clone();
        let http = http.clone();
        tokio::spawn(async move {
            let mut t = tokio::time::interval(Duration::from_secs(NOTIFIER_SECS));
            loop {
                t.tick().await;
                let (guilds, watches, posted) = sweep_notifier(&pool, &http).await;
                if watches > 0 {
                    tracing::debug!(
                        "scheduler tick: notifier ({guilds} guilds, {watches} watches, {posted} posted)"
                    );
                }
            }
        });
    }
}

// ---- StreamNotifier poll (120s) ----
// Mirrors src/core/StreamNotifier.ts: start() runs getAppAccessToken +
// refresh, then setInterval(refresh, 120_000). refresh() walks every
// guild's NOTIFIER.users, fetches the latest Twitch/YouTube media,
// skips mediaHaveAlreadyBeNotified rows, pushes the new
// {userId, mediaId, timestamp} row and sends the rendered message +
// link button.
//
// Status: live. The 120s tick runs sweep_notifier (per-watch fetch
// + gate + send); sweep_notifier_once stays as the store-only seam
// for tests. Platform creds are independent: Twitch watches need
// TWITCH_APPLICATION_ID/SECRET (client-credentials token, cached
// with expiry), YouTube watches need YOUTUBE_API_KEY. Guilds whose
// watches lack that platform's creds keep the store-only pass.

/// Twitch Helix streams endpoint. Mirrors checkTwitchStream.
pub const TWITCH_HELIX_STREAMS: &str = "https://api.twitch.tv/helix/streams";
/// Twitch app-token endpoint. Mirrors getAppAccessToken.
pub const TWITCH_OAUTH_TOKEN_URL: &str = "https://id.twitch.tv/oauth2/token";
/// YouTube search endpoint. Mirrors getLatestYouTubeVideos.
pub const YOUTUBE_SEARCH_URL: &str = "https://www.googleapis.com/youtube/v3/search";

/// Mirrors checkTwitchStream's Helix query.
pub fn twitch_streams_url(user_login: &str) -> String {
    format!("{TWITCH_HELIX_STREAMS}?user_login={user_login}")
}

/// Mirrors the twitch artistLink (`https://twitch.tv/<user>`).
pub fn twitch_profile_url(user_login: &str) -> String {
    format!("https://twitch.tv/{user_login}")
}

/// Mirrors getLatestYouTubeVideos' search.list query.
pub fn youtube_search_url(channel_id: &str, api_key: &str) -> String {
    format!(
        "{YOUTUBE_SEARCH_URL}?key={api_key}&channelId={channel_id}&part=snippet,id&order=date&maxResults=5"
    )
}

/// Mirrors the YouTube media link (`.../watch?v=<id>`).
pub fn youtube_video_url(video_id: &str) -> String {
    format!("https://www.youtube.com/watch?v={video_id}")
}

/// Mirrors the YouTube artistLink (`.../channel/<id>`).
pub fn youtube_channel_url(channel_id: &str) -> String {
    format!("https://youtube.com/channel/{channel_id}")
}

/// Live-API credentials from the environment. None mirrors the TS
/// constructor receiving empty keys: polling degrades to the
/// store-only skeleton (no token call, no fetch).
#[derive(Debug, Clone, Default)]
pub struct NotifierCreds {
    pub twitch_client_id: String,
    pub twitch_client_secret: String,
    pub youtube_api_key: String,
}

impl NotifierCreds {
    fn env_non_empty(key: &str) -> Option<String> {
        std::env::var(key).ok().filter(|s| !s.trim().is_empty())
    }

    pub fn from_env() -> Self {
        Self {
            twitch_client_id: Self::env_non_empty("TWITCH_APPLICATION_ID").unwrap_or_default(),
            twitch_client_secret: Self::env_non_empty("TWITCH_APPLICATION_SECRET")
                .unwrap_or_default(),
            youtube_api_key: Self::env_non_empty("YOUTUBE_API_KEY").unwrap_or_default(),
        }
    }

    /// Independent Twitch pair. Mirrors the TS constructor holding
    /// each key separately: a guild watching only YouTube does not
    /// need Twitch creds and vice versa.
    pub fn twitch_pair_from_env() -> Option<(String, String)> {
        Some((
            Self::env_non_empty("TWITCH_APPLICATION_ID")?,
            Self::env_non_empty("TWITCH_APPLICATION_SECRET")?,
        ))
    }

    /// Independent YouTube key (same all-or-nothing split).
    pub fn youtube_key_from_env() -> Option<String> {
        Self::env_non_empty("YOUTUBE_API_KEY")
    }

    pub fn twitch_pair(&self) -> Option<(String, String)> {
        if self.twitch_client_id.trim().is_empty() || self.twitch_client_secret.trim().is_empty() {
            None
        } else {
            Some((
                self.twitch_client_id.clone(),
                self.twitch_client_secret.clone(),
            ))
        }
    }

    pub fn youtube_key(&self) -> Option<String> {
        if self.youtube_api_key.trim().is_empty() {
            None
        } else {
            Some(self.youtube_api_key.clone())
        }
    }
}

/// Cached Twitch app token. Mirrors twitchAccessToken +
/// twitchAccessTokenExpireIn in StreamNotifier.ts.
static TWITCH_TOKEN: std::sync::OnceLock<tokio::sync::Mutex<(Option<String>, i64)>> =
    std::sync::OnceLock::new();

fn twitch_token_slot() -> &'static tokio::sync::Mutex<(Option<String>, i64)> {
    TWITCH_TOKEN.get_or_init(|| tokio::sync::Mutex::new((None, 0)))
}

/// Fetch a Twitch app access token. Mirrors getAppAccessToken
/// (client-credentials grant, expiry recorded as Date.now() +
/// expires_in * 1000). Returns (token, expires_at_ms).
pub async fn fetch_twitch_token(
    http: &reqwest::Client,
    client_id: &str,
    client_secret: &str,
) -> Option<(String, i64)> {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let url = format!(
        "{TWITCH_OAUTH_TOKEN_URL}?client_id={client_id}&client_secret={client_secret}&grant_type=client_credentials"
    );
    let resp = http.post(&url).send().await.ok()?;
    let body: serde_json::Value = resp.json().await.ok()?;
    let token = body.get("access_token")?.as_str()?.to_string();
    let expires_in = body.get("expires_in")?.as_i64().unwrap_or(0);
    if token.is_empty() {
        return None;
    }
    Some((token, now_ms + expires_in * 1000))
}

/// Cached token, refreshed when missing or expired. Mirrors
/// ensureValidAccessToken (`Date.now() >= expireIn` refreshes, with
/// a 60s safety margin so a token dying mid-sweep still works).
pub async fn ensure_twitch_token(
    http: &reqwest::Client,
    client_id: &str,
    client_secret: &str,
) -> Option<String> {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    {
        let slot = twitch_token_slot().lock().await;
        if let (Some(token), expires_at) = slot.clone() {
            if now_ms + 60_000 < expires_at {
                return Some(token);
            }
        }
    }
    let (token, expires_at) = fetch_twitch_token(http, client_id, client_secret).await?;
    *twitch_token_slot().lock().await = (Some(token.clone()), expires_at);
    Some(token)
}

/// Latest fetched media for one watch. Mirrors YoutubeRssResponse /
/// TwitchResponse (channel_id carries the YouTube ownership leg).
#[derive(Debug, Clone)]
pub struct NotifierMedia {
    pub title: String,
    pub link: String,
    pub pub_ms: i64,
    pub author: String,
    pub id: String,
    pub channel_id: Option<String>,
}

/// Latest-by-pubDate reduce. Mirrors getLatestMedia in
/// src/core/StreamNotifier.ts exactly: a strictly-greater (`>`) fold
/// seeded with the first item, so pubDate ties keep the FIRST item.
/// (A sort-then-last or `>=` fold would keep the last tied item and
/// can flip which video notifies.)
pub fn latest_media_by_pub(items: Vec<NotifierMedia>) -> Option<NotifierMedia> {
    let mut iter = items.into_iter();
    let mut latest = iter.next()?;
    for item in iter {
        if item.pub_ms > latest.pub_ms {
            latest = item;
        }
    }
    Some(latest)
}

fn rfc3339_ms(raw: &str) -> i64 {
    crate::commands::blogger::parse_pub_ms(raw)
}

/// Fetch the latest YouTube videos for a channel. Mirrors
/// getLatestYouTubeVideos: search.list order=date maxResults=5 with
/// the snippet.channelId ownership filter (foreign uploads are
/// dropped, like the TS `.filter`).
pub async fn fetch_youtube_videos(
    http: &reqwest::Client,
    api_key: &str,
    channel_id: &str,
) -> Vec<NotifierMedia> {
    let url = youtube_search_url(channel_id, api_key);
    let resp = match http.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("notifier: youtube fetch failed for {channel_id}: {e}");
            return Vec::new();
        }
    };
    let body: serde_json::Value = match resp.json().await {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    if body.get("error").is_some() {
        return Vec::new();
    }
    let mut out = Vec::new();
    let items = body
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    for item in items {
        let snippet_channel = item
            .get("snippet")
            .and_then(|s| s.get("channelId"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        // Ownership filter (TS `.filter(item.snippet.channelId ===
        // channelId)`): foreign uploads never notify.
        if snippet_channel != channel_id {
            continue;
        }
        let video_id = item
            .get("id")
            .and_then(|v| v.get("videoId"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if video_id.is_empty() {
            continue;
        }
        let snippet = item.get("snippet");
        let published = snippet
            .and_then(|s| s.get("publishedAt"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        out.push(NotifierMedia {
            title: snippet
                .and_then(|s| s.get("title"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            link: youtube_video_url(video_id),
            pub_ms: rfc3339_ms(published),
            author: snippet
                .and_then(|s| s.get("channelTitle"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            id: video_id.to_string(),
            channel_id: Some(snippet_channel.to_string()),
        });
    }
    out
}

/// Fetch a live Twitch stream. Mirrors checkTwitchStream
/// (helix/streams?user_login, null when offline).
pub async fn fetch_twitch_stream(
    http: &reqwest::Client,
    client_id: &str,
    token: &str,
    user_login: &str,
) -> Option<NotifierMedia> {
    let resp = http
        .get(twitch_streams_url(user_login))
        .header("Client-ID", client_id)
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .ok()?;
    let body: serde_json::Value = resp.json().await.ok()?;
    let first = body.get("data")?.as_array()?.first()?.clone();
    let started = first
        .get("started_at")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    Some(NotifierMedia {
        title: first
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        link: twitch_profile_url(user_login),
        pub_ms: rfc3339_ms(started),
        author: first
            .get("user_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        id: first
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        channel_id: None,
    })
}

/// YouTube channel check. Mirrors checkYouTubeChannelExists
/// ({state, name}).
pub async fn check_youtube_channel(
    http: &reqwest::Client,
    api_key: &str,
    channel_id: &str,
) -> Option<String> {
    let url = format!(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&id={channel_id}&key={api_key}"
    );
    let resp = http.get(&url).send().await.ok()?;
    let body: serde_json::Value = resp.json().await.ok()?;
    let first = body.get("items")?.as_array()?.first()?.clone();
    let title = first.get("snippet")?.get("title")?.as_str()?.to_string();
    if title.is_empty() {
        None
    } else {
        Some(title)
    }
}

/// Twitch user check. Mirrors checkTwitchUserExists (state only; the
/// TS name leg is undefined so callers fall back to the login).
pub async fn check_twitch_user(
    http: &reqwest::Client,
    client_id: &str,
    token: &str,
    user_login: &str,
) -> bool {
    let url = format!("https://api.twitch.tv/helix/users?login={user_login}");
    let resp = match http
        .get(&url)
        .header("Client-ID", client_id)
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return false,
    };
    resp.json::<serde_json::Value>()
        .await
        .ok()
        .and_then(|body| body.get("data")?.as_array().map(|a| !a.is_empty()))
        .unwrap_or(false)
}

/// Author check on the platform. Mirrors authorExistOnPlatform
/// (youtube/twitch verified live, anything else throws
/// "Unsupported platform" in TS -> false here). Missing creds read
/// as false, like the TS client erroring into `{state: false}`.
pub async fn author_exists_on_platform(platform: &str, id_or_username: &str) -> bool {
    let http = reqwest::Client::new();
    match platform.to_ascii_lowercase().as_str() {
        "youtube" => match NotifierCreds::youtube_key_from_env() {
            Some(key) => check_youtube_channel(&http, &key, id_or_username)
                .await
                .is_some(),
            None => false,
        },
        "twitch" => match NotifierCreds::twitch_pair_from_env() {
            Some((id, secret)) => match ensure_twitch_token(&http, &id, &secret).await {
                Some(token) => check_twitch_user(&http, &id, &token, id_or_username).await,
                None => false,
            },
            None => false,
        },
        _ => false,
    }
}

/// Display name for an author. Mirrors getChannelNameById (YouTube
/// channel title, Twitch login fallback, id fallback on error).
pub async fn author_display_name(platform: &str, id_or_username: &str) -> String {
    let http = reqwest::Client::new();
    if platform.eq_ignore_ascii_case("youtube") {
        if let Some(key) = NotifierCreds::youtube_key_from_env() {
            if let Some(name) = check_youtube_channel(&http, &key, id_or_username).await {
                return name;
            }
        }
    }
    id_or_username.to_string()
}

/// One NOTIFIER.lastMediaNotified row. Serde keys match the TS push
/// ({userId, mediaId, timestamp}); timestamp_ms carries the same
/// instant as unix millis for the >= comparison. The TS writer
/// stores an ISO string, so both numbers and date strings parse.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct NotifiedMedia {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "mediaId")]
    pub media_id: String,
    #[serde(rename = "timestamp", deserialize_with = "de_timestamp_ms")]
    pub timestamp_ms: i64,
}

fn de_timestamp_ms<'de, D>(d: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::Deserialize;
    let v = serde_json::Value::deserialize(d)?;
    match v {
        serde_json::Value::Number(n) => Ok(n.as_i64().unwrap_or(0)),
        serde_json::Value::String(s) => Ok(crate::commands::blogger::parse_pub_ms(&s)),
        _ => Ok(0),
    }
}

/// Already-notified check. Mirrors mediaHaveAlreadyBeNotified: same
/// user AND (same media id OR stored timestamp >= candidate pub date).
pub fn media_already_notified(
    last: &[NotifiedMedia],
    user_id: &str,
    media_id: &str,
    pub_ms: i64,
) -> bool {
    last.iter().any(|item| {
        item.user_id == user_id && (item.media_id == media_id || item.timestamp_ms >= pub_ms)
    })
}

/// TS isValidVideo, bug-for-bug. src/core/StreamNotifier.ts:457-468
/// iterates `Object.values(entry)` and, on the FIRST value whose
/// `typeof` is `"object"`, does `return this.isValidVideo(value)` —
/// it returns immediately instead of continuing the scan, so later
/// siblings are never examined (likewise a scalar null returns true
/// at once). Ported verbatim so the refresh announce gate
/// (`!alreadyNotified || isValidVideo(media)`) fires on exactly the
/// same payloads as TS; do NOT "fix" this into a deep-any scan.
/// (No `undefined` in JSON; null covers the `value == null` leg.)
///
/// Call-site contract: pass the FULL response object
/// (`{user, content, platform}`, like the TS `media`). Its first
/// traversed value is always the scalar-only watch row, so the scan
/// returns false on every well-formed payload and the gate reduces
/// to `!alreadyNotified` — exactly like TS, where the same early
/// return never reaches `content`. Never pass a content-only
/// projection: a null inside it would force an announce TS skips.
pub fn json_has_null(value: &serde_json::Value) -> bool {
    match value {
        serde_json::Value::Null => true,
        serde_json::Value::Object(map) => {
            for v in map.values() {
                if v.is_null() {
                    return true;
                } else if v.is_object() || v.is_array() {
                    return json_has_null(v);
                }
            }
            false
        }
        serde_json::Value::Array(items) => {
            for v in items {
                if v.is_null() {
                    return true;
                } else if v.is_object() || v.is_array() {
                    return json_has_null(v);
                }
            }
            false
        }
        _ => false,
    }
}

/// Announce gate. Returns the media id when the TS refresh would send.
pub fn pending_notifier_media(
    last: &[NotifiedMedia],
    user_id: &str,
    media_id: &str,
    pub_ms: i64,
    raw: &serde_json::Value,
) -> Option<String> {
    if media_id.is_empty() {
        return None;
    }
    if !media_already_notified(last, user_id, media_id, pub_ms) || json_has_null(raw) {
        Some(media_id.to_string())
    } else {
        None
    }
}

/// Parse the NOTIFIER.lastMediaNotified store (array of rows; the TS
/// defaults to [] when the key is missing).
pub fn parse_notified_list(raw: Option<&str>) -> Vec<NotifiedMedia> {
    let Some(raw) = raw else {
        return Vec::new();
    };
    serde_json::from_str(raw).unwrap_or_default()
}

/// Append one row. Mirrors client.db.push.
pub fn push_notified_media(
    mut list: Vec<NotifiedMedia>,
    entry: NotifiedMedia,
) -> Vec<NotifiedMedia> {
    list.push(entry);
    list
}

/// Store read: guild-table row first, legacy kv fallback.
pub async fn load_notified_media(pool: &Pool, gid: &str) -> Vec<NotifiedMedia> {
    let backend = crate::backends::Backend::sqlite(pool.clone());
    if let Ok(Some(value)) = backend
        .table(gid)
        .get::<serde_json::Value>("NOTIFIER.lastMediaNotified")
        .await
    {
        let parsed: Vec<NotifiedMedia> = match &value {
            serde_json::Value::String(s) => serde_json::from_str(s).unwrap_or_default(),
            _ => serde_json::from_value(value).unwrap_or_default(),
        };
        return parsed;
    }
    parse_notified_list(
        crate::db::kv_get(pool, gid, "NOTIFIER.lastMediaNotified")
            .await
            .as_deref(),
    )
}

/// Store write: guild-table row plus legacy kv (routed dual-write).
pub async fn record_notified_media(
    pool: &Pool,
    gid: &str,
    entry: &NotifiedMedia,
) -> anyhow::Result<()> {
    let mut list = load_notified_media(pool, gid).await;
    list = push_notified_media(list, entry.clone());
    let raw = serde_json::to_string(&list).unwrap_or_else(|_| "[]".to_string());
    crate::backends::Backend::sqlite(pool.clone())
        .table(gid)
        .set("NOTIFIER.lastMediaNotified", &raw)
        .await?;
    crate::db::kv_set(pool, gid, "NOTIFIER.lastMediaNotified", &raw).await?;
    Ok(())
}

/// Guild ids with a NOTIFIER.users config (legacy rows + table roots).
async fn notifier_guild_ids(pool: &Pool) -> Vec<String> {
    let mut ids: HashSet<String> = HashSet::new();
    for (gid, _, _) in crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .filter(|(_, key, _)| key == "NOTIFIER.users")
    {
        match gid.strip_prefix("tbl:") {
            Some(real) => {
                ids.insert(real.to_string());
            }
            None => {
                ids.insert(gid);
            }
        }
    }
    ids.into_iter().collect()
}

/// Announce template slots. Mirrors generateCustomMessagePreview:
/// member/guild slots resolve from the sweep context, notifier slots
/// from the fetched media, blogger slots keep their TS literal
/// defaults (and vice versa for the blogger render).
pub struct NotifierSlots<'a> {
    pub member_username: &'a str,
    pub member_mention: &'a str,
    pub member_count: u64,
    pub guild_name: &'a str,
    pub artist_author: &'a str,
    pub artist_link: &'a str,
    pub media_url: &'a str,
}

/// Render a notifier announce template. Mirrors
/// generateCustomMessagePreview for the StreamNotifier.refresh call
/// (notifier slots resolved, blogger slots default).
pub fn render_notifier_announce(template: &str, s: &NotifierSlots<'_>) -> String {
    template
        .replace("{memberUsername}", s.member_username)
        .replace("{memberMention}", s.member_mention)
        .replace("{memberCount}", &s.member_count.to_string())
        .replace("{guildName}", s.guild_name)
        .replace("{artistAuthor}", s.artist_author)
        .replace("{artistLink}", s.artist_link)
        .replace("{mediaURL}", s.media_url)
        .replace("{articleTitle}", "Unknow Article")
        .replace("{articleAuthor}", "Unknown Author")
        .replace("{articleLink}", "Unknown Link")
        .replace("{blogName}", "Unknown Blog Name")
}

/// Render a blogger announce template. Mirrors
/// generateCustomMessagePreview for the BloggerNotifier.refresh call
/// (blogger slots resolved, notifier slots default).
#[allow(clippy::too_many_arguments)]
pub fn render_blogger_announce(
    template: &str,
    article_title: &str,
    article_author: &str,
    article_link: &str,
    blog_name: &str,
    guild_name: &str,
) -> String {
    template
        .replace("{memberUsername}", "iHorizon")
        .replace("{memberMention}", "iHorizon")
        .replace("{memberCount}", "0")
        .replace("{guildName}", guild_name)
        .replace("{artistAuthor}", "Ninja")
        .replace("{artistLink}", "https://twitch.tv/Ninja")
        .replace("{mediaURL}", "https://twitch.tv/Ninja/media")
        .replace("{articleTitle}", article_title)
        .replace("{articleAuthor}", article_author)
        .replace("{articleLink}", article_link)
        .replace("{blogName}", blog_name)
}

/// One 120s live pass over every configured guild. Mirrors
/// StreamNotifier.refresh: per watch fetch the latest media (YouTube
/// search or Twitch Helix, gated on that platform's creds only),
/// skip mediaHaveAlreadyBeNotified rows, push the new
/// {userId, mediaId, timestamp} row and send the rendered message +
/// link button (nonce + enforceNonce). 5s pacing between watches
/// mirrors the fetchUsersMedias delay (it runs even when a watch
/// errors or has no creds, so quota timing stays TS-shaped).
/// Returns (guilds, watches, posted).
pub async fn sweep_notifier(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> (usize, usize, u64) {
    use crate::commands::notifier::load_entries;
    use poise::serenity_prelude::{ChannelId, CreateActionRow, CreateButton, CreateMessage, Nonce};
    let gids = notifier_guild_ids(pool).await;
    let web = reqwest::Client::new();
    let twitch_pair = NotifierCreds::twitch_pair_from_env();
    let youtube_key = NotifierCreds::youtube_key_from_env();
    if twitch_pair.is_none() && youtube_key.is_none() {
        let watches = {
            let mut n = 0usize;
            for gid in &gids {
                n += load_entries(pool, gid).await.len();
            }
            n
        };
        if watches > 0 {
            tracing::debug!(
                "notifier tick: no API credentials (TWITCH_APPLICATION_ID/TWITCH_APPLICATION_SECRET/YOUTUBE_API_KEY); store-only pass over {watches} watches"
            );
        }
        return (gids.len(), watches, 0);
    }
    // One token for the whole sweep instead of TS ensureValidAccessToken
    // per refresh: cheaper on the Twitch token endpoint by design, same
    // net effect (a valid app token for every helix call in the pass).
    let twitch_token = match &twitch_pair {
        Some((id, secret)) => ensure_twitch_token(&web, id, secret).await,
        None => None,
    };
    let bot_name = http
        .get_current_user()
        .await
        .map(|u| u.name.clone())
        .unwrap_or_else(|_| "iHorizon".to_string());
    let mut watches = 0usize;
    let mut posted = 0u64;
    for gid in &gids {
        let entries = load_entries(pool, gid).await;
        if entries.is_empty() {
            continue;
        }
        let channel_num =
            crate::commands::notifier::load_notifier_string(pool, gid, "NOTIFIER.channelId")
                .await
                .and_then(|s| s.parse::<u64>().ok());
        let Some(channel_num) = channel_num else {
            watches += entries.len();
            continue;
        };
        let code = crate::db::guild_lang(pool, gid.parse::<u64>().ok()).await;
        let say = |key: &str, fallback: &str| {
            crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
        };
        let template =
            crate::commands::notifier::load_notifier_string(pool, gid, "NOTIFIER.message")
                .await
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| {
                    say(
                        "notifier_on_new_media_default_message",
                        "@everyone has published a new video",
                    )
                });
        let button_label = say("notifier_on_new_media_default_button_label", "Check out!");
        let (guild_name, member_count) = match gid.parse::<u64>() {
            Ok(n) => match http.get_guild(n.into()).await {
                Ok(g) => (g.name.clone(), g.approximate_member_count.unwrap_or(0)),
                Err(_) => (String::new(), 0),
            },
            Err(_) => (String::new(), 0),
        };
        let mut notified = load_notified_media(pool, gid).await;
        for watch in &entries {
            watches += 1;
            let platform = watch.platform.to_ascii_lowercase();
            let media: Option<NotifierMedia> = if platform == "youtube" {
                match &youtube_key {
                    Some(key) => {
                        let videos = fetch_youtube_videos(&web, key, &watch.id_or_username).await;
                        latest_media_by_pub(videos).and_then(|m| {
                            // Ownership leg (TS fetchUsersMedias: latest
                            // must belong to the watched channel).
                            if m.channel_id.as_deref() == Some(watch.id_or_username.as_str()) {
                                Some(m)
                            } else {
                                tracing::warn!(
                                    "notifier: video {} does not belong to channel {}, skipping notification",
                                    m.id,
                                    watch.id_or_username
                                );
                                None
                            }
                        })
                    }
                    None => None,
                }
            } else if platform == "twitch" {
                match (&twitch_pair, &twitch_token) {
                    (Some((id, _)), Some(token)) => {
                        fetch_twitch_stream(&web, id, token, &watch.id_or_username).await
                    }
                    _ => None,
                }
            } else {
                // No TS verify/feed path (kick throws "Unsupported
                // platform"); the watch can never resolve.
                None
            };
            if let Some(m) = media {
                // Full TS response shape ({user, content, platform}):
                // isValidVideo runs on the whole media object, whose
                // first value is always the scalar-only watch row, so
                // the traversal returns false and the gate below is
                // exactly `!alreadyNotified` (kept verbatim for parity).
                let raw = serde_json::json!({
                    "user": {"id_or_username": watch.id_or_username, "platform": watch.platform},
                    "platform": platform,
                    "content": {"title": m.title, "link": m.link, "author": m.author, "id": m.id},
                });
                if pending_notifier_media(&notified, &watch.id_or_username, &m.id, m.pub_ms, &raw)
                    .is_some()
                {
                    let artist_link = if platform == "twitch" {
                        twitch_profile_url(&watch.id_or_username)
                    } else {
                        youtube_channel_url(&watch.id_or_username)
                    };
                    let message = render_notifier_announce(
                        &template,
                        &NotifierSlots {
                            member_username: &bot_name,
                            member_mention: &bot_name,
                            member_count,
                            guild_name: &guild_name,
                            artist_author: &m.author,
                            artist_link: &artist_link,
                            media_url: &m.link,
                        },
                    );
                    let nonce_ms = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_millis())
                        .unwrap_or(0);
                    let msg = CreateMessage::new()
                        .content(message)
                        .components(vec![CreateActionRow::Buttons(vec![
                            CreateButton::new_link(m.link.clone()).label(button_label.clone()),
                        ])])
                        .nonce(Nonce::String(format!(
                            "notifier-{}-{nonce_ms}",
                            watch.id_or_username
                        )))
                        .enforce_nonce(true);
                    if ChannelId::new(channel_num)
                        .send_message(http, msg)
                        .await
                        .is_ok()
                    {
                        notified.push(NotifiedMedia {
                            user_id: watch.id_or_username.clone(),
                            media_id: m.id.clone(),
                            timestamp_ms: m.pub_ms,
                        });
                        let raw_list =
                            serde_json::to_string(&notified).unwrap_or_else(|_| "[]".to_string());
                        let _ = crate::backends::Backend::sqlite(pool.clone())
                            .table(gid)
                            .set("NOTIFIER.lastMediaNotified", &raw_list)
                            .await;
                        let _ =
                            crate::db::kv_set(pool, gid, "NOTIFIER.lastMediaNotified", &raw_list)
                                .await;
                        posted += 1;
                    }
                }
                // 5s pacing per watched user (mirrors the delay at the
                // end of every fetchUsersMedias iteration in
                // StreamNotifier.ts, which runs per user, not per guild).
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }
    }
    (gids.len(), watches, posted)
}

/// One 120s pass over every configured guild. Returns
/// (guilds, watches). Store-only seam kept for tests; the live tick
/// uses sweep_notifier.
pub async fn sweep_notifier_once(pool: &Pool) -> (usize, usize) {
    let gids = notifier_guild_ids(pool).await;
    let mut watches = 0usize;
    for gid in &gids {
        watches += crate::commands::notifier::load_entries(pool, gid)
            .await
            .len();
    }
    // Partial-friendly gate (no all-or-nothing from_env): a sweep with
    // only YouTube (or only Twitch) creds still polls that platform.
    if NotifierCreds::twitch_pair_from_env().is_none()
        && NotifierCreds::youtube_key_from_env().is_none()
        && watches > 0
    {
        tracing::debug!(
            "notifier tick: no API credentials (TWITCH_APPLICATION_ID/TWITCH_APPLICATION_SECRET/YOUTUBE_API_KEY); store-only pass over {watches} watches"
        );
    }
    (gids.len(), watches)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn pool() -> Pool {
        crate::db::memory_pool().await
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
        let n = sweep_expired_schedules(&p, None, 200).await;
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
        let n = sweep_expired_schedules(&p, None, i64::MAX).await;
        assert_eq!(n, 0);
    }

    #[tokio::test]
    async fn sweep_removes_legacy_expired_shape() {
        // TS writer row: {title, description, expired}, code from key.
        let p = pool().await;
        crate::db::kv_set(
            &p,
            "g",
            "SCHEDULE.42.LEGACYCODE1234",
            r#"{"title":"t","description":"a description","expired":100}"#,
        )
        .await
        .unwrap();
        let n = sweep_expired_schedules(&p, None, 200).await;
        assert_eq!(n, 1);
        assert!(crate::db::kv_get(&p, "g", "SCHEDULE.42.LEGACYCODE1234")
            .await
            .is_none());
    }

    #[test]
    fn schedule_expiry_embed_shapes_match_ts() {
        assert_eq!(
            schedule_expiry_title("ABC123"),
            "#ABC123 Schedule has been expired!"
        );
        let e = crate::commands::schedule::ScheduleEntry {
            code: "ABC123".to_string(),
            title: "t".to_string(),
            description: "d".to_string(),
            expires_at_ms: 0,
        };
        assert_eq!(schedule_expiry_stamp(0), "1970/01/01 00:00:00");
        assert_eq!(
            schedule_expiry_desc(&e),
            "1970/01/01 00:00:00```t``````d```"
        );
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
        let p = pool().await;
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
        assert_eq!(sweep_idle_players(&p, None, now - 60_000).await, 0);
        assert_eq!(sweep_idle_players(&p, None, now).await, 1);
        assert!(m.snapshot(GID).await.is_none());
        assert!(m.snapshot(OLD).await.is_some());
        // Cleanup so later suites see a clean manager.
        m.remove_player(OLD).await;
        assert_eq!(sweep_idle_players(&p, None, now).await, 0);
    }

    #[tokio::test]
    async fn h247_parked_channel_reads_legacy_row() {
        let p = pool().await;
        assert_eq!(h247_parked_channel(&p, "noguild").await, None);
        crate::db::kv_set(
            &p,
            "h1",
            "GUILD.H247",
            r#"{"enabled":true,"voiceChannelId":"4242"}"#,
        )
        .await
        .unwrap();
        assert_eq!(h247_parked_channel(&p, "h1").await, Some(4242));
        // Disabled rows do not park.
        crate::db::kv_set(
            &p,
            "h2",
            "GUILD.H247",
            r#"{"enabled":false,"voiceChannelId":"9"}"#,
        )
        .await
        .unwrap();
        assert_eq!(h247_parked_channel(&p, "h2").await, None);
    }

    #[test]
    fn sweep_intervals_mirror_ready_timers() {
        // ready.ts: refreshSchedule 50s, watchdog 60s, temp recovery 120s.
        assert_eq!(SCHEDULE_SWEEP_SECS, 50);
        assert_eq!(H247_WATCHDOG_SECS, 60);
        assert_eq!(TEMPVOICE_RECOVERY_SECS, 120);
        // StreamNotifier.start: setInterval(refresh, 120_000).
        assert_eq!(NOTIFIER_SECS, 120);
    }

    #[test]
    fn guild_pages_stop_on_short_page() {
        // Fewer rows than the requested limit means the list ended:
        // the sweep must not fire another (empty) page.
        assert_eq!(GUILD_PAGE_LIMIT, 200);
        assert!(guild_page_is_last(0));
        assert!(guild_page_is_last(1));
        assert!(guild_page_is_last(199));
        assert!(!guild_page_is_last(200));
        assert!(!guild_page_is_last(201));
    }

    #[test]
    fn notifier_urls_match_ts() {
        assert_eq!(
            twitch_streams_url("ninja"),
            "https://api.twitch.tv/helix/streams?user_login=ninja"
        );
        assert_eq!(twitch_profile_url("ninja"), "https://twitch.tv/ninja");
        assert_eq!(
            youtube_search_url("chan", "key"),
            "https://www.googleapis.com/youtube/v3/search?key=key&channelId=chan&part=snippet,id&order=date&maxResults=5"
        );
        assert_eq!(
            youtube_video_url("vid"),
            "https://www.youtube.com/watch?v=vid"
        );
        assert_eq!(
            youtube_channel_url("chan"),
            "https://youtube.com/channel/chan"
        );
    }

    #[test]
    fn latest_media_reduce_picks_newest_pubdate() {
        let mk = |id: &str, pub_ms: i64| NotifierMedia {
            title: id.to_string(),
            link: format!("http://x/{id}"),
            pub_ms,
            author: "a".to_string(),
            id: id.to_string(),
            channel_id: None,
        };
        // Out-of-order input: newest pubDate wins.
        let latest =
            latest_media_by_pub(vec![mk("old", 10), mk("new", 20), mk("mid", 15)]).unwrap();
        assert_eq!(latest.id, "new");
        assert!(latest_media_by_pub(vec![]).is_none());
        // pubDate tie keeps the FIRST item (TS `>` reduce, not `>=`).
        let tied = latest_media_by_pub(vec![mk("first", 10), mk("second", 10)]).unwrap();
        assert_eq!(tied.id, "first");
    }

    #[test]
    fn announce_renders_mirror_ts_slots() {
        let slots = NotifierSlots {
            member_username: "bot",
            member_mention: "<@1>",
            member_count: 42,
            guild_name: "G",
            artist_author: "Ninja",
            artist_link: "https://twitch.tv/ninja",
            media_url: "https://www.youtube.com/watch?v=v1",
        };
        let out = render_notifier_announce(
            "{artistAuthor} {artistLink} {mediaURL} {guildName} {memberCount} {articleTitle}",
            &slots,
        );
        assert_eq!(
            out,
            "Ninja https://twitch.tv/ninja https://www.youtube.com/watch?v=v1 G 42 Unknow Article"
        );
        let bout = render_blogger_announce(
            "{articleTitle} by {articleAuthor} {articleLink} {blogName} {mediaURL}",
            "T",
            "A",
            "http://x/a",
            "Blog",
            "G",
        );
        assert_eq!(bout, "T by A http://x/a Blog https://twitch.tv/Ninja/media");
    }

    #[test]
    fn notified_store_parses_ts_iso_strings() {
        // TS writer shape ({userId, mediaId, ISO timestamp}).
        let rows = parse_notified_list(Some(
            r#"[{"userId":"u","mediaId":"v1","timestamp":"2024-10-02T10:00:00Z"}]"#,
        ));
        assert_eq!(rows.len(), 1);
        assert!(rows[0].timestamp_ms > 0);
        assert!(media_already_notified(
            &rows,
            "u",
            "zzz",
            rows[0].timestamp_ms
        ));
        assert!(!media_already_notified(
            &rows,
            "u",
            "zzz",
            rows[0].timestamp_ms + 1
        ));
    }

    #[test]
    fn effective_channel_perms_mirrors_permissions_in() {
        use poise::serenity_prelude::{PermissionOverwrite, PermissionOverwriteType, Permissions};
        let ow =
            |kind, allow: Permissions, deny: Permissions| PermissionOverwrite { allow, deny, kind };
        // Plain Connect+Speak base passes the join gate.
        let perms = effective_channel_perms(
            Permissions::CONNECT | Permissions::SPEAK,
            &[],
            &[],
            1,
            7,
            &[],
        );
        assert!(crate::commands::h247::join::h247_bot_may_join(perms));
        // Missing Speak fails.
        let perms = effective_channel_perms(Permissions::CONNECT, &[], &[], 1, 7, &[]);
        assert!(!crate::commands::h247::join::h247_bot_may_join(perms));
        // ADMINISTRATOR short-circuits without Connect/Speak.
        let perms = effective_channel_perms(Permissions::ADMINISTRATOR, &[], &[], 1, 7, &[]);
        assert!(crate::commands::h247::join::h247_bot_may_join(perms));
        // @everyone overwrite denying Speak removes the grant.
        let perms = effective_channel_perms(
            Permissions::CONNECT | Permissions::SPEAK,
            &[],
            &[ow(
                PermissionOverwriteType::Role(1.into()),
                Permissions::empty(),
                Permissions::SPEAK,
            )],
            1,
            7,
            &[],
        );
        assert!(!crate::commands::h247::join::h247_bot_may_join(perms));
        // A member overwrite re-granting Speak restores it.
        let perms = effective_channel_perms(
            Permissions::CONNECT,
            &[],
            &[ow(
                PermissionOverwriteType::Member(7.into()),
                Permissions::SPEAK,
                Permissions::empty(),
            )],
            1,
            7,
            &[],
        );
        assert!(crate::commands::h247::join::h247_bot_may_join(perms));
    }

    #[test]
    fn creds_split_per_platform() {
        // from_env is partial-friendly (missing keys read as empty, so
        // one platform configured still polls); the per-platform
        // readers and accessors are independent.
        let full = NotifierCreds {
            twitch_client_id: "id".into(),
            twitch_client_secret: "sec".into(),
            youtube_api_key: "".into(),
        };
        assert!(full.twitch_pair().is_some());
        assert!(full.youtube_key().is_none());
        let yt_only = NotifierCreds {
            twitch_client_id: "".into(),
            twitch_client_secret: "".into(),
            youtube_api_key: "k".into(),
        };
        assert!(yt_only.twitch_pair().is_none());
        assert_eq!(yt_only.youtube_key().as_deref(), Some("k"));
    }

    #[test]
    fn notifier_dedup_matches_ts() {
        let last = vec![NotifiedMedia {
            user_id: "u".to_string(),
            media_id: "v1".to_string(),
            timestamp_ms: 100,
        }];
        // Same media id re-notifies never.
        assert!(media_already_notified(&last, "u", "v1", 50));
        // Stored timestamp >= candidate pub date counts as notified.
        assert!(media_already_notified(&last, "u", "v2", 100));
        // Newer candidate passes.
        assert!(!media_already_notified(&last, "u", "v2", 101));
        // Another user's row does not cover this user.
        assert!(!media_already_notified(&last, "other", "v1", 50));
        // Gate mirrors the refresh send condition.
        let clean = serde_json::json!({"title": "x"});
        assert!(pending_notifier_media(&last, "u", "v2", 101, &clean).is_some());
        assert!(pending_notifier_media(&last, "u", "v1", 50, &clean).is_none());
        // isValidVideo quirk: nulls inside force the announce.
        let quirky = serde_json::json!({"title": null});
        assert!(json_has_null(&quirky));
        assert!(!json_has_null(&clean));
        // Bug-for-bug: the scan returns on the FIRST object prop, so a
        // null behind an object sibling is missed, exactly like TS.
        assert!(!json_has_null(
            &serde_json::json!({"a": {"x": 1}, "b": null})
        ));
        // ...while a null reached before any object prop still hits.
        assert!(json_has_null(
            &serde_json::json!({"a": null, "b": {"x": 1}})
        ));
        // First object prop is recursed into (scalar siblings after it
        // are never examined, like TS).
        assert!(json_has_null(&serde_json::json!({"a": {"x": null}})));
        assert!(!json_has_null(&serde_json::json!({"a": {"x": 1}})));
        assert!(pending_notifier_media(&last, "u", "v1", 50, &quirky).is_some());
        assert!(pending_notifier_media(&last, "u", "", 0, &clean).is_none());
        // Full response shape (audit V2): the traversal runs on the
        // whole media object, whose first reached value is the
        // scalar-only watch row, so the scan is false and the gate is
        // exactly `!alreadyNotified`.
        let full = serde_json::json!({
            "user": {"id_or_username": "u", "platform": "youtube"},
            "platform": "youtube",
            "content": {"title": "t", "link": "l", "author": "a", "id": "v1"},
        });
        assert!(!json_has_null(&full));
        assert!(pending_notifier_media(&last, "u", "v1", 50, &full).is_none());
        assert!(pending_notifier_media(&last, "u", "v9", 200, &full).is_some());
        // Store parse: missing key -> [], like the TS `|| []`.
        assert!(parse_notified_list(None).is_empty());
        assert!(parse_notified_list(Some("nope")).is_empty());
    }

    #[tokio::test]
    async fn notified_store_round_trips() {
        let p = pool().await;
        assert!(load_notified_media(&p, "g9").await.is_empty());
        let entry = NotifiedMedia {
            user_id: "u".to_string(),
            media_id: "v1".to_string(),
            timestamp_ms: 100,
        };
        record_notified_media(&p, "g9", &entry).await.unwrap();
        let list = load_notified_media(&p, "g9").await;
        assert_eq!(list, vec![entry]);
        assert!(media_already_notified(&list, "u", "v1", 50));
        // Sweep sees the configured guild (legacy row written by the test).
        crate::db::kv_set(&p, "g9", "NOTIFIER.users", "[]")
            .await
            .unwrap();
        assert_eq!(sweep_notifier_once(&p).await, (1, 0));
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
    fn mcount_slot_sources_parse() {
        assert_eq!(mcount_table_guild_id("tbl:123"), Some("123"));
        assert_eq!(mcount_table_guild_id("123"), None);
        assert_eq!(mcount_slot_of_key("GUILD.MCOUNT.member"), Some("member"));
        assert_eq!(mcount_slot_of_key("GUILD.MCOUNT"), None);
        let cfg = serde_json::json!({"name": "N {MemberCount}", "channel": "99"});
        assert_eq!(mcount_slot_config(&cfg), Some(("N {MemberCount}", 99)));
        let cfg = serde_json::json!({"name": "N", "channel": 99});
        assert_eq!(mcount_slot_config(&cfg), Some(("N", 99)));
        assert_eq!(mcount_slot_config(&serde_json::json!({"name": "N"})), None);
        let root =
            serde_json::json!({"MCOUNT": {"member": {"name": "a"}, "bot": "{\"name\":\"b\"}"}});
        let slots = mcount_table_slots(&root);
        assert_eq!(slots.len(), 2);
        assert!(mcount_table_slots(&serde_json::json!({})).is_empty());
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

    #[test]
    fn honeypot_second_pass_due_after_8s() {
        assert_eq!(HONEYPOT_SECOND_PASS_DELAY_MS, 8000);
        assert!(!honeypot_second_pass_due(100_000, 100_000 + 7999));
        assert!(honeypot_second_pass_due(100_000, 100_000 + 8000));
        assert!(honeypot_second_pass_due(100_000, 100_000 + 8001));
    }

    #[tokio::test]
    async fn giveaway_sweep_deletes_past_lifetime_and_dedups() {
        let p = pool().await;
        // Already-ended row past the 345.6M ms lifetime: deleted, not counted.
        crate::db::kv_set(&p, "g", "GIVEAWAY.9", "{\"guild_id\":\"g\",\"channel_id\":\"c\",\"winner_count\":1,\"prize\":\"p\",\"hosted_by\":\"h\",\"expire_in_ms\":0,\"ended\":true,\"entries\":[],\"winners\":[\"a\"]}").await.unwrap();
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
    async fn giveaway_sweep_finishes_overdue_before_lifetime_delete() {
        let p = pool().await;
        // Unended row past the 345.6M ms lifetime: TS refresh() runs
        // finish() first (winners notice), then the cooldownTime
        // branch deletes the row. The sweep must count it as ended
        // instead of silently dropping it.
        crate::db::kv_set(&p, "g", "GIVEAWAY.7", r#"{"guild_id":"g","channel_id":"c","winner_count":1,"prize":"p","hosted_by":"h","expire_in_ms":0,"ended":false,"entries":["a","b"],"winners":[]}"#).await.unwrap();
        let n = sweep_expired_giveaways(&p, None, ENDED_GIVEAWAY_LIFETIME_MS + 1000).await;
        assert_eq!(n, 1);
        assert!(crate::db::kv_get(&p, "g", "GIVEAWAY.7").await.is_none());
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
