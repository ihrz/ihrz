use super::*;
use poise::serenity_prelude as serenity;

/// List-all embed color. Mirrors !get-all.ts:58 (`#2986cc`).
pub const GW_GETALL_COLOR: u32 = 0x2986cc;

/// Message URL for one board. Mirrors !get-all.ts:78.
pub fn giveaway_message_url(guild_id: &str, channel_id: &str, giveaway_id: &str) -> String {
    format!("https://discord.com/channels/{guild_id}/{channel_id}/{giveaway_id}")
}

/// List all giveaways with status. Mirrors !get-all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-all",
    aliases("gall"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = super::gw::store_scan(&ctx.data().pool, &gid).await;
    // Mirrors the embed in !get-all.ts:57-88 (color + title + author +
    // footer + timestamp; one field per live giveaway; empty store
    // sends the bare titled embed).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let guild_name = ctx
        .guild()
        .map(|g| g.name.clone())
        .unwrap_or_else(|| gid.clone());
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(GW_GETALL_COLOR))
        .title(
            t(
                "gw_getall_embed_title",
                "Giveaway(s) List for ${interaction.guild?.name}",
            )
            .replace("${interaction.guild?.name}", &guild_name),
        )
        .timestamp(serenity::Timestamp::now());
    // Author mirrors !get-all.ts:66-69 (guild name + guild icon).
    match ctx.guild().and_then(|g| g.icon_url()) {
        Some(url) => {
            embed =
                embed.author(serenity::CreateEmbedAuthor::new(guild_name.clone()).icon_url(url));
        }
        None => {
            embed = embed.author(serenity::CreateEmbedAuthor::new(guild_name.clone()));
        }
    }
    for (k, v) in &rows {
        if let Ok(gw) = serde_json::from_str::<Giveaway>(v) {
            if gw.ended {
                continue;
            }
            let giveaway_id = k.strip_prefix("GIVEAWAY.").unwrap_or(k);
            let channel = format!("<#{}>", gw.channel_id);
            let message_url = giveaway_message_url(&gid, &gw.channel_id, giveaway_id);
            let expire_in = format!("<t:{}:d>", gw.expire_in_ms.div_euclid(1000));
            embed = embed.field(
                format!("`{giveaway_id}`"),
                t(
                    "gw_getall_embed_fields",
                    "${Channel} [See Here](${MessageURL}) \n**Expires In** ${ExpireIn}",
                )
                .replace("${Channel}", &channel)
                .replace("${MessageURL}", &message_url)
                .replace("${ExpireIn}", &expire_in),
                false,
            );
        }
    }
    // Footer mirrors !get-all.ts:70-74 (shared bot footer).
    let (footer_name, footer_icon) =
        giveaway_footer(&ctx.data().pool, &ctx.serenity_context().http, &gid).await;
    embed = giveaway_embed_footer(embed, &footer_name, footer_icon.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(icon) = footer_icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn helpers_match_ts() {
        assert_eq!(GW_GETALL_COLOR, 0x2986cc);
        assert_eq!(
            giveaway_message_url("g", "c", "m"),
            "https://discord.com/channels/g/c/m"
        );
    }
}
