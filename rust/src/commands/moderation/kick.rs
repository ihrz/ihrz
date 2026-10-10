use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "kick",
    default_member_permissions = "KICK_MEMBERS"
)]
pub async fn mod_kick(
    ctx: Ctx<'_>,
    #[description = "Member"] member: serenity::User,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS defaults to the guild punishPub text, never empty.
    let reason = reason.unwrap_or_else(|| t("guildprofil_not_set_punishPub"));
    let no = emoji(&ctx, "No", "❌").await;
    let stop = emoji(&ctx, "Stop", "⛔").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.kick_members() {
            ctx.say(t("kick_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
                .await?;
            return Ok(());
        }
    }
    if member.id == ctx.author().id {
        ctx.say(t("kick_attempt_kick_your_self").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let guild_member = guild_id.member(ctx.http(), member.id).await.ok();
    let Some(guild_member) = guild_member else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    if let Some(target_pos) = target_top(&ctx, guild_id, member.id).await {
        let author_top = guards.as_ref().map(|g| g.author_top).unwrap_or(u16::MAX);
        let author_id = ctx.author().id.get();
        let owner = guards.as_ref().map(|g| g.owner_id).unwrap_or(author_id);
        // TS kick uses strict `<`.
        if author_top < target_pos && owner != author_id {
            ctx.say(
                t("kick_attempt_kick_higter_member")
                    .replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
    }
    let guild_name = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.name.clone())
        .unwrap_or_default();
    let _ = guild_member
        .user
        .clone()
        .direct_message(
            ctx.http(),
            serenity::CreateMessage::new().content(
                t("kick_message_to_the_banned_member")
                    .replace("${interaction.guild.name}", &guild_name)
                    .replace("${interaction.member.user.username}", &ctx.author().name),
            ),
        )
        .await;
    let audit = format!("Kicked by: {} | Reason: {reason}", ctx.author().name);
    if guild_id
        .kick_with_reason(ctx.http(), member.id, &audit)
        .await
        .is_err()
    {
        ctx.say(t("setrankroles_command_error").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    // Success embed mirrors !kick.ts:137-169 (title + member/author/reason
    // fields + branded footer), not the legacy plain-text key.
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed = crate::commands::utils::embed_with_footer(
        serenity::CreateEmbed::default()
            .title(t("setjoinroles_var_perm_kick_members"))
            .field(t("var_member"), member.to_string(), true)
            .field(t("var_author"), ctx.author().to_string(), true)
            .field(t("var_reason"), reason, true),
        &footer_name,
        footer_bytes.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("kick_logs_embed_title"),
        t("kick_logs_embed_description")
            .replace("${member.user}", &member.to_string())
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
    )
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts kick options: member, reason.
        let cmd = mod_kick();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["member", "reason"]);
    }
}
