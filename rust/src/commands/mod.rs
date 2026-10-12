// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
//! Mirrors src/Interaction/HybridCommands/* + !BlankHybridCommandTemplate.ts.
//!
//! Template for new commands (copy-paste):
//!   #[poise::command(slash_command, prefix_command, category = "<category>")]
//!   pub async fn mycmd(ctx: Ctx<'_>) -> Result<(), Error> { ... }
//! and register it in all() below. Each category dir in TS maps to a
//! submodule here (see fun::, utils::).

pub mod antispam;
pub mod authrestore;
pub mod backup;
// Shared restore helper (pure message plan + live Discord writes), not
// a poise command: intentionally absent from all() below. Backup leaves
// call it via crate::commands::backup_restore::....
pub mod backup_restore;
pub mod blogger;
pub mod botcat;
pub mod confession;
pub mod context;
pub mod economy;
pub mod embed;
pub mod fun;
pub mod giveaway;
pub mod guildconfig;
pub mod h247;
pub mod honeypot;
pub mod invitesmanager;
pub mod lastfm;
pub mod legacy;
pub mod membercount;
pub mod moderation;
pub mod music;
pub mod newfeatures;
pub mod notifier;
pub mod owner;
pub mod pfps;
pub mod profil;
pub mod protection;
pub mod ranks;
pub mod rolereactions;
pub mod schedule;
pub mod security;
pub mod shared;
pub mod starboard;
pub mod stats;
pub mod sticky;
pub mod suggestion;
pub mod tag;
pub mod ticket;
pub mod tts;
pub mod utils;
pub mod voicedashboard;
pub mod welcomer_panel;

use crate::bot::{Ctx, Data};

type Error = anyhow::Error;

/// Flat command registry, mirroring production (`src/Interaction/HybridCommands/*`
/// are flat files, one command per file).
///
/// FLATTEN (B1-B4): the ex-`bot` (13) / ex-`owner` (5) / ex-`guildconfig` (7)
/// leaves plus `nightmode` / `rolebutton` / `roleselect` register top-level
/// here instead of nested under a parent, so the root holds ~87 top-level
/// entries (Discord caps global slash commands at 100).
/// The U-SLASHGROUPS-era `!parent leaf` prefix paths (`!bot help`,
/// `!owner blacklist`, `!guildconfig autoreact`, ...) are dead by design:
/// production never had them. Prefix back-compat comes only from the
/// TS-listed aliases carried on each leaf (no invented aliases); the
/// single deliberate delta is `bl`, kept as a prefix-only delegate of
/// flat /blacklist (TS exposes it solely as a prefix alias, never as
/// its own slash command).
pub fn all() -> Vec<poise::Command<Data, Error>> {
    vec![
        fun::fun::fun(),
        // TS top-level prefix-only MessageCommand (MessageCommands/bot,
        // category 404, never slash): registered at top level like
        // production instead of nesting under /fun.
        fun::grosbg::grosbg(),
        utils::utils::utils(),
        utils::util::util(),
        utils::channel::channel(),
        utils::unbanall::unbanall(),
        utils::unslowmode::unslowmode(),
        utils::utilss::utilss(),
        utils::info::banner::banner(),
        embed::embed_builder::embed_builder(),
        moderation::main::moderation(),
        protection::protect::protect(),
        protection::allowlist::allowlist(),
        security::main::security(),
        antispam::main::antispam(),
        authrestore::main::authrestore(),
        guildconfig::main::guildconfig(),
        guildconfig::automod::gc_automod(),
        // FLATTEN-B3: ex-guildconfig leaves, top-level like their TS
        // commands (`HybridCommands/guildconfig/*`).
        guildconfig::autoreact::gc_autoreact(),
        guildconfig::autoreact::gc_toggle_react(),
        guildconfig::commandlimit::gc_commandlimit(),
        guildconfig::setlogschannel::gc_setlogs(),
        guildconfig::support::gc_support(),
        guildconfig::join_ghostping::gc_join_ghostping(),
        guildconfig::perm_parent::gc_perm(),
        guildconfig::autologs::gc_autologs(),
        welcomer_panel::main::welcomer_panel(),
        economy::main::economy(),
        ranks::main::ranks(),
        profil::main::profil(),
        pfps::main::pfps(),
        music::main::music(),
        notifier::main::notifier(),
        blogger::main::blogger(),
        lastfm::main::lastfm(),
        legacy::legacy::legacy(),
        tts::main::tts(),
        h247::main::h247(),
        context::user::user_lookup(),
        context::user::user_love(),
        context::msg::msg_question(),
        context::msg::msg_play(),
        context::msg::msg_convert_mp4(),
        honeypot::main::honeypot(),
        voicedashboard::main::voicedashboard(),
        suggestion::setsuggest::setsuggest(),
        suggestion::suggest::suggest(),
        newfeatures::punishpub::punishpub(),
        newfeatures::report::report(),
        newfeatures::rolesaver::rolesaver(),
        newfeatures::nightmode::nightmode(),
        newfeatures::counter::counter(),
        newfeatures::git::git_parent(),
        giveaway::main::giveaway(),
        ticket::main::ticket(),
        backup::main::backup(),
        schedule::main::schedule(),
        confession::main::confession(),
        invitesmanager::inv::inv(),
        membercount::main::membercount(),
        rolereactions::rolereaction::rolereaction(),
        rolereactions::rolereaction::rolebutton(),
        rolereactions::rolereaction::roleselect(),
        starboard::main::starboard(),
        starboard::skullboard::skullboard(),
        sticky::main::sticky(),
        tag::main::tag(),
        owner::main::owner(),
        owner::main::unowner_alias(),
        owner::main::blacklist(),
        owner::main::unblacklist(),
        owner::main::blinfo(),
        owner::main::bledit(),
        owner::main::eval(),
        botcat::andru::andru(),
        botcat::botinfo::botinfo_full(),
        botcat::ether::ether(),
        botcat::help::help(),
        botcat::invite::invite(),
        botcat::iris::iris(),
        botcat::kisakay::kisakay(),
        botcat::link::links(),
        botcat::noaimie::noaimie(),
        botcat::ping::ping(),
        botcat::say::say(),
        botcat::setserverlang::setlang(),
        botcat::status::status(),
        botcat::custom::custom(),
        botcat::prefix::prefix_top(),
        stats::main::stats(),
    ]
}

