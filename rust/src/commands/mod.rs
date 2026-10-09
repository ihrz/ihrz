// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/* + !BlankHybridCommandTemplate.ts.
//
// Template for new commands (copy-paste):
//   #[poise::command(slash_command, prefix_command, category = "<category>")]
//   pub async fn mycmd(ctx: Ctx<'_>) -> Result<(), Error> { ... }
// and register it in all() below. Each category dir in TS maps to a
// submodule here (see fun::, utils::).

pub mod antispam;
pub mod authrestore;
pub mod backup;
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

pub fn all() -> Vec<poise::Command<Data, Error>> {
    vec![
        fun::games::ping(),
        fun::games::dice(),
        fun::games::coinflip(),
        fun::games::number(),
        fun::games::question(),
        fun::games::morse(),
        fun::social::love(),
        fun::games::poll(),
        fun::games::hack(),
        fun::animals::cat(),
        fun::animals::dog(),
        fun::social::rate(),
        fun::social::gay(),
        fun::social::stench(),
        fun::media::caracteres(),
        fun::animals::catsay(),
        fun::media::transgender(),
        fun::media::youtube(),
        fun::media::tweet(),
        fun::media::bubbles(),
        fun::animals::dolphin(),
        fun::animals::duck(),
        fun::animals::fox(),
        fun::animals::frog(),
        fun::animals::panda(),
        fun::animals::squirrel(),
        fun::misc::sixseven(),
        fun::misc::grosbg(),
        fun::media::trans(),
        fun::social::hug(),
        fun::social::kiss(),
        fun::social::slap(),
        fun::misc::fun_config(),
        utils::info::botinfo(),
        utils::info::help_here(),
        utils::info::avatar(),
        utils::info::userinfo(),
        utils::info::top(),
        utils::info::serverinfo(),
        utils::info::snipe(),
        utils::info::prevnames(),
        utils::info::whereis(),
        utils::info::serverpic(),
        utils::roles::addrole(),
        utils::roles::delrole(),
        utils::admin::embed_post(),
        embed::embed_builder::embed_builder(),
        utils::voice::massmove(),
        utils::admin::dm(),
        utils::admin::leash(),
        utils::admin::unleash(),
        utils::roles::admin_roles(),
        utils::voice::voicemove(),
        utils::voice::wlvc(),
        utils::voice::unwlvc(),
        utils::admin::zip_stickers(),
        utils::admin::zip_emojis(),
        utils::admin::unzip_emojis(),
        utils::voice::renewvc(),
        utils::voice::vkick(),
        utils::info::emojis(),
        utils::roles::nickrole(),
        utils::roles::rolelimit(),
        utils::channels::renew(),
        utils::channels::syncchan(),
        utils::roles::derank(),
        utils::roles::massiverole(),
        utils::admin::wakeup(),
        utils::admin::derogation(),
        utils::voice::vc_list(),
        utils::voice::bringall(),
        utils::voice::talk(),
        utils::voice::untalk(),
        utils::admin::allbots(),
        utils::roles::role_members(),
        utils::info::inviteinfo(),
        utils::admin::allwebhooks(),
        utils::admin::admin_users(),
        utils::admin::setmentionrole(),
        utils::admin::autorenew(),
        utils::channels::slowmode(),
        utils::info::sticker(),
        utils::admin::nickkicker(),
        utils::channels::chan_hide(),
        utils::channels::chan_hideall(),
        utils::channels::chan_unhideall(),
        utils::channels::chan_unhide(),
        utils::admin::unban_all(),
        utils::admin::unban_undo(),
        utils::roles::wlroles_add(),
        utils::roles::wlroles_list(),
        utils::roles::wlroles(),
        utils::channels::media_only(),
        utils::voice::voicefreeze(),
        utils::voice::voiceunfreeze(),
        utils::info::banner(),
        moderation::main::moderation(),
        protection::protect::protect(),
        security::main::security(),
        antispam::main::antispam(),
        authrestore::main::authrestore(),
        guildconfig::main::guildconfig(),
        guildconfig::automod::gc_automod(),
        welcomer_panel::main::welcomer_panel(),
        economy::main::economy(),
        ranks::main::ranks(),
        profil::main::profil(),
        pfps::main::pfps(),
        music::main::music(),
        notifier::main::notifier(),
        blogger::main::blogger(),
        lastfm::main::lastfm(),
        legacy::autofeur::autofeur(),
        legacy::antiexe::antiexe(),
        legacy::react::add_react(),
        legacy::react::list_react(),
        legacy::react::remove_react(),
        legacy::info::welcomer(),
        legacy::info::updates(),
        legacy::help::helpall(),
        legacy::help::help_browser(),
        legacy::help_main::help_main(),
        legacy::info::shardinfo(),
        legacy::info::status_embed(),
        legacy::info::langstats(),
        legacy::memes::nitrofdp(),
        legacy::info::securewebhook(),
        legacy::memes::fexini(),
        legacy::memes::kawaeine(),
        legacy::memes::rap_vs_reality(),
        legacy::memes::two_sides(),
        utils::admin::vanity_generator(),
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
        newfeatures::counter::counter(),
        newfeatures::rolesaver::rolesaver(),
        newfeatures::report::report(),
        newfeatures::punishpub::punishpub(),
        newfeatures::nightmode::nightmode(),
        newfeatures::git::git_parent(),
        giveaway::main::giveaway(),
        ticket::main::ticket(),
        backup::main::backup(),
        schedule::main::schedule(),
        confession::main::confession(),
        invitesmanager::inv::inv(),
        membercount::main::membercount(),
        rolereactions::rolereaction::rolereaction(),
        rolereactions::rolereaction::addrolereact(),
        rolereactions::rolereaction::rolebutton(),
        rolereactions::rolereaction::roleselect(),
        starboard::main::starboard(),
        starboard::skullboard::skullboard(),
        sticky::main::sticky(),
        tag::main::tag(),
        owner::main::owner(),
        botcat::core::botinfo_full(),
        botcat::status::status(),
        botcat::lore::andru(),
        botcat::lore::ether(),
        botcat::lore::iris(),
        botcat::lore::kisakay(),
        botcat::noaimie::noaimie(),
        botcat::core::say(),
        botcat::core::setlang(),
        botcat::core::invite(),
        botcat::core::links(),
        botcat::custom::custom(),
        stats::main::stats(),
    ]
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
        let names: Vec<String> = cmds.iter().map(|c| c.name.clone()).collect();
        // 4 base + full parents + remaining stubs.
        assert_eq!(cmds.len(), 178);
        for expected in [
            "botinfo",
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
            "delrole",
            "embed-post",
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
            "slowmode",
            "sticker",
            "freeze",
            "unfreeze",
            "hide",
            "hideall",
            "unhideall",
            "unhide",
            "unban-all",
            "unban-undo",
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
            "bot-info",
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
            assert!(names.contains(&expected.to_string()), "missing {expected}");
        }
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
        // @toggle-react.ts: permission ManageGuildExpressions.
        assert!(find("autoreact-toggle")
            .default_member_permissions
            .contains(Permissions::MANAGE_GUILD_EXPRESSIONS));
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
        assert!(aliases_of("tempmute").contains(&"timeout".to_string()));
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
        // role-add exists under ranks (ADMINISTRATOR) and economy
        // (MANAGE_GUILD per TS); assert the loosened one exists.
        assert!(flat.iter().filter(|c| c.name == "role-add").any(|c| c
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
        assert!(has_gate("setprefix", Permissions::ADMINISTRATOR));
        assert!(has_gate("channel", Permissions::ADMINISTRATOR));
        assert!(has_gate("text", Permissions::ADMINISTRATOR));
        assert!(has_gate("delete", Permissions::ADMINISTRATOR));
        assert!(has_gate("join", Permissions::ADMINISTRATOR));
        assert!(has_gate("add", Permissions::MANAGE_GUILD));
        assert!(has_gate("history", Permissions::ADMINISTRATOR));
        assert!(has_gate("user_lookup", Permissions::ADMINISTRATOR));
        assert!(has_gate("embed", Permissions::MANAGE_MESSAGES));
        assert!(has_gate("massmove", Permissions::MANAGE_GUILD));
        assert!(has_gate("wlroles", Permissions::ADMINISTRATOR));
        assert!(has_gate("say", Permissions::ADMINISTRATOR));
        assert!(has_gate("create-thread", Permissions::ADMINISTRATOR));
        assert!(has_gate("unban-all", Permissions::ADMINISTRATOR));
        assert!(has_gate("sanction", Permissions::ADMINISTRATOR));
        assert!(has_gate("lobby", Permissions::ADMINISTRATOR));
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
    fn all_commands_support_slash_and_prefix() {
        for cmd in all() {
            if cmd.context_menu_action.is_some() {
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
