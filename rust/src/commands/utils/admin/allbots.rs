use super::*;
use poise::serenity_prelude as serenity;

/// Collector lifetime from !allbots.ts (`60_000`).
pub const ALLBOTS_COLLECTOR_SECS: u64 = 60;

/// Allbots pager size from !allbots.ts.
pub const ALLBOTS_PER_PAGE: usize = 5;

/// List bots. Mirrors !allbots.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allbots",
    aliases("allb", "bots"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn allbots(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let bots: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.user.bot)
                .map(|m| format!("<@{}>", m.user.id.get()))
                .collect()
        })
        .unwrap_or_default();
    if bots.is_empty() {
        // TS !allbots.ts:61 reuses `all_admins_nobody_admins` here.
        ctx.say(t("all_admins_nobody_admins")).await?;
        return Ok(());
    }
    let pages = allbots_pages(&bots, &t("all_bots_embed_title"));
    let total = pages.len();
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let not_for_you = t("help_not_for_you");
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let footer_icon = footer_bytes.is_some();
    let mk_embed = |cur: usize| {
        let (title, desc) = pages[cur].clone();
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0x01, 0x01, 0x01))
            .title(title)
            .description(desc)
            .footer(
                serenity::CreateEmbedFooter::new(crate::commands::shared::footer_page_text(
                    &footer_name,
                    &page_word,
                    (cur + 1) as u64,
                    total as u64,
                ))
                .icon_url(if footer_icon {
                    "attachment://footer_icon.png".to_string()
                } else {
                    String::new()
                }),
            )
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = || {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("previousPage")
                .label("<<<")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("nextPage")
                .label(">>>")
                .style(serenity::ButtonStyle::Secondary),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0))
        .components(vec![mk_row()]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let mut cur = 0usize;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(ALLBOTS_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            // TS wraps around both ends.
            "previousPage" => cur = (cur + total - 1) % total,
            "nextPage" => cur = (cur + 1) % total,
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur))
                        .components(vec![mk_row()]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![allbots_dead_row()]),
        )
        .await;
    Ok(())
}

/// Disabled navigation row for the timeout cleanup.
fn allbots_dead_row() -> serenity::CreateActionRow {
    let btn = |id: &str, label: &str| {
        serenity::CreateButton::new(id)
            .label(label)
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true)
    };
    serenity::CreateActionRow::Buttons(vec![btn("previousPage", "<<<"), btn("nextPage", ">>>")])
}

/// Build pager pages (5 bots each). The title template's
/// `${i / usersPerPage + 1}` placeholder becomes the 1-based page no.
pub fn allbots_pages(entries: &[String], title_tpl: &str) -> Vec<(String, String)> {
    entries
        .chunks(ALLBOTS_PER_PAGE)
        .enumerate()
        .map(|(i, chunk)| {
            (
                title_tpl.replace("${i / usersPerPage + 1}", &(i + 1).to_string()),
                chunk.join("\n"),
            )
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pages_chunk_by_five_with_numbered_titles() {
        let entries: Vec<String> = (0..6).map(|i| format!("<@{i}>")).collect();
        let pages = allbots_pages(&entries, "Bots | Page ${i / usersPerPage + 1}");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "Bots | Page 1");
        assert_eq!(pages[0].1, "<@0>\n<@1>\n<@2>\n<@3>\n<@4>");
        assert_eq!(pages[1].0, "Bots | Page 2");
        assert_eq!(pages[1].1, "<@5>");
    }

    #[test]
    fn collector_window_is_60s() {
        assert_eq!(ALLBOTS_COLLECTOR_SECS, 60);
    }
}
