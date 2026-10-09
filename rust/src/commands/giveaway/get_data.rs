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
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
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
