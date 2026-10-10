use super::*;

/// Post, repost, or copy an embed. Mirrors the !embed.ts EmbedManager.
// The full interactive builder lives at `embed_builder` (top-level
// `embed`, same TS source); this stays `embed-post` so the flat
// registry keeps one `embed` (TS namespaces them under /utils vs
// the builder entry, poise registers both flat).
// Create from title + description (saved under a new id), repost of a
// saved embed id, or copy of an embed from a message URL/ID. The
// interactive select-menu/button collectors have no stateless equivalent,
// so create/copy/save are direct command branches instead.
// UT5 scope note: the full interactive EmbedManager builder flow
// (field-by-field modal editing) is intentionally out of scope;
// create/repost/copy branches above are the accepted surface.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "embed-post",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn embed_post(
    ctx: Ctx<'_>,
    #[description = "Title (for a new embed)"] title: Option<String>,
    #[description = "Description (for a new embed)"] description: Option<String>,
    #[description = "Saved embed ID to repost"] id: Option<String>,
    #[description = "Message URL or ID to copy an embed from"] copy_from: Option<String>,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude::{ChannelId, MessageId};

    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());

    // Copy flow: `copyEmbed(messageUrl)` — same-guild guard, channel,
    // message, and has-embed checks, then repost the first embed.
    if let Some(source) = copy_from.as_deref() {
        let guild_id = ctx.guild_id().map(|g| g.get().to_string());
        let (channel_id, message_id) = match resolve_copy_source(source) {
            CopySource::MessageUrl(parts) => {
                if Some(parts.guild_or_channel_owner.as_str()) != guild_id.as_deref() {
                    let name = ctx
                        .serenity_context()
                        .cache
                        .guild(ctx.guild_id().unwrap_or_default())
                        .map(|g| g.name.clone())
                        .unwrap_or_else(|| guild_id.clone().unwrap_or_default());
                    ctx.say(fill_copy_bad_guild(
                        &t(
                            "embed_copy_bad_guild_msg",
                            "The message's guild is not the same as ${interaction.guild?.name}",
                        ),
                        &name,
                    ))
                    .await?;
                    return Ok(());
                }
                match (
                    parts.channel_id.parse::<u64>(),
                    parts.message_id.parse::<u64>(),
                ) {
                    (Ok(c), Ok(m)) => (c, m),
                    _ => {
                        ctx.say(t(
                            "embed_copy_bad_channel_msg",
                            "The message's channel is unreachable!",
                        ))
                        .await?;
                        return Ok(());
                    }
                }
            }
            CopySource::ChannelMessage(mid) => (ctx.channel_id().get(), mid),
            CopySource::Invalid => {
                ctx.say(t(
                    "embed_copy_bad_message_msg",
                    "The message is unreachable!",
                ))
                .await?;
                return Ok(());
            }
        };
        let Ok(msg) = ChannelId::new(channel_id)
            .message(ctx.http(), MessageId::new(message_id))
            .await
        else {
            ctx.say(t(
                "embed_copy_bad_message_msg",
                "The message is unreachable!",
            ))
            .await?;
            return Ok(());
        };
        let Some(found) = msg.embeds.first() else {
            ctx.say(t(
                "embed_copy_bad_embed_message_msg",
                "The message doesn't have an embed!",
            ))
            .await?;
            return Ok(());
        };
        let embed = create_embed_from_message_embed(found);
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
        return Ok(());
    }

    // Edit-from-ID flow: `run(arg)` loads `EMBED.{id}` when the id is valid.
    if let Some(embed_id) = id.as_deref().filter(|s| is_valid_embed_id(Some(s))) {
        if let Some(stored) = crate::commands::owner::main::tbl_get(
            &ctx.data().pool,
            "metas",
            &saved_embed_key(embed_id),
        )
        .await
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| stored_embed_source(&v).cloned())
        {
            let embed = create_embed_from_source(&stored);
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
            return Ok(());
        }
    }

    // Create flow: fresh embed (default description mirrors
    // `new EmbedBuilder().setDescription("** **")`), then `saveEmbed()`
    // stores it under a new id, or overwrites `id` when it is valid.
    let (Some(title), Some(description)) = (title.as_deref(), description.as_deref()) else {
        anyhow::bail!(
            "provide a title and description, a saved embed ID, or a message to copy from"
        );
    };
    let mut draft = crate::embed_builder::EmbedDraft::default();
    draft
        .set_title(title)
        .map_err(|_| anyhow::anyhow!("title too long"))?;
    draft
        .set_description(description)
        .map_err(|_| anyhow::anyhow!("description too long"))?;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(draft.title.clone())
        .description(draft.description.clone());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;

    let save_id = id
        .as_deref()
        .filter(|s| is_valid_embed_id(Some(s)))
        .map(str::to_string)
        .unwrap_or_else(generate_embed_id);
    let source = serde_json::json!({ "title": draft.title, "description": draft.description });
    let stored = serde_json::json!({
        "embedOwner": ctx.author().id.get().to_string(),
        "embedSource": source,
    });
    if crate::commands::owner::main::tbl_set(
        &ctx.data().pool,
        "metas",
        &saved_embed_key(&save_id),
        &stored.to_string(),
    )
    .await
    .is_ok()
    {
        ctx.say(fill_embed_save_message(
            &t(
                "embed_save_message",
                "<@${interaction.user.id}>, **You have decided to save the Embed configuration!**```Embed ID: ${await saveEmbed()}```",
            ),
            ctx.author().id.get(),
            &save_id,
        ))
        .await?;
    }
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

