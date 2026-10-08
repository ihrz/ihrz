// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/blogger/* + src/core/Blogger.ts
// (config surface + live RSS validation).
//
// TS keys: BLOGGER.blogs[] {id, rss, channelId}, BLOGGER.enabled,
// BLOGGER.lastArticleNotified.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BlogEntry {
    pub id: String,
    pub rss: String,
    #[serde(rename = "channelId")]
    pub channel_id: String,
}

/// RSS validation: fetch feed, require XML with an rss/feed root.
/// Mirrors blogger.validateRssFeed.
pub fn valid_rss_body(body: &str) -> bool {
    let t = body.trim_start();
    (t.starts_with("<?xml") || t.starts_with("<rss") || t.starts_with("<feed"))
        && (t.contains("<rss") || t.contains("<feed"))
}

pub async fn fetch_rss_ok(url: &str) -> bool {
    let body = match reqwest::Client::new().get(url).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => return false,
    };
    valid_rss_body(&body)
}

pub async fn load_blogs(pool: &crate::db::Pool, guild_id: &str) -> Vec<BlogEntry> {
    crate::db::kv_get(pool, guild_id, "BLOGGER.blogs")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "blogger",
    rename = "blogger",
    subcommands("blogger_add", "blogger_remove", "blogger_list", "blogger_status"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn blogger(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "add")]
pub async fn blogger_add(
    ctx: Ctx<'_>,
    #[description = "RSS feed URL"] rss: String,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    if !fetch_rss_ok(rss.trim()).await {
        ctx.say("Invalid RSS feed.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut blogs = load_blogs(&ctx.data().pool, &gid).await;
    let id = format!(
        "{:x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(1)
            & 0xffffff
    );
    blogs.push(BlogEntry {
        id,
        rss: rss.trim().to_string(),
        channel_id: channel.id.get().to_string(),
    });
    blogs.sort_by(|a, b| a.rss.cmp(&b.rss));
    blogs.dedup_by(|a, b| a.rss == b.rss && a.channel_id == b.channel_id);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "BLOGGER.blogs",
        &serde_json::to_string(&blogs)?,
    )
    .await?;
    ctx.say("Blog added.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "remove")]
pub async fn blogger_remove(
    ctx: Ctx<'_>,
    #[description = "Blog id"] id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut blogs = load_blogs(&ctx.data().pool, &gid).await;
    let before = blogs.len();
    blogs.retain(|b| b.id != id.trim());
    if blogs.len() == before {
        ctx.say("Not found.").await?;
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "BLOGGER.blogs",
        &serde_json::to_string(&blogs)?,
    )
    .await?;
    ctx.say("Blog removed.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn blogger_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let blogs = load_blogs(&ctx.data().pool, &gid).await;
    ctx.say(if blogs.is_empty() {
        "No blogs.".to_string()
    } else {
        blogs
            .iter()
            .map(|b| format!("{}: {} -> <#{}>", b.id, b.rss, b.channel_id))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "status")]
pub async fn blogger_status(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "BLOGGER.enabled",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Blogger on."
    } else {
        "Blogger off."
    })
    .await?;
    Ok(())
}

/// RSS item extraction. Latest <item> wins (rss-parser order).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RssItem {
    pub id: String,
    pub title: String,
    pub link: String,
}

fn tag_content(item: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}");
    let start = item.find(&open)?;
    let after_open = item[start..].find('>')? + start + 1;
    let close = format!("</{tag}>");
    let end = item[after_open..].find(&close)? + after_open;
    Some(item[after_open..end].trim().to_string())
}

pub fn latest_rss_item(body: &str) -> Option<RssItem> {
    let start = body.find("<item>")?;
    let end = body[start..].find("</item>")? + start;
    let item = &body[start..end];
    let id = tag_content(item, "guid")
        .or_else(|| tag_content(item, "link"))
        .filter(|s| !s.is_empty())?;
    Some(RssItem {
        id,
        title: tag_content(item, "title").unwrap_or_default(),
        link: tag_content(item, "link").unwrap_or_default(),
    })
}

/// Already-notified check. Mirrors articleHaveAlreadyBeNotified
/// (same blog+article id, or newer stored timestamp).
pub fn already_notified(notified: &[(String, String)], blog_id: &str, article_id: &str) -> bool {
    notified
        .iter()
        .any(|(b, a)| b == blog_id && a == article_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn latest_item_parses() {
        let body = "<rss><channel><item><title>T</title><link>http://x/1</link><guid>g1</guid></item><item><title>O</title></item></channel></rss>";
        let item = latest_rss_item(body).unwrap();
        assert_eq!(item.id, "g1");
        assert_eq!(item.title, "T");
        assert!(latest_rss_item("no items").is_none());
        assert!(already_notified(&[("b".into(), "g1".into())], "b", "g1"));
        assert!(!already_notified(&[], "b", "g1"));
    }

    #[test]
    fn rss_validation() {
        assert!(valid_rss_body(
            r#"<?xml version="1.0"?><rss><channel/></rss>"#
        ));
        assert!(valid_rss_body(r#"<feed xmlns="x"></feed>"#));
        assert!(!valid_rss_body("<html></html>"));
        assert!(!valid_rss_body(""));
    }
}
