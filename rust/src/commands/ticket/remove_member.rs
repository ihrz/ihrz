use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove-member",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !remove-member.ts: disable guard, then the is-ticket
    // guard (remove_not_in_ticket), then the deny.
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    let Some(channel) = ctx.guild_channel().await else {
        return Ok(());
    };
    if ticket_guard_in_ticket(&ctx, pool, &gid, &code, channel.id, "remove_not_in_ticket").await {
        return Ok(());
    }
    // TS TicketRemoveMember denies (create with false flags), it does
    // not delete the overwrite.
    channel
        .id
        .create_permission(
            &ctx.http(),
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::empty(),
                deny: serenity::Permissions::VIEW_CHANNEL
                    | serenity::Permissions::SEND_MESSAGES
                    | serenity::Permissions::READ_MESSAGE_HISTORY,
                kind: serenity::PermissionOverwriteType::Member(user.id),
            },
        )
        .await?;
    ctx.say(
        crate::lang::get(&code, "remove_command_work")
            .map(|s| s.replace("${member.tag}", &user.tag()))
            .unwrap_or_else(|| format!("{} removed.", user.tag())),
    )
    .await?;
    // onRemoveMember logs embed + footer file (TicketRemoveMember:1577).
    post_ticket_member_log(
        &ctx.serenity_context().http,
        pool,
        &gid,
        &code,
        channel.id,
        &format!("<@{}>", ctx.author().id.get()),
        &user.to_string(),
        false,
    )
    .await;
    Ok(())
}
