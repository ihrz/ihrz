use super::*;

/// Auto-renew a channel on a timer.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "autorenew",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn autorenew(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text", "Voice")]
    channel: poise::serenity_prelude::GuildChannel,
    #[description = "Every (e.g. 1h, 7d) or off"] every: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("UTILS.renew_channel.{}", channel.id.get());
    if every.trim().eq_ignore_ascii_case("off") {
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind(&key)
            .execute(&ctx.data().pool)
            .await;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_auto_renew_off")
                .unwrap_or_else(|| "Auto-renew off.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(ms) = crate::commands::shared::parse_duration_ms(&every) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_duration")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let now = crate::commands::shared::now_ms();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &key,
        &serde_json::json!({"timestamp": now, "maxTime": ms}).to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "util_autorenew_command_ok")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${channel.toString()}", &format!("<#{}>", channel.id.get()))
                    .replace("${time}", &every)
            })
            .unwrap_or_else(|| "Auto-renew set.".to_string()),
    )
    .await?;
    Ok(())
}
