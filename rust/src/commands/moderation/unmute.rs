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
    // TS checks ManageRoles on the bot here.
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
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(mut member) = member else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    if member.communication_disabled_until.is_none() {
        ctx.say(t("unmute_not_muted")).await?;
        return Ok(());
    }
    // Fire-and-forget like the TS un-awaited disableCommunicationUntil.
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
