use super::*;
use poise::serenity_prelude as serenity;

// Full interactive embed builder. Mirrors the !embed.ts EmbedManager
// (the TS `embed` subcommand of HybridCommands/utils/utils.ts:850,
// permission ManageMessages, optional saved `id` preload — the ONLY
// TS slash option; there are no `title`/`description` params).
// CustomIds are byte-exact with TS: the `embed-select-menu` string
// select (15 `chooseAction` values), the `embed-save-channel`
// channel select, and the bare `save` / `send` / `replace` /
// `cancel` buttons. Field editing runs through message collectors
// (`handleCollector`), save/send/replace through the button legs,
// and both collectors disable the rows on end — all in-command, so
// no events_handler wiring is needed (unlike the separate
// prefix-only draft builder under commands/embed/).
pub const EMBED_SELECT_ID: &str = "embed-select-menu";
pub const EMBED_CHANNEL_ID: &str = "embed-save-channel";
pub const EMBED_BTN_SAVE: &str = "save";
pub const EMBED_BTN_SEND: &str = "send";
pub const EMBED_BTN_REPLACE: &str = "replace";
pub const EMBED_BTN_CANCEL: &str = "cancel";
// Mirrors `time_maximum = 1_420_000` ms.
pub const BUILDER_TIMEOUT_MS: u64 = 1_420_000;

// Create a beautiful embed!
/// Create a beautiful embed!
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "embed",
    default_member_permissions = "MANAGE_MESSAGES",
    description_localized("fr", "Créez un magnifique embed"),
    description_localized("ja", "美しい埋め込みを作成！"),
    description_localized("ru", "Создать красивый эмбед!"),
    description_localized("es-ES", "Crear un embed hermoso!")
)]
pub async fn embed_post(
    ctx: Ctx<'_>,
    #[description_localized(
        "fr",
        "Si vous disposez d'un identifiant d'un embed précèdement enregistrer"
    )]
    #[description_localized("ja", "埋め込みのIDがある場合！")]
    #[description_localized("ru", "Если у вас есть ID эмбеда!")]
    #[description_localized("es-ES", "Si tienes un ID de embed!")]
    #[description = "If you have an embed's ID!"]
    id: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();

    // Preload flow: `run(arg)` loads `EMBED.{id}` into the draft when
    // the id is valid and stored; otherwise a fresh
    // `new EmbedBuilder().setDescription("** **")` draft. Either way
    // the builder opens — TS never reposts-and-returns.
    let mut draft = serde_json::json!({ "description": "** **" });
    let mut entry_id: Option<String> = None;
    if let Some(arg) = id.as_deref().filter(|s| is_valid_embed_id(Some(s))) {
        if let Some(stored) =
            crate::commands::owner::main::tbl_get(pool, "metas", &saved_embed_key(arg))
                .await
                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                .and_then(|v| stored_embed_source(&v).cloned())
        {
            draft = stored;
            entry_id = Some(arg.to_string());
        }
    }

    let handle = ctx
        .send(
            poise::CreateReply::default()
                .content(t("embed_first_message"))
                .embed(create_embed_from_source(&draft))
                .components(panel_rows(&t)),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let http = ctx.http();
    let author = ctx.author().id;
    let not_for_you = t("embed_interaction_not_for_you");
    let deadline =
        tokio::time::Instant::now() + std::time::Duration::from_millis(BUILDER_TIMEOUT_MS);
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.user.id != author {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let custom = press.data.custom_id.clone();
        if custom == EMBED_SELECT_ID {
            let value = match &press.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => continue,
            };
            choose_action(
                &ctx, &press, &mut msg, &mut draft, &value, &t, &gid, remaining,
            )
            .await;
        } else if custom == EMBED_BTN_SAVE {
            // Mirrors the save leg: `saveEmbed(arg)` (owner overwrite
            // or fresh 16-char id), then the filled save message with
            // everything cleared.
            let embed_id = save_draft(pool, entry_id.as_deref(), author.get(), &draft).await;
            let done = fill_embed_save_message(&t("embed_save_message"), author.get(), &embed_id);
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(done)
                            .embeds(vec![]),
                    ),
                )
                .await;
            break;
        } else if custom == EMBED_BTN_CANCEL {
            let done = t("embed_cancel_message")
                .replace("${interaction.user.id}", &author.get().to_string());
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(done)
                            .embeds(vec![]),
                    ),
                )
                .await;
            break;
        } else if (custom == EMBED_BTN_SEND
            && send_flow(&ctx, &press, &mut msg, &draft, &t, author.get(), remaining).await)
            || (custom == EMBED_BTN_REPLACE
                && replace_flow(&ctx, &press, &mut msg, &draft, &t, &gid, remaining).await)
        {
            break;
        }
    }
    // Both collectors' `end` leg: strip the rows like TS.
    let _ = msg
        .edit(http, serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

// The 15 builder select options in TS order: (value, lang label key,
// emoji). Mirrors `createComponents` (`chooseAction` keys).
pub const EMBED_BUILDER_OPTIONS: &[(&str, &str, &str)] = &[
    ("0", "embed_placeholder_option_copy_embed", "📥"),
    ("1", "embed_placeholder_option_edit_title", "🖊"),
    ("2", "embed_placeholder_option_delete_title", "💥"),
    ("3", "embed_placeholder_option_edit_description", "💬"),
    ("4", "embed_placeholder_option_delete_description", "📝"),
    ("5", "embed_placeholder_option_edit_author", "🕵️"),
    ("6", "embed_placeholder_option_delete_author", "✂"),
    ("7bis", "embed_placeholde_option_change_footer_image", "🖼️"),
    ("7", "embed_placeholder_option_edit_footer", "🔻"),
    ("8", "embed_placeholder_option_delete_footer", "🔺"),
    ("9", "embed_placeholder_option_edit_thumbnail", "🔳"),
    ("10", "embed_placeholder_option_edit_image", "🖼️"),
    ("11", "embed_placeholder_option_edit_titleurl", "🌐"),
    ("12", "embed_placeholder_option_edit_color", "🎨"),
    ("13", "embed_placeholder_option_delete_color", "🔵"),
];

fn panel_rows(t: &impl Fn(&str) -> String) -> Vec<serenity::CreateActionRow> {
    let options: Vec<serenity::CreateSelectMenuOption> = EMBED_BUILDER_OPTIONS
        .iter()
        .map(|(value, label_key, emoji)| {
            serenity::CreateSelectMenuOption::new(t(label_key), *value)
                .emoji(serenity::ReactionType::Unicode(emoji.to_string()))
        })
        .collect();
    vec![
        serenity::CreateActionRow::SelectMenu(
            serenity::CreateSelectMenu::new(
                EMBED_SELECT_ID,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(t("embed_placeholder_string_select_menu_builder")),
        ),
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(EMBED_BTN_SAVE)
                .label(t("embed_btn_save"))
                .style(serenity::ButtonStyle::Success),
            serenity::CreateButton::new(EMBED_BTN_SEND)
                .label(t("embed_btn_send"))
                .style(serenity::ButtonStyle::Primary),
            serenity::CreateButton::new(EMBED_BTN_REPLACE)
                .label(t("embed_btn_replace"))
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new(EMBED_BTN_CANCEL)
                .label(t("embed_btn_cancel"))
                .style(serenity::ButtonStyle::Danger),
        ]),
    ]
}

