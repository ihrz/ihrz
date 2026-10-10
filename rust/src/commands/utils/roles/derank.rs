use super::*;

/// Remove all roles from a member. Mirrors !derank.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "derank",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn derank(
    ctx: Ctx<'_>,
    #[description = "Member (defaults to self on prefix)"] user: Option<
        poise::serenity_prelude::User,
    >,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS prefix falls back to the invoker
    // (`member(...) || interaction.member`); slash has no fallback,
    // so a missing member answers `perm_list_no_user` like TS
    // `if (!member)`.
    let target_id = match user {
        Some(u) => u.id,
        None if matches!(ctx, poise::Context::Prefix(_)) => ctx.author().id,
        None => {
            ctx.say(t("perm_list_no_user")).await?;
            return Ok(());
        }
    };
    let member = match guild_id.member(ctx.http(), target_id).await {
        Ok(m) => m,
        Err(_) => {
            ctx.say(t("perm_list_no_user")).await?;
            return Ok(());
        }
    };
    // Author-hierarchy guard. Mirrors !derank.ts
    // (utils_delrole_highter_or_egal_roles_msg).
    // U7: TS repeats `interaction.guild.ownerId !==
    // interaction.member.user.id` twice under `&&`; the second
    // conjunct is a redundant duplicate, so the single owner bypass
    // below preserves TS semantics exactly.
    let guards = role_guards(&ctx, guild_id).await;
    let author_id = ctx.author().id.get();
    // U2: role_guards is cache-only. On a guild cache-miss the guard
    // inputs fall back to HTTP (guild roles + author member) so the
    // hierarchy check is enforced on fresh data instead of skipped.
    // The target member itself is always HTTP-fetched above, never
    // cache-only.
    let cached_roles = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.roles.clone());
    let guild_roles = match cached_roles {
        Some(r) => Some(r),
        None => ctx
            .http()
            .get_guild_roles(guild_id)
            .await
            .ok()
            .map(|v| v.into_iter().map(|r| (r.id, r)).collect()),
    };
    let owner_id = match guards.as_ref() {
        Some(g) => g.owner_id,
        None => guild_id
            .to_partial_guild(ctx.http())
            .await
            .map(|g| g.owner_id.get())
            .unwrap_or(author_id),
    };
    let mut author_top = guards.as_ref().map(|g| g.author_top).unwrap_or(u16::MAX);
    if guards.is_none() {
        if let Some(ref roles) = guild_roles {
            if let Ok(author_member) = guild_id.member(ctx.http(), ctx.author().id).await {
                author_top = role_top(roles, &author_member.roles);
            }
        }
    }
    let target_top = guild_roles
        .as_ref()
        .map(|roles| role_top(roles, &member.roles));
    if let Some(target_pos) = target_top {
        if author_top <= target_pos && owner_id != author_id {
            let stop = app_emoji(ctx.http(), "Stop", "⛔").await;
            ctx.say(
                t("utils_delrole_highter_or_egal_roles_msg")
                    .replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
    }
    // Never strip @everyone. Mirrors the TS everyone filter.
    let everyone = serenity::RoleId::new(guild_id.get());
    let roles = without_everyone(&member.roles, everyone);
    if roles.is_empty() {
        ctx.say(t("derank_no_role")).await?;
        return Ok(());
    }
    // Immediate progress reply, then batched removal (5/100ms).
    // Mirrors batch_derank_process + processBatchAsync.
    ctx.say(fill_progress(
        &t("batch_derank_process"),
        roles.len(),
        &member.user.name,
    ))
    .await?;
    let http = ctx.http();
    // Batched removal (5/100ms). Mirrors processBatchAsync.
    let mut good = 0usize;
    let mut bad = 0usize;
    let chunks = roles.chunks(5).len();
    for (i, chunk) in roles.chunks(5).enumerate() {
        for role in chunk {
            if member.remove_role(http, *role).await.is_ok() {
                good += 1;
            } else {
                bad += 1;
            }
        }
        if i + 1 < chunks {
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
    }
    let result = crate::funcs::BatchProcessorResult {
        success: good,
        failed: bad,
    };
    // TS parity (`!derank.ts` completion callback): the result embed is
    // always sent, even when every removal failed (good == 0). There
    // is no all-failed early text on the TS path (`derank_msg_failed`
    // is a YAML-only key TS never sends).
    // Final result is a new message (TS interactionSend), with the bot
    // footer like the other batch commands.
    let desc = fill_desc(
        &t("derank_msg_desc_embed"),
        result.success,
        result.failed,
        target_id.get(),
    );
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(2829617_u32)
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Drop @everyone from the strip list.
pub fn without_everyone(
    roles: &[serenity::RoleId],
    everyone: serenity::RoleId,
) -> Vec<serenity::RoleId> {
    roles.iter().copied().filter(|r| *r != everyone).collect()
}

/// Fill the `${rolesToRemove.length}` / `${member.user.username}` progress template.
pub fn fill_progress(template: &str, n: usize, username: &str) -> String {
    template
        .replace("${rolesToRemove.length}", &n.to_string())
        .replace("${member.user.username}", username)
}

/// Fill the `${good}` / `${bad}` / `${member.id}` result template.
pub fn fill_desc(template: &str, good: usize, bad: usize, member_id: u64) -> String {
    template
        .replace("${good}", &good.to_string())
        .replace("${bad}", &bad.to_string())
        .replace("${member.id}", &member_id.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn everyone_is_kept() {
        let everyone = serenity::RoleId::new(10);
        let roles = vec![
            everyone,
            serenity::RoleId::new(11),
            serenity::RoleId::new(12),
        ];
        assert_eq!(
            without_everyone(&roles, everyone),
            vec![serenity::RoleId::new(11), serenity::RoleId::new(12)]
        );
        assert!(without_everyone(&[everyone], everyone).is_empty());
    }

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_progress(
                "Removing ${rolesToRemove.length} roles from ${member.user.username}...",
                3,
                "Bob"
            ),
            "Removing 3 roles from Bob..."
        );
        assert_eq!(
            fill_desc("good ${good} bad ${bad} <@${member.id}>", 2, 1, 99),
            "good 2 bad 1 <@99>"
        );
    }
}
