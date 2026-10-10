use super::*;

/// Create a webhook and return its URL. Mirrors securewebhook.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "securewebhook",
    aliases("securehook")
)]
pub async fn securewebhook(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Name"] name: Option<String>,
) -> Result<(), anyhow::Error> {
    let wh = channel
        .id
        .create_webhook(
            ctx.http(),
            serenity::CreateWebhook::new(name.unwrap_or_else(|| "iHorizon".to_string())),
        )
        .await?;
    let url = wh.url().unwrap_or_else(|_| "unavailable".to_string());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "util_securewebhook_action_create_ok")
            .map(|s| {
                s.replace("${data.url}", &url)
                    .replace("${data.use}", &channel.name)
            })
            .unwrap_or_else(|| format!("Webhook: {url}")),
    )
    .await?;
    Ok(())
}