// Re-render the builder message. Mirrors `updateResponse` (embeds +
// components; TS also re-sends uploaded files — this port references
// attachment URLs directly, so no file plumbing is needed).
async fn update_response(
    http: &serenity::Http,
    msg: &mut serenity::Message,
    draft: &serde_json::Value,
    t: &impl Fn(&str) -> String,
) {
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new()
                .embeds(vec![create_embed_from_source(draft)])
                .components(panel_rows(t)),
        )
        .await;
}

// Restore the main interface after a failed replace. Mirrors
// `restoreMainInterface`.
async fn restore_main(
    http: &serenity::Http,
    msg: &mut serenity::Message,
    draft: &serde_json::Value,
    t: &impl Fn(&str) -> String,
) {
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new()
                .content(t("embed_first_message"))
                .embeds(vec![create_embed_from_source(draft)])
                .components(panel_rows(t)),
        )
        .await;
}

// Mirrors `handleCollector`: ephemeral prompt reply, then the next
// author message in this channel (max 1, builder timeout). The
// prompt reply and the user message are deleted like TS.
async fn prompt_next_message(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    prompt: String,
    timeout: std::time::Duration,
) -> Option<serenity::Message> {
    let http = ctx.http();
    if press
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(prompt)
                    .ephemeral(true),
            ),
        )
        .await
        .is_err()
    {
        return None;
    }
    let channel_id = ctx.channel_id();
    let author_id = press.user.id;
    let collected: Option<serenity::Message> =
        serenity::collector::MessageCollector::new(ctx.serenity_context().shard.clone())
            .author_id(author_id)
            .channel_id(channel_id)
            .timeout(timeout)
            .await;
    // Best-effort cleanup of the prompt reply, like TS.
    if let Ok(reply) = press.get_response(http).await {
        let _ = reply.delete(http).await;
    }
    let message = collected?;
    let _ = message.delete(http).await;
    Some(message)
}

// Ephemeral follow-up on an interaction. Mirrors `i.followUp` /
// `confirmation.followUp` with `flags: [1 << 6]`.
async fn followup_ephemeral(
    press: &serenity::ComponentInteraction,
    http: &serenity::Http,
    content: String,
) {
    let _ = press
        .create_followup(
            http,
            serenity::CreateInteractionResponseFollowup::new()
                .content(content)
                .ephemeral(true),
        )
        .await;
}

// The select-menu dispatch. Mirrors `chooseAction` (`"0"`..`"13"`,
// `"7bis"`).
#[allow(clippy::too_many_arguments)]
async fn choose_action(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    msg: &mut serenity::Message,
    draft: &mut serde_json::Value,
    value: &str,
    t: &impl Fn(&str) -> String,
    gid: &str,
    timeout: std::time::Duration,
) {
    let http = ctx.http();
    match value {
        // Copy an embed from a message URL.
        "0" => {
            let Some(answer) = prompt_next_message(ctx, press, t("embed_choose_0"), timeout).await
            else {
                return;
            };
            match copy_embed_from_input(ctx, &answer.content, gid).await {
                Ok(source) => {
                    *draft = source;
                    update_response(http, msg, draft, t).await;
                }
                Err(err) => {
                    followup_ephemeral(press, http, err).await;
                }
            }
        }
        // Free-text edits.
        "1" | "3" | "5" | "7" | "9" | "10" | "11" => {
            let prompt_key = match value {
                "1" => "embed_choose_1",
                "3" => "embed_choose_3",
                "5" => "embed_choose_5",
                "7" => "embed_choose_7",
                "9" => "embed_choose_9",
                "10" => "embed_choose_10",
                _ => "embed_choose_11",
            };
            let Some(answer) = prompt_next_message(ctx, press, t(prompt_key), timeout).await else {
                return;
            };
            if value == "9" || value == "10" || value == "7bis" {
                let kind = match value {
                    "9" => "thumbnail",
                    "10" => "image",
                    _ => "footer",
                };
                let media = classify_media(&answer.content, image_attachment_urls(&answer));
                draft_apply_media(draft, kind, &media);
                update_response(http, msg, draft, t).await;
            } else if draft_apply_text(draft, value, &answer.content) {
                update_response(http, msg, draft, t).await;
            }
            // TS silently ignores an invalid link for "11" (no
            // update, no reply) — mirrored by the `false` return.
        }
        // Footer image from a link or upload.
        "7bis" => {
            let Some(answer) =
                prompt_next_message(ctx, press, t("embed_choose_7bis"), timeout).await
            else {
                return;
            };
            let media = classify_media(&answer.content, image_attachment_urls(&answer));
            draft_apply_media(draft, "footer", &media);
            update_response(http, msg, draft, t).await;
        }
        // Instant clears / resets with an ephemeral ack.
        "2" | "4" | "6" | "8" | "13" => {
            let ack_key = match value {
                "2" => "embed_choose_2",
                "4" => "embed_choose_4",
                "6" => "embed_choose_6",
                "8" => "embed_choose_8",
                _ => "embed_choose_13",
            };
            draft_clear(draft, value);
            update_response(http, msg, draft, t).await;
            let _ = press
                .create_followup(
                    http,
                    serenity::CreateInteractionResponseFollowup::new()
                        .content(t(ack_key))
                        .ephemeral(true),
                )
                .await;
        }
        // Color with validation; invalid values go to the public
        // channel like TS `channelSend`.
        "12" => {
            let Some(answer) = prompt_next_message(ctx, press, t("embed_choose_12"), timeout).await
            else {
                return;
            };
            if draft_apply_color(draft, &answer.content) {
                update_response(http, msg, draft, t).await;
            } else {
                let no = crate::emojis::app_emoji_markup(http, "No")
                    .await
                    .unwrap_or_else(|| "❌".to_string());
                let err = t("embed_choose_12_error").replace("${client.iHorizon_Emojis.No}", &no);
                let _ = ctx
                    .channel_id()
                    .send_message(http, serenity::CreateMessage::new().content(err))
                    .await;
            }
        }
        _ => {}
    }
}

