use super::*;
use poise::serenity_prelude as serenity;

/// Unmute a member.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unmute",
    aliases("untempmute", "untimeout", "demute"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_unmute(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    // Bot ManageRoles gate, kept: poise `default_member_permissions`
    // gates the invoker, not the bot. Mirrors the live
    // `members.me?.permissions.has([ManageRoles])` check in
    // !unmute.ts:64-74 (snapshot-based here; skipped only when the
    // guild is not cached) — safer than dropping it and 403ing per press.
    if let Some(g) = guard_data(&ctx, guild_id).await {
        if !g.bot_perms.manage_roles() {
            ctx.say(
                t("unmute_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    if user.id == ctx.author().id {
        ctx.say(t("unmute_attempt_mute_your_self").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    // TS `if (!tomute) return;` (!unmute.ts:62): an unresolvable member
    // is a silent return, no additive reply.
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(mut member) = member else {
        return Ok(());
    };
    // Active timeout only, like `!tomute?.isCommunicationDisabled()`
    // (!unmute.ts:88): expiry in the future, not merely set.
    if !timeout_active(member.communication_disabled_until, crate::bot::now_ms()) {
        ctx.say(t("unmute_not_muted")).await?;
        return Ok(());
    }
    // Null-vs-now parity: TS clears the timeout via
    // `disableCommunicationUntil(Date.now())` (!unmute.ts) while serenity's
    // `enable_communication` clears it to null; both read back as unmuted
    // (`isCommunicationDisabled()` is false for a null or past expiry).
    // Fire-and-forget like the TS un-awaited call.
    let _ = member.enable_communication(ctx.http()).await;
    ctx.say(t("unmute_command_work").replace("${tomute.id}", &user.id.get().to_string()))
        .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unmute_logs_embed_title"),
        t("unmute_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string()),
    )
    .await;
    Ok(())
}
