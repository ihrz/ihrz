use super::*;
use poise::serenity_prelude as serenity;

/// Medal for the 1-based global rank, mirroring `!leaderboard.ts`.
fn medal_for(rank_1based: usize) -> String {
    match rank_1based {
        1 => "🥇".to_string(),
        2 => "🥈".to_string(),
        3 => "🥉".to_string(),
        n => n.to_string(),
    }
}

/// One leaderboard row via the `leaderboard_text_inline` lang template.
fn render_row(tpl: &str, rank_1based: usize, uid: u64, s: &InviteStats) -> String {
    tpl.replace("${i}", &medal_for(rank_1based))
        .replace("${index.inviter}", &uid.to_string())
        .replace("${index.invites}", &s.invites.to_string())
        .replace("${index.regular}", &s.regular.to_string())
        .replace("${index.bonus}", &s.bonus.to_string())
        .replace("${index.leaves}", &s.leaves.to_string())
}

/// Get the xp's leaderboard of the guild!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("lb-invites", "invlb", "inviteslb", "invites-leaderboard")
)]
pub async fn inv_lb(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let t0 = std::time::Instant::now();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();

    // Mirrors TS: only users with invites >= 1, sorted desc.
    let mut rows = sort_leaderboard(load_all_invites(pool, &gid).await);
    rows.retain(|(_, s)| s.invites >= 1);

    let (guild_name, guild_icon) = ctx
        .guild()
        .map(|g| (g.name.clone(), g.icon_url().unwrap_or_default()))
        .unwrap_or_default();
    let author_id = ctx.author().id.get();

    let rank_text = match rows.iter().position(|(uid, _)| *uid == author_id) {
        Some(pos) => t("leaderboard_rank_text")
            .replace("${userRank + 1}", &(pos + 1).to_string())
            .replace("${arr.length}", &rows.len().to_string())
            .replace("${arr[userRank].invites}", &rows[pos].1.invites.to_string()),
        None => t("leaderboard_rank_none"),
    };
    let header = t("leaderboard_gen_time_msg")
        .replace("${interaction.guild?.name}", &guild_name)
        .replace(
            "${Date.now() - execTimestamp}",
            &t0.elapsed().as_millis().to_string(),
        );
    let row_tpl = t("leaderboard_text_inline");
    let title = format!("{} • {guild_name}", t("leaderboard_default_text"));

    // Mirrors `!leaderboard.ts`: the embed always renders, even with zero
    // rows (header + own-rank line, no row lines). No early bare-text
    // return — an empty board still shows the titled embed + footer.

    let items_per_page = 15usize;
    let total_pages = rows.len().div_ceil(items_per_page);
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    // Guild icon snapshot for the `attachment://guildIcon.png` thumbnail.
    // Mirrors the guildIcon.png file in `!leaderboard.ts` (bytes attached
    // so the thumbnail survives icon changes; raw URL when offline).
    let guild_icon_bytes = if guild_icon.is_empty() {
        None
    } else {
        crate::image64::image64(&guild_icon).await
    };

    let mk_embed = |page: usize| {
        let start = page * items_per_page;
        let mut desc = header.clone();
        for (i, (uid, s)) in rows.iter().skip(start).take(items_per_page).enumerate() {
            desc.push_str(&render_row(&row_tpl, start + i + 1, *uid, s));
        }
        // Own-rank line only on the first page, like TS (`start === 0`).
        if page == 0 {
            desc.push('\n');
            desc.push_str(&rank_text);
        }
        let mut embed = serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0xFFB6C1)
            .description(desc)
            .footer(
                serenity::CreateEmbedFooter::new(fname.clone()).icon_url(if fbytes.is_some() {
                    "attachment://footer_icon.png".to_string()
                } else {
                    String::new()
                }),
            )
            .timestamp(serenity::Timestamp::now());
        if !guild_icon.is_empty() {
            if guild_icon_bytes.is_some() {
                embed = embed.thumbnail("attachment://guildIcon.png");
            } else {
                embed = embed.thumbnail(guild_icon.clone());
            }
        }
        embed
    };
    let mk_row = |page: usize| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("inv-lb-prev")
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(page == 0),
            serenity::CreateButton::new("inv-lb-next")
                .style(serenity::ButtonStyle::Secondary)
                .label(">>>")
                .disabled(page + 1 >= total_pages),
        ])
    };

    let mut reply = poise::CreateReply::default().embed(mk_embed(0));
    if total_pages > 1 {
        reply = reply.components(vec![mk_row(0)]);
    }
    if let Some(bytes) = fbytes.clone() {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    if let Some(bytes) = guild_icon_bytes.clone() {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "guildIcon.png"));
    }
    let handle = ctx.send(reply).await?;
    if total_pages <= 1 {
        return Ok(());
    }
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    // Mirrors the 15-minute button collector in TS.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60 * 15))
            .await;
        let Some(press) = press else { break };
        if press.data.custom_id != "inv-lb-prev" && press.data.custom_id != "inv-lb-next" {
            continue;
        }
        match press.data.custom_id.as_str() {
            "inv-lb-prev" => page = page.saturating_sub(1),
            "inv-lb-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(page))
                        .components(vec![mk_row(page)]),
                ),
            )
            .await;
    }
    // Remove the row when the collector ends, like the TS end handler
    // (`embedMessage.edit({ components: [] })`).
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::{sort_leaderboard, InviteStats};
    use super::{medal_for, render_row};

    #[test]
    fn medals_and_filter_match_ts() {
        assert_eq!(medal_for(1), "🥇");
        assert_eq!(medal_for(2), "🥈");
        assert_eq!(medal_for(3), "🥉");
        assert_eq!(medal_for(4), "4");
        let rows = sort_leaderboard(vec![
            (
                1,
                InviteStats {
                    invites: 0,
                    ..Default::default()
                },
            ),
            (
                2,
                InviteStats {
                    invites: 5,
                    regular: 3,
                    bonus: 2,
                    leaves: 1,
                },
            ),
        ]);
        let kept: Vec<_> = rows.into_iter().filter(|(_, s)| s.invites >= 1).collect();
        assert_eq!(kept.len(), 1);
        assert_eq!(kept[0].0, 2);
        let row = render_row(
            "`${i} ` <@${index.inviter}> • Invites: **${index.invites}** regular ${index.regular} bonus ${index.bonus} left ${index.leaves}",
            1,
            2,
            &kept[0].1,
        );
        assert!(row.contains("🥇") && row.contains("<@2>") && row.contains("**5**"));
    }
}
