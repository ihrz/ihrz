// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/bot/* (botinfo, say, setlang, invite, links).

use crate::bot::{Ctx, Data};
use poise::serenity_prelude as serenity;

pub const SUPPORTED_LANGS: [&str; 10] = [
    "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT", "ru-RU",
];

pub fn parse_lang(code: &str) -> Option<&str> {
    SUPPORTED_LANGS.iter().copied().find(|c| *c == code)
}

pub fn uptime_str(secs: u64) -> String {
    let days = secs / 86_400;
    let hours = (secs % 86_400) / 3_600;
    let mins = (secs % 3_600) / 60;
    if days > 0 {
        format!("{days}d {hours}h {mins}m")
    } else if hours > 0 {
        format!("{hours}h {mins}m")
    } else if mins > 0 {
        format!("{mins}m")
    } else {
        format!("{secs}s")
    }
}

/// Bot info. Mirrors src/Interaction/HybridCommands/bot/botinfo.ts.
#[poise::command(slash_command, prefix_command, category = "bot", rename = "bot-info")]
pub async fn botinfo_full(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let guilds = ctx.cache().guild_count();
    let embed = serenity::CreateEmbed::default()
        .title("iHorizon")
        .field("Servers", format!("{guilds}"), false)
        .field("Version", env!("CARGO_PKG_VERSION"), false)
        .field("Created by", "<@171356978310938624>", false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Send a message through the bot. Mirrors say.ts (`"> " + content`).
#[poise::command(slash_command, prefix_command, category = "bot")]
pub async fn say(
    ctx: Ctx<'_>,
    #[description = "What you want the bot to say"] content: String,
) -> Result<(), anyhow::Error> {
    ctx.say(format!("> {content}")).await?;
    Ok(())
}

/// Set the server language. Mirrors setserverlang.ts (writes GUILD.LANG).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "setlang",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setlang(
    ctx: Ctx<'_>,
    #[description = "Server language"] lang: String,
) -> Result<(), anyhow::Error> {
    let Some(code) = parse_lang(lang.trim()) else {
        ctx.say("Invalid language. Supported: ar-EG, de-DE, en-US, es-ES, fr-FR, fr-ME, it-IT, jp-JP, pt-PT, ru-RU.")
            .await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command must be used in a server.").await?;
        return Ok(());
    };
    crate::db::kv_set(&ctx.data().pool, &guild_id.to_string(), "GUILD.LANG", code).await?;
    ctx.say(format!("Language set to `{code}`.")).await?;
    Ok(())
}

/// Get the bot invite link. Mirrors invite.ts.
#[poise::command(slash_command, prefix_command, category = "bot")]
pub async fn invite(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let app_id = ctx.serenity_context().cache.current_user().id;
    let url = format!(
        "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
    );
    ctx.say(url).await?;
    Ok(())
}

/// Show all links about iHorizon. Mirrors link.ts.
#[poise::command(slash_command, prefix_command, category = "bot")]
pub async fn links(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Website: https://ihorizon.org | GitLab: https://gitlab.com/ihrz/ihrz")
        .await?;
    Ok(())
}

pub fn bot_commands() -> Vec<poise::Command<Data, anyhow::Error>> {
    vec![botinfo_full(), say(), setlang(), invite(), links()]
}

/// CPU model from /proc/cpuinfo. Mirrors status.ts os.cpus()[0].model.
pub fn cpu_model() -> String {
    std::fs::read_to_string("/proc/cpuinfo")
        .ok()
        .and_then(|b| {
            b.lines()
                .find(|l| l.starts_with("model name"))
                .and_then(|l| l.split(':').nth(1))
                .map(|m| m.trim().to_string())
        })
        .unwrap_or_else(|| std::env::consts::ARCH.to_string())
}

/// Machine uptime. Mirrors status.ts os.uptime block.
pub fn machine_uptime() -> String {
    let secs: u64 = std::fs::read_to_string("/proc/uptime")
        .ok()
        .and_then(|b| b.split_whitespace().next()?.parse::<f64>().ok())
        .unwrap_or(0.0) as u64;
    uptime_str(secs)
}

/// Status embed. Mirrors bot !status.ts (CPU/memory/uptime/OS/version).
#[poise::command(slash_command, prefix_command, category = "bot", rename = "status")]
pub async fn status(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let (total, free) = crate::funcs::system_memory_kb();
    let embed = serenity::CreateEmbed::default()
        .title("Status")
        .field("Cpu", cpu_model(), false)
        .field(
            "Memory",
            format!(
                "{}/{}",
                crate::funcs::nice_bytes((total - free.min(total)) as f64),
                crate::funcs::nice_bytes(total as f64)
            ),
            false,
        )
        .field("Machine Uptime", machine_uptime(), false)
        .field(
            "OS",
            format!("{} {}", std::env::consts::OS, std::env::consts::ARCH),
            false,
        )
        .field("Bot Version", env!("CARGO_PKG_VERSION"), false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

macro_rules! lore_cmd {
    ($fn_name:ident, $sub:literal, $key:literal, $fallback:literal) => {
        #[poise::command(slash_command, prefix_command, category = "bot", rename = $sub)]
        pub async fn $fn_name(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(crate::lang::get(&code, $key).unwrap_or_else(|| $fallback.to_string()))
                .await?;
            Ok(())
        }
    };
}

lore_cmd!(andru, "andru", "andru_message", "Andru");
lore_cmd!(ether, "ether", "ether_message", "Ether");
lore_cmd!(iris, "iris", "irisweb_message", "Iris");
lore_cmd!(kisakay, "kisakay", "kisakay_message", "Kisakay");

/// Noaimie picture link. Mirrors !noaimie.ts (fixed asset URL).
#[poise::command(slash_command, prefix_command, category = "bot", rename = "noaimie")]
pub async fn noaimie(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("https://www.ihorizon.org/assets/img/noaimie.jpg")
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_lang_accepts_all_supported_codes() {
        for code in SUPPORTED_LANGS {
            assert_eq!(parse_lang(code), Some(code), "should accept {code}");
        }
    }

    #[test]
    fn parse_lang_rejects_unknown_codes() {
        for bad in ["", "en", "EN-US", "fr", "xx-XX", "en_US"] {
            assert_eq!(parse_lang(bad), None, "should reject {bad:?}");
        }
    }

    #[test]
    fn parse_lang_is_case_sensitive() {
        assert_eq!(parse_lang("EN-US"), None);
        assert_eq!(parse_lang("en-US"), Some("en-US"));
    }

    #[test]
    fn uptime_str_formats_days_hours_mins() {
        assert_eq!(uptime_str(2 * 86_400 + 3 * 3_600 + 4 * 60), "2d 3h 4m");
        assert_eq!(uptime_str(86_400), "1d 0h 0m");
    }

    #[test]
    fn uptime_str_formats_hours_and_mins() {
        assert_eq!(uptime_str(3_600), "1h 0m");
        assert_eq!(uptime_str(3_600 + 5 * 60), "1h 5m");
        assert_eq!(uptime_str(59 * 60), "59m");
    }

    #[test]
    fn uptime_str_formats_seconds_under_a_minute() {
        assert_eq!(uptime_str(0), "0s");
        assert_eq!(uptime_str(7), "7s");
        assert_eq!(uptime_str(60), "1m");
    }
}
