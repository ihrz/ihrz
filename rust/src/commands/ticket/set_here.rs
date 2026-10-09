use super::panel::sanitize_option_emoji;
use super::*;
use poise::serenity_prelude as serenity;
use std::time::Duration;

// ---- Legacy set-here ids (TS !set-here.ts / ticketsManager.ts) ----

/// Panel-type picker menu. TS `choose_panel_type`.
const TYPE_PICK_ID: &str = "choose_panel_type";
/// Select-panel builder buttons. TS `add_selection` / `remove_selection`
/// / `save_selection`.
const BUILDER_ADD_ID: &str = "add_selection";
const BUILDER_REMOVE_ID: &str = "remove_selection";
const BUILDER_SAVE_ID: &str = "save_selection";
/// Case modal + save modal. TS `selection_modal` / `embed_saved_modal`.
const ADD_MODAL_ID: &str = "selection_modal";
const SAVE_MODAL_ID: &str = "embed_saved_modal";
/// Per-case category prompt. TS `ticket-sethere-category-for-type`.
const CATEGORY_PROMPT_ID: &str = "ticket-sethere-category-for-type";
/// Reason yes/no prompt. TS `ticket-sethere-reason`.
const REASON_PICK_ID: &str = "ticket-sethere-reason";

const TYPE_TIMEOUT_SECS: u64 = 240;
const BUILDER_TIMEOUT_SECS: u64 = 300;
const PROMPT_TIMEOUT_SECS: u64 = 300;

// ---- Pure builder pieces (offline-testable, mirror TS exactly) ----

/// Keep only the snowflake digits (`<#123>` / `123` -> `123`).
pub fn sanitize_category_id(raw: &str) -> String {
    raw.chars().filter(|c| c.is_ascii_digit()).collect()
}

/// Button-panel marker row (`GUILD.TICKET.<msgId>`). TS
/// CreateButtonPanel stores `categoryId: data.category`.
pub fn button_panel_value(
    author_id: u64,
    name: &str,
    channel_id: u64,
    message_id: u64,
    category_id: &str,
) -> String {
    serde_json::json!({
        "author": author_id.to_string(),
        "used": true,
        "panelName": name,
        "reason": false,
        "channel": channel_id.to_string(),
        "messageID": message_id.to_string(),
        "categoryId": category_id,
    })
    .to_string()
}

/// Next select-case numeric id: `comp.options.length + 1` before the
/// push, i.e. one past the current case count.
pub fn next_select_case_id(cases: &[LegacySelection]) -> i64 {
    cases.len() as i64 + 1
}

/// Push one builder case (`id` = post-push option count, raw emoji
/// kept like TS `emojis: emoji === "" ? undefined : emoji`).
pub fn select_case_add(cases: &mut Vec<LegacySelection>, name: String, emoji: String) {
    let id = next_select_case_id(cases);
    cases.push(LegacySelection {
        id,
        name,
        emojis: emoji,
        category_id: String::new(),
    });
}

/// Final select-menu options: label = case name, value = numeric id,
/// emoji attached only when it passes the single/custom gate.
pub fn select_case_options(cases: &[LegacySelection]) -> Vec<serenity::CreateSelectMenuOption> {
    cases
        .iter()
        .map(|c| {
            let mut opt = serenity::CreateSelectMenuOption::new(c.name.clone(), c.id.to_string());
            if !sanitize_option_emoji(&c.emojis).is_empty() {
                let rt = c
                    .emojis
                    .parse::<serenity::ReactionType>()
                    .unwrap_or(serenity::ReactionType::Unicode(c.emojis.clone()));
                opt = opt.emoji(rt);
            }
            opt
        })
        .collect()
}

/// Final select-panel embed description: `## {title}\n{desc}`.
pub fn render_select_final_desc(title: &str, desc: &str) -> String {
    format!("## {title}\n{desc}")
}

/// Select-panel marker row (`GUILD.TICKET.<msgId>`): author, used,
/// reason answer, case list, panel name, channel + message ids.
pub fn select_panel_value(
    author_id: u64,
    name: &str,
    reason: bool,
    cases: &[LegacySelection],
    channel_id: u64,
    message_id: u64,
) -> String {
    serde_json::json!({
        "author": author_id.to_string(),
        "used": true,
        "reason": reason,
        "selection": cases,
        "panelName": name,
        "channel": channel_id.to_string(),
        "messageID": message_id.to_string(),
    })
    .to_string()
}

