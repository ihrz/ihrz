use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ban",
    aliases("addban", "createban"),
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_ban(
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
    // Bot needs BanMembers. Mirrors ban_dont_have_perm_myself.
    if let Some(g) = &guards {
        if !g.bot_perms.ban_members() {
            ctx.say(t("ban_dont_have_perm_myself").replace("${client.iHorizon_Emojis.No}", &no))
                .await?;
            return Ok(());
        }
    }
    if member.id == ctx.author().id {
        ctx.say(t("ban_try_to_ban_yourself").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    if let Some(target_pos) = target_top(&ctx, guild_id, member.id).await {
        let guards = guards.as_ref();
        let author_top = guards.map(|g| g.author_top).unwrap_or(u16::MAX);
        let author_id = ctx.author().id.get();
        let owner = guards.map(|g| g.owner_id).unwrap_or(author_id);
        // TS ban uses `<=` (stricter than kick).
        if author_top <= target_pos && owner != author_id {
            ctx.say(
                t("ban_attempt_ban_higter_member").replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
        // `bannable`: the bot's top role must outrank the target.
        if guards.map(|g| g.bot_top <= target_pos).unwrap_or(false) {
            ctx.say(t("ban_cant_ban_member").replace("${client.iHorizon_Emojis.No}", &no))
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
    dm_best_effort(
        ctx.http(),
        &member,
        t("ban_message_to_the_banned_member")
            .replace("${interaction.guild.name}", &guild_name)
            .replace("${reason}", &reason),
    )
    .await;
    // Audit reason. Mirrors `Banned by: ... | Reason: ...`.
    let by = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    let audit = format!("Banned by: {by} | Reason: {reason}");
    if guild_id
        .ban_with_reason(ctx.http(), member.id, 0, &audit)
        .await
        .is_err()
    {
        ctx.say(t("setrankroles_command_error").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let author_id = ctx.author().id.get().to_string();
    ctx.say(
        crate::lang::get(&code, "ban_command_work")
            .map(|s| {
                s.replace("${member.user.id}", &member.id.get().to_string())
                    .replace("${interaction.member.id}", &author_id)
            })
            .unwrap_or_else(|| format!("Banned {} ({reason})", member.tag())),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("ban_logs_embed_title"),
        t("ban_logs_embed_description")
            .replace("${member.user.id}", &member.id.get().to_string())
            .replace("${interaction.member.id}", &author_id),
    )
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts ban options: member, reason.
        let cmd = mod_ban();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["member", "reason"]);
    }
}
