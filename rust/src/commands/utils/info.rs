use super::*;

/// Bot info. Mirrors the TS botinfo/about command shape.
#[poise::command(slash_command, prefix_command, category = "utils")]
pub async fn botinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "iHorizon Rust v{} (serenity + poise)",
        env!("CARGO_PKG_VERSION")
    ))
    .await?;
    Ok(())
}

/// Avatar. Mirrors utils !avatar.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "avatar",
    aliases("pfp", "pp", "pic")
)]
pub async fn avatar(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let url = match &u.avatar {
        Some(hash) => format!(
            "https://cdn.discordapp.com/avatars/{}/{}.png?size=512",
            u.id.get(),
            hash
        ),
        None => u.default_avatar_url(),
    };
    let display = u.global_name.clone().unwrap_or_else(|| u.name.clone());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xadd5ff)
        .title(
            crate::lang::get(&code, "avatar_embed_title")
                .map(|s| s.replace("${mentionedUser.username}", &display))
                .unwrap_or_else(|| format!("{}'s avatar", u.tag())),
        )
        .description(
            crate::lang::get(&code, "avatar_embed_description")
                .unwrap_or_else(|| "Avatar.".to_string()),
        )
        .image(url)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

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

/// First message link.
// Mirrors MessageCommands utils top.ts (oldest message via
// after:"0", link reply or no-message text).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "top")]
pub async fn top(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let first = ctx
        .channel_id()
        .messages(
            ctx.http(),
            poise::serenity_prelude::GetMessages::new()
                .after(poise::serenity_prelude::MessageId::new(1))
                .limit(1),
        )
        .await
        .unwrap_or_default()
        .into_iter()
        .next();
    match first {
        Some(m) => {
            let link =
                crate::funcs::message_url(guild_id.get(), ctx.channel_id().get(), m.id.get());
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "utils_top_command_ok",
                    "The first message in this channel is [here](${link})",
                )
                .await
                .replace("${link}", &link),
            )
            .await?;
        }
        None => {
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "utils_top_no_message",
                    "No messages found in this channel",
                )
                .await,
            )
            .await?;
        }
    }
    Ok(())
}

/// Server info. Mirrors utils serverinfo.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverinfo",
    aliases("si", "gi")
)]
pub async fn serverinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let (name, id, members, channels, roles, boosts) = {
        let Some(guild) = ctx.serenity_context().cache.guild(guild_id) else {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_guild_not_cached")
                    .unwrap_or_else(|| "Guild not cached.".to_string()),
            )
            .await?;
            return Ok(());
        };
        (
            guild.name.clone(),
            guild.id.get().to_string(),
            guild.member_count.to_string(),
            guild.channels.len().to_string(),
            guild.roles.len().to_string(),
            guild.premium_subscription_count.unwrap_or(0).to_string(),
        )
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(name)
        .field(f("serverinfo_embed_fields_id", "ID"), id, true)
        .field(
            f("serverinfo_embed_fields_members", "Members"),
            members,
            true,
        )
        .field(
            f("serverinfo_embed_fields_channels", "Channels"),
            channels,
            true,
        )
        .field(f("serverinfo_embed_fields_roles", "Roles"), roles, true)
        .field(f("var_boosts", "Boosts"), boosts, true);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Previous names. Mirrors utils !prevnames.ts (tracked in user_update).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "prevnames",
    aliases("pvnames", "pvname", "prevname")
)]
pub async fn prevnames(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let raw = crate::db::kv_get(&ctx.data().pool, "0", &crate::events::prevnames_key(uid)).await;
    let history: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if history.is_empty() {
        crate::lang::get(&code, "prevnames_undetected")
            .unwrap_or_else(|| "No previous names.".to_string())
    } else {
        history.join(", ")
    })
    .await?;
    Ok(())
}

