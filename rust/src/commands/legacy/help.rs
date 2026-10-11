// ---- /help main menu + module menus (guild language) ----
// Mirrors src/Interaction/HybridCommands/bot/help.ts: the tip-embed main
// menu (help_tip_embed + 2 select rows with back_to_menu +
// per-category options) and the per-module menus (8 fields / 4000 chars
// per page). Every string resolves via lang::get in the guild language
// with the exact en-US value as fallback (never hardcoded primary).

/// Exact src/lang/en-US.yml values, used ONLY as fallbacks.
pub const HELP_TIP_EMBED_FALLBACK: &str = "```${client.user?.username} ・ Help Menu```\n${client.iHorizon_Emojis.Pin} ・ **${categories.length}** available Command Categories\n${client.iHorizon_Emojis.Slash_Bot_Badge} ・ **${client.content.filter(c => c.messageCmd === false).length}** available Slash Commands\n${client.iHorizon_Emojis.Crown} ・ **Created by** <@${config.owner.ownerid1}>, <@${config.owner.ownerid2}>\n\n```Do you know ? ・ Tips```\n${client.iHorizon_Emojis.VC_Region} ・ ${client.user?.username} is **100% multilingual**\n${client.iHorizon_Emojis.Slash_Bot_Badge} ・ `/setlang language:Japanese`";
pub const HELP_SELECT_MENU_FALLBACK: &str = "Make a selection!";
pub const HELP_FIELDS_DESC_FALLBACK: &str = "${categories[index].value.length} Commands";
pub const HELP_BACK_TO_MENU_FALLBACK: &str = "Main menu";
pub const HELP_BACK_TO_MENU_DESC_FALLBACK: &str = "Go back to initial menu";
pub const VAR_ROLES_FALLBACK: &str = "Roles";
pub const VAR_MEMBER_FALLBACK: &str = "Members";

/// Guild-language lookup with exact en-US fallback.
pub fn help_text(code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
}

/// Select placeholder (help_select_menu).
pub fn help_select_placeholder(code: &str) -> String {
    help_text(code, "help_select_menu", HELP_SELECT_MENU_FALLBACK)
}

/// Per-category option description (help_select_menu_fields_desc).
/// Mirrors `.replace("${categories[index].value.length}", count)`.
pub fn help_option_desc(code: &str, count: usize) -> String {
    help_text(
        code,
        "help_select_menu_fields_desc",
        HELP_FIELDS_DESC_FALLBACK,
    )
    .replacen("${categories[index].value.length}", &count.to_string(), 1)
}

/// Back-to-menu option label + description.
pub fn help_back_option(code: &str) -> (String, String) {
    (
        help_text(code, "help_back_to_menu", HELP_BACK_TO_MENU_FALLBACK),
        help_text(
            code,
            "help_back_to_menu_desc",
            HELP_BACK_TO_MENU_DESC_FALLBACK,
        ),
    )
}

/// Categories per select row. Mirrors `Math.ceil(len / 2)` (two rows).
pub fn help_menus_split(total: usize) -> usize {
    total.div_ceil(2).max(1)
}

/// /help overview select protocol. Mirrors HybridCommands/bot/help.ts:455-489:
/// two selects with verbatim custom ids `help-menu-1` / `help-menu-2`, a
/// leading back option (value `back`), then one option per category sorted
/// by name whose value is the category INDEX (`index.to_string()`).
/// Separate from the `h`-browser protocol (`HELP_SELECT_PREFIX` +
/// title-derived keys): the handler routes these ids to the overview
/// path (index picks + back navigation).
pub const HELP_OVERVIEW_SELECT_1: &str = "help-menu-1";
pub const HELP_OVERVIEW_SELECT_2: &str = "help-menu-2";
pub const HELP_OVERVIEW_BACK_VALUE: &str = "back";

/// True for the two /help overview select ids.
pub fn is_help_overview_select(id: &str) -> bool {
    id == HELP_OVERVIEW_SELECT_1 || id == HELP_OVERVIEW_SELECT_2
}

/// Parsed overview select value: `back` re-opens the overview, a number
/// is the index into the name-sorted category list, anything else is
/// unreachable (TS `parseInt` NaN branch).
pub enum HelpOverviewPick {
    Back,
    Category(usize),
    Unknown,
}

pub fn parse_help_overview_pick(value: &str) -> HelpOverviewPick {
    if value == HELP_OVERVIEW_BACK_VALUE {
        HelpOverviewPick::Back
    } else if let Ok(index) = value.parse::<usize>() {
        HelpOverviewPick::Category(index)
    } else {
        HelpOverviewPick::Unknown
    }
}

