use super::*;
use poise::serenity_prelude as serenity;

/// Temporarily ban a user from the server
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
    // Display mirrors TS `to_beautiful_string(banTime, lang)`: localized
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
    let pretty = beautiful_ms_lang(crate::funcs::time_ms(&duration), &units);
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
    // Reply/log display mirrors !tempban.ts (`reason || lang.var_no_set`).
    let reason_s = reason
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| t("var_no_set"));
    // Audit + stored default mirrors tempbanManager.addban
    // (`reason || "No reason provided"`): the Discord audit reason and
    // the DB row never carry the `var_no_set` display fallback.
    let audit_reason: &str = reason
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or("No reason provided");
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
    if crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        &gid,
        &gid,
        &tempban_key(user.id.get()),
    )
    .await
    .is_some()
    {
        ctx.say(t("tempban_already_banned")).await?;
        return Ok(());
    }
    // Audit reason mirrors tempbanManager.addban
    // (src/core/modules/tempbanManager.ts): always a reason string,
    // defaulting to "No reason provided" when omitted.
    let ban_res = guild_id
        .ban_with_reason(ctx.http(), user.id, 0, audit_reason)
        .await;
    if ban_res.is_err() {
        ctx.say(t("tempban_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let exp = crate::commands::shared::now_ms() + ms;
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &tempban_key(user.id.get()),
        &serde_json::json!({"expires_at_ms": exp, "reason": audit_reason}).to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    /// Flat per-user temp-sanction keys (`GUILD.TEMPBAN.{uid}`,
    /// `GUILD.TEMPROLE.{uid}.{rid}`, guild id as the legacy scope).
    /// SCOPE/LAYOUT NOTE (dual-run gap, kept by design — do NOT relayout):
    /// the TS managers (`tempbanManager.ts`, `tempRoleManager.ts`) keep one
    /// object blob per guild (`{guild}.GUILD.TEMPBAN` / `.TEMPROLE` mapping
    /// user ids to `{time, ...}` rows), while this port writes flat
    /// per-user keys dual-routed (table + kv). Each side only sees its own
    /// rows during a dual run, and the expiry sweep (`scheduler.rs`
    /// `sweep_temp_expiry`) scans the flat keys. Unifying the layouts
    /// would orphan one side's live sanctions, so the gap stays
    /// documented instead.
    #[test]
    fn sanction_keys_flat_per_user_layout() {
        assert_eq!(tempban_key(7), "GUILD.TEMPBAN.7");
        assert_eq!(temprole_key(7, 9), "GUILD.TEMPROLE.7.9");
    }

    #[tokio::test]
    async fn temp_sanctions_roundtrip_through_both_stores() {
        use crate::commands::owner::main::{routed_del, routed_get, routed_set};
        let pool = mem_pool().await;
        let ban = tempban_key(7);
        let role = temprole_key(7, 9);
        assert_eq!(routed_get(&pool, "g", "g", &ban).await, None);
        // Legacy-only row (expiry sweep shape) is found table-first.
        crate::db::kv_set(&pool, "g", &ban, r#"{"expires_at_ms":5}"#)
            .await
            .unwrap();
        assert!(routed_get(&pool, "g", "g", &ban).await.is_some());
        routed_set(&pool, "g", "g", &role, r#"{"expires_at_ms":9}"#)
            .await
            .unwrap();
        // Locked legacy readers still see the dual write.
        assert_eq!(
            crate::db::kv_get(&pool, "g", &role).await.as_deref(),
            Some(r#"{"expires_at_ms":9}"#)
        );
        assert!(routed_del(&pool, "g", "g", &ban).await.unwrap());
        assert!(routed_del(&pool, "g", "g", &role).await.unwrap());
        assert_eq!(routed_get(&pool, "g", "g", &ban).await, None);
        assert_eq!(routed_get(&pool, "g", "g", &role).await, None);
    }
}
