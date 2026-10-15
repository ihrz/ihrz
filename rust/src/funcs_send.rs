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
    /// Choice values; `Some` (even empty) makes the display name the
    /// values joined with `/` (TS `if (o.choices)` is truthy on `[]`),
    /// while `None` (no `choices` key) keeps the option name.
    pub choices: Option<Vec<String>>,
}

impl UsageOption {
    pub fn new(name: &str, required: bool) -> Self {
        Self {
            name: name.to_string(),
            required,
            choices: None,
        }
    }

    pub fn with_choices(name: &str, required: bool, choices: &[&str]) -> Self {
        Self {
            name: name.to_string(),
            required,
            choices: Some(choices.iter().map(|s| s.to_string()).collect()),
        }
    }

    fn display_name(&self) -> String {
        match &self.choices {
            None => self.name.clone(),
            Some(values) => values.join("/"),
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
// Argument option type labels (getArgumentOptionType /
// getArgumentOptionTypeWithOptions in method.ts).
// ---------------------------------------------------------------------------

/// discord.js `ApplicationCommandOptionType` discriminants covered by the
/// type switch (node ground truth slice 104: String=3, Integer=4,
/// User=6, Channel=7, Role=8, Number=10, Attachment=11).
pub const OPTION_TYPE_STRING: u8 = 3;
pub const OPTION_TYPE_INTEGER: u8 = 4;
pub const OPTION_TYPE_USER: u8 = 6;
pub const OPTION_TYPE_CHANNEL: u8 = 7;
pub const OPTION_TYPE_ROLE: u8 = 8;
pub const OPTION_TYPE_NUMBER: u8 = 10;
pub const OPTION_TYPE_ATTACHMENT: u8 = 11;

/// Mirrors getArgumentOptionType: String->"string", User->"user",
/// Role->"roles", Number/Integer->"number", Channel->"channel",
/// Attachment->"attachment", anything else (Subcommand=1,
/// SubcommandGroup=2, Boolean=5, Mentionable=9, out-of-range) ->"unknown".
/// The TS switch is strict (no coercion): only the exact numeric
/// discriminant matches.
pub fn argument_option_type(option_type: u8) -> &'static str {
    match option_type {
        OPTION_TYPE_STRING => "string",
        OPTION_TYPE_USER => "user",
        OPTION_TYPE_ROLE => "roles",
        OPTION_TYPE_INTEGER | OPTION_TYPE_NUMBER => "number",
        OPTION_TYPE_CHANNEL => "channel",
        OPTION_TYPE_ATTACHMENT => "attachment",
        _ => "unknown",
    }
}

/// Mirrors getArgumentOptionTypeWithOptions: `Some` choices (even empty --
/// TS `if (o.choices)` is truthy on `[]`) render the values joined with
/// `/`; `None` (no `choices` key) falls back to the type label.
/// NOTE: the sibling live path `usage_type_label` (bot.rs) joins poise
/// choice *names* and treats empty choices as absent; TS joins choice
/// *values* and renders `[]` as `""` (battery legs below).
pub fn argument_option_type_with_options(choices: Option<&[String]>, option_type: u8) -> String {
    match choices {
        Some(values) => values.join("/"),
        None => argument_option_type(option_type).to_string(),
    }
}

// ---------------------------------------------------------------------------
// Subcommand discriminants (hasSubCommand / hasSubCommandGroup /
// isSubCommand in method.ts).
// ---------------------------------------------------------------------------

/// discord.js `ApplicationCommandOptionType.Subcommand` discriminant
/// (node ground truth slice 102: `Subcommand=1 Group=2 String=3 User=6`).
pub const OPTION_SUBCOMMAND: u8 = 1;
/// discord.js `ApplicationCommandOptionType.SubcommandGroup` discriminant.
pub const OPTION_SUBCOMMAND_GROUP: u8 = 2;

/// Mirrors `hasSubCommand`: `!options` (None) is false, else `.some()`
pub fn has_sub_command(options: Option<&[u8]>) -> bool {
    matches!(options, Some(types) if types.contains(&OPTION_SUBCOMMAND))
}

/// Mirrors `hasSubCommandGroup`: same shape over the group discriminant.
pub fn has_sub_command_group(options: Option<&[u8]>) -> bool {
    matches!(options, Some(types) if types.contains(&OPTION_SUBCOMMAND_GROUP))
}

/// Mirrors `isSubCommand` (single option, no optionality leg).
pub fn is_sub_command(option_type: u8) -> bool {
    option_type == OPTION_SUBCOMMAND
}

// ---------------------------------------------------------------------------
// findOptionRecursively (method.ts).
// ---------------------------------------------------------------------------

/// Minimal TS `Option` shape for the recursive search: only the `name`,
/// `type` and optional `options` legs the helper reads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FindOption {
    pub name: String,
    pub option_type: u8,
    pub options: Option<Vec<FindOption>>,
}

impl FindOption {
    pub fn leaf(name: &str, option_type: u8) -> Self {
        Self {
            name: name.to_string(),
            option_type,
            options: None,
        }
    }

