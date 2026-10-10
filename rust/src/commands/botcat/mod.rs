// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/bot/* (botinfo, ping, help,
// say, setlang, invite, links).

use crate::bot::{Ctx, Data};

use poise::serenity_prelude as serenity;

pub use super::shared::{
    bot_footer_name, download_bytes, footer_icon_bytes, BOT_NAME_KEY, BOT_PFP_KEY,
};

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

pub fn bot_commands() -> Vec<poise::Command<Data, anyhow::Error>> {
    vec![
        botinfo::botinfo_full(),
        ping::ping(),
        help::help(),
        say::say(),
        setserverlang::setlang(),
        invite::invite(),
        link::links(),
        custom::custom(),
    ]
}

/// TS rejects `name.length >= 32` (UTF-16 units); char count is the
/// closest offline equivalent.
pub fn footer_name_too_long(name: &str) -> bool {
    name.chars().count() >= 32
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

/// Custom-profile SKU gating the `custom` parent in production.
/// Mirrors checkCustomSdkGate/hasGuildSku in commandExecutor.ts.
pub const CUSTOM_SKU_ID: u64 = 1512856902919258384;

/// Pure entitlement match. Mirrors the hasGuildSku `.some()`:
/// same guild + same sku + not deleted.
pub fn entitlement_grants(entitlements: &[(u64, u64, bool)], guild_id: u64, sku_id: u64) -> bool {
    entitlements
        .iter()
        .any(|(g, s, deleted)| *g == guild_id && *s == sku_id && !deleted)
}

/// Live entitlement lookup (best-effort false, like the TS try/catch
/// around client.rest.get entitlements).
pub async fn has_guild_sku(http: &std::sync::Arc<serenity::Http>, guild_id: u64) -> bool {
    // No exclude_ended: TS grants on !deleted alone (expired rows
    // still count there).
    let list = http
        .get_entitlements(
            None,
            Some(vec![serenity::SkuId::new(CUSTOM_SKU_ID)]),
            None,
            None,
            Some(100),
            Some(serenity::GuildId::new(guild_id)),
            None,
        )
        .await
        .unwrap_or_default();
    entitlement_grants(
        &list
            .iter()
            .map(|e| {
                (
                    e.guild_id.map(|g| g.get()).unwrap_or(0),
                    e.sku_id.get(),
                    e.deleted,
                )
            })
            .collect::<Vec<_>>(),
        guild_id,
        CUSTOM_SKU_ID,
    )
}

/// Paywall for the bare `custom` parent. Mirrors checkCustomSdkGate:
/// non-production passes, bot owners pass, entitled guilds pass;
/// otherwise the Boost_Gem store line + Red Pleading upsell embed
/// goes out and the command stops.
pub async fn custom_sdk_gate(ctx: &Ctx<'_>) -> bool {
    if !crate::config::is_production_env() {
        return true;
    }
    if crate::funcs::is_bot_owner(ctx.author().id.get(), &ctx.data().config.owners) {
        return true;
    }
    let gid = ctx.guild_id().map(|g| g.get());
    if let Some(gid) = gid {
        if has_guild_sku(&ctx.serenity_context().http, gid).await {
            return true;
        }
    }
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, gid).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let store = "https://discord.com/discovery/applications/945202900907470899/store";
    let content =
        match crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Boost_Gem").await {
            Some(markup) => format!("{markup} {store}"),
            None => store.to_string(),
        };
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::RED)
        .title(t("custom_sdk_only_title"))
        .description(t("custom_sdk_only_description"));
    let mut reply = poise::CreateReply::default().content(content);
    if let Some(bytes) = download_bytes(&crate::funcs::expression_url("Pleading")).await {
        embed = embed.thumbnail("attachment://pleading.png");
        reply = reply
            .embed(embed)
            .attachment(serenity::CreateAttachment::bytes(bytes, "pleading.png"));
    } else {
        reply = reply.embed(embed);
    }
    let _ = ctx.send(reply).await;
    false
}

/// Global application object URL. Mirrors the module-level
/// fetch in retrieveMyself.ts (`GET /oauth2/applications/@me`).
pub const APPLICATION_URL: &str = "https://discord.com/api/v10/oauth2/applications/@me";

/// The fetch URL for the global application object (pure, offline).
pub fn application_url() -> String {
    APPLICATION_URL.to_string()
}

