use super::*;

/// Guided panel (TS `schedule.ts` parity, layered over the subcommands).
/// Menu collector `time: 420_000`, delete / delete-all / when prompts
/// `time: 120_000`; the menu is disabled when the collector ends.
pub const GUIDED_MENU_ID: &str = "schedule_starter";
pub const GUIDED_MENU_TIMEOUT_SECS: u64 = 420;
pub const GUIDED_PROMPT_TIMEOUT_SECS: u64 = 120;
pub const GUIDED_CREATE_MODAL_ID: &str = "schedule_create_modal";
pub const GUIDED_DELETE_MODAL_ID: &str = "schedule_delete_modal";
pub const GUIDED_DELETE_ALL_YES_ID: &str = "schedule_delete_all_yes";
pub const GUIDED_DELETE_ALL_NO_ID: &str = "schedule_delete_all_no";
pub const GUIDED_FIELD_NAME: &str = "name";
pub const GUIDED_FIELD_DESC: &str = "desc";
pub const GUIDED_FIELD_WHEN: &str = "when";
pub const GUIDED_FIELD_CODE: &str = "code";

/// Discord caps modal input labels at 45 chars; longer lang strings
/// (e.g. `schedule_delete_question`) are truncated, never dropped.
pub const MODAL_LABEL_CHARS: usize = 45;

pub fn modal_label(s: &str) -> String {
    s.chars().take(MODAL_LABEL_CHARS).collect()
}

/// Menu choices in TS declaration order (values "0".."3").
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GuidedChoice {
    Create,
    Delete,
    DeleteAll,
    List,
}

pub fn guided_choice_of(value: &str) -> Option<GuidedChoice> {
    match value {
        "0" => Some(GuidedChoice::Create),
        "1" => Some(GuidedChoice::Delete),
        "2" => Some(GuidedChoice::DeleteAll),
        "3" => Some(GuidedChoice::List),
        _ => None,
    }
}

/// (value, emoji) pairs mirroring the TS select options
/// (create, delete, delete-all, list).
pub fn guided_menu_values() -> [(&'static str, &'static str); 4] {
    [("0", "📝"), ("1", "🗑️"), ("2", "⚠️"), ("3", "📜")]
}

pub fn guided_menu(
    placeholder: &str,
    labels: [&str; 4],
) -> poise::serenity_prelude::CreateSelectMenu {
    use poise::serenity_prelude as serenity;
    let options = guided_menu_values()
        .iter()
        .zip(labels)
        .map(|((value, emoji), label)| {
            serenity::CreateSelectMenuOption::new(label.to_string(), value.to_string())
                .emoji(serenity::ReactionType::Unicode(emoji.to_string()))
        })
        .collect();
    serenity::CreateSelectMenu::new(
        GUIDED_MENU_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder.to_string())
}

/// Create modal options. Bounds mirror the TS modal (name 5..30,
/// desc 10..400); `when` folds the duration question TS asks through
/// a follow-up message collector into the modal so the whole flow
/// stays inside component interactions.
pub fn create_modal_opts(
    title: &str,
    name_label: &str,
    desc_label: &str,
    when_label: &str,
) -> crate::modal_helper::ModalOptions {
    use crate::modal_helper::{ModalField, ModalOptions, TextField, TextStyle};
    let mut opts = ModalOptions::new(title, GUIDED_CREATE_MODAL_ID);
    opts.defer_update = false;
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_NAME.to_string(),
        label: modal_label(name_label),
        placeholder: None,
        style: TextStyle::Short,
        required: true,
        max_length: Some(30),
        min_length: Some(5),
        value: None,
    }));
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_DESC.to_string(),
        label: modal_label(desc_label),
        placeholder: None,
        style: TextStyle::Paragraph,
        required: true,
        max_length: Some(400),
        min_length: Some(10),
        value: None,
    }));
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_WHEN.to_string(),
        label: modal_label(when_label),
        placeholder: Some("10s, 5m, 2h, 7d".to_string()),
        style: TextStyle::Short,
        required: true,
        max_length: Some(32),
        min_length: Some(1),
        value: None,
    }));
    opts
}

/// Delete modal options: single schedule-code input, mirroring the TS
/// `schedule_delete_question` message-collector prompt.
pub fn delete_modal_opts(title: &str, code_label: &str) -> crate::modal_helper::ModalOptions {
    use crate::modal_helper::{ModalField, ModalOptions, TextField, TextStyle};
    let mut opts = ModalOptions::new(title, GUIDED_DELETE_MODAL_ID);
    opts.defer_update = false;
    opts.fields.push(ModalField::Text(TextField {
        custom_id: GUIDED_FIELD_CODE.to_string(),
        label: modal_label(code_label),
        placeholder: None,
        style: TextStyle::Short,
        required: true,
        max_length: Some(32),
        min_length: Some(1),
        value: None,
    }));
    opts
}

/// Delete-all confirm buttons. Mirrors the TS `(Y/n)` message
/// collector (`y`/`yes` deletes, anything else cancels).
pub fn delete_all_confirm_row(
    yes_label: &str,
    no_label: &str,
) -> poise::serenity_prelude::CreateActionRow {
    use poise::serenity_prelude as serenity;
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(GUIDED_DELETE_ALL_YES_ID)
            .style(serenity::ButtonStyle::Danger)
            .label(yes_label.to_string()),
        serenity::CreateButton::new(GUIDED_DELETE_ALL_NO_ID)
            .style(serenity::ButtonStyle::Success)
            .label(no_label.to_string()),
    ])
}