/// Leaf count mirroring `client.content.length` in production.
/// `loadHybridCommands.ts` pushes one entry per subcommand leaf
/// (`processOptions` recursion, `messageCmd: 2`), one per flat command
/// without subcommands (`messageCmd: 2`), one per SlashCommands entry
/// (`messageCmd: 0`) and one per message command (`messageCmd: 1`);
/// parents with subcommands are NOT themselves counted and context-menu
/// entries (`applicationsCommands`) are a separate collection. So: skip
/// context-menu nodes (poise 0.6 marks them via
/// `context_menu_action: Option<...>`), recurse into subcommands to the
/// leaves, and count every childless node as 1 (prefix-only leaves count
/// like TS `messageCmd: 1`; slash/prefix legs are irrelevant here).
pub fn content_leaf_count(commands: &[poise::Command<Data, Error>]) -> usize {
    commands
        .iter()
        .map(|c| {
            if c.context_menu_action.is_some() {
                0
            } else if c.subcommands.is_empty() {
                1
            } else {
                content_leaf_count(&c.subcommands)
            }
        })
        .sum()
}

/// Pre-command defer policy. Mirrors `deferIfNeeded` in
/// `src/core/commandExecutor.ts`: a slash invocation defers (public
/// "thinking..." or ephemeral) when the TS `thinking`/`ephemeral`
/// flags say so. `defer` is the OR of the subcommand and parent flags
/// (TS `target.thinking || command.thinking || target.ephemeral`);
/// `ephemeral` is the subcommand flag only (TS `target.ephemeral`,
/// falling back to the parent flag for top-level commands).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DeferPolicy {
    pub defer: bool,
    pub ephemeral: bool,
}

impl DeferPolicy {
    const NONE: DeferPolicy = DeferPolicy {
        defer: false,
        ephemeral: false,
    };
    const PUBLIC: DeferPolicy = DeferPolicy {
        defer: true,
        ephemeral: false,
    };
    const EPHEMERAL: DeferPolicy = DeferPolicy {
        defer: true,
        ephemeral: true,
    };
}

/// Resolve the defer policy for a poise qualified command path
/// (`"mod"`, `"authrestore set"`). Pure so it stays unit-testable.
/// Lookup is exact-path first, then the top-level parent segment
/// (mirrors the TS subcommand-overrides-parent branch); unknown
/// paths default to no defer. Names below are the Rust-registered
/// slash names, verified against the `rename = ...` attributes.
pub fn defer_policy(qualified_path: &str) -> DeferPolicy {
    /// Subcommands that defer ephemerally (TS `ephemeral: true`).
    const EPHEMERAL_PATHS: &[&str] = &[
        "tag use",
        "tag info",
        "lastfm config",
        "lastfm login",
        "suggest reply",
        "suggest deny",
        "suggest accept",
        "suggest delete",
        "authrestore set",
        "blogger blog add",
        "blogger blog remove",
        // Flat commands whose TS fragment sets ephemeral: true.
        "caracteres",
        "vc",
        "inviteinfo",
    ];
    /// Parents whose whole subtree defers publicly (TS top-level
    /// `thinking: true`), plus flat commands under such parents.
    const PUBLIC_PATHS: &[&str] = &[
        "antispam",
        "backup",
        "custom",
        "gw",
        "h247",
        "inv",
        "membercount",
        "mod",
        "music",
        "stats",
        "ticket",
        "unban-all",
        "authrestore",
        "automod",
        "guildconfig",
        "lastfm",
        // FLATTEN-B3: ex-guildconfig leaves, TS thinking:true, ported
        // flat top-level (`support` is thinking:false, so no entry).
        "autoreact",
        "commandlimit",
        "setlogs",
        "report",
        "protect",
        "suggest",
        "voice",
        // TS `fun` parent is thinking:true but ported flat.
        "dice",
        "heads-tails",
        "number",
        "question",
        "morse",
        "love",
        "poll",
        "hack",
        "cat",
        "dog",
        "rate",
        "gay",
        "stench",
        "catsay",
        "transgender",
        "youtube",
        "tweet",
        "bubbles",
        "dolphin",
        "duck",
        "fox",
        "frog",
        "panda",
        "squirrel",
        "67",
        "grosbg",
        "trans",
        "captions",
        "togif",
        "hug",
        "kiss",
        "slap",
        "config",
        // TS `channel` parent is thinking:true but ported flat.
        "renew",
        "sync",
        "hide",
        "hideall",
        "unhide",
        "unhideall",
        "cooldown",
        "media-only",
        // TS `utils`/`util` thinking:true subcommands, ported flat.
        "massmove",
        "massiverole",
        "zip-emojis",
        "zip-stickers",
        "unzip-emojis",
        // TS `ranks` thinking:true subcommands.
        "ranks config",
        "ranks roles",
        "ranks ignore-channels",
        // TS `authrestore` parent is thinking:true; the explicit
        // subcommand rows below mirror its !get/!delete/!roles/
        // !force-join.ts handlers (the parent fallback already covers
        // them, listed here so the table stays explicit).
        "authrestore get",
        "authrestore delete",
        "authrestore roles",
        "authrestore force-join",
        // TS message-context `Play it in a voice channel`.
        "msg_play",
    ];
    if EPHEMERAL_PATHS.contains(&qualified_path) {
        return DeferPolicy::EPHEMERAL;
    }
    if PUBLIC_PATHS.contains(&qualified_path) {
        return DeferPolicy::PUBLIC;
    }
    if let Some((parent, _)) = qualified_path.split_once(' ') {
        if PUBLIC_PATHS.contains(&parent) {
            return DeferPolicy::PUBLIC;
        }
    }
    // FLATTEN: the registry root is flat like production (TS
    // HybridCommands are flat files; `all()` holds ~87 top-level
    // entries, under Discord's 100-command cap). The tables list leaf
    // names flat — match the leaf segment too so per-leaf TS thinking
    // flags resolve for flat invocations (`dice`) and the remaining
    // nested parents (`fun dice`, `mod ban`) alike.
    if let Some(leaf) = qualified_path.rsplit(' ').next() {
        if EPHEMERAL_PATHS.contains(&leaf) {
            return DeferPolicy::EPHEMERAL;
        }
        if PUBLIC_PATHS.contains(&leaf) {
            return DeferPolicy::PUBLIC;
        }
    }
    DeferPolicy::NONE
}

/// Fetch guild lang then resolve a YAML key. Mirrors:
///   const lang = await client.func.getLanguageData(guildId)
pub async fn lang_for(ctx: &Ctx<'_>, key: &str, fallback: &str) -> String {
    let guild_id = ctx.guild_id().map(|g| g.get());
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, guild_id).await;
    crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
}

/// Modal-submit wait. Mirrors the `time` in
/// `core/functions/modalHelper.ts` (iHorizonModalResolve, 1_240_000 ms).
pub const MODAL_SUBMIT_TIMEOUT_SECS: u64 = 1240;

