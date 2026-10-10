use super::*;
use poise::serenity_prelude as serenity;

/// Native AutoMod Keyword sync. Mirrors
/// `SlashCommands/guildconfig/automod/!link.ts`,
/// `!discord_invite_link.ts` and `!telegram_link.ts`.
///
/// Serenity 0.12 status (checked, NOT blocked): `GuildId::automod_rules`,
/// `create_automod_rule` / `edit_automod_rule` (both via the
/// `EditAutoModRule` builder, whose `execute((guild, None))` path
/// creates), `Trigger::Keyword { strings, regex_patterns, allow_list }`
/// and `Action::BlockMessage { custom_message }` / `Action::Alert(_)`
/// all exist in serenity 0.12.5, so the TS Keyword rules port 1:1.
///
/// Remainder: `!spam.ts` (Spam trigger) and `!mass-mention.ts`
/// (MentionSpam trigger) sync their native presets below
/// (`sync_spam_rule` / `sync_mention_rule`); the kv flags stay as
/// the local toggle state beside the legacy `GUILD_CONFIG` keys.
///
/// Block-message text TS puts in the rule action metadata.
pub const AUTOMOD_BLOCK_MESSAGE: &str = "This message was prevented by iHorizon";

/// `!link.ts` regex sources (`regexPatterns.map((r) => r.source)`).
pub const LINK_REGEX: [&str; 8] = [
    r"(discord\.gg\/|\.gg\/|gg\/|https?:\/\/|http?:\/\/)",
    r"(?:%[0-9a-fA-F]{2})+",
    r"(?:<.*?>)?\s*https?:\/\/.*?",
    r"[dD][iI][sS][cC][oO][rR][dD]\s*\.\s*[gG][gG]",
    r"(?:%[0-9a-fA-F]{2}){2,}",
    r"(?:https?:\/\/)?(?:%[0-9a-fA-F]{2})+(?:\.[a-zA-Z]{2,}|\/%[0-9a-fA-F]{2,})*",
    r"discord:\/-\/invite\/[a-zA-Z0-9\-\_]+",
    r"^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/invite\/([\w-]+)$",
];

/// `!link.ts` allow-list. GitHub (and the other code/media hosts) must
/// never trigger the rule: GitHub webhooks post commit/PR links on
/// every push and Discord AutoMod also scans webhook messages.
pub const LINK_ALLOW: [&str; 20] = [
    "*github.com*",
    "*gitlab.com*",
    "*giphy.com*",
    "*tenor.com*",
    "*imgur.com*",
    "*gyazo.com*",
    "*ezgif.com*",
    "*reddit.com*",
    "*tumblr.com*",
    "*twitter.com*",
    "*x.com*",
    "*youtube.com*",
    "*youtu.be*",
    "*cdn.discordapp.com*",
    "*streamable.com*",
    "*files.catbox.moe*",
    "*0x0.st*",
    "*flickr.com*",
    "*postimages.org*",
    "*imagebam.com*",
];

/// `!discord_invite_link.ts` regex sources.
pub const DISCORD_INVITE_REGEX: [&str; 5] = [
    r"(discord\.gg\/|\.gg\/|gg\/)",
    r"[dD][iI][sS][cC][oO][rR][dD]\s*\.\s*[gG][gG]",
    r"discord:\/-\/invite\/[a-zA-Z0-9\-\_]+",
    r"^(?:[a-z]+:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/invite\/([\w-]+)$",
    r"(?:https?:\/\/)?(?:%[0-9a-fA-F]{2})+(?:\/[a-zA-Z0-9\-_]+)?",
];

/// `!discord_invite_link.ts` allow-list (GitHub webhooks must never be
/// flagged: AutoMod scans webhook messages, GitHub posts links).
pub const DISCORD_INVITE_ALLOW: [&str; 2] = ["*github.com*", "*gitlab.com*"];

