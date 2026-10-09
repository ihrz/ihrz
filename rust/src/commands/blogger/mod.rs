// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/blogger/* + src/core/Blogger.ts
// (config surface + live RSS validation).
//
// TS keys: BLOGGER.blogs[] {id, rss, channelId}, BLOGGER.enabled,
// BLOGGER.lastArticleNotified.

use crate::bot::Ctx;
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
    fetch_rss_title(url).await.is_some()
}

/// Feed title for success messages. Mirrors TS validation.name
/// (`validation.name || "Unknown"`); string scan, no new dep.
pub async fn fetch_rss_title(url: &str) -> Option<String> {
    let body = match reqwest::Client::new().get(url).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => return None,
    };
    if !valid_rss_body(&body) {
        return None;
    }
    extract_feed_title(&body)
}

fn extract_feed_title(body: &str) -> Option<String> {
    let start = body.find("<title>")? + "<title>".len();
    let end = body[start..].find("</title>")? + start;
    let mut title = body[start..end].trim().to_string();
    if let Some(inner) = title
        .strip_prefix("<![CDATA[")
        .and_then(|s| s.strip_suffix("]]>"))
    {
        title = inner.to_string();
    }
    let title = title.trim().to_string();
    if title.is_empty() {
        None
    } else {
        Some(title)
    }
}

pub const BLOGS_KEY: &str = "BLOGGER.blogs";

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

pub async fn load_blogs(pool: &crate::db::Pool, guild_id: &str) -> Vec<BlogEntry> {
    table_value_or_legacy(pool, guild_id, BLOGS_KEY)
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// Table-routed write for the blog list (keys unchanged).
pub async fn save_blogs(
    pool: &crate::db::Pool,
    guild_id: &str,
    blogs: &[BlogEntry],
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(BLOGS_KEY, blogs)
        .await
}

/// Table-routed plain-string read with legacy fallback (BLOGGER.enabled).
pub async fn load_blog_string(pool: &crate::db::Pool, guild_id: &str, key: &str) -> Option<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        })
}

/// Table-routed plain-string write (keys unchanged).
pub async fn save_blog_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(key, value).await
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

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_blogs(
            &pool,
            "g1",
            &[BlogEntry {
                id: "b1".into(),
                rss: "http://x/rss".into(),
                channel_id: "7".into(),
            }],
        )
        .await
        .unwrap();
        assert_eq!(load_blogs(&pool, "g1").await.len(), 1);
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'BLOGGER.blogs'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read.
        crate::db::kv_set(
            &pool,
            "g2",
            BLOGS_KEY,
            r#"[{"id":"b9","rss":"r","channelId":"1"}]"#,
        )
        .await
        .unwrap();
        assert_eq!(load_blogs(&pool, "g2").await.len(), 1);
        // Plain-string keys round-trip with legacy fallback.
        save_blog_string(&pool, "g1", "BLOGGER.enabled", "1")
            .await
            .unwrap();
        assert_eq!(
            load_blog_string(&pool, "g1", "BLOGGER.enabled")
                .await
                .as_deref(),
            Some("1")
        );
        crate::db::kv_set(&pool, "g2", "BLOGGER.enabled", "0")
            .await
            .unwrap();
        assert_eq!(
            load_blog_string(&pool, "g2", "BLOGGER.enabled")
                .await
                .as_deref(),
            Some("0")
        );
    }

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
    fn feed_title_extracts_channel_title() {
        let rss = "<?xml version=\"1.0\"?><rss><channel><title><![CDATA[My Blog]]></title><item><title>P1</title></item></channel></rss>";
        assert_eq!(extract_feed_title(rss).as_deref(), Some("My Blog"));
        let atom = "<feed><title>Atom Feed</title><entry><title>E</title></entry></feed>";
        assert_eq!(extract_feed_title(atom).as_deref(), Some("Atom Feed"));
        assert!(extract_feed_title("not xml").is_none());
        assert!(extract_feed_title("<rss><channel></channel></rss>").is_none());
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

pub mod add;
#[allow(clippy::module_inception)]
pub mod blogger;
pub mod list;
pub mod remove;
pub mod status;

/// Old registry path (`blogger::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::add::*;
    pub use super::blogger::*;
    pub use super::list::*;
    pub use super::remove::*;
    pub use super::status::*;
    pub use super::*;
}