    pub fn branch(name: &str, option_type: u8, options: Vec<FindOption>) -> Self {
        Self {
            name: name.to_string(),
            option_type,
            options: Some(options),
        }
    }
}

/// Mirrors `findOptionRecursively`: pre-order DFS, strict (`===`) name match
/// with no type gate on the name leg; descent only into Subcommand(1) /
/// SubcommandGroup(2) options carrying an `options` array (`None` == the TS
/// missing-`options` leg; `Some([])` recurses like the truthy empty array).
/// No live callers either side (only self-recursion in TS) -- dead-helper
/// parity like the discriminant helpers above.
pub fn find_option_recursively<'a>(
    options: &'a [FindOption],
    subcommand_name: &str,
) -> Option<&'a FindOption> {
    for option in options {
        if option.name == subcommand_name {
            return Some(option);
        }
        if let Some(children) = option.options.as_ref() {
            if option.option_type == OPTION_SUBCOMMAND_GROUP
                || option.option_type == OPTION_SUBCOMMAND
            {
                if let Some(found) = find_option_recursively(children, subcommand_name) {
                    return Some(found);
                }
            }
        }
    }
    None
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
/// `subcommands` (name, aliases, per-sub options) selects the
/// hasSubCommand branch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AwesomeEmbed {
    pub title: String,
    pub description: Option<String>,
    pub color: u32,
    pub fields: Vec<EmbedField>,
    pub footer_text: String,
}

