// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Prefix arg UX. Mirrors src/core/functions/method.ts (checkCommandArgs
// required-count, longString tail merge, attachment-required gate, the
// caret usage-error embed) + the arg split in
// src/Events/interaction/messageCommandHandler.ts.
//
// Pure string policy only: no Discord I/O, no DB. Callers fetch the
// `hybridcommands_args_error_embed_desc` template via crate::lang::get
// (same TS key) and pass it to usage_error_description. Most type-shape
// validation (user/role/number) stays with poise's typed params: parse
// failures surface as ArgumentParse, already routed to the caret embed
// by the error router. The two validations poise drops on the prefix
// path are pinned here instead: choices membership (String params carry
// no parse-time choice check) and the channel-type allowlist (poise
// documents `channel_types` as slash-only, prefix unaffected) — both
// mirroring isValidArgument, both denying via PrefixArgsError so the
// existing caret embed renders them.

use poise::serenity_prelude as serenity;

/// One command option. Mirrors ArgumentBrief in method.ts: text options
/// go to expectedArgs, attachment options to the separate attachmentArgs
/// vec (displayed after the text options in the usage line).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ArgSpec {
    /// Option name (used to locate the attachment in original order).
    pub name: String,
    /// Display type: string/user/roles/number/channel/attachment, or
    /// the choices joined with "/" (getArgumentOptionTypeWithOptions).
    pub type_label: String,
    pub required: bool,
    /// True for attachment options (validated against message
    /// attachments, never counted as text args).
    pub attachment: bool,
    /// True for string options without choices (type 3 && !choices):
    /// the last one absorbs the whole tail (longString).
    pub long_string: bool,
    /// Allowed Discord channel kinds for `type_label == "channel"`.
    /// Mirrors ArgumentBrief.channelType (option.channel_types); None
    /// means no allowlist (TS `!optArgs`), so any resolved channel
    /// passes. Poise leaves this slash-only, hence the prefix gate.
    pub channel_types: Option<Vec<serenity::ChannelType>>,
}

impl ArgSpec {
    pub fn text(name: &str, type_label: &str, required: bool, long_string: bool) -> Self {
        Self {
            name: name.to_string(),
            type_label: type_label.to_string(),
            required,
            attachment: false,
            long_string,
            channel_types: None,
        }
    }

    pub fn attachment(name: &str, required: bool) -> Self {
        Self {
            name: name.to_string(),
            type_label: "attachment".to_string(),
            required,
            attachment: true,
            long_string: false,
            channel_types: None,
        }
    }

    /// Attach the channel-type allowlist (poise `CommandParameter::
    /// channel_types`). Builder so existing `text()` call sites stay
    /// untouched when no allowlist applies.
    pub fn with_channel_types(mut self, allowed: Option<Vec<serenity::ChannelType>>) -> Self {
        self.channel_types = allowed;
        self
    }
}

/// Denied prefix invocation. option_index is the TS sendErrorMessage
/// errorIndex (missing text arg: args length; attachment: the option's
/// index in the original options order); display_index positions the
/// caret inside the rendered usage line.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PrefixArgsError {
    pub option_index: usize,
    pub display_index: usize,
}

/// Split post-prefix content into args. Mirrors
/// `content.slice(prefix.length).trim().split(/ +/g)`: ONLY ASCII-space
/// runs separate args — interior TAB/LF/CR/VT/FF/NBSP/FEFF stay glued
/// inside a single arg (node ground truth: `"a\tb"` -> `["a\tb"]`,
/// while `split_whitespace` wrongly gave `["a", "b"]`). Edges trim with
/// the JS set (`js_trim`), and empty input yields a single empty arg so
/// the `(len == 1 && args[0] == "")` missing check below still fires.
pub fn split_args(rest: &str) -> Vec<String> {
    let words: Vec<String> = crate::funcs::js_trim(rest)
        .split(' ')
        .filter(|w| !w.is_empty())
        .map(str::to_string)
        .collect();
    if words.is_empty() {
        return vec![String::new()];
    }
    words
}

