use super::*;
use poise::serenity_prelude as serenity;

// Interactive nick-kicker panel. Mirrors util !nick-kicker.ts
// exactly: the TS subcommand takes NO options — it posts the status
// embed with a string select (customId `nick-kicker`: enable /
// disable / add / remove) and drives everything through a 15-minute
// collector. Add goes through the `nick-kicker-add` modal (`word`
// field, max 20); remove swaps to a `nick-kicker-remove` select
// whose values are `nick-kicker-remove-{word}`.
pub const NICK_KICKER_SELECT_ID: &str = "nick-kicker";
pub const NICK_KICKER_REMOVE_ID: &str = "nick-kicker-remove";
pub const NICK_KICKER_MODAL_ID: &str = "nick-kicker-add";
pub const NICK_KICKER_WORD_FIELD: &str = "word";
const PANEL_TIMEOUT_SECS: u64 = 60 * 15;

/// Nickname kicker config. Mirrors util !nick-kicker.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nick-kicker",
    aliases("nickkick", "nk"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Expulse un utilisateur si son surnom contient un mot spécifique"
    ),
    description_localized("ja", "ニックネームに特定の単語が含まれているユーザーをキック"),
    description_localized("ru", "Кикнуть пользователя, если его ник содержит определенное слово"),
    description_localized(
        "es-ES",
        "Expulsar a un usuario si su apodo contiene una palabra específica"
    )
)]
pub async fn nickkicker(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();

    // TS default when no row: `{ enabled: true, words: [] }`.
    let mut enabled = true;
    let mut words: Vec<String> = vec![];
    if let Some(raw) =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.NICK_KICKER").await
    {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            enabled = v.get("enabled").and_then(|b| b.as_bool()).unwrap_or(true);
            words = v
                .get("words")
                .and_then(|w| serde_json::from_value(w.clone()).ok())
                .unwrap_or_default();
        }
    }

    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(render_nick_embed(&t, enabled, &words))
                .components(vec![main_row(&t)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let http = ctx.http();
    let author = ctx.author().id;
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(PANEL_TIMEOUT_SECS);
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
        // TS ignores other users' presses without answering.
        if press.user.id != author {
            continue;
        }
        let values: Vec<String> = match &press.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => values.clone(),
            _ => continue,
        };
        let Some(value) = values.first().map(|s| s.as_str()) else {
            continue;
        };
        if value == "enable" {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            enabled = true;
            save_nick_config(pool, &gid, enabled, &words).await;
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .embeds(vec![render_nick_embed(&t, enabled, &words)]),
                )
                .await;
        } else if value == "disable" {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            enabled = false;
            save_nick_config(pool, &gid, enabled, &words).await;
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .embeds(vec![render_nick_embed(&t, enabled, &words)]),
                )
                .await;
        } else if value == "add" {
            add_word(&ctx, &press, &mut msg, &t, &mut words, enabled, pool, &gid).await;
        } else if value == "remove" {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            // TS: empty list edits the content to the no-word line.
            if words.is_empty() {
                let _ = msg
                    .edit(
                        http,
                        serenity::EditMessage::new()
                            .content(t("util_nick_kicker_no_word_to_remove")),
                    )
                    .await;
                continue;
            }
            // TS swaps the message to the remove picker (no embeds).
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content(t("util_nick_kicker_select_to_remove"))
                        .embeds(vec![])
                        .components(vec![remove_row(&t, &words)]),
                )
                .await;
        } else if let Some(word) = parse_remove_value(value) {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            words.retain(|w| w != &word);
            save_nick_config(pool, &gid, enabled, &words).await;
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content("")
                        .embeds(vec![render_nick_embed(&t, enabled, &words)])
                        .components(vec![main_row(&t)]),
                )
                .await;
        }
    }
    // Collector `end` leg (except the TS `"legit"` early return,
    // which has no trigger here): disable the select like TS.
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new().components(vec![main_row_disabled(&t)]),
        )
        .await;
    Ok(())
}

async fn save_nick_config(pool: &crate::db::Pool, gid: &str, enabled: bool, words: &[String]) {
    let value = serde_json::json!({ "enabled": enabled, "words": words });
    let _ = crate::commands::owner::main::routed_set(
        pool,
        gid,
        gid,
        "UTILS.NICK_KICKER",
        &serde_json::to_string(&value).unwrap_or_default(),
    )
    .await;
}