// Copy source resolution + guards. Mirrors `copyEmbed`: Discord URL
// parts, same-guild check, channel fetch, message fetch, first
// embed. Returns the draft-ready source value or the follow-up
// error text.
async fn copy_embed_from_input(
    ctx: &Ctx<'_>,
    input: &str,
    gid: &str,
) -> Result<serde_json::Value, String> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let http = ctx.http();
    let Some(parts) = extract_discord_url_parts(input.trim()) else {
        // TS throws `Error("URL Discord non valide")` here.
        return Err("URL Discord non valide".to_string());
    };
    if !copy_same_guild(&parts, gid) {
        let guild_name = ctx
            .guild_id()
            .and_then(|g| ctx.cache().guild(g))
            .map(|g| g.name.clone())
            .unwrap_or_default();
        return Err(fill_copy_bad_guild(
            &t("embed_copy_bad_guild_msg"),
            &guild_name,
        ));
    }
    let Ok(channel_id) = parts.channel_id.parse::<u64>() else {
        return Err(t("embed_copy_bad_channel_msg"));
    };
    let Ok(message_id) = parts.message_id.parse::<u64>() else {
        return Err(t("embed_copy_bad_message_msg"));
    };
    let channel = serenity::ChannelId::new(channel_id)
        .to_channel(http)
        .await
        .ok()
        .and_then(|c| match c {
            serenity::Channel::Guild(c) => Some(c),
            _ => None,
        });
    let Some(channel) = channel else {
        return Err(t("embed_copy_bad_channel_msg"));
    };
    let Ok(target) = channel
        .id
        .message(http, serenity::MessageId::new(message_id))
        .await
    else {
        return Err(t("embed_copy_bad_message_msg"));
    };
    let Some(found) = target.embeds.first() else {
        return Err(t("embed_copy_bad_embed_message_msg"));
    };
    Ok(message_embed_to_value(found))
}

// Mirrors `sendEmbed`: swap to the channel picker, send the draft to
// the chosen text channel, then the done message. Returns true when
// the builder should stop.
async fn send_flow(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    msg: &mut serenity::Message,
    draft: &serde_json::Value,
    t: &impl Fn(&str) -> String,
    author_id: u64,
    timeout: std::time::Duration,
) -> bool {
    let http = ctx.http();
    let picker = serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            EMBED_CHANNEL_ID,
            serenity::CreateSelectMenuKind::Channel {
                channel_types: Some(vec![serenity::ChannelType::Text]),
                default_channels: None,
            },
        )
        .min_values(1)
        .max_values(1),
    );
    if press
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .content(
                        t("embed_send_message")
                            .replace("${interaction.user.id}", &author_id.to_string()),
                    )
                    .components(vec![picker]),
            ),
        )
        .await
        .is_err()
    {
        return false;
    }
    let picked: Option<serenity::ChannelId> =
        serenity::collector::ComponentInteractionCollector::new(
            ctx.serenity_context().shard.clone(),
        )
        .author_id(press.user.id)
        .channel_id(ctx.channel_id())
        .custom_ids(vec![EMBED_CHANNEL_ID.to_string()])
        .timeout(timeout)
        .await
        .and_then(|pick| match &pick.data.kind {
            serenity::ComponentInteractionDataKind::ChannelSelect { values } => {
                values.first().copied()
            }
            _ => None,
        });
    let Some(channel_id) = picked else {
        return false;
    };
    let _ = channel_id
        .send_message(
            http,
            serenity::CreateMessage::new().embed(create_embed_from_source(draft)),
        )
        .await;
    let done = fill_embed_send_done(
        &t("embed_send_embed_work"),
        author_id,
        &channel_id.get().to_string(),
    );
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new()
                .content(done)
                .embeds(vec![])
                .components(vec![]),
        )
        .await;
    true
}

// Mirrors `replaceEmbed`: ask for the target message URL, edit that
// message in place, then the done message. Errors follow up and
// restore the main interface; the builder keeps running. Returns
// true when the builder should stop.
async fn replace_flow(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    msg: &mut serenity::Message,
    draft: &serde_json::Value,
    t: &impl Fn(&str) -> String,
    gid: &str,
    timeout: std::time::Duration,
) -> bool {
    let http = ctx.http();
    if press
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .content(t("embed_replace_question_msg"))
                    .components(vec![]),
            ),
        )
        .await
        .is_err()
    {
        return false;
    }
    let collected: Option<serenity::Message> =
        serenity::collector::MessageCollector::new(ctx.serenity_context().shard.clone())
            .author_id(press.user.id)
            .channel_id(ctx.channel_id())
            .timeout(timeout)
            .await;
    let Some(answer) = collected else {
        return true;
    };
    let input = answer.content.clone();
    let _ = answer.delete(http).await;
    // Shared copy guards (same-guild, channel, message, embed).
    let outcome: Result<(serenity::ChannelId, serenity::MessageId), String> =
        match copy_target(ctx, &input, gid).await {
            Ok((channel_id, message_id)) => {
                let edit = channel_id
                    .edit_message(
                        http,
                        message_id,
                        serenity::EditMessage::new().embeds(vec![create_embed_from_source(draft)]),
                    )
                    .await;
                match edit {
                    Ok(_) => Ok((channel_id, message_id)),
                    Err(_) => {
                        let code = crate::db::guild_lang(
                            &ctx.data().pool,
                            ctx.guild_id().map(|g| g.get()),
                        )
                        .await;
                        Err(crate::lang::get(&code, "embed_copy_bad_message_msg")
                            .unwrap_or_default())
                    }
                }
            }
            Err(err) => Err(err),
        };
    match outcome {
        Ok(_) => {
            let done = fill_embed_replace_done(
                &t("embed_replace_message"),
                &format!("<@{}>", press.user.id.get()),
                &input,
            );
            if let Ok(mut reply) = press.get_response(http).await {
                let _ = reply
                    .edit(
                        http,
                        serenity::EditMessage::new()
                            .content(done)
                            .components(vec![]),
                    )
                    .await;
            }
            true
        }
        Err(err) => {
            followup_ephemeral(press, http, err).await;
            restore_main(http, msg, draft, t).await;
            false
        }
    }
}

