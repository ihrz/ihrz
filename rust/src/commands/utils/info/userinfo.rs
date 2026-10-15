use super::*;
use ::serenity::model::user::OnlineStatus;

/// Get information about a user!
// Mirrors utils !userinfo.ts (best-effort).
pub async fn run_userinfo(
    ctx: Ctx<'_>,
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    // Prefix username fallback: mirrors the last branch of `method.user`
    // in src/core/functions/method.ts (exact `username === args[0]`
    // guild-cache lookup). Poise already parses prefix mentions and IDs
    // into `user`, so only the username branch needs a fallback here.
    let fuzzy = if user.is_none() {
        prefix_username_lookup(&ctx)
    } else {
        None
    };
    let u = user
        .as_ref()
        .or(fuzzy.as_ref())
        .unwrap_or_else(|| ctx.author());
    // Loading ack first, mirroring the `Discord_Loading` send before
    // the slow lookups in !userinfo.ts:266 (donor APIs, banner REST and
    // avatar downloads below can outlast the 3s interaction window, so
    // the final `ctx.send` expired with Unknown interaction). Edited
    // with the full reply below, like `originalInteraction.edit` in
    // !userinfo.ts:403.
    let loading = crate::emojis::app_emoji_markup(ctx.http(), "Discord_Loading")
        .await
        .unwrap_or_else(|| "...".to_string());
    let progress = ctx.say(loading).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let notfound = crate::lang::get(&code, "userinfo_var_notfound")
        .unwrap_or_else(|| "`Not found`".to_string());
    // Banner hash up front: TS fetches the REST user (banner) at the top
    // of sendMessage in !userinfo.ts:276-291, before badge assembly.
    let animated_avatar = u
        .avatar
        .as_ref()
        .map(|h| h.to_string().starts_with("a_"))
        .unwrap_or(false);
    let token = crate::config::bot_token().unwrap_or_default();
    let banner_hash = super::fetch_user_banner_hash(&token, u.id.get()).await;
    // Nitro status mirrors GetNitro in !userinfo.ts:420-472: bots get
    // ("",""), otherwise the HorizonGateway premium_type wins
    // (1 Classic, 2 Boost, 3 Basic), then animated avatar -> Classic,
    // then banner -> Boost.
    let nitro_input = if u.bot {
        -1
    } else {
        nitro_input(
            gateway_premium_type(&ctx.data().config, u.id.get()).await,
            animated_avatar,
            banner_hash.is_some(),
        )
    };
    let (nitro_badge, nitro_type) = match nitro_input {
        1 => (
            app_badge(ctx.http(), "Discord_Nitro_Badge", "✨").await,
            "Nitro Classic".to_string(),
        ),
        2 => (
            format!(
                "{}{}",
                app_badge(ctx.http(), "Discord_Nitro_Badge", "✨").await,
                app_badge(ctx.http(), "Discord_Nitro_Boost_Bad", "🚀").await
            ),
            "Nitro Boost".to_string(),
        ),
        3 => (
            app_badge(ctx.http(), "Discord_Nitro_Badge", "✨").await,
            "Nitro Basic".to_string(),
        ),
        _ => (String::new(), String::new()),
    };
    // Flag badges recomposed as app-emoji markup with unicode fallbacks,
    // mirroring the `badges` map + getBadges in !userinfo.ts:65-175.
    // (bit, emoji name, fallback). Note the TS quirk at :107-110 where
    // House_Balance reuses the Brilliance emoji.
    const FLAG_BADGES: &[(u32, &str, &str)] = &[
        (1, "Discord_Staff_Badge", "🧑‍💼"),
        (2, "Partne_Badger", "🤝"),
        (4, "HypeSquad_Event_Badge", "🎉"),
        (8, "Bug_Hunter1_Badge", "🐛"),
        (64, "HypeS_Bravery_Bad", "💜"),
        (128, "HypeS_Brillance_Bad", "🧡"),
        (256, "HypeS_Brillance_Bad", "💚"),
        (512, "Early_Supporter_Badge", "⭐"),
        (16384, "Bug_Hunter2_Badge", "🐞"),
        (131072, "ECBDD_Badge", "🔧"),
        (262144, "Discord_Moderators_Badg", "🛡️"),
        (4194304, "Active_Dev_Badge", "💻"),
    ];
    let bits = u.public_flags.map(|fl| fl.bits()).unwrap_or(0);
    let mut badges = String::new();
    for (value, name, fallback) in FLAG_BADGES {
        if bits & value == *value {
            badges.push_str(&app_badge(ctx.http(), name, fallback).await);
        }
    }
    // Verified-bot mark mirrors the Verified_App entry in !userinfo.ts:119-122
    // (three app emojis concatenated, unicode fallback when unsynced).
    if bits & (1 << 16) == (1 << 16) {
        let mut combo = String::new();
        for part in ["Verified_App_1", "Verified_App_2", "Verified_App_3"] {
            combo.push_str(&app_badge(ctx.http(), part, "").await);
        }
        if combo.is_empty() {
            combo.push_str("✅");
        }
        badges.push_str(&combo);
    }
    badges.push_str(&nitro_badge);
    // Bot app marker mirrors `member.bot && !badges.includes("Verified_App")`
    // in !userinfo.ts:297-298.
    if u.bot && bits & (1 << 16) != (1 << 16) {
        let mut app = format!(
            "{}{}",
            app_badge(ctx.http(), "App_1", "").await,
            app_badge(ctx.http(), "App_2", "").await
        );
        if app.is_empty() {
            app.push_str("🤖");
        }
        badges.push_str(&app);
    }
    // Self badges mirror getSelfBadges in !userinfo.ts:246-252 (the bot's
    // own application flags: Uses_Automod 1<<6, Slash_Bot 524288).
    if u.id == ctx.serenity_context().cache.current_user().id {
        let app_bits: u64 = ctx
            .http()
            .get_current_application_info()
            .await
            .ok()
            .and_then(|i| i.flags)
            .map(|fl| fl.bits())
            .unwrap_or(0);
        if app_bits & (1 << 6) != 0 {
            badges.push_str(&app_badge(ctx.http(), "Uses_Automod_Badge", "🛠️").await);
        }
        if app_bits & 524288 != 0 {
            badges.push_str(&app_badge(ctx.http(), "Slash_Bot_Badge", "⚡").await);
        }
    }
    // Platform presence badges mirror getPlatformBadges in !userinfo.ts:177-192
    // (presence is reachable from the guild cache). Serenity's ClientStatus
    // only carries desktop/mobile/web — embedded/vr have no equivalent and
    // are dropped. Offline/invisible map to nothing, like the TS lookup miss.
    let presence = ctx.guild_id().and_then(|gid| {
        ctx.serenity_context()
            .cache
            .guild(gid)
            .and_then(|g| g.presences.get(&u.id).cloned())
    });
    if let Some(client_status) = presence.as_ref().and_then(|p| p.client_status.as_ref()) {
        for (slot, platform) in [
            (&client_status.desktop, "Desktop"),
            (&client_status.mobile, "Mobile"),
            (&client_status.web, "Web"),
        ] {
            let state = match slot {
                Some(OnlineStatus::Online) => Some("Online"),
                Some(OnlineStatus::Idle) => Some("Idle"),
                Some(OnlineStatus::DoNotDisturb) => Some("Dnd"),
                _ => None,
            };
            if let Some(state) = state {
                badges.push_str(&app_badge(ctx.http(), &format!("{platform}_{state}"), "").await);
            }
        }
    }
    // Server badges mirror getServerBadges in !userinfo.ts:194-207. The
    // booster line uses the cached member's boost start (`premium_since`,
    // the serenity equivalent of holding the guild premium-subscriber role);
    // the Crown marks the guild owner.
    let cached_member = ctx.guild_id().and_then(|gid| {
        ctx.serenity_context()
            .cache
            .guild(gid)
            .and_then(|g| g.members.get(&u.id).cloned())
    });
    if cached_member
        .as_ref()
        .and_then(|m| m.premium_since)
        .is_some()
    {
        badges.push_str(&app_badge(ctx.http(), "Server_Booster", "🚀").await);
    }
    if ctx
        .guild_id()
        .and_then(|gid| {
            ctx.serenity_context()
                .cache
                .guild(gid)
                .map(|g| g.owner_id == u.id)
        })
        .unwrap_or(false)
    {
        badges.push_str(&app_badge(ctx.http(), "Crown", "👑").await);
    }
    // Donor badges mirror getVencordDonator/getEquiboAndOthersData in
    // !userinfo.ts:209-242 (TS 833 ms timeouts, failures yield nothing).
    let uid_str = u.id.get().to_string();
    if vencord_donator(&uid_str).await {
        badges.push_str(&app_badge(ctx.http(), "Vencord_Donator", "💠").await);
    }
    if equicord_donator(&uid_str).await {
        badges.push_str(&app_badge(ctx.http(), "Equicord_Donator", "🌀").await);
    }
    let badges = if badges.is_empty() {
        notfound.clone()
    } else {
        badges
    };
    // Field 5 mirrors !userinfo.ts:351-366: the nitro type, else the
    // `[notfound](oauth2-link)` fallback when a public HorizonGateway is
    // configured, else plain notfound.
    let nitro = if nitro_type.is_empty() {
        let public = ctx.data().config.gateway_public().unwrap_or_default();
        if public.starts_with("http") {
            let bot_id = ctx.serenity_context().cache.current_user().id.get();
            format!(
                "[{notfound}](https://discord.com/oauth2/authorize?client_id={bot_id}&scope=identify)"
            )
        } else {
            notfound.clone()
        }
    } else {
        nitro_type
    };
    let display = u.global_name.clone().unwrap_or_else(|| u.name.clone());
    let created = u.created_at().unix_timestamp();
    let guild_id_opt = ctx.guild_id().map(|g| g.get());
    let roles = guild_id_opt
        .and_then(|gid| {
            ctx.serenity_context()
                .cache
                .guild(gid)
                .and_then(|g| g.members.get(&u.id).map(|m| m.roles.clone()))
        })
        .map(|roles| {
            // Mirrors discord.js GuildMemberRoleManager.cache
            // (GuildMemberRoleManager.js): @everyone first — rendered as
            // the literal `@everyone` text like Role.toString (prod shows
            // `@everyone`, not `<@&guildId>`) — then the member's roles,
            // capped by the TS `.slice(0, 37)`.
            let mut mentions = vec!["@everyone".to_string()];
            mentions.extend(roles.iter().take(36).map(|r| format!("<@&{}>", r.get())));
            mentions.join("")
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            crate::lang::get(&code, "var_none").unwrap_or_else(|| "None".to_string())
        });
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x0014a8)
        .timestamp(serenity::Timestamp::now())
        .field(f("userinfo_embed_fields_1_name"), badges, true)
        .field(f("userinfo_embed_fields_2_name"), u.name.clone(), true)
        .field(f("userinfo_embed_fields_3_name"), display, true)
        .field(
            f("userinfo_embed_fields_4_name"),
            format!("<t:{created}:D>"),
            true,
        )
        .field(f("userinfo_embed_fields_5_name"), nitro, true)
        .field(f("var_roles"), roles, false);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let face_url = u.face();
    let face_bytes = crate::commands::shared::download_bytes(&face_url).await;
    if face_bytes.is_some() {
        embed = embed.thumbnail("attachment://user_icon.gif");
    } else {
        embed = embed.thumbnail(face_url);
    }
    let mut banner_bytes: Option<Vec<u8>> = None;
    if let Some(hash) = banner_hash.as_deref() {
        let ext = if hash.starts_with("a_") { "gif" } else { "png" };
        let url = format!(
            "https://cdn.discordapp.com/banners/{}/{}.{ext}?size=1024",
            u.id.get(),
            hash
        );
        banner_bytes = crate::commands::shared::download_bytes(&url).await;
        if banner_bytes.is_some() {
            embed = embed.image("attachment://user_banner.gif");
        }
    }
    // Content cleared like `originalInteraction.edit({ content: null, … })`
    // in !userinfo.ts:403 (the loading ack above must not linger).
    let mut reply = poise::CreateReply::default()
        .content("")
        .embed(embed)
        .components(vec![serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new_link(format!(
                "https://discordapp.com/users/{}",
                u.id.get()
            ))
            .label(f("userinfo_button_label")),
        ])]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "user_icon.gif"));
    }
    if let Some(bytes) = banner_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "user_banner.gif"));
    }
    progress.edit(ctx, reply).await?;
    Ok(())
}