/// Subcommand for schedule category!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "schedule",
    category = "schedule",
    subcommands(
        "schedule_create",
        "schedule_delete",
        "schedule_delete_all",
        "schedule_list"
    ),
    subcommand_required
)]
pub async fn schedule(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let pool = ctx.data().pool.clone();
    let lang_code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&lang_code, k).unwrap_or_else(|| fb.to_string());
    let author = ctx.author().id;
    let author_mention = ctx.author().to_string();
    let labels = [
        t("schedule_menu_choice_0", "Create Schedule"),
        t("schedule_menu_choice_1", "Delete Schedule"),
        t("schedule_menu_choice_2", "Delete All Schedules"),
        t("schedule_menu_choice_3", "List All Schedules"),
    ];
    let menu = guided_menu(
        &t("schedule_menu_placeholder", "What do you want to do?"),
        [
            labels[0].as_str(),
            labels[1].as_str(),
            labels[2].as_str(),
            labels[3].as_str(),
        ],
    );
    let menu_row = || serenity::CreateActionRow::SelectMenu(menu.clone());
    let not_for_you = t(
        "embed_interaction_not_for_you",
        "This interaction is not for you",
    );
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .content(author_mention.clone())
                .components(vec![menu_row()]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    // Menu collector, author-gated like the TS filter
    // (`time: 420_000`).
    let deadline =
        std::time::Instant::now() + std::time::Duration::from_secs(GUIDED_MENU_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
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
        if press.data.custom_id != GUIDED_MENU_ID {
            continue;
        }
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
        let value = match &press.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => continue,
        };
        match guided_choice_of(&value) {
            Some(GuidedChoice::Create) => {
                guided_create(&ctx, &press, &lang_code, &author_mention).await?;
            }
            Some(GuidedChoice::Delete) => {
                guided_delete(&ctx, &press, &lang_code).await?;
            }
            Some(GuidedChoice::DeleteAll) => {
                guided_delete_all(
                    &ctx,
                    &press,
                    &mut msg,
                    &lang_code,
                    &menu,
                    &menu_row(),
                    &author_mention,
                    &not_for_you,
                )
                .await?;
            }
            Some(GuidedChoice::List) => {
                guided_list(&ctx, &press, &lang_code, &menu, &menu_row()).await?;
            }
            None => continue,
        }
    }
    // Timeout-disable like the TS collector `end` handler.
    let dead = menu.clone().disabled(true);
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .components(vec![serenity::CreateActionRow::SelectMenu(dead)]),
        )
        .await;
    Ok(())
}