// Resolve a replace target to its channel + message ids, running the
// same guards as `copyEmbed`.
async fn copy_target(
    ctx: &Ctx<'_>,
    input: &str,
    gid: &str,
) -> Result<(serenity::ChannelId, serenity::MessageId), String> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let http = ctx.http();
    let Some(parts) = extract_discord_url_parts(input.trim()) else {
        return Err("URL Discord non valide".to_string());
    };
    if !copy_same_guild(&parts, gid) {
        let guild_name = ctx
            .guild_id()
            .and_then(|g| ctx.cache().guild(g))
            .map(|g| g.name.clone())
            .unwrap_or_default();
        return Err(fill_copy_bad_guild(
            &t("embed_copy_bad_guild_msg"),
            &guild_name,
        ));
    }
    let (Ok(channel_num), Ok(message_num)) = (
        parts.channel_id.parse::<u64>(),
        parts.message_id.parse::<u64>(),
    ) else {
        return Err(t("embed_copy_bad_channel_msg"));
    };
    let channel_id = serenity::ChannelId::new(channel_num);
    let message_id = serenity::MessageId::new(message_num);
    let channel = channel_id
        .to_channel(http)
        .await
        .ok()
        .and_then(|c| match c {
            serenity::Channel::Guild(c) => Some(c),
            _ => None,
        });
    let Some(channel) = channel else {
        return Err(t("embed_copy_bad_channel_msg"));
    };
    let Ok(target) = channel.id.message(http, message_id).await else {
        return Err(t("embed_copy_bad_message_msg"));
    };
    if target.embeds.is_empty() {
        return Err(t("embed_copy_bad_embed_message_msg"));
    }
    Ok((channel.id, message_id))
}

// Persist the draft. Mirrors `saveEmbed`: when the entry id is a
// valid id whose stored owner is the author, overwrite it and return
// it; otherwise store under a fresh 16-char id.
async fn save_draft(
    pool: &crate::db::Pool,
    entry_id: Option<&str>,
    author_id: u64,
    draft: &serde_json::Value,
) -> String {
    if let Some(arg) = entry_id.filter(|s| is_valid_embed_id(Some(s))) {
        if let Some(stored) =
            crate::commands::owner::main::tbl_get(pool, "metas", &saved_embed_key(arg))
                .await
                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        {
            let owner_matches = stored.get("embedOwner").and_then(|v| {
                v.as_str()
                    .map(|s| s.to_string())
                    .or_else(|| v.as_u64().map(|n| n.to_string()))
            }) == Some(author_id.to_string());
            if owner_matches {
                let value = serde_json::json!({
                    "embedOwner": author_id.to_string(),
                    "embedSource": draft,
                });
                let _ = crate::commands::owner::main::tbl_set(
                    pool,
                    "metas",
                    &saved_embed_key(arg),
                    &serde_json::to_string(&value).unwrap_or_default(),
                )
                .await;
                return arg.to_string();
            }
        }
    }
    let fresh = generate_embed_id();
    let value = serde_json::json!({
        "embedOwner": author_id.to_string(),
        "embedSource": draft,
    });
    let _ = crate::commands::owner::main::tbl_set(
        pool,
        "metas",
        &saved_embed_key(&fresh),
        &serde_json::to_string(&value).unwrap_or_default(),
    )
    .await;
    fresh
}

// Interactive builder parity. Mirrors the pure logic in utils
// !embed.ts + `src/core/functions/embedHelper.ts`; the validators,
// URL parsing, copy guards, and reply fills live here.
// Action values of the builder select menu (`chooseAction` keys).
pub const EMBED_ACTIONS: &[&str] = &[
    "0", "1", "2", "3", "4", "5", "6", "7", "7bis", "8", "9", "10", "11", "12", "13",
];

// Mirrors `embedHelper.isValidLink` (http(s):// prefix).
pub fn is_valid_embed_link(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://")
}

// Mirrors `embedHelper.isValidColor` (`/^#([0-9a-f]{3}){1,2}$/i`).
pub fn is_valid_embed_color(color: &str) -> bool {
    let hex = color.strip_prefix('#').unwrap_or("");
    (hex.len() == 3 || hex.len() == 6)
        && !hex.is_empty()
        && hex.bytes().all(|b| b.is_ascii_hexdigit())
}

// Mirrors `embedHelper.isValidEmbedId`: non-empty id whose
// `EMBED.{id}` key fits the 255-byte / 32-segment / no-empty-segment
// store limits.
pub fn is_valid_embed_id(id: Option<&str>) -> bool {
    let Some(id) = id.filter(|s| !s.is_empty()) else {
        return false;
    };
    let key = format!("EMBED.{id}");
    if key.len() > 255 {
        return false;
    }
    let segments: Vec<&str> = key.split('.').collect();
    if segments.len() > 32 {
        return false;
    }
    !segments.iter().any(|s| s.is_empty())
}

// Parsed `discord.com/channels/{guild}/{channel}/{message}` URL.
// Mirrors `extractDiscordUrlParts` (first segment must be `channels`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscordUrlParts {
    pub guild_or_channel_owner: String,
    pub channel_id: String,
    pub message_id: String,
}

