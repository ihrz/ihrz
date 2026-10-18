// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Shared reaction-role / button-row helpers for rolereactions
// (pure move from rolereaction.rs; zero logic change).

use poise::serenity_prelude as serenity;

/// Role id from a reaction-role row: TS `{rolesID}` object, falling
/// back to legacy bare-id rows written by the old stub.
pub fn parse_reaction_role(raw: &str) -> Option<u64> {
    serde_json::from_str::<ButtonRoleRow>(raw)
        .ok()
        .and_then(|r| r.roles_id.parse::<u64>().ok())
        .or_else(|| raw.trim().parse::<u64>().ok())
}

/// ReactionType for a stored reactionNAME (bare custom id or
/// unicode). Bare ids react as custom emoji without a name, like
/// the TS msg.react(normalized) call.
pub fn reaction_type_for(stored: &str) -> serenity::ReactionType {
    if !stored.is_empty() && stored.chars().all(|c| c.is_ascii_digit()) {
        if let Ok(id) = stored.parse::<u64>() {
            return serenity::ReactionType::Custom {
                animated: false,
                id: serenity::EmojiId::new(id),
                name: None,
            };
        }
    }
    serenity::ReactionType::Unicode(stored.to_string())
}

/// Lookup keys for a reaction press: emoji name then emoji id, like
/// the two legs in onReactAdd.ts (name, then nitro id).
/// DELTAS (all unreachable on writer-produced rows — the writer only
/// `db.set`s after a successful `msg.react`, and rejects `<`, `>`, `:`
/// in the reaction string, so keys are unicode emoji or plain names
/// with numeric `rolesID` rows): a unicode press consults a second
/// `"null"` key in TS (`${emoji.id}` with null id) that we skip; a
/// present-but-unparsable leg-1 row throws TS out of `run()` (nitro leg
/// never consulted) while `lookup_reaction_role` falls through to the
/// next key; the remove side (`onReactRemove.ts:33` + `:54`) reads the
/// SAME name key twice (double remove, idempotent) while we read once.
pub fn reaction_role_keys(emoji: &serenity::ReactionType) -> Vec<String> {
    match emoji {
        serenity::ReactionType::Unicode(u) => vec![u.clone()],
        serenity::ReactionType::Custom { id, name, .. } => {
            let mut keys = vec![];
            if let Some(n) = name {
                keys.push(n.clone());
            }
            keys.push(id.get().to_string());
            keys
        }
        _ => vec![],
    }
}

/// Add-side toggle verdict. Mirrors `onReactAdd.ts:47-52` exactly:
/// `member?.roles.cache.has(role.id) || (await member.fetch()...)?.roles.cache.has(role.id)`
/// removes, otherwise adds. The live call site feeds the freshly
/// HTTP-fetched member as the fresh leg (cache leg subsumed: the TS
/// second leg refreshes the cache, so a hot cache agrees; a stale
/// cache-has + fresh-miss removes in TS but adds here — negligible,
/// gateway keeps member roles hot). A failed member fetch throws TS
/// into the outer catch (no action); here the caller skips on `Err`.
/// Pure, unit-tested below.
pub fn reaction_add_should_remove(cached_has: bool, fresh_has: bool) -> bool {
    cached_has || fresh_has
}

pub fn reaction_row_key(message_id: u64, emoji_key: &str) -> String {
    format!("GUILD.REACTION_ROLES.{message_id}.{emoji_key}")
}

/// Role id for a reaction press (name key, then nitro id key).
/// Mirrors the two-leg lookup in onReactAdd.ts.
pub async fn lookup_reaction_role(
    pool: &crate::db::Pool,
    gid: &str,
    mid: u64,
    emoji: &serenity::ReactionType,
) -> Option<serenity::RoleId> {
    for key in reaction_role_keys(emoji) {
        let raw =
            crate::commands::owner::main::routed_get(pool, gid, gid, &reaction_row_key(mid, &key))
                .await;
        if let Some(id) = raw.as_deref().and_then(parse_reaction_role) {
            return Some(serenity::RoleId::new(id));
        }
    }
    None
}

