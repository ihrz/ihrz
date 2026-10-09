use super::*;

/// Media-only channel toggle. Mirrors !media-only.ts (flattened to a toggle).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "media-only",
    aliases("piconly", "mediaonly"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn media_only(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.picOnly").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = channel.id.get().to_string();
    let msg = if let Some(pos) = list.iter().position(|c| c == &id) {
        list.remove(pos);
        "Media-only off."
    } else {
        list.push(id);
        "Media-only on."
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.picOnly",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say(msg).await?;
    Ok(())
}