/// Storage key for a saved embed. Mirrors `` `EMBED.${arg}` ``.
pub fn saved_embed_key(id: &str) -> String {
    format!("EMBED.{id}")
}

/// Extract `embedSource` from a stored `EMBED.{id}` value
/// (`{embedOwner, embedSource}`), tolerating a bare source object.
pub fn stored_embed_source(stored: &serde_json::Value) -> Option<&serde_json::Value> {
    stored.get("embedSource").or(Some(stored))
}

/// Copy input kinds. Mirrors the `copyEmbed(message.content)` input:
/// a full Discord message URL, or a bare message id from the current
/// channel (prefix path).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CopySource {
    MessageUrl(DiscordUrlParts),
    ChannelMessage(u64),
    Invalid,
}

pub fn resolve_copy_source(input: &str) -> CopySource {
    let trimmed = input.trim();
    if let Some(parts) = extract_discord_url_parts(trimmed) {
        return CopySource::MessageUrl(parts);
    }
    if !trimmed.is_empty() && trimmed.bytes().all(|b| b.is_ascii_digit()) {
        if let Ok(id) = trimmed.parse::<u64>() {
            return CopySource::ChannelMessage(id);
        }
    }
    CopySource::Invalid
}

/// Build a sendable embed from a stored discord.js `embedSource` object
/// (`title`, `description`, `color`, `fields[]`, `footer.text`,
/// `author.name`, `url`, `image.url`, `thumbnail.url`).
/// Falls back to the `** **` default description like
/// `new EmbedBuilder().setDescription("** **")` when empty.
pub fn create_embed_from_source(
    source: &serde_json::Value,
) -> poise::serenity_prelude::CreateEmbed {
    use poise::serenity_prelude::{Colour, CreateEmbedAuthor, CreateEmbedFooter};
    let mut embed = poise::serenity_prelude::CreateEmbed::default();
    let mut empty = true;
    if let Some(title) = source.get("title").and_then(|v| v.as_str()) {
        if !title.is_empty() {
            embed = embed.title(title);
            empty = false;
        }
    }
    if let Some(desc) = source.get("description").and_then(|v| v.as_str()) {
        if !desc.is_empty() {
            embed = embed.description(desc);
            empty = false;
        }
    }
    if let Some(color) = source.get("color").and_then(|v| v.as_u64()) {
        embed = embed.color(Colour::new(color as u32));
    }
    if let Some(fields) = source.get("fields").and_then(|v| v.as_array()) {
        for f in fields {
            let name = f.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let value = f.get("value").and_then(|v| v.as_str()).unwrap_or("");
            let inline = f.get("inline").and_then(|v| v.as_bool()).unwrap_or(false);
            if name.is_empty() && value.is_empty() {
                continue;
            }
            embed = embed.field(name, value, inline);
            empty = false;
        }
    }
    if let Some(text) = source
        .get("footer")
        .and_then(|v| v.get("text"))
        .and_then(|v| v.as_str())
    {
        if !text.is_empty() {
            embed = embed.footer(CreateEmbedFooter::new(text));
        }
    }
    if let Some(name) = source
        .get("author")
        .and_then(|v| v.get("name"))
        .and_then(|v| v.as_str())
    {
        if !name.is_empty() {
            embed = embed.author(CreateEmbedAuthor::new(name));
        }
    }
    if let Some(url) = source.get("url").and_then(|v| v.as_str()) {
        if is_valid_embed_link(url) {
            embed = embed.url(url);
        }
    }
    if let Some(url) = source
        .get("image")
        .and_then(|v| v.get("url"))
        .and_then(|v| v.as_str())
    {
        if !url.is_empty() {
            embed = embed.image(url);
        }
    }
    if let Some(url) = source
        .get("thumbnail")
        .and_then(|v| v.get("url"))
        .and_then(|v| v.as_str())
    {
        if !url.is_empty() {
            embed = embed.thumbnail(url);
        }
    }
    if empty {
        embed = embed.description("** **");
    }
    embed
}