/// Required text-arg minimum. Mirrors
/// `expectedArgs.filter((arg) => arg.required).length`: attachment
/// options never count toward the minimum.
pub fn required_text_count(specs: &[ArgSpec]) -> usize {
    specs.iter().filter(|s| !s.attachment && s.required).count()
}

/// True when the invocation is missing required text args. Mirrors the
/// `args.length < minArgsCount || (len == 1 && args[0] == "")` guard.
pub fn is_missing_text_args(args: &[String], specs: &[ArgSpec]) -> bool {
    args.len() < required_text_count(specs) || (args.len() == 1 && args[0].is_empty())
}

/// Display order of the usage line. Mirrors
/// `[...expectedArgs, ...attachmentArgs]`: text options first, then
/// attachments. Returns indices into the original specs order.
pub fn display_order(specs: &[ArgSpec]) -> Vec<usize> {
    let text = specs
        .iter()
        .enumerate()
        .filter(|(_, s)| !s.attachment)
        .map(|(i, _)| i);
    let attachments = specs
        .iter()
        .enumerate()
        .filter(|(_, s)| s.attachment)
        .map(|(i, _)| i);
    text.chain(attachments).collect()
}

/// Merge the tail into the last text arg when it is a longString.
/// Mirrors `args[last] = args.slice(last).join(" "); args.splice(last+1)`
/// (in place; no-op when the last text arg is short or no tail exists).
pub fn merge_long_tail(args: &mut Vec<String>, specs: &[ArgSpec]) {
    let text_len = specs.iter().filter(|s| !s.attachment).count();
    if text_len == 0 {
        return;
    }
    let last_text = specs.iter().rfind(|s| !s.attachment).expect("text_len > 0");
    if !last_text.long_string {
        return;
    }
    let last_idx = text_len - 1;
    if args.len() > last_idx {
        let merged = args[last_idx..].join(" ");
        args.truncate(last_idx);
        args.push(merged);
    }
}

/// Required attachment with no message attachments. Mirrors the
/// attachmentArgs loop (`!message.attachments || size === 0`).
/// Returns the option's index in the original options order.
pub fn missing_attachment_option(specs: &[ArgSpec], has_attachments: bool) -> Option<usize> {
    if has_attachments {
        return None;
    }
    specs.iter().position(|s| s.attachment && s.required)
}

/// Choices membership. Mirrors the isValidArgument `type.includes("/")`
/// leg (`type.split("/").includes(arg)`): a slash-joined label (built
/// by getArgumentOptionTypeWithOptions) only accepts exact members.
/// Non-choice labels pass here; their shape stays with poise's parse.
pub fn is_valid_choice(type_label: &str, value: &str) -> bool {
    if type_label.contains('/') {
        type_label.split('/').any(|c| c == value)
    } else {
        true
    }
}

/// Split raw prefix rest for the usage-caret path. Mirrors
/// messageCommandHandler (the command name is shifted off, so a bare
/// invocation reaches checkCommandArgs as [], missingIndex 0):
/// split_args manufactures [""] for the missing-args DETECTION guard
/// only — the caret index must see [] so it flags 0 like prod (bare
/// `+dm` flags `[yes/no]`, not `[user]`). Pure for unit tests.
pub fn split_caret_args(rest: &str) -> Vec<String> {
    let args = split_args(rest);
    if args.len() == 1 && args[0].is_empty() {
        vec![]
    } else {
        args
    }
}

/// Channel-type allowlist. Mirrors the isValidArgument channel leg
/// (`!optArgs || optArgs.includes(channel.type)`): no allowlist passes;
/// otherwise the resolved kind must be listed.
pub fn is_allowed_channel_type(
    allowed: Option<&[serenity::ChannelType]>,
    actual: serenity::ChannelType,
) -> bool {
    allowed.map(|list| list.contains(&actual)).unwrap_or(true)
}

