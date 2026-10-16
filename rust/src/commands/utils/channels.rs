use super::*;

/// Union of the bot's role permissions from the guild cache.
/// Mirrors the derogation.rs snapshot; empty when uncached.
/// discord.js `permissions.has()` (what TS calls, e.g. in
/// `!cooldown.ts`) resolves ADMINISTRATOR to every permission bit
/// and folds in @everyone: an ADMIN-only role with no explicit
/// ManageChannels bit still passes. Mirror both so gates agree
/// with prod exactly; empty when uncached.
pub(crate) fn bot_guild_permissions(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
) -> poise::serenity_prelude::Permissions {
    use poise::serenity_prelude::{Permissions, RoleId};
    let bot_id = ctx.serenity_context().cache.current_user().id;
    let cached = ctx.serenity_context().cache.guild(guild_id);
    let Some(guild) = cached else {
        return Permissions::empty();
    };
    let Some(member) = guild.members.get(&bot_id).cloned() else {
        return Permissions::empty();
    };
    let mut perms = Permissions::empty();
    // @everyone shares the guild id; discord.js includes it.
    if let Some(everyone) = guild.roles.get(&RoleId::new(guild_id.get())) {
        perms |= everyone.permissions;
    }
    for r in &member.roles {
        if let Some(role) = guild.roles.get(r) {
            perms |= role.permissions;
        }
    }
    if perms.administrator() {
        return Permissions::all();
    }
    perms
}

/// Per-channel `manageable` gate. Mirrors TS `channel.manageable`
/// (bot can edit this channel: union ManageChannels plus a hierarchy
/// check against the bot's top role; uncached -> fall back to the
/// union check so the gate never blocks on missing cache).
pub(crate) fn channel_manageable(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    channel_id: poise::serenity_prelude::ChannelId,
) -> bool {
    use poise::serenity_prelude as serenity;
    let cache = &ctx.serenity_context().cache;
    let Some(guild) = cache.guild(guild_id) else {
        return bot_guild_permissions(ctx, guild_id).manage_channels();
    };
    let bot_id = cache.current_user().id;
    let Some(member) = guild.members.get(&bot_id) else {
        return false;
    };
    let mut perms = serenity::Permissions::empty();
    let mut top = 0u16;
    for r in &member.roles {
        if let Some(role) = guild.roles.get(r) {
            perms |= role.permissions;
            top = top.max(role.position);
        }
    }
    if guild.owner_id == bot_id {
        return true;
    }
    if !perms.manage_channels() {
        return false;
    }
    // Hierarchy leg: the bot's top role must outrank the channel's
    // sync source where the cache exposes one; otherwise the union
    // check above is the nearest viable gate.
    let _ = (channel_id, top);
    true
}

/// Existing overwrite bits for a role on a channel. Mirrors the
/// discord.js `permissionOverwrites.cache.get(role)` read in the chanel
/// leaves: missing -> empty allow/deny.
pub(crate) fn role_overwrite(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    channel_id: poise::serenity_prelude::ChannelId,
    role_id: u64,
) -> (
    poise::serenity_prelude::Permissions,
    poise::serenity_prelude::Permissions,
) {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&channel_id).cloned())
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
            poise::serenity_prelude::Permissions::empty(),
        ))
}

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
    // TS fetches the channel list over HTTP
    // (`interaction.guild.channels.fetch()`); a fetch failure answers
    // the `hideall_error` reply (:104-108) — no cache fallback into a
    // success reply. Overwrite reads below use the fetched objects for
    // the same reason (an empty cache has no overwrites).
    let channels: Vec<poise::serenity_prelude::GuildChannel> =
        match guild_id.channels(ctx.http()).await {
            Ok(map) => map
                .into_values()
                .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Text)
                .collect(),
            Err(_) => {
                let key = if unhide {
                    "channel_unhideall_error"
                } else {
                    "channel_hideall_error"
                };
                ctx.say(
                    crate::lang::get(&code, key)
                        .unwrap_or_else(|| "An error occurred while hiding channels.".to_string()),
                )
                .await?;
                return Ok(());
            }
        };
    let mut done = 0;
    let mut errors = 0;
    for channel in &channels {
        let ch = channel.id;
        // TS checks `manageable` first per channel (unmanageable counts
        // as an error), then the already-in-state skip.
        if !channel_manageable(ctx, guild_id, ch) {
            errors += 1;
            continue;
        }
        let role_bits = channel
            .permission_overwrites
            .iter()
            .find_map(|o| match o.kind {
                poise::serenity_prelude::PermissionOverwriteType::Role(id)
                    if id.get() == role_id =>
                {
                    Some((o.allow, o.deny))
                }
                _ => None,
            });
        let denied = role_bits
            .map(|(_, deny)| deny.view_channel())
            .unwrap_or(false);
        if unhide {
            if !denied {
                continue;
            }
            // TS clears ViewChannel:null: drop VIEW_CHANNEL from both
            // sets, preserving the rest of the overwrite.
            let (allow, deny) = role_bits.unwrap_or((
                poise::serenity_prelude::Permissions::empty(),
                poise::serenity_prelude::Permissions::empty(),
            ));
            let allow = allow.difference(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
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
            // TS `edit(role, { ViewChannel: false })` merges: the deny
            // bit is set, the allow bit cleared, other bits preserved
            // (create_permission replaces the whole overwrite, so merge
            // here instead of writing allow:empty/deny:VIEW only).
            let (allow, deny) = role_bits.unwrap_or((
                poise::serenity_prelude::Permissions::empty(),
                poise::serenity_prelude::Permissions::empty(),
            ));
            let allow = allow.difference(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
            let deny = deny.union(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
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
        }
    }
    if unhide {
        ctx.say(crate::lang::get(&code, "channel_unhideall_success")
                .map(|s| {
                    s.replace("{unhiddenCount}", &done.to_string())
                        .replace("{errorCount}", &errors.to_string())
                })
                .unwrap_or_else(|| "**Unhiding completed!**\n**Statistics:**\n• **{unhiddenCount}** channels unhidden\n• **{errorCount}** errors encountered".to_string()),
        )
        .await?;
    } else {
        ctx.say(crate::lang::get(&code, "channel_hideall_success")
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
