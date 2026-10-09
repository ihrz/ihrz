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

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TagEntry {
    #[serde(default)]
    pub embed_id: String,
    #[serde(default)]
    pub create_by: String,
    #[serde(default)]
    pub uses: u64,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub create_timestamp: i64,
    #[serde(default)]
    pub last_use_timestamp: i64,
    #[serde(default)]
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

/// TS name rules: lowercase alphanumeric + dashes, 2..=32.
pub fn valid_tag_name(name: &str) -> bool {
    let n = name.trim();
    (2..=32).contains(&n.len())
        && n.chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

pub async fn load_tags(pool: &crate::db::Pool, guild_id: &str) -> TagStore {
    crate::db::kv_get(pool, guild_id, TAGS_KEY)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_tags(
    pool: &crate::db::Pool,
    guild_id: &str,
    store: &TagStore,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, guild_id, TAGS_KEY, &serde_json::to_string(store)?).await
}

/// Tag permission gate: Administrator bypass, else the user or one of
/// their roles must be in the whitelist. Mirrors the TS guards.
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
    let uid = ctx.author().id.get().to_string();
    if list.contains(&uid) {
        return true;
    }
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

async fn toggle_tag_wl(
    ctx: &Ctx<'_>,
    list: &str,
    role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let target = match list {
        "whitelist_use" => &mut store.whitelist_use,
        _ => &mut store.whitelist_create,
    };
    let id = role.id.get().to_string();
    if !target.contains(&id) {
        target.push(id);
        save_tags(&ctx.data().pool, &gid, &store).await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_whitelist_updated")
            .unwrap_or_else(|| "Whitelist updated.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_rules_mirror_ts() {
        assert!(valid_tag_name("hello"));
        assert!(valid_tag_name("my-tag-1"));
        assert!(!valid_tag_name("A"));
        assert!(!valid_tag_name("UPPER"));
        assert!(!valid_tag_name("with space"));
        assert!(!valid_tag_name("a"));
        assert!(!valid_tag_name(&"a".repeat(33)));
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
