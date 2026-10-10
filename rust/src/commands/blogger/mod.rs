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

/// Discord snowflake epoch in millis. Blog ids mirror
/// `SnowflakeUtil.generate().toString()` in !add.ts (timestamp-based,
/// unique per add for the `(ID: ...)` display + remove lookup).
pub const DISCORD_EPOCH_MS: u64 = 1_420_070_400_000;

/// Snowflake-style blog id from unix millis. Mirrors
/// `SnowflakeUtil.generate()` (timestamp segment with zero
/// worker/process/increment bits).
pub fn new_blog_id(now_ms: u64) -> String {
    now_ms
        .saturating_sub(DISCORD_EPOCH_MS)
        .saturating_mul(1 << 22)
        .to_string()
}

/// Pure feed-body validity. Mirrors the rss-parser parse leg behind
/// blogger.validateRssFeed: a body with a channel title or a parsable
/// latest item reads as a feed (a title-less feed with items is valid);
/// anything else is not. No literal tag scan.
pub fn rss_body_valid(body: &str) -> bool {
    extract_feed_title(body).is_some() || latest_rss_item(body).is_some()
}

async fn fetch_feed_body(url: &str) -> Option<String> {
    let body = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .ok()?
        .text()
        .await
        .unwrap_or_default();
    if body.trim().is_empty() {
        None
    } else {
        Some(body)
    }
}

/// Validate an RSS feed URL. Mirrors blogger.validateRssFeed: parse
/// success reads as valid with the feed title (`None` when the feed
/// carries no title — callers fall back to `Unknown`/`Unknown Blog`);
/// only an unreachable URL or a body with neither a title nor a
/// parsable latest item is invalid.
pub async fn validate_rss_feed(url: &str) -> (bool, Option<String>) {
    let Some(body) = fetch_feed_body(url).await else {
        return (false, None);
    };
    if !rss_body_valid(&body) {
        return (false, None);
    }
    (true, extract_feed_title(&body))
}

/// Feed title for success messages. Mirrors TS validation.name
/// (`validation.name || "Unknown"`); string scan, no new dep.
/// None when the feed is unreachable or unparsable, or when a valid
/// feed carries no title (callers fall back to `Unknown Blog`).
pub async fn fetch_rss_title(url: &str) -> Option<String> {
    let body = fetch_feed_body(url).await?;
    if !rss_body_valid(&body) {
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

/// RSS item extraction. All <item> blocks are scanned and the latest
/// by pubDate wins (mirrors the getLatestArticle reduce in Blogger.ts;
/// ties keep the first item, like the TS `>` reduce seed).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RssItem {
    pub id: String,
    pub title: String,
    pub link: String,
    /// Mirrors RssFeedItem.author (`creator || author || "Unknown"`).
    pub author: String,
    /// Unix millis of pubDate/isoDate (0 when absent/unparsable).
    pub pub_ms: i64,
    /// Mirrors RssFeedItem.contentSnippet.
    pub snippet: String,
}

/// Parse an RSS pubDate/isoDate to unix millis. Accepts RFC 2822
/// (`Wed, 02 Oct 2024 10:00:00 GMT`), RFC 3339 and a plain i64
/// millis fallback; unparsable input reads as 0 (oldest).
pub fn parse_pub_ms(raw: &str) -> i64 {
    let raw = raw.trim();
    if raw.is_empty() {
        return 0;
    }
    if let Ok(ms) = raw.parse::<i64>() {
        return ms;
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc2822(raw) {
        return dt.timestamp_millis();
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return dt.timestamp_millis();
    }
    0
}

fn tag_content(item: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}");
    let start = item.find(&open)?;
    let after_open = item[start..].find('>')? + start + 1;
    let close = format!("</{tag}>");
    let end = item[after_open..].find(&close)? + after_open;
    Some(item[after_open..end].trim().to_string())
}

fn parse_one_item(item: &str) -> Option<RssItem> {
    let id = tag_content(item, "guid")
        .or_else(|| tag_content(item, "id"))
        .or_else(|| tag_content(item, "link"))
        .filter(|s| !s.is_empty())?;
    let pub_raw = tag_content(item, "pubDate")
        .or_else(|| tag_content(item, "isoDate"))
        .or_else(|| tag_content(item, "published"))
        .or_else(|| tag_content(item, "updated"))
        .unwrap_or_default();
    let author = tag_content(item, "creator")
        .or_else(|| tag_content(item, "author"))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Unknown".to_string());
    let snippet = tag_content(item, "contentSnippet")
        .or_else(|| tag_content(item, "description"))
        .or_else(|| tag_content(item, "content"))
        .unwrap_or_default();
    Some(RssItem {
        id,
        title: tag_content(item, "title").unwrap_or_else(|| "No title".to_string()),
        link: tag_content(item, "link").unwrap_or_default(),
        author,
        pub_ms: parse_pub_ms(&pub_raw),
        snippet,
    })
}

pub fn latest_rss_item(body: &str) -> Option<RssItem> {
    // Scan every <item> (and Atom <entry>) block; latest pubDate wins.
    let mut best: Option<RssItem> = None;
    for tag in ["item", "entry"] {
        let mut rest = body;
        loop {
            let open = format!("<{tag}");
            let Some(start) = rest.find(&open) else {
                break;
            };
            let close = format!("</{tag}>");
            let Some(rel_end) = rest[start..].find(&close) else {
                break;
            };
            let block = &rest[start..start + rel_end];
            rest = &rest[start + rel_end + close.len()..];
            if let Some(item) = parse_one_item(block) {
                let newer = match &best {
                    Some(cur) => item.pub_ms > cur.pub_ms,
                    None => true,
                };
                if newer {
                    best = Some(item);
                }
            }
        }
    }
    best
}

/// One BLOGGER.lastArticleNotified row. Serde keys match the TS push
/// ({blogId, articleId, timestamp}); timestamp_ms carries the same
/// instant as unix millis for the >= comparison.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct NotifiedArticle {
    #[serde(rename = "blogId")]
    pub blog_id: String,
    #[serde(rename = "articleId")]
    pub article_id: String,
    #[serde(rename = "timestamp")]
    pub timestamp_ms: i64,
}

