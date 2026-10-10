use super::*;
use poise::serenity_prelude as serenity;
use std::time::Duration;

// ---- V2 panel editor ids (TS !panel.ts customIds) ----

/// Main editor menu. TS `panelSelect`.
const EDITOR_SELECT_ID: &str = "ticket-panel-select";
/// Editor send button. TS `send_embed`.
const EDITOR_SEND_ID: &str = "ticket-panel-send";
/// Preview opener menu. TS `ticket-open-selection-v2-preview` (ephemeral,
/// never handled as a real open).
pub const V2_PREVIEW_ID: &str = "ticket-open-selection-v2-preview";

const OPT_PICK_ID: &str = "ticket-panel-option-pick";
const ADD_REMOVE_ID: &str = "ticket-panel-add-remove";
const ROLE_PICK_ID: &str = "ticket-panel-role-pick";
const CATEGORY_PICK_ID: &str = "ticket-panel-category-pick";
const CHANNEL_SEND_PICK_ID: &str = "ticket-panel-send-channel-pick";
const FORM_QUESTION_PICK_ID: &str = "ticket-panel-form-question-pick";

const MODAL_OPT_ADD: &str = "ticket-panel-add-option";
const MODAL_FORM_ADD: &str = "ticket-panel-add-form";
const MODAL_FORM_OPT_ADD: &str = "ticket-panel-add-form-opt";
const MODAL_PLACEHOLDER: &str = "ticket-panel-change-placeholder";
const MODAL_EMBED: &str = "ticket-panel-change-embed";
const MODAL_CHANNEL_PANEL: &str = "ticket-panel-change-channel-panel";
const MODAL_OPT_PANEL: &str = "ticket-panel-change-opt-panel";

/// Per-step editor await. Mirrors the `time: 1_250_000 * 10` ms
/// (~3.47h) select + button collectors in !panel.ts:366,372.
const STEP_TIMEOUT_SECS: u64 = 12_500;

/// Table-first panel load with legacy kv fallback (keys unchanged). A
/// legacy hit promotes into the table so rows migrate lazily; pair with
/// `save_panel_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_panel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    panel_id: &str,
) -> TicketPanel {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, &panel_key(panel_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first panel store with legacy kv dual-write (keys unchanged).
pub async fn save_panel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    panel_id: &str,
    panel: &TicketPanel,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        &panel_key(panel_id),
        &serde_json::to_string(panel)?,
    )
    .await
}

// ---- Pure panel-code / marker / menu assembly ----
// TS evidence: !panel.ts:128-135 (`rawData?.panelCode ||
// generatePassword({length:10, uppercase:true, numbers:true})`),
// :759-761 (`GUILD.TICKET_PANEL.${sentPanel.id}` -> panelCode),
// :733-752 (send select menu mapping), :495-515 (unique values).

/// Panel code assembly: keep the stored code, else mint a 10-char
/// uppercase-alphanumeric code like TS generatePassword.
pub fn assemble_panel_code(existing: Option<&str>) -> String {
    if let Some(raw) = existing {
        let code = raw.trim().to_string();
        if !code.is_empty() {
            return code;
        }
    }
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0x9E3779B97F4A7C15);
    crate::funcs::generate_password(
        &crate::funcs::PasswordOptions {
            length: 10,
            numbers: true,
            symbols: false,
            lowercase: true,
            uppercase: true,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        },
        seed,
    )
    .unwrap_or_else(|_| "TICKETPANEL".to_string())
}

/// Marker value stored at `GUILD.TICKET_PANEL.<sentMsgId>`: the panel
/// code, JSON-encoded like the other kv rows.
pub fn marker_value(panel_code: &str) -> String {
    serde_json::to_string(&panel_code.to_string()).unwrap_or_default()
}

/// Marker row pair for a sent opener message: key
/// `GUILD.TICKET_PANEL.<sentMsgId>`, value the encoded panel code.
pub fn marker_pair(sent_message_id: u64, panel_code: &str) -> (String, String) {
    (
        panel_key(&sent_message_id.to_string()),
        marker_value(panel_code),
    )
}

/// Mint a `ticket_option_<12 alnum>` value not already used, like
/// generateUniqueOptionFieldValue.
pub fn mint_option_value(used: &[String]) -> String {
    let has: std::collections::HashSet<&str> = used.iter().map(|s| s.as_str()).collect();
    for salt in 0..64u64 {
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64 ^ salt.wrapping_mul(0x9E3779B97F4A7C15))
            .unwrap_or(salt + 1);
        let suffix = crate::funcs::generate_password(
            &crate::funcs::PasswordOptions {
                length: 12,
                numbers: true,
                symbols: false,
                lowercase: true,
                uppercase: true,
                exclude_similar: false,
                exclude: String::new(),
                strict: false,
            },
            seed,
        )
        .unwrap_or_else(|_| format!("FALLBACK{salt:04}"));
        let value = format!("ticket_option_{suffix}");
        if !has.contains(value.as_str()) {
            return value;
        }
    }
    format!(
        "ticket_option_{:x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(1)
    )
}

/// Fill blank/duplicate option values with minted ones. Mirrors
/// ensureUniqueOptionFieldValues; returns true when changed.
pub fn ensure_unique_option_values(options: &mut [TicketOption]) -> bool {
    let mut used: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut changed = false;
    for opt in options.iter_mut() {
        let current = opt.value.trim().to_string();
        if current.is_empty() || used.contains(&current) {
            let known: Vec<String> = used.iter().cloned().collect();
            opt.value = mint_option_value(&known);
            changed = true;
        } else {
            opt.value = current;
        }
        used.insert(opt.value.clone());
    }
    changed
}

/// Send-menu option mapping: label/desc truncated to 100 chars like
/// the TS sendEmbed/preview builders.
pub fn v2_menu_options(panel: &TicketPanel) -> Vec<(String, String, Option<String>, String)> {
    panel
        .config
        .option_fields
        .iter()
        .map(|opt| {
            let label: String = opt.name.chars().take(100).collect();
            let desc = if opt.desc.trim().is_empty() {
                None
            } else {
                Some(opt.desc.chars().take(100).collect())
            };
            (label, opt.value.clone(), desc, opt.emoji.clone())
        })
        .collect()
}

/// Emoji gate for added options: keep custom `<...:...>` emoji or a
/// single glyph, drop anything else. Mirrors the
/// isSingleEmoji/isDiscordEmoji check in addOption.
pub fn sanitize_option_emoji(raw: &str) -> String {
    let emoji = raw.trim();
    if emoji.is_empty() {
        return String::new();
    }
    if emoji.starts_with('<') && emoji.ends_with('>') && emoji.contains(':') {
        return emoji.to_string();
    }
    if emoji.chars().count() == 1 {
        return emoji.to_string();
    }
    String::new()
}

/// Options summary for the editor embed (1024-char cap like
/// stringifyOptions; falls back to the overflow key).
pub fn summarize_options(t_overflow: &str, options: &[TicketOption]) -> String {
    if options.is_empty() {
        return String::new();
    }
    let mut out = String::from("```\n");
    for opt in options {
        out.push_str(&format!("- {}\n", opt.name));
        if !opt.desc.trim().is_empty() {
            out.push_str(&format!("  desc: {}\n", opt.desc));
        }
        if !opt.emoji.trim().is_empty() {
            out.push_str(&format!("  emoji: {}\n", opt.emoji));
        }
        if !opt.category_id.trim().is_empty() {
            out.push_str(&format!("  category: {}\n", opt.category_id));
        }
        if !opt.panel_id.trim().is_empty() {
            out.push_str(&format!("  panel: {}\n", opt.panel_id));
        }
        if !opt.roles_to_ping.is_empty() {
            out.push_str(&format!("  roles: {}\n", opt.roles_to_ping.join(" ")));
        }
        if !opt.form.is_empty() {
            out.push_str("  form:\n");
            for f in &opt.form {
                out.push_str(&format!("    - {}\n", f.question_title));
            }
        }
    }
    out.push_str("```");
    if out.len() > 1024 {
        return t_overflow.to_string();
    }
    out
}

