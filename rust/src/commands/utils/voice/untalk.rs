use super::talk::post_util_log;
use super::*;

/// Disable talk mode and unmute everyone.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "untalk",
    aliases("unmutetalk"),
    default_member_permissions = "MUTE_MEMBERS"
)]
pub async fn untalk(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let raw = crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.VOICE_TALK").await;
    let stored: Option<String> = raw
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| {
            v.get("channelId")
                .and_then(|c| c.as_str())
                .map(str::to_string)
        });
    // Stored channel wins; otherwise the invoker's current channel.
    // A stored id pointing at a missing/non-voice channel clears the
    // store and reports nothing-active, like the TS.
    let mut channel_id = stored
        .as_deref()
        .and_then(|s| s.parse::<u64>().ok())
        .map(serenity::ChannelId::new);
    if channel_id.is_none() {
        channel_id = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
            g.voice_states
                .get(&ctx.author().id)
                .and_then(|v| v.channel_id)
        });
        if channel_id.is_none() {
            ctx.say(t("util_not_in_vc")).await?;
            return Ok(());
        }
    }
    let channel_id = channel_id.expect("channel resolved");
    let is_voice = channel_id
        .to_channel(ctx.http())
        .await
        .map(|c| {
            matches!(
                c,
                serenity::Channel::Guild(ref g)
                    if g.kind == serenity::ChannelType::Voice
            )
        })
        .unwrap_or(false);
    if !is_voice {
        let _ =
            crate::commands::owner::main::routed_del(pool, &gid, &gid, "UTILS.VOICE_TALK").await;
        ctx.say(t("util_untalk_nothing_active")).await?;
        return Ok(());
    }
    let targets: Vec<serenity::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(channel_id))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    let audit = t("util_untalk_audit_reason");
    let mut unmuted = 0u64;
    for uid in targets {
        let Ok(mut member) = guild_id.member(ctx.http(), uid).await else {
            continue;
        };
        if member.user.bot {
            continue;
        }
        if member
            .edit(
                ctx.http(),
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

/// Fill the untalk log template.
pub fn fill_log(template: &str, invoker: &str, channel: &str, unmuted: u64) -> String {
    template
        .replace("${interaction.member.user.toString()}", invoker)
        .replace("${voiceChannel.toString()}", channel)
        .replace("${unmutedCount}", &unmuted.to_string())
}

/// Fill the untalk reply template.
pub fn fill_reply(template: &str, channel: &str, unmuted: u64) -> String {
    template
        .replace("${voiceChannel.toString()}", channel)
        .replace("${unmutedCount}", &unmuted.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

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