/// Member voice location. Mirrors utils !where.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "where",
    aliases("whereis"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn whereis(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let f = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let snapshot = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.members.get(&user.id).cloned().map(|m| {
            let vs = g.voice_states.get(&user.id).cloned();
            (m, vs)
        })
    });
    let Some((member, voice)) = snapshot else {
        ctx.say(
            crate::lang::get(&code, "ban_dont_found_member")
                .unwrap_or_else(|| "Member not found.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(vs) = voice.and_then(|v| v.channel_id.map(|c| (c, v))) else {
        ctx.say(
            crate::lang::get(&code, "util_not_in_vc")
                .unwrap_or_else(|| "Not in voice.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let (channel_id, vs) = vs;
    let http = &ctx.serenity_context().http;
    let yes = f("var_yes");
    let no = f("var_no");
    let streaming = vs.self_stream.unwrap_or(false);
    let desc = format!(
        "> {} **{}:** <@{}>\n> {} **{}:** <#{}>\n> {} **{}:** {}\n> {} **{}:** {}\n> {} **{}:** {}",
        crate::emojis::app_emoji_markup(http, "VC_Limit")
            .await
            .unwrap_or_default(),
        f("var_member"),
        user.id.get(),
        crate::emojis::app_emoji_markup(http, "VC_Name")
            .await
            .unwrap_or_default(),
        f("var_voice_channel"),
        channel_id,
        crate::emojis::app_emoji_markup(http, "Streaming")
            .await
            .unwrap_or_default(),
        f("perm_stream_name"),
        if streaming { &yes } else { &no },
        crate::emojis::app_emoji_markup(http, "Camera")
            .await
            .unwrap_or_default(),
        f("var_video"),
        if vs.self_video { &yes } else { &no },
        crate::emojis::app_emoji_markup(http, "Mute")
            .await
            .unwrap_or_default(),
        f("util_where_mute"),
        if vs.self_mute { &yes } else { &no },
    );
    let deaf_line = format!(
        "> {} **{}:** {}",
        crate::emojis::app_emoji_markup(http, "Deaf")
            .await
            .unwrap_or_default(),
        f("util_where_deaf"),
        if vs.self_deaf { &yes } else { &no },
    );
    let embed = serenity::CreateEmbed::default()
        .title(format!("{}: {}", f("var_whereis"), member.display_name()))
        .colour(serenity::Colour::from_rgb(79, 219, 18))
        .description(format!("{desc}\n{deaf_line}"))
        .thumbnail(user.face());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Server icon. Mirrors utils !serverpic.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverpic",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn serverpic(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let snapshot = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| (g.name.clone(), g.icon, g.id));
    let Some((name, icon, gid)) = snapshot else {
        return Ok(());
    };
    let Some(icon) = icon else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_no_server_icon")
                .unwrap_or_else(|| "No server icon.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let url = format!(
        "https://cdn.discordapp.com/icons/{}/{}.webp?size=4096",
        gid.get(),
        icon
    );
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let embed = serenity::CreateEmbed::default()
        .colour(0xadd5ff)
        .title(name)
        .image(url.clone());
    let button = serenity::CreateButton::new_link(url).label(
        crate::lang::get(&code, "pfps_download_guild_button")
            .unwrap_or_else(|| "Download.".to_string()),
    );
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .components(vec![serenity::CreateActionRow::Buttons(vec![button])]),
    )
    .await?;
    Ok(())
}

/// Snipe read. Mirrors utils !snipe.ts (marker stored by events_handler).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "snipe",
    aliases("s", "snp")
)]
pub async fn snipe(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let ch_id = match &channel {
        Some(c) => c.id.get(),
        None => match ctx.guild_channel().await {
            Some(c) => c.id.get(),
            None => {
                let code =
                    crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
                ctx.say(
                    crate::lang::get(&code, "msg_no_channel")
                        .unwrap_or_else(|| "No channel.".to_string()),
                )
                .await?;
                return Ok(());
            }
        },
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &format!("SNIPE.{ch_id}")).await;
    if let Some(v) = raw.and_then(|r| serde_json::from_str::<serde_json::Value>(&r).ok()) {
        let author = v.get("author").and_then(|a| a.as_str()).unwrap_or("?");
        let content = v.get("content").and_then(|c| c.as_str()).unwrap_or("");
        ctx.say(format!("{author}: {content}")).await?;
        return Ok(());
    }
    let last = crate::db::kv_get(&ctx.data().pool, &gid, "SNIPE.last_deleted_id").await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(match last {
        Some(id) => format!("Last deleted message id: {id}"),
        None => crate::lang::get(&code, "snipe_no_previous_message_deleted")
            .unwrap_or_else(|| "Nothing to snipe.".to_string()),
    })
    .await?;
    Ok(())
}

/// Banner parent. Mirrors utils banner/banner.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner",
    subcommands("banner_user", "banner_server"),
    subcommand_required
)]
pub async fn banner(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Show a member's banner. Mirrors utils banner !user.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner-user",
    aliases("userbanner", "ubanner")
)]
pub async fn banner_user(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let token = crate::config::bot_token().unwrap_or_default();
    let hash = fetch_user_banner_hash(&token, u.id.get()).await;
    let Some(hash) = hash else {
        ctx.say(crate::commands::lang_for(&ctx, "banner_user_no_banner", "No banner.").await)
            .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC4AFED)
        .title(
            crate::commands::lang_for(&ctx, "banner_user_embed", "${user?.username}")
                .await
                .replace("${user?.username}", &u.name),
        )
        .image(user_banner_url(u.id.get(), &hash));
    let embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Show the server's banner. Mirrors utils banner !server.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner-server",
    aliases("serverbanner")
)]
pub async fn banner_server(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let banner_url = ctx.guild().as_ref().and_then(|g| g.banner_url());
    let Some(banner_url) = banner_url else {
        ctx.say(crate::commands::lang_for(&ctx, "banner_guild_no_banner", "No banner.").await)
            .await?;
        return Ok(());
    };
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xC4AFED)
        .title(crate::commands::lang_for(&ctx, "banner_guild_embed", "Server banner").await)
        .image(banner_url);
    let embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Invite validation gate. Mirrors method.isValidDiscordInvite.
