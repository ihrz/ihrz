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

#[poise::command(
    slash_command,
    prefix_command,
    category = "tags",
    rename = "tag",
    subcommands(
        "tag_create",
        "tag_use",
        "tag_edit",
        "tag_delete",
        "tag_list",
        "tag_info",
        "tag_wl_use",
        "tag_wl_create"
    )
)]
pub async fn tag(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
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

#[poise::command(slash_command, prefix_command, rename = "create")]

pub async fn tag_create(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
    #[description = "Embed id"] embed_id: String,
) -> Result<(), anyhow::Error> {
    if !tag_allowed(&ctx, "whitelist_create").await {
        ctx.say("Not allowed.").await?;
        return Ok(());
    }
    let name = tag_name.trim().to_ascii_lowercase();
    if !valid_tag_name(&name) {
        ctx.say("Bad tag name (lowercase a-z 0-9 -, 2-32).").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    if store.stored_tags.contains_key(&name) {
        ctx.say("Tag already exists.").await?;
        return Ok(());
    }
    store.stored_tags.insert(
        name.clone(),
        TagEntry {
            embed_id,
            create_by: ctx.author().id.get().to_string(),
            uses: 0,
            content: String::new(),
        },
    );
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(format!("Tag `{name}` created.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "use")]
pub async fn tag_use(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    if !tag_allowed(&ctx, "whitelist_use").await {
        ctx.say("Not allowed.").await?;
        return Ok(());
    }
    let name = tag_name.trim().to_ascii_lowercase();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store.stored_tags.get_mut(&name) else {
        ctx.say("Tag doesn't exist.").await?;
        return Ok(());
    };
    entry.uses += 1;
    let uses = entry.uses;
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(format!("Tag `{name}` (uses {uses}).")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "edit")]
pub async fn tag_edit(
    ctx: Ctx<'_>,
    #[description = "Current name"] current: String,
    #[description = "New name"] new: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store
        .stored_tags
        .remove(&current.trim().to_ascii_lowercase())
    else {
        ctx.say("Tag doesn't exist.").await?;
        return Ok(());
    };
    let new = new.trim().to_ascii_lowercase();
    if !valid_tag_name(&new) {
        ctx.say("Bad new name.").await?;
        return Ok(());
    }
    store.stored_tags.insert(new.clone(), entry);
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(format!("Tag renamed to `{new}`.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn tag_delete(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    if store
        .stored_tags
        .remove(&tag_name.trim().to_ascii_lowercase())
        .is_none()
    {
        ctx.say("Tag doesn't exist.").await?;
        return Ok(());
    }
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say("Tag deleted.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn tag_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let mut names: Vec<String> = store.stored_tags.keys().cloned().collect();
    names.sort();
    ctx.say(if names.is_empty() {
        "No tags.".to_string()
    } else {
        names.join(", ")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "info")]
pub async fn tag_info(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let store = load_tags(&ctx.data().pool, &gid).await;
    match store.stored_tags.get(&tag_name.trim().to_ascii_lowercase()) {
        Some(e) => {
            ctx.say(format!(
                "Tag `{tag_name}`: uses {}, by {}",
                e.uses, e.create_by
            ))
            .await?
        }
        None => ctx.say("Tag doesn't exist.").await?,
    };
    Ok(())
}

/// Whitelist roles for tag use/create.
#[poise::command(slash_command, prefix_command, rename = "wlroles-use")]
pub async fn tag_wl_use(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    toggle_tag_wl(&ctx, "whitelist_use", role).await
}

#[poise::command(slash_command, prefix_command, rename = "wlroles-create")]
pub async fn tag_wl_create(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    toggle_tag_wl(&ctx, "whitelist_create", role).await
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
    ctx.say("Whitelist updated.").await?;
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