pub fn extract_discord_url_parts(url: &str) -> Option<DiscordUrlParts> {
    let path = url.split("://").nth(1)?.split('?').next()?;
    let mut segments = path.split('/').filter(|s| !s.is_empty());
    let _host = segments.next()?;
    let parts: Vec<&str> = segments.collect();
    if parts.len() < 4 || parts[0] != "channels" {
        return None;
    }
    Some(DiscordUrlParts {
        guild_or_channel_owner: parts[1].to_string(),
        channel_id: parts[2].to_string(),
        message_id: parts[3].to_string(),
    })
}

// Copy guard: the source message must come from the same guild
// (`parts.userIdOrGuildId !== interaction.guildId`).
pub fn copy_same_guild(parts: &DiscordUrlParts, guild_id: &str) -> bool {
    parts.guild_or_channel_owner == guild_id
}

// Fill `embed_save_message`
// (`${interaction.user.id}`, `${await saveEmbed()}`).
pub fn fill_embed_save_message(template: &str, user_id: u64, embed_id: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${await saveEmbed()}", embed_id)
}

// Fill `embed_send_embed_work`
// (`${interaction.user.id}`, `${message.content}` channel id).
pub fn fill_embed_send_done(template: &str, user_id: u64, channel_id: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${message.content}", channel_id)
}

// Fill `embed_replace_message` (`{user}`, `{messageUrl}`).
pub fn fill_embed_replace_done(template: &str, user: &str, message_url: &str) -> String {
    template
        .replace("{user}", user)
        .replace("{messageUrl}", message_url)
}

// Fill `embed_copy_bad_guild_msg` (`${interaction.guild?.name}`).
pub fn fill_copy_bad_guild(template: &str, guild_name: &str) -> String {
    template.replace("${interaction.guild?.name}", guild_name)
}

// Storage key for a saved embed. Mirrors `` `EMBED.${arg}` ``.
pub fn saved_embed_key(id: &str) -> String {
    format!("EMBED.{id}")
}

// Extract `embedSource` from a stored `EMBED.{id}` value
// (`{embedOwner, embedSource}`), tolerating a bare source object.
pub fn stored_embed_source(stored: &serde_json::Value) -> Option<&serde_json::Value> {
    stored.get("embedSource").or(Some(stored))
}

// Copy input kinds. Mirrors the `copyEmbed(message.content)` input:
// a full Discord message URL, or a bare message id from the current
// channel (prefix path).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CopySource {
    MessageUrl(DiscordUrlParts),
    ChannelMessage(u64),
    Invalid,
}

pub fn resolve_copy_source(input: &str) -> CopySource {
    let trimmed = input.trim();
    if let Some(parts) = extract_discord_url_parts(trimmed) {
        return CopySource::MessageUrl(parts);
    }
    if !trimmed.is_empty() && trimmed.bytes().all(|b| b.is_ascii_digit()) {
        if let Ok(id) = trimmed.parse::<u64>() {
            return CopySource::ChannelMessage(id);
        }
    }
    CopySource::Invalid
}

// Apply a free-text edit to the draft. Mirrors the text legs of
// `chooseAction`: `"1"` title, `"3"` description, `"5"` author,
// `"7"` footer text (keeps an existing icon), `"11"` title URL
// (only when `isValidLink`, like TS — otherwise no-op). Returns
// false for anything else (e.g. an invalid link for `"11"`, which
// TS silently ignores).
pub fn draft_apply_text(draft: &mut serde_json::Value, action: &str, content: &str) -> bool {
    let Some(obj) = draft.as_object_mut() else {
        return false;
    };
    match action {
        "1" => {
            obj.insert(
                "title".to_string(),
                serde_json::Value::String(content.to_string()),
            );
        }
        "3" => {
            obj.insert(
                "description".to_string(),
                serde_json::Value::String(content.to_string()),
            );
        }
        "5" => {
            obj.insert("author".to_string(), serde_json::json!({ "name": content }));
        }
        "7" => {
            let icon = obj
                .get("footer")
                .and_then(|f| f.get("icon_url"))
                .and_then(|u| u.as_str())
                .map(|s| s.to_string());
            let mut footer = serde_json::json!({ "text": content });
            if let Some(url) = icon {
                footer["icon_url"] = serde_json::Value::String(url);
            }
            obj.insert("footer".to_string(), footer);
        }
        "11" => {
            if !is_valid_embed_link(content) {
                return false;
            }
            obj.insert(
                "url".to_string(),
                serde_json::Value::String(content.to_string()),
            );
        }
        _ => return false,
    }
    true
}

// Instant draft resets. Mirrors the ack legs: `"2"` clears the
// title, `"4"` resets the description to `"** **"`, `"6"` clears the
// author, `"8"` clears the footer (and its file), `"13"` clears the
// color. Returns false for anything else.
pub fn draft_clear(draft: &mut serde_json::Value, action: &str) -> bool {
    let Some(obj) = draft.as_object_mut() else {
        return false;
    };
    match action {
        "2" => {
            obj.insert("title".to_string(), serde_json::Value::Null);
        }
        "4" => {
            obj.insert(
                "description".to_string(),
                serde_json::Value::String("** **".to_string()),
            );
        }
        "6" => {
            obj.insert("author".to_string(), serde_json::Value::Null);
        }
        "8" => {
            obj.insert("footer".to_string(), serde_json::Value::Null);
        }
        "13" => {
            obj.insert("color".to_string(), serde_json::Value::Null);
        }
        _ => return false,
    }
    true
}

// Apply a color edit. Mirrors action `"12"` (`isValidColor` gate,
// `setColor`). Returns false without touching the draft when the
// color is invalid (TS posts the channel error instead).
pub fn draft_apply_color(draft: &mut serde_json::Value, content: &str) -> bool {
    if !is_valid_embed_color(content) {
        return false;
    }
    if let Some(obj) = draft.as_object_mut() {
        obj.insert(
            "color".to_string(),
            serde_json::Value::String(content.to_string()),
        );
        true
    } else {
        false
    }
}

// Classified media input for the footer / thumbnail / image legs.
// Mirrors `getMediaByMessage`: a link in the content wins, then the
// first image attachment, otherwise none (clear).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MediaInput {
    Url(String),
    Attachment(String),
    None,
}

