// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/tag/* via tagHelper/embedHelper.
//
// TS keys: <guild>.GUILD.TAGS {storedTags.<name> {embedId, createBy,
// createTimestamp, uses, lastUseTimestamp, lastUseBy, content},
// whitelist_use[], whitelist_create[]}. Admin or whitelist-gated.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// JS `String || fallback` for the tagHelper nullable legs
/// (`content?: string | null`, `lastUseBy: string | null`): an explicit
/// JSON null deserializes to `""` like a missing field, so one TS-written
/// null (e.g. `lastUseBy: null` from !create.ts) never poisons the
/// whole-store parse into an empty store.
fn de_null_string<'de, D>(d: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Option::<String>::deserialize(d).map(|o| o.unwrap_or_default())
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TagEntry {
    #[serde(default)]
    pub embed_id: String,
    #[serde(default)]
    pub create_by: String,
    #[serde(default)]
    pub uses: u64,
    #[serde(default, deserialize_with = "de_null_string")]
    pub content: String,
    #[serde(default)]
    pub create_timestamp: i64,
    #[serde(default)]
    pub last_use_timestamp: i64,
    #[serde(default, deserialize_with = "de_null_string")]
    pub last_use_by: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TagStore {
    #[serde(default)]
    pub stored_tags: HashMap<String, TagEntry>,
    #[serde(default)]
    pub whitelist_use: Vec<String>,
    #[serde(default)]
    pub whitelist_create: Vec<String>,
}

pub const TAGS_KEY: &str = "GUILD.TAGS";

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

/// TS name rule (!create.ts): invalid iff longer than 16 chars or
/// containing a space. No minimum length, no charset restriction —
/// the earlier lowercase-alphanumeric-dashes gate was invented.
pub fn valid_tag_name(name: &str) -> bool {
    let n = name.trim();
    !(n.len() > 16 || n.contains(' '))
}

pub async fn load_tags(pool: &crate::db::Pool, guild_id: &str) -> TagStore {
    table_value_or_legacy(pool, guild_id, TAGS_KEY)
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub async fn save_tags(
    pool: &crate::db::Pool,
    guild_id: &str,
    store: &TagStore,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(TAGS_KEY, store)
        .await
}

/// discord.js `time(new Date(ms), "D")` renders UNCONDITIONALLY as
/// `<t:floor(ms/1000):D>` (node ground truth: 0 -> `<t:0:D>`,
/// -500 -> `<t:-1:D>`, 999 -> `<t:0:D>`); out-of-range stamps
/// (|ms| > 8.64e15, where `new Date` is invalid) render `<t:NaN:D>`.
/// `div_euclid` reproduces `Math.floor` for negative stamps
/// (truncating `/` would give 0 for -500).
pub fn tag_unix_stamp(ms: i64) -> String {
    if ms.unsigned_abs() > 8_640_000_000_000_000 {
        return "<t:NaN:D>".to_string();
    }
    format!("<t:{}:D>", ms.div_euclid(1000))
}

/// Label + emoji inputs for the tagHelper info-embed mirror below.
pub struct TagInfoText<'a> {
    pub title_lbl: &'a str,
    pub author_lbl: &'a str,
    pub created_lbl: &'a str,
    pub updated_lbl: &'a str,
    pub uses_lbl: &'a str,
    pub updated_by_lbl: &'a str,
    pub message_lbl: &'a str,
    pub no_set: &'a str,
    pub crown: &'a str,
    pub sparkles: &'a str,
    pub timer: &'a str,
    pub badge: &'a str,
    pub msg_cmd: &'a str,
}

/// Pure mirror of tagHelper.ts `generateTagInfoEmbed` title + description.
/// Every leg is JS-faithful: the author mention is raw `<@createBy>`
/// (no trim), timestamps always render via [`tag_unix_stamp`] (TS has no
/// `> 0` guard), and `lastUseBy`/`content` use `||` falsiness — only `""`
/// falls back to `no_set`, whitespace-only values render verbatim.
pub fn tag_info_text(name: &str, e: &TagEntry, t: &TagInfoText) -> (String, String) {
    let title = format!("{} #{}", t.title_lbl, name);
    let updated_by = if e.last_use_by.is_empty() {
        t.no_set.to_string()
    } else {
        format!("<@{}>", e.last_use_by)
    };
    let content = if e.content.is_empty() {
        t.no_set.to_string()
    } else {
        e.content.clone()
    };
    let desc = format!(
        "{} > **{}:** <@{}>\n{} > **{}:** {}\n{} > **{}:** {}\n{} > **{}:** **`{}`**\n{} > **{}:** {}\n{} > **{}:** ** {}**",
        t.crown,
        t.author_lbl,
        e.create_by,
        t.sparkles,
        t.created_lbl,
        tag_unix_stamp(e.create_timestamp),
        t.timer,
        t.updated_lbl,
        tag_unix_stamp(e.last_use_timestamp),
        t.timer,
        t.uses_lbl,
        e.uses,
        t.badge,
        t.updated_by_lbl,
        updated_by,
        t.msg_cmd,
        t.message_lbl,
        content,
    );
    (title, desc)
}

/// Tag permission gate: Administrator bypass, else one of the member's
/// roles must be in the whitelist. Role-membership-only, mirroring TS
/// (!use.ts whitelist_use, !create.ts whitelist_create guards, which check
/// `roles.cache.some((role) => whitelist_*.includes(role.id))` only).
/// Both writers store role IDs only (the TS RoleSelect save leg and the
/// Rust multi-select panels rewrite the whole list from the selection),
/// and no tests or fixtures store user IDs in these lists, so there is
/// no user-id leg.
pub async fn tag_allowed(ctx: &Ctx<'_>, list_name: &str) -> bool {
    if let Some(member) = ctx.author_member().await {
        if member
            .permissions
            .map(|p| p.administrator())
            .unwrap_or(false)
        {
            return true;
        }
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let list = match list_name {
        "whitelist_use" => &store.whitelist_use,
        _ => &store.whitelist_create,
    };
    if let Some(member) = ctx.author_member().await {
        if member
            .roles
            .iter()
            .any(|r| list.contains(&r.get().to_string()))
        {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn tag_unix_stamp_matches_discord_js_time() {
        // tagHelper.ts renders `time(new Date(ms), "D")` unconditionally:
        // `<t:floor(ms/1000):D>`, floor (not trunc) for negatives, and
        // `<t:NaN:D>` past the valid-Date range (|ms| > 8.64e15).
        assert_eq!(tag_unix_stamp(0), "<t:0:D>");
        assert_eq!(tag_unix_stamp(999), "<t:0:D>");
        assert_eq!(tag_unix_stamp(1000), "<t:1:D>");
        assert_eq!(tag_unix_stamp(1500), "<t:1:D>");
        assert_eq!(tag_unix_stamp(1718445600000), "<t:1718445600:D>");
        assert_eq!(tag_unix_stamp(-500), "<t:-1:D>");
        assert_eq!(tag_unix_stamp(-1000), "<t:-1:D>");
        assert_eq!(tag_unix_stamp(8_640_000_000_000_000), "<t:8640000000000:D>");
        assert_eq!(tag_unix_stamp(8_640_000_000_000_001), "<t:NaN:D>");
        assert_eq!(tag_unix_stamp(-8_640_000_000_000_001), "<t:NaN:D>");
        assert_eq!(tag_unix_stamp(i64::MAX), "<t:NaN:D>");
        assert_eq!(tag_unix_stamp(i64::MIN), "<t:NaN:D>");
    }

    fn test_text() -> TagInfoText<'static> {
        TagInfoText {
            title_lbl: "Tag",
            author_lbl: "Author",
            created_lbl: "Created At",
            updated_lbl: "Last Update",
            uses_lbl: "Uses",
            updated_by_lbl: "Last Updated By",
            message_lbl: "Message",
            no_set: "Not Set",
            crown: "C",
            sparkles: "S",
            timer: "T",
            badge: "B",
            msg_cmd: "M",
        }
    }

    #[test]
    fn tag_info_text_matches_tag_helper_falsy_legs() {
        let t = test_text();
        // Fresh-create shape: null-ish lastUseBy/content -> no_set, but
        // zero stamps still render (TS has no `> 0` guard).
        let fresh = TagEntry {
            create_by: "111".to_string(),
            ..TagEntry::default()
        };
        let (title, desc) = tag_info_text("hello", &fresh, &t);
        assert_eq!(title, "Tag #hello");
        assert_eq!(
            desc,
            "C > **Author:** <@111>\nS > **Created At:** <t:0:D>\nT > **Last Update:** <t:0:D>\nT > **Uses:** **`0`**\nB > **Last Updated By:** Not Set\nM > **Message:** ** Not Set**"
        );
        // Whitespace-only values are JS-truthy: rendered verbatim, and the
        // author mention is raw (no trim) like `<@${tag.createBy}>`.
        let quirky = TagEntry {
            create_by: " 222 ".to_string(),
            create_timestamp: -500,
            last_use_timestamp: 1718445600000,
            last_use_by: " ".to_string(),
            content: " ".to_string(),
            uses: 3,
            ..TagEntry::default()
        };
        let (_, desc) = tag_info_text("q", &quirky, &t);
        assert_eq!(
            desc,
            "C > **Author:** <@ 222 >\nS > **Created At:** <t:-1:D>\nT > **Last Update:** <t:1718445600:D>\nT > **Uses:** **`3`**\nB > **Last Updated By:** <@ >\nM > **Message:** **  **"
        );
    }

    #[test]
    fn tag_store_tolerates_ts_null_legs() {
        // !create.ts writes `lastUseBy: null`; `content` is optional-nullable.
        // Either null must read as `""` (rendered no_set), never poison the
        // whole-store parse into an empty store.
        let v: serde_json::Value = serde_json::json!({
            "stored_tags": {
                "hello": {
                    "embed_id": "",
                    "create_by": "111",
                    "uses": 1,
                    "content": null,
                    "create_timestamp": 1718445600000i64,
                    "last_use_timestamp": 1718445600000i64,
                    "last_use_by": null
                }
            }
        });
        let store: TagStore = serde_json::from_value(v).expect("null legs parse");
        let e = store.stored_tags.get("hello").expect("tag present");
        assert_eq!(e.content, "");
        assert_eq!(e.last_use_by, "");
        let t = test_text();
        let (_, desc) = tag_info_text("hello", e, &t);
        assert!(desc.contains("Last Updated By:** Not Set"));
        assert!(desc.ends_with("Message:** ** Not Set**"));
    }

    #[test]
    fn name_rules_mirror_ts() {
        // Invalid iff longer than 16 chars or containing a space.
        assert!(valid_tag_name("hello"));
        assert!(valid_tag_name("my-tag-1"));
        assert!(valid_tag_name("UPPER"));
        assert!(valid_tag_name("a"));
        assert!(!valid_tag_name("with space"));
        assert!(!valid_tag_name(&"a".repeat(17)));
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        let mut store = TagStore::default();
        store.whitelist_use.push("r1".to_string());
        save_tags(&pool, "g1", &store).await.unwrap();
        assert_eq!(
            load_tags(&pool, "g1").await.whitelist_use,
            vec!["r1".to_string()]
        );
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "GUILD.TAGS").await;
        assert_eq!(legacy, None);
        let routed: String = crate::db::kv_get(&pool, "tbl:g1", "GUILD").await.unwrap();
        assert!(routed.contains("whitelist_use"));
        // Legacy rows still read.
        crate::db::kv_set(&pool, "g2", TAGS_KEY, r#"{"whitelist_use":["r9"]}"#)
            .await
            .unwrap();
        assert_eq!(
            load_tags(&pool, "g2").await.whitelist_use,
            vec!["r9".to_string()]
        );
        // Table wins over legacy.
        crate::db::kv_set(&pool, "g1", TAGS_KEY, r#"{"whitelist_use":["stale"]}"#)
            .await
            .unwrap();
        assert_eq!(
            load_tags(&pool, "g1").await.whitelist_use,
            vec!["r1".to_string()]
        );
    }
}

pub mod create;
pub mod delete;
pub mod edit;
pub mod info;
pub mod list;
#[allow(clippy::module_inception)]
pub mod tag;
pub mod use_;
pub mod wlroles_create;
pub mod wlroles_use;

/// Old registry path (`tag::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::create::*;
    pub use super::delete::*;
    pub use super::edit::*;
    pub use super::info::*;
    pub use super::list::*;
    pub use super::tag::*;
    pub use super::use_::*;
    pub use super::wlroles_create::*;
    pub use super::wlroles_use::*;
    pub use super::*;
}

#[cfg(test)]
mod localization_tests {

    type LocCmd = poise::Command<crate::commands::Data, crate::commands::Error>;

    fn find_path<'a>(cmds: &'a [LocCmd], path: &[&str]) -> &'a LocCmd {
        let cmd = cmds
            .iter()
            .find(|c| c.name == path[0])
            .unwrap_or_else(|| panic!("command {} missing", path.join(" ")));
        if path.len() == 1 {
            cmd
        } else {
            find_path(&cmd.subcommands, &path[1..])
        }
    }

    #[test]
    fn loc_tag() {
        // TS tag/tag.ts (`tag`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["tag"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Sous-commande pour la catégorie de message de tags")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("タグメッセージカテゴリのサブコマンド")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
    }

    #[test]
    fn loc_create() {
        // TS tag/tag.ts (`create`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["tag", "create"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Créer un tag")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("タグを作成")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "tag_name")
            .expect("param tag_name");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Nom du tag")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("タグの名前")
        );
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "embed_id")
            .expect("param embed_id");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("ID de l'embed")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("埋め込みのID")
        );
    }

    #[test]
    fn loc_delete() {
        // TS tag/tag.ts (`delete`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["tag", "delete"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Supprimer un tag")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("タグを削除")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "tag_name")
            .expect("param tag_name");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Nom du tag")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("タグの名前")
        );
    }

    #[test]
    fn loc_edit() {
        // TS tag/tag.ts (`edit`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["tag", "edit"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Modifier un tag")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("タグを編集")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "current_tag_name")
            .expect("param current_tag_name");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Le nom actuel du tag")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("現在のタグ名")
        );
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "new_tag_name")
            .expect("param new_tag_name");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Le nouveau nom du tag")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("新しいタグ名")
        );
    }

    #[test]
    fn loc_info() {
        // TS tag/tag.ts (`info`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["tag", "info"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Info d'un tag")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("タグの情報")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "tag_name")
            .expect("param tag_name");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Nom du tag")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("タグの名前")
        );
    }
}