/// Type-picker question (`${interaction.user.id}` slot).
pub fn render_type_question(template: &str, user_id: u64) -> String {
    template.replace("${interaction.user.id}", &user_id.to_string())
}

/// Per-case category prompt: emoji (or Pointer fallback) + case name.
pub fn render_category_prompt(template: &str, emoji_markup: &str, name: &str) -> String {
    template
        .replace(
            "${x.emojis ?? interaction.client.iHorizon_Emojis.Pointer}",
            emoji_markup,
        )
        .replace("${x.name}", name)
}

/// Reason prompt (`${interaction.user.toString()}` slot).
pub fn render_reason_prompt(template: &str, user_mention: &str) -> String {
    template.replace("${interaction.user.toString()}", user_mention)
}

/// Reason answer: only `yes` enables the reason modal.
pub fn parse_reason_choice(value: &str) -> bool {
    value == "yes"
}

/// Post a ticket panel here (button or select type picker).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-here",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_set_here(
    ctx: Ctx<'_>,
    #[description = "Panel name"] name: String,
    #[description = "Description"] description: Option<String>,
    #[description = "Ticket category id"] category: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Mirrors !set-here.ts: disable guard.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let category_id = sanitize_category_id(category.as_deref().unwrap_or_default());
    let type_menu = serenity::CreateSelectMenu::new(
        TYPE_PICK_ID,
        serenity::CreateSelectMenuKind::String {
            options: vec![
                serenity::CreateSelectMenuOption::new(
                    t("sethereticket_command_type_menu_choice_1_label"),
                    "button_panel".to_string(),
                ),
                serenity::CreateSelectMenuOption::new(
                    t("sethereticket_command_type_menu_choice_2_label"),
                    "select_panel".to_string(),
                ),
            ],
        },
    )
    .placeholder(t("sethereticket_command_type_menu_placeholder"));
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .content(render_type_question(
                    &t("sethereticket_command_type_menu_question"),
                    ctx.author().id.get(),
                ))
                .components(vec![serenity::CreateActionRow::SelectMenu(type_menu)]),
        )
        .await?;
    let mut picker = handle.into_message().await?;
    let sctx = ctx.serenity_context().clone();
    let Some(pick) = picker
        .await_component_interaction(sctx.shard.clone())
        .author_id(ctx.author().id)
        .timeout(Duration::from_secs(TYPE_TIMEOUT_SECS))
        .await
    else {
        return Ok(());
    };
    if pick.data.custom_id != TYPE_PICK_ID {
        return Ok(());
    }
    let choice = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => return Ok(()),
    };
    // deferUpdate: ack the picker, then clear it.
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let _ = picker
        .edit(&sctx.http, serenity::EditMessage::new().components(vec![]))
        .await;
    if choice == "select_panel" {
        run_select_builder(
            &sctx,
            pool,
            &gid,
            &code,
            &name,
            ctx.author().id,
            ctx.channel_id(),
        )
        .await?;
    } else {
        run_button_panel(
            &sctx,
            pool,
            &gid,
            &code,
            ctx.channel_id(),
            ctx.author().id.get(),
            &name,
            description.as_deref(),
            &category_id,
        )
        .await?;
        ctx.say(t("sethereticket_command_work")).await?;
    }
    Ok(())
}

