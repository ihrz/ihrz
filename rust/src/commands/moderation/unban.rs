use super::*;
use poise::serenity_prelude as serenity;

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
    #[description = "User id"] user_id: String,
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
    let Ok(uid) = user_id.trim().parse::<u64>() else {
        ctx.say(t("msg_bad_user_id")).await?;
        return Ok(());
    };
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
    if !bans.iter().any(|b| b.user.id.get() == uid) {
        ctx.say(t("unban_the_member_is_not_banned").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    // Audit reason carried on the unban, best-effort like TS.
    let _ = ctx
        .http()
        .remove_ban(guild_id, serenity::UserId::new(uid), Some(&reason_s))
        .await;
    // Clear any tempban row for the user.
    let gid = guild_id.get().to_string();
    let _ = crate::db::kv_del(&ctx.data().pool, &gid, &tempban_key(uid)).await;
    ctx.say(t("unban_is_now_unbanned").replace("${userID}", &uid.to_string()))
        .await?;
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
