use super::*;
use poise::serenity_prelude as serenity;

/// Unmute all timed-out members.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unmuteall",
    aliases("unmute-all", "untimeoutall", "untimeout-all", "demuteall"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_unmuteall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    // Bot ManageRoles gate, kept: poise `default_member_permissions`
    // gates the invoker, not the bot. Mirrors the live
    // `members.me?.permissions.has([ManageRoles])` check in
    // !unmuteall.ts:46-58 (snapshot-based here; skipped only when the
    // guild is not cached) — safer than dropping it and 403ing per member.
    if let Some(g) = guard_data(&ctx, guild_id).await {
        if !g.bot_perms.manage_roles() {
            ctx.say(
                t("unmute_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    let ids: Vec<poise::serenity_prelude::UserId> = {
        let now = crate::bot::now_ms();
        ctx.serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                g.members
                    .values()
                    // Active timeout only, like `isCommunicationDisabled()`
                    // (!unmuteall.ts:62): expiry in the future, not merely set.
                    .filter(|m| timeout_active(m.communication_disabled_until, now))
                    .map(|m| m.user.id)
                    .collect()
            })
            .unwrap_or_default()
    };
    if ids.is_empty() {
        ctx.say(t("unmuteall_no_muted_members")).await?;
        return Ok(());
    }
    let total = ids.len();
    let audit = t("unmuteall_audit_reason");
    let mut unmuted = 0;
    for uid in ids {
        if guild_id
            .edit_member(
                ctx.http(),
                uid,
                serenity::builder::EditMember::new()
                    .enable_communication()
                    .audit_log_reason(&audit),
            )
            .await
            .is_ok()
        {
            unmuted += 1;
        }
    }
    ctx.say(
        t("unmuteall_command_work")
            .replace("${unmuted}", &unmuted.to_string())
            .replace("${total}", &total.to_string()),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unmuteall_logs_embed_title"),
        t("unmuteall_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${unmuted}", &unmuted.to_string())
            .replace("${total}", &total.to_string()),
    )
    .await;
    Ok(())
}
