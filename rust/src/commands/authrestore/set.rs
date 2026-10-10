use super::*;
use poise::serenity_prelude as serenity;

/// Set someting/behaviours into this guild!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn authrestore_set(
    ctx: Ctx<'_>,
    #[description = "Channel holding the message"]
    #[channel_types("Text")]
    channel: serenity::Channel,
    #[description = "Message id to attach the button to"] message_id: String,
    #[description = "Role given after verify"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let Some(role) = role else {
        ctx.say(
            t(
                &ctx,
                "buttonreaction_roles_not_found",
                "Missing arguments: You haven't specified the roles to set!",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    let http = ctx.serenity_context();
    let mid: u64 = match message_id.trim().parse() {
        Ok(n) => n,
        Err(e) => {
            ctx.say(format!(
                "{}\n{e}",
                t(
                    &ctx,
                    "reactionroles_cant_fetched_reaction_remove",
                    "Can't fetch targeted reaction on this message!",
                )
                .await
            ))
            .await?;
            return Ok(());
        }
    };
    let channel_id = channel.id();
    if channel.guild().map(|c| c.guild_id.get()) != ctx.guild_id().map(|g| g.get()) {
        ctx.say(
            t(
                &ctx,
                "reactionroles_cant_fetched_reaction_remove",
                "Can't fetch targeted reaction on this message!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let bot_id = http.cache.current_user().id;
    let stored_msg = match channel_id.message(http, mid).await {
        Ok(m) => m,
        Err(e) => {
            ctx.say(format!(
                "{}\n{e}",
                t(
                    &ctx,
                    "reactionroles_cant_fetched_reaction_remove",
                    "Can't fetch targeted reaction on this message!",
                )
                .await
            ))
            .await?;
            return Ok(());
        }
    };
    if stored_msg.author.id != bot_id {
        ctx.say(
            t(
                &ctx,
                "buttonreaction_message_other_user_error",
                "I can't modify the components of another user's message. You need to choose a message sent by myself. Tip: Do `/utils embed` to create your own beautiful embed!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let Some(url) = gateway_endpoint(crate::funcs::GatewayMethod::CreateAuthRestoreGuild) else {
        ctx.say(
            t(
                &ctx,
                "rc_command_horizongw_down",
                "Error: HorizonGateway maybe down",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    let token = crate::config::api_token().unwrap_or_default();
    let author_json = serde_json::to_value(ctx.author()).unwrap_or(
        serde_json::json!({"id": ctx.author().id.get().to_string(), "username": ctx.author().name}),
    );
    let payload = create_payload(&guild_id, &token, &role.id.get().to_string(), author_json);
    let secret = match gateway_post(&url, &payload).await {
        Ok(body) => secret_from_response(&body),
        Err(_) => {
            ctx.say(
                t(
                    &ctx,
                    "rc_command_horizongw_down",
                    "Error: HorizonGateway maybe down",
                )
                .await,
            )
            .await?;
            return Ok(());
        }
    };
    // Public base for the OAuth link (HorizonGateway, not Internal).
    let base = ctx.data().config.gateway_public().unwrap_or_default();
    let link = verify_link(&bot_id.get().to_string(), &base, &guild_id);
    if let Err(e) = channel_id
        .edit_message(
            http,
            mid,
            serenity::EditMessage::new().components(vec![serenity::CreateActionRow::Buttons(
                vec![serenity::CreateButton::new_link(link)
                    .label(t(&ctx, "rc_verify", "Verify").await)],
            )]),
        )
        .await
    {
        ctx.say(format!(
            "{}\n{e}",
            t(
                &ctx,
                "reactionroles_cant_fetched_reaction_remove",
                "Can't fetch targeted reaction on this message!",
            )
            .await
        ))
        .await?;
        return Ok(());
    }
    let record = RestoreRecord {
        channel_id: channel_id.get().to_string(),
        message_id: message_id.clone(),
    };
    super::authrestore::restore_record_set(&ctx.data().pool, &guild_id, &record).await?;
    let channel_str = channel_id.get().to_string();
    let msg_link = format!("https://discord.com/channels/{guild_id}/{channel_str}/{message_id}");
    ctx.send(
        poise::CreateReply::default()
            .content(
                t(
                    &ctx,
                    "rc_command_ok",
                    "${interaction.user.toString()}, you have just set up the \"AuthRestore\" module. Now, when a member of the Discord server clicks on the button and logs in via OAuth2, they will be added to the database. They will eventually be able to automatically join the server with OAuth2.\n# READ CAREFULLY\nThe message ${msgLink} now has a button that will serve as a verification.\nHERE IS THE PRIVATE CODE THAT MUST NOT BE DISCLOSED TO ANYONE. A PERSON WITH THIS CODE COULD DELETE IT, ADD MEMBERS TO THEIR SERVER... KEEP IT SOMEWHERE SAFE. iHorizon WILL NEVER GIVE IT TO YOU AGAIN:\n```${res.secretCode}```",
                )
                .await
                .replace("${interaction.user.toString()}", &ctx.author().to_string())
                .replace("${res.secretCode}", &secret)
                .replace("${msgLink}", &msg_link),
            )
            .ephemeral(true),
    )
    .await?;
    let guild_name = ctx
        .guild()
        .map(|g| g.name.clone())
        .unwrap_or_else(|| guild_id.clone());
    let dm_text = t(
        &ctx,
        "rc_command_ok_dm",
        "# The AuthRestore code for ${interaction.guild.name}\n```${res.secretCode}```",
    )
    .await
    .replace("${interaction.guild.name}", &guild_name)
    .replace("${res.secretCode}", &secret);
    // TS !set.ts chains `.catch(dm_failed).then(dm_ok)`: the dm_ok
    // follow-up is sent in both legs, with dm_failed first when the
    // DM itself bounces.
    if ctx
        .author()
        .direct_message(http, serenity::CreateMessage::new().content(dm_text))
        .await
        .is_err()
    {
        ctx.send(
            poise::CreateReply::default()
                .content(t(&ctx, "rc_command_dm_failed", "I tried to send you the code in a private message, but you have blocked your DMs :/").await)
                .ephemeral(true),
        )
        .await?;
    }
    ctx.send(
        poise::CreateReply::default()
            .content(
                t(
                    &ctx,
                    "rc_command_dm_ok",
                    "In case you missed it, I sent you the code in a private message!",
                )
                .await,
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}