/// Panel-level form summary (mirrors stringifyForm, same cap).
pub fn summarize_forms(t_overflow: &str, forms: &[TicketForm]) -> String {
    if forms.is_empty() {
        return String::new();
    }
    let mut out = String::from("```\n");
    for (i, f) in forms.iter().enumerate() {
        out.push_str(&format!("{i} - {}\n", f.question_title));
        if !f.question_placeholder.trim().is_empty() {
            out.push_str(&format!("  {}\n", f.question_placeholder));
        }
    }
    out.push_str("```");
    if out.len() > 1024 {
        return t_overflow.to_string();
    }
    out
}

/// Overflow gate: mirrors TS shouldAttachOptionsFile (true when the
/// capped field summary fell back to the overflow key string).
pub fn options_overflowed(t_overflow: &str, options: &[TicketOption]) -> bool {
    !options.is_empty() && summarize_options(t_overflow, options) == t_overflow
}

/// Overflow attachment filename: TS
/// `ticket-panel-${panelCode}-options.txt`.
pub fn options_overflow_filename(panel_code: &str) -> String {
    format!("ticket-panel-{panel_code}-options.txt")
}

/// Full per-option dump for the overflow .txt file. Mirrors TS
/// stringifyOptionsDetailed: no 1024 cap, plain labels (no code fence,
/// no box-drawing), trimEnd; empty list falls back to var_no_set.
/// `role_name` resolves a role id to its guild name (None -> the
/// var_unknown key, like TS `r?.name || lang.var_unknown`).
pub fn detailed_options_content(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    options: &[TicketOption],
    role_name: &dyn Fn(&str) -> Option<String>,
) -> String {
    if options.is_empty() {
        return t("var_no_set");
    }
    let unknown = t("var_unknown");
    let mut out = String::new();
    for opt in options {
        out.push_str(&format!("- {}\n", opt.name));
        if !opt.desc.trim().is_empty() {
            out.push_str(&format!(
                "  {}: {}\n",
                t("ticket_panel_add_option_modal_field2_label"),
                opt.desc
            ));
        }
        if !opt.emoji.trim().is_empty() {
            out.push_str(&format!(
                "  {}: {}\n",
                t("ticket_panel_add_option_modal_field3_label"),
                opt.emoji
            ));
        }
        if !opt.category_id.trim().is_empty() {
            out.push_str(&format!("  Category: <#{}>\n", opt.category_id.trim()));
        }
        if !opt.panel_id.trim().is_empty() {
            out.push_str(&format!(
                "  {}: {}\n",
                t("ticket_panel_change_embed_modal_placeholder"),
                opt.panel_id
            ));
        }
        if !opt.roles_to_ping.is_empty() {
            out.push_str(&format!("  {}:\n", t("ticket_panel_role_to_ping")));
            for role in &opt.roles_to_ping {
                let name = role_name(role).unwrap_or_else(|| unknown.clone());
                out.push_str(&format!("    - {role} (@{name})\n"));
            }
        }
        if !opt.form.is_empty() {
            out.push_str(&format!("  {}:\n", t("var_form")));
            for f in &opt.form {
                out.push_str(&format!("    - {}\n", f.question_title));
                if !f.question_placeholder.trim().is_empty() {
                    out.push_str(&format!("      {}\n", f.question_placeholder));
                }
            }
        }
        out.push('\n');
    }
    out.trim_end().to_string()
}

/// Builds the overflow attachment pair (filename, utf-8 bytes) when the
/// options exceed the field caps; None otherwise. Mirrors TS
/// buildOptionsAttachment. Call sites wrap it in
/// `serenity::CreateAttachment::bytes(bytes, filename)`.
pub fn options_overflow_file(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel_code: &str,
    options: &[TicketOption],
    role_name: &dyn Fn(&str) -> Option<String>,
) -> Option<(String, Vec<u8>)> {
    if !options_overflowed(&t("ticket_panel_option_fields"), options) {
        return None;
    }
    let content = detailed_options_content(t, options, role_name);
    Some((options_overflow_filename(panel_code), content.into_bytes()))
}

/// Resolve a role id to its cached guild name for the overflow file
/// (TS `guild.roles.cache.get(role)?.name`).
fn cached_role_name(
    sctx: &serenity::Context,
    guild_id: Option<serenity::GuildId>,
    role_id: &str,
) -> Option<String> {
    let gid = guild_id?;
    let rid = role_id.trim().parse::<u64>().ok()?;
    sctx.cache.guild(gid).and_then(|g| {
        g.roles
            .get(&serenity::RoleId::new(rid))
            .map(|r| r.name.clone())
    })
}

// ---- Editor command ----

/// V2 ticket panel builder.
// Loads (or mints) the panel row, then runs the builder loop
// (options, forms, roles, category, related embed, preview,
// send-to-channel + marker write). Mirrors !panel.ts. Registry name,
// admin gate and disable guard are unchanged.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "panel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_panel(
    ctx: Ctx<'_>,
    #[description = "Panel id (empty creates a new panel)"] panel_id: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Mirrors !panel.ts: the open_disabled_command guard.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "open_disabled_command").await {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let key = panel_id.as_deref().map(str::trim).unwrap_or_default();
    // Intentional fresh-default leg (kept, no behavior change): TS
    // `!panel.ts:117-155` reads `GUILD.TICKET_PANEL.<panel_id>` and, when
    // the row is missing (empty panel_id -> `...TICKET_PANEL.null`),
    // falls through to `baseData` fresh defaults (minted panelCode,
    // empty optionFields, pingUser/userSelectPanel/deleteButton/
    // transcriptButton true). `TicketPanel::default()` is that leg.
    let mut panel = if key.is_empty() {
        TicketPanel::default()
    } else {
        load_panel_routed(pool, &gid, key).await
    };
    if panel.placeholder.trim().is_empty() {
        panel.placeholder = t("ticket_panel_default_placeholder");
    }
    let panel_code = assemble_panel_code(if panel.panel_code.trim().is_empty() {
        None
    } else {
        Some(&panel.panel_code)
    });
    panel.panel_code = panel_code.clone();
    let mut saved = false;

    let author = ctx.author().id;
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(editor_embed(&t, &panel, &panel_code, saved))
                .components(editor_rows(&t)),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let sctx = ctx.serenity_context().clone();

    loop {
        let Some(pick) = next_pick(&msg, &sctx, author).await else {
            break;
        };
        if pick.data.custom_id == EDITOR_SEND_ID {
            if run_send_flow(
                &sctx,
                &pick,
                pool,
                &gid,
                &t,
                &mut msg,
                &panel_code,
                &mut panel,
            )
            .await?
            {
                saved = true;
                break;
            }
            refresh_editor(
                &sctx,
                ctx.guild_id(),
                &mut msg,
                &t,
                &panel,
                &panel_code,
                saved,
            )
            .await;
            continue;
        }
        if pick.data.custom_id != EDITOR_SELECT_ID {
            continue;
        }
        let choice = match &pick.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => continue,
        };
        match choice.as_str() {
            "save" => {
                let _ = pick
                    .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                ensure_unique_option_values(&mut panel.config.option_fields);
                save_panel_routed(pool, &gid, &panel_code, &panel).await?;
                saved = true;
                break;
            }
            "preview" => {
                run_preview(&sctx, &pick, pool, &gid, &t, &panel, &panel_code).await?;
                continue;
            }
            step => {
                if run_editor_step(&sctx, &pick, pool, &gid, &t, &mut msg, &mut panel, step).await?
                {
                    saved = false;
                }
                refresh_editor(
                    &sctx,
                    ctx.guild_id(),
                    &mut msg,
                    &t,
                    &panel,
                    &panel_code,
                    saved,
                )
                .await;
            }
        }
    }

    if saved {
        // Mirrors save() (!panel.ts): the saved embed edit carries the
        // overflow .txt (replacing stale attachments).
        let mut edit = serenity::EditMessage::new()
            .embed(editor_embed(&t, &panel, &panel_code, true))
            .components(vec![]);
        let mut attachments = serenity::EditAttachments::new();
        if let Some((filename, bytes)) =
            options_overflow_file(&t, &panel_code, &panel.config.option_fields, &|r| {
                cached_role_name(&sctx, ctx.guild_id(), r)
            })
        {
            attachments = attachments.add(serenity::CreateAttachment::bytes(bytes, filename));
        }
        edit = edit.attachments(attachments);
        let _ = msg.edit(&sctx.http, edit).await;
        let done = t("ticket_panel_successfully_saved");
        let _ = ctx
            .say(if done.is_empty() {
                "Panel saved.".to_string()
            } else {
                done
            })
            .await;
    } else {
        let _ = msg
            .edit(
                &sctx.http,
                serenity::EditMessage::new()
                    .embed(editor_embed(&t, &panel, &panel_code, saved))
                    .components(vec![]),
            )
            .await;
    }
    Ok(())
}

