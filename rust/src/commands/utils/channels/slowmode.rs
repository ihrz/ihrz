use super::*;

/// Slowmode. Mirrors util cooldown (!cooldown.ts) + unslowmode bridge.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "slowmode",
    aliases("unslowmode", "setcooldown", "coldown", "slow")
)]
pub async fn slowmode(
    ctx: Ctx<'_>,
    #[description = "Seconds (0-21600)"] seconds: Option<i64>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let secs = seconds.unwrap_or(0).clamp(0, 21600) as u16;
    let ch_id = match &channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditChannel::new().rate_limit_per_user(secs),
        )
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "util_cooldown_command_ok")
            .map(|s| s.replace("${duration_in_string}", &format!("{secs}s")))
            .unwrap_or_else(|| format!("Slowmode {secs}s.")),
    )
    .await?;
    Ok(())
}