/// Get information about a user!
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "userinfo",
    aliases("ui"),
    description_localized("fr", "Obtenir des informations sur un utilisateur"),
    description_localized("ja", "ユーザーの情報を取得！"),
    description_localized("ru", "Получить информацию о пользователе!"),
    description_localized("es-ES", "Obtener información sobre un usuario!")
)]
pub async fn userinfo(
    ctx: Ctx<'_>,
    #[description_localized("fr", "utilisateur que vous souhaitez rechercher")]
    #[description_localized("ja", "検索したいユーザー")]
    #[description_localized("ru", "пользователь для поиска")]
    #[description_localized("es-ES", "usuario que quieres buscar")]
    #[description = "user you want to lookup"]
    user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    run_userinfo(ctx, user).await
}

/// App-emoji markup with a unicode fallback. Mirrors the
/// `client.iHorizon_Emojis.<Name>` namespace in !userinfo.ts: badge slots
/// render the synced app emoji when available, else the fallback ("" skips
/// the slot, like the TS lookup miss in getPlatformBadges).
async fn app_badge(http: &poise::serenity_prelude::Http, name: &str, fallback: &str) -> String {
    crate::emojis::app_emoji_markup(http, name)
        .await
        .unwrap_or_else(|| fallback.to_string())
}

/// Nitro input precedence. Mirrors the `if (!input)` leg of GetNitro in
/// !userinfo.ts:440-448: animated avatar (Classic) BEFORE banner (Boost).
/// A gateway premium_type always wins when present (Some).
pub fn nitro_input(premium: Option<i64>, animated_avatar: bool, has_banner: bool) -> i64 {
    match premium {
        Some(v) => v,
        None if animated_avatar => 1,
        None if has_banner => 2,
        None => 0,
    }
}

