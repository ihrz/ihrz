// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Send-path pure builders. Mirrors src/core/functions/method.ts shapes
// WITHOUT any Discord I/O (delivery is a follow-up):
// createAwesomeEmbed (title/fields/footer), checkCommandArgs /
// isValidArgument (pure verdict, no sending), interactionSend /
// channelSend / reply option resolution, buttonReact / buttonUnreact
// guards + warnMember custom id, punish / warnMember payload builders,
// stringifyOption / boldStringifyOption.
// Arg counting / caret-embed plumbing already lives in prefix_args.rs;
// this module owns the TS-exact shapes (ids, flags, templates).

/// discord.js Colors.LightGrey ("LightGrey" in createAwesomeEmbed).
pub const COLOR_LIGHT_GREY: u32 = 0xD3_D3_D3;
/// discord.js Colors.Red ("Red" in sendErrorMessage / warnMember).
pub const COLOR_RED: u32 = 0xED_42_45;

/// Fallback derank reason. Mirrors `reason || "Protection"` in derank.
pub const DERANK_REASON_FALLBACK: &str = "Protection";
/// Fallback ban reason. Mirrors `reason || "Protect!"` in punish.
pub const BAN_REASON_FALLBACK: &str = "Protect!";
/// Exact TS error. Mirrors the buttonReact row-cap throw.
pub const TOO_MANY_COMPONENTS: &str = "Too much components on this message!";
/// TS-hardcoded vote button label (generateTopggActionRow hardcodes it;
/// no YAML key exists, so the literal is mirrored, not translated).
pub const TOPGG_VOTE_LABEL: &str = "Vote for iHorizon";

fn t(code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
}

// ---------------------------------------------------------------------------
// Option stringify (stringifyOption / boldStringifyOption +
// getArgumentOptionNameWithOptions).
// ---------------------------------------------------------------------------

/// One command option for usage-line rendering.
#[derive(Debug, Clone)]
pub struct UsageOption {
    pub name: String,
    pub required: bool,
    /// Choice values; when non-empty the display name becomes the
    /// values joined with "/" (getArgumentOptionTypeWithOptions).
    pub choices: Vec<String>,
}

impl UsageOption {
    pub fn new(name: &str, required: bool) -> Self {
        Self {
            name: name.to_string(),
            required,
            choices: Vec::new(),
        }
    }

    pub fn with_choices(name: &str, required: bool, choices: &[&str]) -> Self {
        Self {
            name: name.to_string(),
            required,
            choices: choices.iter().map(|s| s.to_string()).collect(),
        }
    }

    fn display_name(&self) -> String {
        if self.choices.is_empty() {
            self.name.clone()
        } else {
            self.choices.join("/")
        }
    }
}