/// Sort browser categories by display name. Mirrors
/// `categories.sort((a, b) => a.name.localeCompare(b.name))` (byte order
/// instead of locale collation; `title` is the localized placeholder,
/// i.e. the TS `name`).
pub fn sort_help_cats_by_name(cats: &mut [super::HelpBrowserCat]) {
    cats.sort_by(|a, b| a.title.cmp(&b.title));
}

/// One overview select option (pure part of the row builder).
pub struct HelpOverviewOption {
    pub label: String,
    pub description: String,
    pub value: String,
    pub emoji_name: String,
}

/// Overview options for one row slice: back first, then the categories in
/// the slice with GLOBAL indices as values (TS `index.to_string()` keeps
/// incrementing across both menus) and per-category command-count
/// descriptions (`help_select_menu_fields_desc`).
pub fn help_overview_options<C: OverviewCat>(
    code: &str,
    cats: &[C],
    range: std::ops::Range<usize>,
) -> Vec<HelpOverviewOption> {
    let mut out = Vec::new();
    let (back_label, back_desc) = help_back_option(code);
    out.push(HelpOverviewOption {
        label: back_label,
        description: back_desc,
        value: HELP_OVERVIEW_BACK_VALUE.to_string(),
        emoji_name: "Home".to_string(),
    });
    for (index, cat) in cats.iter().enumerate().filter(|(i, _)| range.contains(i)) {
        out.push(HelpOverviewOption {
            label: cat.ov_title().to_string(),
            description: help_option_desc(code, cat.ov_count()),
            value: index.to_string(),
            emoji_name: cat.ov_emoji().to_string(),
        });
    }
    out
}

/// Rendered overview category page (pure part of the index-pick path).
/// Mirrors the TS select branch title (`emoji・name`), description, and
/// the 25-field cap with a `+N more` tail (TS paginates with buttons;
/// no button-pagination hook exists in this port, so the tail stands in).
pub struct OverviewCategoryPage {
    pub title: String,
    pub description: String,
    pub fields: Vec<(String, String)>,
}

pub fn help_overview_category_page(
    emoji_markup: &str,
    title: &str,
    desc: &str,
    fields: &[(String, String)],
) -> OverviewCategoryPage {
    let title = if emoji_markup.is_empty() {
        title.to_string()
    } else {
        format!("{emoji_markup}・{title}")
    };
    let overflow = fields.len().saturating_sub(25);
    let mut description = desc.to_string();
    if overflow > 0 {
        description.push_str(&format!("\n... +{overflow} more"));
    }
    OverviewCategoryPage {
        title,
        description,
        fields: fields.iter().take(25).cloned().collect(),
    }
}

/// Tip-embed description (help_tip_embed + replaceAll chain).
/// Mirrors handleCategorySelect back-branch + main menu (help.ts:111-164,
/// 497-541), including the TS quirk that the slash-command token is
/// filled with the TOTAL content length.
#[allow(clippy::too_many_arguments)]
pub fn help_tip_embed(
    code: &str,
    bot_name: &str,
    cat_count: usize,
    content_len: usize,
    owner1: &str,
    owner2: &str,
    pin: &str,
    badge: &str,
    crown: &str,
    region: &str,
) -> String {
    help_text(code, "help_tip_embed", HELP_TIP_EMBED_FALLBACK)
        .replace("${client.user?.username}", bot_name)
        .replace("${client.iHorizon_Emojis.Pin}", pin)
        .replace("${categories.length}", &cat_count.to_string())
        .replace(
            "${client.content.filter(c => c.messageCmd === false).length}",
            &content_len.to_string(),
        )
        .replace("${client.iHorizon_Emojis.Slash_Bot_Badge}", badge)
        .replace("${client.iHorizon_Emojis.Crown}", crown)
        .replace("${config.owner.ownerid1}", owner1)
        .replace("${config.owner.ownerid2}", owner2)
        .replace("${client.iHorizon_Emojis.VC_Region}", region)
}

/// One command row for a module menu. Mirrors client.content entries
/// (cmd/prefixCmd/desc/desc_localized/messageCmd) + UTILS.PERMS state.
pub struct HelpModuleCmd<'a> {
    pub cmd: &'a str,
    pub prefix_cmd: Option<&'a str>,
    pub desc: &'a str,
    pub desc_fr: Option<&'a str>,
    pub desc_ja: Option<&'a str>,
    pub desc_ru: Option<&'a str>,
    pub desc_es: Option<&'a str>,
    /// 0 slash, 1 message, 2 hybrid (TS messageCmd).
    pub message_cmd: u8,
    /// None = no UTILS.PERMS entry (open + Unlock).
    pub perm: Option<HelpPermState>,
}