/// Guided create: modal (name/desc/when) then the same validation +
/// confirm rendering as `schedule_create`. The result goes to an
/// ephemeral follow-up so the panel stays usable until it times out.
async fn guided_create(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    lang_code: &str,
    author_mention: &str,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let opts = create_modal_opts(
        &t("schedule_modal_title", "Schedule Manager"),
        &t("schedule_modal_fields_1_label", "The Schedule name?"),
        &t("schedule_modal_fields_2_label", "The Schedule description?"),
        "When? (e.g. 10s, 5m, 2h, 7d)",
    );
    let modal = crate::modal_helper::build_modal(&opts)
        .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
    press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await?;
    let Some(submit) =
        crate::commands::await_modal_submit(ctx.serenity_context(), press, GUIDED_CREATE_MODAL_ID)
            .await
    else {
        return Ok(());
    };
    let name = crate::modal_helper::text_value(&submit, GUIDED_FIELD_NAME);
    let desc = crate::modal_helper::text_value(&submit, GUIDED_FIELD_DESC);
    let when = crate::modal_helper::text_value(&submit, GUIDED_FIELD_WHEN);
    let _ = submit
        .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let mut followup = serenity::CreateInteractionResponseFollowup::new().ephemeral(true);
    // Validation mirrors `schedule_create` (Discord already enforces
    // the modal min/max lengths; these cover prefix-style bypasses).
    if !validate_title(&name) {
        followup = followup.content(t(
            "msg_title_must_be_5_30_characters",
            "Title must be 5-30 characters.",
        ));
        let _ = submit.create_followup(ctx.http(), followup).await;
        return Ok(());
    }
    if !validate_description(&desc) {
        followup = followup.content(t(
            "msg_description_must_be_10_400_characters",
            "Description must be 10-400 characters.",
        ));
        let _ = submit.create_followup(ctx.http(), followup).await;
        return Ok(());
    }
    let Some(delta_ms) = parse_duration_ms(&when) else {
        followup = followup.content(
            t(
                "schedule_create_not_number_time",
                "${interaction.user}, your response (the time you want to be notified about this schedule) is not a number!",
            )
            .replace("${interaction.user}", author_mention),
        );
        let _ = submit.create_followup(ctx.http(), followup).await;
        return Ok(());
    };
    let code = gen_code();
    let entry = ScheduleEntry {
        code: code.clone(),
        title: name,
        description: desc,
        expires_at_ms: expiry_at_ms(now_ms(), delta_ms),
    };
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    save_entry_routed(&ctx.data().pool, &gid, &entry, user_id).await?;
    let preview = render_create_preview_description(&entry.title, &entry.description);
    let confirm_title = render_create_confirm_title(
        &t(
            "schedule_create_embed_title_confirm",
            "#${scheduleCode} Schedule Created!",
        ),
        &code,
    );
    let field_name = t("schedule_create_embed_fields_name_confirm", "Notified Date");
    let content = render_create_confirm_msg(
        &t(
            "schedule_create_confirm_msg",
            "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`",
        ),
        author_mention,
        &code,
    );
    let embed = serenity::CreateEmbed::default()
        .title(confirm_title)
        .description(preview)
        .field(field_name, format_expiry_local(entry.expires_at_ms), true)
        .color(0x00549F)
        .timestamp(serenity::Timestamp::now());
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    followup = followup.content(content).embed(embed);
    if let Some(bytes) = footer_bytes {
        followup = followup.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = submit.create_followup(ctx.http(), followup).await;
    Ok(())
}

/// Guided delete: code modal mirroring the TS
/// `schedule_delete_question` prompt, then the same delete/
/// not-found replies as `schedule_delete`.
async fn guided_delete(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    lang_code: &str,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let opts = delete_modal_opts(
        &t("schedule_modal_title", "Schedule Manager"),
        &t(
            "schedule_delete_question",
            "What is the ID of the Schedule you want to delete?",
        ),
    );
    let modal = crate::modal_helper::build_modal(&opts)
        .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
    press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await?;
    let Some(submit) =
        crate::commands::await_modal_submit(ctx.serenity_context(), press, GUIDED_DELETE_MODAL_ID)
            .await
    else {
        return Ok(());
    };
    let code = crate::modal_helper::text_value(&submit, GUIDED_FIELD_CODE);
    let _ = submit
        .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    let followup = serenity::CreateInteractionResponseFollowup::new().ephemeral(true);
    if delete_entry_routed(&ctx.data().pool, &gid, user_id, code.trim()).await? {
        let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
        let author_name = press
            .user
            .global_name
            .clone()
            .unwrap_or_else(|| press.user.name.clone());
        let title = t(
            "schedule_delete_title_embed",
            "Deleting a Schedule (${arg0})",
        )
        .replace("${arg0}", code.trim());
        let embed = serenity::CreateEmbed::default()
            .author(serenity::CreateEmbedAuthor::new(author_name))
            .title(title)
            .color(0xFF0A0A)
            .timestamp(serenity::Timestamp::now());
        let embed =
            crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
        let mut followup = followup
            .content(t("schedule_delete_confirm", "Schedule deleted!"))
            .embed(embed);
        if let Some(bytes) = footer_bytes {
            followup =
                followup.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        let _ = submit.create_followup(ctx.http(), followup).await;
    } else {
        let followup = followup.content(
            t(
                "schedule_delete_not_found",
                "There are no SCHEDULES (${arg0}) for this member!",
            )
            .replace("${arg0}", code.trim()),
        );
        let _ = submit.create_followup(ctx.http(), followup).await;
    }
    Ok(())
}

/// Guided delete-all: Yes/No buttons mirroring the TS `(Y/n)`
/// collector (`time: 120_000`), then the confirm/cancel replies.
/// The panel menu is restored afterwards so the collector stays alive.
#[allow(clippy::too_many_arguments)]
async fn guided_delete_all(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    menu_msg: &mut poise::serenity_prelude::Message,
    lang_code: &str,
    menu: &poise::serenity_prelude::CreateSelectMenu,
    menu_row: &poise::serenity_prelude::CreateActionRow,
    author_mention: &str,
    not_for_you: &str,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let author = ctx.author().id;
    let _ = menu;
    press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .content(t(
                        "schedule_deleteall_question",
                        "Are you sure to delete all of your schedules? (Y/n)",
                    ))
                    .embeds(vec![])
                    .components(vec![delete_all_confirm_row("Yes", "No")]),
            ),
        )
        .await?;
    // Confirm-button wait, author-gated like the TS message filter
    // (`time: 120_000`).
    let deadline =
        std::time::Instant::now() + std::time::Duration::from_secs(GUIDED_PROMPT_TIMEOUT_SECS);
    let mut confirmed: Option<bool> = None;
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(pick) = menu_msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if pick.data.custom_id != GUIDED_DELETE_ALL_YES_ID
            && pick.data.custom_id != GUIDED_DELETE_ALL_NO_ID
        {
            continue;
        }
        if pick.user.id != author {
            let _ = pick
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.to_string())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        confirmed = Some(pick.data.custom_id == GUIDED_DELETE_ALL_YES_ID);
        let _ = pick
            .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
            .await;
        break;
    }
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    match confirmed {
        Some(true) => {
            let _ = delete_all_entries_routed(&ctx.data().pool, &gid, user_id).await?;
            let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
            let embed = serenity::CreateEmbed::default()
                .title(t(
                    "schedule_deleteall_title_embed",
                    "Deleting all Schedules",
                ))
                .description(t(
                    "schedule_deleteall_desc_embed",
                    "All of your schedules have been deleted!",
                ))
                .color(0xFF0A0A);
            let embed = crate::commands::utils::embed_with_footer(
                embed,
                &footer_name,
                footer_bytes.is_some(),
            );
            let mut edit = serenity::EditMessage::new()
                .content(t(
                    "schedule_deleteall_confirm",
                    "All of your schedules have been deleted!",
                ))
                .embeds(vec![embed])
                .components(vec![menu_row.clone()]);
            if let Some(bytes) = footer_bytes {
                edit = edit.attachments(
                    serenity::EditAttachments::new()
                        .add(serenity::CreateAttachment::bytes(bytes, "footer_icon.png")),
                );
            }
            let _ = menu_msg.edit(ctx.http(), edit).await;
        }
        Some(false) => {
            let _ = menu_msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new()
                        .content(t(
                            "schedule_deleteall_cancel",
                            "The `DELETE_ALL` action has been cancelled!",
                        ))
                        .embeds(vec![])
                        .components(vec![menu_row.clone()]),
                )
                .await;
        }
        // Timeout: quietly restore the panel like the TS collector end.
        None => {
            let _ = menu_msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new()
                        .content(author_mention.to_string())
                        .embeds(vec![])
                        .components(vec![menu_row.clone()]),
                )
                .await;
        }
    }
    Ok(())
}

