use super::*;
use poise::serenity_prelude as serenity;

/// Clamp an optional 1-based `page` arg to a 0-based page index.
/// The `page` slash option itself is a deliberate additive extra:
/// !banlist.ts, !mutelist.ts and !warnlist.ts always start on the
/// first page (no TS counterpart); kept so long lists can jump
/// straight to a page.
pub(crate) fn clamp_page_idx(page: Option<i64>, total_pages: usize) -> usize {
    let total = total_pages.max(1);
    (page.unwrap_or(1).clamp(1, total as i64) - 1) as usize
}

/// Prev/next navigation buttons. They disable at the bounds, mirroring
/// the TS collectors (banlist clamps, warnlist/mutelist wrap and so
/// never hit a bound except single-page lists).
pub(crate) fn nav_buttons(
    prev_id: &str,
    next_id: &str,
    cur: usize,
    total_pages: usize,
) -> Vec<serenity::CreateButton> {
    vec![
        serenity::CreateButton::new(prev_id)
            .label("<<<")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(cur == 0 || total_pages <= 1),
        serenity::CreateButton::new(next_id)
            .label(">>>")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(cur + 1 >= total_pages || total_pages <= 1),
    ]
}

/// Fully disabled navigation row for the timeout cleanup (TS `end`
/// handler edits the message with `components: []`; poise cannot clear
/// components on edit as simply, so a disabled row is the established
/// repo equivalent — see economy/leaderboard.rs).
pub(crate) fn dead_row(prev_id: &str, next_id: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(nav_buttons(prev_id, next_id, 0, 1))
}

/// Not-for-you guard. Mirrors the TS `help_not_for_you` ephemeral reply.
pub(crate) async fn deny_foreign_press(
    http: &serenity::Http,
    press: &serenity::ComponentInteraction,
    text: &str,
) {
    let _ = press
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(text.to_string())
                    .ephemeral(true),
            ),
        )
        .await;
}

/// List banned members.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "banlist",
    aliases("bans", "listban", "listbans", "banlists"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn mod_banlist(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    if bans.is_empty() {
        ctx.say(t("var_no_one_banned", "No one is banned in this server."))
            .await?;
        return Ok(());
    }
    let title = t("var_banned_user", "Banned User(s)");
    let not_for_you = t("help_not_for_you", "This interaction is not for you");
    let page_word = t("var_page", "Page");
    // One description per page, like the TS `pages` array.
    let descs: Vec<String> = bans
        .chunks(LIST_PAGE_SIZE)
        .map(|chunk| {
            chunk
                .iter()
                .map(|b| {
                    format!(
                        "[{}](https://discord.com/users/{}) ({})",
                        b.user.id.get(),
                        b.user.id.get(),
                        b.user
                    )
                })
                .collect::<Vec<_>>()
                .join("\n")
        })
        .collect();
    let total = descs.len();
    let mut cur = clamp_page_idx(page, total);
    let author = ctx.author().id;
    let mk_embed = |cur: usize| {
        serenity::CreateEmbed::default()
            .title(title.clone())
            .description(descs[cur].clone())
            .footer(serenity::CreateEmbedFooter::new(format!(
                "{page_word} {}/{}",
                cur + 1,
                total
            )))
            .colour(0x72F3F3)
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(cur))
                .components(vec![serenity::CreateActionRow::Buttons(nav_buttons(
                    "mod-banlist-prev",
                    "mod-banlist-next",
                    cur,
                    total,
                ))]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    // 15-minute button collector with the not-for-you guard.
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
            "mod-banlist-prev" => cur = cur.saturating_sub(1),
            "mod-banlist-next" => {
                if cur + 1 < total {
                    cur += 1;
                }
            }
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur))
                        .components(vec![serenity::CreateActionRow::Buttons(nav_buttons(
                            "mod-banlist-prev",
                            "mod-banlist-next",
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
                .components(vec![dead_row("mod-banlist-prev", "mod-banlist-next")]),
        )
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_page_start() {
        assert_eq!(clamp_page_idx(None, 3), 0);
        assert_eq!(clamp_page_idx(Some(2), 3), 1);
        assert_eq!(clamp_page_idx(Some(99), 3), 2);
        assert_eq!(clamp_page_idx(Some(0), 3), 0);
        assert_eq!(clamp_page_idx(Some(-5), 3), 0);
        assert_eq!(clamp_page_idx(Some(1), 0), 0);
    }
}