async fn next_pick(
    msg: &serenity::Message,
    sctx: &serenity::Context,
    author: serenity::UserId,
) -> Option<serenity::ComponentInteraction> {
    msg.await_component_interaction(sctx.shard.clone())
        .author_id(author)
        .timeout(Duration::from_secs(STEP_TIMEOUT_SECS))
        .await
}

fn editor_rows(t: &(dyn Fn(&str) -> String + Send + Sync)) -> Vec<serenity::CreateActionRow> {
    let steps = [
        ("ticket_panel_panel_1_label", "save"),
        ("ticket_panel_panel_2_label", "preview"),
        ("ticket_panel_panel_3_label", "change_embed"),
        ("ticket_panel_panel_4_label", "change_role"),
        ("ticket_panel_panel_5_label", "change_placeholder"),
        ("ticket_panel_panel_6_label", "change_category"),
        ("ticket_panel_panel_10_label", "change_category_2"),
        ("ticket_panel_panel_7_label", "change_ping"),
        ("ticket_panel_panel_8_label", "change_option"),
        ("ticket_panel_panel_9_label", "change_form"),
        ("ticket_panel_panel_11_label", "change_ticket_channel_panel"),
        (
            "ticket_panel_panel_12_label",
            "change_ticket_user_select_panel",
        ),
        (
            "ticket_panel_panel_13_label",
            "change_ticket_button_delete_panel",
        ),
        (
            "ticket_panel_panel_14_label",
            "change_ticket_button_transcript_panel",
        ),
        (
            "ticket_panel_panel_15_label",
            "change_ticket_channel_panel_options",
        ),
        ("ticket_panel_panel_16_label", "change_ticket_forms_options"),
        ("ticket_panel_panel_17_label", "change_role_to_ping_options"),
    ];
    let options = steps
        .iter()
        .map(|(key, value)| serenity::CreateSelectMenuOption::new(t(key), (*value).to_string()))
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        EDITOR_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("ticket_panel_panel_placeholder"));
    let send_label = t("ticket_panel_button_send");
    vec![
        serenity::CreateActionRow::SelectMenu(menu),
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(EDITOR_SEND_ID)
            .label(if send_label.is_empty() {
                "Send".to_string()
            } else {
                send_label
            })
            .style(serenity::ButtonStyle::Primary)]),
    ]
}

fn editor_embed(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    panel_code: &str,
    saved: bool,
) -> serenity::CreateEmbed {
    let title_key = t("ticket_panel_embed_title");
    let mut desc = format!(
        "{title_key}{panel_code}\n{}\n{}: {}\n",
        t("ticket_panel_embed_desc"),
        t("ticket_panel_saved_conf"),
        if saved { "🟢" } else { "🔴" }
    );
    let none = t("var_no_set");
    let show = |v: &str| {
        if v.trim().is_empty() {
            none.clone()
        } else {
            v.to_string()
        }
    };
    desc.push_str(&format!(
        "**{}**\n{}\n**{}**\n{}\n",
        t("ticket_panel_related_embed"),
        show(&panel.related_embed_id),
        t("ticket_panel_channel_panel_embed_id"),
        show(&panel.ticket_channel_panel),
    ));
    let roles = if panel.config.roles_to_ping.is_empty() {
        none.clone()
    } else {
        panel
            .config
            .roles_to_ping
            .iter()
            .map(|r| format!("<@&{r}>"))
            .collect::<Vec<_>>()
            .join(" ")
    };
    let flag = |on: bool| if on { "🟢" } else { "🔴" };
    desc.push_str(&format!(
        "**{}**\n{}\n**{}** {}\n**{}**\n{}\n**{}**\n{}\n**{}** {}\n**{}** {}\n**{}** {}\n",
        t("ticket_panel_role_to_ping"),
        roles,
        t("ticket_panel_ping_user"),
        flag(panel.config.ping_user),
        t("ticket_panel_placeholder"),
        show(&panel.placeholder),
        t("ticket_panel_category"),
        show(&panel.category_id),
        t("ticket_panel_select_user"),
        flag(panel.config.user_select_panel),
        t("ticket_panel_button_delete"),
        flag(panel.config.delete_button),
        t("ticket_panel_button_transcript"),
        flag(panel.config.transcript_button),
    ));
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("{title_key}{panel_code}"))
        .description(desc)
        .colour(serenity::Colour::new(0x397C16));
    let overflow = t("ticket_panel_option_fields");
    let opts = summarize_options(&overflow, &panel.config.option_fields);
    if !opts.is_empty() {
        embed = embed.field(
            t("ticket_panel_option_fields"),
            opts.chars().take(1024).collect::<String>(),
            false,
        );
    }
    let forms = summarize_forms(&overflow, &panel.config.form);
    if !forms.is_empty() {
        embed = embed.field(
            t("ticket_panel_form"),
            forms.chars().take(1024).collect::<String>(),
            false,
        );
    }
    let _ = panel;
    embed
}

/// Editor refresh: re-render the embed + steps and re-attach the
/// overflow .txt (replacing stale attachments). Mirrors
/// refreshPanelMessage (!panel.ts: `attachments: [], files: [...]`).
async fn refresh_editor(
    sctx: &serenity::Context,
    guild_id: Option<serenity::GuildId>,
    msg: &mut serenity::Message,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    panel_code: &str,
    saved: bool,
) {
    let mut edit = serenity::EditMessage::new()
        .embed(editor_embed(t, panel, panel_code, saved))
        .components(editor_rows(t));
    let mut attachments = serenity::EditAttachments::new();
    if let Some((filename, bytes)) =
        options_overflow_file(t, panel_code, &panel.config.option_fields, &|r| {
            cached_role_name(sctx, guild_id, r)
        })
    {
        attachments = attachments.add(serenity::CreateAttachment::bytes(bytes, filename));
    }
    edit = edit.attachments(attachments);
    let _ = msg.edit(&sctx.http, edit).await;
}

