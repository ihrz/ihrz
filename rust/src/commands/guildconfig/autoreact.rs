use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Emoji"] emoji: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !crate::funcs::is_single_emoji(&emoji) && !crate::funcs::is_discord_emoji(&emoji) {
        ctx.say(
            crate::lang::get(&code, "autoreact_invalid_emoji")
                .unwrap_or_else(|| "Invalid emoji.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.AUTOREACT").await;
    let mut list: Vec<serde_json::Value> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    list.push(serde_json::json!({"channelId": channel.id.get().to_string(), "emoji": emoji}));
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "autoreact_add_command_ok")
            .unwrap_or_else(|| "Autoreact added.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.AUTOREACT").await;
    let list: Vec<serde_json::Value> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "autoreact_remove_not_found")
            .unwrap_or_else(|| "No autoreacts.".to_string())
    } else {
        list.iter()
            .map(|e| {
                format!(
                    "<#{}> {}",
                    e.get("channelId").and_then(|c| c.as_str()).unwrap_or("?"),
                    e.get("emoji").and_then(|x| x.as_str()).unwrap_or("?")
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact_remove(
    ctx: Ctx<'_>,
    #[description = "Index (from autoreact-list, 1-based)"] index: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.AUTOREACT").await;
    let mut list: Vec<serde_json::Value> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let i = index as usize;
    if i == 0 || i > list.len() {
        ctx.say(
            crate::lang::get(&code, "msg_bad_index").unwrap_or_else(|| "Bad index.".to_string()),
        )
        .await?;
        return Ok(());
    }
    list.remove(i - 1);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(&list)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "autoreact_remove_command_ok")
            .unwrap_or_else(|| "Autoreact removed.".to_string()),
    )
    .await?;
    Ok(())
}

/// Master switch for autoreacts. Mirrors toggle-react.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-toggle",
    aliases("toggle-react", "react-toggle", "togglereact", "reacttoggle"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn gc_autoreact_toggle(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.AUTOREACT.enabled",
        if enabled { "1" } else { "0" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let active_msg = if enabled {
        crate::lang::get(&code, "toggle_react_react").unwrap_or_else(|| "react".to_string())
    } else {
        crate::lang::get(&code, "toggle_react_doesnt_react")
            .unwrap_or_else(|| "no longer react".to_string())
    };
    let member_id = ctx.author().id.get().to_string();
    ctx.say(
        crate::lang::get(&code, "toggle_react_command_work")
            .map(|s| {
                s.replace("{activeMsg}", &active_msg)
                    .replace("${interaction.member?.id}", &member_id)
            })
            .unwrap_or_else(|| {
                if enabled {
                    "Autoreacts on.".to_string()
                } else {
                    "Autoreacts off.".to_string()
                }
            }),
    )
    .await?;
    Ok(())
}
