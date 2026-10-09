// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// HTML transcripts. Mirrors discord-html-transcripts usage in
// ticket close/delete/transcript (createTranscript {limit:-1, hydrate,
// saveImages, favicon "bot avatar", poweredBy:false,
// footerText "Exported {number} message{s}"}) with a dependency-free
// builder: pure HTML from message snapshots, escaped, self-contained
// (inline CSS, no external assets by default).

use std::collections::HashMap;

/// Exact `footerText` passed in ticketsManager.ts
/// (`TicketTranscript` / `TicketClose` flows).
pub const FOOTER_TEMPLATE: &str = "Exported {number} message{s}";

#[derive(Debug, Clone)]
pub struct TranscriptMessage {
    pub author_tag: String,
    pub author_id: u64,
    pub content: String,
    pub timestamp_ms: i64,
    pub attachments: Vec<String>,
}

/// Enriched snapshot: same payload as [`TranscriptMessage`] plus the
/// fields `discord-html-transcripts` hydrates client-side (`hydrate: true`
/// embeds them in `window.$discordMessage.profiles`). The shared
/// snapshotter maps the base shape, so enrichment stays optional and
/// additive: anything holding plain snapshots converts via `From`.
#[derive(Debug, Clone, Default)]
pub struct RichTranscriptMessage {
    pub author_tag: String,
    pub author_id: u64,
    /// Remote avatar URL (e.g. `displayAvatarURL({ size: 64 })`).
    /// Rendered as-is (hydrate parity) unless `avatar_cache` holds a
    /// pre-fetched `data:` URL for it (offline-portable hydration).
    pub avatar_url: Option<String>,
    pub bot: bool,
    pub content: String,
    pub timestamp_ms: i64,
    pub attachments: Vec<String>,
}

impl From<&TranscriptMessage> for RichTranscriptMessage {
    fn from(m: &TranscriptMessage) -> Self {
        Self {
            author_tag: m.author_tag.clone(),
            author_id: m.author_id,
            avatar_url: None,
            bot: false,
            content: m.content.clone(),
            timestamp_ms: m.timestamp_ms,
            attachments: m.attachments.clone(),
        }
    }
}

/// Renderer options mirroring `GenerateFromMessagesOptions`.
#[derive(Debug, Clone, Default)]
pub struct TranscriptOptions {
    /// Defaults to [`FOOTER_TEMPLATE`]. Supports `{number}` / `{s}`.
    pub footer_template: Option<String>,
    /// `<link rel="icon">` href (remote URL like the TS `favicon` option,
    /// or a `data:` URL for offline files). `None` omits the tag so the
    /// file stays self-contained.
    pub favicon_url: Option<String>,
    /// Remote avatar URL -> `data:` URL. Pre-fetch avatars and fill this
    /// to mirror `hydrate: true` + `saveImages`-style inlining offline.
    pub avatar_cache: HashMap<String, String>,
    /// Remote attachment URL -> `data:` URL. Mirrors `saveImages: true`
    /// for image attachments; misses fall back to the remote URL
    /// (same as `saveImages: false`).
    pub image_cache: HashMap<String, String>,
}

pub fn escape_html(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }
    out
}

/// Render the footer line. Mirrors the library exactly:
/// `replaceAll('{number}', n).replace('{s}', n > 1 ? 's' : '')` —
/// note the `> 1` rule (0 stays singular) and only the first `{s}`.
pub fn footer_text_with(template: &str, count: usize) -> String {
    template.replace("{number}", &count.to_string()).replacen(
        "{s}",
        if count > 1 { "s" } else { "" },
        1,
    )
}

/// Footer with the exact TS `footerText` (`poweredBy: false`, so no
/// "Powered by discord-html-transcripts" suffix).
pub fn footer_text(count: usize) -> String {
    footer_text_with(FOOTER_TEMPLATE, count)
}

/// UTC `YYYY-MM-DD HH:MM` stamp. The library renders localized times via
/// web components; `<t:...:F>` Discord markdown would leak raw into a
/// browser-opened file, so snapshots format offline-readable UTC instead.
pub fn format_timestamp_utc(timestamp_ms: i64) -> String {
    let secs = timestamp_ms.div_euclid(1000);
    let nanos = (timestamp_ms.rem_euclid(1000) as u32) * 1_000_000;
    chrono::DateTime::from_timestamp(secs, nanos)
        .map(|dt| dt.format("%Y-%m-%d %H:%M UTC").to_string())
        .unwrap_or_else(|| timestamp_ms.to_string())
}