/// Fetch the global application object. Mirrors the module-level
/// fetch in retrieveMyself.ts (`GET /oauth2/applications/@me`).
pub async fn fetch_application(token: &str) -> Option<serde_json::Value> {
    reqwest::Client::new()
        .get(application_url())
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

/// Bot description from the application object. Mirrors
/// retrieveBio() (`app?.["description"]`, null when missing).
pub fn app_bio(app: &serde_json::Value) -> Option<String> {
    app.get("description")?.as_str().map(|s| s.to_string())
}

/// Full banner CDN URL for the application object, or `None` when the
/// app has no bot banner. Pure combination of the two retrieveMyself
/// builders (`retrieveBanner()` needs the running bot id + the hash).
pub fn app_banner_for(app: &serde_json::Value, bot_id: u64) -> Option<String> {
    app_bot_banner_hash(app).map(|hash| app_banner_url(bot_id, &hash))
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

/// Sanitize bio like customProfileHelper (190 chars, first 2 lines).
pub fn sanitize_bio(bio: &str) -> String {
    let two: Vec<&str> = bio.lines().take(2).collect();
    two.join("\n").chars().take(190).collect()
}

/// App-emoji name for the `OS` status field. Mirrors getOS.ts
/// (Tux/Finder/Win10/Win11, `None` on unmapped platforms).
pub fn os_emoji_name() -> Option<&'static str> {
    match std::env::consts::OS {
        "linux" => Some("Tux"),
        "macos" => Some("Finder"),
        "windows" => Some("Win10"),
        _ => None,
    }
}

/// Status embed field name with its app-emoji prefix. Mirrors
/// status.ts `` `${emoji} OS` `` / `` `${Logo} Bot Version` ``
/// (plain base name when the emoji markup is unavailable).
pub fn prefixed_field_name(emoji_markup: Option<&str>, base: &str) -> String {
    match emoji_markup {
        Some(markup) => format!("{markup} {base}"),
        None => base.to_string(),
    }
}

/// `${x}` value for the avatar/banner set replies. Mirrors
/// `!avatar.ts` / `!banner.ts` reading the URL off the guild member
/// after the PATCH; falls back to the uploaded attachment URL when
/// the member fetch yields nothing.
pub fn post_change_display(member_url: Option<&str>, attachment_url: &str) -> String {
    member_url.unwrap_or(attachment_url).to_string()
}

macro_rules! lore_cmd {
    ($fn_name:ident, $sub:literal, $key:literal, $fallback:literal) => {
/// Lore contributor info command.
        #[poise::command(slash_command,
    prefix_command, category = "bot", rename = $sub)]
        pub async fn $fn_name(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(crate::lang::get(&code, $key).unwrap_or_else(|| $fallback.to_string()))
                .await?;
            Ok(())
        }
    };
    ($fn_name:ident, $sub:literal, $key:literal, $fallback:literal, $($alias:literal),+) => {
/// Lore contributor info command.
        #[poise::command(
            slash_command,
    prefix_command,
            category = "bot",
            rename = $sub,
            aliases($($alias),*)
        )]
        pub async fn $fn_name(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(crate::lang::get(&code, $key).unwrap_or_else(|| $fallback.to_string()))
                .await?;
            Ok(())
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::shared::footer_page_text;

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
    fn bio_sanitizes_to_190_chars_2_lines() {
        assert_eq!(sanitize_bio("a\nb\nc"), "a\nb");
        assert_eq!(sanitize_bio(&"x".repeat(300)).chars().count(), 190);
        assert_eq!(sanitize_bio(""), "");
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
    fn entitlement_grants_matches_ts_some() {
        let sku = CUSTOM_SKU_ID;
        assert_eq!(CUSTOM_SKU_ID, 1512856902919258384);
        assert!(entitlement_grants(&[(7, sku, false)], 7, sku));
        assert!(!entitlement_grants(&[(7, sku, true)], 7, sku));
        assert!(!entitlement_grants(&[(8, sku, false)], 7, sku));
        assert!(!entitlement_grants(&[(7, sku + 1, false)], 7, sku));
        assert!(!entitlement_grants(&[], 7, sku));
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

    #[test]
    fn retrieve_myself_builders_match_ts() {
        assert_eq!(
            application_url(),
            "https://discord.com/api/v10/oauth2/applications/@me"
        );
        let app = serde_json::json!({
            "description": "hello",
            "bot": {"banner": "abc"},
        });
        assert_eq!(app_bio(&app).as_deref(), Some("hello"));
        assert_eq!(
            app_banner_for(&app, 9).as_deref(),
            Some("https://cdn.discordapp.com/banners/9/abc?size=1024")
        );
        let no_desc = serde_json::json!({"bot": {"banner": "abc"}});
        assert_eq!(app_bio(&no_desc), None);
        let no_banner = serde_json::json!({"description": "hello", "bot": {}});
        assert_eq!(app_banner_for(&no_banner, 9), None);
    }

    #[test]
    fn post_change_display_prefers_guild_member_url() {
        assert_eq!(
            post_change_display(Some("https://cdn/member-avatar"), "https://cdn/attachment"),
            "https://cdn/member-avatar"
        );
        assert_eq!(
            post_change_display(None, "https://cdn/attachment"),
            "https://cdn/attachment"
        );
    }

    #[test]
    fn os_emoji_name_matches_get_os_platforms() {
        assert_eq!(
            os_emoji_name(),
            match std::env::consts::OS {
                "linux" => Some("Tux"),
                "macos" => Some("Finder"),
                "windows" => Some("Win10"),
                _ => None,
            }
        );
    }

    #[test]
    fn prefixed_field_name_mirrors_ts_emoji_prefix() {
        assert_eq!(prefixed_field_name(Some("<:Tux:1>"), "OS"), "<:Tux:1> OS");
        assert_eq!(prefixed_field_name(None, "OS"), "OS");
    }
}

pub mod core;
pub mod custom;
pub mod lore;
pub mod noaimie;
pub mod status;

pub mod andru;
pub mod avatar;
pub mod banner;
pub mod bio;
pub mod bot;
pub mod botinfo;
pub mod ether;
pub mod help;
pub mod invite;
pub mod iris;
pub mod kisakay;
pub mod link;
pub mod name;
pub mod ping;
pub mod say;
pub mod setserverlang;

/// Old grouped paths (`botcat::core::*`, ...) are thin re-export shims.
/// `botcat::main::*` re-exports every command like other categories.
#[allow(unused_imports)]
pub mod main {
    pub use super::andru::*;
    pub use super::avatar::*;
    pub use super::banner::*;
    pub use super::bio::*;
    pub use super::bot::*;
    pub use super::botinfo::*;
    pub use super::core::*;
    pub use super::custom::*;
    pub use super::ether::*;
    pub use super::help::*;
    pub use super::invite::*;
    pub use super::iris::*;
    pub use super::kisakay::*;
    pub use super::link::*;
    pub use super::lore::*;
    pub use super::name::*;
    pub use super::noaimie::*;
    pub use super::ping::*;
    pub use super::say::*;
    pub use super::setserverlang::*;
    pub use super::status::*;
    pub use super::*;
}
