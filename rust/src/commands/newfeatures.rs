// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/newfeatures/* (nightmode, gitlines,
// counter). Nightmode collector UI flattened to config subs; the 60s
// scheduler tick lives in scheduler.rs.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NightmodeConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub start_hour: u8,
    #[serde(default = "default_end")]
    pub end_hour: u8,
}

fn default_end() -> u8 {
    7
}

pub fn valid_hour(h: i64) -> bool {
    (0..=23).contains(&h)
}

/// Night window check, overnight wrap included (e.g. 22h-7h).
/// Mirrors nightmodeManager tick.
pub fn night_active(start_hour: u8, end_hour: u8, now_hour: u8) -> bool {
    if start_hour == end_hour {
        return false;
    }
    if start_hour < end_hour {
        (start_hour..end_hour).contains(&now_hour)
    } else {
        now_hour >= start_hour || now_hour < end_hour
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "counter",
    subcommands("counter_channel", "counter_config")
)]
pub async fn counter(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Last counter record. Mirrors COUNTER_DATA {amount, userId}
/// (plus the legacy bare-number shape, attributed to nobody).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CounterData {
    pub amount: i64,
    pub user_id: Option<String>,
}

pub fn parse_counter_data(raw: Option<&str>) -> CounterData {
    let fallback = CounterData {
        amount: 0,
        user_id: None,
    };
    let Some(raw) = raw else {
        return fallback;
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) else {
        return fallback;
    };
    if let Some(n) = value.as_i64() {
        return CounterData {
            amount: n,
            user_id: None,
        };
    }
    CounterData {
        amount: value.get("amount").and_then(|a| a.as_i64()).unwrap_or(0),
        user_id: value
            .get("userId")
            .and_then(|u| u.as_str())
            .map(|s| s.to_string()),
    }
}

pub fn counter_data_json(data: &CounterData) -> String {
    serde_json::json!({"amount": data.amount, "userId": data.user_id}).to_string()
}

/// TS Number() semantics for the counter: blank never counts;
/// non-finite Rust-only parses ("inf") do not count either.
pub fn counter_number(content: &str) -> Option<f64> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return None;
    }
    let n: f64 = trimmed.parse().ok()?;
    if n.is_finite() {
        Some(n)
    } else {
        None
    }
}

/// One counting-game step. Mirrors Events/counter/onNewMessage.ts:
/// exact next integer by a different user accepts; anything else
/// resets to zero (wrong number or repeat by the same user replies
/// with its own text, non-numbers get the syntax error).
#[derive(Debug, Clone, PartialEq)]
pub enum CounterOutcome {
    Accept { number: i64 },
    WrongNumber { same_user: bool, number: f64 },
    NotNumber,
}

pub fn counter_step(last: &CounterData, author_id: &str, content: &str) -> CounterOutcome {
    let Some(n) = counter_number(content) else {
        return CounterOutcome::NotNumber;
    };
    let is_next = n.fract() == 0.0 && n as i64 == last.amount + 1;
    let same_user = last.user_id.as_deref() == Some(author_id);
    if is_next && !same_user {
        CounterOutcome::Accept { number: n as i64 }
    } else {
        CounterOutcome::WrongNumber {
            same_user,
            number: n,
        }
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn counter_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "COUNTER.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "counter_channel_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
            })
            .unwrap_or_else(|| "Counter channel set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn counter_config(
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
        "COUNTER.config",
        if enabled { "on" } else { "off" },
    )
    .await?;
    ctx.say(if enabled {
        "Counter on."
    } else {
        "Counter off."
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "nightmode",
    aliases("modenuit", "nuit", "night", "mode-nuit", "night-mode"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nightmode(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Start hour 0-23"] start: Option<i64>,
    #[description = "End hour 0-23"] end: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let mut cfg = NightmodeConfig {
        enabled,
        start_hour: 22,
        end_hour: 7,
    };
    if let Some(s) = start {
        if !valid_hour(s) {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "nightmode_invalid_hour_morning")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "Bad start hour.".to_string()),
            )
            .await?;
            return Ok(());
        }
        cfg.start_hour = s as u8;
    }
    if let Some(e) = end {
        if !valid_hour(e) {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "nightmode_invalid_hour_night")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "Bad end hour.".to_string()),
            )
            .await?;
            return Ok(());
        }
        cfg.end_hour = e as u8;
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.NIGHT_MODE",
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    ctx.say(format!(
        "Nightmode {} ({}h-{}h).",
        if enabled { "on" } else { "off" },
        cfg.start_hour,
        cfg.end_hour
    ))
    .await?;
    Ok(())
}

