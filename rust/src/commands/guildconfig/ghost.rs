use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ghost-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_ghost_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut list = load_ghost(&ctx.data().pool, &gid).await;
    let id = channel.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            ghost_key(),
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "joinghostping_add_sent_to_channel")
            .unwrap_or_else(|| "Ghost-ping watch added.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ghost-remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_ghost_remove(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut list = load_ghost(&ctx.data().pool, &gid).await;
    let id = channel.id.get().to_string();
    list.retain(|c| c != &id);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        ghost_key(),
        &serde_json::to_string(&list)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "joinghostping_remove_ok_embed_desc")
            .unwrap_or_else(|| "Ghost-ping watch removed.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ghost-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_ghost_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let list = load_ghost(&ctx.data().pool, &gid).await;
    ctx.say(if list.is_empty() {
        "No ghost-ping watches.".to_string()
    } else {
        list.join(", ")
    })
    .await?;
    Ok(())
}