/// Full prefix validation in TS order: required-count, longString tail
/// merge (mutates args), per-arg required presence + choices membership
/// + channel-type allowlist, attachment gate.
///
/// `channel_kind_of` resolves a raw channel arg (mention/id) to its Discord kind via the
/// caller (guild cache); unresolvable input (plain names) defers to
/// poise's typed parse, whose ArgumentParse failure routes to the same
/// caret embed. Ok holds the merged tail; Err carries the caret
/// position.
pub fn check_prefix_args(
    args: &mut Vec<String>,
    specs: &[ArgSpec],
    has_attachments: bool,
    channel_kind_of: &dyn Fn(&str) -> Option<serenity::ChannelType>,
) -> Result<(), PrefixArgsError> {
    if is_missing_text_args(args, specs) {
        return Err(PrefixArgsError {
            option_index: args.len(),
            display_index: args.len(),
        });
    }
    merge_long_tail(args, specs);
    let text: Vec<(usize, &ArgSpec)> = specs
        .iter()
        .enumerate()
        .filter(|(_, s)| !s.attachment)
        .collect();
    for (pos, (orig_idx, spec)) in text.iter().enumerate() {
        if pos >= args.len() && !spec.required {
            continue;
        }
        if pos >= args.len() && spec.required {
            return Err(PrefixArgsError {
                option_index: *orig_idx,
                display_index: display_position(specs, *orig_idx),
            });
        }
        let value = &args[pos];
        if !is_valid_choice(&spec.type_label, value) {
            return Err(PrefixArgsError {
                option_index: *orig_idx,
                display_index: display_position(specs, *orig_idx),
            });
        }
        if spec.type_label == "channel" {
            if let Some(kind) = channel_kind_of(value) {
                if !is_allowed_channel_type(spec.channel_types.as_deref(), kind) {
                    return Err(PrefixArgsError {
                        option_index: *orig_idx,
                        display_index: display_position(specs, *orig_idx),
                    });
                }
            }
        }
    }
    if let Some(orig_idx) = missing_attachment_option(specs, has_attachments) {
        // TS passes the raw original-options index (`command.options?
        // .findIndex(opt => opt.name === ...)`) against the REORDERED
        // render array `[...expectedArgs, ...attachmentArgs]`, so an
        // attachment declared before a text option mispoints the caret
        // (node ground truth, fun captions `[image, query]`: errorIndex 0
        // puts `^` under `[string]`, wrongArgumentName "string"). No
        // remap here: exactness over helpfulness.
        return Err(PrefixArgsError {
            option_index: orig_idx,
            display_index: orig_idx,
        });
    }
    Ok(())
}

/// Position of an original-order option inside the usage line.
/// Text-error paths only: a text option at text-order `i` renders at
/// combined index `i` (`[text..., attach...]`), so the remap is the
/// identity on reachable inputs. Attachment errors use the raw index
/// (TS quirk, see above), never this helper.
fn display_position(specs: &[ArgSpec], orig_idx: usize) -> usize {
    display_order(specs)
        .iter()
        .position(|&i| i == orig_idx)
        .unwrap_or(orig_idx)
}

/// Usage tokens. Mirrors sendErrorMessage: required `[type]`,
/// optional `<type>`. The missing-count path renders text options only;
/// every other error renders text + attachments, TEXT FIRST (TS
/// `[...expectedArgs, ...attachmentArgs]` — original relative order
/// inside each group, so fun captions `[image, query]` renders
/// `[string] [attachment]`).
pub fn usage_tokens(specs: &[ArgSpec], text_only: bool) -> Vec<String> {
    display_order(specs)
        .iter()
        .map(|&i| &specs[i])
        .filter(|s| !text_only || !s.attachment)
        .map(|s| {
            if s.required {
                format!("[{}]", s.type_label)
            } else {
                format!("<{}>", s.type_label)
            }
        })
        .collect()
}