/// True for attachment URLs the library renders as inline images
/// (content-type `image/*`; here guessed from the file extension).
pub fn is_image_url(url: &str) -> bool {
    let path = url.split(['?', '#']).next().unwrap_or(url);
    let ext = path.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    matches!(
        ext.as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "avif" | "bmp" | "svg"
    )
}

/// Human link label for a file attachment (basename of the URL path).
pub fn attachment_label(url: &str) -> String {
    let path = url.split(['?', '#']).next().unwrap_or(url);
    let base = path.rsplit('/').next().unwrap_or(path);
    if base.is_empty() {
        "attachment".to_string()
    } else {
        base.to_string()
    }
}

fn resolve_cached<'a>(cache: &'a HashMap<String, String>, url: &'a str) -> &'a str {
    cache.get(url).map(String::as_str).unwrap_or(url)
}

/// Splice a favicon `<link>` after the `<meta charset>` tag. Returns the
/// input unchanged when the marker is missing or a favicon is present.
pub fn insert_favicon(html: &str, favicon_url: &str) -> String {
    const MARKER: &str = "<meta charset=\"utf-8\">";
    if html.contains("rel=\"icon\"") {
        return html.to_string();
    }
    let Some(pos) = html.find(MARKER) else {
        return html.to_string();
    };
    let mut out = String::with_capacity(html.len() + favicon_url.len() + 48);
    out.push_str(&html[..pos + MARKER.len()]);
    out.push_str("<link rel=\"icon\" type=\"image/png\" href=\"");
    out.push_str(&escape_html(favicon_url));
    out.push_str("\">");
    out.push_str(&html[pos + MARKER.len()..]);
    out
}

fn render_avatar(m: &RichTranscriptMessage, options: &TranscriptOptions, h: &mut String) {
    match &m.avatar_url {
        Some(url) => {
            let src = resolve_cached(&options.avatar_cache, url);
            h.push_str("<img class=\"avatar\" src=\"");
            h.push_str(&escape_html(src));
            h.push_str("\" alt=\"\" loading=\"lazy\">");
        }
        None => {
            // Offline fallback: initial letter disc (no external asset,
            // unlike the library's default-avatar CDN URL).
            let initial = m.author_tag.chars().next().unwrap_or('?');
            h.push_str("<div class=\"avatar avatar-fallback\" aria-hidden=\"true\">");
            h.push_str(&escape_html(&initial.to_string()));
            h.push_str("</div>");
        }
    }
}

fn render_attachments(attachments: &[String], options: &TranscriptOptions, h: &mut String) {
    for a in attachments {
        let href = escape_html(a);
        if is_image_url(a) {
            let src = resolve_cached(&options.image_cache, a);
            h.push_str("<div class=\"attachment\"><a href=\"");
            h.push_str(&href);
            h.push_str("\"><img class=\"attachment-image\" src=\"");
            h.push_str(&escape_html(src));
            h.push_str("\" alt=\"");
            h.push_str(&escape_html(&attachment_label(a)));
            h.push_str("\" loading=\"lazy\"></a></div>");
        } else {
            h.push_str("<div class=\"attachment attachment-file\"><a href=\"");
            h.push_str(&href);
            h.push_str("\">");
            h.push_str(&escape_html(&attachment_label(a)));
            h.push_str("</a></div>");
        }
    }
}

fn render_message(m: &RichTranscriptMessage, options: &TranscriptOptions, h: &mut String) {
    h.push_str("<div class=\"message\">");
    render_avatar(m, options, &mut *h);
    h.push_str("<div class=\"message-body\">");
    h.push_str("<div class=\"author-row\"><span class=\"author\">");
    h.push_str(&escape_html(&m.author_tag));
    h.push_str("</span>");
    if m.bot {
        h.push_str("<span class=\"bot-tag\">BOT</span>");
    }
    h.push_str("<span class=\"timestamp\" title=\"");
    h.push_str(&m.timestamp_ms.to_string());
    h.push_str("\">");
    h.push_str(&escape_html(&format_timestamp_utc(m.timestamp_ms)));
    h.push_str("</span></div>");
    h.push_str("<div class=\"content\">");
    h.push_str(&escape_html(&m.content).replace('\n', "<br>"));
    h.push_str("</div>");
    render_attachments(&m.attachments, options, &mut *h);
    h.push_str("</div></div>");
}