/// Rebuild a sendable embed from a received message embed.
/// Mirrors `EmbedBuilder.from(targetMessage.embeds[0])` in `copyEmbed`.
pub fn create_embed_from_message_embed(
    found: &poise::serenity_prelude::Embed,
) -> poise::serenity_prelude::CreateEmbed {
    let mut value = serde_json::json!({});
    if let Some(t) = &found.title {
        value["title"] = serde_json::Value::String(t.clone());
    }
    if let Some(d) = &found.description {
        value["description"] = serde_json::Value::String(d.clone());
    }
    if let Some(c) = found.colour {
        value["color"] = serde_json::json!(c.0);
    }
    if !found.fields.is_empty() {
        value["fields"] = serde_json::json!(found
            .fields
            .iter()
            .map(|f| serde_json::json!({
                "name": f.name,
                "value": f.value,
                "inline": f.inline,
            }))
            .collect::<Vec<_>>());
    }
    if let Some(footer) = &found.footer {
        value["footer"] = serde_json::json!({ "text": footer.text });
    }
    if let Some(author) = &found.author {
        value["author"] = serde_json::json!({ "name": author.name });
    }
    if let Some(url) = &found.url {
        value["url"] = serde_json::Value::String(url.clone());
    }
    if let Some(image) = &found.image {
        value["image"] = serde_json::json!({ "url": image.url });
    }
    if let Some(thumb) = &found.thumbnail {
        value["thumbnail"] = serde_json::json!({ "url": thumb.url });
    }
    create_embed_from_source(&value)
}

/// New saved-embed id. Mirrors `generatePassword({ length: 16 })`.
pub fn generate_embed_id() -> String {
    use rand::Rng;
    const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::thread_rng();
    (0..16)
        .map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn link_check() {
        assert!(is_valid_embed_link("https://x.y/z"));
        assert!(is_valid_embed_link("http://x.y"));
        assert!(!is_valid_embed_link("attachment://image.png"));
        assert!(!is_valid_embed_link("just text"));
    }

    #[test]
    fn color_check() {
        assert!(is_valid_embed_color("#fff"));
        assert!(is_valid_embed_color("#475387"));
        assert!(is_valid_embed_color("#ABC"));
        assert!(!is_valid_embed_color("475387"));
        assert!(!is_valid_embed_color("#ffff"));
        assert!(!is_valid_embed_color("#gggggg"));
    }

    #[test]
    fn embed_id_check() {
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

    #[test]
    fn copy_source_resolution() {
        assert_eq!(
            resolve_copy_source("https://discord.com/channels/111/222/333"),
            CopySource::MessageUrl(DiscordUrlParts {
                guild_or_channel_owner: "111".to_string(),
                channel_id: "222".to_string(),
                message_id: "333".to_string(),
            })
        );
        assert_eq!(
            resolve_copy_source("  123456789 "),
            CopySource::ChannelMessage(123456789)
        );
        assert_eq!(resolve_copy_source("not a url"), CopySource::Invalid);
        assert_eq!(resolve_copy_source(""), CopySource::Invalid);
        assert_eq!(saved_embed_key("pw16charsxxxxxx"), "EMBED.pw16charsxxxxxx");
    }

    #[test]
    fn stored_source_extraction() {
        let wrapped = serde_json::json!({
            "embedOwner": "9",
            "embedSource": { "title": "T" },
        });
        assert_eq!(
            stored_embed_source(&wrapped),
            Some(&serde_json::json!({ "title": "T" }))
        );
        let bare = serde_json::json!({ "description": "D" });
        assert_eq!(stored_embed_source(&bare), Some(&bare));
    }

    #[test]
    fn generated_id_shape() {
        let id = generate_embed_id();
        assert_eq!(id.len(), 16);
        assert!(id.bytes().all(|b| b.is_ascii_alphanumeric()));
        assert_ne!(generate_embed_id(), generate_embed_id());
    }

    #[test]
    fn source_build_round_trip() {
        let source = serde_json::json!({
            "title": "T",
            "description": "D",
            "color": 0x475387,
            "fields": [{ "name": "n", "value": "v", "inline": true }],
            "footer": { "text": "F" },
            "author": { "name": "A" },
            "url": "https://x.y/z",
            "image": { "url": "https://x.y/i.png" },
            "thumbnail": { "url": "https://x.y/t.png" },
        });
        // Must not panic and must produce a value; fields are
        // internal to CreateEmbed, so round-trip through Debug.
        let built = format!("{:?}", create_embed_from_source(&source));
        assert!(built.contains('T'));
        let empty = format!("{:?}", create_embed_from_source(&serde_json::json!({})));
        assert!(empty.contains("** **"));
    }
}
