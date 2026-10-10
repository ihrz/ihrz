use super::*;

// Ignore-channels group. TS (!ignore-channels.ts) is a multi-select
// REPLACE panel (min 0 / max 25, save writes the whole array, selecting
// nothing clears it); the flattened slash/prefix port exposes the same
// power as add / remove / clear / list legs. Selectable kinds mirror the
// TS `setChannelTypes` (Forum, Media, Text, Category, StageVoice,
// Voice); GuildMedia has no serenity 0.12 variant (it arrives as
// Unknown(16)), so it cannot be named in `channel_types`.
const KEY: &str = "GUILD.ANTISPAM.BYPASS_CHANNELS";

/// Channel kinds selectable on the add/remove legs. Mirrors the TS
/// ignore-channels select minus GuildMedia (inexpressible, see above).
pub const IGNORE_CHANNEL_TYPES: [&str; 5] = ["Forum", "Text", "Category", "Stage", "Voice"];

/// Subcommand for ignore-channels category!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-channels",
    aliases("channels"),
    subcommands(
        "as_ignore_channels_add",
        "as_ignore_channels_remove",
        "as_ignore_channels_clear",
        "as_ignore_channels_list"
    ),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn as_ignore_channels(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

async fn guild_id_of(ctx: &Ctx<'_>) -> String {
    ctx.guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default()
}

async fn lang_of(ctx: &Ctx<'_>) -> String {
    crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await
}

/// Add a role for a certain amount of money!
#[poise::command(slash_command, prefix_command, rename = "add")]
pub async fn as_ignore_channels_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Forum", "Text", "Category", "Stage", "Voice")]
    channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    let mut list: Vec<String> = load_string_list(&ctx.data().pool, &gid, KEY).await;
    let id = channel.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        save_string_list(&ctx.data().pool, &gid, KEY, &list).await?;
    }
    let code = lang_of(&ctx).await;
    ctx.say(
        crate::lang::get(&code, "msg_ignore_channel_added")
            .unwrap_or_else(|| "Ignore channel added.".to_string()),
    )
    .await?;
    Ok(())
}

/// Remove Streamer/Youtuber/Twitcher
#[poise::command(slash_command, prefix_command, rename = "remove")]
pub async fn as_ignore_channels_remove(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Forum", "Text", "Category", "Stage", "Voice")]
    channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    let list: Vec<String> = load_string_list(&ctx.data().pool, &gid, KEY).await;
    let id = channel.id.get().to_string();
    let kept: Vec<String> = list.into_iter().filter(|c| c != &id).collect();
    save_string_list(&ctx.data().pool, &gid, KEY, &kept).await?;
    let code = lang_of(&ctx).await;
    // New key with an exact en-US fallback (YAML owned by the lead:
    // `msg_ignore_channel_removed`).
    ctx.say(
        crate::lang::get(&code, "msg_ignore_channel_removed")
            .unwrap_or_else(|| "Ignore channel removed.".to_string()),
    )
    .await?;
    Ok(())
}

/// Clear a amount of message in the channel !
#[poise::command(slash_command, prefix_command, rename = "clear")]
pub async fn as_ignore_channels_clear(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    save_string_list(&ctx.data().pool, &gid, KEY, &[]).await?;
    let code = lang_of(&ctx).await;
    // New key with an exact en-US fallback (YAML owned by the lead:
    // `msg_ignore_channels_cleared`).
    ctx.say(
        crate::lang::get(&code, "msg_ignore_channels_cleared")
            .unwrap_or_else(|| "Ignore channels cleared.".to_string()),
    )
    .await?;
    Ok(())
}

/// List all sticky channels
#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn as_ignore_channels_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = guild_id_of(&ctx).await;
    let list: Vec<String> = load_string_list(&ctx.data().pool, &gid, KEY).await;
    let code = lang_of(&ctx).await;
    let text = if list.is_empty() {
        crate::lang::get(&code, "setjoinroles_var_none").unwrap_or_else(|| "None".to_string())
    } else {
        list.iter()
            .map(|c| format!("<#{c}>"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    ctx.say(text).await?;
    Ok(())
}