const CSS: &str = "body{margin:0;background:#36393f;color:#dcddde;font-family:'Whitney','Helvetica Neue',Helvetica,Arial,sans-serif} \
.transcript{max-width:900px;margin:0 auto;padding:24px 16px;min-height:100vh} \
.header{padding:8px 16px 16px;border-bottom:1px solid #4f545c;margin-bottom:8px} \
.header h1{font-size:24px;color:#fff;margin:0 0 4px} \
.header p{color:#b9bbbe;margin:0} \
.message{display:flex;gap:12px;padding:8px 16px;border-radius:4px} \
.message:hover{background:#32353b} \
.avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0} \
.avatar-fallback{display:flex;align-items:center;justify-content:center;background:#5865f2;color:#fff;font-weight:700;font-size:20px} \
.message-body{min-width:0;flex:1} \
.author{font-weight:500;color:#fff} \
.bot-tag{background:#5865f2;color:#fff;font-size:10px;font-weight:700;padding:2px 4px;border-radius:4px;margin-left:6px;vertical-align:middle} \
.timestamp{color:#72767d;font-size:12px;margin-left:8px} \
.content{white-space:pre-wrap;overflow-wrap:break-word} \
.attachment{margin-top:8px} \
.attachment-image{max-width:400px;max-height:320px;border-radius:8px;display:block} \
.attachment-file a,.footer a{color:#00aff4} \
.footer{text-align:center;width:100%;color:#72767d;padding:24px 0}";