fn is_valid_discord_invite(input: &str) -> bool {
    let t = input.trim();
    if t.is_empty() {
        return false;
    }
    let code = t
        .strip_prefix("https://discord.gg/")
        .or_else(|| t.strip_prefix("discord.gg/"))
        .unwrap_or(t);
    !code.is_empty() && !code.contains('/') && code.chars().all(|c| c.is_ascii_alphanumeric())
}

/// Invite info. Mirrors util !inviteinfo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "inviteinfo",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn inviteinfo(
    ctx: Ctx<'_>,
    #[description = "Invite code or URL"] invite: String,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if !is_valid_discord_invite(&invite) {
        ctx.say(
            crate::lang::get(&code, "util_inviteinfo_not_valid_invite")
                .unwrap_or_else(|| "Invalid invite.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let short = invite
        .trim()
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .to_string();
    let inv = match ctx.http().get_invite(&short, true, true, None).await {
        Ok(inv) => inv,
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "util_inviteinfo_not_valid_invite")
                    .unwrap_or_else(|| "Invalid invite.".to_string()),
            )
            .await?;
            return Ok(());
        }
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let has_footer = footer_bytes.is_some();
    let unknown = f("var_unknown");
    let (g_name, g_id, g_desc, g_created, g_boosts, g_features, g_icon, g_banner, g_splash) =
        match &inv.guild {
            Some(g) => (
                g.name.clone(),
                g.id.get().to_string(),
                g.description
                    .clone()
                    .unwrap_or_else(|| f("profil_not_description_set")),
                format!("<t:{}:R>", g.id.created_at().unix_timestamp()),
                g.premium_subscription_count.unwrap_or(0).to_string(),
                if g.features.is_empty() {
                    f("var_none")
                } else {
                    g.features.join(", ").chars().take(1020).collect()
                },
                g.icon.map(|h| {
                    format!(
                        "https://cdn.discordapp.com/icons/{}/{}.webp?size=512",
                        g.id.get(),
                        h
                    )
                }),
                g.banner.map(|h| {
                    format!(
                        "https://cdn.discordapp.com/banners/{}/{}.webp?size=512",
                        g.id.get(),
                        h
                    )
                }),
                g.splash.map(|h| {
                    format!(
                        "https://cdn.discordapp.com/splashes/{}/{}.webp?size=512",
                        g.id.get(),
                        h
                    )
                }),
            ),
            None => (
                f("var_unknown_guild_name"),
                unknown.clone(),
                f("profil_not_description_set"),
                unknown.clone(),
                "0".to_string(),
                f("var_none"),
                None,
                None,
                None,
            ),
        };
    let mk_embed1 = || {
        let mut e = serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0, 255, 255))
            .title(g_name.clone())
            .description(g_desc.clone())
            .field(
                f("setlogschannel_var_channel"),
                format!(
                    "<#{}> (ID: `{}`)",
                    inv.channel.id.get(),
                    inv.channel.id.get()
                ),
                false,
            )
            .field(f("var_guild"), format!("{g_name} (ID: `{g_id}`)"), false)
            .field(f("userinfo_embed_fields_4_name"), g_created.clone(), false);
        e = embed_with_footer(e, &footer_name, has_footer);
        e
    };
    let mk_embed2 = || {
        let mut e = serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0, 255, 255))
            .title(g_name.clone())
            .field(
                f("help_memberc_fields"),
                inv.approximate_member_count
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| unknown.clone()),
                true,
            )
            .field(
                f("var_online_members"),
                inv.approximate_presence_count
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| unknown.clone()),
                true,
            )
            .field(f("var_boost_level"), g_boosts.clone(), true)
            .field(f("var_features"), g_features.clone(), false);
        e = embed_with_footer(e, &footer_name, has_footer);
        e
    };
    let mut link_buttons = vec![];
    if let Some(url) = g_icon {
        link_buttons.push(serenity::CreateButton::new_link(url).label(f("var_guild_icon")));
    }
    if let Some(url) = g_banner {
        link_buttons.push(serenity::CreateButton::new_link(url).label(f("var_guild_banner")));
    }
    if let Some(url) = g_splash {
        link_buttons.push(serenity::CreateButton::new_link(url).label(f("var_guild_splash")));
    }
    let toggle_row = |label: &str| {
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
            "inviteinfo-next-page",
        )
        .style(serenity::ButtonStyle::Secondary)
        .label(label)])
    };
    let mut rows = vec![];
    if !link_buttons.is_empty() {
        rows.push(serenity::CreateActionRow::Buttons(link_buttons.clone()));
    }
    rows.push(toggle_row(">>>"));
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed1())
        .components(rows);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let author = ctx.author().id;
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let mut page = 1;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(120))
            .filter(move |i| i.data.custom_id == "inviteinfo-next-page")
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(f("help_not_for_you"))
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        page = if page == 1 { 2 } else { 1 };
        let label = if page == 1 { ">>>" } else { "<<<" };
        let mut new_rows = vec![];
        if !link_buttons.is_empty() {
            new_rows.push(serenity::CreateActionRow::Buttons(link_buttons.clone()));
        }
        new_rows.push(toggle_row(label));
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(if page == 1 { mk_embed1() } else { mk_embed2() })
                        .components(new_rows),
                ),
            )
            .await;
    }
    // Disable the toggle when the collector ends, like the TS end handler.
    let mut end_rows = vec![];
    if !link_buttons.is_empty() {
        end_rows.push(serenity::CreateActionRow::Buttons(
            link_buttons.into_iter().map(|b| b.disabled(true)).collect(),
        ));
    }
    end_rows.push(serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new("inviteinfo-next-page")
            .style(serenity::ButtonStyle::Secondary)
            .label(if page == 1 { ">>>" } else { "<<<" })
            .disabled(true),
    ]));
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(end_rows),
        )
        .await;
    Ok(())
}

