/// Detail embed color. Mirrors !get-data.ts:67 (`#0099ff`).
pub const GW_GETDATA_COLOR: u32 = 0x0099ff;

use super::*;

/// Show one giveaway's data. Mirrors !get-data.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-data",
    aliases("get"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_data(
    ctx: Ctx<'_>,
    // Option (not required): TS reads `getString("giveaway-id")` /
    // `string(args, 0)` (both nullable, !get-data.ts) while the slash
    // schema marks it required (gw.ts). A missing id makes TS
    // `getGiveawayData(null)` reject, answering `gw_doesnt_exit`; `mid`
    // 0 matches no board here, same reply, instead of a poise parse
    // error on the bare form.
    #[description = "Giveaway message id"]
    #[rename = "giveaway-id"]
    message_id: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw_id = message_id.as_deref().unwrap_or("null");
    let mid: u64 = raw_id.trim().parse().unwrap_or(0);
    // Global board read like TS GetGiveawayData (keyed by message id,
    // not by guild); siblings (end/reroll/list-entries) already do this.
    let raw = super::gw::store_lookup(&ctx.data().pool, &gid, mid)
        .await
        .map(|(_, raw)| raw);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    match raw.and_then(|r| serde_json::from_str::<Giveaway>(&r).ok()) {
        Some(gw) => {
            // Mirrors the EmbedBuilder field order in !get-data.ts:68-133.
            let yes = t("gw_getdata_yes", "`Yes`");
            let no = t("gw_getdata_no", "`No`");
            let ended = if gw.ended { yes.clone() } else { no.clone() };
            // isValid comes from the stored row (TS writes isValid: true
            // at create); a found row counts as valid.
            let valid = if gw.is_valid { yes.clone() } else { no.clone() };
            let expire_s = gw.expire_in_ms.div_euclid(1000);
            let entries_value = t(
                "gw_getdata_embed_fields_value_entriesAmount",
                "**${(giveawayData.entries as string[]).length}** (use `/gw list-entries giveaway-id:${giveawayId}` for more info)",
            )
            .replace(
                "${(giveawayData.entries as string[]).length}",
                &gw.entries.len().to_string(),
            )
            .replace("${giveawayId}", raw_id.trim());
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
                .field(t("gw_getdata_embed_fields_isEnded", "Ended?"), ended, true)
                .field(
                    t("gw_getdata_embed_fields_isValid", "Is Valid?"),
                    valid,
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
            // Author icon is an image64 snapshot sent as guild_icon.png,
            // never a raw CDN URL (which rots to "media lost"). Mirrors
            // !get-data.ts:60-66 (guild name + icon) via the get-all.rs
            // precedent (guild iconURL, bot avatar fallback).
            let guild_name = ctx
                .guild()
                .map(|g| g.name.clone())
                .unwrap_or_else(|| gid.clone());
            let bot_face = ctx
                .serenity_context()
                .http
                .get_current_user()
                .await
                .map(|u| u.face())
                .unwrap_or_default();
            let guild_icon = ctx.guild().and_then(|g| g.icon_url());
            let icon_bytes = crate::image64::image64(super::get_all::guild_icon_source(
                guild_icon.as_deref(),
                &bot_face,
            ))
            .await
            .unwrap_or_default();
            embed = embed.author(
                poise::serenity_prelude::CreateEmbedAuthor::new(guild_name)
                    .icon_url("attachment://guild_icon.png"),
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
            ctx.send(poise::CreateReply::default().embed(embed).attachment(
                poise::serenity_prelude::CreateAttachment::bytes(icon_bytes, "guild_icon.png"),
            ))
            .await?;
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
