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
/// (MentionSpam trigger) stay kv-only custom detectors (see the
/// `automod_toggle!` commands below); their native presets are
/// available in serenity but out of scope for this item.
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

macro_rules! keyword_command {
    ($fn_name:ident, $sub:literal, $kind:literal) => {
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
            if enabled {
                crate::db::kv_set(pool, &gid, "GUILD.GUILD_CONFIG.media", "false").await?;
                crate::db::kv_set(pool, &gid, &automod_key($kind), "1").await?;
                if $kind == "link" {
                    crate::db::kv_set(pool, &gid, "GUILD.GUILD_CONFIG.antipub", "on").await?;
                }
            } else {
                let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                    .bind(&gid)
                    .bind("GUILD.GUILD_CONFIG.media")
                    .execute(pool)
                    .await;
                crate::db::kv_set(pool, &gid, &automod_key($kind), "0").await?;
                if $kind == "link" {
                    crate::db::kv_set(pool, &gid, "GUILD.GUILD_CONFIG.antipub", "off").await?;
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
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_automod(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

keyword_command!(gc_automod_link, "link", "link");

automod_toggle!(gc_automod_spam, "spam", "spam");

automod_toggle!(gc_automod_mass, "mass-mention", "mass-mention");

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
    }
}
