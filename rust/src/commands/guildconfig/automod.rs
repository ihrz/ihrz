use super::*;
use poise::serenity_prelude as serenity;

/// Automod on/off action choice. Mirrors the `action` option `choices`
/// in automod.ts:83, 156, 229, 301, 374 (one per subcommand: link,
/// spam, mass-mention, discord, telegram): slash shows the localized
/// display names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum AutomodAction {
    #[name = "on"]
    #[name_localized("en-US", "Power On")]
    #[name_localized("en-GB", "Power On")]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    On,
    #[name = "off"]
    #[name_localized("en-US", "Power Off")]
    #[name_localized("en-GB", "Power Off")]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    Off,
}

impl AutomodAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

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
/// `getNumber(...) || 3`). Clamped to `u8` range like the Discord
/// `mentionTotalLimit` slot (no `as u8` wrap on large values).
pub const DEFAULT_MAX_MENTION: u8 = 3;

/// kv copy of the configured `max-mention-allowed` for the event-side
/// fallback. TS keeps the limit only in the native rule's
/// `mentionTotalLimit`, which the message path cannot afford to fetch
/// per message, so the toggle persists it here on enable and removes
/// it on disable. Absent rows read as the TS `|| 3` default.
pub const AUTOMOD_MASS_LIMIT_KEY: &str = "GUILD.AUTOMOD.mass-mention-limit";

/// Resolve the `max-mention-allowed` option the way TS does:
/// `getNumber(...) || 3` — absent, zero, or negative falls back to 3;
/// positive values pass through, clamped to 255 (the `u8` ceiling, no
/// wrap). Pure for testability.
pub fn mention_limit(max_mention: Option<i64>) -> u8 {
    match max_mention {
        Some(n) if n > 0 => n.min(u8::MAX as i64) as u8,
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
    (
        $fn_name:ident,
        $sub:literal,
        $kind:literal,
        $desc:literal,
        $desc_fr:literal,
        $desc_ja:literal,
        $desc_ru:literal,
        $desc_es:literal,
        $logs_desc:literal,
        $logs_ja:literal,
        $logs_ru:literal,
        $logs_es:literal,
        $on_key:literal,
        $on_fb:literal,
        $off_key:literal,
        $off_fb:literal
    ) => {
#[doc = $desc]
        #[poise::command(
            slash_command,
            prefix_command,
            rename = $sub,
            default_member_permissions = "ADMINISTRATOR",
            description_localized("fr", $desc_fr),
            description_localized("ja", $desc_ja),
            description_localized("ru", $desc_ru),
            description_localized("es-ES", $desc_es)
        )]
        pub async fn $fn_name(
            ctx: Ctx<'_>,
            #[description = "What you want to do?"]
            #[description_localized("fr", "Que veux-tu faire?")]
            #[description_localized("ja", "何をしたいですか？")]
            #[description_localized("ru", "Что вы хотите сделать?")]
            #[description_localized("es-ES", "Que quieres hacer?")]
            action: AutomodAction,
            #[description = $logs_desc]
            #[description_localized(
                "fr",
                "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles"
            )]
            #[description_localized("ja", $logs_ja)]
            #[description_localized("ru", $logs_ru)]
            #[description_localized("es-ES", $logs_es)]
            #[channel_types("Text")]
            // TS SlashCommands/guildconfig/automod registers "logs-channel".
            #[rename = "logs-channel"]
            logs_channel: Option<serenity::GuildChannel>,
        ) -> Result<(), anyhow::Error> {
            let gid = ctx
                .guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let enabled = matches!(action, AutomodAction::On);
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
            // Reply mirrors the TS per-kind on/off keys
            // (`automod_block_*_command_on/off`): user mention plus the
            // logs-channel mention (or `None`), like
            // `logs_channel?.toString() || "None"`.
            let author_mention = ctx.author().to_string();
            let channel_label = logs_channel
                .as_ref()
                .map(|c| format!("<#{}>", c.id.get()))
                .unwrap_or_else(|| "None".to_string());
            if enabled {
                ctx.say(
                    crate::commands::lang_for(&ctx, $on_key, $on_fb)
                        .await
                        .replace("${interaction.user}", &author_mention)
                        .replace("${logs_channel}", &channel_label),
                )
                .await?;
            } else {
                ctx.say(
                    crate::commands::lang_for(&ctx, $off_key, $off_fb)
                        .await
                        .replace("${interaction.user}", &author_mention),
                )
                .await?;
            }
            Ok(())
        }
    };
}

