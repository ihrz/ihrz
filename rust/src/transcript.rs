// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// HTML transcripts. Mirrors discord-html-transcripts usage in
// ticket close/delete/transcript (createTranscript {limit:-1, hydrate,
// saveImages}) with a dependency-free builder: pure HTML from message
// snapshots, escaped, self-contained (inline CSS, no external assets).

#[derive(Debug, Clone)]
pub struct TranscriptMessage {
    pub author_tag: String,
    pub author_id: u64,
    pub content: String,
    pub timestamp_ms: i64,
    pub attachments: Vec<String>,
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

pub fn build_html(channel_name: &str, messages: &[TranscriptMessage]) -> String {
    let mut h = String::new();
    h.push_str("<!DOCTYPE html><html><head><meta charset=\"utf-8\">");
    h.push_str("<title>Transcript — ");
    h.push_str(&escape_html(channel_name));
    h.push_str("</title><style>body{background:#313338;color:#dbdee1;font-family:sans-serif;max-width:800px;margin:auto;padding:16px}.msg{margin:12px 0;padding:8px;border-radius:8px;background:#2b2d31}.meta{color:#949ba4;font-size:12px}</style></head><body>");
    h.push_str("<h1>#");
    h.push_str(&escape_html(channel_name));
    h.push_str("</h1>");
    for m in messages {
        h.push_str("<div class=\"msg\"><div class=\"meta\">");
        h.push_str(&escape_html(&m.author_tag));
        h.push_str(" · ");
        h.push_str(&m.author_id.to_string());
        h.push_str(" · <t:");
        h.push_str(&(m.timestamp_ms / 1000).to_string());
        h.push_str(":F></div><div>");
        h.push_str(&escape_html(&m.content));
        h.push_str("</div>");
        for a in &m.attachments {
            h.push_str("<div><a href=\"");
            h.push_str(&escape_html(a));
            h.push_str("\">attachment</a></div>");
        }
        h.push_str("</div>");
    }
    // Mirrors discord-html-transcripts footerText "Exported {number}
    // message{s}".
    h.push_str("<div class=\"footer\">Exported ");
    h.push_str(&messages.len().to_string());
    h.push_str(if messages.len() == 1 {
        " message"
    } else {
        " messages"
    });
    h.push_str("</div></body></html>");
    h
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_xss() {
        assert_eq!(
            escape_html("<script>&\"'"),
            "&lt;script&gt;&amp;&quot;&#39;"
        );
    }

    #[test]
    fn transcript_contains_all_messages_escaped() {
        let msgs = vec![
            TranscriptMessage {
                author_tag: "a<b".into(),
                author_id: 1,
                content: "hi & bye".into(),
                timestamp_ms: 1000,
                attachments: vec![],
            },
            TranscriptMessage {
                author_tag: "c".into(),
                author_id: 2,
                content: "file".into(),
                timestamp_ms: 2000,
                attachments: vec!["http://x/y.png".into()],
            },
        ];
        let html = build_html("tickets", &msgs);
        assert!(html.contains("a&lt;b"));
        assert!(html.contains("hi &amp; bye"));
        assert!(html.contains("http://x/y.png"));
        assert!(!html.contains("<script"));
        assert!(html.contains("Exported 2 messages"));
        let single = vec![TranscriptMessage {
            author_tag: "c".into(),
            author_id: 2,
            content: "file".into(),
            timestamp_ms: 2000,
            attachments: vec![],
        }];
        assert!(build_html("t", &single).contains("Exported 1 message"));
        assert!(build_html("t", &[]).contains("Exported 0 messages"));
    }
}
