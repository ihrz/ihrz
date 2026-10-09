use super::*;

/// Steal custom emojis from text. Mirrors !emojis.ts.
// Per-emoji channel feedback plus the summary embed; no 6s pacing.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "emojis",
    aliases("addemoji", "create", "addemojis", "emoji", "emote"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn emojis(
    ctx: Ctx<'_>,
    #[description = "Text containing <:name:id> emojis"] text: String,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let guild_name = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.name.clone())
        .unwrap_or_default();
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut cnt = 0;
    let mut nemj = String::new();
    for token in text.split_whitespace() {
        let Some((animated, name, id)) = super::parse_steal_token(token) else {
            continue;
        };
        let ext = if animated { "gif" } else { "png" };
        let url = format!("https://cdn.discordapp.com/emojis/{id}.{ext}");
        let bytes = match reqwest::Client::new().get(&url).send().await {
            Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
            Err(_) => vec![],
        };
        if bytes.is_empty() || bytes.len() > 256 * 1024 {
            ctx.channel_id()
                .say(
                    ctx.http(),
                    crate::lang::get(&code, "emoji_send_err_emoji")
                        .map(|s| s.replace("${emoji.name}", token))
                        .unwrap_or_else(|| "Emoji failed.".to_string()),
                )
                .await?;
            continue;
        }
        let image = format!(
            "data:image/{ext};base64,{}",
            crate::emojis::base64_encode(&bytes)
        );
        match guild_id.create_emoji(ctx.http(), &name, &image).await {
            Ok(created) => {
                cnt += 1;
                nemj.push_str(&format!(
                    "<{}:{}:{}>",
                    if animated { "a" } else { "" },
                    created.name,
                    created.id.get()
                ));
                ctx.channel_id()
                    .say(
                        ctx.http(),
                        crate::lang::get(&code, "emoji_send_new_emoji")
                            .map(|s| {
                                s.replace("${emoji.name}", &created.name)
                                    .replace("${emoji}", &created.to_string())
                            })
                            .unwrap_or_else(|| "Emoji added.".to_string()),
                    )
                    .await?;
            }
            Err(_) => {
                ctx.channel_id()
                    .say(
                        ctx.http(),
                        crate::lang::get(&code, "emoji_send_err_emoji")
                            .map(|s| s.replace("${emoji.name}", token))
                            .unwrap_or_else(|| "Emoji failed.".to_string()),
                    )
                    .await?;
            }
        }
    }
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(190, 169, 222))
        .timestamp(serenity::Timestamp::now())
        .description(
            crate::lang::get(&code, "emoji_embed_desc_work")
                .map(|s| {
                    s.replace("${cnt}", &cnt.to_string())
                        .replace("${interaction.guild.name}", &guild_name)
                        .replace("${nemj}", &nemj)
                })
                .unwrap_or_else(|| format!("Stole {cnt} emojis.")),
        );
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}