/// `!telegram_link.ts` (`RULE_NAME`) regex sources.
pub const TELEGRAM_REGEX: [&str; 10] = [
    r"(?:https?:\/\/)?t\.me\/[^\s]+",
    r"(?:https?:\/\/)?telegram\.me\/[^\s]+",
    r"(?:https?:\/\/)?telegram\.dog\/[^\s]+",
    r"(?:https?:\/\/)?[A-Za-z0-9_]{4,32}\.t\.me\/[^\s]+",
    r"tg:\/\/resolve\?[^\s]+",
    r"tg:\/\/join\?[^\s]+",
    r"tg:\/\/addstickers\?[^\s]+",
    r"tg:\/\/addemoji\?[^\s]+",
    r"tg:\/\/addtheme\?[^\s]+",
    r"tg:\/\/[^\s]+",
];

/// Native rule names per kind. `link` and `discord-invite` share the TS
/// `"Block advertissement message by iHorizon"` name (kept verbatim,
/// including the historical typo); telegram uses its `RULE_NAME`.
pub fn automod_rule_name(kind: &str) -> &'static str {
    match kind {
        "telegram" => "Block Telegram links by iHorizon",
        _ => "Block advertissement message by iHorizon",
    }
}

pub fn automod_regex(kind: &str) -> &'static [&'static str] {
    match kind {
        "discord-invite" => &DISCORD_INVITE_REGEX,
        "telegram" => &TELEGRAM_REGEX,
        _ => &LINK_REGEX,
    }
}

pub fn automod_allow(kind: &str) -> &'static [&'static str] {
    match kind {
        "discord-invite" => &DISCORD_INVITE_ALLOW,
        "telegram" => &[],
        _ => &LINK_ALLOW,
    }
}

/// Native Spam rule name (`!spam.ts` create/edit `name`).
pub const SPAM_RULE_NAME: &str = "Block spam by iHorizon";

/// Native mass-mention rule name (`!mass-mention.ts`).
pub const MASS_RULE_NAME: &str = "Block mass-mention spam by iHorizon";

/// Default `max-mention-allowed` (`!mass-mention.ts`
/// `getNumber(...) || 3`). Passed straight through to Discord like the
/// TS `mentionTotalLimit: max_mention` (no clamp).
pub const DEFAULT_MAX_MENTION: u8 = 3;

/// Resolve the `max-mention-allowed` option the way TS does:
/// `getNumber(...) || 3` — absent or zero falls back to 3, any other
/// value passes through untouched. Pure for testability.
pub fn mention_limit(max_mention: Option<i64>) -> u8 {
    match max_mention {
        Some(n) if n != 0 => n as u8,
        _ => DEFAULT_MAX_MENTION,
    }
}

/// Spam trigger (`!spam.ts` `triggerType: 3`). Pure for testability.
pub fn spam_trigger() -> serenity::Trigger {
    serenity::Trigger::Spam
}

/// MentionSpam trigger with the configured total-mention limit
/// (`!mass-mention.ts` `triggerType: 5`, `mentionTotalLimit`).
/// Pure for testability.
pub fn mass_trigger(limit: u8) -> serenity::Trigger {
    serenity::Trigger::MentionSpam {
        mention_total_limit: limit,
    }
}

/// Media side-effect value stored on enable per Keyword kind:
/// `!link.ts` stores false, `!discord_invite_link.ts` stores true,
/// `!telegram_link.ts` has none. `None` kinds own no media row
/// (nothing to delete on disable either). Pure for testability.
pub fn automod_media_on_value(kind: &str) -> Option<&'static str> {
    match kind {
        "link" => Some("false"),
        "discord-invite" => Some("true"),
        _ => None,
    }
}

/// Only `!link.ts` manages the antipub leaf. Pure for testability.
pub fn automod_manages_antipub(kind: &str) -> bool {
    kind == "link"
}