/// V1 button panel (CreateButtonPanel, ticketsManager.ts:72):
/// Secondary style + envelope emoji, verbatim open-new-ticket id,
/// footer + footer file, GUILD.TICKET.<msgId> marker row, then the
/// onCreation logs embed.
#[allow(clippy::too_many_arguments)]
async fn run_button_panel(
    sctx: &serenity::Context,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    channel_id: serenity::ChannelId,
    author_id: u64,
    name: &str,
    description: Option<&str>,
    category_id: &str,
) -> anyhow::Result<()> {
    let http = sctx.http.clone();
    let (footer_name, footer_icon) = ticket_footer(&http, pool, gid).await;
    let panel_embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .title(name.to_string())
            .colour(0x3b8f41_u32)
            .description(description.map(str::to_string).unwrap_or_else(|| {
                crate::lang::get(lang_code, "sethereticket_description_embed").unwrap_or_default()
            })),
        &footer_name,
        footer_icon.is_some(),
    );
    let button = serenity::CreateButton::new(LEGACY_OPEN_BUTTON_ID)
        .label(
            crate::lang::get(lang_code, "event_ticket_button_name")
                .unwrap_or_else(|| "Open ticket".to_string()),
        )
        .emoji(serenity::ReactionType::Unicode("📩".to_string()))
        .style(serenity::ButtonStyle::Secondary);
    let mut post = serenity::CreateMessage::new()
        .embed(panel_embed)
        .button(button);
    if let Some(icon) = footer_icon {
        post = post.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let sent = channel_id.send_message(&http, post).await?;
    crate::db::kv_set(
        pool,
        gid,
        &legacy_panel_key(sent.id.get()),
        &button_panel_value(
            author_id,
            name,
            sent.channel_id.get(),
            sent.id.get(),
            category_id,
        ),
    )
    .await?;
    post_ticket_creation_log(&http, pool, gid, lang_code, channel_id).await;
    Ok(())
}