/// Subcommand for automod category!
// Mirrors the TS `automod` command (automod.ts:31-41): its only
// top-level option is the `block` SubcommandGroup below, which holds
// the five toggles (discord_invite_link, telegram_link, link,
// spam, mass-mention).
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "automod",
    subcommands("gc_automod_block"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required,
    description_localized(
        "fr",
        "Commande sous-groupé pour la catégorie de protection via l'automod"
    ),
    description_localized("ja", "オートモデレーションカテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории автомода!"),
    description_localized("es-ES", "Subcomando para la categoría automod!")
)]
pub async fn gc_automod(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Block/Protect someting/behaviours into this guild!
// Mirrors the TS `block` SubcommandGroup (automod.ts:44-54, `someting`
// typo kept verbatim). A nested poise command with subcommands renders
// as a SubcommandGroup on Discord, so the five toggles sit at
// `/automod block <toggle>` exactly like TS.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "block",
    subcommands(
        "gc_automod_link",
        "gc_automod_spam",
        "gc_automod_mass",
        "gc_automod_discord",
        "gc_automod_telegram"
    ),
    subcommand_required,
    description_localized(
        "fr",
        "Bloquer/Protéger certains comportements/comportements dans ce serveur"
    ),
    description_localized("ja", "このサーバー内の何か/行動をブロック/保護！"),
    description_localized("ru", "Заблокировать/защитить что-либо на этом сервере!"),
    description_localized("es-ES", "Bloquear/Proteger algo/comportamientos en este servidor!")
)]
pub async fn gc_automod_block(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

keyword_command!(
    gc_automod_link,
    "link",
    "link",
    "Allow/Unallow the user to send links into them messages!",
    "Autoriser/Interdire à l'utilisateur d'envoyer des liens dans ses messages",
    "ユーザーがリンクを送信するのを許可/禁止！",
    "Разрешить/запретить отправку ссылок!",
    "Permitir/Denegar al usuario enviar enlaces en sus mensajes!",
    "The channel you want logs when user break the rules!",
    "ユーザーがルールを破った時のログを送信するチャンネル！",
    "Канал для логов при нарушении правил!",
    "El canal donde quieres los registros cuando el usuario rompe las reglas!",
    "automod_block_link_command_on",
    "${interaction.user}, you have set the `Pub AutoMod Rule` to **true**.\nNow users can't send links in their messages.\nAutoMod is now __sending logs__ in ${logs_channel}.\nAutoMod x iHorizon protects your server!",
    "automod_block_link_command_off",
    "${interaction.user}, you have set the `Pub AutoMod Rule` to **false**.\nNow users can send links in their messages.\nAutoMod x iHorizon has been disabled on your server!"
);

/// Block the spam message in this server!
// The Block (+ optional logs-channel Alert) Spam rule named
// "Block spam by iHorizon" is created/edited, then the legacy
// `GUILD_CONFIG.spam` leaf is dual-written beside the AUTOMOD flag.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "spam",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Bloquer le message spam sur ce serveur"),
    description_localized("ja", "このサーバーでのスパムメッセージをブロック！"),
    description_localized("ru", "Блокировать спам-сообщения на этом сервере!"),
    description_localized("es-ES", "Bloquear los mensajes de spam en este servidor!")
)]
pub async fn gc_automod_spam(
    ctx: Ctx<'_>,
    #[description = "What you want to do?"]
    #[description_localized("fr", "Que veux-tu faire?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    action: AutomodAction,
    #[description = "The channel you want logs when user break the rules"]
    #[description_localized(
        "fr",
        "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles"
    )]
    #[description_localized("ja", "ユーザーがルールを破った時のログを送信するチャンネル")]
    #[description_localized("ru", "Канал для логов при нарушении правил")]
    #[description_localized(
        "es-ES",
        "El canal donde quieres los registros cuando el usuario rompe las reglas"
    )]
    #[channel_types("Text")]
    // TS SlashCommands/guildconfig/automod/!spam.ts registers "logs-channel".
    #[rename = "logs-channel"]
    logs_channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action, AutomodAction::On);
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
    let author_mention = ctx.author().to_string();
    let channel_label = logs_channel
        .as_ref()
        .map(|c| format!("<#{}>", c.id.get()))
        .unwrap_or_else(|| "None".to_string());
    if enabled {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "automod_block_spam_command_on",
                "${interaction.user}, you have set the `Spam AutoMod Rule` to **true**.\nNow users can't spam anymore.\nAutoMod is now __sending logs__ in ${logs_channel}.\nAutoMod x iHorizon protects your server!",
            )
            .await
            .replace("${interaction.user}", &author_mention)
            .replace("${logs_channel}", &channel_label),
        )
        .await?;
    } else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "automod_block_spam_command_off",
                "${interaction.user}, you have set the `Spam AutoMod Rule` to **false**.\nNow users can spam.\nAutoMod x iHorizon has been disabled on your server!",
            )
            .await
            .replace("${interaction.user}", &author_mention),
        )
        .await?;
    }
    Ok(())
}

