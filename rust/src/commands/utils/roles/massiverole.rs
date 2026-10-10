use super::*;

/// Add/remove a role for every member. Mirrors !massiverole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massiverole",
    aliases("massrole", "massroles"),
    default_member_permissions = "ADMINISTRATOR",
    user_cooldown = 300
)]
pub async fn massiverole(
    ctx: Ctx<'_>,
    #[description = "add or sub"] action: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Rate-limit guard. Mirrors the memberCount >= 10000 check.
    let member_count = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.member_count)
        .unwrap_or(0);
    if member_count >= 10000 {
        ctx.say(t("massiverole_too_much_member")).await?;
        return Ok(());
    }
    // TS parity (!massiverole.ts:73,181): only `add` / `sub` run a branch.
    // Any other action leaves just the loading ack in TS, so here it is
    // a silent return with no members touched.
    let add = match mass_action(&action) {
        Some(add) => add,
        None => return Ok(()),
    };
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let total = members.len();
    let targets: Vec<serenity::UserId> = members
        .iter()
        .filter(|m| m.roles.contains(&role.id) != add)
        .map(|m| m.user.id)
        .collect();
    // Skipped = already-had (add) / no-longer-had (sub).
    let skipped = total.saturating_sub(targets.len());
    // Immediate progress reply, edited with the final embed.
    // Mirrors ogInteraction + processBatchAsync (10/150ms).
    let progress_tpl = if add {
        t("batch_massiverole_process")
    } else {
        t("batch_unmassiverole_process")
    };
    let progress = ctx.say(fill_progress(&progress_tpl, targets.len())).await?;
    let http = ctx.http();
    let role_id = role.id;
    // Audit reasons verbatim from !massiverole.ts (`member.roles.add(role,
    // "[Massrole] Module")` / `.remove(role, "[MassiveRole] Command")`).
    let reason = mass_audit_reason(add);
    let result =
        crate::funcs::process_batch_full(&targets, 10, 150, None::<fn(usize, usize)>, |uid| {
            async move {
                // Http role endpoints carry the audit reason (like
                // rolepanel.rs); the Member add/remove helpers take none.
                let out = if add {
                    http.add_member_role(guild_id, uid, role_id, Some(reason))
                        .await
                } else {
                    http.remove_member_role(guild_id, uid, role_id, Some(reason))
                        .await
                };
                out.is_ok()
            }
        })
        .await;
    let desc = fill_work(
        &t(if add {
            "massiverole_add_command_work"
        } else {
            "massiverole_sub_command_work"
        }),
        &ctx.author().to_string(),
        result.success,
        skipped,
        result.failed,
        &role.to_string(),
    );
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    if let Some(thumb) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url())
    {
        embed = embed.thumbnail(thumb);
    }
    let mut reply = poise::CreateReply::default().content("").embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    progress.edit(ctx, reply).await?;
    Ok(())
}

/// Parse the action option. Mirrors the `action === "add"` / `action ===
/// "sub"` branches in !massiverole.ts (the slash choices only ever send
/// those two values): `Some(true)` adds, `Some(false)` removes, and any
/// other input is `None` — the caller returns silently with no members
/// touched, like TS leaving just the loading ack. Case-insensitive so
/// prefix `ADD` / `SUB` still work.
pub fn mass_action(action: &str) -> Option<bool> {
    match action.to_ascii_lowercase().as_str() {
        "add" => Some(true),
        "sub" => Some(false),
        _ => None,
    }
}

/// Audit reason per branch, verbatim from !massiverole.ts.
pub fn mass_audit_reason(add: bool) -> &'static str {
    if add {
        "[Massrole] Module"
    } else {
        "[MassiveRole] Command"
    }
}

/// Fill the `${membersToProcess.length}` progress template.
pub fn fill_progress(template: &str, n: usize) -> String {
    template.replace("${membersToProcess.length}", &n.to_string())
}

/// Fill the `${interaction.user}` / `${a}` / `${s}` / `${e}` / `${role}` work template.
pub fn fill_work(
    template: &str,
    invoker: &str,
    added: usize,
    skipped: usize,
    errors: usize,
    role: &str,
) -> String {
    template
        .replace("${interaction.user}", invoker)
        .replace("${a}", &added.to_string())
        .replace("${s}", &skipped.to_string())
        .replace("${e}", &errors.to_string())
        .replace("${role}", role)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_parses_like_ts() {
        assert_eq!(mass_action("add"), Some(true));
        assert_eq!(mass_action("ADD"), Some(true));
        assert_eq!(mass_action("sub"), Some(false));
        assert_eq!(mass_action("SUB"), Some(false));
        // Unknown actions run no branch in TS (!massiverole.ts:73,181):
        // silent return, no members touched (a typo must never mass-add).
        assert_eq!(mass_action("whatever"), None);
        assert_eq!(mass_action("remove"), None);
        assert_eq!(mass_action("del"), None);
        assert_eq!(mass_action("off"), None);
        assert_eq!(mass_action(""), None);
    }

    #[test]
    fn audit_reasons_match_ts_verbatim() {
        assert_eq!(mass_audit_reason(true), "[Massrole] Module");
        assert_eq!(mass_audit_reason(false), "[MassiveRole] Command");
    }

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_progress("Adding to ${membersToProcess.length} members...", 7),
            "Adding to 7 members..."
        );
        assert_eq!(
            fill_work(
                "${interaction.user} ${a}/${s}/${e} ${role}",
                "<@1>",
                2,
                3,
                4,
                "<@&9>"
            ),
            "<@1> 2/3/4 <@&9>"
        );
    }
}