/// onCreation logs embed + footer file (CreateButtonPanel:125).
async fn post_ticket_creation_log(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    channel_id: serenity::ChannelId,
) {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let Some(logs) = ticket_logs_channel(pool, gid).await else {
        return;
    };
    let desc = t("event_ticket_logsChannel_onCreation_embed_desc")
        .replace("${data.name}", &channel_id.get().to_string())
        .replace("${interaction}", &format!("<#{channel_id}>"));
    let (log_name, log_icon) = ticket_footer(http, pool, gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(t("event_ticket_logsChannel_onCreation_embed_title"))
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &log_name,
        log_icon.is_some(),
    );
    let mut log_msg = serenity::CreateMessage::new().embed(embed);
    if let Some(icon) = log_icon {
        log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let _ = logs.send_message(http, log_msg).await;
}

/// Interactive select-panel builder (CreateSelectPanel): the author
/// adds/removes cases (name 2..150, optional emoji), saves via the
/// embed modal (title 2..24, desc 12..500), picks a category per case
/// and the reason toggle, then the final select menu is posted with
/// the `GUILD.TICKET.<msgId>` marker row.
async fn run_select_builder(
    sctx: &serenity::Context,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    panel_name: &str,
    author: serenity::UserId,
    channel_id: serenity::ChannelId,
) -> anyhow::Result<()> {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let http = sctx.http.clone();
    let (footer_name, footer_icon) = ticket_footer(&http, pool, gid).await;
    let intro = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(2829617))
            .description(t("sethereticket_panelforcreate_embed_desc")),
        &footer_name,
        footer_icon.is_some(),
    );
    let buttons = builder_buttons(&t, false);
    let mut post = serenity::CreateMessage::new()
        .embed(intro)
        .components(vec![serenity::CreateActionRow::Buttons(buttons)]);
    if let Some(icon) = footer_icon {
        post = post.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let mut msg = channel_id.send_message(&http, post).await?;
    let mut cases: Vec<LegacySelection> = vec![];

    loop {
        let Some(pick) = msg
            .await_component_interaction(sctx.shard.clone())
            .author_id(author)
            .timeout(Duration::from_secs(BUILDER_TIMEOUT_SECS))
            .await
        else {
            break;
        };
        match pick.data.custom_id.as_str() {
            BUILDER_ADD_ID => {
                if run_builder_add(sctx, &pick, &t, &mut cases).await {
                    refresh_builder(&http, &mut msg, &t, panel_name, &cases, false).await;
                }
            }
            BUILDER_REMOVE_ID => {
                let _ = pick
                    .create_response(&http, serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                if !cases.is_empty() {
                    cases.pop();
                    refresh_builder(&http, &mut msg, &t, panel_name, &cases, false).await;
                }
            }
            BUILDER_SAVE_ID => {
                if run_builder_save(
                    sctx, pool, gid, lang_code, &pick, &mut msg, panel_name, author, &mut cases,
                )
                .await?
                {
                    break;
                }
            }
            _ => continue,
        }
    }
    Ok(())
}

fn builder_buttons(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    disabled: bool,
) -> Vec<serenity::CreateButton> {
    vec![
        serenity::CreateButton::new(BUILDER_ADD_ID)
            .label(t("sethereticket_panelforcreate_button_add_label"))
            .style(serenity::ButtonStyle::Secondary)
            .disabled(disabled),
        serenity::CreateButton::new(BUILDER_REMOVE_ID)
            .label(t("sethereticket_panelforcreate_button_sub_label"))
            .style(serenity::ButtonStyle::Secondary)
            .disabled(disabled),
        serenity::CreateButton::new(BUILDER_SAVE_ID)
            .label(t("sethereticket_panelforcreate_button_save_label"))
            .style(serenity::ButtonStyle::Success)
            .disabled(disabled),
    ]
}

/// Builder message refresh: buttons alone when no case exists, else
/// buttons + the live `ticket-open-selection` menu.
async fn refresh_builder(
    http: &std::sync::Arc<serenity::Http>,
    msg: &mut serenity::Message,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel_name: &str,
    cases: &[LegacySelection],
    disabled: bool,
) {
    let mut rows = vec![serenity::CreateActionRow::Buttons(builder_buttons(
        t, disabled,
    ))];
    if !cases.is_empty() {
        let menu = select_menu(panel_name, cases);
        rows.push(serenity::CreateActionRow::SelectMenu(menu));
    }
    let _ = msg
        .edit(http, serenity::EditMessage::new().components(rows))
        .await;
}

fn select_menu(panel_name: &str, cases: &[LegacySelection]) -> serenity::CreateSelectMenu {
    serenity::CreateSelectMenu::new(
        LEGACY_SELECT_ID,
        serenity::CreateSelectMenuKind::String {
            options: select_case_options(cases),
        },
    )
    .placeholder(panel_name.to_string())
}

fn modal_value(submit: &serenity::ModalInteraction, field_id: &str) -> String {
    for row in &submit.data.components {
        if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first() {
            if input.custom_id == field_id {
                return input.value.clone().unwrap_or_default();
            }
        }
    }
    String::new()
}

async fn show_builder_modal(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    modal_id: &str,
    title: String,
    fields: Vec<serenity::CreateActionRow>,
) -> Option<serenity::ModalInteraction> {
    let modal = serenity::CreateModal::new(modal_id, title).components(fields);
    if pick
        .create_response(
            &sctx.http,
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await
        .is_err()
    {
        return None;
    }
    crate::commands::await_modal_submit(sctx, pick, modal_id).await
}

/// Add-case step: `selection_modal` (name 2..150 required, emoji
/// 1..50 optional); the submit is acked (TS deferUpdate) and the raw
/// emoji is stored even when it fails the menu gate.
async fn run_builder_add(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    cases: &mut Vec<LegacySelection>,
) -> bool {
    let fields = vec![
        serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                t("sethereticket_modal_1_fields_1_label"),
                "case_name",
            )
            .placeholder(t("sethereticket_modal_1_fields_1_placeholder"))
            .required(true)
            .min_length(2)
            .max_length(150),
        ),
        serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                t("sethereticket_modal_1_fields_2_label"),
                "case_emoji",
            )
            .placeholder(t("sethereticket_modal_1_fields_2_placeholder"))
            .required(false)
            .min_length(1)
            .max_length(50),
        ),
    ];
    let Some(submit) = show_builder_modal(
        sctx,
        pick,
        ADD_MODAL_ID,
        t("sethereticket_modal_1_title"),
        fields,
    )
    .await
    else {
        return false;
    };
    let _ = submit
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let name = modal_value(&submit, "case_name");
    if name.trim().is_empty() {
        return false;
    }
    select_case_add(cases, name, modal_value(&submit, "case_emoji"));
    true
}

