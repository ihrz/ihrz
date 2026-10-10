use super::*;
use poise::serenity_prelude as serenity;
use poise::serenity_prelude::Mentionable;

// Button + modal ids. Mirror `!message.ts:97,101,128,133`.
pub const NOTIFY_SET_ID: &str = "notifyMessage-set-message";
pub const NOTIFY_DEFAULT_ID: &str = "notifyMessage-default-message";
pub const NOTIFY_MODAL_ID: &str = "notifyMessage-Modal";
pub const NOTIFY_INPUT_ID: &str = "notifyMessage-input";

/// Cap a notify template at 1010 chars. Mirrors the TS modal
/// `maxLength: 1010` (`!message.ts:137`) and the
/// `notifyMessage?.substring(0, 1010)` read guard (`!message.ts:62`).
pub fn truncate_notify_message(template: &str) -> String {
    template.chars().take(1010).collect()
}

/// Preview one template the way the notifier announce renders it:
/// raw template plus the member/guild render (mirrors the
/// `!message.ts:72-80,84-92` help embed, whose previews render with
/// no notifier context, so artist slots keep their TS defaults).
fn preview_block(
    raw: &str,
    username: &str,
    mention: &str,
    member_count: u64,
    guild_name: &str,
) -> String {
    let rendered =
        crate::events::render_xp_announce(raw, username, mention, member_count, guild_name, 1337);
    format!("```{raw}```\n{rendered}")
}

fn help_embed(
    code: &str,
    custom_raw: Option<&str>,
    default_tpl: &str,
    username: &str,
    mention: &str,
    member_count: u64,
    guild_name: &str,
) -> serenity::CreateEmbed {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    let custom_field = match custom_raw.filter(|t| !t.is_empty()) {
        Some(t) => preview_block(t, username, mention, member_count, guild_name),
        None => say(
            "ranksSetMessage_help_embed_fields_custom_name_empy",
            "Not Set!",
        ),
    };
    serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(255, 179, 204))
        .title(say(
            "notifier_config_message_helpEmbed_title",
            "Custom Notify Message",
        ))
        .description(say(
            "notifier_config_message_helpEmbed_desc",
            "{artistAuthor} => The username of the Streamer/Youtuber",
        ))
        .field(
            say(
                "ranksSetMessage_help_embed_fields_custom_name",
                "Custom Message",
            ),
            custom_field,
            false,
        )
        .field(
            say(
                "ranksSetMessage_help_embed_fields_default_name_empy",
                "Default Message",
            ),
            preview_block(default_tpl, username, mention, member_count, guild_name),
            false,
        )
}

fn action_row(code: &str, disabled: bool) -> serenity::CreateActionRow {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    let mut set = serenity::CreateButton::new(NOTIFY_SET_ID)
        .style(serenity::ButtonStyle::Primary)
        .label(say("ranksSetMessage_button_set_name", "Set message"));
    let mut def = serenity::CreateButton::new(NOTIFY_DEFAULT_ID)
        .style(serenity::ButtonStyle::Danger)
        .label(say("ranksSetMessage_buttom_del_name", "Default Message"));
    if disabled {
        set = set.disabled(true);
        def = def.disabled(true);
    }
    serenity::CreateActionRow::Buttons(vec![set, def])
}

