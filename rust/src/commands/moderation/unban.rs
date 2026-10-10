use super::*;
use poise::serenity_prelude as serenity;

/// Raw id match against a fetched ban entry. Mirrors the TS
/// `bans.find(ban => ban.user.id == userID)` string comparison: no
/// numeric parse, so garbage input just never matches. Pure for tests.
fn ban_matches_want(ban_user_id: serenity::UserId, want: &str) -> bool {
    ban_user_id.get().to_string() == want.trim()
}

/// Unban a user by id.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unban",
    aliases("delban", "removeban", "deban", "pardon"),
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_unban(
    ctx: Ctx<'_>,
    #[description = "User id"]
    #[rename = "userid"]
    user_id: String,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    if let Some(g) = guard_data(&ctx, guild_id).await {
        if !g.bot_perms.ban_members() {
            ctx.say(
                t("unban_bot_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    let reason_s = reason.unwrap_or_else(|| t("unban_reason"));
    // No id parse gate: like TS (`bans.find(ban => ban.user.id ==
    // userID)`), the raw string is matched against the fetched bans, so a
    // non-numeric id simply falls into the not-banned branch below.
    let want = user_id.trim();
    // Fetch-first flow: nobody-banned branch, then not-banned branch.
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    if bans.is_empty() {
        ctx.say(t("unban_there_is_nobody_banned").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let Some(ban) = bans.iter().find(|b| ban_matches_want(b.user.id, want)) else {
        ctx.say(t("unban_the_member_is_not_banned").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    };
    let uid = ban.user.id.get();
    // Audit reason carried on the unban, best-effort like TS.
    let _ = ctx
        .http()
        .remove_ban(guild_id, ban.user.id, Some(&reason_s))
        .await;
    // Clear any tempban row for the user, in both stores. Deliberate
    // harmless improvement (kept): !unban.ts has no tempban cleanup —
    // without this the expiry sweep would later act on a stale row for
    // an already-unbanned user.
    let gid = guild_id.get().to_string();
    let _ =
        crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, &tempban_key(uid))
            .await;
    ctx.say(t("unban_is_now_unbanned").replace("${userID}", &uid.to_string()))
        .await?;
    // Deliberate divergence from TS (kept): !unban.ts:106-116 posts the
    // log unconditionally (even when the fetch fails or the target is
    // not banned — a TS bug); here the log is gated on reaching the
    // unban, so failures stay silent like the rest of the flow.
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unban_logs_embed_title"),
        t("unban_logs_embed_description")
            .replace("${userID}", &uid.to_string())
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
    )
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ban_match_is_raw_string_compare() {
        let id = serenity::UserId::new(123);
        assert!(ban_matches_want(id, "123"));
        assert!(ban_matches_want(id, "  123  "));
        assert!(!ban_matches_want(id, "124"));
        // No parse gate: garbage input just never matches (not-banned
        // branch), instead of a dedicated bad-id reply.
        assert!(!ban_matches_want(id, "abc"));
        assert!(!ban_matches_want(id, ""));
    }
}
