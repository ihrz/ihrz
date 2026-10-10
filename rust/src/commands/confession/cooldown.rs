use super::*;

/// Exact en-US fallbacks (no YAML touch).
/// Source: src/lang/en-US.yml `confession_coolodwn_command_work`
/// (note the historical `coolodwn` typo — key name kept as-is).
fn reply_fallback(user_mention: &str, beautiful: &str) -> String {
    format!("{user_mention}, the Confession's cooldown time is now **{beautiful}**!")
}

/// Exact en-US fallback for `confession_cooldown_log_embed_title`.
fn log_title_fallback() -> String {
    "SetCooldown Confession Module".to_string()
}

/// Exact en-US fallback for `confession_cooldown_log_embed_desc`.
fn log_desc_fallback(user_mention: &str, beautiful: &str) -> String {
    format!("{user_mention} has set the timeout to `{beautiful}`")
}

/// Render the cooldown confirmation reply. Mirrors !cooldown.ts:
/// `lang.confession_coolodwn_command_work` with
/// `${interaction.user.toString()}` and
/// `${client.timeCalculator.to_beautiful_string(time)}`.
pub fn render_cooldown_reply(template: &str, user_mention: &str, beautiful: &str) -> String {
    template
        .replace("${interaction.user.toString()}", user_mention)
        .replace(
            "${client.timeCalculator.to_beautiful_string(time)}",
            beautiful,
        )
}

/// Render the ihorizon-logs audit description. Mirrors !cooldown.ts:
/// `lang.confession_cooldown_log_embed_desc` with `${interaction.user}`
/// and `${client.timeCalculator.to_beautiful_string(time)}`.
pub fn render_cooldown_log(template: &str, user_mention: &str, beautiful: &str) -> String {
    template
        .replace("${interaction.user}", user_mention)
        .replace(
            "${client.timeCalculator.to_beautiful_string(time)}",
            beautiful,
        )
}

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors `client.func.ihorizon_logs` (best-effort, silent
/// when missing).
async fn post_cooldown_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|c| (c.id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(0xBF0BB9)
        .title(title.to_string())
        .description(description.to_string());
    let _ = poise::serenity_prelude::ChannelId::new(log_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

/// Change the cooldown between confessions. Mirrors !cooldown.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "cooldown",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_cooldown(
    ctx: Ctx<'_>,
    #[description = "Cooldown like 3h/30m/10s"] time: String,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(ms) = parse_cooldown_ms(&time) else {
        ctx.say(
            crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                .unwrap_or_else(|| "The time you entered is not valid! **Example of valid time**: `3h; 30m; 4mo; 4w; 4y` -> 3 hours; 30 minutes; 4 month(s); 4 weeks; 4 years".to_string()),
        )
        .await?;
        return Ok(());
    };
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "GUILD.CONFESSION.cooldown",
        &ms.to_string(),
    )
    .await?;
    let beautiful = beautiful_duration(ms);
    let mention = ctx.author().to_string();
    let reply = crate::lang::get(&code, "confession_coolodwn_command_work")
        .map(|t| render_cooldown_reply(&t, &mention, &beautiful))
        .unwrap_or_else(|| reply_fallback(&mention, &beautiful));
    ctx.say(reply).await?;
    let title = crate::lang::get(&code, "confession_cooldown_log_embed_title")
        .unwrap_or_else(log_title_fallback);
    let desc = crate::lang::get(&code, "confession_cooldown_log_embed_desc")
        .map(|t| render_cooldown_log(&t, &mention, &beautiful))
        .unwrap_or_else(|| log_desc_fallback(&mention, &beautiful));
    post_cooldown_log(&ctx, &title, &desc).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reply_renders_both_placeholders() {
        let t = "${interaction.user.toString()}, the Confession's cooldown time is now **${client.timeCalculator.to_beautiful_string(time)}**!";
        assert_eq!(
            render_cooldown_reply(t, "<@7>", "3h"),
            "<@7>, the Confession's cooldown time is now **3h**!"
        );
        assert_eq!(
            reply_fallback("<@7>", "3h"),
            "<@7>, the Confession's cooldown time is now **3h**!"
        );
    }

    #[test]
    fn log_renders_both_placeholders() {
        let t = "${interaction.user} has set the timeout to `${client.timeCalculator.to_beautiful_string(time)}`";
        assert_eq!(
            render_cooldown_log(t, "<@7>", "30m"),
            "<@7> has set the timeout to `30m`"
        );
        assert_eq!(
            log_desc_fallback("<@7>", "30m"),
            "<@7> has set the timeout to `30m`"
        );
        assert_eq!(log_title_fallback(), "SetCooldown Confession Module");
    }
}