/// Render the caret usage-error description. Reuses the
/// `hybridcommands_args_error_embed_desc` template verbatim (caller
/// fetches it via lang::get); only the placeholder values are filled.
/// errorPosition mirrors TS exactly: padding of
/// `botPrefix.length + fullName.length`, then ` ^` under the wrong
/// token and blank space of `token.length + 1` elsewhere.
pub fn usage_error_description(
    template: &str,
    bot_prefix: &str,
    command_display: &str,
    specs: &[ArgSpec],
    text_only: bool,
    error_display_index: usize,
) -> String {
    let tokens = usage_tokens(specs, text_only);
    let args_string = tokens.join(" ");
    // JS `String.length` widths (UTF-16 units): astral chars count 2, and
    // `" ".padStart(n)` keeps width `max(1, n)`, never empty.
    let pad: String = " ".repeat(
        (crate::funcs::utf16_len(bot_prefix) + crate::funcs::utf16_len(command_display)).max(1),
    );
    let mut error_position = pad;
    let mut wrong_name = String::new();
    for (i, token) in tokens.iter().enumerate() {
        if i == error_display_index {
            wrong_name = token
                .strip_prefix(['[', '<'])
                .and_then(|t| t.strip_suffix([']', '>']))
                .unwrap_or(token)
                .to_string();
            error_position.push_str(" ^");
        } else {
            error_position.push_str(&" ".repeat(crate::funcs::utf16_len(token) + 1));
        }
    }
    template
        .replace("${currentCommand.name}", command_display)
        .replace("${botPrefix}", bot_prefix)
        .replace("${fullNameCommand}", command_display)
        .replace("${argsString}", &args_string)
        .replace("${errorPosition}", &error_position)
        .replace("${wrongArgumentName}", &wrong_name)
}

