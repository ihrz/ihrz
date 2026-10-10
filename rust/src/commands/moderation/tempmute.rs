use super::*;
use poise::serenity_prelude as serenity;

/// Full TS bot gate for !tempmute.ts: the bot needs ManageMessages,
/// MuteMembers, ViewAuditLog and ManageGuild together.
fn bot_can_tempmute(perms: serenity::Permissions) -> bool {
    perms.contains(
        serenity::Permissions::MANAGE_MESSAGES
            | serenity::Permissions::MUTE_MEMBERS
            | serenity::Permissions::VIEW_AUDIT_LOG
            | serenity::Permissions::MANAGE_GUILD,
    )
}

/// Temporarily mute a user!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "tempmute",
    aliases("mute"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_timeout(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Duration (e.g. 10m, 1h, 7d)"] time: String,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Display mirrors TS `to_beautiful_string(mutetime, lang)`: localized
    // units formatted from the pre-clamp input, even on overflow.
    let units = [
        t("var_year"),
        t("var_mo"),
        t("var_w"),
        t("var_d"),
        t("var_h"),
        t("var_m"),
        t("var_s"),
    ];
    let pretty = beautiful_ms_lang(crate::funcs::time_ms(&time), &units);
    // Human durations like TS timeCalculator; invalid -> invalid-time text.
    let mut ms = crate::funcs::time_ms(&time) as i64;
    if ms <= 0 {
        ctx.say(t("too_new_account_invalid_time_on_enable")).await?;
        return Ok(());
    }
    // 28-day clamp with the TS overflow note.
    let mut overflow = false;
    if ms > TIMEOUT_MAX_MS {
        ms = TIMEOUT_MAX_MS;
        overflow = true;
    }
    let reason_s = reason.clone().unwrap_or_else(|| t("var_no_set"));
    let no = emoji(&ctx, "No", "❌").await;
    let vc = emoji(&ctx, "VC_OpenChat", "💬").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !bot_can_tempmute(g.bot_perms) {
            ctx.say(
                t("tempmute_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    // TS `if (!mutetime || !tomute || !mutetime) return;`
    // (!tempmute.ts:67-69): an unresolvable member is a silent return,
    // no additive reply.
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(mut member) = member else {
        return Ok(());
    };
    if member_is_admin(&ctx, guild_id, &member) {
        ctx.say(t("tempmute_tomute_is_admin").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    if let Some(target_pos) = target_top(&ctx, guild_id, user.id).await {
        let author_id = ctx.author().id.get();
        let (bot_top, author_top, owner) = guards
            .as_ref()
            .map(|g| (g.bot_top, g.author_top, g.owner_id))
            .unwrap_or((u16::MAX, u16::MAX, author_id));
        if target_pos >= bot_top && owner != author_id {
            ctx.say(
                t("tempmute_tomute_highest_role_or_same")
                    .replace("${client.iHorizon_Emojis.No}", &no)
                    .replace("${tomute.toString()}", &user.to_string()),
            )
            .await?;
            return Ok(());
        }
        if owner != author_id && target_pos >= author_top {
            ctx.say(
                t("tempmute_cannot_mute_higher_role")
                    .replace("${client.iHorizon_Emojis.No}", &no)
                    .replace("${tomute.toString()}", &user.to_string()),
            )
            .await?;
            return Ok(());
        }
    }
    if user.id == ctx.author().id {
        ctx.say(t("tempmute_cannot_mute_yourself").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    // Active timeout only, like `tomute.isCommunicationDisabled()`
    // (!tempmute.ts:162): expiry in the future, not merely set.
    if timeout_active(member.communication_disabled_until, crate::bot::now_ms()) {
        ctx.say(t("tempmute_already_muted")).await?;
        return Ok(());
    }
    let until = serenity::Timestamp::from_unix_timestamp(crate::bot::now_ms() / 1000 + ms / 1000)?;
    // Audit reason carried on the edit; silent catch like TS.
    let _ = guild_id
        .edit_member(
            ctx.http(),
            user.id,
            serenity::builder::EditMember::new()
                .disable_communication_until_datetime(until)
                .audit_log_reason(&t("tempmute_logs_embed_title")),
        )
        .await;
    member.communication_disabled_until = Some(until);
    let mut content = t("tempmute_command_work")
        .replace("${tomute.id}", &user.id.get().to_string())
        .replace("${ms(ms(mutetime))}", &pretty)
        .replace("${reason}", &reason_s);
    if overflow {
        content += &t("tempmute_tomute_max_time_passed")
            .replace("${client.iHorizon_Emojis.VC_OpenChat}", &vc);
    }
    ctx.say(content).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("tempmute_logs_embed_title"),
        t("tempmute_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string())
            .replace("${ms(ms(mutetime))}", &pretty)
            .replace("${reason}", &reason_s),
    )
    .await;
    // Mute warn (mirrors !tempmute.ts warnMember call with the mute
    // description as reason).
    if let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) {
        let pool = &ctx.data().pool;
        let lang_code = code.clone();
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let reason_text = text("tempmute_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string())
            .replace("${ms(ms(mutetime))}", &pretty)
            .replace("${reason}", &reason_s);
        let author_top = ctx.author_member().await.map(|m| m.roles.clone());
        let (guild_name, guild_roles) = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                (
                    Some(g.name.clone()),
                    Some(
                        g.roles
                            .iter()
                            .map(|(id, r)| (*id, (r.name.clone(), r.position)))
                            .collect(),
                    ),
                )
            })
            .unwrap_or((None, None));
        let _ = warn_member_with_author(
            &WarnContext {
                http: ctx.http(),
                guild_name,
                author_top_roles: author_top,
                guild_roles,
                pool,
                gid: &gid,
                guild_id,
                author_name: &ctx.author().name,
                target: &user,
                reason: &reason_text,
                lang_code: &lang_code,
            },
            Some(ctx.author().id.get()),
        )
        .await;
    }
    // Unmute notice. Mirrors the setTimeout in !tempmute.ts:186-197
    // (only for mutes within the no-warn window of 1 week; fires when
    // the timeout is still active at expiry).
    const NO_WARN_WINDOW_MS: i64 = 604_800_000;
    if ms <= NO_WARN_WINDOW_MS && ms > 0 {
        let http = ctx.serenity_context().http.clone();
        let channel_id = ctx.channel_id();
        let lang_code_task = code.clone();
        let user_id = user.id;
        let wait = ms as u64;
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(wait)).await;
            let still_muted = guild_id
                .member(&*http, user_id)
                .await
                .ok()
                .and_then(|m| m.communication_disabled_until)
                .map(|t| t.unix_timestamp() * 1000 > crate::bot::now_ms())
                .unwrap_or(false);
            if still_muted {
                let text = crate::lang::get(&lang_code_task, "tempmute_unmuted_by_time")
                    .map(|s| s.replace("${tomute.id}", &user_id.get().to_string()))
                    .unwrap_or_else(|| format!("<@{}> has been unmuted!", user_id.get()));
                let _ = channel_id.say(&*http, text).await;
            }
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gate() -> serenity::Permissions {
        serenity::Permissions::MANAGE_MESSAGES
            | serenity::Permissions::MUTE_MEMBERS
            | serenity::Permissions::VIEW_AUDIT_LOG
            | serenity::Permissions::MANAGE_GUILD
    }

    #[test]
    fn tempmute_gate_needs_all_four() {
        assert!(bot_can_tempmute(gate()));
        assert!(!bot_can_tempmute(
            gate() - serenity::Permissions::MANAGE_MESSAGES
        ));
        assert!(!bot_can_tempmute(
            gate() - serenity::Permissions::MUTE_MEMBERS
        ));
        assert!(!bot_can_tempmute(
            gate() - serenity::Permissions::VIEW_AUDIT_LOG
        ));
        assert!(!bot_can_tempmute(
            gate() - serenity::Permissions::MANAGE_GUILD
        ));
        assert!(!bot_can_tempmute(serenity::Permissions::MODERATE_MEMBERS));
        assert!(!bot_can_tempmute(serenity::Permissions::empty()));
    }

    #[test]
    fn prefix_aliases_match_ts() {
        // TS mod.ts tempmute aliases: ["mute"] only (no "timeout").
        let cmd = mod_timeout();
        assert_eq!(cmd.aliases, vec!["mute".to_string()]);
    }

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts tempmute options: user, time, reason.
        let cmd = mod_timeout();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["user", "time", "reason"]);
    }
}
