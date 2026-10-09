/// Detail embed color. Mirrors !get-data.ts:67 (`#0099ff`).
pub const GW_GETDATA_COLOR: u32 = 0x0099ff;

use super::*;

/// Show one giveaway's data. Mirrors !get-data.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-data",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_data(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"]
    #[rename = "giveaway-id"]
    message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = super::gw::store_get(&ctx.data().pool, &gid, mid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    match raw.and_then(|r| serde_json::from_str::<Giveaway>(&r).ok()) {
        Some(gw) => {
            // Mirrors the EmbedBuilder field order in !get-data.ts:68-133.
            let yes = t("gw_getdata_yes", "`Yes`");
            let no = t("gw_getdata_no", "`No`");
            let ended = if gw.ended { &yes } else { &no };
            // isValid comes from the TS manager; a stored giveaway found
            // in our own table counts as valid.
            let expire_s = gw.expire_in_ms.div_euclid(1000);
            let entries_value = t(
                "gw_getdata_embed_fields_value_entriesAmount",
                "**${(giveawayData.entries as string[]).length}** (use `/gw list-entries giveaway-id:${giveawayId}` for more info)",
            )
            .replace(
                "${(giveawayData.entries as string[]).length}",
                &gw.entries.len().to_string(),
            )
            .replace("${giveawayId}", &mid.to_string());
            let mut embed = poise::serenity_prelude::CreateEmbed::default()
                .colour(poise::serenity_prelude::Colour::new(GW_GETDATA_COLOR))
                .title(t("gw_getdata_embed_title", "Giveaway Info!"))
                .field(
                    t("gw_getdata_embed_fields_channel", "Channel"),
                    format!("<#{}>", gw.channel_id),
                    true,
                )
                .field(
                    t("gw_getdata_embed_fields_amountWinner", "Winners Amount"),
                    t(
                        "gw_getdata_embed_fields_value_amountWinner",
                        "`${giveawayData.winnerCount}` winner(s)",
                    )
                    .replace("${giveawayData.winnerCount}", &gw.winner_count.to_string()),
                    true,
                )
                .field(
                    t("gw_getdata_embed_fields_prize", "Prize"),
                    t(
                        "gw_getdata_embed_fields_value_prize",
                        "`${giveawayData.prize}`",
                    )
                    .replace("${giveawayData.prize}", &gw.prize),
                    true,
                )
                .field(
                    t("gw_getdata_embed_fields_hostedBy", "Hosted by"),
                    format!("<@{}>", gw.hosted_by),
                    true,
                )
                .field(
                    t("gw_getdata_embed_fields_isEnded", "Ended?"),
                    ended.to_string(),
                    true,
                )
                .field(
                    t("gw_getdata_embed_fields_isValid", "Is Valid?"),
                    yes.clone(),
                    true,
                )
                .field(
                    t("gw_getdata_embed_fields_time", "End at"),
                    format!("<t:{expire_s}:d>"),
                    true,
                )
                .field(
                    t("gw_getdata_embed_fields_entriesAmount", "Entries Amount"),
                    entries_value,
                    false,
                );
            // Author mirrors !get-data.ts:60-66 (guild name + icon URL).
            let guild_name = ctx
                .guild()
                .map(|g| g.name.clone())
                .unwrap_or_else(|| gid.clone());
            match ctx.guild().and_then(|g| g.icon_url()) {
                Some(url) => {
                    embed = embed.author(
                        poise::serenity_prelude::CreateEmbedAuthor::new(guild_name).icon_url(url),
                    );
                }
                None => {
                    embed =
                        embed.author(poise::serenity_prelude::CreateEmbedAuthor::new(guild_name));
                }
            }
            if gw.ended {
                let winners = gw
                    .winners
                    .iter()
                    .map(|w| format!("<@{w}>"))
                    .collect::<Vec<_>>()
                    .join(",");
                embed = embed.field(
                    t("gw_getdata_embed_fields_winners", "Winner(s)"),
                    winners,
                    false,
                );
            }
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            ctx.say(t(
                "gw_doesnt_exit",
                "The giveaway is unreachable, or doesn't exist.",
            ))
            .await?;
        }
    };
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detail_color_matches_ts() {
        assert_eq!(GW_GETDATA_COLOR, 0x0099ff);
    }
}
