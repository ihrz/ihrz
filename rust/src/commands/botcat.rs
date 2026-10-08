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
    vec![
        botinfo_full(),
        say(),
        setlang(),
        invite(),
        links(),
        bot_custom_name(),
        bot_custom_avatar(),
        bot_custom_banner(),
    ]
}

/// Per-guild bot profile store keys. Mirrors `${guildId}.BOT.botName`
/// / `BOT.botPFP` in bot/custom/!name.ts and !avatar.ts.
pub const BOT_NAME_KEY: &str = "BOT.botName";
pub const BOT_PFP_KEY: &str = "BOT.botPFP";

/// TS rejects `name.length >= 32` (UTF-16 units); char count is the
/// closest offline equivalent.
pub fn footer_name_too_long(name: &str) -> bool {
    name.chars().count() >= 32
}

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

/// PATCH /guilds/{id}/members/@me endpoint. Mirrors
/// customProfileHelper.ts (Bot token, audit-log reason).
pub fn guild_me_url(guild_id: u64) -> String {
    format!("https://discord.com/api/v10/guilds/{guild_id}/members/@me")
}

/// Apply a nick and/or avatar change to the guild member. Returns true
/// on HTTP 200. Network only, no new infra (plain Discord API).
pub async fn patch_guild_me(token: &str, guild_id: u64, body: serde_json::Value) -> bool {
    reqwest::Client::new()
        .patch(guild_me_url(guild_id))
        .header("Authorization", format!("Bot {token}"))
        .header("X-Audit-Log-Reason", "OWNIHRZ INSIDE IHORIZON")
        .json(&body)
        .send()
        .await
        .map(|r| r.status().as_u16() == 200)
        .unwrap_or(false)
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

/// Set or reset the per-guild bot nickname.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "bot-custom-name"
)]
pub async fn bot_custom_name(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New bot name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command must be used in a server.").await?;
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    if action.trim().eq_ignore_ascii_case("reset") {
        crate::db::kv_del(pool, &gid, BOT_NAME_KEY).await?;
        let fallback = ctx.cache().current_user().display_name().to_string();
        if let Some(token) = crate::config::bot_token() {
            patch_guild_me(
                &token,
                guild_id.get(),
                serde_json::json!({ "nick": fallback }),
            )
            .await;
        }
        ctx.say("Bot name reset to default.").await?;
        return Ok(());
    }
    let Some(name) = name.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()) else {
        ctx.say("Provide a name, or use reset.").await?;
        return Ok(());
    };
    if footer_name_too_long(&name) {
        ctx.say("The bot footer is too long, it will be too ugly to display.")
            .await?;
        return Ok(());
    }
    crate::db::kv_set(pool, &gid, BOT_NAME_KEY, &name).await?;
    if let Some(token) = crate::config::bot_token() {
        patch_guild_me(&token, guild_id.get(), serde_json::json!({ "nick": name })).await;
    }
    ctx.say(format!("Bot name set to `{name}`.")).await?;
    Ok(())
}

/// Set or reset the per-guild bot avatar.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "bot-custom-avatar"
)]
pub async fn bot_custom_avatar(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New avatar image"] avatar: Option<serenity::Attachment>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command must be used in a server.").await?;
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let token = crate::config::bot_token();
    if action.trim().eq_ignore_ascii_case("reset") {
        crate::db::kv_del(pool, &gid, BOT_PFP_KEY).await?;
        if let Some(token) = token {
            let face = ctx.cache().current_user().face();
            if let Some(bytes) = download_bytes(&face).await {
                patch_guild_me(
                    &token,
                    guild_id.get(),
                    serde_json::json!({
                        "avatar": format!(
                            "data:image/png;base64,{}",
                            crate::emojis::base64_encode(&bytes)
                        )
                    }),
                )
                .await;
            }
        }
        ctx.say("Bot avatar reset to default.").await?;
        return Ok(());
    }
    let Some(avatar) = avatar else {
        ctx.say("Attach an image, or use reset.").await?;
        return Ok(());
    };
    if !crate::funcs::is_valid_image_type(avatar.content_type.as_deref()) {
        return Ok(());
    }
    let Some(bytes) = download_bytes(&avatar.url).await else {
        ctx.say("Could not download that image.").await?;
        return Ok(());
    };
    let b64 = crate::emojis::base64_encode(&bytes);
    if let Some(token) = token {
        patch_guild_me(
            &token,
            guild_id.get(),
            serde_json::json!({ "avatar": format!("data:image/png;base64,{b64}") }),
        )
        .await;
    }
    crate::db::kv_set(pool, &gid, BOT_PFP_KEY, &b64).await?;
    ctx.say(format!("Bot avatar updated from `{}`.", avatar.url))
        .await?;
    Ok(())
}