/// Already-notified check. Mirrors articleHaveAlreadyBeNotified:
/// same blog AND (same article id OR stored timestamp >= candidate
/// pub date). The legacy id-only shape still parses (timestamp 0).
pub fn article_already_notified(
    notified: &[NotifiedArticle],
    blog_id: &str,
    article_id: &str,
    pub_ms: i64,
) -> bool {
    notified.iter().any(|item| {
        item.blog_id == blog_id && (item.article_id == article_id || item.timestamp_ms >= pub_ms)
    })
}

/// Parse the BLOGGER.lastArticleNotified store (array of rows; the TS
/// defaults to [] when the key is missing). Accepts the current
/// {blogId, articleId, timestamp} rows, ISO timestamp strings, and
/// the legacy (blogId, articleId) tuples.
pub fn parse_notified_articles(raw: Option<&str>) -> Vec<NotifiedArticle> {
    let Some(raw) = raw else {
        return Vec::new();
    };
    if let Ok(rows) = serde_json::from_str::<Vec<NotifiedArticle>>(raw) {
        return rows;
    }
    if let Ok(rows) = serde_json::from_str::<Vec<serde_json::Value>>(raw) {
        let mut out = Vec::new();
        for row in rows {
            // Legacy tuple shape ["blogId", "articleId"].
            if let Some(pair) = row.as_array() {
                let mut parts = pair.iter().filter_map(|v| v.as_str());
                if let (Some(blog_id), Some(article_id)) = (parts.next(), parts.next()) {
                    out.push(NotifiedArticle {
                        blog_id: blog_id.to_string(),
                        article_id: article_id.to_string(),
                        timestamp_ms: 0,
                    });
                }
                continue;
            }
            let blog_id = row
                .get("blogId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let article_id = row
                .get("articleId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if blog_id.is_empty() || article_id.is_empty() {
                continue;
            }
            let timestamp_ms = row
                .get("timestamp")
                .map(|v| match v {
                    serde_json::Value::Number(n) => n.as_i64().unwrap_or(0),
                    serde_json::Value::String(s) => parse_pub_ms(s),
                    _ => 0,
                })
                .unwrap_or(0);
            out.push(NotifiedArticle {
                blog_id,
                article_id,
                timestamp_ms,
            });
        }
        return out;
    }
    // Legacy tuple shape [(blogId, articleId)].
    serde_json::from_str::<Vec<(String, String)>>(raw)
        .unwrap_or_default()
        .into_iter()
        .map(|(blog_id, article_id)| NotifiedArticle {
            blog_id,
            article_id,
            timestamp_ms: 0,
        })
        .collect()
}

/// Already-notified check (legacy id-only shape, kept for callers
/// holding tuple stores).
pub fn already_notified(notified: &[(String, String)], blog_id: &str, article_id: &str) -> bool {
    notified
        .iter()
        .any(|(b, a)| b == blog_id && a == article_id)
}

/// BLOGGER.enabled gate. Mirrors the `if (!entry.value.enabled)
/// continue` leg in Blogger.ts refresh: only an explicit truthy
/// value ("1"/"true") enables the sweep.
pub fn blogger_enabled_value(raw: Option<&str>) -> bool {
    matches!(raw.map(str::trim), Some("1") | Some("true") | Some("TRUE"))
}

/// Table-routed BLOGGER.enabled read with legacy fallback.
pub async fn load_blogger_enabled(pool: &crate::db::Pool, guild_id: &str) -> bool {
    blogger_enabled_value(
        table_value_or_legacy(pool, guild_id, "BLOGGER.enabled")
            .await
            .as_ref()
            .map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            })
            .as_deref(),
    )
}

