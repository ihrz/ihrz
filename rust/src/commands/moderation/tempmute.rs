use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "tempmute",
    aliases("timeout", "mute"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_timeout(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Duration (e.g. 10m, 1h, 7d)"] duration: String,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Human durations like TS timeCalculator; invalid -> invalid-time text.
    let mut ms = crate::funcs::time_ms(&duration) as i64;
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
    let pretty = crate::funcs::beautiful_ms(ms as f64);
    let reason_s = reason.clone().unwrap_or_else(|| t("var_no_set"));
    let no = emoji(&ctx, "No", "❌").await;
    let vc = emoji(&ctx, "VC_OpenChat", "💬").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.moderate_members() {
            ctx.say(
                t("tempmute_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(mut member) = member else {
        ctx.say(t("ban_dont_found_member")).await?;
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
    if member.communication_disabled_until.is_some() {
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
        let _ = warn_member(&WarnContext {
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
        })
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
