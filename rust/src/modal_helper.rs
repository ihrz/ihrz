// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Shared modal builder/resolver. Mirrors src/core/functions/modalHelper.ts
// (iHorizonModalBuilder / iHorizonModalResolve: customId + title +
// deferUpdate + fields, submit await with timeout, duplicate-submit dedupe).
//
// Pure over serenity types: no Discord I/O, no YAML. Callers show the modal
// themselves, then await the submit (see crate::commands::await_modal_submit)
// and read values back with text_value.

use std::collections::HashSet;
use std::time::Duration;

/// Submit wait. Mirrors `time: 1_240_000` in iHorizonModalResolve.
pub const SUBMIT_TIMEOUT_SECS: u64 = 1240;

/// Title cap. Mirrors `setTitle(title.substring(0, 32))` in
/// iHorizonModalBuilder: 32 UTF-16 code units (node ground truth:
/// 20xU+1F600 -> 16 kept; a pair straddling unit 32 leaves a lone
/// high surrogate in TS, which Rust cannot represent and Discord
/// would reject as invalid JSON anyway — so we stop before
/// splitting, identical on every Discord-acceptable input).
pub const MAX_TITLE_CHARS: usize = 32;

/// Text length fallbacks. Mirror `maxLength || 20` / `minLength || 5`
/// (JS-falsy: an explicit 0 falls back, not just a missing value).
pub const DEFAULT_MAX_LENGTH: u16 = 20;
pub const DEFAULT_MIN_LENGTH: u16 = 5;

pub fn submit_timeout() -> Duration {
    Duration::from_secs(SUBMIT_TIMEOUT_SECS)
}

pub fn truncate_title(title: &str) -> String {
    let mut units = 0usize;
    let mut end = 0usize;
    for c in title.chars() {
        let w = c.len_utf16();
        if units + w > MAX_TITLE_CHARS {
            break;
        }
        units += w;
        end += c.len_utf8();
    }
    title[..end].to_string()
}