/// Mirrors the TS `AddWord` flow: 15-word cap reply, the
/// `nick-kicker-add` modal (`word`, Short, required, 1..=20), then
/// lowercase + truncate + push + persist + re-render.
#[allow(clippy::too_many_arguments)]
async fn add_word(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    msg: &mut serenity::Message,
    t: &impl Fn(&str) -> String,
    words: &mut Vec<String>,
    enabled: bool,
    pool: &crate::db::Pool,
    gid: &str,
) {
    let http = ctx.http();
    if words.len() >= NICK_KICKER_MAX_WORDS {
        let _ = press
            .create_response(
                http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("util_nick_kicker_words_max_15"))
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }
    let mut opts = crate::modal_helper::ModalOptions::new(
        &t("util_nick_kicker_add_word"),
        NICK_KICKER_MODAL_ID,
    );
    opts.defer_update = true;
    opts.fields = vec![crate::modal_helper::ModalField::Text(
        crate::modal_helper::TextField {
            custom_id: NICK_KICKER_WORD_FIELD.to_string(),
            label: t("util_nick_kicker_words"),
            placeholder: None,
            style: crate::modal_helper::TextStyle::Short,
            required: true,
            max_length: Some(NICK_KICKER_MAX_WORD_LEN as u16),
            min_length: Some(1),
            value: None,
        },
    )];
    let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
        return;
    };
    if press
        .create_response(http, serenity::CreateInteractionResponse::Modal(modal))
        .await
        .is_err()
    {
        return;
    }
    let Some(submit) =
        crate::commands::await_modal_submit(ctx.serenity_context(), press, NICK_KICKER_MODAL_ID)
            .await
    else {
        return;
    };
    let raw = modal_text(&submit, NICK_KICKER_WORD_FIELD);
    let fallback = t("var_none");
    let word = normalize_nick_word(if raw.is_empty() { &fallback } else { &raw });
    words.push(word);
    save_nick_config(pool, gid, enabled, words).await;
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new().embeds(vec![render_nick_embed(t, enabled, words)]),
        )
        .await;
}

/// First text value of a modal submit field.
fn modal_text(submit: &serenity::ModalInteraction, field_id: &str) -> String {
    for row in &submit.data.components {
        for comp in &row.components {
            if let serenity::ActionRowComponent::InputText(input) = comp {
                if input.custom_id == field_id {
                    return input.value.clone().unwrap_or_default();
                }
            }
        }
    }
    String::new()
}

/// Status embed: title + desc keys, enabled ✅/❌ + words ```…```
/// fields, both inline — like the TS panel.
fn render_nick_embed(
    t: &impl Fn(&str) -> String,
    enabled: bool,
    words: &[String],
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .title(t("util_nick_kicker_embed_title"))
        .description(t("util_nick_kicker_embed_desc"))
        .field(t("var_enabled"), if enabled { "✅" } else { "❌" }, true)
        .field(
            t("util_nick_kicker_words"),
            nick_words_field(words, &t("var_none")),
            true,
        )
}

/// The four main options, shared by the live and disabled rows.
fn main_options(t: &impl Fn(&str) -> String) -> Vec<serenity::CreateSelectMenuOption> {
    vec![
        serenity::CreateSelectMenuOption::new(t("rolesaver_embed_fields_1_name"), "enable")
            .description(t("util_nick_kicker_enable_desc"))
            .emoji('✅'),
        serenity::CreateSelectMenuOption::new(t("util_nick_kicker_disable"), "disable")
            .description(t("util_nick_kicker_disable_desc"))
            .emoji('❌'),
        serenity::CreateSelectMenuOption::new(t("util_nick_kicker_add_word"), "add")
            .description(t("util_nick_kicker_add_desc"))
            .emoji(serenity::ReactionType::Unicode("🔧".to_string())),
        serenity::CreateSelectMenuOption::new(t("util_nick_kicker_remove_word2"), "remove")
            .description(t("util_nick_kicker_remove_desc"))
            .emoji(serenity::ReactionType::Unicode("🔨".to_string())),
    ]
}