/// Keyword trigger for a kind. Pure for testability.
pub fn automod_trigger(kind: &str) -> serenity::Trigger {
    serenity::Trigger::Keyword {
        strings: vec![],
        regex_patterns: automod_regex(kind).iter().map(|s| s.to_string()).collect(),
        allow_list: automod_allow(kind).iter().map(|s| s.to_string()).collect(),
    }
}

/// Block (+ optional logs-channel alert) actions. Mirrors the TS
/// `arrayActionsForRule` (type 1 block with custom message, plus type 2
/// alert when `logs-channel` is given). Pure for testability.
pub fn automod_actions(log_channel: Option<u64>) -> Vec<serenity::Action> {
    let mut actions = vec![serenity::Action::BlockMessage {
        custom_message: Some(AUTOMOD_BLOCK_MESSAGE.to_string()),
    }];
    if let Some(id) = log_channel {
        actions.push(serenity::Action::Alert(serenity::ChannelId::new(id)));
    }
    actions
}

/// Find this kind's native rule: name match first (telegram), else the
/// first Keyword rule (link / discord-invite share one Keyword slot,
/// like the TS `autoModerationRules.find(Keyword)` lookup).
pub fn find_keyword_rule<'a>(
    rules: &'a [serenity::automod::Rule],
    kind: &str,
) -> Option<&'a serenity::automod::Rule> {
    if kind == "telegram" {
        if let Some(r) = rules.iter().find(|r| r.name == automod_rule_name(kind)) {
            return Some(r);
        }
    }
    rules.iter().find(|r| {
        matches!(
            r.trigger,
            serenity::Trigger::Keyword { .. } | serenity::Trigger::Unknown(1)
        )
    })
}

/// Create-or-edit the kind's Keyword rule and enable/disable it.
/// Best-effort false on Discord errors (caller falls back to kv-only,
/// like the pre-sync behaviour).
pub async fn sync_keyword_rule(
    serenity_ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    kind: &str,
    enabled: bool,
    log_channel: Option<serenity::ChannelId>,
) -> bool {
    let rules = match guild_id.automod_rules(serenity_ctx).await {
        Ok(r) => r,
        Err(_) => return false,
    };
    let existing = find_keyword_rule(&rules, kind).map(|r| r.id);
    let builder = serenity::EditAutoModRule::new()
        .name(automod_rule_name(kind))
        .event_type(serenity::automod::EventType::MessageSend)
        .trigger(automod_trigger(kind))
        .actions(automod_actions(log_channel.map(|c| c.get())))
        .enabled(enabled);
    // Serenity routes a `None` rule id to create and `Some` to edit.
    let res = match existing {
        Some(id) => guild_id
            .edit_automod_rule(serenity_ctx, id, builder)
            .await
            .map(|_| ()),
        None => {
            if enabled {
                guild_id
                    .create_automod_rule(serenity_ctx, builder)
                    .await
                    .map(|_| ())
            } else {
                Ok(())
            }
        }
    };
    res.is_ok()
}

/// Find the native Spam-rule slot (`!spam.ts` lookup by
/// `triggerType: Spam`). Pure for testability.
pub fn find_spam_rule(rules: &[serenity::automod::Rule]) -> Option<&serenity::automod::Rule> {
    rules.iter().find(|r| {
        matches!(
            r.trigger,
            serenity::Trigger::Spam | serenity::Trigger::Unknown(3)
        )
    })
}

/// Find the native MentionSpam-rule slot (`!mass-mention.ts` lookup
/// by `triggerType: MentionSpam`). Pure for testability.
pub fn find_mention_rule(rules: &[serenity::automod::Rule]) -> Option<&serenity::automod::Rule> {
    rules.iter().find(|r| {
        matches!(
            r.trigger,
            serenity::Trigger::MentionSpam { .. } | serenity::Trigger::Unknown(5)
        )
    })
}