async fn show_modal(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    modal_id: &str,
    title: String,
    fields: Vec<(String, String, bool, u16, u16)>,
) -> Option<serenity::ModalInteraction> {
    // (label, custom_id, required, min, max)
    let mut opts = crate::modal_helper::ModalOptions::new(&title, modal_id);
    opts.fields = fields
        .into_iter()
        .map(|(label, custom_id, required, min, max)| {
            crate::modal_helper::ModalField::Text(crate::modal_helper::TextField {
                custom_id,
                label,
                placeholder: None,
                style: crate::modal_helper::TextStyle::Short,
                required,
                max_length: Some(max),
                min_length: Some(min),
                value: None,
            })
        })
        .collect();
    let modal = crate::modal_helper::build_modal(&opts).ok()?;
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

async fn ack_modal(sctx: &serenity::Context, submit: &serenity::ModalInteraction) {
    let _ = submit
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
}

async fn ephemeral(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = pick
        .create_response(
            &sctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Pick one option index via an in-place string select. Mirrors
/// selectOption (customId + prompt + single collect).
async fn pick_option_index(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    prompt_key: &str,
) -> Option<(usize, serenity::ComponentInteraction)> {
    if panel.config.option_fields.is_empty() {
        return None;
    }
    let options = panel
        .config
        .option_fields
        .iter()
        .enumerate()
        .map(|(idx, opt)| {
            serenity::CreateSelectMenuOption::new(
                opt.name.chars().take(100).collect::<String>(),
                idx.to_string(),
            )
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        OPT_PICK_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("var_chose_option"));
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(t(prompt_key))
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await;
    let pick = next_pick(msg, sctx, author).await?;
    if pick.data.custom_id != OPT_PICK_ID {
        return None;
    }
    let idx: usize = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first()?.trim().parse().ok()?
        }
        _ => return None,
    };
    if idx >= panel.config.option_fields.len() {
        ephemeral(sctx, &pick, t("ticket_panel_option_invalid")).await;
        return None;
    }
    Some((idx, pick))
}

/// Add/remove submenu. Mirrors the changeOption/changeForm selects.
/// Returns (is_add, live_sub_pick): the sub-pick is unacknowledged so
/// callers can show a modal on it for the add path.
async fn pick_add_or_remove(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    prompt: String,
    add_label_key: &str,
    remove_label_key: &str,
) -> Option<(bool, serenity::ComponentInteraction)> {
    let options = vec![
        serenity::CreateSelectMenuOption::new(t(add_label_key), "add".to_string()),
        serenity::CreateSelectMenuOption::new(t(remove_label_key), "remove".to_string()),
    ];
    let menu = serenity::CreateSelectMenu::new(
        ADD_REMOVE_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("ticket_panel_change_option_select_placeholder"));
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(prompt)
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await;
    let pick = next_pick(msg, sctx, author).await?;
    if pick.data.custom_id != ADD_REMOVE_ID {
        return None;
    }
    let choice = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => return None,
    };
    match choice.as_str() {
        "add" => Some((true, pick)),
        "remove" => Some((false, pick)),
        _ => None,
    }
}

/// Role picker via a native RoleSelect menu. Mirrors the TS
/// RoleSelectMenuBuilder steps (max 10, min 0).
async fn pick_roles(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    current: &[String],
) -> Option<Vec<String>> {
    let defaults: Vec<serenity::RoleId> = current
        .iter()
        .filter_map(|r| r.trim().parse::<u64>().ok().map(serenity::RoleId::new))
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        ROLE_PICK_ID,
        serenity::CreateSelectMenuKind::Role {
            default_roles: if defaults.is_empty() {
                None
            } else {
                Some(defaults)
            },
        },
    )
    .placeholder(t("ticket_panel_change_role_roleSelect_placeholder"))
    .min_values(0)
    .max_values(10);
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(t("ticket_panel_change_role_interaction_content"))
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await;
    let pick = next_pick(msg, sctx, author).await?;
    if pick.data.custom_id != ROLE_PICK_ID {
        return None;
    }
    let roles = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::RoleSelect { values } => {
            values.iter().map(|r| r.get().to_string()).collect()
        }
        _ => return None,
    };
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    Some(roles)
}

/// Category picker via a native ChannelSelect (GuildCategory only).
/// Mirrors the changeCategory / changeCategoryForOption steps.
async fn pick_category(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
) -> Option<String> {
    let menu = serenity::CreateSelectMenu::new(
        CATEGORY_PICK_ID,
        serenity::CreateSelectMenuKind::Channel {
            channel_types: Some(vec![serenity::ChannelType::Category]),
            default_channels: None,
        },
    )
    .placeholder(t("ticket_panel_change_category_channelSelect_placeholder"));
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(t("ticket_panel_select_channel_to_send"))
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await;
    let pick = next_pick(msg, sctx, author).await?;
    if pick.data.custom_id != CATEGORY_PICK_ID {
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

async fn embed_exists(pool: &crate::db::Pool, gid: &str, embed_id: &str) -> bool {
    // Table-first with legacy kv fallback (keys unchanged).
    embed_source_routed(pool, gid, embed_id).await.is_some()
}

/// One editor step. Returns true when the panel mutated (saved flag
/// must flip, like `isSaved = false` in TS).
#[allow(clippy::too_many_arguments)]
async fn run_editor_step(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    msg: &mut serenity::Message,
    panel: &mut TicketPanel,
    step: &str,
) -> Result<bool, anyhow::Error> {
    let author = pick.user.id;
    match step {
        "change_embed" => {
            let Some(submit) = show_modal(
                sctx,
                pick,
                MODAL_EMBED,
                t("ticket_panel_change_embed_modal_placeholder"),
                vec![(
                    t("ticket_panel_change_embed_modal_placeholder"),
                    "embed_id".to_string(),
                    true,
                    0,
                    20,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            let id = crate::modal_helper::text_value(&submit, "embed_id")
                .trim()
                .to_string();
            if !embed_exists(pool, gid, &id).await {
                ack_modal(sctx, &submit).await;
                ephemeral(sctx, pick, t("ticket_panel_change_embed_dont_exist")).await;
                return Ok(false);
            }
            panel.related_embed_id = id;
            ack_modal(sctx, &submit).await;
            Ok(true)
        }
        "change_role" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let current = panel.config.roles_to_ping.clone();
            let Some(roles) = pick_roles(sctx, msg, author, t, &current).await else {
                return Ok(false);
            };
            panel.config.roles_to_ping = roles;
            Ok(true)
        }
        "change_placeholder" => {
            let Some(submit) = show_modal(
                sctx,
                pick,
                MODAL_PLACEHOLDER,
                t("ticket_panel_change_placeholder_modal_title"),
                vec![(
                    t("ticket_panel_change_placeholder_modal_placeholder"),
                    "placeholder".to_string(),
                    true,
                    4,
                    100,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            panel.placeholder = crate::modal_helper::text_value(&submit, "placeholder")
                .trim()
                .to_string();
            ack_modal(sctx, &submit).await;
            Ok(true)
        }
        "change_category" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some(id) = pick_category(sctx, msg, author, t).await else {
                return Ok(false);
            };
            panel.category_id = id;
            Ok(true)
        }
        "change_category_2" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                "ticket_panel_option_change_category",
            )
            .await
            else {
                return Ok(false);
            };
            let _ = opt_pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some(id) = pick_category(sctx, msg, author, t).await else {
                return Ok(false);
            };
            if let Some(opt) = panel.config.option_fields.get_mut(idx) {
                opt.category_id = id;
            }
            Ok(true)
        }
        "change_ping" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.ping_user = !panel.config.ping_user;
            Ok(true)
        }
        "change_option" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((add, sub)) = pick_add_or_remove(
                sctx,
                msg,
                author,
                t,
                t("ticket_panel_change_option_interaction_content"),
                "ticket_panel_change_option_select_1_label",
                "ticket_panel_change_option_select_2_label",
            )
            .await
            else {
                return Ok(false);
            };
            if add {
                if panel.config.option_fields.len() >= 10 {
                    ephemeral(sctx, &sub, t("ticket_panel_add_option_max_10")).await;
                    return Ok(false);
                }
                return Ok(run_option_add_modal(sctx, &sub, t, panel).await);
            }
            let _ = sub
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                "ticket_panel_rempve_option_interaction_content",
            )
            .await
            else {
                return Ok(false);
            };
            let _ = opt_pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            if idx < panel.config.option_fields.len() {
                panel.config.option_fields.remove(idx);
                return Ok(true);
            }
            Ok(false)
        }
        "change_form" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            return run_panel_form_step(sctx, msg, author, t, panel).await;
        }
        "change_ticket_channel_panel" => {
            let Some(submit) = show_modal(
                sctx,
                pick,
                MODAL_CHANNEL_PANEL,
                t("ticket_panel_change_embed_modal_placeholder"),
                vec![(
                    t("ticket_panel_change_embed_modal_placeholder"),
                    "embed_id".to_string(),
                    true,
                    0,
                    20,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            let id = crate::modal_helper::text_value(&submit, "embed_id")
                .trim()
                .to_string();
            if !embed_exists(pool, gid, &id).await {
                ack_modal(sctx, &submit).await;
                ephemeral(sctx, pick, t("ticket_panel_change_embed_dont_exist")).await;
                return Ok(false);
            }
            panel.ticket_channel_panel = id;
            ack_modal(sctx, &submit).await;
            let tip = t("ticket_panel_tip_about_variable1");
            if !tip.is_empty() {
                let _ = submit
                    .create_followup(
                        &sctx.http,
                        serenity::CreateInteractionResponseFollowup::new()
                            .content(tip)
                            .ephemeral(true),
                    )
                    .await;
            }
            Ok(true)
        }
        "change_ticket_user_select_panel" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.user_select_panel = !panel.config.user_select_panel;
            Ok(true)
        }
        "change_ticket_button_delete_panel" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.delete_button = !panel.config.delete_button;
            Ok(true)
        }
        "change_ticket_button_transcript_panel" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.transcript_button = !panel.config.transcript_button;
            Ok(true)
        }
        "change_ticket_channel_panel_options" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                "ticket_panel_change_embed_options",
            )
            .await
            else {
                return Ok(false);
            };
            let Some(submit) = show_modal(
                sctx,
                &opt_pick,
                MODAL_OPT_PANEL,
                t("ticket_panel_change_embed_modal_placeholder"),
                vec![(
                    t("ticket_panel_channel_panel_embed_id"),
                    "embed_id".to_string(),
                    true,
                    8,
                    32,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            let id = crate::modal_helper::text_value(&submit, "embed_id")
                .trim()
                .to_string();
            if !embed_exists(pool, gid, &id).await {
                ack_modal(sctx, &submit).await;
                ephemeral(sctx, &opt_pick, t("ticket_panel_change_embed_dont_exist")).await;
                return Ok(false);
            }
            if let Some(opt) = panel.config.option_fields.get_mut(idx) {
                opt.panel_id = id;
            }
            ack_modal(sctx, &submit).await;
            Ok(true)
        }
        "change_ticket_forms_options" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            return run_option_form_step(sctx, msg, author, t, panel).await;
        }
        "change_role_to_ping_options" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                "ticket_panel_chose_option_to_form",
            )
            .await
            else {
                return Ok(false);
            };
            let _ = opt_pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let current = panel
                .config
                .option_fields
                .get(idx)
                .map(|o| o.roles_to_ping.clone())
                .unwrap_or_default();
            let Some(roles) = pick_roles(sctx, msg, author, t, &current).await else {
                return Ok(false);
            };
            if let Some(opt) = panel.config.option_fields.get_mut(idx) {
                opt.roles_to_ping = roles;
            }
            Ok(true)
        }
        _ => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            Ok(false)
        }
    }
}