pub struct HelpPermState {
    pub level: u8,
    pub roles: usize,
    pub users: usize,
}

/// Lock/Unlock state prefix. Mirrors help.ts:197-218 (role/user counts
/// override the level text; leading space kept on those branches).
pub fn help_cmd_states(
    perm: Option<&HelpPermState>,
    lock: &str,
    unlock: &str,
    code: &str,
) -> String {
    let Some(p) = perm else {
        return unlock.to_string();
    };
    let roles = help_text(code, "var_roles", VAR_ROLES_FALLBACK);
    let member = help_text(code, "var_member", VAR_MEMBER_FALLBACK);
    if p.roles > 0 && p.users > 0 {
        return format!(" {lock} ({} {roles}) ({} {member})", p.roles, p.users);
    }
    if p.roles > 0 {
        return format!(" {lock} ({} {roles})", p.roles);
    }
    if p.users > 0 {
        return format!(" {lock} ({} {member})", p.users);
    }
    if p.level > 0 {
        return format!("{lock} {}", p.level);
    }
    unlock.to_string()
}

/// Field name for one command. Mirrors help.ts:220-244 (slash / message
/// / hybrid x mention / prefix). `cleaned` = prefixCmd || cmd.
#[allow(clippy::too_many_arguments)]
pub fn help_cmd_prefix(
    message_cmd: u8,
    states: &str,
    cmd: &str,
    cleaned: &str,
    bot_prefix: &str,
    is_mention: bool,
    msg_emoji: &str,
    slash_emoji: &str,
) -> String {
    match message_cmd {
        // Slash command.
        0 => format!("{states}\n・{slash_emoji} **/{cmd}**"),
        // Message command.
        1 if is_mention => format!("{states}\n・{msg_emoji} **@Ping-Me {cleaned}**"),
        1 => format!("{states}\n・{msg_emoji} **{bot_prefix}{cleaned}**"),
        // Hybrid command.
        2 if is_mention => {
            format!("{states}\n・{msg_emoji} (@Ping-Me) {cleaned}\n≠{slash_emoji} **{cleaned}**")
        }
        2 => format!("{states}\n・{msg_emoji} {bot_prefix}{cleaned} \n・{slash_emoji} **/{cmd}**"),
        _ => format!("{states}\n・**{cmd}**"),
    }
}

/// Localized description. Mirrors help.ts:246-262 (guild LANG code ->
/// desc_localized, else desc).
pub fn help_local_desc<'a>(guild_lang: &str, entry: &'a HelpModuleCmd<'a>) -> &'a str {
    match guild_lang {
        "fr-FR" | "fr-ME" => entry.desc_fr.unwrap_or(entry.desc),
        "jp-JP" => entry.desc_ja.unwrap_or(entry.desc),
        "ru-RU" => entry.desc_ru.unwrap_or(entry.desc),
        "es-ES" => entry.desc_es.unwrap_or(entry.desc),
        _ => entry.desc,
    }
}

/// JS string length (UTF-16 units) for the 4000-char page budget.
fn js_len(s: &str) -> usize {
    s.encode_utf16().count()
}

/// One rendered field: name = cmdPrefix, value = `-# **┖ desc**`.
/// Billable length mirrors `cmdPrefix.length + descValue.length`.
#[allow(clippy::too_many_arguments)]
pub fn help_module_field(
    message_cmd: u8,
    states: &str,
    entry: &HelpModuleCmd<'_>,
    guild_lang: &str,
    bot_prefix: &str,
    is_mention: bool,
    msg_emoji: &str,
    slash_emoji: &str,
) -> (String, String, usize) {
    let cleaned = entry.prefix_cmd.unwrap_or(entry.cmd);
    let name = help_cmd_prefix(
        message_cmd,
        states,
        entry.cmd,
        cleaned,
        bot_prefix,
        is_mention,
        msg_emoji,
        slash_emoji,
    );
    let desc = help_local_desc(guild_lang, entry);
    let billable = js_len(&name) + js_len(desc);
    (name, format!("-# **┖ {desc}**"), billable)
}

