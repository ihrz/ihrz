use super::*;
use poise::serenity_prelude as serenity;

/// Change the role given after verify.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "roles",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn authrestore_roles(
    ctx: Ctx<'_>,
    #[description = "Private key of the AuthRestore config"] key: String,
    #[description = "New role given after verify"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let entries = super::authrestore::load_authrestore_entries_routed(&ctx.data().pool).await;
    if find_guild_by_secret(&entries, &key).is_none() {
        reply_missing_key(&ctx, &key).await?;
        return Ok(());
    }
    let Some(url) = gateway_endpoint(crate::funcs::GatewayMethod::ChangeRole) else {
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
    if gateway_post(
        &url,
        &serde_json::json!({
            "guildId": guild_id,
            "apiToken": token,
            "roleId": role.id.get().to_string(),
        }),
    )
    .await
    .is_err()
    {
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
    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::new()
                .title(t(&ctx, "rc_role_embed_title", "AuthRestore New Modification").await)
                .color(2829617)
                .field(
                    t(
                        &ctx,
                        "rc_role_embed_field1_name",
                        "New Given role after verify",
                    )
                    .await,
                    format!("<@&{}>", role.id.get()),
                    true,
                )
                .footer(serenity::CreateEmbedFooter::new("iHorizon")),
        ),
    )
    .await?;
    Ok(())
}
