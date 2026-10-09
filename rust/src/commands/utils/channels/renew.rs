use super::*;

/// Recreate a channel now (clone + delete). Mirrors !renew.ts manual path.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "renew",
    aliases("r", "rnw"),
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn renew(
    ctx: Ctx<'_>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let ch = match channel {
        Some(c) => c,
        None => match ctx.guild_channel().await {
            Some(c) => c.clone(),
            None => return Ok(()),
        },
    };
    let mut builder = poise::serenity_prelude::CreateChannel::new(ch.name.clone()).kind(ch.kind);
    if let Some(parent) = ch.parent_id {
        builder = builder.category(parent);
    }
    let new_ch = guild_id.create_channel(ctx.http(), builder).await?;
    ch.id.delete(ctx.http()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "renew_channel_send_success")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
            })
            .unwrap_or_else(|| format!("Renewed as <#{}>.", new_ch.id.get())),
    )
    .await?;
    Ok(())
}