pub fn classify_media(content: &str, image_attachments: Vec<String>) -> MediaInput {
    if is_valid_embed_link(content.trim()) {
        return MediaInput::Url(content.trim().to_string());
    }
    if let Some(url) = image_attachments.into_iter().next() {
        return MediaInput::Attachment(url);
    }
    MediaInput::None
}

// Apply a media edit for `kind` (`footer` / `image` / `thumbnail`).
// Mirrors `updateMedia` + `handleUrlMedia` / `handleFileMedia` /
// `clearMedia`. Attachment URLs are referenced directly (TS
// re-uploads the bytes; the rendered embed is identical).
pub fn draft_apply_media(draft: &mut serde_json::Value, kind: &str, media: &MediaInput) {
    let Some(obj) = draft.as_object_mut() else {
        return;
    };
    let url_of = |media: &MediaInput| match media {
        MediaInput::Url(u) | MediaInput::Attachment(u) => Some(u.clone()),
        MediaInput::None => None,
    };
    match kind {
        "footer" => {
            let text = obj
                .get("footer")
                .and_then(|f| f.get("text"))
                .and_then(|v| v.as_str())
                .unwrap_or("Footer")
                .to_string();
            match url_of(media) {
                Some(url) => {
                    obj.insert(
                        "footer".to_string(),
                        serde_json::json!({ "text": text, "icon_url": url }),
                    );
                }
                None => {
                    obj.insert("footer".to_string(), serde_json::json!({ "text": text }));
                }
            }
        }
        "image" => {
            obj.insert(
                "image".to_string(),
                match url_of(media) {
                    Some(url) => serde_json::json!({ "url": url }),
                    None => serde_json::Value::Null,
                },
            );
        }
        "thumbnail" => {
            obj.insert(
                "thumbnail".to_string(),
                match url_of(media) {
                    Some(url) => serde_json::json!({ "url": url }),
                    None => serde_json::Value::Null,
                },
            );
        }
        _ => {}
    }
}

// First image attachment URLs of a collected message (content-type
// `image/*`), newest first. Mirrors the attachment leg of
// `getMediaByMessage` (TS reads `attachments.first()`).
fn image_attachment_urls(message: &serenity::Message) -> Vec<String> {
    message
        .attachments
        .iter()
        .filter(|a| {
            a.content_type
                .as_deref()
                .is_some_and(|c| c.starts_with("image/"))
        })
        .map(|a| a.url.clone())
        .collect()
}

// Build a sendable embed from a stored discord.js `embedSource` object
// (`title`, `description`, `color`, `fields[]`, `footer.text` (+
// `icon_url`), `author.name`, `url`, `image.url`, `thumbnail.url`).
// Falls back to the `** **` default description like
// `new EmbedBuilder().setDescription("** **")` when empty.
pub fn create_embed_from_source(
    source: &serde_json::Value,
) -> poise::serenity_prelude::CreateEmbed {
    use poise::serenity_prelude::{Colour, CreateEmbedAuthor, CreateEmbedFooter};
    let mut embed = poise::serenity_prelude::CreateEmbed::default();
    let mut empty = true;
    if let Some(title) = source.get("title").and_then(|v| v.as_str()) {
        if !title.is_empty() {
            embed = embed.title(title);
            empty = false;
        }
    }
    if let Some(desc) = source.get("description").and_then(|v| v.as_str()) {
        if !desc.is_empty() {
            embed = embed.description(desc);
            empty = false;
        }
    }
    if let Some(color) = source.get("color").and_then(|v| v.as_u64()) {
        embed = embed.color(Colour::new(color as u32));
    } else if let Some(hex) = source.get("color").and_then(|v| v.as_str()) {
        // Draft colors are stored as `#rrggbb` strings (action "12").
        if let Some(rgb) = parse_hex_color(hex) {
            embed = embed.color(Colour::from_rgb(rgb.0, rgb.1, rgb.2));
        }
    }
    if let Some(fields) = source.get("fields").and_then(|v| v.as_array()) {
        for f in fields {
            let name = f.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let value = f.get("value").and_then(|v| v.as_str()).unwrap_or("");
            let inline = f.get("inline").and_then(|v| v.as_bool()).unwrap_or(false);
            if name.is_empty() && value.is_empty() {
                continue;
            }
            embed = embed.field(name, value, inline);
            empty = false;
        }
    }
    if let Some(footer) = source.get("footer") {
        if let Some(text) = footer.get("text").and_then(|v| v.as_str()) {
            if !text.is_empty() {
                let mut built = CreateEmbedFooter::new(text);
                if let Some(icon) = footer.get("icon_url").and_then(|v| v.as_str()) {
                    if !icon.is_empty() {
                        built = built.icon_url(icon);
                    }
                }
                embed = embed.footer(built);
            }
        }
    }
    if let Some(name) = source
        .get("author")
        .and_then(|v| v.get("name"))
        .and_then(|v| v.as_str())
    {
        if !name.is_empty() {
            embed = embed.author(CreateEmbedAuthor::new(name));
        }
    }
    if let Some(url) = source.get("url").and_then(|v| v.as_str()) {
        if is_valid_embed_link(url) {
            embed = embed.url(url);
        }
    }
    if let Some(url) = source
        .get("image")
        .and_then(|v| v.get("url"))
        .and_then(|v| v.as_str())
    {
        if !url.is_empty() {
            embed = embed.image(url);
        }
    }
    if let Some(url) = source
        .get("thumbnail")
        .and_then(|v| v.get("url"))
        .and_then(|v| v.as_str())
    {
        if !url.is_empty() {
            embed = embed.thumbnail(url);
        }
    }
    if empty {
        embed = embed.description("** **");
    }
    embed
}

// Parse a `#rgb` / `#rrggbb` color into components. Mirrors the
// `isValidColor` shape accepted by action `"12"`.
pub fn parse_hex_color(hex: &str) -> Option<(u8, u8, u8)> {
    if !is_valid_embed_color(hex) {
        return None;
    }
    let digits = &hex[1..];
    let expanded = if digits.len() == 3 {
        digits.chars().flat_map(|c| [c, c]).collect::<String>()
    } else {
        digits.to_string()
    };
    let num = u32::from_str_radix(&expanded, 16).ok()?;
    Some((
        ((num >> 16) & 0xff) as u8,
        ((num >> 8) & 0xff) as u8,
        (num & 0xff) as u8,
    ))
}

