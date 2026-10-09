use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "force-join",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn authrestore_force_join(
    ctx: Ctx<'_>,
    #[description = "Private key of the AuthRestore config"] key: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let entries = load_authrestore_entries(&ctx.data().pool).await;
    let Some((config_guild_id, data)) = find_guild_by_secret(&entries, &key) else {
        reply_missing_key(&ctx, &key).await?;
        return Ok(());
    };
    let config_guild_id = config_guild_id.to_string();
    let data = data.clone();
    let present: HashSet<String> = ctx
        .guild()
        .map(|g| g.members.keys().map(|id| id.get().to_string()).collect())
        .unwrap_or_default();
    let (found, already, possible) = force_join_counts(&data.members, &present);
    let title = t(&ctx, "rc_forceJoin_embed_title", "AuthRestore - Force Join").await;
    let desc = t(&ctx, "rc_forceJoin_embed_desc", "Confirm the force-join.").await;
    let f1 = t(&ctx, "rc_forceJoin_embed_field1", "Members found").await;
    let f2 = t(&ctx, "rc_forceJoin_embed_field2", "Members already here").await;
    let f3 = t(&ctx, "rc_forceJoin_embed_field3", "Possible join").await;
    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::new()
                .title(title)
                .description(desc.clone())
                .color(2829617)
                .field(f1, found.to_string(), true)
                .field(f2, already.to_string(), true)
                .field(f3, possible.to_string(), true),
        ),
    )
    .await?;
    if !crate::commands::prompt_yes_or_no(
        &ctx,
        desc.clone(),
        t(&ctx, "var_confirm", "Confirm").await,
        t(&ctx, "embed_btn_cancel", "Cancel").await,
        true,
    )
    .await?
    {
        return Ok(());
    }
    let Some(url) = gateway_endpoint(crate::funcs::GatewayMethod::ForceJoinAuthRestore) else {
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
    let (_, to_join) = partition_force_join(&data.members, &present);
    let payload = forcejoin_payload(&config_guild_id, &token, &key, &guild_id, &to_join);
    match gateway_post(&url, &payload).await {
        Ok(body) => {
            let msg = body.get("message").and_then(|m| m.as_str()).unwrap_or("");
            match parse_forcejoin_response(msg) {
                Some((_, renewed)) => {
                    ctx.say(t(&ctx, "rc_forceJoin_ws_end", "Force-join completed.").await)
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
                    .replace("${res.secretCode}", &renewed);
                    match ctx
                        .author()
                        .direct_message(
                            ctx.serenity_context(),
                            serenity::CreateMessage::new().content(dm_text),
                        )
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
                                    .content(
                                        t(
                                            &ctx,
                                            "rc_command_dm_failed",
                                            "Could not DM you the code.",
                                        )
                                        .await,
                                    )
                                    .ephemeral(true),
                            )
                            .await?;
                        }
                    }
                    ctx.send(
                        poise::CreateReply::default()
                            .content(
                                t(
                                    &ctx,
                                    "rc_forceJoin_ws_end_renew_msg",
                                    "New private code: ${value2}",
                                )
                                .await
                                .replace("${value2}", &renewed),
                            )
                            .ephemeral(true),
                    )
                    .await?;
                }
                None => {
                    ctx.say(t(&ctx, "rc_forceJoin_ws_end", "Force-join completed.").await)
                        .await?;
                }
            }
        }
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
        }
    }
    Ok(())
}
