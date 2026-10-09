use super::banlist::{clamp_page_idx, dead_row, deny_foreign_press, nav_buttons};
use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "warnlist",
    aliases("warns", "listwarns", "listwarn", "warnslist", "sanctions"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_warnlist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let warns = load_warns(&ctx.data().pool, &gid, user.id.get()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    if warns.is_empty() {
        let no = emoji(&ctx, "No", "❌").await;
        ctx.say(
            crate::lang::get(&code, "warnlist_no_data")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        .replace("${member?.toString()}", &user.to_string())
                })
                .unwrap_or_else(|| "No warns.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let not_for_you = t("help_not_for_you", "This interaction is not for you");
    let page_word = t("var_page", "Page");
    let name = user
        .global_name
        .clone()
        .unwrap_or_else(|| user.name.clone());
    let unknown = t("var_unknown", "Unknown");
    // One (title, description) pair per page, like the TS `pages` array.
    let pages: Vec<(String, String)> = warns
        .chunks(LIST_PAGE_SIZE)
        .enumerate()
        .map(|(i, chunk)| {
            let title = t(
                "warnlist_embed_title",
                "${member?.user.globalName}'s WarnList | Page ${i / usersPerPage + 1}",
            )
            .replace("${member?.user.globalName}", &name)
            .replace("${i / usersPerPage + 1}", &(i + 1).to_string());
            let body = chunk
                .iter()
                .map(|w| {
                    t(
                        "warnlist_embed_desc",
                        "### ID: ${x.id} - ${format(x.timestamp, 'DD/MM/YYYY')}\n> Author: <@${x.authorID}>\n> Reason: `${x.reason}`",
                    )
                    .replace("${x.id}", &w.id)
                    .replace(
                        "${format(x.timestamp, 'DD/MM/YYYY')}",
                        &crate::funcs::format_date(w.at / 1000, "DD/MM/YYYY"),
                    )
                    .replace("${x.authorID}", &unknown)
                    .replace("${x.reason}", &w.reason)
                })
                .collect::<Vec<_>>()
                .join("\n");
            (title, body)
        })
        .collect();
    let total = pages.len();
    let mut cur = clamp_page_idx(page, total);
    let author = ctx.author().id;
    let mk_embed = |cur: usize| {
        serenity::CreateEmbed::default()
            .title(pages[cur].0.clone())
            .description(pages[cur].1.clone())
            .footer(serenity::CreateEmbedFooter::new(format!(
                "{page_word} {}/{}",
                cur + 1,
                total
            )))
            .colour(0x010101)
            .timestamp(serenity::Timestamp::now())
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(cur))
                .components(vec![serenity::CreateActionRow::Buttons(nav_buttons(
                    "mod-warnlist-prev",
                    "mod-warnlist-next",
                    cur,
                    total,
                ))]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    // 15-minute collector; paging wraps around like the TS modulo.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60 * 15))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            deny_foreign_press(ctx.http(), &press, &not_for_you).await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "mod-warnlist-prev" => cur = (cur + total - 1) % total,
            "mod-warnlist-next" => cur = (cur + 1) % total,
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur))
                        .components(vec![serenity::CreateActionRow::Buttons(nav_buttons(
                            "mod-warnlist-prev",
                            "mod-warnlist-next",
                            cur,
                            total,
                        ))]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .components(vec![dead_row("mod-warnlist-prev", "mod-warnlist-next")]),
        )
        .await;
    Ok(())
}
