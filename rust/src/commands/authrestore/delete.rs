use super::*;
use poise::serenity_prelude as serenity;

/// Delete a role for a certain amount of money!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "delete",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn authrestore_delete(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let stored = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        super::authrestore::AUTHRESTORE_TABLE,
        &guild_id,
        super::authrestore::RESTORE_RECORD_KEY,
    )
    .await;
    let Some(raw) = stored else {
        ctx.say(
            t(
                &ctx,
                "rc_delete_config_not_found",
                "The module configuration on this server could not be found!",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    let record: RestoreRecord = match serde_json::from_str(&raw) {
        Ok(r) => r,
        // Corrupt row: keep it (TS has no such case) and report the
        // fetch error path instead of the not-found text.
        Err(e) => {
            ctx.say(format!(
                "{}\n{e}",
                t(
                    &ctx,
                    "reactionroles_cant_fetched_reaction_remove",
                    "Could not fetch that message.",
                )
                .await
            ))
            .await?;
            return Ok(());
        }
    };
    let http = ctx.serenity_context();
    let (cid, mid): (u64, u64) = match (record.channel_id.parse(), record.message_id.trim().parse())
    {
        (Ok(c), Ok(m)) => (c, m),
        _ => {
            ctx.say(
                t(
                    &ctx,
                    "reactionroles_cant_fetched_reaction_remove",
                    "Could not fetch that message.",
                )
                .await,
            )
            .await?;
            return Ok(());
        }
    };
    let channel_id = serenity::ChannelId::new(cid);
    let stored_msg = match channel_id.message(http, mid).await {
        Ok(m) => m,
        Err(e) => {
            ctx.say(format!(
                "{}\n{e}",
                t(
                    &ctx,
                    "reactionroles_cant_fetched_reaction_remove",
                    "Could not fetch that message.",
                )
                .await
            ))
            .await?;
            return Ok(());
        }
    };
    if stored_msg.author.id != http.cache.current_user().id {
        ctx.say(
            t(
                &ctx,
                "buttonreaction_message_other_user_error",
                "That message was not sent by the bot.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    if let Err(e) = channel_id
        .edit_message(http, mid, serenity::EditMessage::new().components(vec![]))
        .await
    {
        ctx.say(format!(
            "{}\n{e}",
            t(
                &ctx,
                "reactionroles_cant_fetched_reaction_remove",
                "Could not fetch that message.",
            )
            .await
        ))
        .await?;
        return Ok(());
    }
    super::authrestore::restore_record_del(&ctx.data().pool, &guild_id).await?;
    ctx.send(
        poise::CreateReply::default()
            .content(
                t(
                    &ctx,
                    "rc_delete_command_ok",
                    "AuthRestore configuration deleted.",
                )
                .await
                .replace("${interaction.user.toString()}", &ctx.author().to_string()),
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}