// Draft-ready source value for a received message embed. Mirrors
// `EmbedBuilder.from(targetMessage.embeds[0])` in `copyEmbed`.
pub fn message_embed_to_value(found: &poise::serenity_prelude::Embed) -> serde_json::Value {
    let mut value = serde_json::json!({});
    if let Some(t) = &found.title {
        value["title"] = serde_json::Value::String(t.clone());
    }
    if let Some(d) = &found.description {
        value["description"] = serde_json::Value::String(d.clone());
    }
    if let Some(c) = found.colour {
        value["color"] = serde_json::json!(c.0);
    }
    if !found.fields.is_empty() {
        value["fields"] = serde_json::json!(found
            .fields
            .iter()
            .map(|f| serde_json::json!({
                "name": f.name,
                "value": f.value,
                "inline": f.inline,
            }))
            .collect::<Vec<_>>());
    }
    if let Some(footer) = &found.footer {
        value["footer"] = serde_json::json!({ "text": footer.text });
        if let Some(icon) = &footer.icon_url {
            value["footer"]["icon_url"] = serde_json::Value::String(icon.clone());
        }
    }
    if let Some(author) = &found.author {
        value["author"] = serde_json::json!({ "name": author.name });
    }
    if let Some(url) = &found.url {
        value["url"] = serde_json::Value::String(url.clone());
    }
    if let Some(image) = &found.image {
        value["image"] = serde_json::json!({ "url": image.url });
    }
    if let Some(thumb) = &found.thumbnail {
        value["thumbnail"] = serde_json::json!({ "url": thumb.url });
    }
    value
}

// Rebuild a sendable embed from a received message embed.
// Mirrors `EmbedBuilder.from(targetMessage.embeds[0])` in `copyEmbed`.
pub fn create_embed_from_message_embed(
    found: &poise::serenity_prelude::Embed,
) -> poise::serenity_prelude::CreateEmbed {
    create_embed_from_source(&message_embed_to_value(found))
}

