use super::*;
use poise::serenity_prelude as serenity;

/// Collector lifetime from !allwebhooks.ts (`60_000 * 15`).
pub const ALLWEBHOOKS_COLLECTOR_SECS: u64 = 900;

/// Webhooks pager size from !allwebhooks.ts.
pub const ALLWEBHOOKS_PER_PAGE: usize = 5;

/// List webhooks. Mirrors !allwebhooks.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allwebhooks",
    aliases("webhooks", "webhook"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Afficher toute les webhooks enregistrer sur le serveur"),
    description_localized("ja", "サーバーに登録された全Webhookを一覧表示"),
    description_localized("ru", "Показать все вебхуки на сервере"),
    description_localized("es-ES", "Listar todos los webhooks registrados en el servidor")
)]
pub async fn allwebhooks(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let hooks = guild_id.webhooks(ctx.http()).await.unwrap_or_default();
    if hooks.is_empty() {
        ctx.say(
            crate::lang::get(&code, "util_no_webhooks")
                .unwrap_or_else(|| "There are no webhooks in this guild.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let entries: Vec<String> = hooks
        .iter()
        .map(|w| {
            format_allwebhook_entry(
                w.name.clone().unwrap_or_else(|| "?".to_string()),
                w.id.get(),
                webhook_token_len(w),
                w.channel_id.map(|c| c.get()),
            )
        })
        .collect();
    let pages = allwebhooks_pages(&entries, &t("util_allwebhooks_embed_title"));
    let total = pages.len();
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let not_for_you = t("help_not_for_you");
    let deleting = t("util_allwebhooks_deleting");
    let deleted_tpl = t("util_allwebhooks_deleted");
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let footer_icon = footer_bytes.is_some();
    let mk_embed = |cur: usize| {
        let (title, desc) = pages[cur].clone();
        let mut footer =
            serenity::CreateEmbedFooter::new(crate::commands::shared::footer_page_text(
                &footer_name,
                &page_word,
                (cur + 1) as u64,
                total as u64,
            ));
        if footer_icon {
            footer = footer.icon_url("attachment://footer_icon.png");
        }
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0x72, 0xF3, 0xF3))
            .title(title)
            .description(desc)
            .footer(footer)
    };
    let mk_row = || {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("previous")
                .label("<<<")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("next")
                .label(">>>")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("delete")
                .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
                .style(serenity::ButtonStyle::Danger),
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
            .timeout(std::time::Duration::from_secs(ALLWEBHOOKS_COLLECTOR_SECS))
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
            // TS clamps at both ends (early return, no wrap).
            "previous" => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                cur = cur.saturating_sub(1);
            }
            "next" => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                if cur + 1 < total {
                    cur += 1;
                }
            }
            "delete" => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                let _ = msg
                    .edit(
                        ctx.http(),
                        serenity::EditMessage::new()
                            .content(deleting.clone())
                            .components(vec![]),
                    )
                    .await;
                // TS counts every webhook even when deletion fails
                // (`webhook.delete().catch(() => false)` still hits `u++`).
                let mut u = 0u64;
                for w in &hooks {
                    let _ = w.delete(ctx.http()).await;
                    u += 1;
                }
                let _ = msg
                    .edit(
                        ctx.http(),
                        serenity::EditMessage::new()
                            .content(deleted_tpl.replace("${u}", &u.to_string()))
                            .embeds(vec![])
                            .components(vec![]),
                    )
                    .await;
                return Ok(());
            }
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
    // TS `collector.on("end")` strips the components.
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

/// Token display length for the masked webhook URL.
///
/// The token field hides its contents (no accessor, and `Secret<String>`
/// has no usable `Serialize` impl), but serenity's `Webhook` serializer
/// exposes it — enough to mirror the TS per-character `◯` mask without
/// ever holding the secret ourselves.
fn webhook_token_len(webhook: &serenity::Webhook) -> usize {
    serde_json::to_value(webhook)
        .ok()
        .and_then(|v| v.get("token")?.as_str().map(|s| s.chars().count()))
        .unwrap_or(0)
}

/// One pager line: `[name](url) (<#channel>)`, mirroring !allwebhooks.ts.
pub fn format_allwebhook_entry(
    name: String,
    id: u64,
    token_len: usize,
    channel_id: Option<u64>,
) -> String {
    let masked: String = "◯".repeat(token_len);
    let channel = channel_id
        .map(|c| format!("<#{c}>"))
        .unwrap_or_else(|| "?".to_string());
    format!("[{name}](https://discord.com/api/webhooks/{id}/{masked}) ({channel})")
}

/// Build pager pages (5 webhooks each) sharing one title.
pub fn allwebhooks_pages(entries: &[String], title: &str) -> Vec<(String, String)> {
    entries
        .chunks(ALLWEBHOOKS_PER_PAGE)
        .map(|chunk| (title.to_string(), chunk.join("\n")))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pages_chunk_by_five_with_shared_title() {
        let entries: Vec<String> = (0..6).map(|i| format!("hook{i}")).collect();
        let pages = allwebhooks_pages(&entries, "All webhooks");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "All webhooks");
        assert_eq!(pages[0].1, "hook0\nhook1\nhook2\nhook3\nhook4");
        assert_eq!(pages[1].1, "hook5");
    }

    #[test]
    fn entry_masks_token_per_character() {
        assert_eq!(
            format_allwebhook_entry("Log".to_string(), 1, 3, Some(2)),
            "[Log](https://discord.com/api/webhooks/1/◯◯◯) (<#2>)"
        );
    }

    #[test]
    fn collector_window_is_15min() {
        assert_eq!(ALLWEBHOOKS_COLLECTOR_SECS, 900);
    }
}
