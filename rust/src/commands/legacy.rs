// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Legacy MessageCommands surface (prefix heritage, exposed as hybrid).
// Bridges (@prefix/autologs/unslowmode/welcomer) already exist as native
// commands; only unique logic lives here. Meme mergers (meme1/2/3) need
// image/video processing — pending.
//
// TS keys: UTILS.autoFeur, UTILS.antiExe, GUILD.REACT_MSG.<trigger>,
// GUILD.WELCOME {channel, message}.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// "quoi" tail detector. Mirrors autoFeur.ts trigger.
pub fn is_quoi_bait(text: &str) -> bool {
    let t = text
        .trim()
        .trim_end_matches(['?', '!', '.'])
        .trim()
        .to_ascii_lowercase();
    t == "quoi" || t.ends_with(" quoi")
}

/// .exe/.bat attachment guard. Mirrors antiExe.ts.
pub fn has_blocked_exe(names: &[String]) -> bool {
    names.iter().any(|n| {
        let lower = n.to_ascii_lowercase();
        lower.ends_with(".exe")
            || lower.ends_with(".bat")
            || lower.ends_with(".cmd")
            || lower.ends_with(".scr")
    })
}

pub fn flag_on(raw: Option<String>) -> bool {
    matches!(
        raw.as_deref().map(str::trim),
        Some("1") | Some("true") | Some("on")
    )
}

#[poise::command(slash_command, prefix_command, category = "utils", rename = "autofeur")]
pub async fn autofeur(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.autoFeur",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Autofeur on."
    } else {
        "Autofeur off."
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "utils", rename = "antiexe")]
pub async fn antiexe(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.antiExe",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "AntiExe on."
    } else {
        "AntiExe off."
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "add-react"
)]
pub async fn add_react(
    ctx: Ctx<'_>,
    #[description = "Trigger (exact match)"] trigger: String,
    #[description = "Response"] response: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("GUILD.REACT_MSG.{}", trigger.trim().to_ascii_lowercase()),
        response.trim(),
    )
    .await?;
    ctx.say("Custom react added.").await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "list-react"
)]
pub async fn list_react(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GUILD.REACT_MSG.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No custom reacts.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "remove-react"
)]
pub async fn remove_react(
    ctx: Ctx<'_>,
    #[description = "Trigger"] trigger: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(format!(
            "GUILD.REACT_MSG.{}",
            trigger.trim().to_ascii_lowercase()
        ))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Custom react removed.").await?;
    Ok(())
}

/// Welcomer config (GUILD.GUILD_CONFIG join/leave keys).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "welcomer")]
pub async fn welcomer(
    ctx: Ctx<'_>,
    #[description = "Join channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
    #[description = "Join message ({user} {server} {memberCount})"] message: Option<String>,
    #[description = "Leave channel"]
    #[channel_types("Text")]
    leave_channel: Option<serenity::GuildChannel>,
    #[description = "Leave message"] leave_message: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.GUILD_CONFIG").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    if let Some(ch) = channel {
        cfg["join"] = serde_json::Value::String(ch.id.get().to_string());
    }
    if let Some(m) = message {
        cfg["joinmessage"] = serde_json::Value::String(m);
    }
    if let Some(ch) = leave_channel {
        cfg["leave"] = serde_json::Value::String(ch.id.get().to_string());
    }
    if let Some(m) = leave_message {
        cfg["leavemessage"] = serde_json::Value::String(m);
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.GUILD_CONFIG",
        &cfg.to_string(),
    )
    .await?;
    ctx.say("Welcomer updated.").await?;
    Ok(())
}

/// Changelog display. Mirrors @updates.ts (repo CHANGELOG.md).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "updates")]
pub async fn updates(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "iHorizon Rust v{} — see /help.",
        env!("CARGO_PKG_VERSION")
    ))
    .await?;
    Ok(())
}

/// Custom-id prefix of the newsletter opt-out button.
/// Mirrors @updates.ts + releaseNotifier.ts:
/// `newsletter-toggle%<guildId>` (DM variant appends `?dm`).
pub const NEWSLETTER_TOGGLE_PREFIX: &str = "newsletter-toggle%";

/// Global kv slot holding the newsletter blacklist.
/// Mirrors metasTable key `newsletter_bl` (owner_id -> true).
pub const NEWSLETTER_BL_KEY: &str = "newsletter_bl";

/// Parse the guild id out of a newsletter-toggle custom id.
/// Mirrors `interaction.customId.split("%")[1]?.split("?")[0]`.
pub fn newsletter_toggle_guild(custom_id: &str) -> Option<u64> {
    let rest = custom_id.strip_prefix(NEWSLETTER_TOGGLE_PREFIX)?;
    let gid = rest.split('?').next().unwrap_or("");
    if gid.is_empty() {
        return None;
    }
    gid.parse::<u64>().ok()
}

/// Pure toggle over the serialized `newsletter_bl` map.
/// Returns (new_json, was_disabled): when the owner was listed, the
/// entry is removed (re-subscribe); otherwise it is added (opt out).
/// Mirrors newsletter-toggle.ts delete/set branch.
pub fn toggle_newsletter_bl(raw: Option<&str>, owner_id: &str) -> (String, bool) {
    let mut map: serde_json::Map<String, serde_json::Value> = raw
        .and_then(|r| serde_json::from_str(r).ok())
        .unwrap_or_default();
    let was_disabled = map.get(owner_id).and_then(|v| v.as_bool()).unwrap_or(false);
    if was_disabled {
        map.remove(owner_id);
    } else {
        map.insert(owner_id.to_string(), serde_json::Value::Bool(true));
    }
    (serde_json::Value::Object(map).to_string(), was_disabled)
}