// Mass-mention toggle with native rule sync (mirrors `!mass-mention.ts`).
// The MentionSpam rule (with the `max-mention-allowed` limit,
// default 3) is created/edited with the Block (+ optional
// logs-channel Alert) actions, then the legacy
// `GUILD_CONFIG.mass_mention` leaf is dual-written. A failed sync
// replies the error404 string (Discord rejects the rule while its
// own MentionSpam preset stays enabled) without touching kv state.
/// Block the spam which have mass-mention in this message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "mass-mention",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Bloquez les spams mentionnés en masse dans ce message"),
    description_localized("ja", "大量メンションを含むスパムをブロック！"),
    description_localized("ru", "Блокировать спам с массовыми упоминаниями!"),
    description_localized(
        "es-ES",
        "Bloquear el spam que tiene menciones masivas en este mensaje!"
    )
)]
pub async fn gc_automod_mass(
    ctx: Ctx<'_>,
    #[description = "What you want to do?"]
    #[description_localized("fr", "Que voulez-vous faire?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    action: AutomodAction,
    #[description = "Max amount of mention allowed in only one message !"]
    #[description_localized("fr", "Nombre maximum de mentions autorisées dans un seul message")]
    #[description_localized("ja", "1つのメッセージで許可される最大メンション数！")]
    #[description_localized("ru", "Максимальное количество упоминаний в одном сообщении!")]
    #[description_localized(
        "es-ES",
        "Cantidad máxima de menciones permitidas en un solo mensaje!"
    )]
    #[rename = "max-mention-allowed"]
    max_mention: Option<i64>,
    #[description = "The channel you want logs when user break the rules"]
    #[description_localized(
        "fr",
        "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles"
    )]
    #[description_localized("ja", "ユーザーがルールを破った時のログを送信するチャンネル")]
    #[description_localized("ru", "Канал для логов при нарушении правил")]
    #[description_localized(
        "es-ES",
        "El canal donde quieres los registros cuando el usuario rompe las reglas"
    )]
    #[channel_types("Text")]
    // TS SlashCommands/guildconfig/automod/!mass-mention.ts registers "logs-channel".
    #[rename = "logs-channel"]
    logs_channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action, AutomodAction::On);
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
    // The native rule owns the only other copy of the limit; persist
    // one for the event-side fallback (absent rows read as default 3).
    if enabled {
        crate::db::tbl_set(pool, &gid, AUTOMOD_MASS_LIMIT_KEY, &limit.to_string()).await?;
    } else {
        let _ = crate::db::tbl_del(pool, &gid, AUTOMOD_MASS_LIMIT_KEY).await;
    }
    let author_mention = ctx.author().to_string();
    let channel_label = logs_channel
        .as_ref()
        .map(|c| format!("<#{}>", c.id.get()))
        .unwrap_or_else(|| "None".to_string());
    if enabled {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "automod_block_massmention_command_on",
                "${interaction.user}, you have set the `Mass-Mention AutoMod Rule` to **true**.\nNow users can't send more than **${max_mention}** mention(s) in their messages.\nAutoMod __sending logs__ in ${logs_channel}.\nAutoMod x iHorizon protects your server!",
            )
            .await
            .replace("${interaction.user}", &author_mention)
            .replace("${logs_channel}", &channel_label)
            .replace("${max_mention}", &limit.to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "automod_block_massmention_command_off",
                "${interaction.user}, you have set the `Mass-Mention AutoMod Rule` to **false**.\nNow users can send mentions in their messages.\nAutoMod x iHorizon has been disabled on your server!",
            )
            .await
            .replace("${interaction.user}", &author_mention),
        )
        .await?;
    }
    Ok(())
}