/// Blogs embed description. Mirrors generateBlogsEmbed: the lang
/// prefix plus one `[`name`](rss) - <#channel> (ID: `id`)` row per
/// blog (channel falls back to "Channel deleted", like the TS
/// `channel?.toString() || "Channel deleted"` leg).
pub fn blogs_embed_desc(prefix: &str, rows: &[(String, String, String, String)]) -> String {
    let mut desc = prefix.to_string();
    for (name, rss, channel_mention, id) in rows {
        desc.push_str(&format!(
            "[`{name}`]({rss}) - {channel_mention} (ID: `{id}`)\n"
        ));
    }
    desc
}

/// Blogs embed. Mirrors generateBlogsEmbed (title + colour 2829617,
/// `desc || lang.blogger_no_rss` fallback).
pub fn blogs_embed(code: &str, rows: &[(String, String, String, String)]) -> serenity::CreateEmbed {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    let prefix = say(
        "blogger_generateBlogsEmbed_embed_desc",
        "List of configured RSS feeds:\n\n",
    );
    let desc = blogs_embed_desc(&prefix, rows);
    serenity::CreateEmbed::default()
        .title(say(
            "blogger_generateBlogsEmbed_embed_title",
            "RSS Blogs Configuration",
        ))
        .description(if desc.is_empty() {
            say("blogger_no_rss", "No RSS feeds configured.")
        } else {
            desc
        })
        .colour(serenity::Colour::new(2829617))
}

/// Configuration embed. Mirrors generateConfigurationEmbed (Status +
/// Total Blogs fields, var_enabled/var_disabled values).
pub fn config_embed(code: &str, enabled: bool, total: usize) -> serenity::CreateEmbed {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    serenity::CreateEmbed::default()
        .title(say(
            "blogger_generateConfigurationEmbed_embed_title",
            "Blogger Configuration",
        ))
        .colour(serenity::Colour::new(2829617))
        .field(
            say(
                "blogger_generateConfigurationEmbed_embed_fields_1_name",
                "Status",
            ),
            if enabled {
                say("var_enabled", "Enabled")
            } else {
                say("var_disabled", "Disabled")
            },
            true,
        )
        .field(
            say(
                "blogger_generateConfigurationEmbed_embed_fields_2_name",
                "Total Blogs",
            ),
            total.to_string(),
            true,
        )
}

