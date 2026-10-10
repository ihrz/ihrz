use super::*;

/// Distribute voice members across a category. Mirrors util !bringall.ts.
// Takes `from` (source voice channel) + `category` options, shuffles the
// members, then moves them round-robin with moved/error counts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "bringall",
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn bringall(
    ctx: Ctx<'_>,
    #[description = "Source voice channel to move members from"]
    #[channel_types("Voice")]
    from: poise::serenity_prelude::GuildChannel,
    #[description = "Category with voice channels to distribute members to"]
    #[channel_types("Category")]
    category: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude::ChannelType;

    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;

    if from.kind != ChannelType::Voice && from.kind != ChannelType::Stage {
        ctx.say(fill_simple(
            &code,
            "bringall_no_from_channel",
            "Please specify a source voice channel.",
        ))
        .await?;
        return Ok(());
    }
    if category.kind != ChannelType::Category {
        ctx.say(fill_simple(
            &code,
            "bringall_invalid_category",
            "Please specify a valid category.",
        ))
        .await?;
        return Ok(());
    }

    let targets: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            let mut ids: Vec<_> = g
                .channels
                .values()
                .filter(|c| {
                    c.parent_id == Some(category.id)
                        && (c.kind == ChannelType::Voice || c.kind == ChannelType::Stage)
                })
                .map(|c| c.id)
                .collect();
            ids.sort_unstable();
            ids
        })
        .unwrap_or_default();
    if targets.is_empty() {
        ctx.say(fill_simple(
            &code,
            "bringall_no_voice_channels",
            "The specified category contains no voice channels.",
        ))
        .await?;
        return Ok(());
    }

    let mut members: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id == Some(from.id))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    if members.is_empty() {
        ctx.say(fill_simple(
            &code,
            "bringall_no_members",
            "There are no members in the source voice channel.",
        ))
        .await?;
        return Ok(());
    }

    // Shuffle members randomly, then distribute round-robin.
    // Mirrors `membersToMove.sort(() => Math.random() - 0.5)`.
    {
        use rand::seq::SliceRandom;
        members.shuffle(&mut rand::thread_rng());
    }
    let mut moved = 0u64;
    let mut errors = 0u64;
    for (i, uid) in members.iter().enumerate() {
        let target = targets[i % targets.len()];
        if guild_id.move_member(ctx.http(), *uid, target).await.is_ok() {
            moved += 1;
        } else {
            errors += 1;
        }
    }

    ctx.say(fill_bringall_results(
        &code,
        &format!("<@{}>", ctx.author().id.get()),
        moved,
        errors,
        &format!("<#{}>", from.id.get()),
        &format!("<#{}>", category.id.get()),
        targets.len() as u64,
    ))
    .await?;
    Ok(())
}

fn fill_simple(code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
}

/// Round-robin target index for member `i` across `channel_count` channels.
/// Mirrors `targetVoiceChannels[i % targetVoiceChannels.length]`.
pub fn round_robin_target(i: usize, channel_count: usize) -> Option<usize> {
    if channel_count == 0 {
        return None;
    }
    Some(i % channel_count)
}

/// Fill `bringall_results`
/// (`${interaction.user}`, `${movedCount}`, `${errorCount}`,
/// `${fromChannel}`, `${category}`, `${channelCount}`).
pub fn fill_bringall_results(
    code: &str,
    user_mention: &str,
    moved: u64,
    errors: u64,
    from_channel: &str,
    category: &str,
    channel_count: u64,
) -> String {
    crate::lang::get(code, "bringall_results")
        .unwrap_or_else(|| "${interaction.user}, iHorizon has distributed members across voice channels.\n\n**${movedCount}** member(s) were successfully moved from ${fromChannel} to ${channelCount} channels in ${category}.\n**${errorCount}** member(s) could not be moved (see the server logs for details).".to_string())
        .replace("${interaction.user}", user_mention)
        .replace("${movedCount}", &moved.to_string())
        .replace("${errorCount}", &errors.to_string())
        .replace("${fromChannel}", from_channel)
        .replace("${category}", category)
        .replace("${channelCount}", &channel_count.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_robin_wraps() {
        assert_eq!(round_robin_target(0, 3), Some(0));
        assert_eq!(round_robin_target(4, 3), Some(1));
        assert_eq!(round_robin_target(7, 1), Some(0));
        assert_eq!(round_robin_target(0, 0), None);
    }

    #[test]
    fn results_fill_replaces_all_placeholders() {
        let out = fill_bringall_results("xx-unknown", "<@9>", 5, 2, "<#11>", "<#22>", 3);
        assert!(out.contains("<@9>"));
        assert!(out.contains("**5**"));
        assert!(out.contains("**2**"));
        assert!(out.contains("<#11>"));
        assert!(out.contains("<#22>"));
        assert!(out.contains("3 channels"));
        assert!(!out.contains("${"));
    }
}