/// Stored button row. Mirrors `{rolesID, reactionNAME, enable}` at
/// `GUILD.REACTION_ROLES.<msg>.button_reaction%<role>`.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct ButtonRoleRow {
    #[serde(rename = "rolesID", default)]
    pub roles_id: String,
    #[serde(rename = "reactionNAME", default)]
    pub reaction_name: String,
    #[serde(default)]
    pub enable: bool,
}

/// Verbatim press id. Mirrors ``button_reaction%${role?.id}``.
pub const BUTTON_REACTION_PREFIX: &str = "button_reaction%";

pub fn button_reaction_id(role_id: u64) -> String {
    format!("{BUTTON_REACTION_PREFIX}{role_id}")
}

pub fn button_role_key(message_id: u64, role_id: &str) -> String {
    format!("GUILD.REACTION_ROLES.{message_id}.{BUTTON_REACTION_PREFIX}{role_id}")
}

/// Custom `<:name:id>` / `<a:name:id>` -> id, else the raw reaction.
/// Mirrors the regex in rolebutton.ts.
pub fn normalize_button_reaction(raw: &str) -> String {
    let s = raw.trim();
    if s.starts_with('<') && s.ends_with('>') {
        if let Some(pos) = s.rfind(':') {
            let id: String = s[pos + 1..s.len() - 1]
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            if !id.is_empty() {
                return id;
            }
        }
    }
    s.to_string()
}

/// TS rejects anything still shaped like a custom emoji after
/// normalization (contains `<`, `>` or `:`).
pub fn is_valid_button_reaction(reaction: &str) -> bool {
    !(reaction.contains('<') || reaction.contains('>') || reaction.contains(':'))
}

/// buttonReact: append a Secondary button to the first row with <5
/// components that already holds a button, else push a new row.
/// Err past 5 rows (TS throws "Too much components on this
/// message!").
pub fn append_button_row(
    rows: &mut Vec<serde_json::Value>,
    custom_id: &str,
    emoji: serde_json::Value,
) -> Result<(), &'static str> {
    if rows.len() >= 5 {
        return Err("Too much components on this message!");
    }
    let button = serde_json::json!({"type": 2, "style": 2, "custom_id": custom_id, "emoji": emoji});
    for row in rows.iter_mut() {
        let comps = row.get_mut("components").and_then(|c| c.as_array_mut());
        let Some(comps) = comps else { continue };
        if comps.len() < 5
            && comps
                .iter()
                .any(|c| c.get("type").and_then(|x| x.as_u64()) == Some(2))
        {
            comps.push(button);
            return Ok(());
        }
    }
    rows.push(serde_json::json!({"type": 1, "components": [button]}));
    Ok(())
}

/// buttonUnreact: drop buttons whose `emoji.id` equals the reaction
/// (TS compares `component.emoji?.id === buttonEmoji`, so unicode
/// name-emojis never match there either); drop emptied rows.
pub fn remove_button_by_emoji(rows: &mut Vec<serde_json::Value>, reaction: &str) -> bool {
    let mut removed = false;
    rows.retain_mut(|row| {
        if let Some(comps) = row.get_mut("components").and_then(|c| c.as_array_mut()) {
            comps.retain(|c| {
                let hit = c.get("type").and_then(|x| x.as_u64()) == Some(2)
                    && c.get("emoji")
                        .and_then(|e| e.get("id"))
                        .and_then(|x| x.as_str())
                        == Some(reaction);
                if hit {
                    removed = true;
                }
                !hit
            });
            !comps.is_empty()
        } else {
            true
        }
    });
    removed
}

