use super::*;

fn is_guild_admin(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    member: &poise::serenity_prelude::Member,
) -> bool {
    let roles = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.roles.clone())
        .unwrap_or_default();
    member.roles.iter().any(|r| {
        roles
            .get(r)
            .map(|role| role.permissions.administrator())
            .unwrap_or(false)
    })
}

/// Move one member between voice channels. Mirrors utils move.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "move",
    aliases("déplacer", "deplacer", "switch"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn voicemove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "To channel"]
    #[channel_types("Voice")]
    to: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    // Admin-victim guard. Mirrors !move.ts: a non-admin invoker cannot
    // move a member holding Administrator.
    let victim_admin = guild_id
        .member(ctx.http(), user.id)
        .await
        .ok()
        .map(|m| is_guild_admin(&ctx, guild_id, &m))
        .unwrap_or(false);
    if victim_admin {
        let invoker_admin = guild_id
            .member(ctx.http(), ctx.author().id)
            .await
            .ok()
            .map(|m| is_guild_admin(&ctx, guild_id, &m))
            .unwrap_or(false);
        if !invoker_admin {
            ctx.say(
                crate::lang::get(&code, "util_move_impossible_to_move_admin").unwrap_or_else(|| {
                    "The member you want to move is an administrator, and you are not an administrator either.".to_string()
                }),
            )
            .await?;
            return Ok(());
        }
    }
    match guild_id.move_member(ctx.http(), user.id, to.id).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_command_ok")
                    .map(|s| {
                        s.replace("${member?.toString()}", &format!("<@{}>", user.id.get()))
                            .replace("${channel.toString()}", &format!("<#{}>", to.id.get()))
                    })
                    .unwrap_or_else(|| "Moved.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_not_in_vc")
                    .unwrap_or_else(|| "Move failed (member not in voice?).".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

/// Freeze your current voice channel. Mirrors util !freeze.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "freeze",
    aliases("voicefreeze", "vcfreeze"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn voicefreeze(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let channel_id = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(channel_id) = channel_id else {
        ctx.say(
            crate::lang::get(&code, "util_not_in_vc")
                .unwrap_or_else(|| "The members are not in a voice channel".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.VOICE_FREEZE",
        &serde_json::json!({
            "channelId": channel_id.get().to_string(),
            "enabledBy": ctx.author().id.get().to_string(),
            "createdAt": crate::commands::shared::now_ms(),
            "allowedUsers": [],
        })
        .to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "util_freeze_command_work")
            .map(|s| {
                s.replace(
                    "${voiceChannel.toString()}",
                    &format!("<#{}>", channel_id.get()),
                )
            })
            .unwrap_or_else(|| "Frozen.".to_string()),
    )
    .await?;
    Ok(())
}

/// Clear the active voice freeze. Mirrors util !unfreeze.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unfreeze",
    aliases("defreeze"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn voiceunfreeze(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.VOICE_FREEZE").await;
    let has_freeze: bool = raw
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| {
            v.get("channelId")
                .and_then(|c| c.as_str())
                .map(|s| !s.is_empty())
        })
        .unwrap_or(false);
    if !has_freeze {
        ctx.say(
            crate::lang::get(&code, "util_unfreeze_no_freeze").unwrap_or_else(|| {
                "There is no active frozen voice channel in this guild.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind("UTILS.VOICE_FREEZE")
        .execute(&ctx.data().pool)
        .await;
    ctx.say(
        crate::lang::get(&code, "util_unfreeze_command_work")
            .unwrap_or_else(|| "Unfrozen.".to_string()),
    )
    .await?;
    Ok(())
}

/// Server voice statistics.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "vc",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn vc_list(
    ctx: Ctx<'_>,
    #[description = "Display mode: short or large"] mode: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let http = ctx.serenity_context().http.clone();
    let is_large = mode.as_deref().unwrap_or("short") == "large";
    // TS fetches members when the cache is empty. The cache guard
    // is scoped so no !Send guard crosses an await.
    let snapshot = {
        let cache = &ctx.serenity_context().cache;
        cache.guild(guild_id).map(|g| {
            (
                g.members.keys().copied().collect::<Vec<_>>(),
                g.presences.clone(),
                g.voice_states.clone(),
                g.name.clone(),
                g.member_count,
                g.premium_subscription_count.unwrap_or(0),
                g.icon_url().map(|u| format!("{u}?size=4096")),
                g.icon_url(),
            )
        })
    };
    let Some((member_ids, presences, voice_rows, name, member_count, boosts, icon_png, icon_thumb)) =
        snapshot
    else {
        return Ok(());
    };
    let member_ids = if member_ids.is_empty() {
        guild_id
            .members(&http, Some(1000), None)
            .await
            .unwrap_or_default()
            .iter()
            .map(|m| m.user.id)
            .collect()
    } else {
        member_ids
    };
    let statuses: Vec<Option<&str>> = member_ids
        .iter()
        .map(|id| presences.get(id).map(|p| p.status.name()))
        .collect();
    let member_stats = count_member_stats(&statuses);
    let states: Vec<(bool, bool, bool, bool, bool)> = voice_rows
        .values()
        .map(|v| {
            (
                v.channel_id.is_some(),
                v.self_stream.unwrap_or(false),
                v.self_deaf,
                v.self_mute,
                v.self_video,
            )
        })
        .collect();
    let voice_stats = count_voice_stats(&states);
    let total_online = member_stats.dnd + member_stats.online + member_stats.idle;
    let mut dominant = "#010101".to_string();
    if let Some(url) = icon_png {
        if let Ok((c1, _)) = crate::funcs::image_dominant_color(&url).await {
            dominant = c1;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let labels = [
        t("var_member"),
        t("var_online"),
        t("var_online_call"),
        t("var_stream"),
        t("var_boosts"),
        t("var_camera"),
        t("var_muted"),
    ];
    let emo_names = [
        "Server_Stats",
        "VC_Limit",
        "Desktop_Online",
        "Streaming",
        "Server_Booster",
        "Camera",
        "Mute",
    ];
    let values = [
        member_count.to_string(),
        total_online.to_string(),
        voice_stats.total.to_string(),
        voice_stats.streaming.to_string(),
        boosts.to_string(),
        voice_stats.self_video.to_string(),
        voice_stats.self_deaf.to_string(),
    ];
    let larges = [false, false, false, false, false, true, true];
    let mut owned: Vec<(String, String, String, bool)> = vec![];
    for i in 0..7 {
        owned.push((
            stat_emoji(&http, emo_names[i]).await,
            labels[i].clone(),
            values[i].clone(),
            larges[i],
        ));
    }
    let refs: Vec<(&str, &str, String, bool)> = owned
        .iter()
        .map(|(a, b, c, d)| (a.as_str(), b.as_str(), c.clone(), *d))
        .collect();
    let colour = u32::from_str_radix(dominant.trim_start_matches('#'), 16).unwrap_or(0x010101);
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("{} {} !", name, t("var_vc_stats")))
        .colour(serenity::Colour::new(colour))
        .description(vc_description(&refs, is_large));
    if let Some(thumb) = icon_thumb {
        embed = embed.thumbnail(thumb);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    if matches!(ctx, poise::Context::Application(_)) {
        let tick = stat_emoji(&http, "GreenTick").await;
        ctx.send(poise::CreateReply::default().content(tick).ephemeral(true))
            .await?;
    }
    Ok(())
}

/// Bring everyone to your voice channel. Mirrors !bringall.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "bringall",
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn bringall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "renewvc_not_in_voice")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let members: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id.is_some() && v.channel_id != Some(target))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    let mut n = 0;
    for uid in members {
        if guild_id.move_member(ctx.http(), uid, target).await.is_ok() {
            n += 1;
        }
    }
    ctx.say(format!("Brought {n}.")).await?;
    Ok(())
}

/// Voice mute/unmute helpers. Mirrors talk/untalk (!talk.ts family).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "talk",
    aliases("mutetalk"),
    default_member_permissions = "MUTE_MEMBERS"
)]
pub async fn talk(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    voice_mute_flag(&ctx, user, false).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "untalk",
    aliases("unmutetalk"),
    default_member_permissions = "MUTE_MEMBERS"
)]
pub async fn untalk(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    voice_mute_flag(&ctx, user, true).await
}

/// Voice kick (disconnect). Mirrors !vkick.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "vkick",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn vkick(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match guild_id.disconnect_member(ctx.http(), user.id).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_voice_kicked")
                    .unwrap_or_else(|| "Voice kicked.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "vkick_not_in_vc")
                    .unwrap_or_else(|| "Not in voice.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

/// Renew your current voice channel now. Mirrors !renewvc.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renewvc",
    aliases("rvc"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn renewvc(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "renewvc_not_in_voice")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(ch) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&target).cloned())
    else {
        return Ok(());
    };
    let mut builder = poise::serenity_prelude::CreateChannel::new(ch.name.clone()).kind(ch.kind);
    if let Some(parent) = ch.parent_id {
        builder = builder.category(parent);
    }
    let new_ch = guild_id.create_channel(ctx.http(), builder).await?;
    // Move occupants over, then delete the old channel.
    let occupants: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(target))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    for uid in occupants {
        let _ = guild_id.move_member(ctx.http(), uid, new_ch.id).await;
    }
    let _ = target.delete(ctx.http()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "renew_channel_send_success")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
            })
            .unwrap_or_else(|| format!("Renewed as <#{}>.", new_ch.id.get())),
    )
    .await?;
    Ok(())
}

