use super::*;
use poise::serenity_prelude as serenity;

/// Ban a user!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ban",
    aliases("addban", "createban"),
    default_member_permissions = "BAN_MEMBERS",
    description_localized("fr", "Bannir un utilisateur"),
    description_localized("ja", "ユーザーをバン！"),
    description_localized("ru", "Забанить пользователя!"),
    description_localized("es-ES", "Banear a un usuario!")
)]
pub async fn mod_ban(
    ctx: Ctx<'_>,
    // Optional here (TS `method.user` can return null on prefix), but
    // the slash option stays effectively required: a missing entity is
    // answered with the TS `ban_dont_found_member` reply below.
    #[description_localized("fr", "le membre que vous souhaitez bannir")]
    #[description_localized("ja", "バンしたいメンバー")]
    #[description_localized("ru", "участник для бана")]
    #[description_localized("es-ES", "el miembro que quieres banear")]
    #[description = "the member you want to ban"]
    member: Option<serenity::User>,
    #[description_localized("fr", "la raison du ban")]
    #[description_localized("ja", "バンの理由")]
    #[description_localized("ru", "причина бана")]
    #[description_localized("es-ES", "la razón del baneo")]
    #[description = "the reason of the bannisement"]
    reason: Option<String>,
) -> Result<(), anyhow::Error> {
    // Ack first: mod.ts sets `thinking: true`, so TS defers the slash
    // reply before running; defer here for the same 3s window.
    ctx.defer().await?;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some(member) = member else {
        // Mirrors `if (!member)` in !ban.ts.
        reply_member_not_found(
            &ctx,
            &code,
            "ban_dont_found_member",
            "🔍 | Cannot find this member",
        )
        .await?;
        return Ok(());
    };
    // TS `if (!reason)`: null or empty falls back to the guild punishPub
    // text, never empty (method.longString yields null when absent).
    let reason = reason
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| t("guildprofil_not_set_punishPub"));
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
        // `bannable` (discord.js v14 folds `manageable` in): the bot's top
        // role must strictly outrank the target, and the guild owner is
        // never bannable even with a low top role.
        if member.id.get() == owner || guards.map(|g| g.bot_top <= target_pos).unwrap_or(false) {
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
    // Success embed mirrors !ban.ts:143-180 (title + member/author/reason
    // fields + branded footer), not the legacy plain-text key.
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    // No icon means plain footer text (never an empty-string icon_url);
    // the file is attached below only when the footer references it.
    let embed_base = serenity::CreateEmbed::default()
        .title(t("setjoinroles_var_perm_ban_members"))
        .field(t("var_member"), member.to_string(), true)
        .field(t("var_author"), ctx.author().to_string(), true)
        .field(t("var_reason"), reason, true);
    let embed = if footer_bytes.is_some() {
        crate::commands::utils::embed_with_footer(embed_base, &footer_name, true)
    } else {
        embed_base.footer(serenity::CreateEmbedFooter::new(footer_name.clone()))
    };
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
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