/// Newsletter opt-out toggle button. Mirrors
/// Interaction/Components/Buttons/newsletter-toggle.ts: non-owners get
/// the not-owner notice, owners flip their `newsletter_bl` entry.
pub async fn handle_newsletter_toggle(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let owner_id = comp.user.id.get().to_string();
    if let Some(gid) = newsletter_toggle_guild(&comp.data.custom_id) {
        let owner_match = serenity::GuildId::new(gid)
            .to_partial_guild(&ctx.http)
            .await
            .map(|g| g.owner_id.get().to_string() == owner_id)
            .unwrap_or(true);
        if !owner_match {
            let code = crate::db::guild_lang(pool, comp.guild_id.map(|g| g.get())).await;
            let bot_id = ctx.cache.current_user().id.get().to_string();
            let msg = crate::lang::get(&code, "newsletter_not_owner")
                .unwrap_or_default()
                .replace("${clientId}", &bot_id);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(msg)
                        .ephemeral(true),
                ),
            )
            .await?;
            return Ok(());
        }
    }
    let raw = crate::db::kv_get(pool, "0", NEWSLETTER_BL_KEY).await;
    let (updated, was_disabled) = toggle_newsletter_bl(raw.as_deref(), &owner_id);
    crate::db::kv_set(pool, "0", NEWSLETTER_BL_KEY, &updated).await?;
    let code = crate::db::guild_lang(pool, comp.guild_id.map(|g| g.get())).await;
    let key = if was_disabled {
        "newsletter_toggle_enabled"
    } else {
        "newsletter_toggle_disabled"
    };
    let msg = crate::lang::get(&code, key).unwrap_or_default();
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(msg)
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

/// Shard info. Mirrors shardinfo.ts (cache-visible part).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "shardinfo"
)]
pub async fn shardinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let guilds = ctx.cache().guild_count();
    ctx.say(format!("Guilds in cache: {guilds}.")).await?;
    Ok(())
}

/// Status embed. Mirrors status-embed.ts (local process status).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "status-embed"
)]
pub async fn status_embed(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let latency = ctx.ping().await.as_millis();
    let db_ms = crate::funcs::database_latency(&ctx.data().pool).await;
    let (mem_total, mem_free) = crate::funcs::system_memory_kb();
    let embed = serenity::CreateEmbed::default()
        .title("iHorizon status")
        .field("Latency", format!("{latency}ms"), true)
        .field("DB", format!("{db_ms}ms"), true)
        .field(
            "Memory",
            crate::funcs::nice_bytes((mem_total - mem_free.min(mem_total)) as f64),
            true,
        )
        .field("Version", env!("CARGO_PKG_VERSION"), true);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Language stats. Mirrors langstats.ts (loaded YAML key counts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "langstats"
)]
pub async fn langstats(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let mut lines = vec![];
    for code in [
        "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT", "ru-RU",
    ] {
        let n = match crate::lang::table_for(code) {
            serde_yaml::Value::Mapping(m) => m.len(),
            _ => 0,
        };
        lines.push(format!("{code}: {n}"));
    }
    ctx.say(lines.join("\n")).await?;
    Ok(())
}

/// Fake nitro file meme. Mirrors nitrofdp.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "nitrofdp")]
pub async fn nitrofdp(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.channel_id()
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new().add_file(serenity::CreateAttachment::bytes(
                b"fake nitro".to_vec(),
                "fake_nitro.txt",
            )),
        )
        .await?;
    Ok(())
}

/// Create a webhook and return its URL. Mirrors securewebhook.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "securewebhook"
)]
pub async fn securewebhook(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let wh = channel
        .id
        .create_webhook(
            ctx.http(),
            serenity::CreateWebhook::new(name.unwrap_or_else(|| "iHorizon".to_string())),
        )
        .await?;
    let url = wh.url().unwrap_or_else(|_| "unavailable".to_string());
    ctx.say(format!("Webhook: {url}")).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quoi_trigger() {
        assert!(is_quoi_bait("quoi"));
        assert!(is_quoi_bait("tu dis quoi"));
        assert!(is_quoi_bait("quoi?"));
        assert!(!is_quoi_bait("pourquoi pas"));
        assert!(!is_quoi_bait(""));
    }

    #[test]
    fn exe_guard() {
        assert!(has_blocked_exe(&["a.EXE".to_string()]));
        assert!(has_blocked_exe(&["x.bat".to_string()]));
        assert!(!has_blocked_exe(&["a.png".to_string()]));
        assert!(!has_blocked_exe(&[]));
        assert!(flag_on(Some("1".to_string())));
        assert!(flag_on(Some("true".to_string())));
        assert!(!flag_on(Some("0".to_string())));
        assert!(!flag_on(None));
    }

    #[test]
    fn newsletter_toggle_guild_parses() {
        assert_eq!(newsletter_toggle_guild("newsletter-toggle%123"), Some(123));
        assert_eq!(
            newsletter_toggle_guild("newsletter-toggle%123?dm"),
            Some(123)
        );
        assert_eq!(newsletter_toggle_guild("newsletter-toggle%"), None);
        assert_eq!(newsletter_toggle_guild("other%123"), None);
    }

    #[test]
    fn newsletter_toggle_roundtrip() {
        let (json, was) = toggle_newsletter_bl(None, "42");
        assert!(!was);
        assert_eq!(json, "{\"42\":true}");
        let (json, was) = toggle_newsletter_bl(Some(&json), "42");
        assert!(was);
        assert_eq!(json, "{}");
        let (json, was) = toggle_newsletter_bl(Some("not json"), "7");
        assert!(!was);
        assert_eq!(json, "{\"7\":true}");
    }
}
