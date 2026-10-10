use super::*;
use poise::serenity_prelude as serenity;

/// Render the remove confirmation: TS fills the `${member.tag}`
/// slot with the member username (not the `name#discriminator` tag).
pub fn render_remove_work(template: &str, username: &str) -> String {
    template.replace("${member.tag}", username)
}

/// Remove a member from your ticket!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove-member",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    // Verdict (messageCommandHandler.ts:79-81 strips the subcommand name,
    // so prefix args[0] is the user): TS !remove-member.ts index 0 is
    // correct (!add-member.ts index 1 is off-by-one). Poise parses the
    // first prefix arg as User here, matching that shape, so both add
    // and remove stay index-free.
    // Order mirrors !remove-member.ts (resolve-then-guard): poise
    // parses the first prefix arg as User here, matching the TS
    // `method.user(args, 0)` shape. `user` stays Option so the prefix
    // path can answer remove_command_error on unresolvable input
    // instead of throwing like TS (`method.user(...)!`).
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    // Unresolvable prefix input parses to None (TS method.user null ->
    // throw): answer remove_command_error instead of denying nothing.
    let Some(user) = user else {
        ctx.say(
            crate::lang::get(&code, "remove_command_error")
                .unwrap_or_else(|| "An error occurred, please try again".to_string()),
        )
        .await?;
        return Ok(());
    };
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
            .map(|s| render_remove_work(&s, &user.name))
            .unwrap_or_else(|| format!("{} removed.", user.name)),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn remove_work_uses_username() {
        assert_eq!(
            render_remove_work("Bye ${member.tag}!", "kisakay"),
            "Bye kisakay!"
        );
        assert_eq!(render_remove_work("no slot", "kisakay"), "no slot");
    }
}
