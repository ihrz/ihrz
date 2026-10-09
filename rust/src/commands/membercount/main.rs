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
async fn send_mcount_help(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
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

#[poise::command(
    slash_command,
    prefix_command,
    category = "membercount",
    rename = "membercount",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn membercount(
    ctx: Ctx<'_>,
    #[description = "Power on / Power off"] action: String,
    #[description = "Voice channel used as counter"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
    #[description = "{MemberCount}, {RolesCount}, {ChannelCount}, {BoostCount}, {BotCount}, {VoiceCount}, {OnlineCount}"]
    name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(&action) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;

    if !enabled {
        sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'GUILD.MCOUNT.%'")
            .bind(&gid)
            .execute(pool)
            .await?;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        ctx.say(
            crate::lang::get(&code, "setmembercount_command_work_on_disable")
                .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
                .unwrap_or_else(|| "Membercount disabled.".to_string()),
        )
        .await?;
        return Ok(());
    }

    let Some(template) = name.filter(|n| !n.trim().is_empty()) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };
    let Some(slot) = mcount_slot(&template) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };

    let value = serde_json::json!({
        "name": template,
        "enable": true,
        "channel": channel.id.get().to_string(),
    })
    .to_string();
    crate::db::kv_set(pool, &gid, &mcount_key(slot), &value).await?;

    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "setmembercount_command_work_on_enable")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| format!("Counter set: {template}")),
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
