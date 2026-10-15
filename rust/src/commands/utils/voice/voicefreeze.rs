use super::talk::post_util_log;
use super::*;

/// Freeze access to your current voice channel
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "freeze",
    aliases("voicefreeze", "vcfreeze"),
    default_member_permissions = "MOVE_MEMBERS",
    description_localized("fr", "Geler l'accès à votre salon vocal actuel"),
    description_localized("ja", "現在のボイスチャンネルへのアクセスを凍結"),
    description_localized("ru", "Заморозить доступ к текущему голосовому каналу"),
    description_localized("es-ES", "Congelar el acceso a tu canal de voz actual")
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
    // Freeze requires a GuildVoice channel (!freeze.ts:50, Stage rejected);
    // mirror the kind gate.
    let is_voice = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.channels.get(&channel_id).map(|c| c.kind))
        == Some(poise::serenity_prelude::ChannelType::Voice);
    if !is_voice {
        ctx.say(
            crate::lang::get(&code, "util_not_in_vc")
                .unwrap_or_else(|| "The members are not in a voice channel".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
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
    let channel_mention = format!("<#{}>", channel_id.get());
    post_util_log(
        &ctx,
        guild_id,
        crate::lang::get(&code, "util_freeze_logs_title").unwrap_or_default(),
        fill_log(
            &crate::lang::get(&code, "util_freeze_logs_description").unwrap_or_default(),
            &ctx.author().to_string(),
            &channel_mention,
        ),
    )
    .await;
    ctx.say(
        crate::lang::get(&code, "util_freeze_command_work")
            .map(|s| s.replace("${voiceChannel.toString()}", &channel_mention))
            .unwrap_or_else(|| {
                "The voice channel ${voiceChannel.toString()} is now frozen.".to_string()
            }),
    )
    .await?;
    Ok(())
}

/// Fill the freeze log template.
pub fn fill_log(template: &str, invoker: &str, channel: &str) -> String {
    template
        .replace("${interaction.member.user.toString()}", invoker)
        .replace("${voiceChannel.toString()}", channel)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_template_fills() {
        assert_eq!(
            fill_log(
                "${interaction.member.user.toString()} froze ${voiceChannel.toString()}",
                "<@1>",
                "<#2>"
            ),
            "<@1> froze <#2>"
        );
    }
}
