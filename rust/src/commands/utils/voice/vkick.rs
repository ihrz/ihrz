use super::talk::post_util_log;
use super::*;

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
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Member must be in the guild.
    let Ok(member) = guild_id.member(ctx.http(), user.id).await else {
        ctx.say(t("vkick_member_not_in_guild")).await?;
        return Ok(());
    };
    // Member must be in a voice channel.
    let channel_id = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&user.id).and_then(|v| v.channel_id));
    let Some(channel_id) = channel_id else {
        ctx.say(t("vkick_not_in_vc")).await?;
        return Ok(());
    };
    // Administrators cannot be voice-kicked. Mirrors the TS guard.
    if is_guild_admin(&ctx, guild_id, &member) {
        ctx.say(t("vkick_not_admin_kick")).await?;
        return Ok(());
    }
    if guild_id
        .disconnect_member(ctx.http(), user.id)
        .await
        .is_err()
    {
        ctx.say(t("vkick_not_in_vc")).await?;
        return Ok(());
    }
    let channel_mention = format!("<#{}>", channel_id.get());
    let invoker = ctx.author().to_string();
    let target = user.to_string();
    post_util_log(
        &ctx,
        guild_id,
        t("vkick_logEmbed_title"),
        fill_log(
            &t("vkick_logEmbed_desc"),
            &invoker,
            &target,
            &channel_mention,
        ),
    )
    .await;
    ctx.say(fill_reply(
        &t("vkick_command_work"),
        &invoker,
        &target,
        &channel_mention,
    ))
    .await?;
    Ok(())
}

/// Fill the vkick log template.
pub fn fill_log(template: &str, invoker: &str, target: &str, channel: &str) -> String {
    template
        .replace("${interaction.member.user.toString()}", invoker)
        .replace("${member.toString()}", target)
        .replace("${voiceChannel?.toString()}", channel)
}

/// Fill the vkick reply template.
pub fn fill_reply(template: &str, invoker: &str, target: &str, channel: &str) -> String {
    template
        .replace("${interaction.member.user.toString()}", invoker)
        .replace("${member.toString()}", target)
        .replace("${voiceChannel?.toString()}", channel)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_log("${interaction.member.user.toString()} kicked ${member.toString()} from ${voiceChannel?.toString()}", "<@1>", "<@2>", "<#3>"),
            "<@1> kicked <@2> from <#3>"
        );
        assert_eq!(
            fill_reply("${interaction.member.user.toString()} ok ${member.toString()} ${voiceChannel?.toString()}", "<@1>", "<@2>", "<#3>"),
            "<@1> ok <@2> <#3>"
        );
    }
}
