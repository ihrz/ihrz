use super::*;
use poise::serenity_prelude as serenity;

/// Set the confession panel channel. Mirrors !channel.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_channel(
    ctx: Ctx<'_>,
    #[description = "The confession channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "The button title"] button_title: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    crate::db::kv_set(
        pool,
        &gid,
        "CONFESSION.channel",
        &channel.id.get().to_string(),
    )
    .await?;

    let button_title = button_title
        .map(|t| t.chars().take(32).collect::<String>())
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| "+".to_string());

    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "confession_channel_command_work")
        .map(|s| {
            s.replace(
                "${channel?.toString()}",
                &format!("<#{}>", channel.id.get()),
            )
        })
        .unwrap_or_else(|| {
            "The confession panel has been sent to ${channel?.toString()}".to_string()
        });
    let _ = button_title;
    ctx.say(msg).await?;
    Ok(())
}
