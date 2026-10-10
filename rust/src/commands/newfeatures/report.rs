use super::*;

/// Bug report (5h cooldown, guild-owner only, forwarded to the dev
/// report channel like report.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "report"
)]
pub async fn report(
    ctx: Ctx<'_>,
    #[description = "Message to devs (8+ words)"] message: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let uid = ctx.author().id.get();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let last: i64 = crate::db::kv_get(
        &ctx.data().pool,
        &gid,
        &format!("USER.{uid}.REPORT.cooldown"),
    )
    .await
    .and_then(|s| s.parse().ok())
    .unwrap_or(0);
    if now - last < 18_000_000 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_report_cooldown_active")
                .unwrap_or_else(|| "Report cooldown active.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS restricts reports to the guild owner (checked after the
    // cooldown): anyone else gets `report_owner_need`.
    let discord_owner = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.owner_id.get());
    if discord_owner != Some(uid) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "report_owner_need").unwrap_or_else(|| {
                ":x: | **You must be the owner of the server to be able to run this command!**"
                    .to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    // TS counts words with `split(" ")` (empty segments count), not
    // whitespace runs.
    if message.split(' ').count() < 8 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "report_specify").unwrap_or_else(|| {
                "Please specify the bug. Please make good and full sentences!".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    // TS forwards the report as an embed to the dev report channel
    // (`config.core.reportChannelID`) instead of storing it: red
    // embed, reporter + text + server id, then the cooldown is set.
    let reporter = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    let fwd = serenity::CreateEmbed::default().colour(0xff0000).description(format!(
        "**{reporter}** (<@{uid}>) reported:\n~~--------------------------------~~\n{message}\n~~--------------------------------~~\nServer ID: **{gid}**"
    ));
    if let Ok(channel_id) = ctx.data().config.report_channel_id.parse::<u64>() {
        if channel_id != 0 {
            let _ = serenity::ChannelId::new(channel_id)
                .send_message(ctx.http(), serenity::CreateMessage::new().embed(fwd))
                .await;
        }
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("USER.{uid}.REPORT.cooldown"),
        &now.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "report_command_work")
            .unwrap_or_else(|| "**Thanks for submitting a bug!**".to_string()),
    )
    .await?;
    Ok(())
}