/// One subcommand entry (name + aliases + its own options) for the
/// hasSubCommand branch. TS renders each row from the SUBCOMMAND's own
/// options (`boldStringifyOption(x.options || [])`, node battery slice
/// 100) — never the top-level list — and the `use` line keeps its
/// trailing space when the path is empty (`!list `, untrimmed).
pub struct SubCommandInfo {
    pub name: String,
    pub aliases: Vec<String>,
    pub options: Vec<UsageOption>,
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
    // TS `commandName.charAt(0).toUpperCase() + commandName.slice(1)` sees
    // one UTF-16 unit, so an astral leader passes through unchanged
    // (node: "𐐨bc"->"𐐨bc"); `capitalize_first` mirrors exactly that.
    let clean: String = crate::funcs::capitalize_first(raw);
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
            let path = bold_stringify_options(&sub.options);
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
                    .replace("${use}", &use_line),
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

/// Mirrors `!isNaN(Number(s))` exactly: empty/blank is 0 (valid) and the
/// rest follows the JS Number grammar pinned by the W6 slice 9 battery
/// (`funcs_resolve::is_number`: unsigned 0x/0b/0o legs, exact-case
/// Infinity trio, decimal+exponent scan). Note `parse::<f64>` alone is
/// wrong here: it accepts `nan`/`inf`/`infinity` (all NaN in TS) and
/// rejects `0b`/`0o` (both numeric in TS). Trim-set micro-edge inherited
/// from slice 9 (Rust trim also strips U+0085, JS does not).
fn is_js_number(s: &str) -> bool {
    s.trim().is_empty() || crate::funcs_resolve::is_number(s)
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
        // TS Number("") === 0 (valid); 0b/0o/Infinity valid, nan/inf invalid.
        "number" => {
            if is_js_number(value) {
                Shape::Valid
            } else {
                Shape::Invalid
            }
        }
        // TS: /^<@!?(\d+)>$/ on the RAW arg (no trim, no length floor),
        // then !isNaN(Number(arg)) (so "1e3"/"0b101" count, "" counts),
        // else username lookup.
        "user" => {
            let inner = value
                .strip_prefix("<@")
                .and_then(|s| s.strip_suffix('>'))
                .map(|s| s.strip_prefix('!').unwrap_or(s));
            mention_or_numeric(
                inner.map(is_all_digits).unwrap_or(false),
                is_js_number(value),
            )
        }
        // TS: /^<@&(\d+)>$/ on the RAW arg (<@&!..> never matches),
        // then Number leg, else role-name lookup.
        "roles" => mention_or_numeric(
            value.starts_with("<@&")
                && value.ends_with('>')
                && is_all_digits(&value[3..value.len() - 1]),
            is_js_number(value),
        ),
        // TS: /^<#(\d+)>$/ or /^\d+$/ on the RAW arg, then a live
        // cache.get ?? fetch + channel-type gate with name/fuzzy fallback
        // (Discord I/O: resolved by the live caller, like every other
        // GuildLookup). Pure shape keeps id-forms Valid without trimming.
        "channel" => mention_or_numeric(
            value.starts_with("<#")
                && value.ends_with('>')
                && is_all_digits(&value[2..value.len() - 1]),
            is_all_digits(value),
        ),
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
/// the error index, blank padding elsewhere. Widths are JS `String.length`
/// (UTF-16 units via [`crate::funcs::utf16_len`]) and the head pad keeps
/// `" ".padStart(n)` semantics (width `max(1, n)`, never empty).
pub fn error_position(
    bot_prefix: &str,
    full_command: &str,
    arg_tokens: &[String],
    error_index: usize,
) -> String {
    let head = (crate::funcs::utf16_len(bot_prefix) + crate::funcs::utf16_len(full_command)).max(1);
    let mut pos = " ".repeat(head);
    for (i, tok) in arg_tokens.iter().enumerate() {
        if i == error_index {
            pos.push_str(" ^");
        } else {
            pos.push_str(&" ".repeat(crate::funcs::utf16_len(tok) + 1));
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
/// first row with < 5 components that already holds a button
/// (TS `components.find((x) => x.type === ComponentType.Button)`
/// skips roomy rows with no button), else a new row is appended.
/// Each entry is `(component_count, has_button)`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactSlot {
    ExistingRow(usize),
    NewRow,
}

pub fn react_slot(rows: &[(usize, bool)]) -> Result<ReactSlot, &'static str> {
    if rows.len() >= 5 {
        return Err(TOO_MANY_COMPONENTS);
    }
    for (i, (n, has_button)) in rows.iter().enumerate() {
        if *n < 5 && *has_button {
            return Ok(ReactSlot::ExistingRow(i));
        }
    }
    Ok(ReactSlot::NewRow)
}

/// Minimal component ref for the unreact filter.
#[derive(Debug, Clone, PartialEq, Eq)]
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

/// Minimal derank role shape: only the `managed` / `position` / `id`
/// legs the filter reads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DerankRole {
    pub id: String,
    pub managed: bool,
    pub position: i64,
}

impl DerankRole {
    pub fn plain(id: &str, position: i64) -> Self {
        Self {
            id: id.to_string(),
            managed: false,
            position,
        }
    }

    pub fn managed(id: &str, position: i64) -> Self {
        Self {
            id: id.to_string(),
            managed: true,
            position,
        }
    }
}

/// Mirrors derank()'s `user_roles.find((x) => x.managed)`: the first
/// managed (app) role id, or None. The caller clamps its permissions
/// to ViewChannel only on `Some` (no-op else).
/// DELTA (doc-noted, unrepresentable): `user?.roles.cache.values() || []`
/// yields `[]` for a null user/member; the pure helper takes a slice.
pub fn derank_managed_app(roles: &[DerankRole]) -> Option<&str> {
    roles.iter().find(|r| r.managed).map(|r| r.id.as_str())
}

/// Mirrors derank()'s removal filter:
/// `!x.managed && x.position < meHighest && x.id !== everyoneId`
/// (strict `<`: an equal-position role survives; `@everyone` survives
/// even below the bot). Order-preserving.
/// DELTA (doc-noted, unrepresentable): `me?.roles.highest.position`
/// is `undefined` for a null bot member, making every `<` false (miss
/// all); the pure helper takes `me_highest: i64` directly.
pub fn derank_removable<'a>(
    roles: &'a [DerankRole],
    me_highest: i64,
    everyone_id: &str,
) -> Vec<&'a str> {
    roles
        .iter()
        .filter(|r| !r.managed && r.position < me_highest && r.id != everyone_id)
        .map(|r| r.id.as_str())
        .collect()
}