/// Split fields into pages (8 fields or 4000 chars each).
/// Mirrors help.ts:266-296.
pub fn help_module_pages(fields: Vec<(String, String, usize)>) -> Vec<Vec<(String, String)>> {
    let mut pages: Vec<Vec<(String, String)>> = Vec::new();
    let mut current: Vec<(String, String)> = Vec::new();
    let mut len = 0usize;
    let mut count = 0usize;
    for (name, value, billable) in fields {
        if count >= 8 || len + billable > 4000 {
            pages.push(std::mem::take(&mut current));
            len = 0;
            count = 0;
        }
        current.push((name, value));
        len += billable;
        count += 1;
    }
    if count > 0 {
        pages.push(current);
    }
    pages
}

/// Module menu title. Mirrors `` `${category.emoji}・${category.name}` ``.
pub fn help_module_title(emoji: &str, name: &str) -> String {
    format!("{emoji}・{name}")
}

/// Top-level commands whose TS source lives under
/// src/Interaction/SlashCommands (slash-only in TS): the parent keeps
/// its own content entry (messageCmd 0) and every leaf renders slash.
/// Hybrid-file parents contribute their leaves only (no parent entry),
/// exactly like loadHybridCommands (parent entry only when the top has
/// no subcommand).
pub const SLASH_FILE_TOPS: &[&str] = &[
    "allowlist",
    "authrestore",
    "automod",
    "blogger",
    "guildconfig",
    "honeypot",
    "join-ghostping",
    "lastfm",
    "notifier",
    "perm",
    "protect",
    "punishpub",
    "report",
    "rolesaver",
    "voice",
];

/// One help content entry. Mirrors a client.content row (cmd /
/// prefixCmd / desc / desc_localized / messageCmd): `qualified` is the
/// TS fullName (`parent sub`, space-joined), `prefix_cleaned` the TS
/// prefixCmd (prefixName || leaf name), `message_cmd` 0 slash / 1
/// message / 2 hybrid.
pub struct HelpLeafOwned {
    pub qualified: String,
    pub prefix_cleaned: String,
    pub desc: String,
    pub desc_fr: Option<String>,
    pub desc_ja: Option<String>,
    pub desc_ru: Option<String>,
    pub desc_es: Option<String>,
    pub message_cmd: u8,
}

/// One browser category with its content leaves (TS category.value).
pub struct HelpCategoryOwned {
    pub name: String,
    pub title: String,
    pub desc: String,
    pub color: u32,
    pub emoji_name: String,
    pub leaves: Vec<HelpLeafOwned>,
}

fn leaf_message_cmd(has_slash: bool, has_prefix: bool) -> u8 {
    match (has_slash, has_prefix) {
        (true, false) => 0,
        (false, true) => 1,
        _ => 2,
    }
}

fn push_leaf<D, E>(
    cmd: &poise::Command<D, E>,
    qualified: String,
    message_cmd: u8,
    out: &mut Vec<HelpLeafOwned>,
) {
    if cmd.context_menu_action.is_some() {
        return;
    }
    let loc = |k: &str| cmd.description_localizations.get(k).cloned();
    out.push(HelpLeafOwned {
        prefix_cleaned: crate::commands::shared::prefix_name_for(&qualified)
            .map(str::to_string)
            .unwrap_or_else(|| cmd.name.clone()),
        qualified,
        desc: cmd.description.clone().unwrap_or_default(),
        desc_fr: loc("fr"),
        desc_ja: loc("ja"),
        desc_ru: loc("ru"),
        desc_es: loc("es-ES"),
        message_cmd,
    });
}

fn walk_leaves<D, E>(
    top_category: &str,
    cmd: &poise::Command<D, E>,
    path: &str,
    slash_file: bool,
    out: &mut Vec<HelpLeafOwned>,
) {
    let _ = top_category;
    let qualified = if path.is_empty() {
        cmd.name.clone()
    } else {
        format!("{path} {}", cmd.name)
    };
    let has_slash = cmd.slash_action.is_some();
    let has_prefix = cmd.prefix_action.is_some();
    if cmd.subcommands.is_empty() {
        if !has_slash && !has_prefix {
            return;
        }
        let kind = if slash_file {
            0
        } else {
            leaf_message_cmd(has_slash, has_prefix)
        };
        push_leaf(cmd, qualified, kind, out);
        return;
    }
    // Parent with subcommands: slash-file tops keep their own entry
    // (TS slash loader always pushes the top), hybrid parents do not.
    if slash_file && has_slash {
        push_leaf(cmd, qualified.clone(), 0, out);
    }
    for sub in &cmd.subcommands {
        walk_leaves(top_category, sub, &qualified, slash_file, out);
    }
}