/// Seen modal-submit interaction ids. Mirrors the `cache` array in
/// `core/functions/modalHelper.ts` (duplicate submits resolve to
/// undefined so double-submits are ignored).
static SEEN_MODAL_SUBMITS: std::sync::OnceLock<std::sync::Mutex<std::collections::HashSet<u64>>> =
    std::sync::OnceLock::new();

/// Await the modal submit for `custom_id` from the interaction author.
/// Mirrors iHorizonModalResolve (customId + author filter, TS timeout,
/// response-id dedupe). Returns None on timeout or duplicate submit.
/// Callers show the modal themselves first, then keep their own
/// acknowledge/defer (TS deferUpdate default), like the existing sites.
pub async fn await_modal_submit(
    ctx: &poise::serenity_prelude::Context,
    comp: &poise::serenity_prelude::ComponentInteraction,
    custom_id: &str,
) -> Option<poise::serenity_prelude::ModalInteraction> {
    use poise::serenity_prelude as serenity;
    let submit = serenity::collector::ModalInteractionCollector::new(&ctx.shard)
        .author_id(comp.user.id)
        .custom_ids(vec![custom_id.to_string()])
        .timeout(std::time::Duration::from_secs(MODAL_SUBMIT_TIMEOUT_SECS))
        .await?;
    let fresh = SEEN_MODAL_SUBMITS
        .get_or_init(|| std::sync::Mutex::new(std::collections::HashSet::new()))
        .lock()
        .map(|mut seen| seen.insert(submit.id.get()))
        .unwrap_or(true);
    if !fresh {
        return None;
    }
    Some(submit)
}

/// Confirm-prompt button ids. Mirrors the customIds in
/// `core/functions/awaitingResponse.ts` (promptYesOrNo).
pub const CONFIRM_YES_ID: &str = "yes";
pub const CONFIRM_NO_ID: &str = "no";

/// Confirm-prompt button row. Pure: yes (Danger when the action is
/// destructive), disabled "<   >" spacer, no (inverted style).
/// Mirrors the ActionRowBuilder in promptYesOrNo.
pub fn confirm_row(
    yes_label: &str,
    no_label: &str,
    danger: bool,
) -> poise::serenity_prelude::CreateActionRow {
    use poise::serenity_prelude as serenity;
    let (yes_style, no_style) = if danger {
        (
            serenity::ButtonStyle::Danger,
            serenity::ButtonStyle::Success,
        )
    } else {
        (
            serenity::ButtonStyle::Success,
            serenity::ButtonStyle::Danger,
        )
    };
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(CONFIRM_YES_ID)
            .style(yes_style)
            .label(yes_label),
        serenity::CreateButton::new("blank1")
            .style(serenity::ButtonStyle::Secondary)
            .label("<   >")
            .disabled(true),
        serenity::CreateButton::new(CONFIRM_NO_ID)
            .style(no_style)
            .label(no_label),
    ])
}

