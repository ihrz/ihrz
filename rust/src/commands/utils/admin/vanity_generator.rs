use super::*;

/// Named `vanity` table handle for the bot-global api.VANITY map.
/// Legacy scope "0" and keys are unchanged (prevnames precedent).
pub const VANITY_TABLE: &str = "vanity";

/// Claim a custom vanity URL for this guild.
// TS decl: `code` required + 24h command cooldown (utils.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "vanity-generator",
    aliases("vanity", "vanity-gen", "customvanity"),
    default_member_permissions = "MANAGE_GUILD",
    user_cooldown = 86400
)]
pub async fn vanity_generator(
    ctx: Ctx<'_>,
    #[description = "Vanity code"] code: String,
) -> Result<(), anyhow::Error> {
    let invalid_tpl = crate::commands::lang_for(
        &ctx,
        "util_vanity_generator_invalid_code",
        "The URL Vanity code `${VanityCode}` is invalid. The string should be alphanumeric and can include hyphens between words. The maximum length is 32 characters. Hyphens cannot be at the beginning or end of the string.",
    )
    .await;
    let claimed = crate::commands::lang_for(
        &ctx,
        "util_vanity_generator_already_claimed",
        "The URL Vanity code is already taken! Choose another one.",
    )
    .await;
    let cmd_err = crate::commands::lang_for(
        &ctx,
        "util_vanity_generator_command_err",
        "An error has occurred while creating the vanity code. Please try again later.",
    )
    .await;
    if !is_valid_vanity_code(&code) {
        ctx.say(vanity_invalid_text(&invalid_tpl, &code)).await?;
        return Ok(());
    }
    let raw = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        VANITY_TABLE,
        crate::commands::owner::main::GLOBAL_SCOPE,
        "api.VANITY",
    )
    .await;
    let table: Option<serde_json::Value> = raw.and_then(|s| serde_json::from_str(&s).ok());
    if vanity_already_claimed(table.as_ref(), &code) {
        ctx.say(claimed).await?;
        return Ok(());
    }
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let invite = match ctx
        .channel_id()
        .create_invite(
            ctx.http(),
            poise::serenity_prelude::CreateInvite::new()
                .max_age(0)
                .temporary(false),
        )
        .await
    {
        Ok(invite) => invite,
        Err(_) => {
            ctx.say(cmd_err).await?;
            return Ok(());
        }
    };
    // Deltas vs TS: no audit-log reason (ChannelId helper has no reason
    // slot); missing gateway/token config replies command_err like the
    // TS throw path's user-visible outcome.
    let (Some(endpoint), Some(token)) = (
        crate::commands::authrestore::main::gateway_endpoint(
            crate::funcs::GatewayMethod::CreateCustomVanity,
        ),
        crate::config::api_token(),
    ) else {
        ctx.say(cmd_err).await?;
        return Ok(());
    };
    let body = serde_json::json!({
        "adminKey": token,
        "guildId": guild_id.get().to_string(),
        "vanityCode": code,
        "inviteCode": invite.code,
    });
    let outcome = reqwest::Client::new()
        .post(endpoint)
        .json(&body)
        .send()
        .await;
    match outcome {
        Ok(resp) if resp.status() == reqwest::StatusCode::OK => {
            let message = resp
                .json::<serde_json::Value>()
                .await
                .ok()
                .and_then(|v| {
                    v.get("message")
                        .and_then(|m| m.as_str())
                        .map(str::to_string)
                })
                .unwrap_or_default();
            ctx.say(message).await?;
            Ok(())
        }
        _ => {
            ctx.say(cmd_err).await?;
            Ok(())
        }
    }
}
