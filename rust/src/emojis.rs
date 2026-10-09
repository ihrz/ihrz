// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// App emoji sync. Mirrors src/core/modules/emojisManager.ts +
// tools/Emoji_Creator.ts (client.iHorizon_Emojis.<Name> namespace):
// PNG/GIF files in src/assets/emojis/iHorizon_<Name>.<ext> are uploaded
// as application emojis when missing. Self-contained base64 (no new dep).

use std::sync::Arc;

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn base64_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let n = (chunk[0] as u32) << 16
            | (*chunk.get(1).unwrap_or(&0) as u32) << 8
            | (*chunk.get(2).unwrap_or(&0) as u32);
        out.push(B64[((n >> 18) & 63) as usize] as char);
        out.push(B64[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            B64[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            B64[(n & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}

/// Standard-base64 decode. Mirrors Buffer.from(s, "base64").
/// Accepts a raw base64 string or a data: URI (prefix is stripped).
pub fn base64_decode(s: &str) -> Option<Vec<u8>> {
    let s = s.trim();
    let b64 = match s.split_once(',') {
        Some((prefix, rest)) if prefix.trim_end().ends_with("base64") => rest.trim(),
        _ => s,
    };
    let chars: Vec<u8> = b64.bytes().filter(|b| !b.is_ascii_whitespace()).collect();
    if chars.is_empty() || !chars.len().is_multiple_of(4) {
        return None;
    }
    fn val(c: u8) -> Option<u32> {
        match c {
            b'A'..=b'Z' => Some((c - b'A') as u32),
            b'a'..=b'z' => Some((c - b'a') as u32 + 26),
            b'0'..=b'9' => Some((c - b'0') as u32 + 52),
            b'+' => Some(62),
            b'/' => Some(63),
            _ => None,
        }
    }
    let mut out = Vec::with_capacity(chars.len() / 4 * 3);
    let last = chars.len() - 4;
    for (i, chunk) in chars.chunks(4).enumerate() {
        let pad = chunk.iter().rev().take_while(|&&c| c == b'=').count();
        if pad > 2 || (pad > 0 && i != last / 4) {
            return None;
        }
        let mut n: u32 = 0;
        for (j, &c) in chunk.iter().enumerate() {
            if c == b'=' {
                if j < 4 - pad {
                    return None;
                }
            } else {
                if j >= 4 - pad {
                    return None;
                }
                n |= val(c)? << (18 - j * 6);
            }
        }
        out.push((n >> 16) as u8);
        if pad < 2 {
            out.push((n >> 8) as u8);
        }
        if pad == 0 {
            out.push(n as u8);
        }
    }
    Some(out)
}

/// Strip one leading `iHorizon_` prefix. Mirrors the TS namespace mapping
/// (`local_emoji.Name.replace("iHorizon_", "")`): stored app-emoji names
/// (`iHorizon_Yes`) and callers (`Yes`) resolve to the same key (`Yes`).
/// Names without the prefix pass through unchanged.
pub fn emoji_key(name: &str) -> &str {
    name.strip_prefix("iHorizon_").unwrap_or(name)
}

/// iHorizon_Yes.png -> "Yes". Mirrors the Pascal_Snake namespace mapping.
pub fn emoji_name(file_name: &str) -> Option<String> {
    let stem = file_name.rsplit_once('.')?.0;
    let name = emoji_key(stem);
    if name.is_empty() || !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return None;
    }
    Some(name.to_string())
}

pub fn data_uri(ext: &str, bytes: &[u8]) -> Option<String> {
    let mime = match ext.to_ascii_lowercase().as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "jpg" | "jpeg" => "image/jpeg",
        _ => return None,
    };
    Some(format!("data:{mime};base64,{}", base64_encode(bytes)))
}

fn assets_dir() -> std::path::PathBuf {
    let mut p = std::env::current_dir().unwrap_or_else(|_| ".".into());
    if p.ends_with("rust") {
        p.pop();
    }
    p.join("src").join("assets").join("emojis")
}

/// Render `<:Name:id>` (or `<a:Name:id>` when animated) markup for a
/// synced app emoji. Mirrors the client.iHorizon_Emojis.<Name> namespace
/// (used for the autoFeur promo suffix with VC_OpenChat).
///
/// Reads the boot-warmed cache: one REST fetch per hour globally instead
/// of one per call. `refresh` (after `sync`) warms it at boot.
pub async fn app_emoji_markup(http: &poise::serenity_prelude::Http, name: &str) -> Option<String> {
    cached_emoji_entry(http, name)
        .await
        .map(|(id, name, animated)| format_markup(&name, id, animated))
}

/// Cached app-emoji entry: raw id, full stored name and animated flag (for the
/// ReactionType::Custom spots that need the id, e.g. help menus).
/// `name` accepts the stripped namespace key (`Yes`) or the stored name
/// (`iHorizon_Yes`); markup always uses the full stored name like the TS
/// FormatedName template.
pub async fn cached_emoji_entry(
    http: &poise::serenity_prelude::Http,
    name: &str,
) -> Option<(u64, String, bool)> {
    let table = cached_emoji_table(http).await;
    table_entry(&table, name)
}

/// Pure lookup behind `cached_emoji_entry`: normalize the `iHorizon_`
/// prefix on the query side so prefixed and unprefixed callers hit the
/// same entry. Returns (id, full stored name, animated).
fn table_entry(table: &EmojiTable, name: &str) -> Option<(u64, String, bool)> {
    table
        .get(emoji_key(name))
        .map(|(id, animated, full_name)| (*id, full_name.clone(), *animated))
}

/// Namespace key -> `<a?:name:id>` markup. Mirrors the FormatedName template in
/// emojisManager.ts (`<${animated ? "a" : ""}:${name}:${id}>`): keys are the
/// stripped namespace (`Yes`), markup keeps the full stored name
/// (`<:iHorizon_Yes:id>`) so both prefixed and unprefixed stored names
/// resolve from either query form.
pub fn emoji_map(
    emojis: &[poise::serenity_prelude::Emoji],
) -> std::collections::HashMap<String, String> {
    emojis
        .iter()
        .map(|e| {
            (
                emoji_key(&e.name).to_string(),
                format_markup(&e.name, e.id.get(), e.animated),
            )
        })
        .collect()
}

fn format_markup(name: &str, id: u64, animated: bool) -> String {
    if animated {
        format!("<a:{name}:{id}>")
    } else {
        format!("<:{name}:{id}>")
    }
}

/// Namespace key -> (id, animated, full stored name). Keys are normalized
/// with `emoji_key` so prefixed stored names (`iHorizon_Yes`) match
/// stripped queries (`Yes`) and vice versa.
type EmojiTable = std::collections::HashMap<String, (u64, bool, String)>;

static EMOJI_CACHE: std::sync::OnceLock<
    std::sync::Mutex<(EmojiTable, Option<std::time::Instant>)>,
> = std::sync::OnceLock::new();

/// Refresh the cache now (best-effort; keeps the old table on failure).
pub async fn refresh(http: &poise::serenity_prelude::Http) {
    let fetched = http.get_application_emojis().await.unwrap_or_default();
    let table: EmojiTable = fetched
        .iter()
        .map(|e| {
            (
                emoji_key(&e.name).to_string(),
                (e.id.get(), e.animated, e.name.clone()),
            )
        })
        .collect();
    let cache = EMOJI_CACHE.get_or_init(|| std::sync::Mutex::new((EmojiTable::new(), None)));
    let mut guard = cache.lock().unwrap_or_else(|e| e.into_inner());
    if !table.is_empty() || guard.0.is_empty() {
        *guard = (table, Some(std::time::Instant::now()));
    }
}

async fn cached_emoji_table(http: &poise::serenity_prelude::Http) -> EmojiTable {
    let cache = EMOJI_CACHE.get_or_init(|| std::sync::Mutex::new((EmojiTable::new(), None)));
    let fresh = cache.lock().unwrap_or_else(|e| e.into_inner()).clone();
    if let (table, Some(at)) = &fresh {
        if at.elapsed() < std::time::Duration::from_secs(3600) && !table.is_empty() {
            return table.clone();
        }
    }
    refresh(http).await;
    cache.lock().unwrap_or_else(|e| e.into_inner()).0.clone()
}

/// Upload missing app emojis. Best-effort, traced, never fails boot.
/// Mirrors the TS compare (`x.Name === local_emoji.Name`, both full
/// prefixed names) via normalized keys, so prefixed stored names match
/// stripped local names and emojis are not re-created every boot.
/// Uploads keep the full `iHorizon_<Name>` file stem like the TS.
pub async fn sync(http: &Arc<poise::serenity_prelude::Http>) {
    let existing: Vec<String> = http
        .get_application_emojis()
        .await
        .unwrap_or_default()
        .iter()
        .map(|e| emoji_key(&e.name).to_string())
        .collect();
    let dir = assets_dir();
    let entries = std::fs::read_dir(&dir).map(|r| r.count()).unwrap_or(0);
    let _ = entries;
    let Ok(read) = std::fs::read_dir(&dir) else {
        return;
    };
    for entry in read.flatten() {
        let path = entry.path();
        let Some(fname) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let (Some(name), Some(ext)) =
            (emoji_name(fname), path.extension().and_then(|e| e.to_str()))
        else {
            continue;
        };
        if existing.iter().any(|e| e == &name) {
            continue;
        }
        // Full file stem (`iHorizon_Yes`) for the upload, like the TS
        // (`name: local_emoji.Name`); `name` above is the stripped key.
        let full_name = fname.rsplit_once('.').map(|(s, _)| s).unwrap_or(fname);
        let Ok(bytes) = std::fs::read(&path) else {
            continue;
        };
        if bytes.len() > 256 * 1024 {
            continue;
        }
        let Some(image) = data_uri(ext, &bytes) else {
            continue;
        };
        match http
            .create_application_emoji(&serde_json::json!({"name": full_name, "image": image}))
            .await
        {
            Ok(_) => tracing::info!("emoji synced: {name}"),
            Err(e) => tracing::warn!("emoji {name} failed: {e}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_vectors() {
        assert_eq!(base64_encode(b"Man"), "TWFu");
        assert_eq!(base64_encode(b"Ma"), "TWE=");
        assert_eq!(base64_encode(b"M"), "TQ==");
        assert_eq!(base64_encode(b""), "");
    }

    #[test]
    fn emoji_map_matches_ts_formated_name() {
        // Emoji is non_exhaustive: build via JSON like the API would.
        let raw = serde_json::json!([
            {"id": "1", "name": "Crown", "animated": false},
            {"id": "2", "name": "Wave", "animated": true}
        ]);
        let emojis: Vec<poise::serenity_prelude::Emoji> = serde_json::from_value(raw).unwrap();
        let map = emoji_map(&emojis);
        assert_eq!(map.get("Crown").map(String::as_str), Some("<:Crown:1>"));
        assert_eq!(map.get("Wave").map(String::as_str), Some("<a:Wave:2>"));
        assert_eq!(format_markup("X", 9, false), "<:X:9>");
        assert_eq!(format_markup("X", 9, true), "<a:X:9>");
    }

    #[test]
    fn base64_decode_roundtrips_encode() {
        for raw in [
            b"Man".as_slice(),
            b"Ma",
            b"M",
            b"hello world",
            b"\x00\xff\x10",
        ] {
            let enc = base64_encode(raw);
            assert_eq!(base64_decode(&enc).as_deref(), Some(raw));
        }
        assert_eq!(base64_decode("TWFu").unwrap(), b"Man");
        assert_eq!(base64_decode("TWE=").unwrap(), b"Ma");
        assert_eq!(base64_decode("data:image/png;base64,TWFu").unwrap(), b"Man");
        assert_eq!(base64_decode(""), None);
        assert_eq!(base64_decode("!!!"), None);
        assert_eq!(base64_decode("TWF"), None);
        assert_eq!(base64_decode("TW=u"), None);
    }

    #[test]
    fn name_mapping() {
        assert_eq!(emoji_name("iHorizon_Yes.png").as_deref(), Some("Yes"));
        assert_eq!(
            emoji_name("iHorizon_Save_Clip.png").as_deref(),
            Some("Save_Clip")
        );
        assert_eq!(emoji_name("nope.txt").as_deref(), Some("nope"));
        assert_eq!(emoji_name("iHorizon_.png"), None);
    }

    #[test]
    fn prefix_key_normalizes_both_sides() {
        // Stored app-emoji names (`iHorizon_Yes`) and stripped namespace
        // keys (`Yes`) resolve identically, like the TS full-name compare.
        assert_eq!(emoji_key("iHorizon_Yes"), "Yes");
        assert_eq!(emoji_key("Yes"), "Yes");
        assert_eq!(emoji_key("iHorizon_Save_Clip"), "Save_Clip");
        assert_eq!(emoji_key("Save_Clip"), "Save_Clip");
        // Sync-compare side: prefixed stored vs stripped local match.
        let existing = ["iHorizon_Yes", "iHorizon_Crown"]
            .iter()
            .map(|e| emoji_key(e).to_string())
            .collect::<Vec<_>>();
        let local = emoji_name("iHorizon_Yes.png").unwrap();
        assert!(existing.iter().any(|e| e == &local));
        let missing = emoji_name("iHorizon_Nope.png").unwrap();
        assert!(!existing.iter().any(|e| e == &missing));
    }

    #[test]
    fn markup_lookup_hits_prefixed_and_unprefixed() {
        // Emoji is non_exhaustive: build via JSON like the API would.
        let raw = serde_json::json!([
            {"id": "1", "name": "iHorizon_Yes", "animated": false},
            {"id": "2", "name": "Wave", "animated": true}
        ]);
        let emojis: Vec<poise::serenity_prelude::Emoji> = serde_json::from_value(raw).unwrap();
        let map = emoji_map(&emojis);
        // Stripped query hits the prefixed stored emoji; markup keeps the
        // full stored name like the TS FormatedName template.
        assert_eq!(
            map.get("Yes").map(String::as_str),
            Some("<:iHorizon_Yes:1>")
        );
        // Unprefixed stored names keep working as before.
        assert_eq!(map.get("Wave").map(String::as_str), Some("<a:Wave:2>"));
    }

    #[test]
    fn table_lookup_accepts_either_name_form() {
        let mut table: EmojiTable = std::collections::HashMap::new();
        table.insert(
            emoji_key("iHorizon_Yes").to_string(),
            (7, false, "iHorizon_Yes".to_string()),
        );
        // Both query forms resolve; the returned name is the full stored
        // name so markup renders `<:iHorizon_Yes:7>`.
        assert_eq!(
            table_entry(&table, "Yes"),
            Some((7, "iHorizon_Yes".to_string(), false))
        );
        assert_eq!(
            table_entry(&table, "iHorizon_Yes"),
            Some((7, "iHorizon_Yes".to_string(), false))
        );
        assert_eq!(table_entry(&table, "Nope"), None);
    }

    #[test]
    fn uri_mimes() {
        assert!(data_uri("png", b"x")
            .unwrap()
            .starts_with("data:image/png;base64,"));
        assert!(data_uri("gif", b"x")
            .unwrap()
            .starts_with("data:image/gif;base64,"));
        assert_eq!(data_uri("webp", b"x"), None);
    }
}
