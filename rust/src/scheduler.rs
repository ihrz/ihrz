// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Background schedulers. Mirrors src/core/modules/* timers +
// StreamNotifier/Blogger polling + ready.ts table sweeps.
//
// Implemented for real: expired SCHEDULE entries, expired giveaways,
// temp roles/bans, membercount refresh (5min), pfps poster (45s),
// auto-renew, Blogger poll (60s), nightmode (60s), protection
// structure backup (60s). The only remaining
// skeleton is the 120s StreamNotifier tick, blocked on the
// Twitch/YouTube/Kick live APIs (see Blocked in MIGRATION.md).

use crate::db::Pool;
use std::time::Duration;

pub const SCHEDULE_SWEEP_SECS: u64 = 60;
pub const TEMP_EXPIRY_SECS: u64 = 30;
pub const MEMBERCOUNT_SECS: u64 = 300;
pub const NIGHTMODE_SECS: u64 = 60;
pub const GIVEAWAY_SECS: u64 = 60;
pub const NOTIFIER_SECS: u64 = 120;
pub const PROTECTION_BACKUP_SECS: u64 = 60;

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
        if cfg.get("enable").and_then(|e| e.as_bool()).unwrap_or(false) {
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

/// PFPS poster. Mirrors pfpsManager 45s tick: random member avatar embed.
pub async fn sweep_pfps(pool: &Pool, http: &std::sync::Arc<poise::serenity_prelude::Http>) -> u64 {
    use poise::serenity_prelude::{ChannelId, GuildId};
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
        if members.is_empty() {
            continue;
        }
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as usize)
            .unwrap_or(0);
        let pick = &members[now % members.len()];
        let url = pick.user.face();
        if ChannelId::new(ch_num)
            .send_message(
                http,
                poise::serenity_prelude::CreateMessage::new().embed(
                    poise::serenity_prelude::CreateEmbed::default()
                        .title(
                            crate::lang::get(&code, "pfps_embed_user_title")
                                .map(|s| s.replace("{username}", &pick.user.tag()))
                                .unwrap_or_else(|| format!("{}'s avatar", pick.user.tag())),
                        )
                        .image(url),
                ),
            )
            .await
            .is_ok()
        {
            done += 1;
        }
    }
    done
}

/// Auto-renew sweep. Mirrors autorenewManager 30s tick: expired
/// channels are cloned (name/parent) and replaced, keys rotated.
pub async fn sweep_autorenew(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
    now_ms: i64,
) -> u64 {
    use poise::serenity_prelude::ChannelId;
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
        if now_ms < ts + max {
            continue;
        }
        let Some(ch_id) = key
            .strip_prefix("UTILS.renew_channel.")
            .and_then(|s| s.parse::<u64>().ok())
        else {
            continue;
        };
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
        let mut builder =
            poise::serenity_prelude::CreateChannel::new(guild_ch.name.clone()).kind(guild_ch.kind);
        if let Some(parent) = guild_ch.parent_id {
            builder = builder.category(parent);
        }
        let Ok(gid_num) = gid.parse::<u64>() else {
            continue;
        };
        let Ok(new_ch) = poise::serenity_prelude::GuildId::new(gid_num)
            .create_channel(http, builder)
            .await
        else {
            continue;
        };
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

/// Nightmode tick. Mirrors nightModeManager 60s refresh: enumerate
/// guilds via REST, toggle @everyone SEND_MESSAGES on text channels at
/// window edges, tracked by NIGHTMODE.state to run transitions once.
pub async fn sweep_nightmode(
    pool: &Pool,
    http: &std::sync::Arc<poise::serenity_prelude::Http>,
) -> u64 {
    use poise::serenity_prelude::{
        ChannelType, GuildId, GuildPagination, PermissionOverwrite, PermissionOverwriteType,
        Permissions, RoleId,
    };
    let now_hour = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| (d.as_secs() / 3600 % 24) as u8)
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
            let cfg: crate::commands::newfeatures::NightmodeConfig =
                match serde_json::from_str(&raw) {
                    Ok(cfg) => cfg,
                    Err(_) => continue,
                };
            if !cfg.enabled {
                continue;
            }
            let night =
                crate::commands::newfeatures::night_active(cfg.start_hour, cfg.end_hour, now_hour);
            let want = if night { "started" } else { "ended" };
            let current = crate::db::kv_get(pool, &gid, "NIGHTMODE.state").await;
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
            let _ = crate::db::kv_set(pool, &gid, "NIGHTMODE.state", want).await;
            done += 1;
        }
        if after.is_none() {
            break;
        }
    }
    done
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
}