// Parent for `/git lines` (mirrors gitlines.ts declaration; the
// toggle itself lives in the `lines` subcommand like !lines.ts).
/// Git lines module.
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "git",
    subcommands("git_lines_toggle"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn git_parent(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

// Flip UTILS.git_lines (default-on like the TS `!state` toggle)
// and confirm with git_lines_work[_disabled].
/// Toggle Git lines unfurls.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lines",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn git_lines_toggle(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let stored = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.git_lines").await;
    let enabled = !crate::commands::utils::github_lines_enabled(stored.as_deref());
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.git_lines",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            if enabled {
                "git_lines_work"
            } else {
                "git_lines_work_disabled"
            },
            if enabled {
                "Git lines on."
            } else {
                "Git lines off."
            },
        )
        .await,
    )
    .await?;
    Ok(())
}

/// Anti-pub spam config (amount/type/state).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "punishpub"
)]
pub async fn punishpub(
    ctx: Ctx<'_>,
    #[description = "Flags before sanction"] amount: Option<i64>,
    #[description = "ban, kick or mute"] punishment: Option<String>,
    #[description = "on or off"] action: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    if let Some(a) = amount {
        cfg["amountMax"] = serde_json::Value::from(a.max(1) - 1);
    }
    if let Some(p) = punishment {
        cfg["punishementType"] = serde_json::Value::String(p.trim().to_string());
    }
    if let Some(a) = action {
        cfg["state"] = serde_json::Value::String(
            if a.trim().eq_ignore_ascii_case("on") {
                "true"
            } else {
                "false"
            }
            .to_string(),
        );
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.PUNISH.PUNISH_PUB",
        &cfg.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_punishpub_updated")
            .unwrap_or_else(|| "Punishpub updated.".to_string()),
    )
    .await?;
    Ok(())
}

/// Rolesaver config (TS `GUILD.GUILD_CONFIG.rolesaver` blob
/// `{enable, timeout, admin}`; falls back to this bot's legacy
/// flat `.enable` row).
#[derive(Debug, Clone, Default)]
pub struct RolesaverCfg {
    pub enabled: bool,
    pub skip_admin: bool,
}

fn truthy(v: &serde_json::Value) -> bool {
    match v {
        serde_json::Value::Bool(b) => *b,
        serde_json::Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
        serde_json::Value::String(s) => matches!(s.as_str(), "1" | "true"),
        _ => false,
    }
}

pub async fn load_rolesaver_cfg(pool: &crate::db::Pool, guild_id: &str) -> RolesaverCfg {
    if let Some(raw) = crate::db::kv_get(pool, guild_id, "GUILD.GUILD_CONFIG.rolesaver").await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            return RolesaverCfg {
                enabled: v.get("enable").map(truthy).unwrap_or(false),
                skip_admin: v.get("admin").and_then(|a| a.as_str()) == Some("no"),
            };
        }
    }
    RolesaverCfg {
        enabled: rolesaver_enabled(pool, guild_id).await,
        skip_admin: false,
    }
}

/// Rolesaver on/off switch (blob shape + embeds like
/// SlashCommands/newfeatures/rolesaver.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "rolesaver"
)]
pub async fn rolesaver(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Restore admin roles: yes or no"] settings: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default().colour(serenity::Colour::new(0x3725a4));
    let mut reply = poise::CreateReply::default();
    if matches!(action.to_ascii_lowercase().as_str(), "on" | "power on") {
        let settings = settings.as_deref().unwrap_or("None");
        let embed = serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(0x3725a4))
            .title(t("rolesaver_embed_title"))
            .description(t("rolesaver_embed_desc"))
            .field(
                t("rolesaver_embed_fields_1_name"),
                format!("`{action}`"),
                false,
            )
            .field(
                t("rolesaver_embed_fields_2_name"),
                format!("`{settings}`"),
                false,
            )
            .field(t("rolesaver_embed_fields_3_name"), "`None`", false);
        let embed =
            crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
        reply = reply.embed(embed);
        if let Some(bytes) = footer_bytes {
            reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        ctx.send(reply).await?;
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({
                "enable": true,
                "timeout": "None",
                "admin": settings,
            })
            .to_string(),
        )
        .await?;
        return Ok(());
    }
    if !load_rolesaver_cfg(&ctx.data().pool, &gid).await.enabled {
        ctx.say(t("rolesaver_on_off_already_set")).await?;
        return Ok(());
    }
    embed = embed
        .title(t("rolesaver_on_off_embed_title"))
        .description(t("rolesaver_on_off_embed_desc"))
        .field(
            t("rolesaver_on_off_embed_fields_1_name"),
            format!("`{action}`"),
            false,
        );
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    reply = reply.embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind("GUILD.GUILD_CONFIG.rolesaver")
        .execute(&ctx.data().pool)
        .await;
    Ok(())
}