/// Collect browser categories from the registry. Mirrors the
/// client.category/client.content loop in help.ts + the three loaders:
/// one entry per content leaf (subcommand leaves + subcommand-less
/// tops; slash-file parents keep their own entry), grouped by the
/// top-level category, skipping table-unknown categories and
/// context-menu nodes.
pub fn collect_help_leaves<D, E>(
    commands: &[poise::Command<D, E>],
    table: &[(&str, &str, &str, &str, u32)],
    title_of: &dyn Fn(&str) -> String,
) -> Vec<HelpCategoryOwned> {
    let mut out = Vec::new();
    for (name, desc_key, placeholder_key, emoji_name, color) in table {
        let mut leaves = Vec::new();
        for top in commands
            .iter()
            .filter(|c| c.category.as_deref() == Some(*name))
        {
            walk_leaves(
                name,
                top,
                "",
                SLASH_FILE_TOPS.contains(&top.name.as_str()),
                &mut leaves,
            );
        }
        if leaves.is_empty() {
            continue;
        }
        out.push(HelpCategoryOwned {
            name: name.to_string(),
            title: title_of(placeholder_key),
            desc: title_of(desc_key),
            color: *color,
            emoji_name: emoji_name.to_string(),
            leaves,
        });
    }
    out
}

/// Sort leaf categories by display name (TS localeCompare on the
/// localized placeholder).
pub fn sort_help_leaf_cats_by_name(cats: &mut [HelpCategoryOwned]) {
    cats.sort_by(|a, b| a.title.cmp(&b.title));
}

/// Overview select source: display title + emoji + entry count.
/// Implemented by both the legacy browser cat (fields count) and the
/// leaf category (leaves count) so the overview rows stay identical.
pub trait OverviewCat {
    fn ov_title(&self) -> &str;
    fn ov_emoji(&self) -> &str;
    fn ov_count(&self) -> usize;
}

impl OverviewCat for super::HelpBrowserCat {
    fn ov_title(&self) -> &str {
        &self.title
    }
    fn ov_emoji(&self) -> &str {
        &self.emoji_name
    }
    fn ov_count(&self) -> usize {
        self.fields.len()
    }
}

impl OverviewCat for HelpCategoryOwned {
    fn ov_title(&self) -> &str {
        &self.title
    }
    fn ov_emoji(&self) -> &str {
        &self.emoji_name
    }
    fn ov_count(&self) -> usize {
        self.leaves.len()
    }
}

/// /help category-page pager buttons. Mirrors createNavigationRow
/// (help.ts:44-76): verbatim `<<<` / `<` / `n/m` / `>` / `>>>` labels
/// (literals in TS, not lang keys), page button always disabled, edge
/// buttons disabled at the bounds. Stateless id carries the category
/// index + target page; the router rebuilds the same sorted list.
pub const HELP_NAV_PREFIX: &str = "help-nav:";

#[derive(Debug, PartialEq)]
pub struct HelpNavButton {
    pub id: String,
    pub label: String,
    pub disabled: bool,
}

pub fn help_nav_row(cat_index: usize, page: usize, total_pages: usize) -> Vec<HelpNavButton> {
    let total = total_pages.max(1);
    let page = page.min(total - 1);
    let id = |p: usize| format!("{HELP_NAV_PREFIX}{cat_index}:{p}");
    vec![
        HelpNavButton {
            id: id(0),
            label: "<<<".to_string(),
            disabled: page == 0,
        },
        HelpNavButton {
            id: id(page.saturating_sub(1)),
            label: "<".to_string(),
            disabled: page == 0,
        },
        HelpNavButton {
            id: id(page),
            label: format!("{}/{}", page + 1, total),
            disabled: true,
        },
        HelpNavButton {
            id: id((page + 1).min(total - 1)),
            label: ">".to_string(),
            disabled: page + 1 >= total,
        },
        HelpNavButton {
            id: id(total - 1),
            label: ">>>".to_string(),
            disabled: page + 1 >= total,
        },
    ]
}