/// Create-or-edit a preset (non-Keyword) native rule and
/// enable/disable it. Best-effort false on Discord errors.
async fn sync_preset_rule(
    serenity_ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    name: &str,
    trigger: serenity::Trigger,
    enabled: bool,
    log_channel: Option<serenity::ChannelId>,
    existing: Option<serenity::RuleId>,
) -> bool {
    let builder = serenity::EditAutoModRule::new()
        .name(name)
        .event_type(serenity::automod::EventType::MessageSend)
        .trigger(trigger)
        .actions(automod_actions(log_channel.map(|c| c.get())))
        .enabled(enabled);
    // Serenity routes a `None` rule id to create and `Some` to edit.
    let res = match existing {
        Some(id) => guild_id
            .edit_automod_rule(serenity_ctx, id, builder)
            .await
            .map(|_| ()),
        None => {
            if enabled {
                guild_id
                    .create_automod_rule(serenity_ctx, builder)
                    .await
                    .map(|_| ())
            } else {
                Ok(())
            }
        }
    };
    res.is_ok()
}

/// Create-or-edit the native Spam rule and enable/disable it.
/// Mirrors `!spam.ts`. Best-effort false on Discord errors.
pub async fn sync_spam_rule(
    serenity_ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    enabled: bool,
    log_channel: Option<serenity::ChannelId>,
) -> bool {
    let rules = match guild_id.automod_rules(serenity_ctx).await {
        Ok(r) => r,
        Err(_) => return false,
    };
    let existing = find_spam_rule(&rules).map(|r| r.id);
    sync_preset_rule(
        serenity_ctx,
        guild_id,
        SPAM_RULE_NAME,
        spam_trigger(),
        enabled,
        log_channel,
        existing,
    )
    .await
}

/// Create-or-edit the native MentionSpam rule (with the configured
/// mention limit) and enable/disable it. Mirrors `!mass-mention.ts`.
/// Best-effort false on Discord errors (caller replies error404).
pub async fn sync_mention_rule(
    serenity_ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    limit: u8,
    enabled: bool,
    log_channel: Option<serenity::ChannelId>,
) -> bool {
    let rules = match guild_id.automod_rules(serenity_ctx).await {
        Ok(r) => r,
        Err(_) => return false,
    };
    let existing = find_mention_rule(&rules).map(|r| r.id);
    sync_preset_rule(
        serenity_ctx,
        guild_id,
        MASS_RULE_NAME,
        mass_trigger(limit),
        enabled,
        log_channel,
        existing,
    )
    .await
}

macro_rules! keyword_command {
    ($fn_name:ident, $sub:literal, $kind:literal) => {
/// Set a specific permission to use one command
        #[poise::command(
                                                    slash_command,
    prefix_command,
                                                    rename = $sub,
                                                    default_member_permissions = "ADMINISTRATOR"
                                                )]
        pub async fn $fn_name(
            ctx: Ctx<'_>,
            #[description = "on or off"] action: String,
            #[description = "Logs channel"]
            #[channel_types("Text")]
            logs_channel: Option<serenity::GuildChannel>,
        ) -> Result<(), anyhow::Error> {
            let gid = ctx
                .guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
            let pool = &ctx.data().pool;
            if let Some(guild_id) = ctx.guild_id() {
                sync_keyword_rule(
                    ctx.serenity_context(),
                    guild_id,
                    $kind,
                    enabled,
                    logs_channel.as_ref().map(|c| c.id),
                )
                .await;
            }
            crate::db::tbl_set(pool, &gid, &automod_key($kind), if enabled { "1" } else { "0" }).await?;
            if enabled {
                if let Some(v) = automod_media_on_value($kind) {
                    crate::db::tbl_set(pool, &gid, "GUILD.GUILD_CONFIG.media", v).await?;
                }
                if automod_manages_antipub($kind) {
                    crate::db::tbl_set(pool, &gid, "GUILD.GUILD_CONFIG.antipub", "on").await?;
                }
            } else {
                if automod_media_on_value($kind).is_some() {
                    let _ = crate::db::tbl_del(pool, &gid, "GUILD.GUILD_CONFIG.media").await;
                }
                if automod_manages_antipub($kind) {
                    crate::db::tbl_set(pool, &gid, "GUILD.GUILD_CONFIG.antipub", "off").await?;
                }
            }
            let state = if enabled { "on" } else { "off" };
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "msg_automod_toggled",
                    &format!("Automod {} {state}.", $kind),
                )
                .await
                .replace("{kind}", $kind)
                .replace("{state}", state),
            )
            .await?;
            Ok(())
        }
    };
}