/// Save step: `embed_saved_modal` (title 2..24, desc 12..500 with the
/// description-embed fallback), buttons disabled, per-case category
/// pick, reason yes/no, final menu post + marker row + creation log.
/// Returns true when the builder must stop.
#[allow(clippy::too_many_arguments)]
async fn run_builder_save(
    sctx: &serenity::Context,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    pick: &serenity::ComponentInteraction,
    msg: &mut serenity::Message,
    panel_name: &str,
    author: serenity::UserId,
    cases: &mut [LegacySelection],
) -> anyhow::Result<bool> {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    // TS swaps placeholder/label on the desc field; mirrored as-is.
    let fields = vec![
        serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                t("sethereticket_modal_2_fields_1_title"),
                "embed_title",
            )
            .placeholder(t("sethereticket_modal_2_fields_1_placeholder"))
            .required(true)
            .min_length(2)
            .max_length(24),
        ),
        serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                t("sethereticket_modal_2_fields_2_placeholder"),
                "embed_desc",
            )
            .placeholder(t("sethereticket_modal_2_fields_2_title"))
            .required(false)
            .min_length(12)
            .max_length(500),
        ),
    ];
    let Some(submit) = show_builder_modal(
        sctx,
        pick,
        SAVE_MODAL_ID,
        t("sethereticket_modal_2_title"),
        fields,
    )
    .await
    else {
        return Ok(false);
    };
    let _ = submit
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let title = modal_value(&submit, "embed_title");
    if title.trim().is_empty() {
        return Ok(false);
    }
    let mut desc = modal_value(&submit, "embed_desc");
    if desc.trim().is_empty() {
        desc =
            t("sethereticket_description_embed").replace("${user.username}", &author.to_string());
    }
    // Disable the buttons like TS (`button.components.forEach(setDisabled)`).
    refresh_builder(&sctx.http, msg, &t, panel_name, cases, true).await;
    // Awaited per-case category picks (TS `for...in` with await).
    for case in cases.iter_mut() {
        if let Some(cat) = pick_case_category(
            sctx,
            msg.channel_id,
            author,
            &t,
            &crate::emojis::app_emoji_markup(&sctx.http, "Pointer")
                .await
                .unwrap_or_else(|| "👉".to_string()),
            case,
        )
        .await
        {
            case.category_id = cat;
        }
    }
    let reason = pick_reason(sctx, msg.channel_id, author, &t, &author.to_string()).await;
    let http = sctx.http.clone();
    let (footer_name, footer_icon) = ticket_footer(&http, pool, gid).await;
    let final_embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(2829617))
            .description(render_select_final_desc(&title, &desc)),
        &footer_name,
        footer_icon.is_some(),
    );
    let mut post = serenity::CreateMessage::new()
        .embed(final_embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(select_menu(
            panel_name, cases,
        ))]);
    if let Some(icon) = footer_icon {
        post = post.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let sent = msg.channel_id.send_message(&http, post).await?;
    crate::db::kv_set(
        pool,
        gid,
        &legacy_panel_key(sent.id.get()),
        &select_panel_value(
            author.get(),
            panel_name,
            reason,
            cases,
            sent.channel_id.get(),
            sent.id.get(),
        ),
    )
    .await?;
    let _ = msg
        .edit(
            &http,
            serenity::EditMessage::new()
                .content(t("sethereticket_command_work"))
                .components(vec![])
                .suppress_embeds(true),
        )
        .await;
    post_ticket_creation_log(&http, pool, gid, lang_code, msg.channel_id).await;
    Ok(true)
}

/// Per-case category prompt: a category select is posted, the choice
/// is acked and the prompt deleted. None on timeout.
async fn pick_case_category(
    sctx: &serenity::Context,
    channel_id: serenity::ChannelId,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    emoji_markup: &str,
    case: &LegacySelection,
) -> Option<String> {
    let menu = serenity::CreateSelectMenu::new(
        CATEGORY_PROMPT_ID,
        serenity::CreateSelectMenuKind::Channel {
            channel_types: Some(vec![serenity::ChannelType::Category]),
            default_channels: None,
        },
    )
    .min_values(1)
    .max_values(1);
    let content = render_category_prompt(
        &t("event_ticket_category_awaiting_response"),
        if case.emojis.is_empty() {
            emoji_markup
        } else {
            &case.emojis
        },
        &case.name,
    );
    let prompt = channel_id
        .send_message(
            &sctx.http,
            serenity::CreateMessage::new()
                .content(content)
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await
        .ok()?;
    let pick = prompt
        .await_component_interaction(sctx.shard.clone())
        .author_id(author)
        .timeout(Duration::from_secs(PROMPT_TIMEOUT_SECS))
        .await;
    let _ = prompt.delete(&sctx.http).await;
    let pick = pick?;
    if pick.data.custom_id != CATEGORY_PROMPT_ID {
        return None;
    }
    let id = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::ChannelSelect { values } => {
            values.first()?.get().to_string()
        }
        _ => return None,
    };
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    Some(id)
}

