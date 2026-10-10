use super::*;

/// User info. Mirrors utils !userinfo.ts (best-effort).
// Third-party donor badges (Vencord/Equicord) are ported best-effort;
// the HorizonGateway premium lookup is skipped (see the nitro comment).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "userinfo",
    aliases("ui")
)]
pub async fn userinfo(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let notfound = crate::lang::get(&code, "userinfo_var_notfound")
        .unwrap_or_else(|| "`Not found`".to_string());
    // Flag badges (names, best-effort for the TS emoji badges).
    let base_badges = u
        .public_flags
        .map(|flags| {
            flags
                .iter_names()
                .map(|(name, _)| name.to_string())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| notfound.clone());
    // Server badges mirror getServerBadges in !userinfo.ts. The booster
    // line uses the cached member's boost start (`premium_since`, the
    // serenity equivalent of holding the guild premium-subscriber role);
    // the Crown marks the guild owner.
    let cached_member = ctx.guild_id().and_then(|gid| {
        ctx.serenity_context()
            .cache
            .guild(gid)
            .and_then(|g| g.members.get(&u.id).cloned())
    });
    let is_booster = cached_member
        .as_ref()
        .and_then(|m| m.premium_since)
        .is_some();
    let is_owner = ctx
        .guild_id()
        .and_then(|gid| {
            ctx.serenity_context()
                .cache
                .guild(gid)
                .map(|g| g.owner_id == u.id)
        })
        .unwrap_or(false);
    // Bot app badges mirror the `member.bot` App_1/App_2 append in
    // !userinfo.ts (bot self application-flag badges need the app object,
    // unavailable here, so only the generic app marker is used).
    let mut extra: Vec<&str> = vec![];
    if is_booster {
        extra.push("Server Booster");
    }
    if is_owner {
        extra.push("Crown (Server Owner)");
    }
    if u.bot {
        extra.push("Bot App");
    }
    // Donor badges mirror getVencordDonator/getEquiboAndOthersData in
    // !userinfo.ts: best-effort lookups with the TS 833 ms timeouts,
    // failures silently yield nothing (like `.catch(() => null)`).
    let uid_str = u.id.get().to_string();
    if vencord_donator(&uid_str).await {
        extra.push("Vencord Donator");
    }
    if equicord_donator(&uid_str).await {
        extra.push("Equicord Donator");
    }
    let badges = if extra.is_empty() {
        base_badges
    } else if base_badges == notfound {
        extra.join(", ")
    } else {
        format!("{base_badges}, {}", extra.join(", "))
    };
    // Presence from cache.
    let presence = ctx.guild_id().and_then(|gid| {
        ctx.serenity_context()
            .cache
            .guild(gid)
            .and_then(|g| g.presences.get(&u.id).cloned())
    });
    let presence_label = presence
        .map(|p| {
            let status = p.status.name().to_string();
            match p.client_status {
                Some(cs) => {
                    let mut platforms = vec![];
                    if cs.desktop.is_some() {
                        platforms.push("desktop");
                    }
                    if cs.mobile.is_some() {
                        platforms.push("mobile");
                    }
                    if cs.web.is_some() {
                        platforms.push("web");
                    }
                    if platforms.is_empty() {
                        status
                    } else {
                        format!("{} ({})", status, platforms.join(", "))
                    }
                }
                None => status,
            }
        })
        .unwrap_or_else(|| notfound.clone());
    // Nitro heuristic (no gateway): animated avatar -> Classic (1),
    // banner -> Boost (2). `premium_type` 3 (Nitro Basic) only arrives via
    // the HorizonGateway UserInfo lookup inside GetNitro, which has no Rust
    // equivalent, so Basic is unreachable here (documented delta).
    let animated_avatar = u
        .avatar
        .as_ref()
        .map(|h| h.to_string().starts_with("a_"))
        .unwrap_or(false);
    let token = crate::config::bot_token().unwrap_or_default();
    let banner_hash = super::fetch_user_banner_hash(&token, u.id.get()).await;
    let nitro = if u.bot {
        notfound.clone()
    } else if banner_hash.is_some() {
        "Nitro Boost".to_string()
    } else if animated_avatar {
        "Nitro Classic".to_string()
    } else {
        notfound.clone()
    };
    let display = u.global_name.clone().unwrap_or_else(|| u.name.clone());
    let created = u.created_at().unix_timestamp();
    let roles = ctx
        .guild_id()
        .and_then(|gid| {
            ctx.serenity_context()
                .cache
                .guild(gid)
                .and_then(|g| g.members.get(&u.id).map(|m| m.roles.clone()))
        })
        .map(|roles| {
            roles
                .iter()
                .take(37)
                .map(|r| format!("<@&{}>", r.get()))
                .collect::<Vec<_>>()
                .join("")
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
        .field("Presence", presence_label, true)
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
    let mut reply = poise::CreateReply::default().embed(embed).components(vec![
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new_link(format!(
            "https://discordapp.com/users/{}",
            u.id.get()
        ))
        .label(f("userinfo_button_label"))]),
    ]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "user_icon.gif"));
    }
    if let Some(bytes) = banner_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "user_banner.gif"));
    }
    ctx.send(reply).await?;
    Ok(())
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

/// Best-effort host part of an http(s) URL (no new dep for one comparison).
fn url_host(link: &str) -> Option<String> {
    let rest = link.split("://").nth(1)?;
    Some(rest.split('/').next()?.to_ascii_lowercase())
}
