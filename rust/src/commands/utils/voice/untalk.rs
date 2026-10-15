use super::talk::{member_bypasses_talk, post_util_log};
use super::*;

/// Disable talk mode and unmute everyone.
// Mirrors !untalk.ts (the TS filename is swapped relative to behavior:
// `untalk` mutes with the `util_talk_*` keys and sets
// `UTILS.VOICE_TALK`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "untalk",
    aliases("unmutetalk"),
    default_member_permissions = "MUTE_MEMBERS | MOVE_MEMBERS",
    description_localized("fr", "Désactiver le mode talk et démute tout le monde"),
    description_localized("ja", "トークモードを無効化して全員のミュートを解除"),
    description_localized("ru", "Отключить режим разговора и размутить всех"),
    description_localized("es-ES", "Deshabilitar el modo de conversación y desilenciar a todos")
)]
pub async fn untalk(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let author_id = ctx.author().id;
    // Invoker must sit in a voice-kind channel (TS !untalk.ts:50-57).
    let channel_id = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&author_id)
            .and_then(|v| v.channel_id)
            .filter(|id| {
                g.channels
                    .get(id)
                    .map(|c| c.kind == serenity::ChannelType::Voice)
                    .unwrap_or(false)
            })
    });
    let Some(channel_id) = channel_id else {
        ctx.say(t("util_talk_not_in_vc")).await?;
        return Ok(());
    };
    // Channel members from the cache (TS iterates voiceChannel.members:
    // zero fetches). Bots and self are dropped silently; privileged
    // members count as skipped.
    let cache = ctx.serenity_context().cache.clone();
    let audit = t("util_talk_audit_reason");
    let mut muted = 0u64;
    let mut skipped = 0u64;
    let targets: Vec<serenity::UserId> = cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(channel_id))
                .map(|(uid, _)| *uid)
                .filter(|uid| *uid != author_id)
                .collect()
        })
        .unwrap_or_default();
    for uid in targets {
        let member = cache
            .guild(guild_id)
            .and_then(|g| g.members.get(&uid).cloned());
        let Some(member) = member else {
            continue;
        };
        if member.user.bot {
            continue;
        }
        if member_bypasses_talk(&ctx, guild_id, &member) {
            skipped += 1;
            continue;
        }
        if guild_id
            .edit_member(
                ctx.http(),
                uid,
                serenity::EditMember::new()
                    .mute(true)
                    .audit_log_reason(&audit),
            )
            .await
            .is_ok()
        {
            muted += 1;
        }
    }
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "UTILS.VOICE_TALK",
        &serde_json::json!({
            "channelId": channel_id.get().to_string(),
            "enabledBy": author_id.get().to_string(),
            "createdAt": crate::commands::shared::now_ms(),
        })
        .to_string(),
    )
    .await?;
    let channel_mention = format!("<#{}>", channel_id.get());
    let invoker = ctx.author().to_string();
    post_util_log(
        &ctx,
        guild_id,
        t("util_talk_logs_title"),
        fill_log(
            &t("util_talk_logs_description"),
            &invoker,
            &channel_mention,
            muted,
            skipped,
        ),
    )
    .await;
    ctx.say(fill_reply(
        &t("util_talk_command_work"),
        &channel_mention,
        muted,
        skipped,
    ))
    .await?;
    Ok(())
}

/// Fill the mute log template.
pub fn fill_log(template: &str, invoker: &str, channel: &str, muted: u64, skipped: u64) -> String {
    template
        .replace("${interaction.member.user.toString()}", invoker)
        .replace("${voiceChannel.toString()}", channel)
        .replace("${mutedCount}", &muted.to_string())
        .replace("${skippedCount}", &skipped.to_string())
}

/// Fill the mute reply template.
pub fn fill_reply(template: &str, channel: &str, muted: u64, skipped: u64) -> String {
    template
        .replace("${voiceChannel.toString()}", channel)
        .replace("${mutedCount}", &muted.to_string())
        .replace("${skippedCount}", &skipped.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_log("${interaction.member.user.toString()} muted ${mutedCount} in ${voiceChannel.toString()} skipped ${skippedCount}", "<@1>", "<#2>", 3, 1),
            "<@1> muted 3 in <#2> skipped 1"
        );
        assert_eq!(
            fill_reply(
                "Talk in ${voiceChannel.toString()}: ${mutedCount} muted, ${skippedCount} skipped.",
                "<#2>",
                3,
                1
            ),
            "Talk in <#2>: 3 muted, 1 skipped."
        );
    }
}
