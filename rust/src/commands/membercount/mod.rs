// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/membercount/membercount.ts.
//
// TS keys: <guild>.GUILD.MCOUNT.<member|roles|channel|boost|bot|voice|online>
// { name: template, enable: true, channel: voiceChannelId }.
// Template placeholders: {MemberCount} {RolesCount} {ChannelCount}
// {BoostCount} {BotCount} {VoiceCount} {OnlineCount}.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct MemberCounts {
    pub member: u64,
    pub roles: u64,
    pub channel: u64,
    pub boost: u64,
    pub bot: u64,
    pub voice: u64,
    pub online: u64,
}

/// "on" => enabled=true, "off" => enabled=false (mirrors TS action choices).
pub fn parse_on_off(action: &str) -> Option<bool> {
    match action.to_ascii_lowercase().as_str() {
        "on" | "power on" | "enable" => Some(true),
        "off" | "power off" | "disable" => Some(false),
        _ => None,
    }
}

/// TS if/else priority: member, roles, channel, boost, bot, voice, online.
pub fn mcount_slot(template: &str) -> Option<&'static str> {
    if template.contains("{MemberCount}") {
        Some("member")
    } else if template.contains("{RolesCount}") {
        Some("roles")
    } else if template.contains("{ChannelCount}") {
        Some("channel")
    } else if template.contains("{BoostCount}") {
        Some("boost")
    } else if template.contains("{BotCount}") {
        Some("bot")
    } else if template.contains("{VoiceCount}") {
        Some("voice")
    } else if template.contains("{OnlineCount}") {
        Some("online")
    } else {
        None
    }
}

pub fn mcount_key(slot: &str) -> String {
    format!("GUILD.MCOUNT.{slot}")
}

pub fn render_name(template: &str, counts: &MemberCounts) -> String {
    template
        .replace("{MemberCount}", &counts.member.to_string())
        .replace("{RolesCount}", &counts.roles.to_string())
        .replace("{ChannelCount}", &counts.channel.to_string())
        .replace("{BoostCount}", &counts.boost.to_string())
        .replace("{BotCount}", &counts.bot.to_string())
        .replace("{VoiceCount}", &counts.voice.to_string())
        .replace("{OnlineCount}", &counts.online.to_string())
}

/// Rich help embed. Mirrors membercount.ts help_embed (TS sends it on
/// every usage-error path instead of a bare variable list).
pub async fn send_mcount_help(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
    let title = crate::commands::lang_for(
        ctx,
        "setmembercount_helpembed_title",
        "Set MemberCount Help!",
    )
    .await;
    let desc = crate::commands::lang_for(
        ctx,
        "setmembercount_helpembed_description",
        "/membercount <Enable / Disable> <Channel Name>",
    )
    .await;
    let fname = crate::commands::lang_for(
        ctx,
        "setmembercount_helpembed_fields_name",
        "How to use it?",
    )
    .await;
    let fvalue = crate::commands::lang_for(
        ctx,
        "setmembercount_helpembed_fields_value",
        "{MemberCount} = members\n{RolesCount} = roles\n{BotCount} = bots\n{ChannelCount} = channels\n{BoostCount} = boosts\n{VoiceCount} = in voice\n{OnlineCount} = online",
    )
    .await;
    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::new()
                .title(title)
                .description(desc)
                .color(0x0014a8)
                .field(fname, fvalue, false),
        ),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> MemberCounts {
        MemberCounts {
            member: 100,
            roles: 10,
            channel: 20,
            boost: 3,
            bot: 5,
            voice: 7,
            online: 42,
        }
    }

    #[test]
    fn render_replaces_every_placeholder() {
        let out = render_name(
            "{MemberCount}|{RolesCount}|{ChannelCount}|{BoostCount}|{BotCount}|{VoiceCount}|{OnlineCount}",
            &sample(),
        );
        assert_eq!(out, "100|10|20|3|5|7|42");
    }

    #[test]
    fn render_leaves_unknown_template_unchanged() {
        let out = render_name("Members: {Unknown} {membercount}", &sample());
        assert_eq!(out, "Members: {Unknown} {membercount}");
    }

    #[test]
    fn parse_on_off_matches_ts_choices() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
        assert_eq!(parse_on_off("bogus"), None);
    }

    #[test]
    fn slot_priority_mirrors_ts_if_else_chain() {
        assert_eq!(mcount_slot("{MemberCount} {BotCount}"), Some("member"));
        assert_eq!(mcount_slot("{BotCount}"), Some("bot"));
        assert_eq!(mcount_slot("no placeholder"), None);
        assert_eq!(mcount_key("member"), "GUILD.MCOUNT.member");
    }
}

#[allow(clippy::module_inception)]
pub mod membercount;

/// Old registry path (`membercount::main::membercount`) kept working.
pub mod main {
    pub use super::membercount::*;
}