/// HorizonGateway premium lookup. Mirrors the gateway leg of GetNitro in
/// !userinfo.ts:427-438 (POST UserInfo {userId, adminKey} -> premium_type).
/// None when unconfigured (TS `HorizonGateway?.startsWith("http")` gate),
/// or on any transport/parse failure (then the avatar/banner heuristic in
/// `nitro_input` applies, like `!input` in TS).
async fn gateway_premium_type(config: &crate::config::Config, user_id: u64) -> Option<i64> {
    if !config
        .gateway_public()
        .unwrap_or_default()
        .starts_with("http")
    {
        return None;
    }
    let base = config.gateway_internal()?;
    let url = crate::funcs::gateway_internal_url(
        Some(base.as_str()),
        None,
        crate::funcs::GatewayMethod::UserInfo,
    )
    .ok()?;
    let token = crate::config::api_token().unwrap_or_default();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .ok()?;
    let data: serde_json::Value = client
        .post(url)
        .json(&serde_json::json!({"userId": user_id, "adminKey": token}))
        .send()
        .await
        .ok()?
        .error_for_status()
        .ok()?
        .json()
        .await
        .ok()?;
    data.get("premium_type").and_then(|v| v.as_i64())
}

/// Vencord donor check. Mirrors getVencordDonator in !userinfo.ts
/// (GET badges.json with 833 ms timeout; best-effort, false on any failure).
async fn vencord_donator(user_id: &str) -> bool {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(833))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };
    let data: serde_json::Value = match client
        .get("https://badges.vencord.dev/badges.json")
        .send()
        .await
    {
        Ok(r) => match r.error_for_status() {
            Ok(ok) => match ok.json().await {
                Ok(v) => v,
                Err(_) => return false,
            },
            Err(_) => return false,
        },
        Err(_) => return false,
    };
    data.get(user_id).is_some_and(|v| !v.is_null())
}

