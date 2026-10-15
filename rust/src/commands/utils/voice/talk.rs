use super::*;

/// Post a utils audit embed to the `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs` (cache-only channel lookup,
/// `#bf0bb9` embed color); silent when absent.
pub(super) async fn post_util_log(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    title: String,
    description: String,
) {
    let list: Vec<(u64, String)> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .map(|c| (c.id.get(), c.name.clone()))
                .collect()
        })
        .unwrap_or_default();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(description)
        .colour(0xBF0BB9_u32);
    let _ = serenity::ChannelId::new(log_id)
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Kind of a guild channel from the cache (`None` when uncached).
fn cached_channel_kind(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    channel_id: serenity::ChannelId,
) -> Option<serenity::ChannelType> {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&channel_id).map(|c| c.kind))
}

/// Enable talk mode in your current voice channel.
// Mirrors !talk.ts (the TS filename is swapped relative to behavior:
// `talk` unmutes with the `util_untalk_*` keys and deletes
// `UTILS.VOICE_TALK`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "talk",
    aliases("mutetalk"),
    default_member_permissions = "MUTE_MEMBERS | MOVE_MEMBERS",
    description_localized("fr", "Activer le mode talk dans votre salon vocal actuel"),
    description_localized("ja", "現在のボイスチャンネルでトークモードを有効化"),
    description_localized("ru", "Включить режим разговора в текущем голосовом канале"),
    description_localized("es-ES", "Habilitar el modo de conversación en tu canal de voz actual")
)]
pub async fn talk(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let raw = crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.VOICE_TALK").await;
    let stored: Option<serenity::ChannelId> = raw
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| {
            v.get("channelId")
                .and_then(|c| c.as_str())
                .and_then(|s| s.parse::<u64>().ok())
        })
        .map(serenity::ChannelId::new);
    let current = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    // TS (!talk.ts:58-66): no stored channel and no (voice-kind) current
    // channel answers not_in_vc.
    if stored.is_none()
        && current.and_then(|id| cached_channel_kind(&ctx, guild_id, id))
            != Some(serenity::ChannelType::Voice)
    {
        ctx.say(t("util_not_in_vc")).await?;
        return Ok(());
    }
    // Stored id wins via cache-or-fetch (TS channels.fetch with catch);
    // otherwise the invoker's current channel.
    let target: Option<(serenity::ChannelId, serenity::ChannelType)> = match stored {
        Some(id) => match cached_channel_kind(&ctx, guild_id, id) {
            Some(kind) => Some((id, kind)),
            None => id.to_channel(ctx.http()).await.ok().and_then(|c| match c {
                serenity::Channel::Guild(g) => Some((id, g.kind)),
                _ => None,
            }),
        },
        None => current.and_then(|id| cached_channel_kind(&ctx, guild_id, id).map(|k| (id, k))),
    };
    // Non-voice or unresolvable target clears the store and reports
    // nothing-active (TS !talk.ts:70-76). No invoker-channel fallback.
    let Some((channel_id, serenity::ChannelType::Voice)) = target else {
        let _ =
            crate::commands::owner::main::routed_del(pool, &gid, &gid, "UTILS.VOICE_TALK").await;
        ctx.say(t("util_untalk_nothing_active")).await?;
        return Ok(());
    };
    // Channel members from the cache (TS iterates targetChannel.members:
    // zero fetches). Only bots are skipped — self and privileged members
    // are unmuted too.
    let cache = ctx.serenity_context().cache.clone();
    let targets: Vec<serenity::UserId> = cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(channel_id))
                .map(|(uid, _)| *uid)
                .filter(|uid| g.members.get(uid).map(|m| !m.user.bot).unwrap_or(false))
                .collect()
        })
        .unwrap_or_default();
    let audit = t("util_untalk_audit_reason");
    let mut unmuted = 0u64;
    for uid in targets {
        if guild_id
            .edit_member(
                ctx.http(),
                uid,
                serenity::EditMember::new()
                    .mute(false)
                    .audit_log_reason(&audit),
            )
            .await
            .is_ok()
        {
            unmuted += 1;
        }
    }
    let _ = crate::commands::owner::main::routed_del(pool, &gid, &gid, "UTILS.VOICE_TALK").await;
    let channel_mention = format!("<#{}>", channel_id.get());
    let invoker = ctx.author().to_string();
    post_util_log(
        &ctx,
        guild_id,
        t("util_untalk_logs_title"),
        fill_log(
            &t("util_untalk_logs_description"),
            &invoker,
            &channel_mention,
            unmuted,
        ),
    )
    .await;
    ctx.say(fill_reply(
        &t("util_untalk_command_work"),
        &channel_mention,
        unmuted,
    ))
    .await?;
    Ok(())
}

/// Combined role permissions for one member.
fn combined_perms(
    roles: &std::collections::HashMap<serenity::RoleId, serenity::Role>,
    ids: &[serenity::RoleId],
) -> serenity::Permissions {
    let mut perms = serenity::Permissions::empty();
    for id in ids {
        if let Some(role) = roles.get(id) {
            perms |= role.permissions;
        }
    }
    perms
}

/// Administrator / ManageChannels members are skipped, never muted.
/// Mirrors the TS permissions filter (used by the mute leg).
pub fn bypasses_talk_mute(perms: serenity::Permissions) -> bool {
    perms.administrator() || perms.manage_channels()
}

/// Administrator / ManageChannels check for a cached member.
pub(super) fn member_bypasses_talk(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    member: &serenity::Member,
) -> bool {
    let roles = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.roles.clone())
        .unwrap_or_default();
    bypasses_talk_mute(combined_perms(&roles, &member.roles))
}

/// Fill the unmute log template.
pub fn fill_log(template: &str, invoker: &str, channel: &str, unmuted: u64) -> String {
    template
        .replace("${interaction.member.user.toString()}", invoker)
        .replace("${voiceChannel.toString()}", channel)
        .replace("${unmutedCount}", &unmuted.to_string())
}

/// Fill the unmute reply template.
pub fn fill_reply(template: &str, channel: &str, unmuted: u64) -> String {
    template
        .replace("${voiceChannel.toString()}", channel)
        .replace("${unmutedCount}", &unmuted.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn privileged_members_are_skipped() {
        assert!(bypasses_talk_mute(serenity::Permissions::ADMINISTRATOR));
        assert!(bypasses_talk_mute(serenity::Permissions::MANAGE_CHANNELS));
        assert!(!bypasses_talk_mute(serenity::Permissions::empty()));
        assert!(!bypasses_talk_mute(serenity::Permissions::MUTE_MEMBERS));
    }

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_log("${interaction.member.user.toString()} unmuted ${unmutedCount} in ${voiceChannel.toString()}", "<@1>", "<#2>", 4),
            "<@1> unmuted 4 in <#2>"
        );
        assert_eq!(
            fill_reply(
                "Disabled in ${voiceChannel.toString()}: ${unmutedCount} unmuted.",
                "<#2>",
                4
            ),
            "Disabled in <#2>: 4 unmuted."
        );
    }
}