/// Full renderer. Layout mirrors the library output (header channel card,
/// avatar message rows, centered footer, no powered-by line) without the
/// CDN web-components scripts, so the file works offline.
pub fn build_html_with_options(
    channel_name: &str,
    messages: &[RichTranscriptMessage],
    options: &TranscriptOptions,
) -> String {
    let footer = footer_text_with(
        options
            .footer_template
            .as_deref()
            .unwrap_or(FOOTER_TEMPLATE),
        messages.len(),
    );
    let mut h = String::new();
    h.push_str("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">");
    if let Some(favicon) = &options.favicon_url {
        h.push_str("<link rel=\"icon\" type=\"image/png\" href=\"");
        h.push_str(&escape_html(favicon));
        h.push_str("\">");
    }
    h.push_str("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
    h.push_str("<title>#");
    h.push_str(&escape_html(channel_name));
    h.push_str("</title><style>");
    h.push_str(CSS);
    h.push_str("</style></head><body><div class=\"transcript\">");
    h.push_str("<div class=\"header\"><h1>#");
    h.push_str(&escape_html(channel_name));
    h.push_str("</h1><p>This is the start of #");
    h.push_str(&escape_html(channel_name));
    h.push_str(" channel.</p></div>");
    for m in messages {
        render_message(m, options, &mut h);
    }
    h.push_str("<div class=\"footer\">");
    h.push_str(&escape_html(&footer));
    h.push_str("</div></div></body></html>");
    h
}

pub fn build_html(channel_name: &str, messages: &[TranscriptMessage]) -> String {
    let rich: Vec<RichTranscriptMessage> =
        messages.iter().map(RichTranscriptMessage::from).collect();
    build_html_with_options(channel_name, &rich, &TranscriptOptions::default())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn fixture() -> Vec<TranscriptMessage> {
        vec![
            TranscriptMessage {
                author_tag: "a<b".into(),
                author_id: 1,
                content: "hi & bye\nline2".into(),
                timestamp_ms: 0,
                attachments: vec![],
            },
            TranscriptMessage {
                author_tag: "bot".into(),
                author_id: 2,
                content: "file".into(),
                timestamp_ms: 2000,
                attachments: vec!["http://x/y.png".into()],
            },
            TranscriptMessage {
                author_tag: "c".into(),
                author_id: 3,
                content: "doc".into(),
                timestamp_ms: 3000,
                attachments: vec!["http://x/report.pdf".into()],
            },
        ]
    }

    #[test]
    fn escapes_xss() {
        assert_eq!(
            escape_html("<script>&\"'"),
            "&lt;script&gt;&amp;&quot;&#39;"
        );
    }

    #[test]
    fn footer_matches_library_plural_rule() {
        // Library: `.replace('{s}', n > 1 ? 's' : '')` — 0 stays singular.
        assert_eq!(footer_text(0), "Exported 0 message");
        assert_eq!(footer_text(1), "Exported 1 message");
        assert_eq!(footer_text(2), "Exported 2 messages");
        assert_eq!(
            footer_text_with("Exported {number} message{s}.", 3),
            "Exported 3 messages."
        );
        assert_eq!(FOOTER_TEMPLATE, "Exported {number} message{s}");
    }

    #[test]
    fn transcript_contains_all_messages_escaped() {
        let msgs = fixture();
        let html = build_html("tickets", &msgs);
        assert!(html.contains("a&lt;b"));
        assert!(html.contains("hi &amp; bye<br>line2"));
        assert!(html.contains("http://x/y.png"));
        assert!(!html.contains("<script"));
        assert!(html.contains("Exported 3 messages"));
        assert!(html.contains("1970-01-01 00:00 UTC"));
        assert!(!html.contains("<t:"));
        assert!(!html.contains("discord-html-transcripts"));
        let single = &fixture()[..1];
        assert!(build_html("t", single).contains("Exported 1 message<"));
        assert!(build_html("t", &[]).contains("Exported 0 message<"));
    }

    #[test]
    fn images_render_inline_and_files_as_links() {
        let html = build_html("t", &fixture());
        assert!(html.contains("<img class=\"attachment-image\" src=\"http://x/y.png\""));
        assert!(html.contains(">report.pdf</a>"));
    }

    #[test]
    fn avatar_cache_hydrates_offline() {
        let rich = vec![RichTranscriptMessage {
            author_tag: "u".into(),
            author_id: 7,
            avatar_url: Some("https://cdn/x/avatar.png".into()),
            bot: true,
            content: "hey".into(),
            timestamp_ms: 1000,
            attachments: vec![],
        }];
        let online = build_html_with_options("t", &rich, &TranscriptOptions::default());
        assert!(online.contains("src=\"https://cdn/x/avatar.png\""));
        assert!(online.contains("BOT</span>"));
        let mut cache = HashMap::new();
        cache.insert(
            "https://cdn/x/avatar.png".into(),
            "data:image/png;base64,TWFu".into(),
        );
        let offline = build_html_with_options(
            "t",
            &rich,
            &TranscriptOptions {
                avatar_cache: cache,
                ..Default::default()
            },
        );
        assert!(offline.contains("src=\"data:image/png;base64,TWFu\""));
        assert!(!offline.contains("https://cdn/x"));
    }

    #[test]
    fn image_cache_inlines_attachments() {
        let rich = vec![RichTranscriptMessage {
            author_tag: "u".into(),
            author_id: 7,
            avatar_url: None,
            bot: false,
            content: String::new(),
            timestamp_ms: 1000,
            attachments: vec!["https://cdn/x/pic.jpg?size=1".into()],
        }];
        let mut cache = HashMap::new();
        cache.insert(
            "https://cdn/x/pic.jpg?size=1".into(),
            "data:image/jpeg;base64,TWFu".into(),
        );
        let html = build_html_with_options(
            "t",
            &rich,
            &TranscriptOptions {
                image_cache: cache,
                ..Default::default()
            },
        );
        assert!(html.contains("src=\"data:image/jpeg;base64,TWFu\""));
        assert!(html.contains("href=\"https://cdn/x/pic.jpg?size=1\""));
    }

    #[test]
    fn attribute_injection_is_escaped() {
        let rich = vec![RichTranscriptMessage {
            author_tag: "u".into(),
            author_id: 7,
            avatar_url: Some("\" onerror=\"alert(1)".into()),
            bot: false,
            content: String::new(),
            timestamp_ms: 1000,
            attachments: vec!["http://x/\"onfocus=\"y".into()],
        }];
        let html = build_html_with_options("t", &rich, &TranscriptOptions::default());
        assert!(!html.contains("\" onerror=\""));
        assert!(html.contains("&quot; onerror=&quot;"));
    }

    #[test]
    fn favicon_and_insert_helper() {
        let html = build_html_with_options(
            "t",
            &[],
            &TranscriptOptions {
                favicon_url: Some("data:image/png;base64,TWFu".into()),
                ..Default::default()
            },
        );
        assert!(html.contains("<link rel=\"icon\""));
        let plain = build_html("t", &[]);
        assert!(!plain.contains("rel=\"icon\""));
        let patched = insert_favicon(&plain, "https://cdn/bot.png");
        assert!(
            patched.contains("<link rel=\"icon\" type=\"image/png\" href=\"https://cdn/bot.png\">")
        );
        // Idempotent: never double-insert.
        assert_eq!(insert_favicon(&patched, "https://cdn/other.png"), patched);
    }

    #[test]
    fn is_image_url_guesses_from_extension() {
        assert!(is_image_url("https://x/a.PNG?foo=1"));
        assert!(is_image_url("https://x/a.webp#frag"));
        assert!(!is_image_url("https://x/report.pdf"));
        assert!(!is_image_url("https://x/noext"));
    }
}
