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
            .unwrap_or_else(|| "Unhiding all channels in progress...".to_string())
    } else {
        crate::lang::get(&code, "channel_hideall_in_progress")
            .unwrap_or_else(|| "Hiding all channels in progress...".to_string())
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
                .unwrap_or_else(|| "**Unhiding completed!**\n**Statistics:**\n• **{unhiddenCount}** channels unhidden\n• **{errorCount}** errors encountered".to_string()),
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
                .unwrap_or_else(|| "**Hiding completed!**\n**Statistics:**\n• **{hiddenCount}** channels hidden\n• **{errorCount}** errors encountered".to_string()),
        )
        .await?;
    }
    Ok(())
}

pub mod chan_hide;
pub mod chan_hideall;
pub mod chan_unhide;
pub mod chan_unhideall;
pub mod media_only;
pub mod renew;
pub mod slowmode;
pub mod syncchan;

pub use self::chan_hide::chan_hide;
pub use self::chan_hideall::chan_hideall;
pub use self::chan_unhide::chan_unhide;
pub use self::chan_unhideall::chan_unhideall;
pub use self::media_only::media_only;
pub use self::renew::renew;
pub use self::slowmode::slowmode;
pub use self::syncchan::syncchan;

#[allow(unused_imports)]
pub mod main {
    pub use super::chan_hide::*;
    pub use super::chan_hideall::*;
    pub use super::chan_unhide::*;
    pub use super::chan_unhideall::*;
    pub use super::media_only::*;
    pub use super::renew::*;
    pub use super::slowmode::*;
    pub use super::syncchan::*;
    pub use super::*;
}