// New saved-embed id. Mirrors `generatePassword({ length: 16 })`.
pub fn generate_embed_id() -> String {
    use rand::Rng;
    const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::thread_rng();
    (0..16)
        .map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn link_check() {
        assert!(is_valid_embed_link("https://x.y/z"));
        assert!(is_valid_embed_link("http://x.y"));
        assert!(!is_valid_embed_link("attachment://image.png"));
        assert!(!is_valid_embed_link("just text"));
    }

    #[test]
    fn color_check() {
        assert!(is_valid_embed_color("#fff"));
        assert!(is_valid_embed_color("#475387"));
        assert!(is_valid_embed_color("#ABC"));
        assert!(!is_valid_embed_color("475387"));
        assert!(!is_valid_embed_color("#ffff"));
        assert!(!is_valid_embed_color("#gggggg"));
    }

    #[test]
    fn embed_id_check() {
        assert!(!is_valid_embed_id(None));
        assert!(!is_valid_embed_id(Some("")));
        assert!(is_valid_embed_id(Some("abc123")));
        assert!(is_valid_embed_id(Some("a.b")));
        assert!(!is_valid_embed_id(Some(&"x".repeat(250))));
        assert!(!is_valid_embed_id(Some(&vec!["x"; 32].join("."))));
    }

    #[test]
    fn url_parts_parse() {
        let parts = extract_discord_url_parts("https://discord.com/channels/111/222/333").unwrap();
        assert_eq!(
            parts,
            DiscordUrlParts {
                guild_or_channel_owner: "111".to_string(),
                channel_id: "222".to_string(),
                message_id: "333".to_string(),
            }
        );
        assert!(extract_discord_url_parts("https://discord.com/oops/1/2/3").is_none());
        assert!(extract_discord_url_parts("not a url").is_none());
        assert!(copy_same_guild(&parts, "111"));
        assert!(!copy_same_guild(&parts, "999"));
    }

    #[test]
    fn reply_fills() {
        assert_eq!(
            fill_embed_save_message(
                "<@${interaction.user.id}> id `${await saveEmbed()}`",
                9,
                "pw"
            ),
            "<@9> id `pw`"
        );
        assert_eq!(
            fill_embed_send_done(
                "<@${interaction.user.id}> sent to <#${message.content}>",
                9,
                "5"
            ),
            "<@9> sent to <#5>"
        );
        assert_eq!(
            fill_embed_replace_done("{user} replaced {messageUrl}", "<@9>", "https://u"),
            "<@9> replaced https://u"
        );
        assert_eq!(
            fill_copy_bad_guild("not the same as ${interaction.guild?.name}", "G"),
            "not the same as G"
        );
    }

    #[test]
    fn actions_cover_menu() {
        assert!(EMBED_ACTIONS.contains(&"0"));
        assert!(EMBED_ACTIONS.contains(&"7bis"));
        assert!(EMBED_ACTIONS.contains(&"13"));
        assert_eq!(EMBED_ACTIONS.len(), 15);
        // The option table covers the same 15 values in TS order.
        let values: Vec<&str> = EMBED_BUILDER_OPTIONS.iter().map(|(v, _, _)| *v).collect();
        assert_eq!(
            values,
            vec!["0", "1", "2", "3", "4", "5", "6", "7bis", "7", "8", "9", "10", "11", "12", "13"]
        );
    }

    #[test]
    fn copy_source_resolution() {
        assert_eq!(
            resolve_copy_source("https://discord.com/channels/111/222/333"),
            CopySource::MessageUrl(DiscordUrlParts {
                guild_or_channel_owner: "111".to_string(),
                channel_id: "222".to_string(),
                message_id: "333".to_string(),
            })
        );
        assert_eq!(
            resolve_copy_source("  123456789 "),
            CopySource::ChannelMessage(123456789)
        );
        assert_eq!(resolve_copy_source("not a url"), CopySource::Invalid);
        assert_eq!(resolve_copy_source(""), CopySource::Invalid);
        assert_eq!(saved_embed_key("pw16charsxxxxxx"), "EMBED.pw16charsxxxxxx");
    }

    #[test]
    fn stored_source_extraction() {
        let wrapped = serde_json::json!({
            "embedOwner": "9",
            "embedSource": { "title": "T" },
        });
        assert_eq!(
            stored_embed_source(&wrapped),
            Some(&serde_json::json!({ "title": "T" }))
        );
        let bare = serde_json::json!({ "description": "D" });
        assert_eq!(stored_embed_source(&bare), Some(&bare));
    }

    #[test]
    fn generated_id_shape() {
        let id = generate_embed_id();
        assert_eq!(id.len(), 16);
        assert!(id.bytes().all(|b| b.is_ascii_alphanumeric()));
        assert_ne!(generate_embed_id(), generate_embed_id());
    }

    #[test]
    fn source_build_round_trip() {
        let source = serde_json::json!({
            "title": "T",
            "description": "D",
            "color": 0x475387,
            "fields": [{ "name": "n", "value": "v", "inline": true }],
            "footer": { "text": "F" },
            "author": { "name": "A" },
            "url": "https://x.y/z",
            "image": { "url": "https://x.y/i.png" },
            "thumbnail": { "url": "https://x.y/t.png" },
        });
        // Must not panic and must produce a value; fields are
        // internal to CreateEmbed, so round-trip through Debug.
        let built = format!("{:?}", create_embed_from_source(&source));
        assert!(built.contains('T'));
        let empty = format!("{:?}", create_embed_from_source(&serde_json::json!({})));
        assert!(empty.contains("** **"));
    }

    #[test]
    fn builder_custom_ids_are_ts_byte_exact() {
        assert_eq!(EMBED_SELECT_ID, "embed-select-menu");
        assert_eq!(EMBED_CHANNEL_ID, "embed-save-channel");
        assert_eq!(EMBED_BTN_SAVE, "save");
        assert_eq!(EMBED_BTN_SEND, "send");
        assert_eq!(EMBED_BTN_REPLACE, "replace");
        assert_eq!(EMBED_BTN_CANCEL, "cancel");
        assert_eq!(BUILDER_TIMEOUT_MS, 1_420_000);
    }

    #[test]
    fn draft_text_edits_mirror_choose_action() {
        let mut draft = serde_json::json!({ "description": "** **" });
        assert!(draft_apply_text(&mut draft, "1", "T"));
        assert!(draft_apply_text(&mut draft, "3", "D"));
        assert!(draft_apply_text(&mut draft, "5", "A"));
        assert!(draft_apply_text(&mut draft, "7", "F"));
        assert_eq!(draft["title"], serde_json::json!("T"));
        assert_eq!(draft["author"]["name"], serde_json::json!("A"));
        assert_eq!(draft["footer"]["text"], serde_json::json!("F"));
        // "11" needs a valid link; anything else is a silent no-op.
        assert!(!draft_apply_text(&mut draft, "11", "not a link"));
        assert!(draft.get("url").is_none());
        assert!(draft_apply_text(&mut draft, "11", "https://x.y/z"));
        assert_eq!(draft["url"], serde_json::json!("https://x.y/z"));
        assert!(!draft_apply_text(&mut draft, "9", "https://x.y/i.png"));
    }

    #[test]
    fn draft_clears_mirror_ack_legs() {
        let mut draft = serde_json::json!({
            "title": "T",
            "description": "D",
            "author": { "name": "A" },
            "footer": { "text": "F" },
            "color": 1,
        });
        for action in ["2", "4", "6", "8", "13"] {
            assert!(draft_clear(&mut draft, action), "{action}");
        }
        assert_eq!(draft["title"], serde_json::Value::Null);
        assert_eq!(draft["description"], serde_json::json!("** **"));
        assert!(!draft_clear(&mut draft, "1"));
    }

    #[test]
    fn draft_color_gate() {
        let mut draft = serde_json::json!({});
        assert!(!draft_apply_color(&mut draft, "475387"));
        assert!(draft.get("color").is_none());
        assert!(draft_apply_color(&mut draft, "#475387"));
        assert_eq!(draft["color"], serde_json::json!("#475387"));
        assert_eq!(parse_hex_color("#475387"), Some((0x47, 0x53, 0x87)));
        assert_eq!(parse_hex_color("#fff"), Some((0xff, 0xff, 0xff)));
        assert_eq!(parse_hex_color("475387"), None);
    }

    #[test]
    fn media_classification_mirrors_get_media_by_message() {
        // Content link wins over attachments.
        assert_eq!(
            classify_media("https://x.y/i.png", vec!["https://cdn/a.png".to_string()]),
            MediaInput::Url("https://x.y/i.png".to_string())
        );
        // First image attachment otherwise.
        assert_eq!(
            classify_media("none", vec!["https://cdn/a.png".to_string()]),
            MediaInput::Attachment("https://cdn/a.png".to_string())
        );
        // Nothing usable clears the slot.
        assert_eq!(classify_media("none", vec![]), MediaInput::None);
    }

    #[test]
    fn draft_media_legs() {
        let mut draft = serde_json::json!({ "footer": { "text": "F" } });
        draft_apply_media(
            &mut draft,
            "footer",
            &MediaInput::Url("https://x.y/f.png".to_string()),
        );
        assert_eq!(
            draft["footer"]["icon_url"],
            serde_json::json!("https://x.y/f.png")
        );
        assert_eq!(draft["footer"]["text"], serde_json::json!("F"));
        // Clearing keeps the text, like `clearMedia("footer")`.
        draft_apply_media(&mut draft, "footer", &MediaInput::None);
        assert!(draft["footer"].get("icon_url").is_none());
        assert_eq!(draft["footer"]["text"], serde_json::json!("F"));
        draft_apply_media(
            &mut draft,
            "image",
            &MediaInput::Attachment("https://cdn/a.png".to_string()),
        );
        assert_eq!(
            draft["image"]["url"],
            serde_json::json!("https://cdn/a.png")
        );
        draft_apply_media(&mut draft, "image", &MediaInput::None);
        assert_eq!(draft["image"], serde_json::Value::Null);
        // Unknown kinds are ignored.
        draft_apply_media(&mut draft, "bogus", &MediaInput::None);
    }
}
