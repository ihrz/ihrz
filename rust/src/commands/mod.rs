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
pub mod blogger;
pub mod botcat;
pub mod confession;
pub mod context;
pub mod economy;
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
pub mod starboard;
pub mod stats;
pub mod sticky;
pub mod suggestion;
pub mod tag;
pub mod ticket;
pub mod tts;
pub mod utils;
pub mod voicedashboard;

use crate::bot::{Ctx, Data};

type Error = anyhow::Error;

pub fn all() -> Vec<poise::Command<Data, Error>> {
    vec![
        fun::ping(),
        fun::dice(),
        fun::coinflip(),
        fun::number(),
        fun::question(),
        fun::morse(),
        fun::love(),
        fun::poll(),
        fun::hack(),
        fun::cat(),
        fun::dog(),
        fun::rate(),
        fun::gay(),
        fun::stench(),
        fun::caracteres(),
        fun::catsay(),
        fun::transgender(),
        fun::youtube(),
        fun::tweet(),
        fun::bubbles(),
        fun::dolphin(),
        fun::duck(),
        fun::fox(),
        fun::frog(),
        fun::panda(),
        fun::squirrel(),
        fun::grosbg(),
        fun::trans(),
        fun::hug(),
        fun::kiss(),
        fun::slap(),
        fun::fun_config(),
        utils::botinfo(),
        utils::help_here(),
        utils::avatar(),
        utils::userinfo(),
        utils::serverinfo(),
        utils::snipe(),
        utils::prevnames(),
        utils::whereis(),
        utils::serverpic(),
        utils::addrole(),
        utils::delrole(),
        utils::embed_post(),
        utils::massmove(),
        utils::dm(),
        utils::leash(),
        utils::unleash(),
        utils::voicemove(),
        utils::wlvc(),
        utils::unwlvc(),
        utils::zip_stickers(),
        utils::zip_emojis(),
        utils::unzip_emojis(),
        utils::renewvc(),
        utils::vkick(),
        utils::emojis(),
        utils::nickrole(),
        utils::rolelimit(),
        utils::renew(),
        utils::syncchan(),
        utils::derank(),
        utils::massiverole(),
        utils::wakeup(),
        utils::derogation(),
        utils::vc_list(),
        utils::bringall(),
        utils::talk(),
        utils::untalk(),
        utils::allbots(),
        utils::role_members(),
        utils::inviteinfo(),
        utils::allwebhooks(),
        utils::admin_users(),
        utils::sixtyseven(),
        utils::setmentionrole(),
        utils::autorenew(),
        utils::slowmode(),
        utils::sticker(),
        utils::nickkicker(),
        utils::chan_hide(),
        utils::chan_hideall(),
        utils::chan_unhideall(),
        utils::chan_unhide(),
        utils::unban_all(),
        utils::unban_undo(),
        utils::wlroles_add(),
        utils::wlroles_list(),
        utils::media_only(),
        utils::voicefreeze(),
        utils::voiceunfreeze(),
        moderation::moderation(),
        protection::protect(),
        security::security(),
        antispam::antispam(),
        authrestore::authrestore(),
        guildconfig::guildconfig(),
        guildconfig::gc_automod(),
        economy::economy(),
        ranks::ranks(),
        profil::profil(),
        pfps::pfps(),
        music::music(),
        notifier::notifier(),
        blogger::blogger(),
        lastfm::lastfm(),
        legacy::autofeur(),
        legacy::antiexe(),
        legacy::add_react(),
        legacy::list_react(),
        legacy::remove_react(),
        legacy::welcomer(),
        legacy::updates(),
        legacy::shardinfo(),
        legacy::status_embed(),
        legacy::langstats(),
        legacy::nitrofdp(),
        legacy::securewebhook(),
        tts::tts(),
        h247::h247(),
        context::user_lookup(),
        context::user_love(),
        context::msg_question(),
        context::msg_play(),
        honeypot::honeypot(),
        voicedashboard::voicedashboard(),
        suggestion::setsuggest(),
        suggestion::suggest(),
        newfeatures::counter(),
        newfeatures::rolesaver(),
        newfeatures::report(),
        newfeatures::punishpub(),
        newfeatures::nightmode(),
        newfeatures::gitlines(),
        giveaway::giveaway(),
        ticket::ticket(),
        backup::backup(),
        schedule::schedule(),
        confession::confession(),
        invitesmanager::inv(),
        membercount::membercount(),
        rolereactions::rolereaction(),
        rolereactions::rolebutton(),
        rolereactions::roleselect(),
        starboard::starboard(),
        starboard::skullboard(),
        sticky::sticky(),
        tag::tag(),
        owner::owner(),
        botcat::botinfo_full(),
        botcat::status(),
        botcat::andru(),
        botcat::ether(),
        botcat::iris(),
        botcat::kisakay(),
        botcat::noaimie(),
        botcat::say(),
        botcat::setlang(),
        botcat::invite(),
        botcat::links(),
        botcat::bot_custom_name(),
        botcat::bot_custom_avatar(),
        botcat::bot_custom_banner(),
        stats::stats(),
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
        assert_eq!(cmds.len(), 164);
        for expected in [
            "botinfo",
            "dice",
            "coinflip",
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
            "gitlines",
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
            "autofeur",
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
        ] {
            assert!(names.contains(&expected.to_string()), "missing {expected}");
        }
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
}