/// Send a yes/no confirm prompt and await the invoker's answer.
/// Mirrors promptYesOrNo: author-only filter, 60s wait, buttons
/// cleared afterwards, true only on "yes" (timeout/no clears the
/// buttons and yields false instead of throwing like discord.js).
pub async fn prompt_yes_or_no(
    ctx: &Ctx<'_>,
    content: String,
    yes_label: String,
    no_label: String,
    danger: bool,
) -> Result<bool, anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let author = ctx.author().id;
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .content(content)
                .components(vec![confirm_row(&yes_label, &no_label, danger)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let pressed = msg
        .await_component_interaction(ctx.serenity_context().shard.clone())
        .timeout(std::time::Duration::from_secs(60))
        .filter(move |i| {
            i.user.id == author
                && (i.data.custom_id == CONFIRM_YES_ID || i.data.custom_id == CONFIRM_NO_ID)
        })
        .await;
    // Acknowledge like TS `deferUpdate()` so Discord does not flag
    // the interaction as failed, then clear the buttons.
    if let Some(pressed) = pressed.as_ref() {
        let _ = pressed
            .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
            .await;
    }
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(pressed
        .map(|i| i.data.custom_id == CONFIRM_YES_ID)
        .unwrap_or(false))
}

/// Standard destructive-reset confirm. Mirrors the repeated
/// resetallinvites yes/no promptYesOrNo gate (content key, danger
/// style; abort replies setjoinroles_action_canceled and yields
/// false so callers just `return Ok(())`).
pub async fn prompt_reset_confirm(
    ctx: &Ctx<'_>,
    content_key: &str,
    content_fallback: &str,
) -> Result<bool, anyhow::Error> {
    let content = lang_for(ctx, content_key, content_fallback).await;
    let yes = lang_for(ctx, "resetallinvites_yes_button", "Delete all").await;
    let no = lang_for(ctx, "resetallinvites_no_button", "Undo action").await;
    if prompt_yes_or_no(ctx, content, yes, no, true).await? {
        Ok(true)
    } else {
        ctx.say(lang_for(ctx, "setjoinroles_action_canceled", "Action canceled").await)
            .await?;
        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn confirm_row_has_yes_spacer_no_buttons() {
        for danger in [true, false] {
            let row = confirm_row("Yes", "No", danger);
            match row {
                poise::serenity_prelude::CreateActionRow::Buttons(btns) => {
                    assert_eq!(btns.len(), 3);
                }
                _ => panic!("confirm prompt must be a button row"),
            }
        }
    }

    #[test]
    fn registry_has_expected_commands() {
        let cmds = all();
        // Remaining parents + hoisted flat leaves (FLATTEN B1-B4: ex-bot
        // / owner / guildconfig / newfeatures / rolereactions leaves now
        // top-level like production) + context entries + split-off utils
        // parents. Discord caps top-level slash at 100.
        assert_eq!(cmds.len(), 90);
        // Every nested leaf keeps working through its parent.
        fn flatten<'a>(
            cmds: &'a [poise::Command<super::Data, super::Error>],
            out: &mut Vec<&'a poise::Command<super::Data, super::Error>>,
        ) {
            for c in cmds {
                out.push(c);
                flatten(&c.subcommands, out);
            }
        }
        let mut flat = vec![];
        flatten(&cmds, &mut flat);
        let flat_names: Vec<String> = flat.iter().map(|c| c.name.clone()).collect();
        // FLATTEN-B3: ex-guildconfig leaves register top-level.
        let top_names: Vec<String> = cmds.iter().map(|c| c.name.clone()).collect();
        for expected in ["autoreact", "commandlimit", "setlogs", "support"] {
            assert!(
                top_names.contains(&expected.to_string()),
                "missing top-level {expected}"
            );
        }
        for expected in [
            "fun",
            "utils",
            "legacy",
            "dice",
            "ban",
            "play",
            "gw",
            "ticket",
            "backup",
            "tag",
            "stats",
            "protect",
            "honeypot",
            "antispam",
            "ranks",
            "economy",
            "confession",
            "music",
            "guildconfig",
            "mod",
            "authrestore",
            "security",
            "counter",
            "git",
            "owner",
            "blacklist",
            "unblacklist",
            "blinfo",
            "bledit",
            "eval",
            "rolereaction",
            "pfps",
            "starboard",
            "skullboard",
            "schedule",
            "profil",
            "membercount",
            "botinfo",
            "status",
            "andru",
            "ether",
            "iris",
            "dice",
            "heads-tails",
            "number",
            "question",
            "morse",
            "config",
            "love",
            "poll",
            "hack",
            "cat",
            "dog",
            "caracteres",
            "catsay",
            "transgender",
            "youtube",
            "tweet",
            "bubbles",
            "dolphin",
            "duck",
            "fox",
            "frog",
            "panda",
            "squirrel",
            "grosbg",
            "trans",
            "hug",
            "kiss",
            "slap",
            "rate",
            "gay",
            "stench",
            "avatar",
            "userinfo",
            "serverinfo",
            "snipe",
            "prevnames",
            "where",
            "serverpic",
            "addrole",
            "addrolereact",
            "delrole",
            "embed",
            "massmove",
            "dm",
            "leash",
            "unleash",
            "nick-kicker",
            "move",
            "wlvc",
            "unwlvc",
            "zip-stickers",
            "zip-emojis",
            "unzip-emojis",
            "renewvc",
            "vkick",
            "emojis",
            "nickrole",
            "rolelimit",
            "renew",
            "sync",
            "derank",
            "massiverole",
            "wakeup",
            "derogation",
            "vc",
            "bringall",
            "talk",
            "untalk",
            "allbots",
            "role-members",
            "inviteinfo",
            "allwebhooks",
            "admin-users",
            "67",
            "setmentionrole",
            "autorenew",
            "cooldown",
            "sticker",
            "freeze",
            "unfreeze",
            "hide",
            "hideall",
            "unhideall",
            "unhide",
            "unban-all",
            "undo",
            "wlroles-add",
            "wlroles-list",
            "wlroles",
            "media-only",
            "help",
            "ping",
            "mod",
            "authrestore",
            "protect",
            "security",
            "antispam",
            "gw",
            "guildconfig",
            "automod",
            "ranks",
            "economy",
            "counter",
            "nightmode",
            "git",
            "owner",
            "rolereaction",
            "rolebutton",
            "roleselect",
            "pfps",
            "starboard",
            "skullboard",
            "schedule",
            "profil",
            "membercount",
            "confession",
            "botinfo",
            "status",
            "andru",
            "ether",
            "iris",
            "kisakay",
            "noaimie",
            "say",
            "setlang",
            "invite",
            "links",
            "inv",
            "sticky",
            "tag",
            "tts",
            "h247",
            "user_lookup",
            "user_love",
            "msg_question",
            "msg_play",
            "honeypot",
            "voice",
            "rolesaver",
            "report",
            "setsuggest",
            "suggest",
            "stats",
            "ticket",
            "backup",
            "music",
            "notifier",
            "blogger",
            "lastfm",
            "autorespond",
            "antiexe",
            "add-react",
            "list-react",
            "remove-react",
            "toggle-react",
            "welcomer",
            "updates",
            "shardinfo",
            "status-embed",
            "langstats",
            "nitrofdp",
            "securewebhook",
            "fexini",
            "kawaeine",
            "rap-vs-reality",
            "two-sides",
            "vanity-generator",
            "embed",
        ] {
            assert!(
                flat_names.contains(&expected.to_string()),
                "missing {expected}"
            );
        }
        // Discord caps top-level slash commands at 100: the root is flat
        // like production (FLATTEN), so every top-level entry — remaining
        // parents and hoisted leaves alike — carries its own slash action.
        let slash_top: Vec<&String> = cmds
            .iter()
            .filter(|c| c.slash_action.is_some())
            .map(|c| &c.name)
            .collect();
        assert!(
            slash_top.len() <= 100,
            "too many top-level slash commands: {}",
            slash_top.len()
        );
    }

    #[test]
    fn privileged_commands_keep_ts_permission_gates() {
        use poise::serenity_prelude::Permissions;
        fn flatten<'a>(
            cmds: &'a [poise::Command<super::Data, super::Error>],
            out: &mut Vec<&'a poise::Command<super::Data, super::Error>>,
        ) {
            for c in cmds {
                out.push(c);
                flatten(&c.subcommands, out);
            }
        }
        let cmds = all();
        let mut flat = vec![];
        flatten(&cmds, &mut flat);
        let find = |name: &str| {
            flat.iter()
                .find(|c| c.name == name)
                .unwrap_or_else(|| panic!("command {name} missing from registry"))
        };
        // autofeur.ts: permission ManageGuildExpressions.
        assert!(find("autorespond")
            .default_member_permissions
            .contains(Permissions::MANAGE_GUILD_EXPRESSIONS));
        // @antiexe.ts: permission Administrator.
        assert!(find("antiexe")
            .default_member_permissions
            .contains(Permissions::ADMINISTRATOR));
        // (autoreact sub-leaves were removed as invented tops; the
        // parent keeps its ADMINISTRATOR gate.)
        // mod.ts per-subcommand gates (were all ADMINISTRATOR via parent).
        assert!(find("ban")
            .default_member_permissions
            .contains(Permissions::BAN_MEMBERS));
        assert!(find("tempmute")
            .default_member_permissions
            .contains(Permissions::MODERATE_MEMBERS));
        assert!(find("kick")
            .default_member_permissions
            .contains(Permissions::KICK_MEMBERS));
        assert!(find("clear")
            .default_member_permissions
            .contains(Permissions::MANAGE_MESSAGES));
        assert!(find("banlist")
            .default_member_permissions
            .contains(Permissions::MANAGE_GUILD));
        assert!(find("rolepanel")
            .default_member_permissions
            .contains(Permissions::MANAGE_ROLES));
        // backup.ts create aliases include TS bcreate (multiple parents
        // have a "create" subcommand; check any of them).
        assert!(flat
            .iter()
            .filter(|c| c.name == "create")
            .any(|c| c.aliases.contains(&"bcreate".to_string())));
        // mod.ts canonical names + alias parity (review round 2).
        let aliases_of = |name: &str| {
            flat.iter()
                .find(|c| c.name == name)
                .unwrap_or_else(|| panic!("command {name} missing from registry"))
                .aliases
                .clone()
        };
        assert!(aliases_of("tempmute").contains(&"mute".to_string()));
        assert!(aliases_of("ban").contains(&"addban".to_string()));
        assert!(aliases_of("unban").contains(&"pardon".to_string()));
        assert!(aliases_of("banlist").contains(&"bans".to_string()));
        assert!(aliases_of("clear").contains(&"cls".to_string()));
        assert!(aliases_of("warnlist").contains(&"sanctions".to_string()));
        assert!(aliases_of("tempban").contains(&"tban".to_string()));
        // U-ALIASES3 utils batch (representative carriers).
        assert!(aliases_of("avatar").contains(&"pfp".to_string()));
        assert!(aliases_of("snipe").contains(&"s".to_string()));
        assert!(aliases_of("serverinfo").contains(&"si".to_string()));
        assert!(aliases_of("role-members").contains(&"rolemembers".to_string()));
        // U-ECONOMY aliases.
        assert!(aliases_of("balance").contains(&"wallet".to_string()));
        assert!(aliases_of("deposit").contains(&"dep".to_string()));
        // U-GATES2 economy/ticket/giveaway gates.
        assert!(find("balance-add")
            .default_member_permissions
            .contains(Permissions::ADMINISTRATOR));
        // role-add used to exist under ranks (ADMINISTRATOR) and economy
        // (MANAGE_GUILD per TS); both were renamed to TS-exact leaves,
        // so assert the loosened one at its TS group path.
        assert!(all()
            .iter()
            .find(|c| c.name == "economy")
            .and_then(|e| e.subcommands.iter().find(|c| c.name == "role"))
            .and_then(|r| r.subcommands.iter().find(|c| c.name == "add"))
            .is_some_and(|c| c
                .default_member_permissions
                .contains(Permissions::MANAGE_GUILD)));
        assert!(find("open").default_member_permissions.is_empty());
        assert!(find("add-member")
            .default_member_permissions
            .contains(Permissions::MANAGE_CHANNELS));
        // U-ALIASES4 batch (profil/ranks/stats/giveaway/music/bot/
        // antispam/invites/owner/guildconfig/rolereactions/ticket).
        // Several names repeat across parents; match any carrier.
        let has_alias = |name: &str, alias: &str| {
            flat.iter()
                .filter(|c| c.name == name)
                .any(|c| c.aliases.contains(&alias.to_string()))
        };
        assert!(has_alias("show", "me"));
        assert!(has_alias("set-birthday", "anniversaire"));
        assert!(has_alias("ustats", "u"));
        assert!(has_alias("channel-stats", "chstats"));
        assert!(has_alias("play", "p"));
        // `bl` is a prefix alias of flat /blacklist, never its own
        // slash command (A1 extras-removal).
        assert!(has_alias("blacklist", "bl"));
        assert!(has_alias("kisakay", "anaïs"));
        // U-GATES2-UTILS representative gates.
        assert!(find("derank")
            .default_member_permissions
            .contains(Permissions::ADMINISTRATOR));
        assert!(find("addrole")
            .default_member_permissions
            .contains(Permissions::MANAGE_ROLES));
        assert!(find("vanity-generator")
            .default_member_permissions
            .contains(Permissions::MANAGE_GUILD));
        // U-GATES3 perm-audit wave (representative leaves; several
        // names repeat across parents, so match any carrier).
        let has_gate = |name: &str, perm: Permissions| {
            flat.iter()
                .filter(|c| c.name == name)
                .any(|c| c.default_member_permissions.contains(perm))
        };
        assert!(has_gate("move", Permissions::MOVE_MEMBERS));
        assert!(has_gate("vkick", Permissions::MODERATE_MEMBERS));
        assert!(has_gate("hide", Permissions::MANAGE_CHANNELS));
        assert!(has_gate("hideall", Permissions::ADMINISTRATOR));
        assert!(has_gate("prefix", Permissions::ADMINISTRATOR));
        assert!(has_gate("channel", Permissions::ADMINISTRATOR));
        assert!(has_gate("text", Permissions::ADMINISTRATOR));
        assert!(has_gate("delete", Permissions::ADMINISTRATOR));
        assert!(has_gate("join", Permissions::ADMINISTRATOR));
        assert!(has_gate("add", Permissions::MANAGE_GUILD));
        assert!(has_gate("history", Permissions::ADMINISTRATOR));
        assert!(has_gate("user_lookup", Permissions::ADMINISTRATOR));
        assert!(has_gate("embed", Permissions::MANAGE_MESSAGES));
        // TS utils.ts:713-717: MoveMembers + ModerateMembers (not MANAGE_GUILD).
        assert!(has_gate("massmove", Permissions::MOVE_MEMBERS));
        assert!(has_gate("wlroles", Permissions::ADMINISTRATOR));
        assert!(has_gate("say", Permissions::ADMINISTRATOR));
        assert!(has_gate("create-thread", Permissions::ADMINISTRATOR));
        assert!(has_gate("unban-all", Permissions::ADMINISTRATOR));
        assert!(has_gate("sanction", Permissions::ADMINISTRATOR));
        assert!(has_gate("set-voice-channel", Permissions::ADMINISTRATOR));
        // TS @add-react.ts:46 / @remove-react.ts:46 / @list-react.ts.
        assert!(has_gate("add-react", Permissions::MANAGE_GUILD_EXPRESSIONS));
        assert!(has_gate(
            "remove-react",
            Permissions::MANAGE_GUILD_EXPRESSIONS
        ));
        assert!(has_gate("list-react", Permissions::ADD_REACTIONS));
    }

    #[test]
    fn content_leaf_count_mirrors_ts_content_length() {
        type Cmd = poise::Command<super::Data, super::Error>;
        fn leaf(name: &str) -> Cmd {
            poise::Command {
                name: name.to_string(),
                ..Default::default()
            }
        }
        fn dummy_user_ctx(
            _: poise::ApplicationContext<'_, super::Data, super::Error>,
            _: poise::serenity_prelude::User,
        ) -> poise::BoxFuture<'_, Result<(), poise::FrameworkError<'_, super::Data, super::Error>>>
        {
            Box::pin(async { Ok(()) })
        }
        // Flat childless node counts 1 (TS messageCmd 2 flat push).
        assert_eq!(super::content_leaf_count(&[leaf("ping")]), 1);
        // Parent with subcommands counts its leaves, not itself.
        let parent = Cmd {
            name: "mod".to_string(),
            subcommands: vec![leaf("ban"), leaf("kick")],
            ..Default::default()
        };
        assert_eq!(super::content_leaf_count(&[parent]), 2);
        // Group nesting recurses to leaves at any depth.
        let nested = Cmd {
            name: "p".to_string(),
            subcommands: vec![
                leaf("a"),
                Cmd {
                    name: "g".to_string(),
                    subcommands: vec![leaf("b"), leaf("c")],
                    ..Default::default()
                },
            ],
            ..Default::default()
        };
        assert_eq!(super::content_leaf_count(&[nested]), 3);
        // Context-menu entries are a separate collection: skipped.
        let ctx_cmd = Cmd {
            name: "user_lookup".to_string(),
            context_menu_action: Some(poise::ContextMenuCommandAction::User(dummy_user_ctx)),
            ..Default::default()
        };
        assert_eq!(super::content_leaf_count(&[ctx_cmd]), 0);
        // Prefix-only leaves count like TS messageCmd 1: slash/prefix
        // legs are irrelevant, so a bare childless node counts 1.
        let prefix_only = Cmd {
            name: "sticker".to_string(),
            prefix_action: None,
            slash_action: None,
            ..Default::default()
        };
        assert_eq!(super::content_leaf_count(&[prefix_only]), 1);
        assert_eq!(
            super::content_leaf_count(&[leaf("a"), leaf("b"), leaf("c")]),
            3
        );
    }

    #[test]
    fn content_leaf_count_registry_excludes_context_menu() {
        let cmds = all();
        let leaves = super::content_leaf_count(&cmds);
        // Parents expand to their leaves, so the leaf total exceeds the
        // top-level count; the context-menu entries contribute nothing.
        assert!(leaves > cmds.len());
        let ctx_skipped = cmds
            .iter()
            .filter(|c| c.context_menu_action.is_some())
            .count();
        assert!(ctx_skipped > 0);
        // Leaves over the non-context top-level nodes equal the full
        // total, proving context-menu entries contribute nothing.
        let mut manual = 0usize;
        for c in cmds.iter().filter(|c| c.context_menu_action.is_none()) {
            manual += super::content_leaf_count(std::slice::from_ref(c));
        }
        assert_eq!(manual, leaves);
    }

    #[test]
    fn command_names_are_unique() {
        // Discord rejects duplicate slash names at registration; fail fast.
        let mut names: Vec<String> = all().iter().map(|c| c.name.clone()).collect();
        names.sort();
        let before = names.len();
        names.dedup();
        assert_eq!(names.len(), before, "duplicate command names");
    }

    #[test]
    fn slash_option_names_match_ts() {
        // PARAM-NAMES: poise derives slash option names from Rust idents
        // (snake_case) while TS registers kebab-case names, so every
        // divergence is pinned with an explicit `#[rename]`. This test
        // samples the fixed (command, options) pairs against the live
        // registry, any-carrier (several leaf names repeat across
        // parents, like the gates test above).
        fn flatten<'a>(
            cmds: &'a [poise::Command<super::Data, super::Error>],
            out: &mut Vec<&'a poise::Command<super::Data, super::Error>>,
        ) {
            for c in cmds {
                out.push(c);
                flatten(&c.subcommands, out);
            }
        }
        let cmds = all();
        let mut flat = vec![];
        flatten(&cmds, &mut flat);
        // (command name, exact option names in declaration order).
        const EXACT: &[(&str, &[&str])] = &[
            ("help", &["command-name"]),
            ("spam", &["action", "logs-channel"]),
            (
                "mass-mention",
                &["action", "max-mention-allowed", "logs-channel"],
            ),
            (
                "command",
                &[
                    "action",
                    "command",
                    "permission",
                    "custom-role",
                    "custom-user",
                ],
            ),
            ("edit-roles", &["perm_level", "perm_role"]),
            ("setlogs", &["type", "channel"]),
            ("too-new-account", &["minimum-date", "maximum-join"]),
            ("prefix", &["name"]),
            ("restore", &["backup-to-load"]),
            ("clear", &["number", "member"]),
            // TS economy group `role`: leaf `add` (was flat `role-add`).
            ("add", &["role", "amount"]),
            ("autorenew", &["channel", "time"]),
            ("dm", &["private", "member", "message"]),
            ("vkick", &["member"]),
            ("wakeup", &["member"]),
            ("where", &["member"]),
            ("derank", &["member"]),
            ("invites", &["member"]),
            ("roles", &["key", "roles"]),
            ("sanction", &["choose"]),
            ("allow-add", &["member"]),
            ("allow-remove", &["member"]),
            ("punishpub", &["amount", "punishement", "status"]),
            ("report", &["message-to-dev"]),
            (
                "rolebutton",
                &["value", "channel", "message_id", "reaction", "role"],
            ),
            ("roleselect", &["channel", "message_id"]),
            ("set-voice-channel", &["channel"]),
            ("set-text-channel", &["channel"]),
            ("set-voice-channel-name", &["channel_name"]),
            ("set-voice-channel-position", &["position_type"]),
        ];
        for (cmd, opts) in EXACT {
            let carriers: Vec<_> = flat.iter().filter(|c| c.name == **cmd).collect();
            assert!(!carriers.is_empty(), "missing command {cmd}");
            let want: Vec<&str> = opts.to_vec();
            assert!(
                carriers.iter().any(|c| c
                    .parameters
                    .iter()
                    .map(|p| p.name.as_str())
                    .collect::<Vec<_>>()
                    == want),
                "option names diverged for /{cmd}: want {want:?}"
            );
        }
        // Repeated leaf names: assert the fixed option exists on some carrier.
        const PRESENT: &[(&str, &str)] = &[
            ("config", "power"),
            ("channel", "id"),
            ("add", "member"),
            ("remove", "member"),
            ("unowner", "member"),
            ("set-voice-channel-catgory", "category"),
            ("move", "member"),
            ("move", "channel"),
        ];
        for (cmd, opt) in PRESENT {
            assert!(
                flat.iter()
                    .filter(|c| c.name == **cmd)
                    .any(|c| c.parameters.iter().any(|p| p.name == **opt)),
                "missing option {opt} on /{cmd}"
            );
        }
    }

    #[test]
    fn all_commands_support_slash_and_prefix() {
        // Prefix-alias delegates: TS exposes `bl` solely as a prefix
        // alias (aliases: ["bl"] on flat /blacklist, never its own
        // slash command), while `unowner` is a standalone hybrid
        // command (ChatInput) with a restored slash leg. `unblacklist`
        // used to be exempt here too, but FLATTEN-B2 made it a real
        // top-level hybrid so it now asserts both legs like the rest.
        const PREFIX_ONLY_DELEGATES: [&str; 1] = ["unowner"];
        // MessageCommand ports are prefix-only by design: TS registers
        // sticker/top/unslowmode under MessageCommands, never as slash.
        const PREFIX_ONLY_MESSAGE_COMMANDS: [&str; 3] = ["sticker", "top", "unslowmode"];
        // LEGACY-SLASH-STRIP: every other PREFIX_IHORIZON_COMMAND port
        // (MessageCommands/*, never slash-registered in TS, never
        // length-validated) is prefix-only too, plus the !welcomer.ts
        // panel entry (prefix-only in TS, named `welcomer` with the
        // `leaver` alias) and the `legacy` organizer
        // parent (its TS sources are flat MessageCommands, never a
        // slash parent). help_main
        // stays dual: its TS source is HybridCommands/bot/help.ts.
        const PREFIX_ONLY_LEGACY_STRIP: [&str; 24] = [
            "add-react",
            "antiexe",
            "autologs",
            "autorespond",
            "embed",
            "fexini",
            "helpall",
            "h",
            "kawaeine",
            "langstats",
            "list-react",
            "nitrofdp",
            "rap-vs-reality",
            "remove-react",
            "securewebhook",
            "shardinfo",
            "status-embed",
            "two-sides",
            "updates",
            "grosbg",
            "welcomer",
            "legacy",
            "prefix",
            "toggle-react",
        ];
        // Rust-only splits of a TS subcommand (wlroles add/list): kept
        // prefix-only so the parent's slash surface matches TS exactly.
        const PREFIX_ONLY_SPLITS: [&str; 2] = ["wlroles-add", "wlroles-list"];
        // Deliberate Rust-side readers with no TS slash home: kept
        // prefix-only so they never pollute the slash tree (poise
        // skips slash registration for prefix-only children).
        const PREFIX_ONLY_RUST_READERS: [&str; 1] = ["ghost-list"];
        fn flatten<'a>(
            cmds: &'a [poise::Command<super::Data, super::Error>],
            out: &mut Vec<&'a poise::Command<super::Data, super::Error>>,
        ) {
            for c in cmds {
                out.push(c);
                flatten(&c.subcommands, out);
            }
        }
        let cmds = all();
        let mut flat = vec![];
        flatten(&cmds, &mut flat);
        for cmd in flat {
            if cmd.context_menu_action.is_some() {
                continue;
            }
            if PREFIX_ONLY_DELEGATES.contains(&cmd.name.as_str())
                || PREFIX_ONLY_MESSAGE_COMMANDS.contains(&cmd.name.as_str())
                || PREFIX_ONLY_SPLITS.contains(&cmd.name.as_str())
                || PREFIX_ONLY_RUST_READERS.contains(&cmd.name.as_str())
                || PREFIX_ONLY_LEGACY_STRIP.contains(&cmd.name.as_str())
            {
                assert!(
                    cmd.prefix_action.is_some(),
                    "{} should be a prefix command",
                    cmd.name
                );
                continue;
            }
            assert!(
                cmd.slash_action.is_some(),
                "{} should be a slash command",
                cmd.name
            );
            assert!(
                cmd.prefix_action.is_some(),
                "{} should be a prefix command (HybridCommand)",
                cmd.name
            );
        }
    }

    #[test]
    fn prefix_aliases_collide_fail_fast() {
        // Mirrors loadHybridCommands.ts process.exit(1): command names
        // and every alias share one flat message_commands map, and
        // registering an already-taken key kills the boot. Subcommand
        // leaf names are deliberately excluded: TS overwrites those
        // silently (no has() check) and poise dispatches them
        // hierarchically — backup, giveaway, tag and schedule each own
        // a "create" leaf — so a flat check over leaf names would
        // false-positive. Keys are lowercased because prefix lookup is
        // case-insensitive on both sides (TS toLowerCase, poise
        // case_insensitive_commands), so "Foo" vs "foo" collide live.
        fn collect_aliases<'a>(
            cmds: &'a [poise::Command<super::Data, super::Error>],
            out: &mut Vec<(&'a str, &'a str)>,
        ) {
            for c in cmds {
                for a in &c.aliases {
                    out.push((c.name.as_str(), a.as_str()));
                }
                collect_aliases(&c.subcommands, out);
            }
        }
        let cmds = all();
        let mut seen: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        for cmd in &cmds {
            let folded = cmd.name.to_lowercase();
            if let Some(owner) = seen.insert(folded, cmd.name.clone()) {
                panic!(
                    "command \"{}\" collides with \"{owner}\" (would process.exit(1) in TS)",
                    cmd.name
                );
            }
        }
        let mut nested = vec![];
        collect_aliases(&cmds, &mut nested);
        for (owner, alias) in nested {
            let folded = alias.to_lowercase();
            if let Some(taken) = seen.insert(folded, owner.to_string()) {
                panic!(
                    "alias \"{alias}\" of \"{owner}\" collides with \"{taken}\" (would process.exit(1) in TS)"
                );
            }
        }
    }
}