pub fn text_lengths(min: Option<u16>, max: Option<u16>) -> (u16, u16) {
    (
        min.filter(|v| *v != 0).unwrap_or(DEFAULT_MIN_LENGTH),
        max.filter(|v| *v != 0).unwrap_or(DEFAULT_MAX_LENGTH),
    )
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TextStyle {
    #[default]
    Short,
    Paragraph,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectOption {
    pub label: String,
    pub value: String,
    pub description: Option<String>,
    pub default: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextField {
    pub custom_id: String,
    pub label: String,
    pub placeholder: Option<String>,
    pub style: TextStyle,
    pub required: bool,
    pub max_length: Option<u16>,
    pub min_length: Option<u16>,
    pub value: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CheckboxField {
    pub custom_id: String,
    pub label: String,
    pub description: Option<String>,
    pub default: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GroupField {
    pub custom_id: String,
    pub label: String,
    pub description: Option<String>,
    pub required: Option<bool>,
    pub min_values: Option<u64>,
    pub max_values: Option<u64>,
    pub options: Vec<SelectOption>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextDisplayField {
    pub content: String,
}

/// Mirrors ModalFieldOptions. The `type` discriminator defaults to "text"
/// in TS; use ModalField::Text for that case.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModalField {
    Text(TextField),
    Checkbox(CheckboxField),
    CheckboxGroup(GroupField),
    RadioGroup(GroupField),
    TextDisplay(TextDisplayField),
}

pub fn field_kind(field: &ModalField) -> &'static str {
    match field {
        ModalField::Text(_) => "text",
        ModalField::Checkbox(_) => "checkbox",
        ModalField::CheckboxGroup(_) => "checkbox_group",
        ModalField::RadioGroup(_) => "radio_group",
        ModalField::TextDisplay(_) => "text_display",
    }
}

/// Mirrors ModalOptionsBuilder. `defer_update` defaults to true in TS
/// (destructured `deferUpdate = true`); callers ack the submit when set.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModalOptions {
    pub title: String,
    pub custom_id: String,
    pub defer_update: bool,
    pub fields: Vec<ModalField>,
}

impl ModalOptions {
    pub fn new(title: &str, custom_id: &str) -> Self {
        Self {
            title: title.to_string(),
            custom_id: custom_id.to_string(),
            defer_update: true,
            fields: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModalBuildError {
    /// Components-V2 modal parts (label/checkbox-group/radio/text-display)
    /// have no serenity 0.12 builder; the inner value is the TS field kind.
    UnsupportedFieldKind(&'static str),
}

/// Build a serenity modal from shared options. Mirrors iHorizonModalBuilder.
/// Only text fields are expressible in serenity 0.12 (InputText rows);
/// any other field kind returns UnsupportedFieldKind instead of silently
/// dropping user-visible content.
pub fn build_modal(
    opts: &ModalOptions,
) -> Result<poise::serenity_prelude::CreateModal, ModalBuildError> {
    use poise::serenity_prelude as serenity;

    let mut rows = Vec::with_capacity(opts.fields.len());
    for field in &opts.fields {
        match field {
            ModalField::Text(o) => {
                let (min, max) = text_lengths(o.min_length, o.max_length);
                let style = match o.style {
                    TextStyle::Short => serenity::InputTextStyle::Short,
                    TextStyle::Paragraph => serenity::InputTextStyle::Paragraph,
                };
                let mut input =
                    serenity::CreateInputText::new(style, o.label.clone(), o.custom_id.clone())
                        .required(o.required)
                        .min_length(min)
                        .max_length(max);
                // Mirrors `if (o.placeHolder)` / `if (o.value)`: an
                // explicit "" is falsy in TS and never reaches the
                // builder, so empty stays unset here too.
                if let Some(ph) = &o.placeholder {
                    if !ph.is_empty() {
                        input = input.placeholder(ph.clone());
                    }
                }
                if let Some(v) = &o.value {
                    if !v.is_empty() {
                        input = input.value(v.clone());
                    }
                }
                rows.push(serenity::CreateActionRow::InputText(input));
            }
            other => return Err(ModalBuildError::UnsupportedFieldKind(field_kind(other))),
        }
    }

    Ok(
        serenity::CreateModal::new(opts.custom_id.clone(), truncate_title(&opts.title))
            .components(rows),
    )
}

/// Pure submit filter. Mirrors the awaitModalSubmit filter
/// (`customId` match + author match).
pub fn matches_submit_ids(
    expected_custom_id: &str,
    expected_user_id: u64,
    actual_custom_id: &str,
    actual_user_id: u64,
) -> bool {
    actual_custom_id == expected_custom_id && actual_user_id == expected_user_id
}

/// Typed wrapper over a ModalInteraction submit.
pub fn is_expected_submit(
    opts: &ModalOptions,
    expected_user_id: u64,
    submit: &poise::serenity_prelude::ModalInteraction,
) -> bool {
    matches_submit_ids(
        &opts.custom_id,
        expected_user_id,
        &submit.data.custom_id,
        submit.user.id.get(),
    )
}

/// Duplicate-submit dedupe. Mirrors the `cache` array in
/// iHorizonModalResolve (second submit with the same interaction id
/// resolves to undefined). Returns true when the id is fresh (stored),
/// false on duplicates.
#[derive(Debug, Default)]
pub struct SubmitDedupe {
    seen: HashSet<u64>,
}

impl SubmitDedupe {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert_fresh(&mut self, interaction_id: u64) -> bool {
        self.seen.insert(interaction_id)
    }
}

/// Read a text-input value back from a submit. Mirrors the inlined
/// `submit.data.components` loops at the existing call sites.
pub fn text_value(submit: &poise::serenity_prelude::ModalInteraction, custom_id: &str) -> String {
    use poise::serenity_prelude::ActionRowComponent;
    for row in &submit.data.components {
        for comp in &row.components {
            if let ActionRowComponent::InputText(input) = comp {
                if input.custom_id == custom_id {
                    return input.value.clone().unwrap_or_default();
                }
            }
        }
    }
    String::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text_field(custom_id: &str) -> ModalField {
        ModalField::Text(TextField {
            custom_id: custom_id.to_string(),
            label: "Name".to_string(),
            placeholder: Some(" quests ".to_string()),
            style: TextStyle::Short,
            required: true,
            max_length: None,
            min_length: None,
            value: None,
        })
    }

    #[test]
    fn title_truncated_to_32_chars() {
        assert_eq!(truncate_title(&"a".repeat(40)).chars().count(), 32);
        assert_eq!(truncate_title("short"), "short");
    }

    #[test]
    fn title_truncates_utf16_units_like_ts_substring() {
        // 20 astral chars = 40 UTF-16 units -> 16 kept (node:
        // units=32, chars=16).
        let emoji20 = "😀".repeat(20);
        let got = truncate_title(&emoji20);
        assert_eq!(got.encode_utf16().count(), 32);
        assert_eq!(got.chars().count(), 16);
        // 16 astral + 10 ASCII: the 32-unit budget is exactly full,
        // so no ASCII survives (node: hasX=false).
        let exact = "😀".repeat(16) + &"X".repeat(10);
        let got = truncate_title(&exact);
        assert_eq!(got, "😀".repeat(16));
        // Pair straddling unit 32: TS keeps a lone high surrogate
        // (unsendable); we stop before splitting instead.
        let split = "a".repeat(31) + "😀";
        assert_eq!(truncate_title(&split), "a".repeat(31));
    }

    #[test]
    fn text_length_defaults_match_ts() {
        assert_eq!(text_lengths(None, None), (5, 20));
        assert_eq!(text_lengths(Some(2), Some(150)), (2, 150));
        // JS-falsy legs: explicit 0 falls back (node: 0->20, 0->5).
        assert_eq!(text_lengths(Some(0), Some(0)), (5, 20));
        assert_eq!(text_lengths(Some(0), None), (5, 20));
        assert_eq!(text_lengths(None, Some(0)), (5, 20));
    }

    #[test]
    fn empty_placeholder_and_value_stay_unset_like_ts() {
        let mut field = text_field("e");
        if let ModalField::Text(t) = &mut field {
            t.placeholder = Some(String::new());
            t.value = Some(String::new());
        }
        let mut opts = ModalOptions::new("T", "m");
        opts.fields.push(field);
        let modal = build_modal(&opts).expect("text modal builds");
        let v = serde_json::to_value(&modal).expect("CreateModal serializes");
        let row = &v["components"][0]["components"][0];
        assert!(row.get("placeholder").is_none(), "empty placeholder unset");
        assert!(row.get("value").is_none(), "empty value unset");
    }

    #[test]
    fn build_text_modal_serializes_ts_shape() {
        let mut opts = ModalOptions::new(&"t".repeat(50), "my-modal");
        opts.fields.push(text_field("value"));
        let modal = build_modal(&opts).expect("text modal builds");
        let v = serde_json::to_value(&modal).expect("CreateModal serializes");
        assert_eq!(v["custom_id"], "my-modal");
        assert_eq!(v["title"].as_str().unwrap().chars().count(), 32);
        let row = &v["components"][0]["components"][0];
        assert_eq!(row["custom_id"], "value");
        assert_eq!(row["max_length"], 20);
        assert_eq!(row["min_length"], 5);
    }

    #[test]
    fn build_rejects_v2_only_kinds() {
        for field in [
            ModalField::Checkbox(CheckboxField {
                custom_id: "c".into(),
                label: "L".into(),
                description: None,
                default: Some(true),
            }),
            ModalField::CheckboxGroup(GroupField {
                custom_id: "cg".into(),
                label: "L".into(),
                description: None,
                required: None,
                min_values: None,
                max_values: None,
                options: vec![],
            }),
            ModalField::RadioGroup(GroupField {
                custom_id: "rg".into(),
                label: "L".into(),
                description: None,
                required: None,
                min_values: None,
                max_values: None,
                options: vec![],
            }),
            ModalField::TextDisplay(TextDisplayField {
                content: "hi".into(),
            }),
        ] {
            let mut opts = ModalOptions::new("T", "m");
            opts.fields.push(field.clone());
            match build_modal(&opts) {
                Err(ModalBuildError::UnsupportedFieldKind(kind)) => {
                    assert_eq!(kind, field_kind(&field))
                }
                Ok(_) => panic!("V2-only field must not build"),
            }
        }
    }

    #[test]
    fn submit_filter_matches_custom_id_and_author() {
        assert!(matches_submit_ids("m", 1, "m", 1));
        assert!(!matches_submit_ids("m", 1, "other", 1));
        assert!(!matches_submit_ids("m", 1, "m", 2));
    }

    #[test]
    fn dedupe_rejects_second_submit() {
        let mut d = SubmitDedupe::new();
        assert!(d.insert_fresh(42));
        assert!(!d.insert_fresh(42));
        assert!(d.insert_fresh(43));
    }

    #[test]
    fn timeout_matches_ts_1240s() {
        assert_eq!(submit_timeout(), Duration::from_secs(1240));
    }

    #[test]
    fn defer_update_defaults_true() {
        assert!(ModalOptions::new("T", "m").defer_update);
    }
}
