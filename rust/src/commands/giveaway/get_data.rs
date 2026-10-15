/// Detail embed color. Mirrors !get-data.ts:67 (`#0099ff`).
pub const GW_GETDATA_COLOR: u32 = 0x0099ff;

use super::*;

// Show one giveaway's data. Mirrors !get-data.ts.
// (Doc line below is the slash description, TS-verbatim.)
/// Get informations about a giveaway (JSON Body)
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-data",
    aliases("get"),
    default_member_permissions = "MANAGE_MESSAGES",
    name_localized("fr", "get-data"),
    name_localized("ja", "get-data"),
    name_localized("ru", "get-data"),
    name_localized("es-ES", "get-data"),
    description_localized(
        "fr",
        "Obtenir des informations à propos d'un giveaways! (Format JSON)"
    ),
    description_localized("ja", "ギブアウェイの情報を取得（JSONデータ）"),
    description_localized("ru", "Получить информацию о розыгрыше (JSON)"),
    description_localized("es-ES", "Obtener información sobre un sorteo (cuerpo JSON)")
)]
pub async fn gw_get_data(
    ctx: Ctx<'_>,
    // Option (not required) for slash (Discord validates `giveaway-id`
    // required:true in gw.ts), but a bare PREFIX call never reaches the
    // handler on prod: TS checkCommandArgs counts required args first
    // (method.ts) and renders the caret usage embed. The gate below
    // mirrors that; with an id present the TS `string(args, 0)`
    // nullable path applies.
    #[description_localized("fr", "L'identifiant du giveaways")]
    #[description_localized("ja", "ギブアウェイのID")]
    #[description_localized("ru", "ID розыгрыша")]
    #[description_localized("es-ES", "ID del sorteo")]
    #[description = "Giveaway's ID"]
    #[rename = "giveaway-id"]
    message_id: Option<String>,
) -> Result<(), anyhow::Error> {
    // TS checkCommandArgs counts first (`giveaway-id` required:true in
    // HybridCommands/giveaway/gw.ts): a bare `.gw get-data` renders
    // the caret usage embed, never the missing-id unreachable leg
    // (baninfo.rs / ranks channel.rs precedent). Gate runs before
    // defer, like the executor.
    if let poise::Context::Prefix(pctx) = ctx {
        if prefix_giveaway_id_missing(pctx.args) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    // Ack-first like the TS `thinking: true` on `gw` (gw.ts:419): the
    // guild-icon + footer snapshots below are HTTP fetches, so defer
    // up front instead of risking the 3s interaction timeout.
    ctx.defer().await?;
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

/// Prefix count-check predicate: a bare (or whitespace-only) prefix
/// invocation must render the caret usage embed, mirroring TS
/// checkCommandArgs for the required `giveaway-id` option.
pub fn prefix_giveaway_id_missing(args: &str) -> bool {
    args.trim().is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bare_prefix_id_counts_as_missing() {
        // Pins the TS checkCommandArgs gate: bare or whitespace-only
        // prefix args render the caret usage embed, never the
        // missing-id unreachable leg.
        assert!(prefix_giveaway_id_missing(""));
        assert!(prefix_giveaway_id_missing("   "));
        assert!(!prefix_giveaway_id_missing("123"));
    }

    #[test]
    fn detail_color_matches_ts() {
        assert_eq!(GW_GETDATA_COLOR, 0x0099ff);
    }
}
