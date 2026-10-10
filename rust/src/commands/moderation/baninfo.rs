use super::*;
use poise::serenity_prelude as serenity;

/// Display name like discord.js `user.displayName`
/// (global name, else the username).
fn display_name<'a>(global_name: Option<&'a str>, name: &'a str) -> &'a str {
    global_name.filter(|s| !s.is_empty()).unwrap_or(name)
}

/// Show ban info for a user.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "baninfo",
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_baninfo(
    ctx: Ctx<'_>,
    #[description = "User"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let uid = user.id.get();
    let ban = guild_id.get_ban(ctx.http(), user.id).await.unwrap_or(None);
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
    let name = display_name(user.global_name.as_deref(), &user.name).to_string();
    let embed = serenity::CreateEmbed::default()
        .title(format!("{}: {name}", t("baninfo_ban_info")))
        .colour(serenity::Colour::from_rgb(79, 219, 18))
        .description(format!(
            "> **{}:** <t:{when}:F>\n> **{}:** {executor}\n> **{}:** {}",
            t("var_ban_date"),
            t("var_banned_by"),
            t("var_reason"),
            ban.reason.unwrap_or_else(|| t("blacklist_var_no_reason")),
        ))
        // `face()` keeps the animated (gif) avatar when there is one,
        // like `displayAvatarURL({ forceStatic: false })`.
        .thumbnail(user.face());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_name_prefers_global_name() {
        assert_eq!(display_name(Some("Glo"), "user"), "Glo");
        assert_eq!(display_name(None, "user"), "user");
        assert_eq!(display_name(Some(""), "user"), "user");
    }

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts baninfo option: user (User type, already the case).
        let cmd = mod_baninfo();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["user"]);
    }
}