/// All button rows for a message (the TS nested-object read over
/// `GUILD.REACTION_ROLES.<msg>`): guild-table subtree first, legacy
/// kv rows filling gaps (table wins). Keys unchanged.
pub async fn load_button_rows(
    pool: &crate::db::Pool,
    gid: &str,
    mid: u64,
) -> Vec<(String, ButtonRoleRow)> {
    use crate::commands::owner::main as routed;
    let prefix = format!("GUILD.REACTION_ROLES.{mid}.");
    let mut by_key: std::collections::HashMap<String, ButtonRoleRow> =
        std::collections::HashMap::new();
    for (k, v) in routed::legacy_scan(pool, gid, &prefix).await {
        if let Ok(row) = serde_json::from_str::<ButtonRoleRow>(&v) {
            by_key.insert(k, row);
        }
    }
    let mid_s = mid.to_string();
    if let Some(root) = routed::tbl_get_value(pool, gid, "GUILD").await {
        if let Some(obj) =
            routed::walk_path(&root, &["REACTION_ROLES", &mid_s]).and_then(|v| v.as_object())
        {
            for (sub, v) in obj {
                if let Ok(row) = serde_json::from_value::<ButtonRoleRow>(v.clone()) {
                    by_key.insert(format!("{prefix}{sub}"), row);
                }
            }
        }
    }
    let mut rows: Vec<(String, ButtonRoleRow)> = by_key.into_iter().collect();
    rows.sort_by(|a, b| a.0.cmp(&b.0));
    rows
}