/// Main select row (customId `nick-kicker`, four options).
fn main_row(t: &impl Fn(&str) -> String) -> serenity::CreateActionRow {
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            NICK_KICKER_SELECT_ID,
            serenity::CreateSelectMenuKind::String {
                options: main_options(t),
            },
        )
        .placeholder(t("ticket_panel_change_option_select_placeholder")),
    )
}

fn main_row_disabled(t: &impl Fn(&str) -> String) -> serenity::CreateActionRow {
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            NICK_KICKER_SELECT_ID,
            serenity::CreateSelectMenuKind::String {
                options: main_options(t),
            },
        )
        .placeholder(t("ticket_panel_change_option_select_placeholder"))
        .disabled(true),
    )
}

/// Remove picker row: one `nick-kicker-remove-{word}` option per word.
fn remove_row(t: &dyn Fn(&str) -> String, words: &[String]) -> serenity::CreateActionRow {
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            NICK_KICKER_REMOVE_ID,
            serenity::CreateSelectMenuKind::String {
                options: words
                    .iter()
                    .map(|word| {
                        serenity::CreateSelectMenuOption::new(
                            word.clone(),
                            remove_option_value(word),
                        )
                        .description(t("util_nick_kicker_remove_word"))
                        .emoji(serenity::ReactionType::Unicode("🔨".to_string()))
                    })
                    .collect(),
            },
        )
        .placeholder(t("util_nick_kicker_select_to_remove")),
    )
}

/// Option value for a removable word. Mirrors
/// `"nick-kicker-remove-" + word`.
pub fn remove_option_value(word: &str) -> String {
    format!("nick-kicker-remove-{word}")
}

/// Parse a remove-picker value back to the word. Mirrors
/// `i.values[0].split("-")[3]`.
pub fn parse_remove_value(value: &str) -> Option<String> {
    let mut parts = value.split('-');
    parts.next()?;
    parts.next()?;
    parts.next()?;
    parts.next().map(|s| s.to_string())
}

/// Max words before `util_nick_kicker_words_max_15` (TS `>= 15`).
pub const NICK_KICKER_MAX_WORDS: usize = 15;
/// Max chars per word (modal `maxLength: 20`, TS `substring(0, 20)`).
pub const NICK_KICKER_MAX_WORD_LEN: usize = 20;

/// Normalize an added word. Mirrors the TS add flow:
/// `word.toLowerCase().substring(0, 20)`.
pub fn normalize_nick_word(raw: &str) -> String {
    raw.to_lowercase()
        .chars()
        .take(NICK_KICKER_MAX_WORD_LEN)
        .collect()
}

/// Render the words embed field (```-wrapped, `none` fallback).
pub fn nick_words_field(words: &[String], none: &str) -> String {
    format!(
        "```{}```",
        if words.is_empty() {
            none.to_string()
        } else {
            words.join(", ")
        }
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_lowercases_and_truncates() {
        assert_eq!(normalize_nick_word("  ABC "), "  abc ");
        assert_eq!(normalize_nick_word(&"x".repeat(25)), "x".repeat(20));
    }

    #[test]
    fn words_field_wraps() {
        assert_eq!(nick_words_field(&[], "None"), "```None```");
        assert_eq!(
            nick_words_field(&["a".to_string(), "b".to_string()], "None"),
            "```a, b```"
        );
    }

    #[test]
    fn cap_is_fifteen() {
        assert_eq!(NICK_KICKER_MAX_WORDS, 15);
    }

    #[test]
    fn panel_custom_ids_are_ts_byte_exact() {
        assert_eq!(NICK_KICKER_SELECT_ID, "nick-kicker");
        assert_eq!(NICK_KICKER_REMOVE_ID, "nick-kicker-remove");
        assert_eq!(NICK_KICKER_MODAL_ID, "nick-kicker-add");
        assert_eq!(NICK_KICKER_WORD_FIELD, "word");
    }

    #[test]
    fn remove_value_round_trip() {
        assert_eq!(remove_option_value("spam"), "nick-kicker-remove-spam");
        assert_eq!(
            parse_remove_value("nick-kicker-remove-spam").as_deref(),
            Some("spam")
        );
        // TS `split("-")[3]` on the main values yields undefined.
        assert_eq!(parse_remove_value("enable"), None);
        assert_eq!(parse_remove_value("remove"), None);
        assert_eq!(parse_remove_value("nick-kicker"), None);
    }
}
