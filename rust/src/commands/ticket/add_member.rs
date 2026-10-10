use super::*;
use poise::serenity_prelude as serenity;

/// Render the add confirmation: TS fills every `${member.tag}`
/// slot with the member username.
pub fn render_add_work(template: &str, username: &str) -> String {
    template.replace("${member.tag}", username)
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "add-member",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_add(
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
    // correct while !add-member.ts index 1 is off-by-one (reads past the
    // mention). Poise parses the first prefix arg as User here, matching
    // the correct shape, so both add and remove stay index-free.
    // Mirrors !add-member.ts: disable guard, then the is-ticket
    // guard (close_not_in_ticket), then the grant.
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    // Unresolvable prefix input parses to None (TS method.user null ->
    // throw): answer add_command_error instead of granting nothing.
    let Some(user) = user else {
        ctx.say(
            crate::lang::get(&code, "add_command_error")
                .unwrap_or_else(|| "An error occurred, please try again".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(channel) = ctx.guild_channel().await else {
        return Ok(());
    };
    if ticket_guard_in_ticket(&ctx, pool, &gid, &code, channel.id, "close_not_in_ticket").await {
        return Ok(());
    }
    channel
        .id
        .create_permission(
            &ctx.http(),
            serenity::PermissionOverwrite {
                // TS TicketAddMember grant: View + Send + History.
                allow: serenity::Permissions::VIEW_CHANNEL
                    | serenity::Permissions::SEND_MESSAGES
                    | serenity::Permissions::READ_MESSAGE_HISTORY,
                deny: serenity::Permissions::empty(),
                kind: serenity::PermissionOverwriteType::Member(user.id),
            },
        )
        .await?;
    ctx.say(
        crate::lang::get(&code, "add_command_work")
            .map(|s| render_add_work(&s, &user.name))
            .unwrap_or_else(|| format!("{} added.", user.name)),
    )
    .await?;
    // onAddMember logs embed + footer file (TicketAddMember:1659).
    post_ticket_member_log(
        &ctx.serenity_context().http,
        pool,
        &gid,
        &code,
        channel.id,
        &format!("<@{}>", ctx.author().id.get()),
        &user.to_string(),
        true,
    )
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_work_fills_every_slot_with_username() {
        assert_eq!(
            render_add_work("${member.tag} + ${member.tag}", "kisakay"),
            "kisakay + kisakay"
        );
    }
}