/// Automod subgroup. Mirrors the TS automod subcommand group.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "automod",
    subcommands(
        "gc_automod_link",
        "gc_automod_spam",
        "gc_automod_mass",
        "gc_automod_discord",
        "gc_automod_telegram"
    ),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn gc_automod(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

keyword_command!(gc_automod_link, "link", "link");

/// Spam toggle with native rule sync (mirrors `!spam.ts`).
// The Block (+ optional logs-channel Alert) Spam rule named
// "Block spam by iHorizon" is created/edited, then the legacy
// `GUILD_CONFIG.spam` leaf is dual-written beside the AUTOMOD flag.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "spam",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_automod_spam(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Logs channel"]
    #[channel_types("Text")]
    logs_channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let pool = &ctx.data().pool;
    if let Some(guild_id) = ctx.guild_id() {
        sync_spam_rule(
            ctx.serenity_context(),
            guild_id,
            enabled,
            logs_channel.as_ref().map(|c| c.id),
        )
        .await;
    }
    crate::db::tbl_set(
        pool,
        &gid,
        "GUILD.GUILD_CONFIG.spam",
        if enabled { "on" } else { "off" },
    )
    .await?;
    crate::db::tbl_set(
        pool,
        &gid,
        &automod_key("spam"),
        if enabled { "1" } else { "0" },
    )
    .await?;
    let state = if enabled { "on" } else { "off" };
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "msg_automod_toggled",
            &format!("Automod spam {state}."),
        )
        .await
        .replace("{kind}", "spam")
        .replace("{state}", state),
    )
    .await?;
    Ok(())
}

/// Mass-mention toggle with native rule sync (mirrors `!mass-mention.ts`).
// The MentionSpam rule (with the `max-mention-allowed` limit,
// default 3) is created/edited with the Block (+ optional
// logs-channel Alert) actions, then the legacy
// `GUILD_CONFIG.mass_mention` leaf is dual-written. A failed sync
// replies the error404 string (Discord rejects the rule while its
// own MentionSpam preset stays enabled) without touching kv state.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "mass-mention",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_automod_mass(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Max mentions allowed"]
    #[rename = "max-mention-allowed"]
    max_mention: Option<i64>,
    #[description = "Logs channel"]
    #[channel_types("Text")]
    logs_channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let limit = mention_limit(max_mention);
    let pool = &ctx.data().pool;
    let synced = if let Some(guild_id) = ctx.guild_id() {
        sync_mention_rule(
            ctx.serenity_context(),
            guild_id,
            limit,
            enabled,
            logs_channel.as_ref().map(|c| c.id),
        )
        .await
    } else {
        false
    };
    if enabled && !synced {
        let detail = crate::commands::lang_for(
            &ctx,
            "automod_block_massmention_command_error404",
            "Did you leave Block Mention Spam enabled (enabled by default by Discord) in AutoMod settings? It is most likely the cause of this error: please disable it, then run the command again.",
        )
        .await;
        ctx.say(format!("Error 404. {detail}")).await?;
        return Ok(());
    }
    crate::db::tbl_set(
        pool,
        &gid,
        "GUILD.GUILD_CONFIG.mass_mention",
        if enabled { "on" } else { "off" },
    )
    .await?;
    crate::db::tbl_set(
        pool,
        &gid,
        &automod_key("mass-mention"),
        if enabled { "1" } else { "0" },
    )
    .await?;
    let state = if enabled { "on" } else { "off" };
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "msg_automod_toggled",
            &format!("Automod mass-mention {state}."),
        )
        .await
        .replace("{kind}", "mass-mention")
        .replace("{state}", state),
    )
    .await?;
    Ok(())
}

