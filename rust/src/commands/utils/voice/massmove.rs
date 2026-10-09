use super::*;

/// Mass-move voice members. Mirrors utils !massmove.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massmove",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn massmove(
    ctx: Ctx<'_>,
    #[description = "From channel (omit for all voice)"]
    #[channel_types("Voice")]
    from: Option<poise::serenity_prelude::GuildChannel>,
    #[description = "To channel"]
    #[channel_types("Voice")]
    to: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let members: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| match &from {
                    Some(f) => v.channel_id == Some(f.id),
                    None => v.channel_id.is_some(),
                })
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    let mut moved = 0;
    let mut errors = 0;
    for uid in members {
        if guild_id.move_member(ctx.http(), uid, to.id).await.is_ok() {
            moved += 1;
        } else {
            errors += 1;
        }
    }
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let from_label = match &from {
        Some(f) => format!("<#{}>", f.id.get()),
        None => ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                g.channels
                    .values()
                    .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Voice)
                    .map(|c| format!("<#{}>", c.id.get()))
                    .collect::<Vec<_>>()
                    .join(",")
            })
            .unwrap_or_default(),
    };
    let desc = crate::lang::get(&code, "massmove_results")
        .map(|s| {
            s.replace(
                "${interaction.user}",
                &format!("<@{}>", ctx.author().id.get()),
            )
            .replace("${movedCount}", &moved.to_string())
            .replace("${errorCount}", &errors.to_string())
            .replace("${fromChannel}", &from_label)
            .replace("${toChannel}", &format!("<#{}>", to.id.get()))
        })
        .unwrap_or_else(|| format!("Moved {moved} members."));
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    if let Some(thumb) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url())
    {
        embed = embed.thumbnail(thumb);
    }
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}
