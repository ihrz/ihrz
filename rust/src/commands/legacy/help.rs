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
}
