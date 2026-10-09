// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Prefix arg UX. Mirrors src/core/functions/method.ts (checkCommandArgs
// required-count, longString tail merge, attachment-required gate, the
// caret usage-error embed) + the arg split in
// src/Events/interaction/messageCommandHandler.ts.
//
// Pure string policy only: no Discord I/O, no DB. Callers fetch the
// `hybridcommands_args_error_embed_desc` template via crate::lang::get
// (same TS key) and pass it to usage_error_description. Type-shape
// validation (user/role/channel/number/choices) stays with poise's
// typed params: parse failures surface as ArgumentParse, already routed
// to ban_dont_found_member in the error router.

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
}

impl ArgSpec {
    pub fn text(name: &str, type_label: &str, required: bool, long_string: bool) -> Self {
        Self {
            name: name.to_string(),
            type_label: type_label.to_string(),
            required,
            attachment: false,
            long_string,
        }
    }

    pub fn attachment(name: &str, required: bool) -> Self {
        Self {
            name: name.to_string(),
            type_label: "attachment".to_string(),
            required,
            attachment: true,
            long_string: false,
        }
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
/// `content.slice(prefix.length).trim().split(/ +/g)`: whitespace runs
/// collapse, and empty input yields a single empty arg so the
/// `(len == 1 && args[0] == "")` missing check below still fires.
pub fn split_args(rest: &str) -> Vec<String> {
    let words: Vec<String> = rest.split_whitespace().map(str::to_string).collect();
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

/// Full prefix validation in TS order: required-count, longString tail
/// merge (mutates args), per-arg required presence, attachment gate.
/// Ok holds the merged tail; Err carries the caret position.
pub fn check_prefix_args(
    args: &mut Vec<String>,
    specs: &[ArgSpec],
    has_attachments: bool,
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
    }
    if let Some(orig_idx) = missing_attachment_option(specs, has_attachments) {
        return Err(PrefixArgsError {
            option_index: orig_idx,
            display_index: display_position(specs, orig_idx),
        });
    }
    Ok(())
}

/// Position of an original-order option inside the usage line.
fn display_position(specs: &[ArgSpec], orig_idx: usize) -> usize {
    display_order(specs)
        .iter()
        .position(|&i| i == orig_idx)
        .unwrap_or(orig_idx)
}

/// Usage tokens. Mirrors sendErrorMessage: required `[type]`,
/// optional `<type>`. The missing-count path renders text options only;
/// every other error renders text + attachments.
pub fn usage_tokens(specs: &[ArgSpec], text_only: bool) -> Vec<String> {
    specs
        .iter()
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
    let pad: String =
        " ".repeat((bot_prefix.chars().count() + command_display.chars().count()).max(1));
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
            error_position.push_str(&" ".repeat(token.chars().count() + 1));
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
        // Missing required text arg.
        let mut args: Vec<String> = vec![];
        let err = check_prefix_args(&mut args, &specs, true).unwrap_err();
        assert_eq!(err.display_index, 0);
        // Tail merges on success.
        let mut args = vec!["@u".to_string(), "a".to_string(), "b".to_string()];
        assert!(check_prefix_args(&mut args, &specs, true).is_ok());
        assert_eq!(args, vec!["@u", "a b"]);
        // Required attachment without upload denies.
        let with_att = vec![
            ArgSpec::text("user", "user", true, false),
            ArgSpec::attachment("proof", true),
        ];
        let mut args = vec!["@u".to_string()];
        let err = check_prefix_args(&mut args, &with_att, false).unwrap_err();
        assert_eq!(err.option_index, 1);
        assert_eq!(err.display_index, 1);
        // Same invocation with an upload passes.
        let mut args = vec!["@u".to_string()];
        assert!(check_prefix_args(&mut args, &with_att, true).is_ok());
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
        let desc = usage_error_description(&template, "!", "ban", &specs, false, 1);
        assert!(desc.contains("\"string\""));
        let caret_line = desc.lines().find(|l| l.contains('^')).unwrap_or_default();
        assert!(caret_line.ends_with(" ^"));
        assert!(caret_line.len() > "      ^".len());
    }
}
