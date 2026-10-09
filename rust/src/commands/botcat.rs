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
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "bot-info",
    aliases("bi")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let footer = crate::lang::get(&code, "say_footer_msg")
        .map(|s| {
            s.replace(
                "${interaction.user}",
                &format!("<@{}>", ctx.author().id.get()),
            )
        })
        .unwrap_or_default();
    ctx.say(format!("> {content}{footer}")).await?;
    Ok(())
}

/// Set the server language. Mirrors setserverlang.ts (writes GUILD.LANG).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "setlang",
    aliases("setsrvlang", "lang"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setlang(
    ctx: Ctx<'_>,
    #[description = "Server language"] lang: String,
) -> Result<(), anyhow::Error> {
    let Some(code) = parse_lang(lang.trim()) else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_invalid_language_supported_ar_eg_de_de_en_us_es_es_fr_fr_fr_me_it_it_jp_jp_pt_pt_ru_ru")
                .unwrap_or_else(|| "Invalid language. Supported: ar-EG, de-DE, en-US, es-ES, fr-FR, fr-ME, it-IT, jp-JP, pt-PT, ru-RU.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
        return Ok(());
    };
    crate::db::kv_set(&ctx.data().pool, &guild_id.to_string(), "GUILD.LANG", code).await?;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&lang_code, "setserverlang_panel_saved")
            .unwrap_or_else(|| format!("Language set to `{code}`.")),
    )
    .await?;
    Ok(())
}

/// Get the bot invite link. Mirrors invite.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    aliases("inviteme", "oauth")
)]
pub async fn invite(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let app_id = ctx.serenity_context().cache.current_user().id;
    let url = format!(
        "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
    );
    ctx.say(url).await?;
    Ok(())
}

/// Show all links about iHorizon. Mirrors link.ts.
#[poise::command(slash_command, prefix_command, category = "bot", aliases("link"))]
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
        custom(),
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

/// Custom the bot profile in your discord server.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "custom",
    subcommands("custom_name", "custom_avatar", "custom_banner", "custom_bio")
)]
pub async fn custom(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Container only (mirrors custom.ts); the paywall lives on the
    // bare parent, subcommands are exempt like checkCustomSdkGate.
    if !custom_sdk_gate(&ctx).await {
        return Ok(());
    }
    Ok(())
}

/// Set or reset the per-guild bot nickname.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "name",
    aliases("botname", "setname", "setbotname")
)]
pub async fn custom_name(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New bot name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_name_reset")
                .unwrap_or_else(|| "Bot name reset to default.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(name) = name.map(|n| n.trim().to_string()).filter(|n| !n.is_empty()) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_footername_not_found")
                .unwrap_or_else(|| "Provide a name, or use reset.".to_string()),
        )
        .await?;
        return Ok(());
    };
    if footer_name_too_long(&name) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_footername_footer_too_long_msg")
                .unwrap_or_else(|| {
                    "The bot footer is too long, it will be too ugly to display.".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    crate::db::kv_set(pool, &gid, BOT_NAME_KEY, &name).await?;
    if let Some(token) = crate::config::bot_token() {
        patch_guild_me(&token, guild_id.get(), serde_json::json!({ "nick": name })).await;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    ctx.say(
        crate::lang::get(&code, "custom_name_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${name}", &name)
            })
            .unwrap_or_else(|| format!("Bot name set to `{name}`.")),
    )
    .await?;
    Ok(())
}

/// Set or reset the per-guild bot avatar.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "avatar",
    aliases("botavatar", "setpic", "setavatar", "setpp")
)]
pub async fn custom_avatar(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New avatar image"] avatar: Option<serenity::Attachment>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_avatar_reset")
                .unwrap_or_else(|| "Bot avatar reset to default.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(avatar) = avatar else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_attach_an_image_or_use_reset")
                .unwrap_or_else(|| "Attach an image, or use reset.".to_string()),
        )
        .await?;
        return Ok(());
    };
    if !crate::funcs::is_valid_image_type(avatar.content_type.as_deref()) {
        return Ok(());
    }
    let Some(bytes) = download_bytes(&avatar.url).await else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_could_not_download_that_image")
                .unwrap_or_else(|| "Could not download that image.".to_string()),
        )
        .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    ctx.say(
        crate::lang::get(&code, "custom_avatar_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${x}", &avatar.url)
            })
            .unwrap_or_else(|| format!("Bot avatar updated from `{}`.", avatar.url)),
    )
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
    rename = "banner",
    aliases("botbanner", "setbotbanner", "setbanner")
)]
pub async fn custom_banner(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New banner image"] banner: Option<serenity::Attachment>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let token = crate::config::bot_token();
    if action.trim().eq_ignore_ascii_case("reset") {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "custom_banner_reset").unwrap_or_else(|| {
                "You have decided to reset the bot's banner on the server.".to_string()
            }),
        )
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_footeravatar_incorect").unwrap_or_else(
                || {
                    "The file does not correspond to an image. Please try again with an image."
                        .to_string()
                },
            ),
        )
        .await?;
        return Ok(());
    };
    let Some(bytes) = download_bytes(&banner.url).await else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_could_not_download_that_image")
                .unwrap_or_else(|| "Could not download that image.".to_string()),
        )
        .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    ctx.say(
        crate::lang::get(&code, "custom_banner_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${x}", &banner.url)
            })
            .unwrap_or_else(|| format!("Bot banner updated from `{}`.", banner.url)),
    )
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

/// Set or reset the per-guild bot bio (190 chars, 2 lines).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "bio",
    aliases("botbio", "setbotbio", "setbio")
)]
pub async fn custom_bio(
    ctx: Ctx<'_>,
    #[description = "set or reset"] action: String,
    #[description = "New bio"] bio: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let final_bio = if action.trim().eq_ignore_ascii_case("reset") {
        String::new()
    } else {
        sanitize_bio(&bio.unwrap_or_default())
    };
    if let Some(token) = crate::config::bot_token() {
        patch_guild_me(
            &token,
            guild_id.get(),
            serde_json::json!({ "bio": final_bio }),
        )
        .await;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let crown = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Crown")
        .await
        .unwrap_or_else(|| "👑".to_string());
    ctx.say(
        crate::lang::get(&code, "custom_desc_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.Crown}", &crown)
                    .replace("${desc}", &final_bio)
            })
            .unwrap_or_else(|| "Bot bio updated.".to_string()),
    )
    .await?;
    Ok(())
}

/// Sanitize bio like customProfileHelper (190 chars, first 2 lines).
pub fn sanitize_bio(bio: &str) -> String {
    let two: Vec<&str> = bio.lines().take(2).collect();
    two.join("\n").chars().take(190).collect()
}

/// Status embed. Mirrors bot !status.ts (CPU/memory/uptime/OS/version).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "status",
    aliases("server")
)]
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
    ($fn_name:ident, $sub:literal, $key:literal, $fallback:literal, $($alias:literal),+) => {
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

lore_cmd!(andru, "andru", "andru_message", "Andru");
lore_cmd!(ether, "ether", "ether_message", "Ether");
lore_cmd!(iris, "iris", "irisweb_message", "Iris");
lore_cmd!(
    kisakay,
    "kisakay",
    "kisakay_message",
    "Kisakay",
    "anaïs",
    "anais",
    "kisa"
);

/// Noaimie picture link. Mirrors !noaimie.ts (fixed asset URL).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "noaimie",
    aliases("noemie", "noémie")
)]
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
}
