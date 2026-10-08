// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Background schedulers. Mirrors src/core/modules/* timers +
// StreamNotifier/Blogger polling + ready.ts table sweeps.
//
// Implemented for real: expired SCHEDULE entries sweep (schedule.rs layout).
// Other module ticks (membercount 5min, tempRole/tempban 30s, nightmode 60s,
// giveaways forceUpdate, pfps 45s, StreamNotifier 120s, Blogger 60s) are
// wired as typed intervals with traced no-op bodies until their modules
// land, so the timing skeleton is already correct.

use crate::db::Pool;
use std::time::Duration;

pub const SCHEDULE_SWEEP_SECS: u64 = 60;
pub const TEMP_EXPIRY_SECS: u64 = 30;
pub const MEMBERCOUNT_SECS: u64 = 300;
pub const NIGHTMODE_SECS: u64 = 60;
pub const GIVEAWAY_SECS: u64 = 60;
pub const NOTIFIER_SECS: u64 = 120;

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

/// End expired giveaways, picking winners deterministically.
/// Mirrors giveawaysManager refresh(): expired + !ended -> ended + winners.
/// Returns number of giveaways ended.
pub async fn sweep_expired_giveaways(pool: &Pool, now_ms: i64) -> u64 {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT guild_id, key_name FROM kv WHERE key_name LIKE 'GIVEAWAY.%'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut ended = 0u64;
    for (gid, key) in rows {
        let raw = crate::db::kv_get(pool, &gid, &key).await;
        let Some(raw) = raw else { continue };
        let mut v: serde_json::Value = match serde_json::from_str(&raw) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let expired = v
            .get("expire_in_ms")
            .and_then(|n| n.as_i64())
            .map(|e| now_ms >= e)
            .unwrap_or(false);
        let already = v.get("ended").and_then(|b| b.as_bool()).unwrap_or(false);
        if !expired || already {
            continue;
        }
        let entries: Vec<String> = v
            .get("entries")
            .and_then(|e| serde_json::from_value(e.clone()).ok())
            .unwrap_or_default();
        let count = v.get("winner_count").and_then(|n| n.as_u64()).unwrap_or(1) as usize;
        let winners = crate::commands::giveaway::pick_winners(&entries, count, now_ms as u64);
        if let Some(obj) = v.as_object_mut() {
            obj.insert("ended".into(), true.into());
            obj.insert("winners".into(), serde_json::json!(winners));
        }
        if crate::db::kv_set(pool, &gid, &key, &v.to_string())
            .await
            .is_ok()
        {
            ended += 1;
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
                        .title(format!("{}'s avatar", pick.user.tag()))
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
        let blogs: Vec<crate::commands::blogger::BlogEntry> =
            serde_json::from_str(&raw).unwrap_or_default();
        for blog in blogs {
            let body = match reqwest::Client::new().get(&blog.rss).send().await {
                Ok(r) => r.text().await.unwrap_or_default(),
                Err(_) => continue,
            };
            let Some(item) = crate::commands::blogger::latest_rss_item(&body) else {
                continue;
            };
            let notified_raw = crate::db::kv_get(pool, &gid, "BLOGGER.lastArticleNotified").await;
            let mut notified: Vec<(String, String)> = notified_raw
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            if crate::commands::blogger::already_notified(&notified, &blog.id, &item.id) {
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
                let g = sweep_expired_giveaways(&pool, now).await;
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

    // Skeleton ticks for unported modules (timing mirrors TS).
    for (name, secs) in [("nightmode", NIGHTMODE_SECS), ("notifier", NOTIFIER_SECS)] {
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
        let n = sweep_expired_giveaways(&p, 200).await;
        assert_eq!(n, 1);
        let raw = crate::db::kv_get(&p, "g", "GIVEAWAY.1").await.unwrap();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(v.get("ended"), Some(&serde_json::Value::Bool(true)));
        assert_eq!(
            v.get("winners").and_then(|w| w.as_array()).map(|a| a.len()),
            Some(1)
        );
        let n2 = sweep_expired_giveaways(&p, 200).await;
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