keyword_command!(gc_automod_discord, "discord-invite", "discord-invite");

keyword_command!(gc_automod_telegram, "telegram-link", "telegram");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keyword_triggers_carry_ts_patterns_and_allowlist() {
        for kind in ["link", "discord-invite", "telegram"] {
            match automod_trigger(kind) {
                serenity::Trigger::Keyword {
                    regex_patterns,
                    allow_list: _allow_list,
                    ..
                } => {
                    assert!(!regex_patterns.is_empty(), "{kind} needs regexPatterns");
                    // Spot-check the ported sources against the TS files
                    // (no `regex` crate in scope; counts + anchors pin
                    // the port instead of a compile check).
                    for src in &regex_patterns {
                        assert!(!src.is_empty());
                    }
                }
                _ => panic!("{kind} must build a Keyword trigger"),
            }
        }
        // GitHub/GitLab/media allow-list coverage on the link rule.
        let allow = automod_allow("link");
        assert!(allow.contains(&"*github.com*"));
        assert!(allow.contains(&"*gitlab.com*"));
        assert!(allow.contains(&"*youtube.com*"));
        assert!(allow.contains(&"*cdn.discordapp.com*"));
        assert_eq!(LINK_ALLOW.len(), 20);
        // Source anchors pin each port to its TS file.
        assert!(LINK_REGEX.iter().any(|s| s.contains(r"discord\.gg")));
        assert!(DISCORD_INVITE_REGEX
            .iter()
            .any(|s| s.contains(r"discord\.gg")));
        assert!(TELEGRAM_REGEX.iter().any(|s| s.contains(r"t\.me")));
        assert_eq!(TELEGRAM_REGEX.len(), 10);
        // Discord-invite keeps the webhook exemption pair.
        assert_eq!(
            automod_allow("discord-invite"),
            &["*github.com*", "*gitlab.com*"]
        );
    }

    #[test]
    fn actions_block_plus_optional_alert() {
        let base = automod_actions(None);
        assert_eq!(base.len(), 1);
        assert!(matches!(base[0], serenity::Action::BlockMessage { .. }));
        let with_logs = automod_actions(Some(123));
        assert_eq!(with_logs.len(), 2);
        assert!(matches!(with_logs[1], serenity::Action::Alert(_)));
    }

    #[test]
    fn rule_names_match_ts() {
        assert_eq!(
            automod_rule_name("telegram"),
            "Block Telegram links by iHorizon"
        );
        assert_eq!(
            automod_rule_name("link"),
            "Block advertissement message by iHorizon"
        );
        assert_eq!(SPAM_RULE_NAME, "Block spam by iHorizon");
        assert_eq!(MASS_RULE_NAME, "Block mass-mention spam by iHorizon");
    }

    // `Rule` is non-exhaustive: build test fixtures through its
    // Discord JSON shape (trigger_type + trigger_metadata).
    fn test_rule(trigger_type: u8, metadata: serde_json::Value) -> serenity::automod::Rule {
        serde_json::from_value(serde_json::json!({
            "id": "1",
            "guild_id": "1",
            "name": "r",
            "creator_id": "1",
            "event_type": 1,
            "trigger_type": trigger_type,
            "trigger_metadata": metadata,
            "actions": [],
            "enabled": true,
            "exempt_roles": [],
            "exempt_channels": []
        }))
        .expect("test rule must deserialize")
    }

    #[test]
    fn spam_and_mention_triggers_match_ts_slots() {
        assert!(matches!(spam_trigger(), serenity::Trigger::Spam));
        match mass_trigger(7) {
            serenity::Trigger::MentionSpam {
                mention_total_limit,
            } => assert_eq!(mention_total_limit, 7),
            _ => panic!("mass must build a MentionSpam trigger"),
        }
    }

    #[test]
    fn mention_limit_passthrough_with_fallback_3() {
        // `|| 3`: absent or zero falls back to 3, everything else
        // passes straight through (no clamp).
        assert_eq!(mention_limit(None), 3);
        assert_eq!(mention_limit(Some(0)), DEFAULT_MAX_MENTION);
        assert_eq!(mention_limit(Some(3)), 3);
        assert_eq!(mention_limit(Some(10)), 10);
        assert_eq!(mention_limit(Some(50)), 50);
        assert_eq!(mention_limit(Some(51)), 51);
        assert_eq!(mention_limit(Some(-1)), 255);
    }

    #[test]
    fn preset_rule_finders_match_trigger_slots() {
        let rules = vec![
            test_rule(3, serde_json::json!({})),
            test_rule(5, serde_json::json!({ "mention_total_limit": 3 })),
            test_rule(
                1,
                serde_json::json!({
                    "keyword_filter": [],
                    "regex_patterns": ["x"],
                    "allow_list": []
                }),
            ),
        ];
        assert!(matches!(
            find_spam_rule(&rules).map(|r| &r.trigger),
            Some(serenity::Trigger::Spam)
        ));
        match find_mention_rule(&rules).map(|r| &r.trigger) {
            Some(serenity::Trigger::MentionSpam {
                mention_total_limit,
            }) => assert_eq!(*mention_total_limit, 3),
            _ => panic!("mention finder must hit the MentionSpam slot"),
        }
        // Absent slots yield None (disable path skips Discord).
        let empty = vec![test_rule(
            1,
            serde_json::json!({
                "keyword_filter": [],
                "regex_patterns": ["x"],
                "allow_list": []
            }),
        )];
        assert!(find_spam_rule(&empty).is_none());
        assert!(find_mention_rule(&empty).is_none());
    }

    #[test]
    fn keyword_side_effects_match_ts() {
        assert_eq!(automod_media_on_value("link"), Some("false"));
        assert_eq!(automod_media_on_value("discord-invite"), Some("true"));
        assert_eq!(automod_media_on_value("telegram"), None);
        assert!(automod_manages_antipub("link"));
        assert!(!automod_manages_antipub("discord-invite"));
        assert!(!automod_manages_antipub("telegram"));
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn automod_flags_dual_write_table_and_legacy() {
        let pool = memory_pool().await;
        let key = automod_key("spam");
        crate::db::tbl_set(&pool, "g1", &key, "1").await.unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", &key).await.as_deref(),
            Some("1")
        );
        // Legacy flat row stays fresh for unmigrated kv readers.
        assert_eq!(
            crate::db::kv_get(&pool, "g1", &key).await.as_deref(),
            Some("1")
        );
        // Guild-config leaf beside the flag dual-writes too.
        crate::db::tbl_set(&pool, "g1", "GUILD.GUILD_CONFIG.spam", "on")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", "GUILD.GUILD_CONFIG.spam")
                .await
                .as_deref(),
            Some("on")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g1", "GUILD.GUILD_CONFIG.spam")
                .await
                .as_deref(),
            Some("on")
        );
        crate::db::tbl_del(&pool, "g1", &key).await.unwrap();
        assert!(crate::db::tbl_get(&pool, "g1", &key).await.is_none());
        assert!(crate::db::kv_get(&pool, "g1", &key).await.is_none());
    }

    #[tokio::test]
    async fn automod_flag_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        let key = automod_key("link");
        crate::db::kv_set(&pool, "g1", &key, "1").await.unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", &key).await.as_deref(),
            Some("1")
        );
    }
}
