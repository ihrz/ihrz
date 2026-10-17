// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/pfps/*.
//
// TS keys: <guild>.PFPS.disable (bool), <guild>.PFPS.channel.
// YAML: pfps_config_command_action_on/off, pfps_channel_*.

use crate::bot::Ctx;

pub use crate::commands::security::main::parse_on_off;

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

/// Table-routed plain-string read with legacy fallback
/// (PFPS.channel / PFPS.disable).
pub async fn load_pfps_string(pool: &crate::db::Pool, guild_id: &str, key: &str) -> Option<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        })
}

/// Table-routed plain-string write (keys unchanged).
pub async fn save_pfps_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(key, value).await
}

/// PFPS poster tick (mirrors `PfpsManager_Init` + 45s `Refresh` in
/// src/core/modules/pfpsManager.ts, wired from ready.ts): for every
/// cached guild with a PFPS row that is neither disabled nor
/// channel-less, post a random non-bot member's guild + user avatars
/// into the PFPS channel. Anti-repeat: never the same member twice
/// in a row per guild (TS `usr` map). Failures are silent per guild.
pub async fn pfps_refresh_tick(
    pool: &crate::db::Pool,
    http: &poise::serenity_prelude::Http,
    cache: std::sync::Arc<poise::serenity_prelude::Cache>,
) {
    use rand::seq::SliceRandom as _;
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static LAST: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
    let last = LAST.get_or_init(|| Mutex::new(HashMap::new()));

    let gids: Vec<poise::serenity_prelude::GuildId> = cache.guilds();
    for gid in gids {
        let gs = gid.get().to_string();
        let disabled = matches!(
            load_pfps_string(pool, &gs, "PFPS.disable").await.as_deref(),
            Some("1") | Some("true")
        );
        if disabled {
            continue;
        }
        let Some(chan) = load_pfps_string(pool, &gs, "PFPS.channel")
            .await
            .and_then(|c| c.parse::<u64>().ok())
            .filter(|c| *c != 0)
        else {
            continue;
        };
        let channel_id = poise::serenity_prelude::ChannelId::new(chan);
        // Members: cache first, one HTTP page fallback (TS fetches when
        // the cache looks uninitialized).
        let mut members: Vec<poise::serenity_prelude::Member> = cache
            .guild(gid)
            .map(|g| {
                g.members
                    .values()
                    .filter(|m| !m.user.bot)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default();
        if members.is_empty() {
            if let Ok(fetched) = gid.members(http, Some(1000), None).await {
                members = fetched.into_iter().filter(|m| !m.user.bot).collect();
            }
        }
        if members.is_empty() {
            continue;
        }
        // Random pick avoiding the last-posted member (TS re-rolls once
        // on repeat, then posts whatever comes out). Rng stays inside
        // this scope: ThreadRng is !Send and must not cross awaits.
        let pick = {
            let mut rng = rand::thread_rng();
            let mut pick = match members.choose(&mut rng) {
                Some(m) => m.clone(),
                None => continue,
            };
            let prev = last.lock().ok().and_then(|m| m.get(&gs).copied());
            if Some(pick.user.id.get()) == prev && members.len() > 1 {
                if let Some(other) = members
                    .choose(&mut rng)
                    .filter(|m| Some(m.user.id.get()) != prev)
                {
                    pick = other.clone();
                }
            }
            pick
        };
        if let Ok(mut m) = last.lock() {
            m.insert(gs.clone(), pick.user.id.get());
        }
        let code = crate::db::guild_lang(pool, Some(gid.get())).await;
        let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
        let username = pick
            .user
            .global_name
            .clone()
            .unwrap_or_else(|| pick.user.name.clone());
        let mut embeds: Vec<poise::serenity_prelude::CreateEmbed> = Vec::new();
        let mut buttons: Vec<poise::serenity_prelude::CreateButton> = Vec::new();
        // Guild avatar leg (TS posts it only when the member HAS one).
        if let Some(ahash) = pick.avatar.as_ref().map(|h| h.to_string()) {
            let gext = if ahash.starts_with("a_") {
                "gif"
            } else {
                "png"
            };
            let full = format!(
                "https://cdn.discordapp.com/guilds/{}/users/{}/avatars/{ahash}.{gext}?size=4096",
                gid.get(),
                pick.user.id.get()
            );
            buttons.push(
                poise::serenity_prelude::CreateButton::new_link(full.clone())
                    .label(t("pfps_download_guild_button", "Download Guild Avatar")),
            );
            embeds.push(
                poise::serenity_prelude::CreateEmbed::new()
                    .color(0xa2add0_u32)
                    .title(
                        t("pfps_embed_guild_title", "{username}'s **Guild** avatar")
                            // TS replaces only `{username}` inside
                            // `${username}`, leaving a stray `$` (visible
                            // live as `$name's …`). Replace the full token.
                            .replace("${username}", &username)
                            .replace("{username}", &username),
                    )
                    .image(full),
            );
        }
        // User avatar leg (always posted). Built from hash parts like
        // the guild leg: face() already carries `?size=1024`, so a
        // replace + append would emit a double-query URL
        // (`...png?size=1024?size=4096`). TS displayAvatarURL emits
        // a single `?size=4096`.
        let ufull = match pick.user.avatar.as_ref().map(|h| h.to_string()) {
            Some(ahash) => {
                let ext = if ahash.starts_with("a_") {
                    "gif"
                } else {
                    "png"
                };
                format!(
                    "https://cdn.discordapp.com/avatars/{}/{ahash}.{ext}?size=4096",
                    pick.user.id.get()
                )
            }
            // No custom avatar: default embed avatar (TS
            // displayAvatarURL falls back to it with no size leg).
            None => pick.user.face(),
        };
        buttons.push(
            poise::serenity_prelude::CreateButton::new_link(ufull.clone())
                .label(t("pfps_download_user_button", "Download User Avatar")),
        );
        // Footer (mirrors footerBuilder + footerAttachmentBuilder /
        // displayBotPP: stored BOT.botPFP base64 wins, else the live
        // bot avatar). Cache-local current user, like TS
        // `client.user.displayAvatarURL`: zero extra REST per guild
        // per tick. A failed download degrades to a text-only footer
        // (no orphan attachment).
        let (footer_name, footer_icon) = {
            let (name, stored) = crate::commands::shared::footer_parts_pool(pool, &gs).await;
            if stored.is_some() {
                (name, stored)
            } else {
                let face = cache.current_user().face();
                (
                    name,
                    crate::commands::shared::download_bytes(&face)
                        .await
                        .filter(|b| !b.is_empty()),
                )
            }
        };
        let user_embed = crate::commands::shared::embed_with_footer(
            poise::serenity_prelude::CreateEmbed::new()
                .color(0xa2add0_u32)
                .title(
                    t("pfps_embed_user_title", "{username}'s **User** avatar")
                        .replace("${username}", &username)
                        .replace("{username}", &username),
                )
                .image(ufull)
                .timestamp(poise::serenity_prelude::Timestamp::now()),
            &footer_name,
            footer_icon.is_some(),
        );
        embeds.push(user_embed);
        let mut msg = poise::serenity_prelude::CreateMessage::new()
            .embeds(embeds)
            .button(buttons.remove(0));
        for b in buttons {
            msg = msg.button(b);
        }
        if let Some(bytes) = footer_icon {
            msg = msg.add_file(poise::serenity_prelude::CreateAttachment::bytes(
                bytes,
                "footer_icon.png",
            ));
        }
        let _ = channel_id.send_message(http, msg).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pfps_reuses_security_on_off_parser() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_pfps_string(&pool, "g1", "PFPS.channel", "8")
            .await
            .unwrap();
        assert_eq!(
            load_pfps_string(&pool, "g1", "PFPS.channel")
                .await
                .as_deref(),
            Some("8")
        );
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "PFPS.channel").await;
        assert_eq!(legacy, None);
        // Legacy rows still read, table wins over legacy.
        crate::db::kv_set(&pool, "g2", "PFPS.disable", "1")
            .await
            .unwrap();
        assert_eq!(
            load_pfps_string(&pool, "g2", "PFPS.disable")
                .await
                .as_deref(),
            Some("1")
        );
        crate::db::kv_set(&pool, "g1", "PFPS.channel", "stale")
            .await
            .unwrap();
        assert_eq!(
            load_pfps_string(&pool, "g1", "PFPS.channel")
                .await
                .as_deref(),
            Some("8")
        );
    }
}

pub mod channel;
pub mod config;
#[allow(clippy::module_inception)]
pub mod pfps;

/// Old registry path (`pfps::main::pfps`) kept working.
pub mod main {
    pub use super::pfps::*;
}
