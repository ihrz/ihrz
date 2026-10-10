use super::*;

/// Grant a role to every human who reacted to a message.
/// Mirrors utils/util !addrolereact.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "addrolereact",
    default_member_permissions = "MANAGE_ROLES"
)]
pub async fn addrolereact(
    ctx: Ctx<'_>,
    #[description = "Message id"] message_id: String,
    #[description = "Role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    if let Err(e) = addrolereact_inner(&ctx, &message_id, &role).await {
        // Catch-all. Mirrors the TS try/catch -> addrolereact_error.
        let _ = e;
        ctx.say(
            crate::commands::lang_for(&ctx, "addrolereact_error", "Error executing the command.")
                .await,
        )
        .await?;
    }
    Ok(())
}

async fn addrolereact_inner(
    ctx: &Ctx<'_>,
    message_id: &str,
    role: &serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    // Role from the guild cache, like
    // `guild.roles.cache.get(roleId)` (`!addrolereact.ts:60`).
    let cached = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.roles.get(&role.id).cloned());
    let Some(cached) = cached else {
        ctx.say(say("addrolereact_role_not_found", "Role not found."))
            .await?;
        return Ok(());
    };
    let Some(member) = ctx.author_member().await else {
        ctx.say(say(
            "addrolereact_cannot_check_permissions",
            "Cannot check your permissions.",
        ))
        .await?;
        return Ok(());
    };
    // Hierarchy guard (`!addrolereact.ts:78`): the target must sit
    // strictly below the invoker's highest role.
    let highest = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            member
                .roles
                .iter()
                .filter_map(|r| g.roles.get(r))
                .map(|r| r.position)
                .max()
                .unwrap_or(0)
        })
        .unwrap_or(0);
    if cached.position >= highest {
        ctx.say(say(
            "addrolereact_role_too_high",
            "You cannot add a role higher than or equal to your highest role.",
        ))
        .await?;
        return Ok(());
    }
    // Text-only (`!addrolereact.ts:86`): the invocation channel must
    // be a text channel.
    let Some(ch) = ctx.guild_channel().await else {
        ctx.say(say(
            "addrolereact_must_be_text_channel",
            "This command must be executed in a text channel.",
        ))
        .await?;
        return Ok(());
    };
    if ch.kind != serenity::ChannelType::Text {
        ctx.say(say(
            "addrolereact_must_be_text_channel",
            "This command must be executed in a text channel.",
        ))
        .await?;
        return Ok(());
    }
    // Message fetch (`!addrolereact.ts:93-95`): failure is the
    // not-found reply, never a throw.
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let Ok(target) = ch.id.message(ctx.http(), mid).await else {
        ctx.say(say("addrolereact_message_not_found", "Message not found."))
            .await?;
        return Ok(());
    };
    if target.reactions.is_empty() {
        ctx.say(say(
            "addrolereact_no_reactions",
            "This message has no reactions.",
        ))
        .await?;
        return Ok(());
    }
    // Progress reply, edited per reaction and for the final summary —
    // `interactionSend(replyMessage, ...)` edits in
    // `!addrolereact.ts:126-131,151-156`.
    let progress = ctx
        .say(
            say(
                "addrolereact_adding_role",
                "Adding role {role} in progress...",
            )
            .replace("{role}", &cached.name),
        )
        .await?;
    let mut total = 0u64;
    for reaction in &target.reactions {
        // discord.js `reaction.users.fetch()` pages through every
        // reactor; the REST leg pages `after` the same way.
        let mut humans = Vec::new();
        let mut after = None;
        loop {
            let batch = ctx
                .http()
                .get_reaction_users(ch.id, target.id, &reaction.reaction_type, 100, after)
                .await
                .unwrap_or_default();
            if batch.is_empty() {
                break;
            }
            after = batch.last().map(|u| u.id.get());
            let done = batch.len() < 100;
            humans.extend(batch.into_iter().filter(|u| !u.bot));
            if done {
                break;
            }
        }
        progress
            .edit(
                *ctx,
                poise::CreateReply::default().content(
                    say(
                        "addrolereact_adding_role_progress",
                        "Adding role {role} in progress for {count} users...",
                    )
                    .replace("{role}", &cached.name)
                    .replace("{count}", &humans.len().to_string()),
                ),
            )
            .await?;
        for user in humans {
            let Ok(m) = guild_id.member(ctx.http(), user.id).await else {
                continue;
            };
            if m.roles.contains(&cached.id) {
                continue;
            }
            // Audit reason verbatim (`!addrolereact.ts:141-144`); the
            // Member helper takes none, so the HTTP leg carries it
            // (like massiverole.rs).
            if ctx
                .http()
                .add_member_role(
                    guild_id,
                    user.id,
                    cached.id,
                    Some("[RoleReact] Assign role"),
                )
                .await
                .is_ok()
            {
                total += 1;
            }
        }
    }
    progress
        .edit(
            *ctx,
            poise::CreateReply::default().content(
                say(
                    "addrolereact_role_added",
                    "Role {role} added. {count} users received the role.",
                )
                .replace("{role}", &cached.name)
                .replace("{count}", &total.to_string()),
            ),
        )
        .await?;
    Ok(())
}

/// Fill the `{role}` / `{count}` summary template (both are plain
/// `String.replace`, so every occurrence fills).
pub fn fill_role_summary(template: &str, role_name: &str, count: usize) -> String {
    template
        .replace("{role}", role_name)
        .replace("{count}", &count.to_string())
}

#[cfg(test)]
mod tests {
    use super::fill_role_summary;

    #[test]
    fn summary_fills_role_and_count() {
        assert_eq!(
            fill_role_summary(
                "Role {role} added. {count} users received the role.",
                "Mod",
                7
            ),
            "Role Mod added. 7 users received the role."
        );
        assert_eq!(
            fill_role_summary("Adding role {role} in progress...", "Mod", 0),
            "Adding role Mod in progress..."
        );
    }
}