/// #bf0bb9 log embed to the name-contains `ihorizon-logs` channel.
/// Mirrors ihorizon_logs.ts (best-effort, silent when missing).
pub async fn post_ihorizon_log(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    title: &str,
    description: &str,
) {
    let Ok(channels) = http.get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0xbf0bb9))
        .title(title.to_string())
        .description(description.to_string());
    let _ = ch
        .id
        .send_message(http, serenity::CreateMessage::new().embed(embed))
        .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reaction_role_rows_parse() {
        assert_eq!(
            parse_reaction_role(r#"{"rolesID":"7","reactionNAME":"👍","enable":true}"#),
            Some(7)
        );
        // Legacy bare-id rows keep working.
        assert_eq!(parse_reaction_role("42"), Some(42));
        assert_eq!(parse_reaction_role("nope"), None);
        assert_eq!(parse_reaction_role(r#"{"rolesID":"x"}"#), None);
    }

    #[test]
    fn reaction_types_and_keys() {
        match reaction_type_for("👍") {
            serenity::ReactionType::Unicode(u) => assert_eq!(u, "👍"),
            _ => panic!("unicode"),
        }
        match reaction_type_for("12345") {
            serenity::ReactionType::Custom { id, name, .. } => {
                assert_eq!(id.get(), 12345);
                assert_eq!(name, None);
            }
            _ => panic!("custom"),
        }
        assert_eq!(
            reaction_role_keys(&serenity::ReactionType::Unicode("👍".to_string())),
            vec!["👍".to_string()]
        );
        assert_eq!(
            reaction_role_keys(&reaction_type_for("12345")),
            vec!["12345".to_string()]
        );
    }

    #[test]
    fn reactionrole_add_remove_match_ts_battery() {
        // onReactAdd.ts:32/:66 key legs (name, then id); the unicode
        // second-leg "null" key is the documented skip (battery add-unicode-keys).
        assert_eq!(
            reaction_role_keys(&serenity::ReactionType::Unicode("👍".to_string())),
            vec!["👍".to_string()]
        );
        assert_eq!(
            reaction_role_keys(&serenity::ReactionType::Custom {
                animated: false,
                id: serenity::EmojiId::new(123456789012345678),
                name: Some("party".to_string()),
            }),
            vec!["party".to_string(), "123456789012345678".to_string()]
        );
        // Nameless custom: TS leg-1 reads the literal "null" key; we go
        // straight to the id (battery add-nameless-keys).
        assert_eq!(
            reaction_role_keys(&serenity::ReactionType::Custom {
                animated: false,
                id: serenity::EmojiId::new(123456789012345678),
                name: None,
            }),
            vec!["123456789012345678".to_string()]
        );
        // onReactAdd.ts:47-52 toggle truth table (battery toggle-*).
        assert!(!reaction_add_should_remove(false, false));
        assert!(reaction_add_should_remove(true, false));
        assert!(reaction_add_should_remove(false, true));
        assert!(reaction_add_should_remove(true, true));
    }

    #[test]
    fn button_reaction_ids_and_keys() {
        assert_eq!(button_reaction_id(7), "button_reaction%7");
        assert_eq!(
            button_role_key(9, "7"),
            "GUILD.REACTION_ROLES.9.button_reaction%7"
        );
        assert_eq!(normalize_button_reaction("<:pepe:123>"), "123");
        assert_eq!(normalize_button_reaction("<a:dance:678>"), "678");
        assert_eq!(normalize_button_reaction("👍"), "👍");
        assert!(!is_valid_button_reaction("<:x:1>"));
        assert!(is_valid_button_reaction("👍"));
        assert!(is_valid_button_reaction("123"));
        let row: ButtonRoleRow =
            serde_json::from_str(r#"{"rolesID":"7","reactionNAME":"👍","enable":true}"#).unwrap();
        assert_eq!(row.roles_id, "7");
        assert_eq!(row.reaction_name, "👍");
        assert!(row.enable);
    }

    #[test]
    fn button_rows_append_and_remove() {
        // Fresh message: new row.
        let mut rows = vec![];
        append_button_row(
            &mut rows,
            "button_reaction%7",
            serde_json::json!({"name": "👍"}),
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        // Existing button row with room: append in place.
        append_button_row(
            &mut rows,
            "button_reaction%8",
            serde_json::json!({"name": "🎫"}),
        )
        .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["components"].as_array().unwrap().len(), 2);
        // Five rows: error like the TS throw.
        let mut full = vec![serde_json::json!({"type": 1, "components": []}); 5];
        assert!(append_button_row(&mut full, "x", serde_json::json!({"name": "y"})).is_err());
        // buttonUnreact matches emoji.id only (unicode never matches).
        let mut custom = vec![serde_json::json!({"type": 1, "components": [
            {"type": 2, "custom_id": "button_reaction%7", "emoji": {"id": "123"}},
            {"type": 2, "custom_id": "button_reaction%8", "emoji": {"name": "🎫"}}
        ]})];
        assert!(remove_button_by_emoji(&mut custom, "123"));
        assert_eq!(custom[0]["components"].as_array().unwrap().len(), 1);
        assert!(!remove_button_by_emoji(&mut custom, "🎫"));
        // Emptied rows drop.
        let mut solo = vec![serde_json::json!({"type": 1, "components": [
            {"type": 2, "custom_id": "button_reaction%7", "emoji": {"id": "123"}}
        ]})];
        assert!(remove_button_by_emoji(&mut solo, "123"));
        assert!(solo.is_empty());
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn button_rows_table_routing_with_legacy_fallback() {
        use crate::commands::owner::main as routed;
        let pool = memory_pool().await;
        let row = r#"{"rolesID":"7","reactionNAME":"x","enable":true}"#;
        // Routed write dual-writes; the union scan sees it.
        routed::routed_set(&pool, "g", "g", "GUILD.REACTION_ROLES.11.btn_7", row)
            .await
            .unwrap();
        let rows = load_button_rows(&pool, "g", 11).await;
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, "GUILD.REACTION_ROLES.11.btn_7");
        assert_eq!(rows[0].1.roles_id, "7");
        // Legacy-only row for another message merges in.
        crate::db::kv_set(&pool, "g", "GUILD.REACTION_ROLES.12.btn_9", row)
            .await
            .unwrap();
        assert_eq!(load_button_rows(&pool, "g", 12).await.len(), 1);
        assert_eq!(load_button_rows(&pool, "g", 11).await.len(), 1);
        // Table wins over a stale legacy row for the same key.
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.REACTION_ROLES.11.btn_7",
            r#"{"rolesID":"8","reactionNAME":"x","enable":true}"#,
        )
        .await
        .unwrap();
        let rows = load_button_rows(&pool, "g", 11).await;
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].1.roles_id, "7");
    }
}