/// Reason yes/no prompt (`ticket-sethere-reason`); false on timeout.
async fn pick_reason(
    sctx: &serenity::Context,
    channel_id: serenity::ChannelId,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    user_mention: &str,
) -> bool {
    let menu = serenity::CreateSelectMenu::new(
        REASON_PICK_ID,
        serenity::CreateSelectMenuKind::String {
            options: vec![
                serenity::CreateSelectMenuOption::new(t("var_yes"), "yes".to_string()),
                serenity::CreateSelectMenuOption::new(t("var_no"), "no".to_string()),
            ],
        },
    );
    let prompt = match channel_id
        .send_message(
            &sctx.http,
            serenity::CreateMessage::new()
                .content(render_reason_prompt(
                    &t("event_ticket_reason_awaiting_response"),
                    user_mention,
                ))
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await
    {
        Ok(m) => m,
        Err(_) => return false,
    };
    let pick = prompt
        .await_component_interaction(sctx.shard.clone())
        .author_id(author)
        .timeout(Duration::from_secs(PROMPT_TIMEOUT_SECS))
        .await;
    let _ = prompt.delete(&sctx.http).await;
    let Some(pick) = pick else { return false };
    if pick.data.custom_id != REASON_PICK_ID {
        return false;
    }
    let value = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => return false,
    };
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    parse_reason_choice(&value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn button_row_keeps_ts_shape() {
        let v: serde_json::Value =
            serde_json::from_str(&button_panel_value(7, "Help", 10, 20, "30")).unwrap();
        assert_eq!(v["author"], "7");
        assert_eq!(v["used"], true);
        assert_eq!(v["panelName"], "Help");
        assert_eq!(v["reason"], false);
        assert_eq!(v["channel"], "10");
        assert_eq!(v["messageID"], "20");
        assert_eq!(v["categoryId"], "30");
    }

    #[test]
    fn category_id_keeps_digits_only() {
        assert_eq!(sanitize_category_id("<#123>"), "123");
        assert_eq!(sanitize_category_id("456"), "456");
        assert_eq!(sanitize_category_id(""), "");
    }

    #[test]
    fn case_ids_match_option_values() {
        let mut cases = vec![];
        assert_eq!(next_select_case_id(&cases), 1);
        select_case_add(&mut cases, "A".to_string(), String::new());
        select_case_add(&mut cases, "B".to_string(), "🔥".to_string());
        assert_eq!(cases[0].id, 1);
        assert_eq!(cases[1].id, 2);
        assert_eq!(cases[1].emojis, "🔥");
        cases.pop();
        select_case_add(&mut cases, "C".to_string(), String::new());
        assert_eq!(cases[1].id, 2);
        let opts = select_case_options(&cases);
        assert_eq!(opts.len(), 2);
    }

    #[test]
    fn final_desc_and_marker_match_ts() {
        assert_eq!(render_select_final_desc("T", "D"), "## T\nD");
        let v: serde_json::Value = serde_json::from_str(&select_panel_value(
            7,
            "Help",
            true,
            &[LegacySelection {
                id: 1,
                name: "A".into(),
                emojis: String::new(),
                category_id: "9".into(),
            }],
            10,
            20,
        ))
        .unwrap();
        assert_eq!(v["reason"], true);
        assert_eq!(v["selection"][0]["id"], 1);
        assert_eq!(v["selection"][0]["categoryId"], "9");
        assert_eq!(v["panelName"], "Help");
        assert_eq!(v["messageID"], "20");
    }

    #[test]
    fn prompts_fill_their_slots() {
        assert_eq!(render_type_question("<@X>, pick?", 7), "<@X>, pick?");
        assert_eq!(
            render_type_question("<@${interaction.user.id}>, pick?", 7),
            "<@7>, pick?"
        );
        assert_eq!(
            render_category_prompt(
                "Which [${x.emojis ?? interaction.client.iHorizon_Emojis.Pointer}] >> ${x.name}",
                "🔥",
                "A"
            ),
            "Which [🔥] >> A"
        );
        assert_eq!(
            render_reason_prompt("<@U>, reason?", "<@U>"),
            "<@U>, reason?"
        );
        assert!(parse_reason_choice("yes"));
        assert!(!parse_reason_choice("no"));
        assert!(!parse_reason_choice(""));
    }
}