/// Panel-level form add/remove (change_form). The add modal runs on
/// the live add/remove sub-pick; the remove path picks a question.
async fn run_panel_form_step(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &mut TicketPanel,
) -> Result<bool, anyhow::Error> {
    let Some((add, sub)) = pick_add_or_remove(
        sctx,
        msg,
        author,
        t,
        t("ticket_panel_change_form_interaction_content"),
        "ticket_panel_change_form_select_placeholder_1",
        "ticket_panel_change_form_select_placeholder_2",
    )
    .await
    else {
        return Ok(false);
    };
    if add {
        if panel.config.form.len() >= 3 {
            ephemeral(sctx, &sub, t("ticket_panel_add_form_max_3")).await;
            return Ok(false);
        }
        let mut target = std::mem::take(&mut panel.config.form);
        let added = run_form_add_modal(
            sctx,
            &sub,
            t,
            MODAL_FORM_ADD,
            "ticket_panel_add_form_modal_field1_label",
            &mut target,
        )
        .await;
        panel.config.form = target;
        return Ok(added);
    }
    let _ = sub
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    if panel.config.form.is_empty() {
        return Ok(false);
    }
    let options = panel
        .config
        .form
        .iter()
        .enumerate()
        .map(|(i, f)| {
            serenity::CreateSelectMenuOption::new(
                f.question_title.chars().take(100).collect::<String>(),
                i.to_string(),
            )
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        FORM_QUESTION_PICK_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("ticket_panel_remove_option_select_placeholder"));
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(t("ticket_panel_rempve_option_interaction_content"))
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await;
    let Some(rm) = next_pick(msg, sctx, author).await else {
        return Ok(false);
    };
    let idx: Option<usize> = match &rm.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().and_then(|v| v.trim().parse().ok())
        }
        _ => None,
    };
    let _ = rm
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    if let Some(i) = idx {
        if i < panel.config.form.len() {
            panel.config.form.remove(i);
            return Ok(true);
        }
    }
    Ok(false)
}

/// Per-option form add/remove (change_ticket_forms_options, max 3
/// questions per option). Mirrors changeTicketFormsOptions.
async fn run_option_form_step(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &mut TicketPanel,
) -> Result<bool, anyhow::Error> {
    let Some((idx, opt_pick)) = pick_option_index(
        sctx,
        msg,
        author,
        t,
        panel,
        "ticket_panel_chose_option_to_form",
    )
    .await
    else {
        return Ok(false);
    };
    let _ = opt_pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let Some((add, sub)) = pick_add_or_remove(
        sctx,
        msg,
        author,
        t,
        t("ticket_panel_manage_form_title")
            .replace("${option.name}", &panel.config.option_fields[idx].name),
        "ticket_panel_add_a_question",
        "ticket_panel_remove_a_question",
    )
    .await
    else {
        return Ok(false);
    };
    if add {
        if panel.config.option_fields[idx].form.len() >= 3 {
            ephemeral(sctx, &sub, t("ticket_panel_add_form_max_3")).await;
            return Ok(false);
        }
        let mut target = std::mem::take(&mut panel.config.option_fields[idx].form);
        let added = run_form_add_modal(
            sctx,
            &sub,
            t,
            MODAL_FORM_OPT_ADD,
            "ticket_panel_add_form_modal_field1_label",
            &mut target,
        )
        .await;
        panel.config.option_fields[idx].form = target;
        return Ok(added);
    }
    let _ = sub
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    if panel.config.option_fields[idx].form.is_empty() {
        return Ok(false);
    }
    let options = panel.config.option_fields[idx]
        .form
        .iter()
        .enumerate()
        .map(|(i, f)| {
            serenity::CreateSelectMenuOption::new(
                f.question_title.chars().take(100).collect::<String>(),
                i.to_string(),
            )
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        FORM_QUESTION_PICK_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("ticket_panel_chose_a_question"));
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(t("ticket_panel_select_question_to_delete"))
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await;
    let Some(rm) = next_pick(msg, sctx, author).await else {
        return Ok(false);
    };
    let rm_idx: Option<usize> = match &rm.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().and_then(|v| v.trim().parse().ok())
        }
        _ => None,
    };
    let _ = rm
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    if let Some(i) = rm_idx {
        if i < panel.config.option_fields[idx].form.len() {
            panel.config.option_fields[idx].form.remove(i);
            return Ok(true);
        }
    }
    Ok(false)
}

