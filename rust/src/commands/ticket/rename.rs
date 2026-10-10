use super::*;
use poise::serenity_prelude as serenity;

/// Rename this ticket channel. Mirrors !rename.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "rename",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_rename(
    ctx: Ctx<'_>,
    // Rest-of-line like TS `longString(args, 0)`: multi-word panel names
    // survive prefix parsing (same `#[rest]` pattern as fun/caracteres).
    #[description = "New name"]
    #[rest]
    name: String,
) -> Result<(), anyhow::Error> {
    // Mirrors !rename.ts guards (disable + delete_not_in_ticket) and
    // the rename error reply.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &code,
        ctx.channel_id(),
        "delete_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    if ctx
        .channel_id()
        .edit(&ctx.http(), serenity::EditChannel::new().name(name.trim()))
        .await
        .is_ok()
    {
        ctx.say(
            crate::lang::get(&code, "ticket_rename_ok")
                .unwrap_or_else(|| "Ticket renamed.".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&code, "ticket_rename_error")
                .unwrap_or_else(|| "Error when renaming the text channel".to_string()),
        )
        .await?;
    }
    Ok(())
}