/// Resolve display rows for the blogs embed: feed title (live fetch,
/// "Unknown Blog" fallback like getBlogNameByRss) plus channel mention
/// ("Channel deleted" when the fetch fails, like the TS
/// `|| "Channel deleted"` leg).
pub async fn blog_display_rows(
    http: &poise::serenity_prelude::Http,
    blogs: &[BlogEntry],
) -> Vec<(String, String, String, String)> {
    let mut rows = Vec::with_capacity(blogs.len());
    for blog in blogs {
        let name = fetch_rss_title(&blog.rss)
            .await
            .unwrap_or_else(|| "Unknown Blog".to_string());
        let mention = match blog.channel_id.parse::<u64>() {
            Ok(ch) => {
                use poise::serenity_prelude::ChannelId;
                match ChannelId::new(ch).to_channel(http).await {
                    Ok(_) => format!("<#{ch}>"),
                    Err(_) => "Channel deleted".to_string(),
                }
            }
            Err(_) => "Channel deleted".to_string(),
        };
        rows.push((name, blog.rss.clone(), mention, blog.id.clone()));
    }
    rows
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
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
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "BLOGGER.blogs").await;
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
    fn latest_item_picks_newest_pubdate() {
        // Out-of-order items: the latest pubDate wins (getLatestArticle
        // reduce), ties keep the first item like the TS `>` seed.
        let body = concat!(
            "<rss><channel>",
            "<item><title>Old</title><link>http://x/o</link><guid>o</guid>",
            "<pubDate>Wed, 02 Oct 2024 09:00:00 GMT</pubDate>",
            "<author>Ann</author><description>snip-o</description></item>",
            "<item><title>New</title><link>http://x/n</link><guid>n</guid>",
            "<pubDate>Wed, 02 Oct 2024 10:00:00 GMT</pubDate>",
            "<creator>Bob</creator>",
            "<contentSnippet>snip-n</contentSnippet></item>",
            "</channel></rss>",
        );
        let item = latest_rss_item(body).unwrap();
        assert_eq!(item.id, "n");
        assert_eq!(item.title, "New");
        assert_eq!(item.author, "Bob");
        assert_eq!(item.snippet, "snip-n");
        assert!(item.pub_ms > 0);
        // Missing author/snippet fall back to the TS defaults.
        let bare =
            latest_rss_item("<rss><channel><item><link>http://x/1</link></item></channel></rss>")
                .unwrap();
        assert_eq!(bare.title, "No title");
        assert_eq!(bare.author, "Unknown");
        assert_eq!(bare.snippet, "");
    }

    #[test]
    fn pubdate_parsing_covers_ts_shapes() {
        assert_eq!(parse_pub_ms(""), 0);
        assert_eq!(parse_pub_ms("not a date"), 0);
        assert_eq!(parse_pub_ms("1727863200000"), 1727863200000);
        let rfc2822 = parse_pub_ms("Wed, 02 Oct 2024 10:00:00 GMT");
        let rfc3339 = parse_pub_ms("2024-10-02T10:00:00Z");
        assert_eq!(rfc2822, rfc3339);
        assert!(rfc2822 > 0);
    }

    #[test]
    fn article_gate_matches_ts_timestamp_leg() {
        let last = vec![NotifiedArticle {
            blog_id: "b".into(),
            article_id: "a1".into(),
            timestamp_ms: 100,
        }];
        assert!(article_already_notified(&last, "b", "a1", 50));
        // Stored timestamp >= candidate pub date counts as notified.
        assert!(article_already_notified(&last, "b", "a2", 100));
        assert!(!article_already_notified(&last, "b", "a2", 101));
        assert!(!article_already_notified(&last, "other", "a1", 50));
        // Store parse: missing key -> [], TS `|| []`; ISO strings and
        // legacy tuples keep reading.
        assert!(parse_notified_articles(None).is_empty());
        assert!(parse_notified_articles(Some("nope")).is_empty());
        let iso = r#"[{"blogId":"b","articleId":"a","timestamp":"2024-10-02T10:00:00Z"}]"#;
        let rows = parse_notified_articles(Some(iso));
        assert_eq!(rows.len(), 1);
        assert!(rows[0].timestamp_ms > 0);
        assert!(article_already_notified(
            &rows,
            "b",
            "zzz",
            rows[0].timestamp_ms
        ));
        let legacy = r#"[["b","a"]]"#;
        let rows = parse_notified_articles(Some(legacy));
        assert_eq!(rows.len(), 1);
        assert!(article_already_notified(&rows, "b", "a", 999));
    }

    #[test]
    fn enabled_gate_needs_explicit_truthy() {
        assert!(blogger_enabled_value(Some("1")));
        assert!(blogger_enabled_value(Some("true")));
        assert!(!blogger_enabled_value(Some("0")));
        assert!(!blogger_enabled_value(Some("false")));
        assert!(!blogger_enabled_value(None));
        assert!(!blogger_enabled_value(Some("")));
    }

    #[test]
    fn blogs_desc_rows_mirror_ts_format() {
        let rows = vec![(
            "My Blog".to_string(),
            "http://x/rss".to_string(),
            "<#7>".to_string(),
            "abc".to_string(),
        )];
        let desc = blogs_embed_desc("prefix\n", &rows);
        assert_eq!(
            desc,
            "prefix\n[`My Blog`](http://x/rss) - <#7> (ID: `abc`)\n"
        );
        assert_eq!(blogs_embed_desc("prefix\n", &[]), "prefix\n");
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
    fn feed_body_validity_is_parse_based() {
        // Titled feed, no items: valid (rss-parser parses it).
        assert!(rss_body_valid(
            r#"<?xml version="1.0"?><rss><channel><title>My Blog</title></channel></rss>"#
        ));
        // Title-less feed with items: valid (S9).
        assert!(rss_body_valid(
            "<rss><channel><item><title>T</title><link>http://x/1</link><guid>g1</guid></item></channel></rss>"
        ));
        assert!(!rss_body_valid("<html></html>"));
        assert!(!rss_body_valid(""));
        assert!(!rss_body_valid("not xml"));
    }

    #[test]
    fn blog_ids_are_snowflake_style() {
        // Epoch maps to zero; ids grow with time like SnowflakeUtil.
        assert_eq!(new_blog_id(DISCORD_EPOCH_MS), "0");
        let a = new_blog_id(1_727_863_200_000);
        let b = new_blog_id(1_727_863_201_000);
        assert!(a.parse::<u64>().is_ok());
        assert!(b.parse::<u64>().unwrap() > a.parse::<u64>().unwrap());
        // Timestamp segment round-trips through the Discord epoch shift.
        assert_eq!(
            a.parse::<u64>().unwrap() >> 22,
            1_727_863_200_000 - DISCORD_EPOCH_MS
        );
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