/// Add-option modal shown on a live add/remove sub-pick. Separated
/// so the modal always has a valid interaction token.
async fn run_option_add_modal(
    sctx: &serenity::Context,
    sub_pick: &serenity::ComponentInteraction,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &mut TicketPanel,
) -> bool {
    if panel.config.option_fields.len() >= 10 {
        return false;
    }
    let Some(submit) = show_modal(
        sctx,
        sub_pick,
        MODAL_OPT_ADD,
        t("ticket_panel_add_option_modal_title"),
        vec![
            (
                t("ticket_panel_add_option_modal_field1_label"),
                "name".to_string(),
                true,
                4,
                128,
            ),
            (
                t("ticket_panel_add_option_modal_field2_label"),
                "desc".to_string(),
                false,
                0,
                130,
            ),
            (
                t("ticket_panel_add_option_modal_field3_label"),
                "emoji".to_string(),
                false,
                0,
                100,
            ),
        ],
    )
    .await
    else {
        return false;
    };
    let name = crate::modal_helper::text_value(&submit, "name")
        .trim()
        .to_string();
    if name.is_empty() {
        ack_modal(sctx, &submit).await;
        return false;
    }
    let desc = crate::modal_helper::text_value(&submit, "desc")
        .trim()
        .to_string();
    let emoji = sanitize_option_emoji(&crate::modal_helper::text_value(&submit, "emoji"));
    let known: Vec<String> = panel
        .config
        .option_fields
        .iter()
        .map(|o| o.value.clone())
        .collect();
    panel.config.option_fields.push(TicketOption {
        name,
        desc,
        value: mint_option_value(&known),
        emoji,
        ..Default::default()
    });
    ack_modal(sctx, &submit).await;
    true
}

/// Add-form modal shown on a live sub-pick (panel-level or
/// per-option). Shared by the form add paths.
async fn run_form_add_modal(
    sctx: &serenity::Context,
    sub_pick: &serenity::ComponentInteraction,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    modal_id: &str,
    title_key: &str,
    target: &mut Vec<TicketForm>,
) -> bool {
    if target.len() >= 3 {
        return false;
    }
    let title_label = if modal_id == MODAL_FORM_OPT_ADD {
        t("var_title")
    } else {
        t(title_key)
    };
    let Some(submit) = show_modal(
        sctx,
        sub_pick,
        modal_id,
        t("ticket_panel_add_form_modal_title"),
        vec![
            (title_label, "title".to_string(), true, 1, 128),
            (
                t("ticket_panel_add_form_modal_field2_label"),
                "placeholder".to_string(),
                false,
                0,
                if modal_id == MODAL_FORM_OPT_ADD {
                    100
                } else {
                    130
                },
            ),
        ],
    )
    .await
    else {
        return false;
    };
    let qtitle = crate::modal_helper::text_value(&submit, "title")
        .trim()
        .to_string();
    if qtitle.is_empty() {
        ack_modal(sctx, &submit).await;
        return false;
    }
    let qplaceholder = crate::modal_helper::text_value(&submit, "placeholder")
        .trim()
        .to_string();
    let id = target.len() as u32;
    target.push(TicketForm {
        question_id: id,
        question_title: qtitle,
        question_placeholder: qplaceholder,
    });
    ack_modal(sctx, &submit).await;
    true
}