/// Allow a member in the frozen channel. Mirrors util !wlvc.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlvc",
    aliases("allowvc"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn wlvc(
    ctx: Ctx<'_>,
    #[description = "Allowed member"] member: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(target) = member else {
        ctx.say(
            crate::lang::get(&code, "util_wlvc_no_member").unwrap_or_else(|| {
                "You must specify a member to allow in the frozen voice channel.".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.VOICE_FREEZE").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    let has_freeze = cfg
        .get("channelId")
        .and_then(|c| c.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    if !has_freeze {
        ctx.say(
            crate::lang::get(&code, "util_wlvc_no_freeze").unwrap_or_else(|| {
                "There is no active frozen voice channel in this guild.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let mut allowed: Vec<String> = cfg
        .get("allowedUsers")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    let id = target.id.get().to_string();
    if !allowed.contains(&id) {
        allowed.push(id);
    }
    cfg["allowedUsers"] = serde_json::Value::from(allowed);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.VOICE_FREEZE",
        &cfg.to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "util_wlvc_command_work")
            .map(|s| s.replace("${member.toString()}", &format!("<@{}>", target.id.get())))
            .unwrap_or_else(|| "Voice freeze channel set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unwlvc",
    aliases("removevcwl"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn unwlvc(
    ctx: Ctx<'_>,
    #[description = "Member to remove"] member: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = member else {
        ctx.say(
            crate::lang::get(&code, "util_unwlvc_no_member").unwrap_or_else(|| {
                "You must specify a member to remove from the frozen voice channel whitelist."
                    .to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.VOICE_FREEZE").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    let channel_id = cfg
        .get("channelId")
        .and_then(|c| c.as_str())
        .map(str::to_string);
    let Some(channel_id) = channel_id.filter(|s| !s.is_empty()) else {
        ctx.say(
            crate::lang::get(&code, "util_unwlvc_no_freeze").unwrap_or_else(|| {
                "There is no active frozen voice channel in this guild.".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    let allowed: Vec<String> = cfg
        .get("allowedUsers")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if !allowed.contains(&target.id.get().to_string()) {
        ctx.say(
            crate::lang::get(&code, "util_unwlvc_not_whitelisted")
                .map(|s| s.replace("${member.toString()}", &format!("<@{}>", target.id.get())))
                .unwrap_or_else(|| "Not whitelisted.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let kept: Vec<String> = allowed
        .into_iter()
        .filter(|id| id != &target.id.get().to_string())
        .collect();
    cfg["allowedUsers"] = serde_json::Value::from(kept);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.VOICE_FREEZE",
        &cfg.to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "util_unwlvc_command_work")
            .map(|s| s.replace("${member.toString()}", &format!("<@{}>", target.id.get())))
            .unwrap_or_else(|| "Voice freeze cleared.".to_string()),
    )
    .await?;
    // Mirror !unwlvc.ts: disconnect the member when they sit in the
    // frozen channel.
    let in_frozen = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&target.id).and_then(|v| v.channel_id))
        .map(|c| c.get().to_string() == channel_id)
        .unwrap_or(false);
    if in_frozen {
        let _ = guild_id.disconnect_member(ctx.http(), target.id).await;
    }
    Ok(())
}

/// Mass-move voice members. Mirrors utils !massmove.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massmove",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn massmove(
    ctx: Ctx<'_>,
    #[description = "From channel (omit for all voice)"]
    #[channel_types("Voice")]
    from: Option<poise::serenity_prelude::GuildChannel>,
    #[description = "To channel"]
    #[channel_types("Voice")]
    to: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let members: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| match &from {
                    Some(f) => v.channel_id == Some(f.id),
                    None => v.channel_id.is_some(),
                })
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    let mut moved = 0;
    let mut errors = 0;
    for uid in members {
        if guild_id.move_member(ctx.http(), uid, to.id).await.is_ok() {
            moved += 1;
        } else {
            errors += 1;
        }
    }
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let from_label = match &from {
        Some(f) => format!("<#{}>", f.id.get()),
        None => ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                g.channels
                    .values()
                    .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Voice)
                    .map(|c| format!("<#{}>", c.id.get()))
                    .collect::<Vec<_>>()
                    .join(",")
            })
            .unwrap_or_default(),
    };
    let desc = crate::lang::get(&code, "massmove_results")
        .map(|s| {
            s.replace(
                "${interaction.user}",
                &format!("<@{}>", ctx.author().id.get()),
            )
            .replace("${movedCount}", &moved.to_string())
            .replace("${errorCount}", &errors.to_string())
            .replace("${fromChannel}", &from_label)
            .replace("${toChannel}", &format!("<#{}>", to.id.get()))
        })
        .unwrap_or_else(|| format!("Moved {moved} members."));
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    if let Some(thumb) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url())
    {
        embed = embed.thumbnail(thumb);
    }
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
