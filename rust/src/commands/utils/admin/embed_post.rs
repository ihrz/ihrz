use super::*;

/// Post an embed from title + description.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "embed-post",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn embed_post(
    ctx: Ctx<'_>,
    #[description = "Title"] title: String,
    #[description = "Description"] description: String,
) -> Result<(), anyhow::Error> {
    let mut draft = crate::embed_builder::EmbedDraft::default();
    draft
        .set_title(&title)
        .map_err(|_| anyhow::anyhow!("title too long"))?;
    draft
        .set_description(&description)
        .map_err(|_| anyhow::anyhow!("description too long"))?;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(draft.title.clone())
        .description(draft.description.clone());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Interactive builder parity. Mirrors the pure logic in utils
/// !embed.ts + `src/core/functions/embedHelper.ts`; the Discord
/// select-menu/button collector UI has no stateless equivalent, so the
/// validators, URL parsing, copy guards, and reply fills live here.
/// Action values of the builder select menu (`chooseAction` keys).
pub const EMBED_ACTIONS: &[&str] = &[
    "0", "1", "2", "3", "4", "5", "6", "7", "7bis", "8", "9", "10", "11", "12", "13",
];

/// Mirrors `embedHelper.isValidLink` (http(s):// prefix).
pub fn is_valid_embed_link(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://")
}

/// Mirrors `embedHelper.isValidColor` (`/^#([0-9a-f]{3}){1,2}$/i`).
pub fn is_valid_embed_color(color: &str) -> bool {
    let hex = color.strip_prefix('#').unwrap_or("");
    (hex.len() == 3 || hex.len() == 6)
        && !hex.is_empty()
        && hex.bytes().all(|b| b.is_ascii_hexdigit())
}

/// Mirrors `embedHelper.isValidEmbedId`: non-empty id whose
/// `EMBED.{id}` key fits the 255-byte / 32-segment / no-empty-segment
/// store limits.
pub fn is_valid_embed_id(id: Option<&str>) -> bool {
    let Some(id) = id.filter(|s| !s.is_empty()) else {
        return false;
    };
    let key = format!("EMBED.{id}");
    if key.len() > 255 {
        return false;
    }
    let segments: Vec<&str> = key.split('.').collect();
    if segments.len() > 32 {
        return false;
    }
    !segments.iter().any(|s| s.is_empty())
}

/// Parsed `discord.com/channels/{guild}/{channel}/{message}` URL.
/// Mirrors `extractDiscordUrlParts` (first segment must be `channels`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscordUrlParts {
    pub guild_or_channel_owner: String,
    pub channel_id: String,
    pub message_id: String,
}

pub fn extract_discord_url_parts(url: &str) -> Option<DiscordUrlParts> {
    let path = url.split("://").nth(1)?.split('?').next()?;
    let mut segments = path.split('/').filter(|s| !s.is_empty());
    let _host = segments.next()?;
    let parts: Vec<&str> = segments.collect();
    if parts.len() < 4 || parts[0] != "channels" {
        return None;
    }
    Some(DiscordUrlParts {
        guild_or_channel_owner: parts[1].to_string(),
        channel_id: parts[2].to_string(),
        message_id: parts[3].to_string(),
    })
}

/// Copy guard: the source message must come from the same guild
/// (`parts.userIdOrGuildId !== interaction.guildId`).
pub fn copy_same_guild(parts: &DiscordUrlParts, guild_id: &str) -> bool {
    parts.guild_or_channel_owner == guild_id
}

/// Fill `embed_save_message`
/// (`${interaction.user.id}`, `${await saveEmbed()}`).
pub fn fill_embed_save_message(template: &str, user_id: u64, embed_id: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${await saveEmbed()}", embed_id)
}

/// Fill `embed_send_embed_work`
/// (`${interaction.user.id}`, `${message.content}` channel id).
pub fn fill_embed_send_done(template: &str, user_id: u64, channel_id: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${message.content}", channel_id)
}

/// Fill `embed_replace_message` (`{user}`, `{messageUrl}`).
pub fn fill_embed_replace_done(template: &str, user: &str, message_url: &str) -> String {
    template
        .replace("{user}", user)
        .replace("{messageUrl}", message_url)
}

/// Fill `embed_copy_bad_guild_msg` (`${interaction.guild?.name}`).
pub fn fill_copy_bad_guild(template: &str, guild_name: &str) -> String {
    template.replace("${interaction.guild?.name}", guild_name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn link_check_mirrors_helper() {
        assert!(is_valid_embed_link("https://x.y/z"));
        assert!(is_valid_embed_link("http://x.y"));
        assert!(!is_valid_embed_link("attachment://image.png"));
        assert!(!is_valid_embed_link("just text"));
    }

    #[test]
    fn color_check_mirrors_helper() {
        assert!(is_valid_embed_color("#fff"));
        assert!(is_valid_embed_color("#475387"));
        assert!(is_valid_embed_color("#ABC"));
        assert!(!is_valid_embed_color("475387"));
        assert!(!is_valid_embed_color("#ffff"));
        assert!(!is_valid_embed_color("#gggggg"));
    }

    #[test]
    fn embed_id_check_mirrors_helper() {
        assert!(!is_valid_embed_id(None));
        assert!(!is_valid_embed_id(Some("")));
        assert!(is_valid_embed_id(Some("abc123")));
        assert!(is_valid_embed_id(Some("a.b")));
        assert!(!is_valid_embed_id(Some(&"x".repeat(250))));
        assert!(!is_valid_embed_id(Some(&vec!["x"; 32].join("."))));
    }

    #[test]
    fn url_parts_parse() {
        let parts = extract_discord_url_parts("https://discord.com/channels/111/222/333").unwrap();
        assert_eq!(
            parts,
            DiscordUrlParts {
                guild_or_channel_owner: "111".to_string(),
                channel_id: "222".to_string(),
                message_id: "333".to_string(),
            }
        );
        assert!(extract_discord_url_parts("https://discord.com/oops/1/2/3").is_none());
        assert!(extract_discord_url_parts("not a url").is_none());
        assert!(copy_same_guild(&parts, "111"));
        assert!(!copy_same_guild(&parts, "999"));
    }

    #[test]
    fn reply_fills() {
        assert_eq!(
            fill_embed_save_message(
                "<@${interaction.user.id}> id `${await saveEmbed()}`",
                9,
                "pw"
            ),
            "<@9> id `pw`"
        );
        assert_eq!(
            fill_embed_send_done(
                "<@${interaction.user.id}> sent to <#${message.content}>",
                9,
                "5"
            ),
            "<@9> sent to <#5>"
        );
        assert_eq!(
            fill_embed_replace_done("{user} replaced {messageUrl}", "<@9>", "https://u"),
            "<@9> replaced https://u"
        );
        assert_eq!(
            fill_copy_bad_guild("not the same as ${interaction.guild?.name}", "G"),
            "not the same as G"
        );
    }

    #[test]
    fn actions_cover_menu() {
        assert!(EMBED_ACTIONS.contains(&"0"));
        assert!(EMBED_ACTIONS.contains(&"7bis"));
        assert!(EMBED_ACTIONS.contains(&"13"));
        assert_eq!(EMBED_ACTIONS.len(), 15);
    }
}
