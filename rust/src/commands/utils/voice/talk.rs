use super::*;

/// Post a utils audit embed to the `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs`; silent when absent.
pub(super) async fn post_util_log(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    title: String,
    description: String,
) {
    let Ok(channels) = guild_id.channels(ctx.http()).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(description);
    let _ = serenity::ChannelId::new(log_id)
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Enable talk mode in your current voice channel.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "talk",
    aliases("mutetalk"),
    default_member_permissions = "MUTE_MEMBERS"
)]
pub async fn talk(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let author_id = ctx.author().id;
    let channel_id = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&author_id).and_then(|v| v.channel_id));
    let Some(channel_id) = channel_id else {
        ctx.say(t("util_talk_not_in_vc")).await?;
        return Ok(());
    };
    // Everyone else in the channel: skip bots and privileged members
    // (Administrator / ManageChannels), mute the rest.
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
    let audit = t("util_talk_audit_reason");
    let mut muted = 0u64;
    let mut skipped = 0u64;
    for uid in targets {
        if uid == author_id {
            continue;
        }
        let Ok(mut member) = guild_id.member(ctx.http(), uid).await else {
            continue;
        };
        if member.user.bot {
            continue;
        }
        if member_bypasses_talk(&ctx, guild_id, &member) {
            skipped += 1;
            continue;
        }
        if member
            .edit(
                ctx.http(),
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
    let gid = guild_id.get().to_string();
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

/// Administrator / ManageChannels members are skipped, never muted.
/// Mirrors the TS permissions filter.
fn member_bypasses_talk(
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

/// Pure skip rule, unit-tested.
pub fn bypasses_talk_mute(perms: serenity::Permissions) -> bool {
    perms.administrator() || perms.manage_channels()
}

/// Fill the talk log template.
pub fn fill_log(template: &str, invoker: &str, channel: &str, muted: u64, skipped: u64) -> String {
    template
        .replace("${interaction.member.user.toString()}", invoker)
        .replace("${voiceChannel.toString()}", channel)
        .replace("${mutedCount}", &muted.to_string())
        .replace("${skippedCount}", &skipped.to_string())
}

/// Fill the talk reply template.
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
    fn privileged_members_are_skipped() {
        assert!(bypasses_talk_mute(serenity::Permissions::ADMINISTRATOR));
        assert!(bypasses_talk_mute(serenity::Permissions::MANAGE_CHANNELS));
        assert!(!bypasses_talk_mute(serenity::Permissions::empty()));
        assert!(!bypasses_talk_mute(serenity::Permissions::MUTE_MEMBERS));
    }

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