/// Guided list: renders the same embed as `schedule_list` into the
/// panel (TS `__3` edits the original interaction), keeping the menu
/// attached so the collector stays alive.
async fn guided_list(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    lang_code: &str,
    menu: &poise::serenity_prelude::CreateSelectMenu,
    menu_row: &poise::serenity_prelude::CreateActionRow,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let t = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    let _ = menu;
    let gid = scope_guild(ctx);
    let user_id = ctx.author().id.get();
    let entries = list_entries_routed(&ctx.data().pool, &gid, user_id).await;
    let mut update =
        serenity::CreateInteractionResponseMessage::new().components(vec![menu_row.clone()]);
    if entries.is_empty() {
        update = update.content(t(
            "schedule_list_not_schedule",
            "There are no SCHEDULES for this member!",
        ));
    } else {
        let list_title = t("schedule_list_title_embed", "Listing all Schedules");
        let field_template = t(
            "schedule_list_fields_embed",
            "**Ends at**: ${date}```${title}``````${description}```\n",
        );
        let mut embed = serenity::CreateEmbed::default()
            .title(list_title)
            .color(0x60BEE0);
        for e in entries.iter().take(SCHEDULE_LIST_CAP) {
            embed = embed.field(
                format!("#{}", e.code),
                render_schedule_field(
                    &field_template,
                    &e.title,
                    &e.description,
                    &format_expiry_local(e.expires_at_ms),
                ),
                false,
            );
        }
        let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(ctx, &gid).await;
        let embed =
            crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
        update = update.content(t(
            "schedule_list_content_message",
            "Here's your schedule list!",
        ));
        update = update.embed(embed);
        if let Some(bytes) = footer_bytes {
            update = update.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
    }
    let _ = press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::UpdateMessage(update),
        )
        .await;
    Ok(())
}

/// Webhook URL or webhook code
#[poise::command(slash_command, prefix_command, rename = "create")]
pub async fn schedule_create(
    ctx: Ctx<'_>,
    #[description = "Title (5-30 chars)"] title: String,
    #[description = "Description (10-400 chars)"] description: String,
    #[description = "When (e.g. 10s, 5m, 2h, 7d)"] when: String,
) -> Result<(), anyhow::Error> {
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !validate_title(&title) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_title_must_be_5_30_characters")
                .unwrap_or_else(|| "Title must be 5-30 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if !validate_description(&description) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_description_must_be_10_400_characters")
                .unwrap_or_else(|| "Description must be 10-400 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(delta_ms) = parse_duration_ms(&when) else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_create_not_number_time")
                .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
                .unwrap_or_else(|| "${interaction.user}, your response (the time you want to be notified about this schedule) is not a number!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let code = gen_code();
    let entry = ScheduleEntry {
        code: code.clone(),
        title: title.clone(),
        description: description.clone(),
        expires_at_ms: expiry_at_ms(now_ms(), delta_ms),
    };
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    save_entry_routed(&ctx.data().pool, &gid, &entry, user_id).await?;
    // TS parity (`executeAfterModal` / `__0`): preview description
    // (```name``` ```desc```), confirm title
    // (`schedule_create_embed_title_confirm`), one inline field named
    // `schedule_create_embed_fields_name_confirm` with the formatted
    // expiry, content from `schedule_create_confirm_msg`,
    // color #00549F + timestamp + footer.
    let preview = render_create_preview_description(&entry.title, &entry.description);
    let confirm_title = render_create_confirm_title(
        &crate::lang::get(&lang_code, "schedule_create_embed_title_confirm")
            .unwrap_or_else(|| "#${scheduleCode} Schedule Created!".to_string()),
        &code,
    );
    let field_name = crate::lang::get(&lang_code, "schedule_create_embed_fields_name_confirm")
        .unwrap_or_else(|| "Notified Date".to_string());
    let content = render_create_confirm_msg(
        &crate::lang::get(&lang_code, "schedule_create_confirm_msg").unwrap_or_else(|| {
            "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`"
                .to_string()
        }),
        &ctx.author().to_string(),
        &code,
    );
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(confirm_title)
        .description(preview)
        .field(field_name, format_expiry_local(entry.expires_at_ms), true)
        .color(0x00549F)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().content(content).embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Delete a role for a certain amount of money!
#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn schedule_delete(
    ctx: Ctx<'_>,
    #[description = "Schedule code"] code: String,
) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if delete_entry_routed(&ctx.data().pool, &gid, user_id, code.trim()).await? {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_confirm")
                .unwrap_or_else(|| "Schedule deleted!".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_not_found")
                .map(|s| s.replace("${arg0}", code.trim()))
                .unwrap_or_else(|| "There are no SCHEDULES (${arg0}) for this member!".to_string()),
        )
        .await?;
    }
    Ok(())
}

