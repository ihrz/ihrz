use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "tempban",
    aliases("tban", "temporaryban"),
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_tempban(
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
    let mut ms = crate::funcs::time_ms(&duration) as i64;
    if ms <= 0 {
        ctx.say(t("too_new_account_invalid_time_on_enable")).await?;
        return Ok(());
    }
    // 1-year clamp with the TS overflow note.
    let mut overflow = false;
    if ms > YEAR_MAX_MS {
        ms = YEAR_MAX_MS;
        overflow = true;
    }
    let pretty = crate::funcs::beautiful_ms(ms as f64);
    let reason_s = reason.clone().unwrap_or_else(|| t("var_no_set"));
    let no = emoji(&ctx, "No", "❌").await;
    let vc = emoji(&ctx, "VC_OpenChat", "💬").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.ban_members() {
            ctx.say(
                t("tempban_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    // In-guild hierarchy + admin guards (skipped for non-members like TS).
    if let Ok(in_guild) = guild_id.member(ctx.http(), user.id).await {
        let author_id = ctx.author().id.get();
        let (bot_top, owner) = guards
            .as_ref()
            .map(|g| (g.bot_top, g.owner_id))
            .unwrap_or((u16::MAX, author_id));
        if let Some(target_pos) = target_top(&ctx, guild_id, user.id).await {
            if target_pos >= bot_top && owner != author_id {
                ctx.say(
                    t("tempban_user_highest_role_or_same")
                        .replace("${client.iHorizon_Emojis.No}", &no)
                        .replace("${user.toString()}", &user.to_string()),
                )
                .await?;
                return Ok(());
            }
        }
        if member_is_admin(&ctx, guild_id, &in_guild) {
            ctx.say(t("tempban_user_is_admin").replace("${client.iHorizon_Emojis.No}", &no))
                .await?;
            return Ok(());
        }
    }
    let gid = guild_id.get().to_string();
    // Mirrors tempbanManager.isAlreadyBanned.
    if crate::db::kv_get(&ctx.data().pool, &gid, &tempban_key(user.id.get()))
        .await
        .is_some()
    {
        ctx.say(t("tempban_already_banned")).await?;
        return Ok(());
    }
    let by = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    if guild_id
        .ban_with_reason(
            ctx.http(),
            user.id,
            0,
            &format!("Tempbanned by: {by} | Reason: {reason_s}"),
        )
        .await
        .is_err()
    {
        ctx.say(t("tempban_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let exp = crate::commands::shared::now_ms() + ms;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &tempban_key(user.id.get()),
        &serde_json::json!({"expires_at_ms": exp, "reason": reason_s}).to_string(),
    )
    .await?;
    // Beautified duration in the reply, like TS to_beautiful_string.
    let mut content = t("tempban_command_work")
        .replace("${user.id}", &user.id.get().to_string())
        .replace("${duration}", &pretty)
        .replace("${reason}", &reason_s);
    if overflow {
        content +=
            &t("tempban_max_time_passed").replace("${client.iHorizon_Emojis.VC_OpenChat}", &vc);
    }
    ctx.say(content).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("tempban_logs_embed_title"),
        t("tempban_logs_embed_description")
            .replace("${executor.id}", &ctx.author().id.get().to_string())
            .replace("${user.id}", &user.id.get().to_string())
            .replace("${duration}", &pretty)
            .replace("${reason}", &reason_s),
    )
    .await;
    Ok(())
}
