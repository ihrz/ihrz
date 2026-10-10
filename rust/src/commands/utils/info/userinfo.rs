use super::*;

/// User info. Mirrors utils !userinfo.ts (best-effort).
// Third-party badge APIs and the gateway premium lookup are skipped.
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
    let badges = u
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
    // Nitro heuristic (no gateway): animated avatar -> Classic, banner -> Boost.
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
    // Booster line: mirrors getServerBadges premiumSubscriberRole check
    // in !userinfo.ts. Serenity's cached Guild exposes no booster role
    // id, so this is a name heuristic over the member's cached roles.
    let is_booster = ctx.guild_id().and_then(|gid| {
        ctx.serenity_context().cache.guild(gid).map(|g| {
            g.members
                .get(&u.id)
                .map(|m| {
                    m.roles.iter().any(|rid| {
                        g.roles
                            .get(rid)
                            .map(|r| r.name.to_ascii_lowercase().contains("booster"))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false)
        })
    });
    let _ = is_booster;
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