/// Notify message preview / set / reset.
// Mirrors `!message.ts`: help embed (custom + default previews) with
// set/default buttons (80s), a set-message modal (2..1010 chars),
// and reset deleting `NOTIFIER.message`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_message(
    ctx: Ctx<'_>,
    #[description = "Template (omit for preview, empty to reset)"] template: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let tick = crate::emojis::app_emoji_markup(ctx.http(), "GreenTick")
        .await
        .unwrap_or_else(|| "✅".to_string());
    // TS replies with `notifier_config_message_command_work_on_enable`
    // on both the set and the reset flows (`!message.ts:172,202`).
    let reply = say(
        "notifier_config_message_command_work_on_enable",
        "Successfully set notify message.",
    )
    .replace("${client.iHorizon_Emojis.GreenTick}", &tick);
    let mention = ctx.author().mention().to_string();
    let (guild_name, member_count) = ctx
        .guild_id()
        .and_then(|id| ctx.cache().guild(id))
        .map(|g| (g.name.clone(), g.member_count))
        .unwrap_or_default();
    let default_tpl = say(
        "notifier_on_new_media_default_message",
        "@everyone has published a new video",
    );

    if let Some(template) = template {
        // Direct set/reset leg (prefix path): empty resets.
        let trimmed = template.trim().to_string();
        if trimmed.is_empty() {
            delete_notifier_key(&ctx.data().pool, &gid, "NOTIFIER.message").await?;
            ctx.say(reply).await?;
            return Ok(());
        }
        if trimmed.chars().count() < 2 {
            ctx.say("Message too short: the notify template needs at least 2 characters.")
                .await?;
            return Ok(());
        }
        let capped = truncate_notify_message(&trimmed);
        save_notifier_string(&ctx.data().pool, &gid, "NOTIFIER.message", &capped).await?;
        ctx.say(reply).await?;
        return Ok(());
    }

    // Preview leg: help embed + set/default buttons, 80s collector.
    let stored = load_notifier_string(&ctx.data().pool, &gid, "NOTIFIER.message")
        .await
        .map(|t| truncate_notify_message(&t));
    let embed = help_embed(
        &code,
        stored.as_deref(),
        &default_tpl,
        &ctx.author().name,
        &mention,
        member_count,
        &guild_name,
    );
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(embed)
                .components(vec![action_row(&code, false)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(80);
    loop {
        let now = tokio::time::Instant::now();
        if now >= deadline {
            break;
        }
        let pressed = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(deadline - now)
            .filter(move |i| {
                i.user.id == author
                    || [NOTIFY_SET_ID, NOTIFY_DEFAULT_ID].contains(&i.data.custom_id.as_str())
            })
            .await;
        let Some(pressed) = pressed else { break };
        if pressed.user.id != author {
            let _ = pressed
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(say("help_not_for_you", "This is not for you."))
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        if pressed.data.custom_id == NOTIFY_SET_ID {
            let title = say(
                "notifier_config_message_awaiting_response",
                "Write the notify message.",
            );
            let mut opts = crate::modal_helper::ModalOptions::new(&title, NOTIFY_MODAL_ID);
            opts.fields = vec![crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: NOTIFY_INPUT_ID.to_string(),
                    label: say(
                        "notifier_config_message_embed_fields_notifyMessage",
                        "Notify Message",
                    ),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Paragraph,
                    required: true,
                    max_length: Some(1010),
                    min_length: Some(2),
                    value: None,
                },
            )];
            let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
                break;
            };
            if pressed
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Modal(modal),
                )
                .await
                .is_err()
            {
                break;
            }
            let sctx = ctx.serenity_context().clone();
            let Some(submit) =
                crate::commands::await_modal_submit(&sctx, &pressed, NOTIFY_MODAL_ID).await
            else {
                break;
            };
            let response = crate::modal_helper::text_value(&submit, NOTIFY_INPUT_ID);
            if response.trim().chars().count() < 2 {
                let _ = submit
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content("Message too short: the notify template needs at least 2 characters.")
                                .ephemeral(true),
                        ),
                    )
                    .await;
                continue;
            }
            save_notifier_string(&ctx.data().pool, &gid, "NOTIFIER.message", &response).await?;
            let _ = submit
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(reply.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            let stored = load_notifier_string(&ctx.data().pool, &gid, "NOTIFIER.message").await;
            let embed = help_embed(
                &code,
                stored.as_deref(),
                &default_tpl,
                &ctx.author().name,
                &mention,
                member_count,
                &guild_name,
            );
            let _ = msg
                .edit(ctx.http(), serenity::EditMessage::new().embeds(vec![embed]))
                .await;
        } else if pressed.data.custom_id == NOTIFY_DEFAULT_ID {
            delete_notifier_key(&ctx.data().pool, &gid, "NOTIFIER.message").await?;
            let _ = pressed
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(reply.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            let embed = help_embed(
                &code,
                None,
                &default_tpl,
                &ctx.author().name,
                &mention,
                member_count,
                &guild_name,
            );
            let _ = msg
                .edit(ctx.http(), serenity::EditMessage::new().embeds(vec![embed]))
                .await;
        }
    }
    // Collector end: disable the buttons (`collector.on("end")`).
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![action_row(&code, true)]),
        )
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::truncate_notify_message;

    #[test]
    fn truncation_caps_at_1010_chars_like_ts_substring() {
        let long = "a".repeat(2000);
        assert_eq!(truncate_notify_message(&long).chars().count(), 1010);
        assert_eq!(truncate_notify_message("hi"), "hi");
    }
}