pub async fn rolesaver_enabled(pool: &crate::db::Pool, guild_id: &str) -> bool {
    crate::db::kv_get(pool, guild_id, "GUILD.GUILD_CONFIG.rolesaver.enable")
        .await
        .map(|v| v == "1")
        .unwrap_or(false)
}

/// Bug report (5h cooldown, stored).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "report"
)]
pub async fn report(
    ctx: Ctx<'_>,
    #[description = "Message to devs (8+ words)"] message: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let uid = ctx.author().id.get();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let last: i64 = crate::db::kv_get(
        &ctx.data().pool,
        &gid,
        &format!("USER.{uid}.REPORT.cooldown"),
    )
    .await
    .and_then(|s| s.parse().ok())
    .unwrap_or(0);
    if now - last < 18_000_000 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_report_cooldown_active")
                .unwrap_or_else(|| "Report cooldown active.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if message.split_whitespace().count() < 8 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "report_specify")
                .unwrap_or_else(|| "Please specify (8+ words).".to_string()),
        )
        .await?;
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("REPORTS.{now}.{uid}"),
        &message,
    )
    .await?;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("USER.{uid}.REPORT.cooldown"),
        &now.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "report_command_work")
            .unwrap_or_else(|| "Report recorded.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hours_validate() {
        assert!(valid_hour(0) && valid_hour(23));
        assert!(!valid_hour(-1) && !valid_hour(24));
    }

    #[test]
    fn night_window_wraps_midnight() {
        assert!(night_active(22, 7, 23));
        assert!(night_active(22, 7, 3));
        assert!(!night_active(22, 7, 12));
        assert!(night_active(9, 17, 12));
        assert!(!night_active(9, 17, 20));
        assert!(!night_active(8, 8, 8));
    }

    #[test]
    fn counter_game_steps_mirror_ts() {
        let fresh = CounterData {
            amount: 0,
            user_id: None,
        };
        // First count by anyone accepts.
        assert_eq!(
            counter_step(&fresh, "u1", "1"),
            CounterOutcome::Accept { number: 1 }
        );
        let one = CounterData {
            amount: 1,
            user_id: Some("u1".to_string()),
        };
        // Same user twice: wrong, flagged same_user.
        assert_eq!(
            counter_step(&one, "u1", "2"),
            CounterOutcome::WrongNumber {
                same_user: true,
                number: 2.0
            }
        );
        // Wrong number by another user.
        assert_eq!(
            counter_step(&one, "u2", "3"),
            CounterOutcome::WrongNumber {
                same_user: false,
                number: 3.0
            }
        );
        // Correct continuation.
        assert_eq!(
            counter_step(&one, "u2", "2"),
            CounterOutcome::Accept { number: 2 }
        );
        // Non-numbers and blanks never count.
        assert_eq!(counter_step(&one, "u2", "hi"), CounterOutcome::NotNumber);
        assert_eq!(counter_step(&one, "u2", "   "), CounterOutcome::NotNumber);
        // Fractions never accept.
        assert!(matches!(
            counter_step(&fresh, "u1", "1.5"),
            CounterOutcome::WrongNumber { .. }
        ));
    }

    #[test]
    fn counter_data_parses_shapes() {
        assert_eq!(
            parse_counter_data(None),
            CounterData {
                amount: 0,
                user_id: None
            }
        );
        // Legacy bare-number row.
        assert_eq!(
            parse_counter_data(Some("4")),
            CounterData {
                amount: 4,
                user_id: None
            }
        );
        let row = parse_counter_data(Some(r#"{"amount":7,"userId":"u9"}"#));
        assert_eq!(row.amount, 7);
        assert_eq!(row.user_id.as_deref(), Some("u9"));
        let reset = CounterData {
            amount: 0,
            user_id: None,
        };
        let json: serde_json::Value = serde_json::from_str(&counter_data_json(&reset)).unwrap();
        assert_eq!(json["amount"], 0);
        assert!(json["userId"].is_null());
    }
}
