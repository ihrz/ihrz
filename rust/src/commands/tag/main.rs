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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !tag_allowed(&ctx, "whitelist_create").await {
        ctx.say(
            crate::lang::get(&code, "tag_create_not_permited")
                .unwrap_or_else(|| "Not allowed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = tag_name.trim().to_ascii_lowercase();
    if !valid_tag_name(&name) {
        ctx.say(
            crate::lang::get(&code, "tag_create_not_good_name")
                .unwrap_or_else(|| "Bad tag name (lowercase a-z 0-9 -, 2-32).".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    if store.stored_tags.contains_key(&name) {
        ctx.say(
            crate::lang::get(&code, "tag_create_already_exist")
                .unwrap_or_else(|| "Tag already exists.".to_string()),
        )
        .await?;
        return Ok(());
    }
    store.stored_tags.insert(
        name.clone(),
        TagEntry {
            embed_id,
            create_by: ctx.author().id.get().to_string(),
            uses: 0,
            content: String::new(),
            create_timestamp: crate::commands::context::now_ms(),
            last_use_timestamp: 0,
            last_use_by: String::new(),
        },
    );
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_create_command_work")
            .map(|s| s.replace("${tag_name}", &name))
            .unwrap_or_else(|| format!("Tag `{name}` created.")),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "use")]
pub async fn tag_use(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let name = tag_name.trim().to_ascii_lowercase();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if !tag_allowed(&ctx, "whitelist_use").await {
        let create_by = load_tags(&ctx.data().pool, &gid)
            .await
            .stored_tags
            .get(&name)
            .map(|e| e.create_by.clone())
            .unwrap_or_default();
        ctx.say(
            crate::lang::get(&code, "tag_use_not_allowed")
                .map(|s| {
                    s.replace("${tag_name}", &name)
                        .replace("${tag.createBy}", &create_by)
                })
                .unwrap_or_else(|| "Not allowed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store.stored_tags.get_mut(&name) else {
        ctx.say(
            crate::lang::get(&code, "tag_doesnt_exist")
                .map(|s| s.replace("${tag_name}", &name))
                .unwrap_or_else(|| "Tag doesn't exist.".to_string()),
        )
        .await?;
        return Ok(());
    };
    entry.uses += 1;
    let uses = entry.uses;
    entry.last_use_timestamp = crate::commands::context::now_ms();
    entry.last_use_by = ctx.author().id.get().to_string();
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_use_command_work")
            .map(|s| s.replace("${tag_name}", &name))
            .unwrap_or_else(|| format!("Tag `{name}` (uses {uses}).")),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "edit")]
pub async fn tag_edit(
    ctx: Ctx<'_>,
    #[description = "Current name"] current: String,
    #[description = "New name"] new: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store
        .stored_tags
        .remove(&current.trim().to_ascii_lowercase())
    else {
        ctx.say(
            crate::lang::get(&code, "tag_doesnt_exist")
                .map(|s| s.replace("${tag_name}", &current))
                .unwrap_or_else(|| "Tag doesn't exist.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let new = new.trim().to_ascii_lowercase();
    if !valid_tag_name(&new) {
        ctx.say(
            crate::lang::get(&code, "msg_bad_new_name")
                .unwrap_or_else(|| "Bad new name.".to_string()),
        )
        .await?;
        return Ok(());
    }
    store.stored_tags.insert(new.clone(), entry);
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_edit_command_ok")
            .map(|s| {
                s.replace("${current_tag_name}", &current)
                    .replace("${new_tag_name}", &new)
            })
            .unwrap_or_else(|| format!("Tag renamed to `{new}`.")),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "delete",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn tag_delete(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
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
        ctx.say(
            crate::lang::get(&code, "tag_delete_dnt_exist")
                .map(|s| s.replace("${tag_name}", &tag_name))
                .unwrap_or_else(|| "Tag doesn't exist.".to_string()),
        )
        .await?;
        return Ok(());
    }
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_delete_command_ok")
            .map(|s| s.replace("${tag_name}", &tag_name))
            .unwrap_or_else(|| "Tag deleted.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn tag_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let mut names: Vec<String> = store.stored_tags.keys().cloned().collect();
    names.sort();
    ctx.say(if names.is_empty() {
        crate::lang::get(&code, "tag_list_no_anything").unwrap_or_else(|| "No tags.".to_string())
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
    let name = tag_name.trim().to_ascii_lowercase();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let Some(e) = store.stored_tags.get(&name) else {
        ctx.say(
            crate::commands::lang_for(&ctx, "tag_delete_dnt_exist", "Tag doesn't exist.")
                .await
                .replace("${tag_name}", &tag_name),
        )
        .await?;
        return Ok(());
    };
    // App-emoji markups from the boot-warmed cache (was one REST fetch).
    let http = ctx.http();
    let crown = crate::emojis::app_emoji_markup(http, "Crown")
        .await
        .unwrap_or_default();
    let sparkles = crate::emojis::app_emoji_markup(http, "Sparkles")
        .await
        .unwrap_or_default();
    let timer = crate::emojis::app_emoji_markup(http, "Timer")
        .await
        .unwrap_or_default();
    let badge = crate::emojis::app_emoji_markup(http, "Boosting24Months_Badge")
        .await
        .unwrap_or_default();
    let msg_cmd = crate::emojis::app_emoji_markup(http, "Message_Commands")
        .await
        .unwrap_or_default();
    let no_set = crate::commands::lang_for(&ctx, "var_no_set", "Not Set").await;
    let thumb = ctx
        .guild()
        .as_ref()
        .and_then(|g| g.icon_url())
        .or_else(|| Some(ctx.author().face()))
        .or_else(|| Some(ctx.serenity_context().cache.current_user().face()));
    let created = if e.create_timestamp > 0 {
        format!("<t:{}:D>", e.create_timestamp / 1000)
    } else {
        no_set.clone()
    };
    let updated = if e.last_use_timestamp > 0 {
        format!("<t:{}:D>", e.last_use_timestamp / 1000)
    } else {
        no_set.clone()
    };
    let updated_by = if e.last_use_by.trim().is_empty() {
        no_set.clone()
    } else {
        format!("<@{}>", e.last_use_by.trim())
    };
    let content = if e.content.trim().is_empty() {
        no_set.clone()
    } else {
        e.content.clone()
    };
    let uses = e.uses;
    let author_lbl = crate::commands::lang_for(&ctx, "var_author", "Author").await;
    let created_lbl = crate::commands::lang_for(&ctx, "tag_embed_created_at", "Created At").await;
    let updated_lbl = crate::commands::lang_for(&ctx, "tag_embed_last_update", "Last Update").await;
    let uses_lbl = crate::commands::lang_for(&ctx, "var_uses", "Uses").await;
    let updated_by_lbl =
        crate::commands::lang_for(&ctx, "tag_embed_last_updated_by", "Last Updated By").await;
    let message_lbl = crate::commands::lang_for(&ctx, "var_message", "Message").await;
    let title_lbl = crate::commands::lang_for(&ctx, "tag_name", "Tag").await;
    let desc = format!(
        "{} > **{}:** <@{}>\n{} > **{}:** {created}\n{} > **{}:** {updated}\n{} > **{}:** **{uses}**\n{} > **{}:** {updated_by}\n{} > **{}:** ** {content}**",
        crown,
        author_lbl,
        e.create_by.trim(),
        sparkles,
        created_lbl,
        timer,
        updated_lbl,
        timer,
        uses_lbl,
        badge,
        updated_by_lbl,
        msg_cmd,
        message_lbl,
    );
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(format!("{title_lbl} #{name}"))
        .colour(0x00FFFF)
        .description(desc);
    if let Some(url) = thumb {
        embed = embed.thumbnail(url);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Whitelist roles for tag use/create.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wlroles-use",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn tag_wl_use(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    toggle_tag_wl(&ctx, "whitelist_use", role).await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "wlroles-create",
    default_member_permissions = "ADMINISTRATOR"
)]
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
