use super::*;
use poise::serenity_prelude as serenity;

/// Show ban info for a user.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "baninfo",
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_baninfo(
    ctx: Ctx<'_>,
    #[description = "User id"] user_id: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Ok(uid) = user_id.trim().parse::<u64>() else {
        ctx.say(t("baninfo_user_not_found")).await?;
        return Ok(());
    };
    let ban = guild_id
        .get_ban(ctx.http(), serenity::UserId::new(uid))
        .await
        .unwrap_or(None);
    let Some(ban) = ban else {
        ctx.say(t("baninfo_not_banned")).await?;
        return Ok(());
    };
    // Executor + date from the MemberBanAdd audit log entry.
    let mut executor = t("var_unknown");
    let mut when = crate::bot::now_ms() / 1000;
    if let Ok(logs) = guild_id
        .audit_logs(
            ctx.http(),
            Some(serenity::model::guild::audit_log::Action::Member(
                serenity::model::guild::audit_log::MemberAction::BanAdd,
            )),
            None,
            None,
            Some(100),
        )
        .await
    {
        if let Some(entry) = logs
            .entries
            .iter()
            .find(|e| e.target_id.map(|g| g.get()) == Some(uid))
        {
            when = entry.id.created_at().unix_timestamp();
            executor = logs
                .users
                .get(&entry.user_id)
                .map(|u| u.tag())
                .unwrap_or_else(|| t("var_unknown"));
        }
    }
    let name = ban
        .user
        .global_name
        .clone()
        .unwrap_or_else(|| ban.user.name.clone());
    let avatar = ban.user.avatar_url().unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("{}: {name}", t("baninfo_ban_info")))
        .colour(serenity::Colour::from_rgb(79, 219, 18))
        .description(format!(
            "> **{}:** <t:{when}:F>\n> **{}:** {executor}\n> **{}:** {}",
            t("var_ban_date"),
            t("var_banned_by"),
            t("var_reason"),
            ban.reason.unwrap_or_else(|| t("blacklist_var_no_reason")),
        ));
    if !avatar.is_empty() {
        embed = embed.thumbnail(avatar);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