/// Fetch the global application object. Mirrors the module-level
/// fetch in retrieveMyself.ts (`GET /oauth2/applications/@me`).
pub async fn fetch_application(token: &str) -> Option<serde_json::Value> {
    reqwest::Client::new()
        .get("https://discord.com/api/v10/oauth2/applications/@me")
        .header("Authorization", format!("Bot {token}"))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()
}

/// Global bot banner CDN URL. Mirrors retrieveBanner()
/// (`cdn.../banners/{bot_id}/{banner_hash}?size=1024`).
pub fn app_banner_url(bot_id: u64, banner_hash: &str) -> String {
    format!("https://cdn.discordapp.com/banners/{bot_id}/{banner_hash}?size=1024")
}

/// Extract the bot banner hash from the application object
/// (`app["bot"]["banner"]`, mirrors retrieveMyself.ts).
pub fn app_bot_banner_hash(app: &serde_json::Value) -> Option<String> {
    app.get("bot")?
        .get("banner")?
        .as_str()
        .map(|s| s.to_string())
}

/// Set or reset the per-guild bot banner.
// Mirrors HybridCommands/bot/custom/!banner.ts (no DB key; set/reset
// PATCH a `data:image/jpeg;base64,...` data URI, reset restores the
// global banner, anything else replies the incorrect-file message).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "bot-custom-banner"
)]
pub async fn bot_custom_banner(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New banner image"] banner: Option<serenity::Attachment>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command must be used in a server.").await?;
        return Ok(());
    };
    let token = crate::config::bot_token();
    if action.trim().eq_ignore_ascii_case("reset") {
        ctx.say("You have decided to reset the bot's banner on the server.")
            .await?;
        if let Some(token) = token {
            let bot_id = ctx.cache().current_user().id.get();
            if let Some(app) = fetch_application(&token).await {
                if let Some(hash) = app_bot_banner_hash(&app) {
                    if let Some(bytes) = download_bytes(&app_banner_url(bot_id, &hash)).await {
                        patch_guild_me(
                            &token,
                            guild_id.get(),
                            serde_json::json!({
                                "banner": format!(
                                    "data:image/jpeg;base64,{}",
                                    crate::emojis::base64_encode(&bytes)
                                )
                            }),
                        )
                        .await;
                    }
                }
            }
        }
        return Ok(());
    }
    let Some(banner) =
        banner.filter(|b| crate::funcs::is_valid_image_type(b.content_type.as_deref()))
    else {
        ctx.say("The file does not correspond to an image. Please try again with an image.")
            .await?;
        return Ok(());
    };
    let Some(bytes) = download_bytes(&banner.url).await else {
        ctx.say("Could not download that image.").await?;
        return Ok(());
    };
    if let Some(token) = token {
        patch_guild_me(
            &token,
            guild_id.get(),
            serde_json::json!({
                "banner": format!(
                    "data:image/jpeg;base64,{}",
                    crate::emojis::base64_encode(&bytes)
                )
            }),
        )
        .await;
    }
    ctx.say(format!("Bot banner updated from `{}`.", banner.url))
        .await?;
    Ok(())
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

    #[test]
    fn bot_footer_name_defaults_and_trims() {
        assert_eq!(bot_footer_name(None), "iHorizon");
        assert_eq!(bot_footer_name(Some("")), "iHorizon");
        assert_eq!(bot_footer_name(Some("  ")), "iHorizon");
        assert_eq!(bot_footer_name(Some(" MyBot ")), "MyBot");
    }

    #[test]
    fn footer_name_length_gate_matches_ts() {
        assert!(!footer_name_too_long(&"a".repeat(31)));
        assert!(footer_name_too_long(&"a".repeat(32)));
    }

    #[test]
    fn footer_page_text_formats() {
        assert_eq!(footer_page_text("MyBot", "Page", 2, 5), "MyBot • Page 2/5");
    }

    #[test]
    fn footer_icon_bytes_decodes_stored_pfp() {
        let raw = b"fakepngbytes";
        let stored = crate::emojis::base64_encode(raw);
        assert_eq!(
            footer_icon_bytes(Some(&stored)).as_deref(),
            Some(raw.as_slice())
        );
        assert_eq!(footer_icon_bytes(None), None);
        assert_eq!(footer_icon_bytes(Some("!!!")), None);
    }

    #[test]
    fn guild_me_url_targets_members_me() {
        assert_eq!(
            guild_me_url(123),
            "https://discord.com/api/v10/guilds/123/members/@me"
        );
    }

    #[test]
    fn app_banner_url_and_hash_mirror_retrieve_myself() {
        assert_eq!(
            app_banner_url(9, "abc"),
            "https://cdn.discordapp.com/banners/9/abc?size=1024"
        );
        let app = serde_json::json!({"bot": {"banner": "abc"}});
        assert_eq!(app_bot_banner_hash(&app).as_deref(), Some("abc"));
        let missing = serde_json::json!({"bot": {}});
        assert_eq!(app_bot_banner_hash(&missing), None);
    }
}