/// Help command.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "help")]
pub async fn help_here(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let all: Vec<(String, Option<String>)> = crate::commands::all()
        .iter()
        .map(|c| (c.name.clone(), c.category.clone()))
        .collect();
    let total = crate::executor::total_pages(all.len(), 20);
    let page = page.unwrap_or(1).clamp(1, total.max(1) as i64) as usize;
    let body = help_page(&all, page, 20);
    ctx.say(format!("Commands (p{page}/{total}):\n{body}"))
        .await?;
    Ok(())
}

/// Steal custom emojis from text. Mirrors !emojis.ts.
// Per-emoji channel feedback plus the summary embed; no 6s pacing.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "emojis",
    aliases("addemoji", "create", "addemojis", "emoji", "emote"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn emojis(
    ctx: Ctx<'_>,
    #[description = "Text containing <:name:id> emojis"] text: String,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let guild_name = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.name.clone())
        .unwrap_or_default();
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut cnt = 0;
    let mut nemj = String::new();
    for token in text.split_whitespace() {
        let Some((animated, name, id)) = super::parse_steal_token(token) else {
            continue;
        };
        let ext = if animated { "gif" } else { "png" };
        let url = format!("https://cdn.discordapp.com/emojis/{id}.{ext}");
        let bytes = match reqwest::Client::new().get(&url).send().await {
            Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
            Err(_) => vec![],
        };
        if bytes.is_empty() || bytes.len() > 256 * 1024 {
            ctx.channel_id()
                .say(
                    ctx.http(),
                    crate::lang::get(&code, "emoji_send_err_emoji")
                        .map(|s| s.replace("${emoji.name}", token))
                        .unwrap_or_else(|| "Emoji failed.".to_string()),
                )
                .await?;
            continue;
        }
        let image = format!(
            "data:image/{ext};base64,{}",
            crate::emojis::base64_encode(&bytes)
        );
        match guild_id.create_emoji(ctx.http(), &name, &image).await {
            Ok(created) => {
                cnt += 1;
                nemj.push_str(&format!(
                    "<{}:{}:{}>",
                    if animated { "a" } else { "" },
                    created.name,
                    created.id.get()
                ));
                ctx.channel_id()
                    .say(
                        ctx.http(),
                        crate::lang::get(&code, "emoji_send_new_emoji")
                            .map(|s| {
                                s.replace("${emoji.name}", &created.name)
                                    .replace("${emoji}", &created.to_string())
                            })
                            .unwrap_or_else(|| "Emoji added.".to_string()),
                    )
                    .await?;
            }
            Err(_) => {
                ctx.channel_id()
                    .say(
                        ctx.http(),
                        crate::lang::get(&code, "emoji_send_err_emoji")
                            .map(|s| s.replace("${emoji.name}", token))
                            .unwrap_or_else(|| "Emoji failed.".to_string()),
                    )
                    .await?;
            }
        }
    }
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(190, 169, 222))
        .timestamp(serenity::Timestamp::now())
        .description(
            crate::lang::get(&code, "emoji_embed_desc_work")
                .map(|s| {
                    s.replace("${cnt}", &cnt.to_string())
                        .replace("${interaction.guild.name}", &guild_name)
                        .replace("${nemj}", &nemj)
                })
                .unwrap_or_else(|| format!("Stole {cnt} emojis.")),
        );
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Steal a stock sticker by id. Mirrors sticker.ts (PNG best-effort).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "sticker")]
pub async fn sticker(
    ctx: Ctx<'_>,
    #[description = "Sticker id"] sticker_id: String,
    #[description = "Name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let id: u64 = sticker_id.trim().parse().unwrap_or(0);
    if id == 0 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_sticker_id")
                .unwrap_or_else(|| "Bad sticker id.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let bytes = match reqwest::Client::new()
        .get(format!("https://cdn.discordapp.com/stickers/{id}.png"))
        .send()
        .await
    {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => vec![],
    };
    if bytes.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_fetch_failed")
                .unwrap_or_else(|| "Fetch failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = name.unwrap_or_else(|| format!("sticker{id}"));
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match guild_id
        .create_sticker(
            ctx.http(),
            poise::serenity_prelude::CreateSticker::new(
                &name,
                poise::serenity_prelude::CreateAttachment::bytes(bytes, "sticker.png"),
            ),
        )
        .await
    {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_sticker_added")
                    .unwrap_or_else(|| "Sticker added.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_upload_failed")
                    .unwrap_or_else(|| "Upload failed.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}
