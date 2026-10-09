use super::*;

fn overwrite_denies_view(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    channel_id: poise::serenity_prelude::ChannelId,
    role_id: u64,
) -> Option<bool> {
    ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.channels.get(&channel_id).map(|c| {
            c.permission_overwrites
                .iter()
                .find(|o| {
                    matches!(
                        o.kind,
                        poise::serenity_prelude::PermissionOverwriteType::Role(id)
                        if id.get() == role_id
                    )
                })
                .map(|o| o.deny.view_channel())
                .unwrap_or(false)
        })
    })
}

/// Hide a channel from a role. Mirrors chanel !hide.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hide",
    aliases("masquer"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn chan_hide(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
    #[description = "Role, defaults to @everyone"] role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| guild_id.get());
    let mention = format!("<@&{role_id}>");
    if overwrite_denies_view(&ctx, guild_id, ch_id, role_id).unwrap_or(false) {
        ctx.say(
            crate::lang::get(&code, "channel_hide_already_hidden")
                .map(|s| s.replace("@everyone", &mention))
                .unwrap_or_else(|| "Channel hidden.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if ch_id
        .create_permission(
            ctx.http(),
            poise::serenity_prelude::PermissionOverwrite {
                allow: poise::serenity_prelude::Permissions::empty(),
                deny: poise::serenity_prelude::Permissions::VIEW_CHANNEL,
                kind: poise::serenity_prelude::PermissionOverwriteType::Role(
                    poise::serenity_prelude::RoleId::new(role_id),
                ),
            },
        )
        .await
        .is_err()
    {
        ctx.say(
            crate::lang::get(&code, "renew_dont_have_permission")
                .unwrap_or_else(|| "No permission.".to_string()),
        )
        .await?;
        return Ok(());
    }
    ctx.say(
        crate::lang::get(&code, "channel_hide_success")
            .map(|s| s.replace("@everyone", &mention))
            .unwrap_or_else(|| "Channel hidden.".to_string()),
    )
    .await?;
    Ok(())
}

/// Unhide a channel for a role. Mirrors chanel !unhide.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unhide",
    aliases("démasquer", "demasquer"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn chan_unhide(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
    #[description = "Role, defaults to @everyone"] role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| guild_id.get());
    let mention = format!("<@&{role_id}>");
    if !overwrite_denies_view(&ctx, guild_id, ch_id, role_id).unwrap_or(false) {
        ctx.say(
            crate::lang::get(&code, "channel_unhide_already_visible")
                .map(|s| s.replace("@everyone", &mention))
                .unwrap_or_else(|| "Channel unhidden.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS clears ViewChannel:null: drop VIEW_CHANNEL from the deny set,
    // preserving the rest of the overwrite.
    let (allow, deny) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&ch_id).cloned())
        .and_then(|c| {
            c.permission_overwrites.iter().find_map(|o| match o.kind {
                poise::serenity_prelude::PermissionOverwriteType::Role(id)
                    if id.get() == role_id =>
                {
                    Some((o.allow, o.deny))
                }
                _ => None,
            })
        })
        .unwrap_or((
            poise::serenity_prelude::Permissions::empty(),
            poise::serenity_prelude::Permissions::VIEW_CHANNEL,
        ));
    let deny = deny.difference(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
    if ch_id
        .create_permission(
            ctx.http(),
            poise::serenity_prelude::PermissionOverwrite {
                allow,
                deny,
                kind: poise::serenity_prelude::PermissionOverwriteType::Role(
                    poise::serenity_prelude::RoleId::new(role_id),
                ),
            },
        )
        .await
        .is_err()
    {
        ctx.say(
            crate::lang::get(&code, "renew_dont_have_permission")
                .unwrap_or_else(|| "No permission.".to_string()),
        )
        .await?;
        return Ok(());
    }
    ctx.say(
        crate::lang::get(&code, "channel_unhide_success")
            .map(|s| s.replace("@everyone", &mention))
            .unwrap_or_else(|| "Channel unhidden.".to_string()),
    )
    .await?;
    Ok(())
}

/// Hide/unhide every text channel for a role. Mirrors chanel
/// hideall/unhideall: role param (@everyone default), in-progress note,
/// already-in-state skips, per-channel edit failures counted as errors
/// (manageable guard), {hiddenCount|unhiddenCount}/{errorCount} replies.
async fn hide_all_inner(ctx: &Ctx<'_>, unhide: bool, role_id: u64) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let mention = format!("<@&{role_id}>");
    ctx.say(if unhide {
        crate::lang::get(&code, "channel_unhideall_in_progress")
            .unwrap_or_else(|| "Unhiding.".to_string())
    } else {
        crate::lang::get(&code, "channel_hideall_in_progress")
            .unwrap_or_else(|| "Hiding.".to_string())
    })
    .await?;
    let channels: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Text)
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    let mut done = 0;
    let mut errors = 0;
    for ch in channels {
        let denied = overwrite_denies_view(ctx, guild_id, ch, role_id).unwrap_or(false);
        if unhide {
            if !denied {
                continue;
            }
            // TS clears ViewChannel:null on unhideall.
            let (allow, deny) = ctx
                .serenity_context()
                .cache
                .guild(guild_id)
                .and_then(|g| g.channels.get(&ch).cloned())
                .and_then(|c| {
                    c.permission_overwrites.iter().find_map(|o| match o.kind {
                        poise::serenity_prelude::PermissionOverwriteType::Role(id)
                            if id.get() == role_id =>
                        {
                            Some((o.allow, o.deny))
                        }
                        _ => None,
                    })
                })
                .unwrap_or((
                    poise::serenity_prelude::Permissions::empty(),
                    poise::serenity_prelude::Permissions::VIEW_CHANNEL,
                ));
            let deny = deny.difference(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
            if ch
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow,
                        deny,
                        kind: poise::serenity_prelude::PermissionOverwriteType::Role(
                            poise::serenity_prelude::RoleId::new(role_id),
                        ),
                    },
                )
                .await
                .is_err()
            {
                errors += 1;
            } else {
                done += 1;
            }
        } else {
            if denied {
                continue;
            }
            if ch
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: poise::serenity_prelude::Permissions::empty(),
                        deny: poise::serenity_prelude::Permissions::VIEW_CHANNEL,
                        kind: poise::serenity_prelude::PermissionOverwriteType::Role(
                            poise::serenity_prelude::RoleId::new(role_id),
                        ),
                    },
                )
                .await
                .is_err()
            {
                errors += 1;
            } else {
                done += 1;
            }
        }
    }
    if unhide {
        ctx.say(
            crate::lang::get(&code, "channel_unhideall_success")
                .map(|s| {
                    s.replace("{unhiddenCount}", &done.to_string())
                        .replace("{errorCount}", &errors.to_string())
                })
                .unwrap_or_else(|| "Unhid all.".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&code, "channel_hideall_success")
                .map(|s| {
                    s.replace("{hiddenCount}", &done.to_string())
                        .replace("{errorCount}", &errors.to_string())
                        .replace("@everyone", &mention)
                })
                .unwrap_or_else(|| "Hid all.".to_string()),
        )
        .await?;
    }
    Ok(())
}

/// Hide/unhide every text channel. Mirrors chanel hideall/unhideall.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "hideall",
    aliases("masquer-tout"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn chan_hideall(
    ctx: Ctx<'_>,
    #[description = "Role, defaults to @everyone"] role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| ctx.guild_id().map(|g| g.get()).unwrap_or_default());
    hide_all_inner(&ctx, false, role_id).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unhideall",
    aliases("démasquer-tout", "demasquer-tout"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn chan_unhideall(
    ctx: Ctx<'_>,
    #[description = "Role, defaults to @everyone"] role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let role_id = role
        .as_ref()
        .map(|r| r.id.get())
        .unwrap_or_else(|| ctx.guild_id().map(|g| g.get()).unwrap_or_default());
    hide_all_inner(&ctx, true, role_id).await
}

/// Slowmode. Mirrors util cooldown (!cooldown.ts) + unslowmode bridge.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "slowmode",
    aliases("unslowmode", "setcooldown", "coldown", "slow")
)]
pub async fn slowmode(
    ctx: Ctx<'_>,
    #[description = "Seconds (0-21600)"] seconds: Option<i64>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let secs = seconds.unwrap_or(0).clamp(0, 21600) as u16;
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditChannel::new().rate_limit_per_user(secs),
        )
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "util_cooldown_command_ok")
            .map(|s| s.replace("${duration_in_string}", &format!("{secs}s")))
            .unwrap_or_else(|| format!("Slowmode {secs}s.")),
    )
    .await?;
    Ok(())
}

/// Recreate a channel now (clone + delete). Mirrors !renew.ts manual path.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renew",
    aliases("r", "rnw"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn renew(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let ch = match channel {
        Some(c) => c,
        None => match ctx.guild_channel().await {
            Some(c) => c.clone(),
            None => return Ok(()),
        },
    };
    let mut builder = poise::serenity_prelude::CreateChannel::new(ch.name.clone()).kind(ch.kind);
    if let Some(parent) = ch.parent_id {
        builder = builder.category(parent);
    }
    let new_ch = guild_id.create_channel(ctx.http(), builder).await?;
    ch.id.delete(ctx.http()).await?;
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

/// Sync a category's overwrites to its children. Mirrors !sync.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "sync",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn syncchan(
    ctx: Ctx<'_>,
    #[description = "Category"] category: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let Some(cat) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&category.id).cloned())
    else {
        return Ok(());
    };
    let overwrites = cat.permission_overwrites.clone();
    let children: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.parent_id == Some(category.id))
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    let mut n = 0;
    for child in children {
        let mut ok = true;
        for ow in &overwrites {
            if child
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: ow.allow,
                        deny: ow.deny,
                        kind: ow.kind,
                    },
                )
                .await
                .is_err()
            {
                ok = false;
            }
        }
        if ok {
            n += 1;
        }
    }
    ctx.say(format!("Synced {n} channels.")).await?;
    Ok(())
}

/// Media-only channel toggle. Mirrors !media-only.ts (flattened to a toggle).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "media-only",
    aliases("piconly", "mediaonly"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn media_only(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.picOnly").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = channel.id.get().to_string();
    let msg = if let Some(pos) = list.iter().position(|c| c == &id) {
        list.remove(pos);
        "Media-only off."
    } else {
        list.push(id);
        "Media-only on."
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.picOnly",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say(msg).await?;
    Ok(())
}