/// TS-exact usage token for a choice param whose TS `value`s differ
/// from the slash display names. Poise 0.6 erases values (only `name`
/// survives in the registry), but `getArgumentOptionTypeWithOptions`
/// (method.ts:294-299) renders choice VALUES, and `required` mirrors
/// the TS decl — not the poise Option-ness. Returns
/// `(type_label, required)`; `None` keeps the generic rendering.
pub fn choice_token_override(qualified: &str, param: &str) -> Option<(&'static str, bool)> {
    match (qualified, param) {
        // backup.ts create/save-message: values `yes`/`no` (names
        // `Yes`/`No`), required:true -> prod `[yes/no]`.
        ("backup create", "save-message") => Some(("yes/no", true)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text_specs() -> Vec<ArgSpec> {
        vec![
            ArgSpec::text("user", "user", true, false),
            ArgSpec::text("reason", "string", false, true),
        ]
    }

    #[test]
    fn split_collapses_whitespace_and_keeps_empty() {
        assert_eq!(
            split_args("  ban   @u   spamming  "),
            vec!["ban", "@u", "spamming"]
        );
        assert_eq!(split_args(""), vec![""]);
        assert_eq!(split_args("   "), vec![""]);
        // Node ground truth for `trim().split(/ +/g)`: only ASCII-space
        // runs separate — interior TAB/LF/CR/VT/FF/NBSP/FEFF stay glued.
        assert_eq!(split_args("a\tb"), vec!["a\tb"]);
        assert_eq!(split_args("a\nb"), vec!["a\nb"]);
        assert_eq!(split_args("a\rb"), vec!["a\rb"]);
        assert_eq!(split_args("a\u{b}b"), vec!["a\u{b}b"]);
        assert_eq!(split_args("a\u{c}b"), vec!["a\u{c}b"]);
        assert_eq!(split_args("a b"), vec!["a b"]);
        assert_eq!(split_args("a﻿b"), vec!["a﻿b"]);
        assert_eq!(split_args("\tban\tx\t"), vec!["ban\tx"]);
        assert_eq!(split_args("﻿ban﻿"), vec!["ban"]);
    }

    #[test]
    fn required_count_ignores_attachments() {
        let specs = vec![
            ArgSpec::text("user", "user", true, false),
            ArgSpec::attachment("proof", true),
            ArgSpec::text("note", "string", false, true),
        ];
        assert_eq!(required_text_count(&specs), 1);
        assert_eq!(required_text_count(&[]), 0);
    }

    #[test]
    fn missing_count_guard() {
        let specs = text_specs();
        assert!(is_missing_text_args(&[], &specs));
        assert!(is_missing_text_args(&[String::new()], &specs));
        assert!(!is_missing_text_args(&["@u".to_string()], &specs));
        // Zero required: only the single-empty-arg case fails.
        let none: Vec<ArgSpec> = vec![ArgSpec::text("q", "string", false, true)];
        assert!(is_missing_text_args(&[String::new()], &none));
        assert!(!is_missing_text_args(&[], &none));
    }

    #[test]
    fn long_tail_merge() {
        let specs = text_specs();
        let mut args = vec!["@u".to_string(), "was".to_string(), "spamming".to_string()];
        merge_long_tail(&mut args, &specs);
        assert_eq!(args, vec!["@u", "was spamming"]);
        // No tail: untouched.
        let mut single = vec!["@u".to_string()];
        merge_long_tail(&mut single, &specs);
        assert_eq!(single, vec!["@u"]);
        // Last text arg not long: untouched.
        let short = vec![ArgSpec::text("a", "number", true, false)];
        let mut args = vec!["1".to_string(), "2".to_string()];
        merge_long_tail(&mut args, &short);
        assert_eq!(args, vec!["1", "2"]);
        // Node ground truth (method.ts 516-522 verbatim:
        // `args[last] = args.slice(last).join(" "); args.splice(last+1)`):
        // empty tail elements survive the join.
        let mut args = vec!["@u".to_string(), "".to_string(), "x".to_string()];
        merge_long_tail(&mut args, &specs);
        assert_eq!(args, vec!["@u", " x"]);
        // Single-element tail: join-of-one + empty splice is a no-op.
        let mut args = vec!["@u".to_string(), "solo".to_string()];
        merge_long_tail(&mut args, &specs);
        assert_eq!(args, vec!["@u", "solo"]);
        // Empty args: `0 > last` misses, untouched.
        let mut args: Vec<String> = vec![];
        merge_long_tail(&mut args, &specs);
        assert!(args.is_empty());
        // Interior empties keep their separators; all-empty tail -> " ".
        let mut args = vec![
            "@u".to_string(),
            "a".to_string(),
            "".to_string(),
            "b".to_string(),
        ];
        merge_long_tail(&mut args, &specs);
        assert_eq!(args, vec!["@u", "a  b"]);
        let mut args = vec!["@u".to_string(), "".to_string(), "".to_string()];
        merge_long_tail(&mut args, &specs);
        assert_eq!(args, vec!["@u", " "]);
        // Single long spec absorbs the whole tail from index 0.
        let single = vec![ArgSpec::text("q", "string", false, true)];
        let mut args = vec!["1".to_string(), "2".to_string()];
        merge_long_tail(&mut args, &single);
        assert_eq!(args, vec!["1 2"]);
        // Attachment specs don't shift the text index (TS counts
        // expectedArgs only; attachments live in a separate array).
        let mixed = vec![
            ArgSpec::text("user", "user", true, false),
            ArgSpec::attachment("proof", false),
            ArgSpec::text("note", "string", false, true),
        ];
        let mut args = vec!["@u".to_string(), "my".to_string(), "note".to_string()];
        merge_long_tail(&mut args, &mixed);
        assert_eq!(args, vec!["@u", "my note"]);
    }

    #[test]
    fn attachment_first_caret_matches_ts_quirk() {
        // fun captions declares `[image(attachment), query(string)]`:
        // TS findIndex(image) = 0 against the rendered `[query, image]`
        // line, so the caret lands under `[string]` (node ground truth:
        // argsString "[string] [attachment]", wrong "string"). Rust now
        // passes the raw index too — no remap.
        let specs = vec![
            ArgSpec::attachment("image", true),
            ArgSpec::text("query", "string", true, true),
        ];
        let no_channel = &|_: &str| None;
        let mut args = vec!["some text".to_string()];
        let err = check_prefix_args(&mut args, &specs, false, no_channel).unwrap_err();
        assert_eq!(err.option_index, 0);
        assert_eq!(err.display_index, 0);
        let template =
            crate::lang::get("en-US", "hybridcommands_args_error_embed_desc").unwrap_or_default();
        let desc = usage_error_description(
            &template,
            "!",
            "fun captions",
            &specs,
            false,
            err.display_index,
        );
        assert!(desc.contains("[string] [attachment]"));
        assert!(desc.contains("Error when sending \"string\" argument."));
        // Attachment-last layout agrees under both indexings.
        let last = vec![
            ArgSpec::text("user", "user", true, false),
            ArgSpec::attachment("proof", true),
        ];
        let mut args = vec!["@u".to_string()];
        let err = check_prefix_args(&mut args, &last, false, no_channel).unwrap_err();
        assert_eq!((err.option_index, err.display_index), (1, 1));
    }

    #[test]
    fn attachment_gate_uses_original_index() {
        let specs = vec![
            ArgSpec::text("user", "user", true, false),
            ArgSpec::attachment("proof", true),
        ];
        assert_eq!(missing_attachment_option(&specs, false), Some(1));
        assert_eq!(missing_attachment_option(&specs, true), None);
        let optional = vec![ArgSpec::attachment("proof", false)];
        assert_eq!(missing_attachment_option(&optional, false), None);
    }

    #[test]
    fn check_flows_in_ts_order() {
        let specs = text_specs();
        let no_channel = &|_: &str| None;
        // Missing required text arg.
        let mut args: Vec<String> = vec![];
        let err = check_prefix_args(&mut args, &specs, true, no_channel).unwrap_err();
        assert_eq!(err.display_index, 0);
        // Tail merges on success.
        let mut args = vec!["@u".to_string(), "a".to_string(), "b".to_string()];
        assert!(check_prefix_args(&mut args, &specs, true, no_channel).is_ok());
        assert_eq!(args, vec!["@u", "a b"]);
        // Required attachment without upload denies.
        let with_att = vec![
            ArgSpec::text("user", "user", true, false),
            ArgSpec::attachment("proof", true),
        ];
        let mut args = vec!["@u".to_string()];
        let err = check_prefix_args(&mut args, &with_att, false, no_channel).unwrap_err();
        assert_eq!(err.option_index, 1);
        assert_eq!(err.display_index, 1);
        // Same invocation with an upload passes.
        let mut args = vec!["@u".to_string()];
        assert!(check_prefix_args(&mut args, &with_att, true, no_channel).is_ok());
    }

    #[test]
    fn invalid_choice_denies_at_caret() {
        // Mirrors isValidArgument `type.split("/").includes(arg)`: the
        // Err feeds the existing caret embed (display_index positions
        // the `^` under the choice token, no new user string).
        let specs = vec![ArgSpec::text("mode", "on/off", true, false)];
        let no_channel = &|_: &str| None;
        let mut args = vec!["maybe".to_string()];
        let err = check_prefix_args(&mut args, &specs, true, no_channel).unwrap_err();
        assert_eq!(err.option_index, 0);
        assert_eq!(err.display_index, 0);
        let template =
            crate::lang::get("en-US", "hybridcommands_args_error_embed_desc").unwrap_or_default();
        let desc = usage_error_description(&template, "!", "cfg", &specs, false, err.display_index);
        assert!(desc.contains("!cfg [on/off]"));
        assert!(desc.contains('^'));
        assert!(desc.contains("Error when sending \"on/off\" argument."));
        // Exact members pass.
        for good in ["on", "off"] {
            let mut args = vec![good.to_string()];
            assert!(check_prefix_args(&mut args, &specs, true, no_channel).is_ok());
        }
    }

    #[test]
    fn wrong_channel_type_denies_at_caret() {
        // Mirrors isValidArgument `!optArgs || optArgs.includes(channel
        // .type)`: a resolved Voice channel against a Text allowlist
        // denies at the caret, like the TS sendErrorMessage leg.
        let specs = vec![ArgSpec::text("target", "channel", true, false)
            .with_channel_types(Some(vec![serenity::ChannelType::Text]))];
        let voice = &|_: &str| Some(serenity::ChannelType::Voice);
        let mut args = vec!["<#123>".to_string()];
        let err = check_prefix_args(&mut args, &specs, true, voice).unwrap_err();
        assert_eq!(err.option_index, 0);
        assert_eq!(err.display_index, 0);
        let template =
            crate::lang::get("en-US", "hybridcommands_args_error_embed_desc").unwrap_or_default();
        let desc =
            usage_error_description(&template, "!", "move", &specs, false, err.display_index);
        assert!(desc.contains('^'));
    }

    #[test]
    fn valid_choice_and_channel_pass() {
        // Allowed kind, absent allowlist (TS `!optArgs`), and
        // unresolvable names (deferred to poise's typed parse, whose
        // ArgumentParse failure routes to the same caret embed).
        let text_only: Vec<ArgSpec> = vec![ArgSpec::text("target", "channel", true, false)
            .with_channel_types(Some(vec![serenity::ChannelType::Text]))];
        let text_kind = &|_: &str| Some(serenity::ChannelType::Text);
        let mut args = vec!["<#123>".to_string()];
        assert!(check_prefix_args(&mut args, &text_only, true, text_kind).is_ok());
        let open: Vec<ArgSpec> = vec![ArgSpec::text("target", "channel", true, false)];
        let voice = &|_: &str| Some(serenity::ChannelType::Voice);
        let mut args = vec!["<#123>".to_string()];
        assert!(check_prefix_args(&mut args, &open, true, voice).is_ok());
        let mut args = vec!["general".to_string()];
        assert!(check_prefix_args(&mut args, &text_only, true, &|_: &str| None).is_ok());
    }

    #[test]
    fn caret_embed_reuses_ts_template_placeholders() {
        // Real en-US template: the test fails if the TS key moves.
        let template =
            crate::lang::get("en-US", "hybridcommands_args_error_embed_desc").unwrap_or_default();
        assert!(template.contains("${errorPosition}"));
        let specs = text_specs();
        let desc = usage_error_description(&template, "!", "ban", &specs, false, 0);
        assert!(desc.contains("!ban [user] <string>"));
        assert!(desc.contains("Error when sending \"user\" argument."));
        let caret_line = desc
            .lines()
            .find(|l| l.contains('^'))
            .unwrap_or_default()
            .trim_end();
        // Caret sits under the first token: "!" + "ban" = 4-wide pad, then " ^".
        assert_eq!(caret_line, "     ^");
    }

    #[test]
    fn caret_tracks_second_token_and_brackets() {
        let template = "${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\n\"${wrongArgumentName}\"";
        let specs = text_specs();
        let desc = usage_error_description(template, "!", "ban", &specs, false, 1);
        assert!(desc.contains("\"string\""));
        let caret_line = desc.lines().find(|l| l.contains('^')).unwrap_or("");
        assert!(caret_line.ends_with(" ^"));
        assert!(caret_line.len() > "      ^".len());
    }

    #[test]
    fn caret_widths_match_ts_utf16_units() {
        // Node ground truth: prefix emoji is 2 UTF-16 units, so the
        // head pad is 2 + 3 = 5 (chars() would give 4 and misalign).
        let template = "${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\n\"${wrongArgumentName}\"";
        let specs = text_specs();
        let desc = usage_error_description(template, "😀", "ban", &specs, false, 1);
        let caret_line = desc.lines().find(|l| l.contains('^')).unwrap_or("");
        assert_eq!(caret_line, "             ^");
    }

    #[test]
    fn caret_split_sees_bare_invocation_as_empty() {
        // messageCommandHandler shifts the command name off, so a bare
        // invocation reaches checkCommandArgs as [] (missingIndex 0):
        // the caret flags the first token like prod (bare `+dm` flags
        // `[yes/no]`), while split_args keeps [""] for the missing-args
        // DETECTION guard (is_missing_text_args).
        assert!(split_caret_args("").is_empty());
        assert!(split_caret_args("   ").is_empty());
        assert_eq!(split_caret_args("yes"), vec!["yes".to_string()]);
        assert_eq!(
            split_caret_args("123 @x"),
            vec!["123".to_string(), "@x".to_string()]
        );
        assert_eq!(split_args(""), vec![String::new()]);
        assert!(is_missing_text_args(&split_args(""), &text_specs()[..1]));
    }

    #[test]
    fn choice_token_override_pins_ts_values_not_names() {
        // backup create/save-message: TS renders choice VALUES
        // (`yes/no`, required) — never the poise-erased display names
        // (`Yes/No`, optional).
        assert_eq!(
            choice_token_override("backup create", "save-message"),
            Some(("yes/no", true))
        );
        assert_eq!(choice_token_override("backup create", "other"), None);
        assert_eq!(choice_token_override("utils dm", "save-message"), None);
    }
}
