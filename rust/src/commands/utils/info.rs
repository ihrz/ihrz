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

/// Avatar. Mirrors utils avatar (attachment-free embed with URL).
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
    let url = u.face();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title({
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            crate::lang::get(&code, "avatar_embed_title")
                .map(|s| s.replace("${mentionedUser.username}", &u.name))
                .unwrap_or_else(|| format!("{}'s avatar", u.tag()))
        })
        .image(url);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// User info. Mirrors utils userinfo (embed, no html2png).
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
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let created = u.created_at().unix_timestamp();
    let face_url = u.face();
    let face_bytes = crate::commands::shared::download_bytes(&face_url).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(u.tag())
        .field("ID", u.id.get().to_string(), true)
        .field("Bot", u.bot.to_string(), true)
        .field("Created", format!("<t:{created}:F>"), false);
    let embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    };
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "avatar.png",
        ));
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

/// Member voice location. Mirrors utils where (voice states).
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
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let loc = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&user.id)
            .and_then(|v| v.channel_id)
            .map(|c| format!("<#{c}>"))
    });
    ctx.say(match loc {
        Some(c) => format!("{} is in {c}.", user.tag()),
        None => format!("{} is not in voice.", user.tag()),
    })
    .await?;
    Ok(())
}

/// Server icon. Mirrors utils serverpic.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverpic",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn serverpic(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let url = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url());
    match url {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default().image(u);
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_no_server_icon")
                    .unwrap_or_else(|| "No server icon.".to_string()),
            )
            .await?;
        }
    }
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

/// Invite info. Mirrors !inviteinfo.ts.
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
    let code = invite
        .trim()
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .to_string();
    match ctx.http().get_invite(&code, true, true, None).await {
        Ok(inv) => {
            ctx.say(format!(
                "Server: {} | Channel: {} | Members: {}",
                inv.guild
                    .as_ref()
                    .map(|g| g.name.clone())
                    .unwrap_or_else(|| "?".to_string()),
                inv.channel.name.clone(),
                inv.approximate_member_count.unwrap_or(0),
            ))
            .await?;
        }
        Err(_) => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "util_inviteinfo_not_valid_invite")
                    .unwrap_or_else(|| "Invalid invite.".to_string()),
            )
            .await?;
        }
    }
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

/// Steal custom emojis from text. Mirrors !emojis.ts
/// (CDN fetch + guild upload).
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
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let mut done = 0;
    for token in text.split_whitespace() {
        let (animated, name, id) = match parse_steal_token(token) {
            Some(v) => v,
            None => continue,
        };
        let ext = if animated { "gif" } else { "png" };
        let url = format!("https://cdn.discordapp.com/emojis/{id}.{ext}");
        let bytes = match reqwest::Client::new().get(&url).send().await {
            Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
            Err(_) => continue,
        };
        if bytes.is_empty() || bytes.len() > 256 * 1024 {
            continue;
        }
        let image = format!(
            "data:image/{ext};base64,{}",
            crate::emojis::base64_encode(&bytes)
        );
        if guild_id
            .create_emoji(ctx.http(), &name, &image)
            .await
            .is_ok()
        {
            done += 1;
        }
    }
    ctx.say(format!("Stole {done} emojis.")).await?;
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
