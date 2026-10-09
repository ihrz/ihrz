// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Shared cross-command helpers (U-LAYOUT-TS-PARITY Phase 1).
// Canonical home for helpers previously defined in one command module
// but used across several: clock, duration parsing, bot footer/profile
// store, permission loaders, guild config blob. The original modules
// re-export these names so existing `crate::commands::<module>::<helper>`
// paths keep resolving.

use crate::bot::Ctx;

/// Current time in unix milliseconds. Mirrors TS Date.now().
/// Canonical copy; schedule/context/economy previously each defined this.
pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Parse a simple duration ("10s", "5m", "2h", "7d") into milliseconds.
/// Mirrors TS `client.timeCalculator.to_ms(message.content)` for the
/// single-unit case.
pub fn parse_duration_ms(raw: &str) -> Option<i64> {
    let s = raw.trim().to_ascii_lowercase();
    if s.is_empty() {
        return None;
    }
    let (num_part, mult) = if let Some(stripped) = s.strip_suffix("ms") {
        (stripped, 1_i64)
    } else if let Some(stripped) = s.strip_suffix('s') {
        (stripped, 1_000_i64)
    } else if let Some(stripped) = s.strip_suffix('m') {
        (stripped, 60_000_i64)
    } else if let Some(stripped) = s.strip_suffix('h') {
        (stripped, 3_600_000_i64)
    } else if let Some(stripped) = s.strip_suffix('d') {
        (stripped, 86_400_000_i64)
    } else {
        (s.as_str(), 1_000_i64)
    };
    let n: i64 = num_part.trim().parse().ok()?;
    if n <= 0 {
        return None;
    }
    n.checked_mul(mult)
}

/// Per-guild bot profile store keys. Mirrors `${guildId}.BOT.botName`
/// / `BOT.botPFP` in bot/custom/!name.ts and !avatar.ts.
pub const BOT_NAME_KEY: &str = "BOT.botName";
pub const BOT_PFP_KEY: &str = "BOT.botPFP";

/// Resolve the embed footer text. Mirrors displayBotName.footerBuilder
/// (stored BOT.botName, default "iHorizon").
pub fn bot_footer_name(stored: Option<&str>) -> String {
    stored
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "iHorizon".to_string())
}

/// Resolve the footer icon attachment bytes. Mirrors
/// displayBotName.footerAttachmentBuilder + displayBotPP: a stored
/// BOT.botPFP base64 blob becomes footer_icon.png bytes; otherwise the
/// caller falls back to the live bot avatar URL (type 1 branch).
pub fn footer_icon_bytes(stored: Option<&str>) -> Option<Vec<u8>> {
    stored.and_then(crate::emojis::base64_decode)
}

/// Paginated footer text. Mirrors footerPaginationBuilder.
pub fn footer_page_text(name: &str, page_word: &str, page: u64, max: u64) -> String {
    format!("{name} • {page_word} {page}/{max}")
}

/// Download raw bytes (avatar attachments, current bot avatar).
pub async fn download_bytes(url: &str) -> Option<Vec<u8>> {
    reqwest::Client::new()
        .get(url)
        .send()
        .await
        .ok()?
        .bytes()
        .await
        .ok()
        .map(|b| b.to_vec())
}

/// Footer text plus optional footer_icon.png bytes.
/// Mirrors displayBotName footerBuilder/footerAttachmentBuilder
/// (stored BOT.botPFP base64 wins, else a bot avatar snapshot;
// TS attaches the avatar URL, we attach its bytes so the icon renders).
pub async fn footer_parts(ctx: &Ctx<'_>, guild_id: &str) -> (String, Option<Vec<u8>>) {
    let pool = &ctx.data().pool;
    let name = bot_footer_name(
        crate::db::kv_get(pool, guild_id, BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let stored = crate::db::kv_get(pool, guild_id, BOT_PFP_KEY).await;
    if let Some(bytes) = footer_icon_bytes(stored.as_deref()) {
        return (name, Some(bytes));
    }
    let face = ctx.serenity_context().cache.current_user().face();
    let bytes = download_bytes(&face).await;
    (name, bytes)
}

/// Apply the shared footer (text + optional icon attachment) to an embed.
pub fn embed_with_footer(
    embed: poise::serenity_prelude::CreateEmbed,
    name: &str,
    with_icon: bool,
) -> poise::serenity_prelude::CreateEmbed {
    embed.footer(
        poise::serenity_prelude::CreateEmbedFooter::new(name.to_string()).icon_url(if with_icon {
            "attachment://footer_icon.png".to_string()
        } else {
            String::new()
        }),
    )
}

/// Custom per-command permissions. Mirrors perm/!command.ts
/// (UTILS.PERMS.<command> {users, roles, level}).
pub fn perm_key(command: &str) -> String {
    format!("UTILS.PERMS.{command}")
}

pub async fn load_cmd_perms(
    pool: &crate::db::Pool,
    guild_id: &str,
    command: &str,
) -> Option<crate::executor::CmdPerms> {
    let raw = crate::db::kv_get(pool, guild_id, &perm_key(command)).await?;
    if let Ok(p) = serde_json::from_str(&raw) {
        return Some(p);
    }
    // Legacy bare-number format (PermLevel). Mirrors the
    // `typeof existingPerms === "number"` branch in !command.ts.
    raw.trim()
        .parse::<u8>()
        .ok()
        .map(|n| crate::executor::CmdPerms {
            level: Some(n),
            ..Default::default()
        })
}

/// True when the entry restricts anything. Mirrors
/// has(Permission|CommandPermission)Requirements.
pub fn has_perm_requirements(perms: &crate::executor::CmdPerms) -> bool {
    !perms.users.is_empty() || !perms.roles.is_empty() || perms.level.unwrap_or(0) > 0
}

/// Load every per-command permission row: (command, perms).
/// Mirrors reading the whole `UTILS.PERMS` subtree in !command.ts.
pub async fn load_all_cmd_perms(
    pool: &crate::db::Pool,
    gid: &str,
) -> Vec<(String, crate::executor::CmdPerms)> {
    let keys: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'UTILS.PERMS.%'",
    )
    .bind(gid)
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut out = vec![];
    for key in keys {
        let Some(cmd) = key.strip_prefix("UTILS.PERMS.") else {
            continue;
        };
        if cmd.is_empty() || cmd.contains('.') {
            continue;
        }
        if let Some(p) = load_cmd_perms(pool, gid, cmd).await {
            out.push((cmd.to_string(), p));
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

/// Load the guild config blob. Mirrors the GUILD.GUILD_CONFIG object
/// read by the welcomer panel and the join/leave emitters.
pub async fn load_guild_config(pool: &crate::db::Pool, gid: &str) -> serde_json::Value {
    crate::db::kv_get(pool, gid, "GUILD.GUILD_CONFIG")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}))
}

pub async fn save_guild_config(
    pool: &crate::db::Pool,
    gid: &str,
    cfg: &serde_json::Value,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, gid, "GUILD.GUILD_CONFIG", &cfg.to_string()).await
}

/// Set or remove a blob field. Mirrors the panel set/delete pairs
/// (message/embed/channel/toggle keys).
pub fn welcomer_set(cfg: &mut serde_json::Value, field: &str, value: Option<serde_json::Value>) {
    match value {
        Some(v) => cfg[field] = v,
        None => {
            if let Some(map) = cfg.as_object_mut() {
                map.remove(field);
            }
        }
    }
}