/// Mirrors derank()'s `reason || "Protection"`: missing AND empty
/// reasons fall back (falsy `||`, not just missing).
pub fn derank_reason(reason: Option<&str>) -> &str {
    match reason {
        Some(r) if !r.is_empty() => r,
        _ => DERANK_REASON_FALLBACK,
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

/// Mirrors method.ts changeVoiceChannelStatus request shape
/// (`PUT https://discord.com/api/v10/channels/${channelId}/voice-status`,
/// `Authorization: Bot <token>`, JSON body `{status}`, `res.status === 200`).
/// Delivery lives in lavalink.rs (`clear_voice_status` / `set_voice_status`
/// via serenity `edit_voice_status`); this owns the TS-exact pure legs.
/// The channel id interpolates verbatim (no encoding); the `${status}`
/// shorthand key keeps the literal `"status"` name.
pub fn voice_status_url(channel_id: &str) -> String {
    format!("https://discord.com/api/v10/channels/{channel_id}/voice-status")
}

/// Mirrors `JSON.stringify({ status })`: `{"status":"..."}` with full JSON
/// string escaping. `serde_json::to_string` agrees with `JSON.stringify`
/// on every valid-UTF8 input (short control escapes, `\u00XX` for other
/// C0, non-ASCII incl. astral passed through literally); lone surrogates
/// are unrepresentable in `&str` (TS emits `\uXXXX` there).
pub fn voice_status_body(status: &str) -> String {
    format!(
        "{{\"status\":{}}}",
        serde_json::to_string(status).unwrap_or_else(|_| "\"\"".to_string())
    )
}

/// Mirrors the strict `res.status === 200` verdict (201/204/4xx/5xx false).
pub fn voice_status_ok(http_status: u16) -> bool {
    http_status == 200
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
    fn stringify_empty_choices_matches_ts_truthiness() {
        // TS `if (o.choices)` is truthy on `[]`: an explicitly empty
        // choices array renders `""`, not the option name (node probe:
        // `{name:"x",choices:[]}` -> `""`, stringify -> `"[]"`).
        let opt = UsageOption {
            name: "x".to_string(),
            required: true,
            choices: Some(vec![]),
        };
        assert_eq!(stringify_options(&[opt.clone()]), "[]");
        assert_eq!(bold_stringify_options(&[opt]), "**`[]`**");
        // No `choices` key at all keeps the name.
        assert_eq!(stringify_options(&[UsageOption::new("y", false)]), "<y>");
    }

    #[test]
    fn stringify_bold_bracket_join_trim_match_ts() {
        // W6 slice 105 (node ground truth on method.ts stringifyOption /
        // boldStringifyOption verbatim): `[n]` when required, `<n>` when
        // the `required` key is missing/falsy, single-space join, trailing
        // separator eaten by `_.trim()` (Rust `join(" ")` never emits it),
        // `[]` for no options at all.
        let mixed = vec![UsageOption::new("a", true), UsageOption::new("b", false)];
        assert_eq!(stringify_options(&[]), "");
        assert_eq!(bold_stringify_options(&[]), "");
        assert_eq!(stringify_options(&[UsageOption::new("a", true)]), "[a]");
        assert_eq!(
            bold_stringify_options(&[UsageOption::new("a", true)]),
            "**`[a]`**"
        );
        assert_eq!(stringify_options(&mixed), "[a] <b>");
        assert_eq!(bold_stringify_options(&mixed), "**`[a]`** **`<b>`**");
        let three = vec![
            UsageOption::new("a", true),
            UsageOption::new("b", false),
            UsageOption::with_choices("m", true, &["x", "y"]),
        ];
        assert_eq!(stringify_options(&three), "[a] <b> [x/y]");
        assert_eq!(
            bold_stringify_options(&three),
            "**`[a]`** **`<b>`** **`[x/y]`**"
        );
        // Optional + explicit-empty choices renders `<>` (display name is
        // `""`, brackets still apply; node: `{choices:[]}` no-required leg).
        let empty_opt = UsageOption {
            name: "e".to_string(),
            required: false,
            choices: Some(vec![]),
        };
        assert_eq!(stringify_options(&[empty_opt.clone()]), "<>");
        assert_eq!(bold_stringify_options(&[empty_opt]), "**`<>`**");
        // Interior spaces survive; TS numeric choice values arrive
        // pre-stringified (live feeds are name strings, slice 27).
        let spaced = vec![
            UsageOption::new("a b", true),
            UsageOption::with_choices("n", true, &["1", "2.5"]),
        ];
        assert_eq!(stringify_options(&spaced), "[a b] [1/2.5]");
        assert_eq!(bold_stringify_options(&spaced), "**`[a b]`** **`[1/2.5]`**");
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
    fn awesome_embed_title_matches_ts_utf16_capitalize() {
        // W6 slice 41 (node ground truth): astral-first names pass through
        // TS `charAt(0).toUpperCase() + slice(1)` unchanged; ß expands.
        for (name, clean) in [
            ("ban", "Ban"),
            ("ttsjoin", "Ttsjoin"),
            ("\u{10428}bc", "\u{10428}bc"),
            ("\u{1f600}abc", "\u{1f600}abc"),
            ("ßabc", "SSabc"),
        ] {
            let e = awesome_embed(
                "en-US",
                name,
                None,
                "!",
                false,
                &[],
                &[],
                None,
                "d",
                None,
                "en-US",
                None,
            );
            assert_eq!(e.title, format!("{clean} Help Embed"));
        }
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
            options: vec![],
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
        // TS `use` is `${prefix}${name} ${path}` untrimmed: empty path
        // keeps the trailing space (node battery slice 100).
        assert_eq!(e.fields[0].value, "**Aliases:** `c`\n**Use:** !create ");
    }

    #[test]
    fn awesome_embed_subcommand_per_sub_options() {
        // Each row renders its OWN subcommand options (slice 100: the old
        // mirror reused the top-level list for every row).
        let subs = [
            SubCommandInfo {
                name: "create".to_string(),
                aliases: vec!["c".to_string()],
                options: vec![UsageOption::new("member", true)],
            },
            SubCommandInfo {
                name: "list".to_string(),
                aliases: vec![],
                options: vec![],
            },
        ];
        let e = awesome_embed(
            "en-US",
            "ticket",
            None,
            "!",
            false,
            &[],
            &[UsageOption::new("top", false)],
            None,
            "",
            None,
            "en-US",
            Some(&subs),
        );
        assert_eq!(e.fields.len(), 2);
        assert_eq!(
            e.fields[0].value,
            "**Aliases:** `c`\n**Use:** !create **`[member]`**"
        );
        assert_eq!(e.fields[0].name, "!create");
        assert_eq!(e.fields[1].name, "!list");
        assert!(e.fields[1].value.starts_with("**Aliases:** None"));
        assert!(e.fields[1].value.ends_with("**Use:** !list "));
    }

    #[test]
    fn subcommand_discriminants_match_ts_some_legs() {
        // Pinned via node battery slice 102 (discord.js 14.27):
        // Subcommand=1, Group=2; `!options` -> false; `.some()` verdicts.
        use super::{has_sub_command, has_sub_command_group, is_sub_command};
        use super::{OPTION_SUBCOMMAND, OPTION_SUBCOMMAND_GROUP};
        assert_eq!((OPTION_SUBCOMMAND, OPTION_SUBCOMMAND_GROUP), (1, 2));
        assert!(!has_sub_command(None));
        assert!(!has_sub_command(Some(&[])));
        assert!(has_sub_command(Some(&[OPTION_SUBCOMMAND])));
        assert!(!has_sub_command(Some(&[OPTION_SUBCOMMAND_GROUP])));
        assert!(has_sub_command(Some(&[3, OPTION_SUBCOMMAND])));
        assert!(!has_sub_command_group(None));
        assert!(!has_sub_command_group(Some(&[])));
        assert!(has_sub_command_group(Some(&[OPTION_SUBCOMMAND_GROUP])));
        assert!(!has_sub_command_group(Some(&[OPTION_SUBCOMMAND])));
        assert!(is_sub_command(OPTION_SUBCOMMAND));
        assert!(!is_sub_command(OPTION_SUBCOMMAND_GROUP));
        assert!(!is_sub_command(3));
    }

    #[test]
    fn find_option_recursively_matches_ts_dfs_legs() {
        // Pinned via node battery slice 103 (verbatim TS replica):
        // pre-order DFS, strict name match, descent gated on type 1/2.
        use super::{find_option_recursively, FindOption};
        use super::{OPTION_SUBCOMMAND, OPTION_SUBCOMMAND_GROUP};
        const STR: u8 = 3;
        let show = |v: Option<&FindOption>| {
            v.map(|o| format!("{}:{}", o.name, o.option_type))
                .unwrap_or_else(|| "MISS".to_string())
        };
        assert_eq!(
            show(find_option_recursively(&[FindOption::leaf("q", STR)], "q")),
            "q:3"
        );
        assert_eq!(
            show(find_option_recursively(
                &[FindOption::branch(
                    "mod",
                    OPTION_SUBCOMMAND,
                    vec![FindOption::leaf("ban", STR)]
                )],
                "ban"
            )),
            "ban:3"
        );
        assert_eq!(
            show(find_option_recursively(
                &[FindOption::branch(
                    "g",
                    OPTION_SUBCOMMAND_GROUP,
                    vec![FindOption::branch(
                        "s",
                        OPTION_SUBCOMMAND,
                        vec![FindOption::leaf("deep", STR)]
                    )]
                )],
                "deep"
            )),
            "deep:3"
        );
        // Children of a String-typed option are never descended into.
        assert_eq!(
            show(find_option_recursively(
                &[FindOption::branch(
                    "w",
                    STR,
                    vec![FindOption::leaf("hid", STR)]
                )],
                "hid"
            )),
            "MISS"
        );
        assert_eq!(
            show(find_option_recursively(
                &[FindOption::branch(
                    "a",
                    OPTION_SUBCOMMAND,
                    vec![FindOption::leaf("b", STR)]
                )],
                "zzz"
            )),
            "MISS"
        );
        assert_eq!(show(find_option_recursively(&[], "x")), "MISS");
        // `Some([])` recurses like the truthy empty array, then continues.
        assert_eq!(
            show(find_option_recursively(
                &[
                    FindOption::branch("e", OPTION_SUBCOMMAND, vec![]),
                    FindOption::leaf("t", STR),
                ],
                "t"
            )),
            "t:3"
        );
        // Pre-order: top-level match beats a deeper duplicate.
        assert_eq!(
            show(find_option_recursively(
                &[
                    FindOption::leaf("dup", STR),
                    FindOption::branch(
                        "g",
                        OPTION_SUBCOMMAND_GROUP,
                        vec![FindOption::leaf("dup", STR)]
                    ),
                ],
                "dup"
            )),
            "dup:3"
        );
        // Earlier sibling subtree beats a later one.
        assert_eq!(
            show(find_option_recursively(
                &[
                    FindOption::branch(
                        "g1",
                        OPTION_SUBCOMMAND_GROUP,
                        vec![FindOption::leaf("dup", 3)]
                    ),
                    FindOption::branch(
                        "g2",
                        OPTION_SUBCOMMAND_GROUP,
                        vec![FindOption::leaf("dup", 4)]
                    ),
                ],
                "dup"
            )),
            "dup:3"
        );
        // Strict (`===`) name match: case differs, no hit.
        assert_eq!(
            show(find_option_recursively(
                &[FindOption::leaf("ban", STR)],
                "Ban"
            )),
            "MISS"
        );
        // Group without an `options` key skips descent, siblings continue.
        assert_eq!(
            show(find_option_recursively(
                &[
                    FindOption::leaf("g", OPTION_SUBCOMMAND_GROUP),
                    FindOption::leaf("t", STR),
                ],
                "t"
            )),
            "t:3"
        );
        // The group option itself matches by name.
        assert_eq!(
            show(find_option_recursively(
                &[FindOption::branch(
                    "g",
                    OPTION_SUBCOMMAND_GROUP,
                    vec![FindOption::leaf("x", STR)]
                )],
                "g"
            )),
            "g:2"
        );
        assert_eq!(
            show(find_option_recursively(
                &[
                    FindOption::branch(
                        "g",
                        OPTION_SUBCOMMAND_GROUP,
                        vec![FindOption::leaf("no", STR)]
                    ),
                    FindOption::leaf("want", OPTION_SUBCOMMAND),
                ],
                "want"
            )),
            "want:1"
        );
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
    fn check_shape_matches_ts_is_valid_argument_quirks() {
        // Number leg mirrors !isNaN(Number(arg)) (node ground truth):
        // radix + Infinity trio valid, Rust-parse-only spellings invalid,
        // empty/blank valid like Number("") === 0.
        assert_eq!(check_shape("number", "0b101"), Shape::Valid);
        assert_eq!(check_shape("number", "0o17"), Shape::Valid);
        assert_eq!(check_shape("number", "0B101"), Shape::Valid);
        assert_eq!(check_shape("number", "Infinity"), Shape::Valid);
        assert_eq!(check_shape("number", ""), Shape::Valid);
        assert_eq!(check_shape("number", " "), Shape::Valid);
        assert_eq!(check_shape("number", "nan"), Shape::Invalid);
        assert_eq!(check_shape("number", "inf"), Shape::Invalid);
        assert_eq!(check_shape("number", "infinity"), Shape::Invalid);
        assert_eq!(check_shape("number", "0x"), Shape::Invalid);
        assert_eq!(check_shape("number", "1_2"), Shape::Invalid);
        assert_eq!(check_shape("number", "0b102"), Shape::Invalid);
        // User mention is tested on the RAW arg: no trim, no length floor.
        assert_eq!(check_shape("user", "<@1>"), Shape::Valid);
        assert_eq!(check_shape("user", "<@!1>"), Shape::Valid);
        assert_eq!(check_shape("user", " <@123> "), Shape::GuildLookup);
        assert_eq!(check_shape("user", ""), Shape::Valid);
        assert_eq!(check_shape("user", "0b101"), Shape::Valid);
        assert_eq!(check_shape("user", "nan"), Shape::GuildLookup);
        // Roles mention likewise raw; <@&!..> never matches either side.
        assert_eq!(check_shape("roles", " <@&123> "), Shape::GuildLookup);
        assert_eq!(check_shape("roles", "<@&!123>"), Shape::GuildLookup);
        assert_eq!(check_shape("roles", "0o17"), Shape::Valid);
        // Channel mention/id likewise raw (cache/type-gate stays live-side).
        assert_eq!(check_shape("channel", "<#1>"), Shape::Valid);
        assert_eq!(check_shape("channel", " <#123>"), Shape::GuildLookup);
        assert_eq!(check_shape("channel", " 123"), Shape::GuildLookup);
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
    fn error_position_matches_ts_utf16_widths() {
        // Node ground truth (method.ts sendErrorMessage): "😀".length is 2
        // UTF-16 units, and " ".padStart(0) keeps one space (never empty).
        let emoji_tokens: Vec<String> = vec!["[😀]".to_string()];
        assert_eq!(error_position("😀", "ban", &emoji_tokens, 1), "          ");
        let empty_tokens: Vec<String> = vec!["[a]".to_string()];
        assert_eq!(error_position("", "", &empty_tokens, 0), "  ^");
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
        assert_eq!(
            react_slot(&[(5, true), (5, true), (5, true), (5, true), (5, true)]),
            Err(TOO_MANY_COMPONENTS)
        );
        // 5 rows throw even when the last row has room.
        assert_eq!(
            react_slot(&[(1, true), (1, true), (1, true), (1, true), (2, true)]),
            Err(TOO_MANY_COMPONENTS)
        );
        assert_eq!(
            react_slot(&[(5, true), (2, true)]),
            Ok(ReactSlot::ExistingRow(1))
        );
        assert_eq!(react_slot(&[(5, true), (5, true)]), Ok(ReactSlot::NewRow));
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
    fn react_slot_and_unreact_match_ts_battery() {
        // Slot rule, mirroring the node battery 1:1 ((count, has_button)).
        assert_eq!(react_slot(&[]), Ok(ReactSlot::NewRow));
        assert_eq!(react_slot(&[(2, true)]), Ok(ReactSlot::ExistingRow(0)));
        // Roomy row with NO button is skipped: TS falls to the next row.
        assert_eq!(
            react_slot(&[(2, false), (1, true)]),
            Ok(ReactSlot::ExistingRow(1))
        );
        // Only no-button rows -> new row (old counts-only shape said row 0).
        assert_eq!(react_slot(&[(3, false)]), Ok(ReactSlot::NewRow));
        assert_eq!(
            react_slot(&[(1, false), (5, true), (1, true)]),
            Ok(ReactSlot::ExistingRow(2))
        );
        assert_eq!(
            react_slot(&[(5, true), (5, true), (5, true), (5, true)]),
            Ok(ReactSlot::NewRow)
        );
        fn b(e: Option<&str>) -> CompRef {
            CompRef {
                is_button: true,
                emoji_id: e.map(|s| s.to_string()),
            }
        }
        fn s() -> CompRef {
            CompRef {
                is_button: false,
                emoji_id: None,
            }
        }
        // Unreact filter legs.
        let (kept, removed) = unreact_rows(vec![vec![b(None), b(Some("a"))]], "a");
        assert!(removed && kept == vec![vec![b(None)]]);
        let (kept, removed) = unreact_rows(vec![vec![s()]], "a");
        assert!(!removed && kept == vec![vec![s()]]);
        let (kept, removed) = unreact_rows(vec![], "a");
        assert!(!removed && kept.is_empty());
        let (kept, removed) = unreact_rows(vec![vec![b(Some(""))]], "");
        assert!(removed && kept.is_empty());
        let (kept, removed) = unreact_rows(vec![vec![b(Some("a"))], vec![b(Some("a")), s()]], "a");
        assert!(removed && kept == vec![vec![s()]]);
    }

    #[test]
    fn derank_legs_match_ts_filter_legs() {
        // Pinned via node battery slice 131 (verbatim derank() legs):
        // find-first-managed, strict-`<` filter, everyone exclusion,
        // `reason || "Protection"` falsy fallback.
        use super::{derank_managed_app, derank_reason, derank_removable, DerankRole};
        let roles = vec![
            DerankRole::plain("1", 5),
            DerankRole::plain("2", 15),
            DerankRole::managed("3", 1),
        ];
        assert_eq!(derank_removable(&roles, 10, "0"), vec!["1"]);
        // Strict `<`: equal position survives.
        assert_eq!(
            derank_removable(&[DerankRole::plain("1", 10)], 10, "0"),
            Vec::<&str>::new()
        );
        // @everyone survives even below the bot.
        assert_eq!(
            derank_removable(&[DerankRole::plain("0", 1)], 10, "0"),
            Vec::<&str>::new()
        );
        assert_eq!(derank_removable(&[], 10, "0"), Vec::<&str>::new());
        // Order-preserving.
        let ordered = vec![DerankRole::plain("b", 1), DerankRole::plain("a", 2)];
        assert_eq!(derank_removable(&ordered, 10, "0"), vec!["b", "a"]);
        // First managed wins.
        assert_eq!(derank_managed_app(&roles), Some("3"));
        assert_eq!(
            derank_managed_app(&[DerankRole::managed("1", 5), DerankRole::managed("2", 1)]),
            Some("1")
        );
        assert_eq!(derank_managed_app(&[DerankRole::plain("1", 5)]), None);
        assert_eq!(derank_managed_app(&[]), None);
        // Falsy `||`: missing AND empty fall back, whitespace kept.
        assert_eq!(derank_reason(None), "Protection");
        assert_eq!(derank_reason(Some("")), "Protection");
        assert_eq!(derank_reason(Some("Spam")), "Spam");
        assert_eq!(derank_reason(Some(" ")), " ");
    }

    #[test]
    fn voice_status_legs_match_ts_request_shape() {
        // Pinned via node battery slice 132 (verbatim changeVoiceChannelStatus
        // legs): template-literal URL, JSON.stringify body, strict-200 verdict.
        use super::{voice_status_body, voice_status_ok, voice_status_url};
        assert_eq!(
            voice_status_url("123456789012345678"),
            "https://discord.com/api/v10/channels/123456789012345678/voice-status"
        );
        assert_eq!(
            voice_status_url(""),
            "https://discord.com/api/v10/channels//voice-status"
        );
        // Live payloads: trackStart line + queueEnd clear.
        assert_eq!(
            voice_status_body(":musical_note: Title - Author"),
            "{\"status\":\":musical_note: Title - Author\"}"
        );
        assert_eq!(voice_status_body(""), "{\"status\":\"\"}");
        // JSON escaping agrees with JSON.stringify on every valid-UTF8 input.
        assert_eq!(
            voice_status_body("a\"b\\c\nd\te\x08f\x0Cg"),
            "{\"status\":\"a\\\"b\\\\c\\nd\\te\\bf\\fg\"}"
        );
        assert_eq!(
            voice_status_body("héllo wörld 🔑"),
            "{\"status\":\"héllo wörld 🔑\"}"
        );
        // Strict `=== 200`: 201/204/4xx/5xx all false.
        assert!(voice_status_ok(200));
        for s in [0u16, 201, 204, 400, 401, 403, 404, 429, 500] {
            assert!(!voice_status_ok(s));
        }
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

    #[test]
    fn argument_option_type_labels_match_ts_switch_legs() {
        // Pinned via node battery slice 104 (discord.js 14.27 discriminants
        // replicated verbatim): strict switch, no coercion.
        use super::{
            argument_option_type, argument_option_type_with_options, OPTION_TYPE_ATTACHMENT,
            OPTION_TYPE_CHANNEL, OPTION_TYPE_INTEGER, OPTION_TYPE_NUMBER, OPTION_TYPE_ROLE,
            OPTION_TYPE_STRING, OPTION_TYPE_USER,
        };
        assert_eq!(
            (
                OPTION_TYPE_STRING,
                OPTION_TYPE_INTEGER,
                OPTION_TYPE_USER,
                OPTION_TYPE_CHANNEL,
                OPTION_TYPE_ROLE,
                OPTION_TYPE_NUMBER,
                OPTION_TYPE_ATTACHMENT
            ),
            (3, 4, 6, 7, 8, 10, 11)
        );
        assert_eq!(argument_option_type(3), "string");
        assert_eq!(argument_option_type(4), "number");
        assert_eq!(argument_option_type(10), "number");
        assert_eq!(argument_option_type(6), "user");
        assert_eq!(argument_option_type(7), "channel");
        assert_eq!(argument_option_type(8), "roles");
        assert_eq!(argument_option_type(11), "attachment");
        // Subcommand=1, Group=2, Boolean=5, Mentionable=9 fall to unknown.
        for t in [0u8, 1, 2, 5, 9, 12, 99, 255] {
            assert_eq!(argument_option_type(t), "unknown");
        }
        let s = |v: &[&str]| v.iter().map(|x| x.to_string()).collect::<Vec<_>>();
        // Choices leg joins values with `/`, even a single one.
        assert_eq!(
            argument_option_type_with_options(Some(&s(&["a", "b"])), 3),
            "a/b"
        );
        assert_eq!(
            argument_option_type_with_options(Some(&s(&["1", "2"])), 10),
            "1/2"
        );
        // `choices: []` is truthy in TS -> `""`, not the type label.
        assert_eq!(argument_option_type_with_options(Some(&s(&[])), 3), "");
        // No `choices` key -> type label.
        assert_eq!(argument_option_type_with_options(None, 3), "string");
        assert_eq!(argument_option_type_with_options(None, 6), "user");
        assert_eq!(argument_option_type_with_options(None, 9), "unknown");
    }
}