/// Mirrors stringifyOption: `[name]` when required, `<name>` otherwise.
pub fn stringify_options(options: &[UsageOption]) -> String {
    options
        .iter()
        .map(|o| {
            if o.required {
                format!("[{}]", o.display_name())
            } else {
                format!("<{}>", o.display_name())
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Mirrors boldStringifyOption: ```[name]`** / **`<name>`** variants.
pub fn bold_stringify_options(options: &[UsageOption]) -> String {
    options
        .iter()
        .map(|o| {
            if o.required {
                format!("**`[{}]`**", o.display_name())
            } else {
                format!("**`<{}>`**", o.display_name())
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

// ---------------------------------------------------------------------------
// createAwesomeEmbed (pure payload).
// ---------------------------------------------------------------------------

/// One embed field. Mirrors EmbedBuilder.addFields entries.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmbedField {
    pub name: String,
    pub value: String,
    pub inline: bool,
}

/// Pure createAwesomeEmbed payload. `perm_display` is the already-resolved
/// permission line (TS resolves command.permission / DB overrides first).
/// `description` / `description_fr` feed the `startsWith("fr-")` branch;
/// `subcommands` (name, aliases) selects the hasSubCommand branch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AwesomeEmbed {
    pub title: String,
    pub description: Option<String>,
    pub color: u32,
    pub fields: Vec<EmbedField>,
    pub footer_text: String,
}

pub struct SubCommandInfo {
    pub name: String,
    pub aliases: Vec<String>,
}

/// Arity mirrors createAwesomeEmbed (TS takes the same resolved inputs).
#[allow(clippy::too_many_arguments)]
pub fn awesome_embed(
    lang_code: &str,
    command_name: &str,
    prefix_name: Option<&str>,
    bot_prefix: &str,
    mention_prefix: bool,
    aliases: &[String],
    options: &[UsageOption],
    perm_display: Option<&str>,
    description: &str,
    description_fr: Option<&str>,
    guild_lang: &str,
    subcommands: Option<&[SubCommandInfo]>,
) -> AwesomeEmbed {
    let raw = prefix_name.unwrap_or(command_name);
    let clean: String = raw.chars().take(1).collect::<String>().to_uppercase()
        + &raw.chars().skip(1).collect::<String>();
    let title = t(
        lang_code,
        "hybridcommands_embed_help_title",
        "${commandName} Help Embed",
    )
    .replace("${commandName}", &clean);
    let prefix = if mention_prefix {
        t(
            lang_code,
            "hybridcommands_global_prefix_mention",
            "`@Ping-Me`",
        )
    } else {
        bot_prefix.to_string()
    };
    let none = t(lang_code, "setjoinroles_var_none", "None");
    let footer_text = t(
        lang_code,
        "hybridcommands_embed_footer_text",
        "Options within [...] are required, while those within <...> are optional.\nUse the command: ${botPrefix}help [command] for more information.",
    )
    .replace("${botPrefix}", &prefix);

    let mut embed = AwesomeEmbed {
        title,
        description: None,
        color: COLOR_LIGHT_GREY,
        fields: Vec::new(),
        footer_text,
    };

    if let Some(subs) = subcommands {
        let field_tpl = t(
            lang_code,
            "hybridcommands_embed_help_fields_value",
            "**Aliases:** ${aliases}\n**Use:** ${use}",
        );
        for sub in subs {
            let path = bold_stringify_options(options);
            let alias_str = if sub.aliases.is_empty() {
                none.clone()
            } else {
                sub.aliases
                    .iter()
                    .map(|a| format!("`{a}`"))
                    .collect::<Vec<_>>()
                    .join(", ")
            };
            let use_line = format!("{}{} {}", prefix, sub.name, path);
            embed.fields.push(EmbedField {
                name: format!("{}{}", prefix, sub.name),
                value: field_tpl
                    .replace("${aliases}", &alias_str)
                    .replace("${use}", use_line.trim_end()),
                inline: false,
            });
        }
        return embed;
    }

    // Non-subcommand branch. TS: `use` line has a trailing space when
    // pathString is empty (`${prefix}${name} ${path}` untrimmed); the
    // field `name` values come from var_usage / var_permission /
    // var_aliases keys.
    let path = bold_stringify_options(options);
    let desc = if guild_lang.starts_with("fr-") {
        description_fr.unwrap_or(description)
    } else {
        description
    };
    embed.description = Some(desc.to_string());
    let perm = perm_display.unwrap_or("");
    embed.fields = vec![
        EmbedField {
            name: t(lang_code, "var_usage", "Usage"),
            value: format!("{}{} {}", prefix, raw, path),
            inline: false,
        },
        EmbedField {
            name: t(lang_code, "var_permission", "Permission"),
            value: format!(
                "{}: {}",
                t(lang_code, "var_permission", "Permission"),
                if perm.is_empty() {
                    none.clone()
                } else {
                    perm.to_string()
                }
            ),
            inline: false,
        },
        EmbedField {
            name: t(lang_code, "var_aliases", "Aliases"),
            value: if aliases.is_empty() {
                none
            } else {
                aliases
                    .iter()
                    .map(|a| format!("`{a}`"))
                    .collect::<Vec<_>>()
                    .join(", ")
            },
            inline: false,
        },
    ];
    embed
}

// ---------------------------------------------------------------------------
// checkCommandArgs / isValidArgument (pure verdict, no sending).
// ---------------------------------------------------------------------------

/// Pure argument verdict. `Ok.merged` carries the longString tail-merge
/// result; `Missing` / `Invalid` carry the TS sendErrorMessage errorIndex;
/// `NeedsGuild` marks username / role-name / channel-name cases that TS
/// resolves against the guild cache (no pure answer possible).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CheckVerdict {
    Ok { merged: Vec<String> },
    Missing { index: usize },
    Invalid { index: usize },
    NeedsGuild { index: usize },
}

/// One expected text argument (expectedArgs entry).
#[derive(Debug, Clone)]
pub struct CheckArg {
    /// Display type from getArgumentOptionTypeWithOptions: string, user,
    /// roles, number, channel, unknown, or choices joined with "/".
    pub type_label: String,
    pub required: bool,
    /// True for a trailing string option without choices (absorbs tail).
    pub long_string: bool,
}

impl CheckArg {
    pub fn new(type_label: &str, required: bool, long_string: bool) -> Self {
        Self {
            type_label: type_label.to_string(),
            required,
            long_string,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Shape {
    Valid,
    Invalid,
    GuildLookup,
}

fn is_all_digits(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

fn is_numeric(s: &str) -> bool {
    let v = s.trim();
    if v.is_empty() {
        return false;
    }
    v.parse::<f64>().is_ok()
        || v.strip_prefix("0x")
            .or_else(|| v.strip_prefix("0X"))
            .map(|h| !h.is_empty() && h.bytes().all(|b| b.is_ascii_hexdigit()))
            .unwrap_or(false)
}

/// Pure core of isValidArgument. Mention / id / numeric / choices /
/// number / string / unknown resolve without the guild; name lookups
/// (username, role name, channel name / fuzzy) need it.
fn mention_or_numeric(mention_hit: bool, numeric_hit: bool) -> Shape {
    if mention_hit || numeric_hit {
        Shape::Valid
    } else {
        Shape::GuildLookup
    }
}

fn check_shape(type_label: &str, value: &str) -> Shape {
    if type_label.contains('/') {
        return if type_label.split('/').any(|c| c == value) {
            Shape::Valid
        } else {
            Shape::Invalid
        };
    }
    match type_label {
        "string" => Shape::Valid,
        "unknown" => Shape::Valid,
        // TS Number("") === 0 (valid); hex parses too.
        "number" => {
            if value.trim().is_empty() || is_numeric(value) {
                Shape::Valid
            } else {
                Shape::Invalid
            }
        }
        // TS: mention, !isNaN(Number(arg)) (so "1e3" counts), else username.
        "user" => {
            let v = value.trim();
            let inner = v
                .strip_prefix("<@")
                .and_then(|s| s.strip_suffix('>'))
                .map(|s| s.strip_prefix('!').unwrap_or(s));
            mention_or_numeric(
                inner.map(is_all_digits).unwrap_or(false) && v.len() > 4,
                is_numeric(v),
            )
        }
        "roles" => {
            let v = value.trim();
            mention_or_numeric(
                v.starts_with("<@&") && v.ends_with('>') && is_all_digits(&v[3..v.len() - 1]),
                is_numeric(v),
            )
        }
        "channel" => {
            let v = value.trim();
            mention_or_numeric(
                v.starts_with("<#") && v.ends_with('>') && is_all_digits(&v[2..v.len() - 1]),
                is_all_digits(v),
            )
        }
        _ => Shape::Invalid,
    }
}

/// Pure checkCommandArgs: required-count gate, longString tail merge,
/// per-arg shape validation, required-attachment gate. `attachments`
/// is the message attachment count. `original_option_index` maps an
/// attachment arg name to its index in the original options order.
pub fn check_args(
    expected: &[CheckArg],
    attachment_required: &[(String, usize)],
    mut args: Vec<String>,
    attachments: usize,
    original_option_index: &dyn Fn(&str) -> usize,
) -> CheckVerdict {
    let min = expected.iter().filter(|a| a.required).count();
    let last_long = expected.last().map(|a| a.long_string).unwrap_or(false);
    if args.len() < min || (args.len() == 1 && args.first().map(|a| a.is_empty()).unwrap_or(false))
    {
        return CheckVerdict::Missing { index: args.len() };
    }
    if last_long && args.len() > expected.len().saturating_sub(1) {
        let at = expected.len() - 1;
        let tail = args[at..].join(" ");
        args.truncate(at);
        args.push(tail);
    }
    for (i, spec) in expected.iter().enumerate() {
        if i >= args.len() {
            if spec.required {
                return CheckVerdict::Missing { index: i };
            }
            continue;
        }
        match check_shape(&spec.type_label, &args[i]) {
            Shape::Valid => {}
            Shape::Invalid => return CheckVerdict::Invalid { index: i },
            Shape::GuildLookup => return CheckVerdict::NeedsGuild { index: i },
        }
    }
    for (name, _) in attachment_required {
        if attachments == 0 {
            return CheckVerdict::Missing {
                index: original_option_index(name),
            };
        }
    }
    CheckVerdict::Ok { merged: args }
}

// ---------------------------------------------------------------------------
// sendErrorMessage pure parts (args line + caret position + description).
// ---------------------------------------------------------------------------

/// Mirrors the `argument` line: `[type]` required, `<type>` optional.
pub fn args_error_line(specs: &[(String, bool)]) -> String {
    specs
        .iter()
        .map(|(t, req)| {
            if *req {
                format!("[{t}]")
            } else {
                format!("<{t}>")
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Mirrors errorPosition: pad to prefix+command length, then " ^" at
/// the error index, blank padding elsewhere.
pub fn error_position(
    bot_prefix: &str,
    full_command: &str,
    arg_tokens: &[String],
    error_index: usize,
) -> String {
    let mut pos = " ".repeat(bot_prefix.len() + full_command.len());
    for (i, tok) in arg_tokens.iter().enumerate() {
        if i == error_index {
            pos.push_str(" ^");
        } else {
            pos.push_str(&" ".repeat(tok.len() + 1));
        }
    }
    pos
}

/// Mirrors the sendErrorMessage embed description fill.
pub fn args_error_description(
    lang_code: &str,
    current_name: &str,
    bot_prefix: &str,
    full_command: &str,
    args_string: &str,
    error_position: &str,
    wrong_arg: &str,
) -> String {
    t(
        lang_code,
        "hybridcommands_args_error_embed_desc",
        "```ts\nCommand Name: ${currentCommand.name}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nError when sending \"${wrongArgumentName}\" argument.\n```",
    )
    .replace("${currentCommand.name}", current_name)
    .replace("${botPrefix}", bot_prefix)
    .replace("${fullNameCommand}", full_command)
    .replace("${argsString}", args_string)
    .replace("${errorPosition}", error_position)
    .replace("${wrongArgumentName}", wrong_arg)
}

// ---------------------------------------------------------------------------
// interactionSend / channelSend / reply option resolution (pure).
// ---------------------------------------------------------------------------

/// Caller input: plain string or a rich options object.
#[derive(Debug, Clone, Default)]
pub struct SendInput {
    pub content: Option<String>,
    pub has_embeds: bool,
    pub has_files: bool,
    pub has_components: bool,
    pub ephemeral: bool,
}

/// Resolved delivery policy. `enforce_nonce` / `fresh_nonce` mirror the
/// SnowflakeUtil.generate + enforceNonce:true lines; `strips_mentions`
/// mirrors the forced allowedMentions override on the Message path.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SendPayload {
    pub content: Option<String>,
    pub has_embeds: bool,
    pub ephemeral: bool,
    pub reply_without_ping: bool,
    pub strips_roles_users_mentions: bool,
    pub enforce_nonce: bool,
    pub fresh_nonce: bool,
}

impl SendPayload {
    /// Mirrors the Message branch of interactionSend + reply(): string
    /// input becomes content-only with repliedUser:false; object input
    /// keeps content/embeds and always (interactionSend) or never
    /// (reply) overrides allowedMentions. `via_interaction_send`
    /// selects which.
    pub fn message_reply(input: &SendInput, via_interaction_send: bool) -> Self {
        Self {
            content: input.content.clone(),
            has_embeds: input.has_embeds,
            ephemeral: false,
            reply_without_ping: true,
            strips_roles_users_mentions: via_interaction_send,
            enforce_nonce: via_interaction_send,
            fresh_nonce: via_interaction_send,
        }
    }

    /// Mirrors channelSend: string input becomes content-only; object
    /// input is spread with a fresh nonce + enforceNonce:true.
    pub fn channel(input: &SendInput) -> Self {
        Self {
            content: input.content.clone(),
            has_embeds: input.has_embeds,
            ephemeral: false,
            reply_without_ping: true,
            strips_roles_users_mentions: false,
            enforce_nonce: true,
            fresh_nonce: true,
        }
    }

    /// Mirrors the interaction branch of interactionSend: reply vs
    /// editReply vs deferred-edit is runtime state, but the payload
    /// mapping (string -> content, options spread incl. ephemeral) is
    /// pure. TopGG injection is disabled in TS
    /// (shouldAdvertiseTheTopggVoteButton returns false).
    pub fn interaction(input: &SendInput, text: Option<&str>) -> Self {
        Self {
            content: text
                .map(|s| s.to_string())
                .or_else(|| input.content.clone()),
            has_embeds: input.has_embeds,
            ephemeral: text.is_none() && input.ephemeral,
            reply_without_ping: false,
            strips_roles_users_mentions: false,
            enforce_nonce: false,
            fresh_nonce: false,
        }
    }
}

// ---------------------------------------------------------------------------
// Buttons: custom ids, vote row, react / unreact guards.
// ---------------------------------------------------------------------------

/// Mirrors warnMember's disabled guild button id.
pub fn warn_guild_button_id(guild_id: &str) -> String {
    format!("guild-id-{guild_id}")
}

/// Mirrors the warnMember button label fill.
pub fn warn_guild_button_label(lang_code: &str, guild_name: &str) -> String {
    t(
        lang_code,
        "global_warn_component_button_label",
        "Sent from ${author.guild.name}",
    )
    .replace("${author.guild.name}", guild_name)
}

/// Mirrors generateTopggActionRow's link button target.
pub fn topgg_vote_url(client_id: &str) -> String {
    format!("https://top.gg/bot/{client_id}/vote")
}

/// Pure buttonReact slot rule: 5+ rows throw; the button joins the
/// first row with < 5 components, else a new row is appended.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactSlot {
    ExistingRow(usize),
    NewRow,
}

pub fn react_slot(row_counts: &[usize]) -> Result<ReactSlot, &'static str> {
    if row_counts.len() >= 5 {
        return Err(TOO_MANY_COMPONENTS);
    }
    for (i, n) in row_counts.iter().enumerate() {
        if *n < 5 {
            return Ok(ReactSlot::ExistingRow(i));
        }
    }
    Ok(ReactSlot::NewRow)
}

/// Minimal component ref for the unreact filter.
#[derive(Debug, Clone)]
pub struct CompRef {
    pub is_button: bool,
    pub emoji_id: Option<String>,
}

/// Pure buttonUnreact filter: drops buttons whose emoji id matches,
/// drops rows left empty, reports whether anything was removed.
pub fn unreact_rows(rows: Vec<Vec<CompRef>>, button_emoji: &str) -> (Vec<Vec<CompRef>>, bool) {
    let mut removed = false;
    let kept: Vec<Vec<CompRef>> = rows
        .into_iter()
        .map(|row| {
            row.into_iter()
                .filter(|c| {
                    if c.is_button && c.emoji_id.as_deref() == Some(button_emoji) {
                        removed = true;
                        false
                    } else {
                        true
                    }
                })
                .collect::<Vec<_>>()
        })
        .filter(|row| !row.is_empty())
        .collect();
    (kept, removed)
}

// ---------------------------------------------------------------------------
// punish / warnMember payload builders.
// ---------------------------------------------------------------------------

/// Pure punish routing. Mirrors the SANCTION switch: "simply" and
/// unknown values do nothing; ban falls back to derank on failure
/// (delivery layer decides the fallback attempt).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PunishAction {
    None,
    Derank,
    Ban,
}

pub fn punish_action(sanction: Option<&str>) -> PunishAction {
    match sanction {
        Some("simply+derank") => PunishAction::Derank,
        Some("simply+ban") => PunishAction::Ban,
        _ => PunishAction::None,
    }
}

/// Mirrors the warnMember DB push key.
pub fn warn_db_key(guild_id: &str, user_id: &str) -> String {
    format!("{guild_id}.USER.{user_id}.WARNS")
}

/// Pure warnMember DM payload (id generation + send are delivery).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WarnPayload {
    pub title: String,
    pub description: String,
    pub color: u32,
    pub button_id: String,
    pub button_label: String,
    pub button_disabled: bool,
}

/// Arity mirrors warnMember (TS interpolates the same fields).
#[allow(clippy::too_many_arguments)]
pub fn warn_payload(
    lang_code: &str,
    warn_id: &str,
    reason: &str,
    author_username: &str,
    author_top_role: &str,
    timestamp_display: &str,
    guild_id: &str,
    guild_name: &str,
) -> WarnPayload {
    let title = t(
        lang_code,
        "global_warn_embed_title",
        "You got warned - Case **`${warnObject.id}`**",
    )
    .replace("${warnObject.id}", warn_id);
    let description = t(
        lang_code,
        "global_warn_embed_desc",
        "> **Reason:** ${warnObject.reason}\n> **Responsible:** @${author.user.username} (*${author.roles.highest.name}*)\nWarn generated ${time}",
    )
    .replace("${warnObject.reason}", reason)
    .replace("${author.user.username}", author_username)
    .replace("${author.roles.highest.name}", author_top_role)
    .replace("${time}", timestamp_display);
    WarnPayload {
        title,
        description,
        color: COLOR_RED,
        button_id: warn_guild_button_id(guild_id),
        button_label: warn_guild_button_label(lang_code, guild_name),
        button_disabled: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stringify_routes_required_vs_optional() {
        let opts = vec![
            UsageOption::new("member", true),
            UsageOption::new("reason", false),
        ];
        assert_eq!(stringify_options(&opts), "[member] <reason>");
        assert_eq!(
            bold_stringify_options(&opts),
            "**`[member]`** **`<reason>`**"
        );
    }

    #[test]
    fn stringify_uses_choices_joined_with_slash() {
        // getArgumentOptionNameWithOptions: choices map to value join("/").
        let opts = vec![UsageOption::with_choices("mode", true, &["a", "b"])];
        assert_eq!(stringify_options(&opts), "[a/b]");
        assert_eq!(bold_stringify_options(&opts), "**`[a/b]`**");
    }

    #[test]
    fn awesome_embed_title_capitalizes_and_prefixes() {
        let e = awesome_embed(
            "en-US",
            "ban",
            None,
            "!",
            false,
            &[],
            &[],
            None,
            "Bans a member.",
            None,
            "en-US",
            None,
        );
        assert_eq!(e.title, "Ban Help Embed");
        assert_eq!(e.color, COLOR_LIGHT_GREY);
        assert_eq!(e.fields[0].name, "Usage");
        assert_eq!(e.fields[0].value, "!ban ");
        assert_eq!(e.fields[1].value, "Permission: None");
    }

    #[test]
    fn awesome_embed_prefix_name_and_mention_prefix() {
        let e = awesome_embed(
            "en-US",
            "ignored",
            Some("warn"),
            "`@Ping-Me`",
            true,
            &["w".to_string()],
            &[UsageOption::new("member", true)],
            Some("Moderator"),
            "Warns.",
            None,
            "en-US",
            None,
        );
        assert_eq!(e.title, "Warn Help Embed");
        assert_eq!(e.fields[0].value, "`@Ping-Me`warn **`[member]`**");
        assert_eq!(e.fields[1].value, "Permission: Moderator");
        assert_eq!(e.fields[2].value, "`w`");
        assert!(e.footer_text.contains("`@Ping-Me`help [command]"));
    }

    #[test]
    fn awesome_embed_subcommand_branch() {
        let subs = [SubCommandInfo {
            name: "create".to_string(),
            aliases: vec!["c".to_string()],
        }];
        let e = awesome_embed(
            "en-US",
            "ticket",
            None,
            "!",
            false,
            &[],
            &[],
            None,
            "",
            None,
            "en-US",
            Some(&subs),
        );
        assert_eq!(e.description, None);
        assert_eq!(e.fields[0].name, "!create");
        assert_eq!(e.fields[0].value, "**Aliases:** `c`\n**Use:** !create");
    }

    #[test]
    fn awesome_embed_fr_description_branch() {
        let e = awesome_embed(
            "en-US",
            "ban",
            None,
            "!",
            false,
            &[],
            &[],
            None,
            "Bans a member.",
            Some("Bannit un membre."),
            "fr-FR",
            None,
        );
        assert_eq!(e.description, Some("Bannit un membre.".to_string()));
    }

    #[test]
    fn check_args_missing_and_invalid_indexes() {
        let specs = vec![
            CheckArg::new("user", true, false),
            CheckArg::new("string", false, false),
        ];
        assert_eq!(
            check_args(&specs, &[], vec![], 0, &|_| 0),
            CheckVerdict::Missing { index: 0 }
        );
        // Numeric id passes the user shape; free text needs the guild.
        assert!(matches!(
            check_args(&specs, &[], vec!["123".to_string()], 0, &|_| 0),
            CheckVerdict::Ok { .. }
        ));
        assert_eq!(
            check_args(&specs, &[], vec!["notauser".to_string()], 0, &|_| 0),
            CheckVerdict::NeedsGuild { index: 0 }
        );
        // Choices joined with "/" must match exactly.
        let choice = vec![CheckArg::new("on/off", true, false)];
        assert_eq!(
            check_args(&choice, &[], vec!["maybe".to_string()], 0, &|_| 0),
            CheckVerdict::Invalid { index: 0 }
        );
        // Required attachment without uploads reports the original index.
        let attach = vec![("file".to_string(), 2usize)];
        assert_eq!(
            check_args(&[], &attach, vec![], 0, &|_| 2),
            CheckVerdict::Missing { index: 2 }
        );
    }

    #[test]
    fn check_args_long_string_merges_tail() {
        let specs = vec![
            CheckArg::new("user", true, false),
            CheckArg::new("string", false, true),
        ];
        let v = check_args(
            &specs,
            &[],
            vec!["1".to_string(), "a".to_string(), "b".to_string()],
            0,
            &|_| 0,
        );
        assert_eq!(
            v,
            CheckVerdict::Ok {
                merged: vec!["1".to_string(), "a b".to_string()]
            }
        );
    }

    #[test]
    fn shape_matrix_covers_ts_switch() {
        assert_eq!(check_shape("string", "anything"), Shape::Valid);
        assert_eq!(check_shape("unknown", "anything"), Shape::Valid);
        assert_eq!(check_shape("bogus", "x"), Shape::Invalid);
        assert_eq!(check_shape("number", "42"), Shape::Valid);
        assert_eq!(check_shape("number", "nope"), Shape::Invalid);
        assert_eq!(check_shape("user", "<@123>"), Shape::Valid);
        assert_eq!(check_shape("user", "<@!123>"), Shape::Valid);
        assert_eq!(check_shape("roles", "<@&123>"), Shape::Valid);
        assert_eq!(check_shape("channel", "<#123>"), Shape::Valid);
        assert_eq!(check_shape("channel", "123"), Shape::Valid);
        assert_eq!(check_shape("channel", "general"), Shape::GuildLookup);
    }

    #[test]
    fn args_error_parts_match_send_error_message() {
        let line = args_error_line(&[("user".to_string(), true), ("reason".to_string(), false)]);
        assert_eq!(line, "[user] <reason>");
        let tokens: Vec<String> = vec!["[user]".to_string(), "<reason>".to_string()];
        let pos = error_position("!", "ban", &tokens, 0);
        assert_eq!(pos, "     ^         ");
        let desc = args_error_description("en-US", "ban", "!", "ban", &line, &pos, "user");
        assert!(desc.contains("Command Name: ban"));
        assert!(desc.contains("!ban [user] <reason>"));
        assert!(desc.contains("Error when sending \"user\" argument."));
    }

    #[test]
    fn payload_routing_matches_ts_branches() {
        let rich = SendInput {
            content: Some("hi".to_string()),
            has_embeds: true,
            ephemeral: true,
            ..Default::default()
        };
        let m = SendPayload::message_reply(&rich, true);
        assert!(
            m.reply_without_ping
                && m.strips_roles_users_mentions
                && m.enforce_nonce
                && m.fresh_nonce
        );
        assert!(!m.ephemeral);
        let r = SendPayload::message_reply(&rich, false);
        assert!(!r.strips_roles_users_mentions && !r.enforce_nonce);
        let c = SendPayload::channel(&SendInput {
            content: Some("hi".to_string()),
            ..Default::default()
        });
        assert!(c.enforce_nonce && c.fresh_nonce && !c.strips_roles_users_mentions);
        let i = SendPayload::interaction(&rich, None);
        assert!(i.ephemeral && !i.reply_without_ping);
        let it = SendPayload::interaction(&rich, Some("plain"));
        assert_eq!(it.content, Some("plain".to_string()));
        assert!(!it.ephemeral);
    }

    #[test]
    fn button_ids_and_guards_match_ts() {
        assert_eq!(warn_guild_button_id("123"), "guild-id-123");
        assert_eq!(
            warn_guild_button_label("en-US", "MyGuild"),
            "Sent from MyGuild"
        );
        assert_eq!(topgg_vote_url("123"), "https://top.gg/bot/123/vote");
        assert_eq!(react_slot(&[5, 5, 5, 5, 5]), Err(TOO_MANY_COMPONENTS));
        assert_eq!(react_slot(&[5, 2]), Ok(ReactSlot::ExistingRow(1)));
        assert_eq!(react_slot(&[5, 5]), Ok(ReactSlot::NewRow));
        let rows = vec![
            vec![
                CompRef {
                    is_button: true,
                    emoji_id: Some("e1".to_string()),
                },
                CompRef {
                    is_button: true,
                    emoji_id: Some("e2".to_string()),
                },
            ],
            vec![CompRef {
                is_button: false,
                emoji_id: None,
            }],
        ];
        let (kept, removed) = unreact_rows(rows, "e1");
        assert!(removed && kept.len() == 2 && kept[0].len() == 1);
        let solo = vec![vec![CompRef {
            is_button: true,
            emoji_id: Some("e1".to_string()),
        }]];
        let (kept, removed) = unreact_rows(solo, "e1");
        assert!(removed && kept.is_empty());
    }

    #[test]
    fn punish_routing_and_warn_payload() {
        assert_eq!(punish_action(Some("simply")), PunishAction::None);
        assert_eq!(punish_action(Some("simply+derank")), PunishAction::Derank);
        assert_eq!(punish_action(Some("simply+ban")), PunishAction::Ban);
        assert_eq!(punish_action(None), PunishAction::None);
        assert_eq!(punish_action(Some("weird")), PunishAction::None);
        assert_eq!(warn_db_key("g", "u"), "g.USER.u.WARNS");
        let w = warn_payload(
            "en-US", "ABCD1234", "spam", "Mod", "Admin", "today", "g", "MyGuild",
        );
        assert_eq!(w.title, "You got warned - Case **`ABCD1234`**");
        assert!(w.description.contains("> **Reason:** spam"));
        assert!(w.description.contains("@Mod (*Admin*)"));
        assert!(w.description.contains("Warn generated today"));
        assert_eq!(w.color, COLOR_RED);
        assert_eq!(w.button_id, "guild-id-g");
        assert_eq!(w.button_label, "Sent from MyGuild");
        assert!(w.button_disabled);
    }
}