/// Equicord donor check. Mirrors getEquiboAndOthersData in !userinfo.ts
/// (GET badges.equicord.org/{userId} with 833 ms timeout; true when any
/// badge link points at the badge.equicord.org host; best-effort).
async fn equicord_donator(user_id: &str) -> bool {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(833))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };
    let data: serde_json::Value = match client
        .get(format!("https://badges.equicord.org/{user_id}"))
        .send()
        .await
    {
        Ok(r) => match r.error_for_status() {
            Ok(ok) => match ok.json().await {
                Ok(v) => v,
                Err(_) => return false,
            },
            Err(_) => return false,
        },
        Err(_) => return false,
    };
    let Some(list) = data.get("badges").and_then(|b| b.as_array()) else {
        return false;
    };
    list.iter().any(|x| {
        x.get("badge")
            .and_then(|b| b.as_str())
            .is_some_and(|link| url_host(link) == Some("badge.equicord.org".to_string()))
    })
}

/// Prefix-only exact-username lookup. Mirrors the `username === args[0]`
/// branch of `method.user` (src/core/functions/method.ts): poise leaves
/// the unparsed token in `PrefixContext.args`, which is matched against
/// the cached guild members. None on slash invocations or empty args.
fn prefix_username_lookup(ctx: &Ctx<'_>) -> Option<poise::serenity_prelude::User> {
    let poise::Context::Prefix(prefix) = ctx else {
        return None;
    };
    let name = prefix.args.split_whitespace().next()?;
    let gid = ctx.guild_id()?;
    ctx.serenity_context().cache.guild(gid).and_then(|g| {
        g.members
            .values()
            .find(|m| m.user.name == name)
            .map(|m| m.user.clone())
    })
}

/// Best-effort host part of an http(s) URL (no new dep for one comparison).
fn url_host(link: &str) -> Option<String> {
    let rest = link.split("://").nth(1)?;
    Some(rest.split('/').next()?.to_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::nitro_input;

    #[test]
    fn nitro_precedence_is_gateway_then_avatar_then_banner() {
        // Gateway premium_type (incl. Basic/3) always wins.
        assert_eq!(nitro_input(Some(3), true, true), 3);
        assert_eq!(nitro_input(Some(2), false, false), 2);
        // Animated avatar (Classic) BEFORE banner (Boost).
        assert_eq!(nitro_input(None, true, true), 1);
        assert_eq!(nitro_input(None, true, false), 1);
        assert_eq!(nitro_input(None, false, true), 2);
        assert_eq!(nitro_input(None, false, false), 0);
    }
}