/// Parse a pager button id back to (category index, target page).
pub fn parse_help_nav(id: &str) -> Option<(usize, usize)> {
    let rest = id.strip_prefix(HELP_NAV_PREFIX)?;
    let (cat, page) = rest.split_once(':')?;
    Some((cat.parse().ok()?, page.parse().ok()?))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn help_keys_resolve_in_guild_language_with_en_fallback() {
        assert_eq!(help_select_placeholder("en-US"), "Make a selection!");
        assert_eq!(help_option_desc("en-US", 12), "12 Commands");
        assert_eq!(
            help_back_option("en-US"),
            (
                "Main menu".to_string(),
                "Go back to initial menu".to_string()
            )
        );
        // Unknown key -> exact en-US fallback, never empty.
        assert_eq!(help_text("fr-FR", "nope_missing_key", "fb"), "fb");
        // Unknown locale falls back to the en-US table (lang::get rule).
        assert_eq!(help_select_placeholder("xx-XX"), "Make a selection!");
    }

    #[test]
    fn tip_embed_substitutes_all_tokens() {
        let out = help_tip_embed(
            "en-US", "iHorizon", 26, 300, "100", "200", "[P]", "[S]", "[C]", "[R]",
        );
        assert!(out.contains("```iHorizon ・ Help Menu```"));
        assert!(out.contains("**26** available Command Categories"));
        assert!(out.contains("**300** available Slash Commands"));
        assert!(out.contains("Created by** <@100>, <@200>"));
        assert!(out.contains("[R] ・ iHorizon is **100% multilingual**"));
        assert!(!out.contains("${"), "no token left unsubstituted");
    }

    #[test]
    fn cmd_states_match_ts() {
        assert_eq!(help_cmd_states(None, "L", "U", "en-US"), "U");
        let open = HelpPermState {
            level: 0,
            roles: 0,
            users: 0,
        };
        assert_eq!(help_cmd_states(Some(&open), "L", "U", "en-US"), "U");
        let lv = HelpPermState {
            level: 3,
            roles: 0,
            users: 0,
        };
        assert_eq!(help_cmd_states(Some(&lv), "L", "U", "en-US"), "L 3");
        let r = HelpPermState {
            level: 0,
            roles: 2,
            users: 0,
        };
        assert_eq!(help_cmd_states(Some(&r), "L", "U", "en-US"), " L (2 Roles)");
        let u = HelpPermState {
            level: 0,
            roles: 0,
            users: 1,
        };
        assert_eq!(
            help_cmd_states(Some(&u), "L", "U", "en-US"),
            " L (1 Members)"
        );
        let both = HelpPermState {
            level: 5,
            roles: 2,
            users: 1,
        };
        assert_eq!(
            help_cmd_states(Some(&both), "L", "U", "en-US"),
            " L (2 Roles) (1 Members)"
        );
    }

    #[test]
    fn cmd_prefix_variants_match_ts() {
        assert_eq!(
            help_cmd_prefix(0, "S", "ping", "ping", "?", false, "[M]", "[S]"),
            "S\n・[S] **/ping**"
        );
        assert_eq!(
            help_cmd_prefix(1, "S", "ping", "ping", "?", false, "[M]", "[S]"),
            "S\n・[M] **?ping**"
        );
        assert_eq!(
            help_cmd_prefix(1, "S", "ping", "ping", "?", true, "[M]", "[S]"),
            "S\n・[M] **@Ping-Me ping**"
        );
        assert_eq!(
            help_cmd_prefix(2, "S", "help", "help", "?", false, "[M]", "[S]"),
            "S\n・[M] ?help \n・[S] **/help**"
        );
        assert_eq!(
            help_cmd_prefix(2, "S", "help", "help", "?", true, "[M]", "[S]"),
            "S\n・[M] (@Ping-Me) help\n≠[S] **help**"
        );
        assert_eq!(
            help_cmd_prefix(9, "S", "x", "x", "?", false, "[M]", "[S]"),
            "S\n・**x**"
        );
    }

    #[test]
    fn local_desc_map_matches_ts() {
        let e = HelpModuleCmd {
            cmd: "ping",
            prefix_cmd: None,
            desc: "en",
            desc_fr: Some("fr"),
            desc_ja: Some("ja"),
            desc_ru: None,
            desc_es: Some("es"),
            message_cmd: 0,
            perm: None,
        };
        assert_eq!(help_local_desc("fr-FR", &e), "fr");
        assert_eq!(help_local_desc("fr-ME", &e), "fr");
        assert_eq!(help_local_desc("jp-JP", &e), "ja");
        assert_eq!(help_local_desc("ru-RU", &e), "en");
        assert_eq!(help_local_desc("es-ES", &e), "es");
        assert_eq!(help_local_desc("de-DE", &e), "en");
    }

    #[test]
    fn module_pages_cap_at_8_fields() {
        let fields: Vec<(String, String, usize)> = (0..10)
            .map(|i| (format!("n{i}"), format!("v{i}"), 10))
            .collect();
        let pages = help_module_pages(fields);
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].len(), 8);
        assert_eq!(pages[1].len(), 2);
        assert!(help_module_pages(vec![]).is_empty());
    }

    #[test]
    fn module_pages_cap_at_4000_chars() {
        let big = "x".repeat(3990);
        let fields = vec![
            ("a".to_string(), "b".to_string(), 10),
            (big.clone(), "c".to_string(), js_len(&big) + 1),
        ];
        let pages = help_module_pages(fields);
        assert_eq!(pages.len(), 2);
    }

    #[test]
    fn menus_split_and_title_match_ts() {
        assert_eq!(help_menus_split(26), 13);
        assert_eq!(help_menus_split(1), 1);
        assert_eq!(help_module_title("E", "Bot"), "E・Bot");
    }

    #[test]
    fn overview_select_ids_match_ts_custom_ids() {
        assert_eq!(HELP_OVERVIEW_SELECT_1, "help-menu-1");
        assert_eq!(HELP_OVERVIEW_SELECT_2, "help-menu-2");
        assert_eq!(HELP_OVERVIEW_BACK_VALUE, "back");
        assert!(is_help_overview_select("help-menu-1"));
        assert!(is_help_overview_select("help-menu-2"));
        assert!(!is_help_overview_select("help_category_select_0"));
        assert!(!is_help_overview_select(""));
    }

    #[test]
    fn overview_pick_routes_back_index_and_unknown() {
        assert!(matches!(
            parse_help_overview_pick("back"),
            HelpOverviewPick::Back
        ));
        assert!(matches!(
            parse_help_overview_pick("0"),
            HelpOverviewPick::Category(0)
        ));
        assert!(matches!(
            parse_help_overview_pick("17"),
            HelpOverviewPick::Category(17)
        ));
        // TS parseInt NaN / negative branch: unreachable.
        assert!(matches!(
            parse_help_overview_pick("some_category"),
            HelpOverviewPick::Unknown
        ));
        assert!(matches!(
            parse_help_overview_pick("-1"),
            HelpOverviewPick::Unknown
        ));
        assert!(matches!(
            parse_help_overview_pick(""),
            HelpOverviewPick::Unknown
        ));
    }

    fn sample_cat(title: &str, fields: usize) -> super::super::HelpBrowserCat {
        super::super::HelpBrowserCat {
            name: title.to_lowercase(),
            title: title.to_string(),
            desc: format!("{title} desc"),
            color: 0x001eff,
            emoji_name: "E".to_string(),
            fields: (0..fields)
                .map(|i| (format!("`cmd{i}`"), "d".to_string()))
                .collect(),
        }
    }

    #[test]
    fn overview_options_back_first_sorted_index_values() {
        let mut cats = vec![
            sample_cat("Utils", 3),
            sample_cat("Bot", 12),
            sample_cat("Fun", 1),
        ];
        super::sort_help_cats_by_name(&mut cats);
        assert_eq!(
            cats.iter().map(|c| c.title.as_str()).collect::<Vec<_>>(),
            vec!["Bot", "Fun", "Utils"]
        );
        // First row slice: back + global index values with count descs.
        let opts = super::help_overview_options("en-US", &cats, 0..2);
        assert_eq!(opts.len(), 3);
        assert_eq!(opts[0].value, "back");
        assert_eq!(opts[0].label, "Main menu");
        assert_eq!(opts[0].emoji_name, "Home");
        assert_eq!(opts[1].value, "0");
        assert_eq!(opts[1].label, "Bot");
        assert_eq!(opts[1].description, "12 Commands");
        assert_eq!(opts[2].value, "1");
        // Second row slice keeps the GLOBAL index (TS keeps incrementing).
        let rest = super::help_overview_options("en-US", &cats, 2..3);
        assert_eq!(rest.len(), 2);
        assert_eq!(rest[0].value, "back");
        assert_eq!(rest[1].value, "2");
        assert_eq!(rest[1].label, "Utils");
    }

    #[test]
    fn overview_category_page_caps_fields_with_tail() {
        let fields: Vec<(String, String)> = (0..30)
            .map(|i| (format!("n{i}"), format!("v{i}")))
            .collect();
        let page = super::help_overview_category_page("EMOJI", "Bot", "desc", &fields);
        assert_eq!(page.title, "EMOJI・Bot");
        assert_eq!(page.fields.len(), 25);
        assert!(page.description.contains("... +5 more"));
        // No emoji markup: bare title, no tail when under the cap.
        let small = super::help_overview_category_page("", "Bot", "desc", &fields[..3]);
        assert_eq!(small.title, "Bot");
        assert_eq!(small.description, "desc");
    }

    #[test]
    fn overview_banner_derives_from_guild_lang() {
        // The overview embed image is bannerGenerator(guildId): the
        // BANNER_URL template with the guild lang code.
        assert_eq!(
            crate::funcs::banner_url("fr-FR"),
            "https://www.ihorizon.org/assets/img/banner/ihrz_fr-FR.png"
        );
        assert!(crate::funcs::banner_url("en-US").ends_with("ihrz_en-US.png"));
    }

    fn slash_noop(
        _: poise::ApplicationContext<'_, (), anyhow::Error>,
    ) -> poise::BoxFuture<'_, Result<(), poise::FrameworkError<'_, (), anyhow::Error>>> {
        Box::pin(async { Ok(()) })
    }

    fn prefix_noop(
        _: poise::PrefixContext<'_, (), anyhow::Error>,
    ) -> poise::BoxFuture<'_, Result<(), poise::FrameworkError<'_, (), anyhow::Error>>> {
        Box::pin(async { Ok(()) })
    }

    fn leaf_cmd(name: &str, slash: bool, prefix: bool) -> poise::Command<(), anyhow::Error> {
        poise::Command {
            name: name.to_string(),
            slash_action: slash.then_some(slash_noop as _),
            prefix_action: prefix.then_some(prefix_noop as _),
            ..Default::default()
        }
    }

    #[test]
    fn leaf_collector_mirrors_ts_content_entries() {
        use super::*;
        // Hybrid parent: leaves only, kinds from legs.
        let mut parent = leaf_cmd("utils", true, true);
        parent.category = Some("utils".to_string());
        parent.subcommands = vec![leaf_cmd("snipe", true, true), leaf_cmd("top", false, true)];
        // Slash-file parent: own entry + slash leaves.
        let mut slash_parent = leaf_cmd("blogger", true, true);
        slash_parent.category = Some("blogger".to_string());
        slash_parent.subcommands = vec![leaf_cmd("add", true, true)];
        // Prefix-only organizer: no parent entry, prefix leaves.
        let mut org = leaf_cmd("legacy", false, true);
        org.category = Some("legacy".to_string());
        org.subcommands = vec![leaf_cmd("h", false, true)];
        let table = vec![
            ("utils", "d", "p", "E", 0),
            ("blogger", "d", "p", "E", 0),
            ("legacy", "d", "p", "E", 0),
        ];
        let cmds = vec![parent, slash_parent, org];
        let cats = collect_help_leaves(&cmds, &table, &|k| k.to_string());
        assert_eq!(cats.len(), 3);
        let utils = &cats[0];
        assert_eq!(utils.leaves.len(), 2);
        assert_eq!(utils.leaves[0].qualified, "utils snipe");
        assert_eq!(utils.leaves[0].message_cmd, 2);
        assert_eq!(utils.leaves[1].qualified, "utils top");
        assert_eq!(utils.leaves[1].message_cmd, 1);
        let blogger = &cats[1];
        assert_eq!(blogger.leaves.len(), 2);
        assert_eq!(blogger.leaves[0].qualified, "blogger");
        assert_eq!(blogger.leaves[0].message_cmd, 0);
        assert_eq!(blogger.leaves[1].qualified, "blogger add");
        assert_eq!(blogger.leaves[1].message_cmd, 0);
        let legacy = &cats[2];
        assert_eq!(legacy.leaves.len(), 1);
        assert_eq!(legacy.leaves[0].qualified, "legacy h");
        assert_eq!(legacy.leaves[0].message_cmd, 1);
    }

    #[test]
    fn nav_row_matches_ts_navigation_row() {
        use super::*;
        let row = help_nav_row(3, 0, 4);
        assert_eq!(
            row.iter().map(|b| b.label.clone()).collect::<Vec<_>>(),
            vec!["<<<", "<", "1/4", ">", ">>>"]
        );
        assert!(row[0].disabled && row[1].disabled);
        assert!(row[2].disabled);
        assert!(!row[3].disabled && !row[4].disabled);
        assert_eq!(parse_help_nav(&row[3].id), Some((3, 1)));
        assert_eq!(parse_help_nav(&row[4].id), Some((3, 3)));
        // Last page: forward edge disabled, backward live.
        let last = help_nav_row(0, 2, 3);
        assert_eq!(last[2].label, "3/3");
        assert!(!last[0].disabled && !last[1].disabled);
        assert!(last[3].disabled && last[4].disabled);
        assert_eq!(parse_help_nav("help-menu-1"), None);
    }
}