#[cfg(test)]
mod defer_policy_tests {
    use super::*;

    #[test]
    fn unknown_commands_do_not_defer() {
        assert_eq!(defer_policy("ping"), DeferPolicy::NONE);
        assert_eq!(defer_policy("avatar"), DeferPolicy::NONE);
        assert_eq!(defer_policy(""), DeferPolicy::NONE);
    }

    #[test]
    fn thinking_parents_defer_publicly_with_subcommand_fallback() {
        // Top-level entry mirrors TS command.thinking.
        assert_eq!(defer_policy("mod"), DeferPolicy::PUBLIC);
        // Unlisted subcommand inherits the parent flag (TS target ||
        // command OR branch).
        assert_eq!(defer_policy("mod ban"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("music play"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("guildconfig setlogs"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("voice panel"), DeferPolicy::PUBLIC);
        // FLATTEN-B3: flat ex-guildconfig leaves keep TS thinking flags
        // (support.ts is thinking:false, so no defer like TS).
        assert_eq!(defer_policy("autoreact"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("commandlimit"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("setlogs"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("support"), DeferPolicy::NONE);
    }

    #[test]
    fn ephemeral_subcommands_override_parent_to_ephemeral() {
        // TS target.ephemeral wins over a thinking:true parent.
        assert_eq!(defer_policy("authrestore set"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("lastfm config"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("suggest deny"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("tag use"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("blogger blog add"), DeferPolicy::EPHEMERAL);
        // Non-ephemeral siblings stay public via the parent.
        assert_eq!(defer_policy("authrestore get"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("authrestore delete"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("authrestore roles"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("authrestore force-join"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("lastfm status"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("blogger blog list"), DeferPolicy::NONE);
    }

    #[test]
    fn flat_ported_subcommands_keep_ts_flags() {
        assert_eq!(defer_policy("dice"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("fun dice"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("renew"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("utils renew"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("massmove"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("utils massmove"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("ranks config"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("ranks roles"), DeferPolicy::PUBLIC);
        assert_eq!(defer_policy("caracteres"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("fun caracteres"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("vc"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("utils vc"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("inviteinfo"), DeferPolicy::EPHEMERAL);
        assert_eq!(defer_policy("utils inviteinfo"), DeferPolicy::EPHEMERAL);
        // TS thinking:false parents ported flat stay non-deferred.
        assert_eq!(defer_policy("ranks show"), DeferPolicy::NONE);
    }

    /// Offline mirror of the setup-time slash registration in bot.rs
    /// (`push` + `set_global_commands`): every built payload must pass
    /// Discord constraints, otherwise setup fails with `poise setup
    /// error` and every slash command answers "did not respond".
    #[test]
    fn slash_registration_payload_passes_discord_constraints() {
        fn valid_name(s: &str) -> bool {
            let n = s.chars().count();
            (1..=32).contains(&n)
                && s.chars().all(|c| {
                    c == '-' || c == '_' || c.is_ascii_lowercase() || c.is_ascii_digit() || {
                        // Non-ASCII letters allowed by Discord; case-fold
                        // check keeps it simple (no uppercase anywhere).
                        c.is_alphabetic() && c.to_lowercase().next() == Some(c)
                    }
                })
        }
        fn check_localizations(v: &serde_json::Value, path: &str, errs: &mut Vec<String>) {
            // Discord caps every localized description at 100 chars and
            // every localized name at 32 chars — the whole batch is
            // rejected when a single entry overflows (prefix-only ports
            // never faced this cap in TS, hence the offline guard).
            if let Some(map) = v
                .get("description_localizations")
                .and_then(|m| m.as_object())
            {
                for (locale, desc) in map {
                    let s = desc.as_str().unwrap_or("");
                    let n = s.chars().count();
                    if !(1..=100).contains(&n) {
                        errs.push(format!(
                            "{path}: bad description_localizations[{locale}] len {n}: {s:?}"
                        ));
                    }
                }
            }
            if let Some(map) = v.get("name_localizations").and_then(|m| m.as_object()) {
                for (locale, name) in map {
                    let s = name.as_str().unwrap_or("");
                    let n = s.chars().count();
                    if !(1..=32).contains(&n) {
                        errs.push(format!(
                            "{path}: bad name_localizations[{locale}] len {n}: {s:?}"
                        ));
                    }
                }
            }
        }
        fn check_option(v: &serde_json::Value, path: &str, errs: &mut Vec<String>) {
            let name = v.get("name").and_then(|n| n.as_str()).unwrap_or("");
            if !valid_name(name) {
                errs.push(format!("{path}: bad option name {name:?}"));
            }
            let desc = v.get("description").and_then(|d| d.as_str()).unwrap_or("");
            let dn = desc.chars().count();
            if !(1..=100).contains(&dn) {
                errs.push(format!("{path}/{name}: bad option description len {dn}"));
            }
            if let Some(opts) = v.get("options").and_then(|o| o.as_array()) {
                if opts.len() > 25 {
                    errs.push(format!("{path}/{name}: {} options > 25", opts.len()));
                }
                // Discord rejects required options placed after an
                // optional one (applies to leaf params, not to
                // subcommand/group listings which carry no `required`).
                let mut seen_optional = false;
                for o in opts {
                    let is_sub = o
                        .get("type")
                        .and_then(|t| t.as_u64())
                        .is_some_and(|t| t <= 2);
                    let req = o.get("required").and_then(|r| r.as_bool()).unwrap_or(false);
                    if !is_sub {
                        if req && seen_optional {
                            errs.push(format!(
                                "{path}/{name}: required option after optional: {:?}",
                                o.get("name").and_then(|n| n.as_str()).unwrap_or("")
                            ));
                        }
                        if !req {
                            seen_optional = true;
                        }
                    }
                    check_option(o, &format!("{path}/{name}"), errs);
                }
            }
            if let Some(choices) = v.get("choices").and_then(|c| c.as_array()) {
                if choices.len() > 25 {
                    errs.push(format!("{path}/{name}: {} choices > 25", choices.len()));
                }
            }
            check_localizations(v, &format!("{path}/{name}"), errs);
        }
        let mut errs: Vec<String> = vec![];
        let mut top_names: Vec<(u64, String)> = vec![];
        for cmd in all() {
            for built in [
                cmd.create_as_slash_command(),
                cmd.create_as_context_menu_command(),
            ]
            .into_iter()
            .flatten()
            {
                let v = serde_json::to_value(&built).expect("command serializes");
                check_localizations(&v, "top-level", &mut errs);
                let name = v
                    .get("name")
                    .and_then(|n| n.as_str())
                    .unwrap_or("")
                    .to_string();
                let kind = v.get("type").and_then(|t| t.as_u64()).unwrap_or(1);
                // Context-menu entries (user/message, kind 2/3) allow
                // spaces/uppercase and carry no description; only
                // chat-input (kind 1) faces the strict charset + desc.
                if kind == 1 {
                    if !valid_name(&name) {
                        errs.push(format!("top-level: bad command name {name:?}"));
                    }
                    let desc = v.get("description").and_then(|d| d.as_str()).unwrap_or("");
                    let dn = desc.chars().count();
                    if !(1..=100).contains(&dn) {
                        errs.push(format!("{name}: bad description len {dn}: {desc:?}"));
                    }
                }
                top_names.push((kind, name.clone()));
                if let Some(opts) = v.get("options").and_then(|o| o.as_array()) {
                    if opts.len() > 25 {
                        errs.push(format!("{name}: {} options > 25", opts.len()));
                    }
                    if kind == 1 && !cmd.subcommands.is_empty() && opts.is_empty() {
                        errs.push(format!("{name}: parent with subcommands built no options"));
                    }
                    for o in opts {
                        check_option(o, &name, &mut errs);
                    }
                } else if !cmd.subcommands.is_empty() {
                    errs.push(format!(
                        "{name}: parent with subcommands built no options array"
                    ));
                }
            }
        }
        top_names.sort();
        for w in top_names.windows(2) {
            if w[0] == w[1] {
                errs.push(format!("duplicate top-level command {:?}", w[0]));
            }
        }
        assert!(
            errs.is_empty(),
            "slash payload invalid:\n{}",
            errs.join("\n")
        );
        // Mirrors bot.rs push(): only top-level entries ship, so the
        // bulk array must stay under Discord's 100 global commands
        // (and the 130 pre-parse check — see the push() comment).
        assert!(
            top_names.len() <= 100,
            "too many top-level slash payloads: {}",
            top_names.len()
        );
    }
}