/// Delete all command.
#[poise::command(slash_command, prefix_command, rename = "delete-all")]
pub async fn schedule_delete_all(
    ctx: Ctx<'_>,
    #[description = "Type y/yes to confirm"] confirm: Option<String>,
) -> Result<(), anyhow::Error> {
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS parity: delete-all asks `schedule_deleteall_question` (Y/n) and
    // only deletes on `y`/`yes` (case-insensitive); anything else sends
    // `schedule_deleteall_cancel` instead of deleting.
    let Some(given) = confirm.as_deref() else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_deleteall_question").unwrap_or_else(|| {
                "Are you sure to delete all of your schedules? (Y/n)".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    if !is_delete_all_confirmed(given) {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_deleteall_cancel")
                .unwrap_or_else(|| "The `DELETE_ALL` action has been cancelled!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let n = delete_all_entries_routed(&ctx.data().pool, &gid, user_id).await?;
    ctx.say(
        crate::lang::get(&lang_code, "schedule_deleteall_confirm")
            .unwrap_or_else(|| format!("Deleted {n} schedule(s).")),
    )
    .await?;
    Ok(())
}

/// List all sticky channels
#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn schedule_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let entries = list_entries_routed(&ctx.data().pool, &gid, user_id).await;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if entries.is_empty() {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_list_not_schedule")
                .unwrap_or_else(|| "There are no SCHEDULES for this member!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let list_title = crate::lang::get(&lang_code, "schedule_list_title_embed")
        .unwrap_or_else(|| "Listing all Schedules".to_string());
    // TS parity: field bodies render through `schedule_list_fields_embed`
    // (`${date...}` / `${fetched[i]?.title}` / `${fetched[i]?.description}`).
    let field_template = crate::lang::get(&lang_code, "schedule_list_fields_embed")
        .unwrap_or_else(|| "**Ends at**: ${date}```${title}``````${description}```\n".to_string());
    // SCOPE + CAP DECISION (recorded): TS reads the global `schedule`
    // table keyed `${userId}.${code}` (see ready.ts `scheduleTable`), so a
    // schedule created in one guild is visible/deletable from any other.
    // The Rust port deliberately scopes rows per guild table
    // (`scope_guild`, DMs fall back to "global") so guild data stays
    // isolated like every other routed category. Sort-by-expiry is also
    // deliberate (TS iterates insertion order). The 25-field cap is a
    // Discord limit (embeds hold at most 25 fields); TS has no cap and
    // would fail to send once a user owns 26+ schedules.
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(list_title)
        .color(0x60BEE0);
    for e in entries.iter().take(SCHEDULE_LIST_CAP) {
        embed = embed.field(
            format!("#{}", e.code),
            render_schedule_field(
                &field_template,
                &e.title,
                &e.description,
                &format_expiry_local(e.expires_at_ms),
            ),
            false,
        );
    }
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let content = crate::lang::get(&lang_code, "schedule_list_content_message")
        .unwrap_or_else(|| "Here's your schedule list!".to_string());
    let mut reply = poise::CreateReply::default().content(content).embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Delete-all confirmation gate. Mirrors the TS `(Y/n)` collector which
/// deletes only when the reply lowercases to `y` or `yes`.
pub fn is_delete_all_confirmed(s: &str) -> bool {
    matches!(s.trim().to_lowercase().as_str(), "y" | "yes")
}

/// Discord embeds hold at most 25 fields; the list is truncated there.
pub const SCHEDULE_LIST_CAP: usize = 25;

/// Format an expiry timestamp like TS `format(date, "YYYY/MM/DD HH:mm:ss")`
/// (server-local time). Out-of-range values degrade to the raw millis.
pub fn format_expiry_local(expires_at_ms: i64) -> String {
    let secs = expires_at_ms.div_euclid(1000);
    let nanos = (expires_at_ms.rem_euclid(1000) as u32) * 1_000_000;
    chrono::DateTime::from_timestamp(secs, nanos)
        .map(|dt| {
            let local: chrono::DateTime<chrono::Local> = chrono::DateTime::from(dt);
            local.format("%Y/%m/%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| expires_at_ms.to_string())
}

/// Render one list field through the `schedule_list_fields_embed`
/// template. The canonical en-US template interpolates a pre-formatted
/// date (`${date.format(new Date(fetched[i]?.expired), ...)}`), so the
/// caller passes the already formatted expiry; the raw-placeholder shape
/// is accepted too for forward compatibility.
pub fn render_schedule_field(
    template: &str,
    title: &str,
    description: &str,
    expires_display: &str,
) -> String {
    const DATE_PH: &str = "${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}";
    let out = template.replace(DATE_PH, expires_display);
    // Accept a hypothetical `${date}`-style template as well.
    let out = out.replace("${date}", expires_display);
    let out = out.replace("${fetched[i]?.title}", title);
    out.replace("${fetched[i]?.description}", description)
}

/// Create-flow confirm helpers (TS `executeAfterModal` / `__0`).
/// Preview embed description: ` ```name``` ```desc``` `.
pub fn render_create_preview_description(name: &str, desc: &str) -> String {
    format!("```{name}``````{desc}```")
}

/// Confirm title from `schedule_create_embed_title_confirm`
/// (`#${scheduleCode} Schedule Created!` in en-US).
pub fn render_create_confirm_title(template: &str, code: &str) -> String {
    template.replace("${scheduleCode}", code)
}

/// Confirm message from `schedule_create_confirm_msg`
/// (`${interaction.user}` + `${scheduleCode}` in en-US).
pub fn render_create_confirm_msg(template: &str, user_mention: &str, code: &str) -> String {
    template
        .replace("${interaction.user}", user_mention)
        .replace("${scheduleCode}", code)
}

/// Expiry instant like TS `Date.now() + date0` (saturating).
pub fn expiry_at_ms(now_ms: i64, delta_ms: i64) -> i64 {
    now_ms.saturating_add(delta_ms)
}

// ---- U-D3-NAMEDTABLES: schedule table handle ----
// Guild-scoped table (sibling convention: `table(gid)`), keys
// `SCHEDULE.<uid>.<code>` unchanged. Dotted keys nest under the
// `SCHEDULE` root (`{uid: {code: json}}`), so per-user loops walk the
// root and merge legacy kv rows. The expiry sweeper in scheduler.rs
// still reads kv directly (locked file): dual-write keeps it fresh.
use crate::commands::owner::main::{
    legacy_del_prefix, legacy_scan, routed_del, routed_get, routed_set, table_backend,
    tbl_get_value, walk_path,
};
use std::collections::HashSet;

/// Nested root holding every schedule of one guild table.
pub const SCHEDULE_ROOT: &str = "SCHEDULE";

pub async fn load_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> Option<ScheduleEntry> {
    let raw = routed_get(pool, guild_id, guild_id, &schedule_key(user_id, code)).await?;
    serde_json::from_str(&raw).ok()
}

pub async fn save_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    entry: &ScheduleEntry,
    user_id: u64,
) -> anyhow::Result<()> {
    let s = serde_json::to_string(entry)?;
    routed_set(
        pool,
        guild_id,
        guild_id,
        &schedule_key(user_id, &entry.code),
        &s,
    )
    .await
}

pub async fn delete_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> anyhow::Result<bool> {
    routed_del(pool, guild_id, guild_id, &schedule_key(user_id, code)).await
}

/// Merged entry texts for one user: table root walked first, then
/// legacy-only rows. Table values win on code conflicts.
async fn user_entry_texts(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Vec<String> {
    let uid = user_id.to_string();
    let mut out: Vec<String> = vec![];
    let mut seen: HashSet<String> = HashSet::new();
    if let Some(root) = tbl_get_value(pool, guild_id, SCHEDULE_ROOT).await {
        if let Some(user) = walk_path(&root, &[uid.as_str()]) {
            if let Some(obj) = user.as_object() {
                for (code, v) in obj {
                    if let Some(s) = v.as_str() {
                        seen.insert(code.clone());
                        out.push(s.to_string());
                    }
                }
            }
        }
    }
    for (k, v) in legacy_scan(pool, guild_id, &schedule_prefix(user_id)).await {
        let code = k.strip_prefix(&schedule_prefix(user_id)).unwrap_or(&k);
        if seen.insert(code.to_string()) {
            out.push(v);
        }
    }
    out
}

pub async fn list_entries_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> Vec<ScheduleEntry> {
    let mut out: Vec<ScheduleEntry> = vec![];
    for raw in user_entry_texts(pool, guild_id, user_id).await {
        if let Ok(e) = serde_json::from_str(&raw) {
            out.push(e);
        }
    }
    out.sort_by_key(|e| e.expires_at_ms);
    out
}

pub async fn delete_all_entries_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> anyhow::Result<u64> {
    // Count logical rows first: dual-written rows exist twice.
    let mut codes: HashSet<String> = HashSet::new();
    let uid = user_id.to_string();
    let root = tbl_get_value(pool, guild_id, SCHEDULE_ROOT).await;
    let has_user = walk_path(
        root.as_ref().unwrap_or(&serde_json::Value::Null),
        &[uid.as_str()],
    )
    .and_then(|u| u.as_object())
    .map(|obj| {
        codes.extend(obj.keys().cloned());
        true
    })
    .unwrap_or(false);
    for (k, _) in legacy_scan(pool, guild_id, &schedule_prefix(user_id)).await {
        codes.insert(
            k.strip_prefix(&schedule_prefix(user_id))
                .unwrap_or(&k)
                .to_string(),
        );
    }
    let n = codes.len() as u64;
    if has_user {
        let backend = table_backend(pool);
        let _ = backend
            .table(guild_id.to_string())
            .delete(&format!("{SCHEDULE_ROOT}.{user_id}"))
            .await;
    }
    legacy_del_prefix(pool, guild_id, &schedule_prefix(user_id)).await?;
    Ok(n)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    fn sample(code: &str, expires: i64) -> ScheduleEntry {
        ScheduleEntry {
            code: code.to_string(),
            title: "title".to_string(),
            description: "a description here".to_string(),
            expires_at_ms: expires,
        }
    }

    #[tokio::test]
    async fn routed_crud_dual_writes() {
        let pool = mem_pool().await;
        assert_eq!(load_entry_routed(&pool, "g", 1, "A").await, None);
        save_entry_routed(&pool, "g", &sample("A", 200), 1)
            .await
            .unwrap();
        save_entry_routed(&pool, "g", &sample("B", 100), 1)
            .await
            .unwrap();
        assert_eq!(
            load_entry_routed(&pool, "g", 1, "A")
                .await
                .unwrap()
                .expires_at_ms,
            200
        );
        // Legacy kv reader (scheduler sweep) sees the unchanged key.
        assert!(crate::db::kv_get(&pool, "g", "SCHEDULE.1.A")
            .await
            .is_some());
        // List merges + sorts like the locked helper.
        let list = list_entries_routed(&pool, "g", 1).await;
        assert_eq!(
            list.iter().map(|e| e.code.as_str()).collect::<Vec<_>>(),
            vec!["B", "A"]
        );
        assert!(delete_entry_routed(&pool, "g", 1, "A").await.unwrap());
        assert!(!delete_entry_routed(&pool, "g", 1, "A").await.unwrap());
        assert_eq!(delete_all_entries_routed(&pool, "g", 1).await.unwrap(), 1);
        assert!(list_entries_routed(&pool, "g", 1).await.is_empty());
    }

    #[tokio::test]
    async fn routed_falls_back_to_legacy_rows() {
        let pool = mem_pool().await;
        // Legacy-only row (scheduler-written shape, kv only).
        crate::db::kv_set(
            &pool,
            "g",
            "SCHEDULE.2.Z",
            &serde_json::to_string(&sample("Z", 50)).unwrap(),
        )
        .await
        .unwrap();
        assert_eq!(
            load_entry_routed(&pool, "g", 2, "Z").await.unwrap().code,
            "Z"
        );
        assert_eq!(list_entries_routed(&pool, "g", 2).await.len(), 1);
        assert_eq!(delete_all_entries_routed(&pool, "g", 2).await.unwrap(), 1);
    }

    #[test]
    fn guided_timeouts_mirror_ts_collectors() {
        // TS menu collector `time: 420_000`, delete / delete-all /
        // when message collectors `time: 120_000`.
        assert_eq!(GUIDED_MENU_TIMEOUT_SECS, 420);
        assert_eq!(GUIDED_PROMPT_TIMEOUT_SECS, 120);
    }

    #[test]
    fn guided_choice_values_mirror_ts_menu() {
        assert_eq!(guided_choice_of("0"), Some(GuidedChoice::Create));
        assert_eq!(guided_choice_of("1"), Some(GuidedChoice::Delete));
        assert_eq!(guided_choice_of("2"), Some(GuidedChoice::DeleteAll));
        assert_eq!(guided_choice_of("3"), Some(GuidedChoice::List));
        assert_eq!(guided_choice_of("4"), None);
        assert_eq!(guided_choice_of(""), None);
        assert_eq!(guided_choice_of("starter"), None);
    }

    #[test]
    fn guided_menu_values_carry_ts_emoji() {
        let vals = guided_menu_values();
        assert_eq!(
            [vals[0].0, vals[1].0, vals[2].0, vals[3].0],
            ["0", "1", "2", "3"]
        );
        assert_eq!(
            [vals[0].1, vals[1].1, vals[2].1, vals[3].1],
            ["📝", "🗑️", "⚠️", "📜"]
        );
    }

    #[test]
    fn modal_label_truncates_to_discord_limit() {
        assert_eq!(modal_label("Short"), "Short");
        // `schedule_delete_question` (51 chars) must fit the 45-char
        // input-label cap without being dropped.
        let long = "What is the ID of the Schedule you want to delete?";
        assert_eq!(modal_label(long).chars().count(), MODAL_LABEL_CHARS);
    }

    #[test]
    fn guided_create_modal_mirrors_ts_constraints() {
        use crate::modal_helper::{ModalField, TextStyle};
        let opts = create_modal_opts("T", "Name?", "Desc?", "When?");
        assert_eq!(opts.custom_id, GUIDED_CREATE_MODAL_ID);
        assert!(!opts.defer_update);
        assert_eq!(opts.fields.len(), 3);
        let bounds: Vec<(&str, u16, u16, TextStyle)> = opts
            .fields
            .iter()
            .map(|f| match f {
                ModalField::Text(t) => (
                    t.custom_id.as_str(),
                    t.min_length.unwrap_or(0),
                    t.max_length.unwrap_or(0),
                    t.style,
                ),
                _ => panic!("guided modals are text-only"),
            })
            .collect();
        // TS modal: name 5..30 (short), desc 10..400 (paragraph).
        assert!(bounds.contains(&("name", 5, 30, TextStyle::Short)));
        assert!(bounds.contains(&("desc", 10, 400, TextStyle::Paragraph)));
        assert!(bounds.contains(&("when", 1, 32, TextStyle::Short)));
        // Serenity-expressible (no Components-V2 field kinds).
        assert!(crate::modal_helper::build_modal(&opts).is_ok());
    }

    #[test]
    fn guided_delete_modal_is_single_code_field() {
        use crate::modal_helper::ModalField;
        let opts = delete_modal_opts("T", "What is the ID?");
        assert_eq!(opts.custom_id, GUIDED_DELETE_MODAL_ID);
        assert_eq!(opts.fields.len(), 1);
        match &opts.fields[0] {
            ModalField::Text(t) => {
                assert_eq!(t.custom_id, "code");
                assert!(t.required);
            }
            _ => panic!("guided modals are text-only"),
        }
        assert!(crate::modal_helper::build_modal(&opts).is_ok());
    }

    #[test]
    fn guided_ids_are_namespaced_and_distinct() {
        assert_ne!(GUIDED_MENU_ID, GUIDED_CREATE_MODAL_ID);
        assert_ne!(GUIDED_MENU_ID, GUIDED_DELETE_MODAL_ID);
        assert_ne!(GUIDED_CREATE_MODAL_ID, GUIDED_DELETE_MODAL_ID);
        assert_ne!(GUIDED_DELETE_ALL_YES_ID, GUIDED_DELETE_ALL_NO_ID);
    }

    #[test]
    fn guided_builders_smoke() {
        // Builders must construct without panicking (Discord-shape
        // assertions live server-side; ids/values are covered above).
        let _ = guided_menu("Pick?", ["a", "b", "c", "d"]);
        let _ = delete_all_confirm_row("Yes", "No");
    }

    #[test]
    fn delete_all_gate_matches_ts_collector() {
        assert!(is_delete_all_confirmed("y"));
        assert!(is_delete_all_confirmed("Y"));
        assert!(is_delete_all_confirmed("yes"));
        assert!(is_delete_all_confirmed("YES"));
        assert!(is_delete_all_confirmed("  Yes  "));
        assert!(!is_delete_all_confirmed("n"));
        assert!(!is_delete_all_confirmed("no"));
        assert!(!is_delete_all_confirmed(""));
        assert!(!is_delete_all_confirmed("yep"));
        assert!(!is_delete_all_confirmed("cancel"));
    }

    #[test]
    fn list_field_renders_through_template() {
        let template = "**Ends at**: ${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}```${fetched[i]?.title}``````${fetched[i]?.description}```\n";
        assert_eq!(
            render_schedule_field(template, "Party", "at home", "2026/01/02 03:04:05"),
            "**Ends at**: 2026/01/02 03:04:05```Party``````at home```\n"
        );
    }

    #[test]
    fn expiry_format_shape_matches_ts_pattern() {
        // Server-local time, so only the shape is asserted (TZ-dependent).
        let s = format_expiry_local(1_700_000_000_000);
        assert_eq!(s.len(), 19);
        let b = s.as_bytes();
        assert_eq!(
            (b[4], b[7], b[10], b[13], b[16]),
            (b'/', b'/', b' ', b':', b':')
        );
        assert!(s
            .chars()
            .all(|c| c.is_ascii_digit() || matches!(c, '/' | ' ' | ':')));
    }

    #[test]
    fn list_cap_is_discord_field_limit() {
        assert_eq!(SCHEDULE_LIST_CAP, 25);
    }

    #[test]
    fn create_preview_matches_ts_modal_embed() {
        // TS: .setDescription(` ```${name}``` ```${desc}``` `)
        assert_eq!(
            render_create_preview_description("Party", "at home"),
            "```Party``````at home```"
        );
    }

    #[test]
    fn create_confirm_title_interpolates_code() {
        assert_eq!(
            render_create_confirm_title("#${scheduleCode} Schedule Created!", "ABC123"),
            "#ABC123 Schedule Created!"
        );
    }

    #[test]
    fn create_confirm_msg_interpolates_user_and_code() {
        assert_eq!(
            render_create_confirm_msg(
                "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`",
                "<@123>",
                "ABC123"
            ),
            "<@123>, your schedule has been created!\nCode: `ABC123`"
        );
    }

    #[test]
    fn create_expiry_adds_delta_like_ts() {
        // TS: expired: Date.now() + date0
        assert_eq!(expiry_at_ms(1_000, 60_000), 61_000);
        assert_eq!(expiry_at_ms(i64::MAX, 1), i64::MAX);
    }

    #[test]
    fn create_confirm_field_value_is_formatted_expiry() {
        // Field value renders through the same local-time formatter
        // as the list fields (`YYYY/MM/DD HH:mm:ss` shape).
        let s = format_expiry_local(expiry_at_ms(1_700_000_000_000, 60_000));
        assert_eq!(s.len(), 19);
    }
}