keyword_command!(
    gc_automod_discord,
    "discord_invite_link",
    "discord-invite",
    "Allow/Unallow the user to send a server invites into them messages!",
    "Autoriser/Interdire à l'utilisateur d'envoyer une invitations de serveur dans ses messages",
    "ユーザーがサーバー招待を送信するのを許可/禁止！",
    "Разрешить/запретить отправку приглашений сервера!",
    "Permitir/Denegar al usuario enviar invitaciones de servidor en sus mensajes!",
    "The channel you want logs when user break the rules!",
    "ユーザーがルールを破った時のログを送信するチャンネル！",
    "Канал для логов при нарушении правил!",
    "El canal donde quieres los registros cuando el usuario rompe las reglas!",
    "automod_block_pub_command_on",
    "${interaction.user}, you have set the `Pub AutoMod Rule` to **true**.\nNow users can't send server invites in their messages.\nAutoMod is now __sending logs__ in ${logs_channel}.\nAutoMod x iHorizon protects your server!",
    "automod_block_pub_command_off",
    "${interaction.user}, you have set the `Pub AutoMod Rule` to **false**.\nNow users can send server invites in their messages.\nAutoMod x iHorizon has been disabled on your server!"
);

keyword_command!(
    gc_automod_telegram,
    "telegram_link",
    "telegram",
    "Allow/Unallow the user to send Telegram links into them messages!",
    "Autoriser/Interdire à l'utilisateur d'envoyer des liens Telegram dans ses messages",
    "ユーザーがTelegramリンクを送信するのを許可/禁止！",
    "Разрешить/запретить отправку ссылок Telegram!",
    "Permitir/Denegar al usuario enviar enlaces de Telegram en sus mensajes!",
    "The channel you want logs when user break the rules!",
    "ユーザーがルールを破った時のログを送信するチャンネル！",
    "Канал для логов при нарушении правил!",
    "El canal donde quieres los registros cuando el usuario rompe las reglas!",
    "automod_block_telegram_command_on",
    "${interaction.user}, you have set the `Telegram AutoMod Rule` to **true**.\nNow users can't send Telegram-related links in their messages.\nAutoMod is now __sending logs__ in ${logs_channel}.\nAutoMod x iHorizon protects your server!",
    "automod_block_telegram_command_off",
    "${interaction.user}, you have set the `Telegram AutoMod Rule` to **false**.\nNow users can send Telegram-related links in their messages.\nAutoMod x iHorizon has been disabled on your server!"
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn automod_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = AutomodAction::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(AutomodAction::On.as_str(), "on");
        assert_eq!(AutomodAction::Off.as_str(), "off");
        assert_eq!(AutomodAction::from_name("on"), Some(AutomodAction::On));
        assert_eq!(
            AutomodAction::from_name("off"),
            Some(AutomodAction::Off)
        );
        assert_eq!(AutomodAction::from_name("bogus"), None);
        assert_eq!(AutomodAction::from_index(0), Some(AutomodAction::On));
        assert_eq!(AutomodAction::from_index(1), Some(AutomodAction::Off));
        let list = AutomodAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
        assert_eq!(AutomodAction::On.localized_name("ja"), Some("power_on"));
    }

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
    fn mass_limit_key_lives_beside_the_flag() {
        assert_eq!(AUTOMOD_MASS_LIMIT_KEY, "GUILD.AUTOMOD.mass-mention-limit");
        assert_eq!(automod_key("mass-mention"), "GUILD.AUTOMOD.mass-mention");
        assert_eq!(DEFAULT_MAX_MENTION, 3);
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
        // `|| 3`: absent, zero, or negative falls back to 3; positives
        // pass through, clamped to the u8 ceiling (no wrap).
        assert_eq!(mention_limit(None), 3);
        assert_eq!(mention_limit(Some(0)), DEFAULT_MAX_MENTION);
        assert_eq!(mention_limit(Some(-1)), DEFAULT_MAX_MENTION);
        assert_eq!(mention_limit(Some(i64::MIN)), DEFAULT_MAX_MENTION);
        assert_eq!(mention_limit(Some(3)), 3);
        assert_eq!(mention_limit(Some(10)), 10);
        assert_eq!(mention_limit(Some(50)), 50);
        assert_eq!(mention_limit(Some(51)), 51);
        assert_eq!(mention_limit(Some(255)), 255);
        assert_eq!(mention_limit(Some(256)), 255);
        assert_eq!(mention_limit(Some(1000)), 255);
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
