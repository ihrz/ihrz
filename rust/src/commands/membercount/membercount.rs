use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    category = "membercount",
    rename = "membercount",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn membercount(
    ctx: Ctx<'_>,
    #[description = "Power on / Power off"] action: String,
    #[description = "Voice channel used as counter"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
    #[description = "{MemberCount}, {RolesCount}, {ChannelCount}, {BoostCount}, {BotCount}, {VoiceCount}, {OnlineCount}"]
    name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(&action) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;

    if !enabled {
        sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'GUILD.MCOUNT.%'")
            .bind(&gid)
            .execute(pool)
            .await?;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        ctx.say(
            crate::lang::get(&code, "setmembercount_command_work_on_disable")
                .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
                .unwrap_or_else(|| "Membercount disabled.".to_string()),
        )
        .await?;
        return Ok(());
    }

    let Some(template) = name.filter(|n| !n.trim().is_empty()) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };
    let Some(slot) = mcount_slot(&template) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };

    let value = serde_json::json!({
        "name": template,
        "enable": true,
        "channel": channel.id.get().to_string(),
    })
    .to_string();
    crate::db::kv_set(pool, &gid, &mcount_key(slot), &value).await?;

    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "setmembercount_command_work_on_enable")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| format!("Counter set: {template}")),
    )
    .await?;
    Ok(())
}
