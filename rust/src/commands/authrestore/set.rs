use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "set",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn authrestore_set(
    ctx: Ctx<'_>,
    #[description = "Channel holding the message"] channel: serenity::Channel,
    #[description = "Message id to attach the button to"] message_id: String,
    #[description = "Role given after verify"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let Some(role) = role else {
        ctx.say(t(&ctx, "buttonreaction_roles_not_found", "Role not found.").await)
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
                    "Could not fetch that message.",
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
                "Could not fetch that message.",
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
                    "Could not fetch that message.",
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
                "That message was not sent by the bot.",
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
        Ok(body) => body
            .get("secretCode")
            .and_then(|s| s.as_str())
            .unwrap_or_default()
            .to_string(),
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
    let base = crate::config::gateway_base().unwrap_or_default();
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
                "Could not fetch that message.",
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
    crate::db::kv_set(
        &ctx.data().pool,
        &guild_id,
        "GUILD.RESTORECORD",
        &serde_json::to_string(&record).unwrap_or_default(),
    )
    .await?;
    let channel_str = channel_id.get().to_string();
    let msg_link = format!("https://discord.com/channels/{guild_id}/{channel_str}/{message_id}");
    ctx.send(
        poise::CreateReply::default()
            .content(
                t(
                    &ctx,
                    "rc_command_ok",
                    "AuthRestore configured. Code: ${res.secretCode} at ${msgLink}",
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
        "AuthRestore code: ${res.secretCode}",
    )
    .await
    .replace("${interaction.guild.name}", &guild_name)
    .replace("${res.secretCode}", &secret);
    match ctx
        .author()
        .direct_message(http, serenity::CreateMessage::new().content(dm_text))
        .await
    {
        Ok(_) => {
            ctx.send(
                poise::CreateReply::default()
                    .content(t(&ctx, "rc_command_dm_ok", "Code sent in DM.").await)
                    .ephemeral(true),
            )
            .await?;
        }
        Err(_) => {
            ctx.send(
                poise::CreateReply::default()
                    .content(t(&ctx, "rc_command_dm_failed", "Could not DM you the code.").await)
                    .ephemeral(true),
            )
            .await?;
        }
    }
    Ok(())
}