/// Preview step: ephemeral related embed + opener select (preview-only
/// id) + the overflow .txt when options exceed the field caps.
/// Mirrors preview() (!panel.ts:1613).
async fn run_preview(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    panel_code: &str,
) -> Result<(), anyhow::Error> {
    let related: Option<serde_json::Value> = if panel.related_embed_id.trim().is_empty() {
        None
    } else {
        // Table-first with legacy kv fallback (keys unchanged).
        embed_source_routed(pool, gid, &panel.related_embed_id).await
    };
    let Some(source) = related else {
        ephemeral(sctx, pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(());
    };
    if panel.config.option_fields.is_empty() {
        ephemeral(sctx, pick, t("ticket_panel_need_1_option")).await;
        return Ok(());
    }
    let Some(embed) = create_embed_from_value(&source) else {
        ephemeral(sctx, pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(());
    };
    let options = v2_menu_options(panel)
        .into_iter()
        .map(|(label, value, desc, emoji)| {
            let mut b = serenity::CreateSelectMenuOption::new(label, value);
            if let Some(d) = desc {
                b = b.description(d);
            }
            if !emoji.trim().is_empty() {
                let rt = emoji
                    .parse::<serenity::ReactionType>()
                    .unwrap_or(serenity::ReactionType::Unicode(emoji));
                b = b.emoji(rt);
            }
            b
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        V2_PREVIEW_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(panel.placeholder.clone());
    let guild_id = pick.guild_id;
    let overflow = options_overflow_file(t, panel_code, &panel.config.option_fields, &|r| {
        cached_role_name(sctx, guild_id, r)
    });
    let mut reply = serenity::CreateInteractionResponseMessage::new()
        .content(t("ticket_panel_preview_message"))
        .embed(embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
        .ephemeral(true);
    if let Some((filename, bytes)) = overflow {
        reply = reply.add_file(serenity::CreateAttachment::bytes(bytes, filename));
    }
    let _ = pick
        .create_response(
            &sctx.http,
            serenity::CreateInteractionResponse::Message(reply),
        )
        .await;
    Ok(())
}

/// Send flow: save + target-channel pick + post the opener with the
/// verbatim `ticket-open-selection-v2` menu + marker write. Mirrors
/// sendEmbed (!panel.ts:671). Returns true when sent (loop ends).
#[allow(clippy::too_many_arguments)]
async fn run_send_flow(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    msg: &mut serenity::Message,
    panel_code: &str,
    panel: &mut TicketPanel,
) -> Result<bool, anyhow::Error> {
    if panel.config.option_fields.is_empty() {
        ephemeral(sctx, pick, t("ticket_panel_need_1_option")).await;
        return Ok(false);
    }
    ensure_unique_option_values(&mut panel.config.option_fields);
    save_panel_routed(pool, gid, panel_code, panel).await?;
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let menu = serenity::CreateSelectMenu::new(
        CHANNEL_SEND_PICK_ID,
        serenity::CreateSelectMenuKind::Channel {
            channel_types: Some(vec![serenity::ChannelType::Text]),
            default_channels: None,
        },
    )
    .placeholder(t("ticket_panel_select_channel_to_send"));
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(t("ticket_panel_select_channel_to_send"))
                .components(vec![serenity::CreateActionRow::SelectMenu(menu)]),
        )
        .await;
    let Some(chan_pick) = next_pick(msg, sctx, pick.user.id).await else {
        return Ok(false);
    };
    if chan_pick.data.custom_id != CHANNEL_SEND_PICK_ID {
        return Ok(false);
    }
    let target = match &chan_pick.data.kind {
        serenity::ComponentInteractionDataKind::ChannelSelect { values } => values.first().copied(),
        _ => None,
    };
    let Some(target) = target else {
        return Ok(false);
    };
    if target.to_channel(&sctx.http).await.is_err() {
        ephemeral(sctx, &chan_pick, t("ticket_panel_channel_error")).await;
        return Ok(false);
    }
    // Table-first with legacy kv fallback (keys unchanged).
    let related: Option<serde_json::Value> =
        embed_source_routed(pool, gid, &panel.related_embed_id).await;
    let Some(source) = related else {
        ephemeral(sctx, &chan_pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(false);
    };
    let Some(embed) = create_embed_from_value(&source) else {
        ephemeral(sctx, &chan_pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(false);
    };
    let options = v2_menu_options(panel)
        .into_iter()
        .map(|(label, value, desc, emoji)| {
            let mut b = serenity::CreateSelectMenuOption::new(label, value);
            if let Some(d) = desc {
                b = b.description(d);
            }
            if !emoji.trim().is_empty() {
                let rt = emoji
                    .parse::<serenity::ReactionType>()
                    .unwrap_or(serenity::ReactionType::Unicode(emoji));
                b = b.emoji(rt);
            }
            b
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        V2_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(panel.placeholder.clone());
    let guild_id = chan_pick.guild_id;
    let mut opener = serenity::CreateMessage::new()
        .embed(embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(menu)]);
    if let Some((filename, bytes)) =
        options_overflow_file(t, panel_code, &panel.config.option_fields, &|r| {
            cached_role_name(sctx, guild_id, r)
        })
    {
        opener = opener.add_file(serenity::CreateAttachment::bytes(bytes, filename));
    }
    let sent = target.send_message(&sctx.http, opener).await?;
    let (marker_key, marker_val) = marker_pair(sent.id.get(), panel_code);
    let _ =
        crate::commands::owner::main::routed_set(pool, gid, gid, &marker_key, &marker_val).await;
    let _ = chan_pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let done = t("ticket_panel_saved_and_sended_panel")
        .replace("${panelCode}", panel_code)
        .replace("${channel.toString()}", &format!("<#{target}>"));
    let _ = msg
        .edit(
            &sctx.http,
            serenity::EditMessage::new()
                .content(done)
                .components(vec![]),
        )
        .await;
    Ok(true)
}

/// Post a V2 opener message for a saved panel and record the
/// `GUILD.TICKET_PANEL.<sentMsgId>` marker. Mirrors sendEmbed
/// (!panel.ts:750): related-embed attach, select menu, marker write.
/// Classic embed + select menu on purpose: serenity 0.12 has no Container
/// / Components-V2 builders, and the posted opener TS builds is itself a
/// plain embed with a string-select row, so the save/preview/send flow
/// keeps that shape instead of the in-editor V2 chrome.
async fn post_ticket_panel_message(
    ctx: &Ctx<'_>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    panel_code: &str,
    panel: &TicketPanel,
) {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let mut embed: Option<serenity::CreateEmbed> = None;
    if !panel.related_embed_id.trim().is_empty() {
        // Table-first with legacy kv fallback (keys unchanged).
        let stored: Option<serde_json::Value> =
            embed_source_routed(pool, gid, &panel.related_embed_id).await;
        embed = stored.as_ref().and_then(create_embed_from_value);
    }
    let embed = embed.unwrap_or_else(|| {
        serenity::CreateEmbed::default()
            .title(panel.name.clone())
            .description(if panel.description.is_empty() {
                t("sethereticket_description_embed")
            } else {
                panel.description.clone()
            })
    });
    let options = v2_menu_options(panel)
        .into_iter()
        .map(|(label, value, desc, emoji)| {
            let mut builder = serenity::CreateSelectMenuOption::new(label, value);
            if let Some(d) = desc {
                builder = builder.description(d);
            }
            if !emoji.trim().is_empty() {
                let rt = emoji
                    .parse::<serenity::ReactionType>()
                    .unwrap_or(serenity::ReactionType::Unicode(emoji));
                builder = builder.emoji(rt);
            }
            builder
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        V2_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(if panel.placeholder.is_empty() {
        t("ticket_panel_default_placeholder")
    } else {
        panel.placeholder.clone()
    });
    // Mirrors buildPanelMessage (!panel.ts): the overflow .txt rides with
    // the posted opener when options exceed the field caps.
    let mut msg = serenity::CreateMessage::new()
        .embed(embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(menu)]);
    let sctx = ctx.serenity_context();
    if let Some((filename, bytes)) =
        options_overflow_file(&t, panel_code, &panel.config.option_fields, &|r| {
            cached_role_name(sctx, ctx.guild_id(), r)
        })
    {
        msg = msg.add_file(serenity::CreateAttachment::bytes(bytes, filename));
    }
    if let Ok(sent) = ctx.channel_id().send_message(&http, msg).await {
        let (marker_key, marker_val) = marker_pair(sent.id.get(), panel_code);
        let _ = crate::commands::owner::main::routed_set(pool, gid, gid, &marker_key, &marker_val)
            .await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panel_code_keeps_stored() {
        assert_eq!(assemble_panel_code(Some("ABC123")), "ABC123");
        assert_eq!(assemble_panel_code(Some("  X9  ")), "X9");
    }

    #[test]
    fn panel_code_mints_ts_shape() {
        for seed in [None, Some(""), Some("   ")] {
            let code = assemble_panel_code(seed);
            assert_eq!(code.len(), 10, "code: {code}");
            // TS charset: generatePassword defaults lowercase:true, so
            // codes are mixed-case alphanumerics (upper+lower+digits).
            assert!(code.chars().all(|c| c.is_ascii_alphanumeric()));
        }
        let a = assemble_panel_code(None);
        assert_eq!(a.len(), 10);
    }

    #[test]
    fn marker_pair_shape_matches_ts() {
        let (key, val) = marker_pair(123456789, "PANELCODE1");
        assert_eq!(key, "GUILD.TICKET_PANEL.123456789");
        let back: String = serde_json::from_str(&val).unwrap();
        assert_eq!(back, "PANELCODE1");
    }

    #[test]
    fn unique_values_fill_blanks_and_dupes() {
        let mut opts = vec![
            TicketOption {
                name: "a".into(),
                value: String::new(),
                ..Default::default()
            },
            TicketOption {
                name: "b".into(),
                value: "v".into(),
                ..Default::default()
            },
            TicketOption {
                name: "c".into(),
                value: "v".into(),
                ..Default::default()
            },
        ];
        assert!(ensure_unique_option_values(&mut opts));
        assert!(opts[0].value.starts_with("ticket_option_"));
        assert_eq!(opts[1].value, "v");
        assert!(opts[2].value.starts_with("ticket_option_"));
        assert_ne!(opts[0].value, opts[2].value);
        assert!(!ensure_unique_option_values(&mut opts));
    }

    #[test]
    fn menu_options_truncate_to_100() {
        let panel = TicketPanel {
            config: TicketPanelConfig {
                option_fields: vec![TicketOption {
                    name: "n".repeat(150),
                    desc: "d".repeat(150),
                    value: "vv".into(),
                    emoji: "🔥".into(),
                    ..Default::default()
                }],
                ..Default::default()
            },
            ..Default::default()
        };
        let mapped = v2_menu_options(&panel);
        assert_eq!(mapped.len(), 1);
        assert_eq!(mapped[0].0.chars().count(), 100);
        assert_eq!(mapped[0].2.as_ref().unwrap().chars().count(), 100);
        assert_eq!(mapped[0].1, "vv");
        let blank = TicketOption {
            name: "x".into(),
            value: "y".into(),
            ..Default::default()
        };
        let p2 = TicketPanel {
            config: TicketPanelConfig {
                option_fields: vec![blank],
                ..Default::default()
            },
            ..Default::default()
        };
        assert!(v2_menu_options(&p2)[0].2.is_none());
    }

    #[test]
    fn emoji_gate_matches_ts() {
        assert_eq!(sanitize_option_emoji("🔥"), "🔥");
        assert_eq!(sanitize_option_emoji("<:pepe:123>"), "<:pepe:123>");
        assert_eq!(sanitize_option_emoji("<a:wave:456>"), "<a:wave:456>");
        assert_eq!(sanitize_option_emoji("hello"), "");
        assert_eq!(sanitize_option_emoji(""), "");
        assert_eq!(sanitize_option_emoji("🔥🔥"), "");
    }

    #[test]
    fn summaries_cap_at_1024_with_overflow_key() {
        let big = TicketOption {
            name: "n".repeat(200),
            desc: "d".repeat(200),
            value: "v".into(),
            ..Default::default()
        };
        let opts: Vec<TicketOption> = (0..10).map(|_| big.clone()).collect();
        assert_eq!(summarize_options("OVERFLOW", &opts), "OVERFLOW");
        let small = vec![TicketOption {
            name: "Support".into(),
            value: "s".into(),
            ..Default::default()
        }];
        let s = summarize_options("OVERFLOW", &small);
        assert!(s.contains("Support"));
        assert!(summarize_options("OVERFLOW", &[]).is_empty());
        assert!(summarize_forms("OVERFLOW", &[]).is_empty());
    }

    #[test]
    fn ts_panel_row_parses() {
        let raw = r#"{"panelCode":"CODE1","relatedEmbedId":"99","placeholder":"pick","category":"77","config":{"rolesToPing":[],"optionFields":[],"pingUser":true,"form":[],"userSelectPanel":true,"deleteButton":true,"transcriptButton":true}}"#;
        let p: TicketPanel = serde_json::from_str(raw).unwrap();
        assert_eq!(p.panel_code, "CODE1");
        assert_eq!(p.related_embed_id, "99");
        assert_eq!(p.category_id, "77");
        assert_eq!(marker_value(&p.panel_code), "\"CODE1\"");
    }

    #[test]
    fn mint_option_value_is_unique() {
        let used = vec!["ticket_option_AAA".to_string()];
        let v = mint_option_value(&used);
        assert!(v.starts_with("ticket_option_"));
        assert!(!used.contains(&v));
    }

    fn overflow_t(key: &str) -> String {
        match key {
            "ticket_panel_add_option_modal_field2_label" => "Description".to_string(),
            "ticket_panel_add_option_modal_field3_label" => "Emoji".to_string(),
            "ticket_panel_change_embed_modal_placeholder" => "Embed ID".to_string(),
            "ticket_panel_role_to_ping" => "Role to ping".to_string(),
            "ticket_panel_option_fields" => "OVERFLOW".to_string(),
            "var_form" => "Form".to_string(),
            "var_unknown" => "Unknown".to_string(),
            "var_no_set" => "Not Set".to_string(),
            _ => key.to_string(),
        }
    }

    fn full_option() -> TicketOption {
        TicketOption {
            name: "Support".into(),
            desc: "help".into(),
            value: "s".into(),
            emoji: "🔥".into(),
            category_id: "77".into(),
            panel_id: "99".into(),
            roles_to_ping: vec!["123".into()],
            form: vec![TicketForm {
                question_id: 0,
                question_title: "Q1".into(),
                question_placeholder: "P1".into(),
            }],
        }
    }

    #[test]
    fn overflow_filename_matches_ts() {
        assert_eq!(
            options_overflow_filename("ABC123XYZ9"),
            "ticket-panel-ABC123XYZ9-options.txt"
        );
    }

    #[test]
    fn overflow_gate_tracks_field_cap() {
        let small = vec![TicketOption {
            name: "Support".into(),
            value: "s".into(),
            ..Default::default()
        }];
        assert!(!options_overflowed("OVERFLOW", &small));
        assert!(!options_overflowed("OVERFLOW", &[]));
        let big = TicketOption {
            name: "n".repeat(200),
            desc: "d".repeat(200),
            value: "v".into(),
            ..Default::default()
        };
        let opts: Vec<TicketOption> = (0..10).map(|_| big.clone()).collect();
        assert!(options_overflowed("OVERFLOW", &opts));
        assert_eq!(summarize_options("OVERFLOW", &opts), "OVERFLOW");
    }

    #[test]
    fn detailed_content_matches_ts_shape() {
        let opts = vec![full_option()];
        let content = detailed_options_content(&overflow_t, &opts, &|_| None);
        assert!(content.starts_with("- Support\n"));
        assert!(content.contains("  Description: help\n"));
        assert!(content.contains("  Emoji: 🔥\n"));
        assert!(content.contains("  Category: <#77>\n"));
        assert!(content.contains("  Embed ID: 99\n"));
        assert!(content.contains("  Role to ping:\n"));
        assert!(content.contains("    - 123 (@Unknown)\n"));
        assert!(content.contains("  Form:\n"));
        assert!(content.contains("    - Q1\n"));
        assert!(content.ends_with("      P1"));
        assert!(!content.contains("```"));
        assert!(!content.contains('┖'));
        assert!(!content.ends_with('\n'));
        let named = detailed_options_content(&overflow_t, &opts, &|_| Some("Mods".to_string()));
        assert!(named.contains("    - 123 (@Mods)\n"));
    }

    #[test]
    fn detailed_content_empty_and_multi() {
        assert_eq!(
            detailed_options_content(&overflow_t, &[], &|_| None),
            "Not Set"
        );
        let opts = vec![
            TicketOption {
                name: "A".into(),
                value: "a".into(),
                ..Default::default()
            },
            TicketOption {
                name: "B".into(),
                value: "b".into(),
                ..Default::default()
            },
        ];
        let content = detailed_options_content(&overflow_t, &opts, &|_| None);
        assert_eq!(content, "- A\n\n- B");
    }

    #[test]
    fn overflow_file_none_when_small_some_when_big() {
        let small = vec![TicketOption {
            name: "Support".into(),
            value: "s".into(),
            ..Default::default()
        }];
        assert!(options_overflow_file(&overflow_t, "CODE1", &small, &|_| None).is_none());
        let big = TicketOption {
            name: "n".repeat(200),
            desc: "d".repeat(200),
            value: "v".into(),
            ..Default::default()
        };
        let opts: Vec<TicketOption> = (0..10).map(|_| big.clone()).collect();
        let (name, bytes) =
            options_overflow_file(&overflow_t, "CODE1", &opts, &|_| None).expect("overflow file");
        assert_eq!(name, "ticket-panel-CODE1-options.txt");
        let text = String::from_utf8(bytes).unwrap();
        assert!(text.len() > 1024);
        assert!(text.contains("- nnn"));
        assert!(!text.contains("```"));
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn legacy_panel_row_reads_and_promotes_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            &panel_key("p1"),
            r#"{"name":"Support","description":"d"}"#,
        )
        .await
        .unwrap();
        let panel = load_panel_routed(&pool, "g", "p1").await;
        assert_eq!(panel.name, "Support");
        assert!(tbl_get_value(&pool, "g", &panel_key("p1")).await.is_some());
        assert_eq!(load_panel_routed(&pool, "g", "missing").await.name, "");
    }

    #[tokio::test]
    async fn save_panel_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        let panel = TicketPanel {
            name: "Support".to_string(),
            ..Default::default()
        };
        save_panel_routed(&pool, "g", "p1", &panel).await.unwrap();
        let raw = crate::db::kv_get(&pool, "g", &panel_key("p1"))
            .await
            .expect("legacy row");
        assert_eq!(
            serde_json::from_str::<TicketPanel>(&raw).unwrap().name,
            "Support"
        );
        assert!(tbl_get_value(&pool, "g", &panel_key("p1")).await.is_some());
        // Round-trip through the routed load.
        assert_eq!(load_panel_routed(&pool, "g", "p1").await.name, "Support");
    }

    #[tokio::test]
    async fn v2_marker_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::{routed_get, tbl_get_value};
        let pool = mem_pool().await;
        let (key, val) = marker_pair(424242, "PANELCODE1");
        crate::commands::owner::main::routed_set(&pool, "g", "g", &key, &val)
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", &key).await.as_deref(),
            Some(val.as_str())
        );
        assert!(tbl_get_value(&pool, "g", &key).await.is_some());
        // Functional parity: both stores decode to the same panel code
        // (kv keeps the quoted bytes, the table decodes once on write).
        assert_eq!(
            crate::commands::owner::main::decode_stored_string(
                &routed_get(&pool, "g", "g", &key).await.unwrap()
            ),
            "PANELCODE1"
        );
    }

    #[tokio::test]
    async fn embed_source_routed_legacy_fallback_and_table_wins() {
        // D5-TICKET panel.rs:972,1661,1780,1868 — every `EMBED.<id>`
        // read goes through `embed_source_routed` (table-first, legacy
        // kv fallback, keys unchanged).
        use crate::commands::owner::main::routed_set;
        let pool = mem_pool().await;
        assert!(!embed_exists(&pool, "g", "e9").await);
        let legacy = serde_json::json!({"embedSource": {"title": "legacy"}}).to_string();
        crate::db::kv_set(&pool, "g", "EMBED.e9", &legacy)
            .await
            .unwrap();
        assert!(embed_exists(&pool, "g", "e9").await);
        assert_eq!(
            super::embed_source_routed(&pool, "g", "e9").await,
            Some(serde_json::json!({"title": "legacy"}))
        );
        let table = serde_json::json!({"embedSource": {"title": "table"}}).to_string();
        routed_set(&pool, "g", "g", "EMBED.e9", &table)
            .await
            .unwrap();
        assert_eq!(
            super::embed_source_routed(&pool, "g", "e9").await,
            Some(serde_json::json!({"title": "table"}))
        );
        // Row without an embedSource leaf reads as missing.
        crate::db::kv_set(&pool, "g", "EMBED.e0", r#"{"other":1}"#)
            .await
            .unwrap();
        assert!(!embed_exists(&pool, "g", "e0").await);
    }
}
