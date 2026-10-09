use super::*;
use poise::serenity_prelude as serenity;

/// True when the winner count is usable. Mirrors the
/// `isNaN(...) || <= 0` guard in !create.ts (failure replies
/// `start_is_not_valid`).
pub fn validate_winners(n: i64) -> bool {
    n > 0
}

/// Truncate the prize to the TS `substring(0, 256)` limit.
pub fn truncate_prize(prize: &str) -> String {
    prize.chars().take(256).collect()
}

/// Requirement-value gate. Mirrors !create.ts:102-134.
/// Returns the failing lang key, or None when valid.
pub fn requirement_error_key(requirement: &str, value: &str) -> Option<&'static str> {
    match requirement {
        "invites" if !crate::funcs_resolve::is_number(value) => {
            Some("start_invalid_invites_req_value")
        }
        "messages" if !crate::funcs_resolve::is_number(value) => {
            Some("start_invalid_messages_req_value")
        }
        "roles" if value.trim().parse::<u64>().is_err() => Some("start_invalid_roles_req_value"),
        _ => None,
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "create",
    aliases("gstart", "gcreate"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_create(
    ctx: Ctx<'_>,
    #[description = "Winners"] winners: i64,
    #[description = "Duration (e.g. 10m, 1h, 7d)"] time: String,
    #[description = "Requirement: none, invites, messages, roles"] requirement: Option<String>,
    #[description = "Prize"] prize: String,
    #[description = "Requirement value"] requirement_value: Option<String>,
    #[description = "Embed image URL (must be an image)"] image: Option<String>,
) -> Result<(), anyhow::Error> {
    let pool_early = &ctx.data().pool;
    let code_early = crate::db::guild_lang(pool_early, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !create.ts:77-85 (bad winner count -> start_is_not_valid).
    if !validate_winners(winners) {
        ctx.say(crate::lang::get(&code_early, "start_is_not_valid").unwrap_or_default())
            .await?;
        return Ok(());
    }
    // Mirrors !create.ts:101-134 (requirement-value gates).
    let requirement = requirement.unwrap_or_else(|| "none".to_string());
    let req_value = requirement_value.unwrap_or_default();
    if let Some(key) = requirement_error_key(&requirement, &req_value) {
        // Roles need a guild-cache check like
        // `interaction.guild.roles.cache.has(value)`; fall back to the
        // numeric check above when the guild is unavailable.
        let mut invalid = true;
        if requirement == "roles" {
            if let Some(guild) = ctx.guild() {
                let rid = req_value
                    .trim()
                    .parse::<u64>()
                    .map(serenity::RoleId::new)
                    .ok();
                invalid = rid.map(|r| !guild.roles.contains_key(&r)).unwrap_or(true);
            }
        }
        if invalid {
            let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
                .await
                .unwrap_or_default();
            ctx.say(
                crate::lang::get(&code_early, key)
                    .unwrap_or_default()
                    .replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    let delta = crate::commands::schedule::main::parse_duration_ms(&time);
    let Some(delta) = delta else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "start_time_not_valid")
                .map(|s| {
                    s.replace(
                        "${interaction.user}",
                        &format!("<@{}>", ctx.author().id.get()),
                    )
                })
                .unwrap_or_else(|| "${interaction.user}, the giveaway duration you specified is invalid, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let now = crate::commands::schedule::main::now_ms();
    let gw = Giveaway {
        guild_id: gid.clone(),
        channel_id: ctx.channel_id().get().to_string(),
        winner_count: winners as u32,
        prize: truncate_prize(&prize),
        hosted_by: ctx.author().id.get().to_string(),
        expire_in_ms: now + delta,
        ended: false,
        entries: vec![],
        winners: vec![],
        requirement,
        requirement_value: req_value,
        embed_image_url: match image {
            Some(url) if crate::funcs::is_image_url(&url).await => Some(url),
            _ => None,
        },
    };
    // Rich board post. Mirrors create() in giveawaysManager.ts.
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (end_r, end_d) = stamp_pair(gw.expire_in_ms);
    let desc = t("event_gw_embed_desc")
        .replace("${end_string}", &end_r)
        .replace("${end_string2}", &end_d)
        .replace("${data.hostedBy}", &gw.hosted_by)
        .replace("${winners_amount}", &gw.winner_count.to_string());
    let (footer_name, footer_icon) =
        giveaway_footer(pool, &ctx.serenity_context().http, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(GW_COLOR))
        .title(gw.prize.clone())
        .description(desc)
        .timestamp(unix_ts(gw.expire_in_ms / 1000));
    embed = giveaway_embed_footer(embed, &footer_name, footer_icon.is_some());
    embed = apply_giveaway_image(embed, gw.embed_image_url.as_deref());
    let mut reply =
        poise::CreateReply::default()
            .embed(embed)
            .components(vec![giveaway_entry_row(&t(
                "event_gw_entries_button_title",
            ))]);
    if let Some(icon) = footer_icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mid = handle.message().await?.id.get();
    super::gw::store_set(&ctx.data().pool, &gid, mid, &serde_json::to_string(&gw)?).await?;
    // Audit log first, then the success confirmation. Mirrors !create.ts
    // (note the TS quirk: the create log uses reroll_logs_embed_title).
    let channel_mention = format!("<#{}>", ctx.channel_id().get());
    let log_title = crate::lang::get(&code, "reroll_logs_embed_title")
        .unwrap_or_else(|| "Giveaways Logs".to_string());
    let log_desc = render_start_log(
        &crate::lang::get(&code, "start_logs_embed_description").unwrap_or_else(|| {
            "<@${interaction.user.id}> started a giveaway in: ${giveawayChannel}".to_string()
        }),
        ctx.author().id.get(),
        &channel_mention,
    );
    post_gw_log(&ctx, &log_title, &log_desc).await;
    ctx.say(render_start_confirmation(
        &crate::lang::get(&code, "start_confirmation_command")
            .unwrap_or_else(|| "Giveaway started in ${giveawayChannel}!".to_string()),
        &channel_mention,
    ))
    .await?;
    Ok(())
}

/// Render the create confirmation (`start_confirmation_command`).
pub fn render_start_confirmation(template: &str, channel_mention: &str) -> String {
    template.replace("${giveawayChannel}", channel_mention)
}

/// Render the create audit-log description
/// (`start_logs_embed_description`).
pub fn render_start_log(template: &str, user_id: u64, channel_mention: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${giveawayChannel}", channel_mention)
}

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors ihorizon_logs.ts (best-effort, silent when
/// missing). Shared by the giveaway create/end/reroll confirmations.
pub async fn post_gw_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(serenity::Colour::new(0xbf0bb9))
        .title(title.to_string())
        .description(description.to_string());
    let _ = ch
        .id
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn start_confirmation_and_log_renders() {
        assert_eq!(
            render_start_confirmation("Giveaway started in ${giveawayChannel}!", "<#7>"),
            "Giveaway started in <#7>!"
        );
        assert_eq!(
            render_start_log(
                "<@${interaction.user.id}> started a giveaway in: ${giveawayChannel}",
                42,
                "<#7>"
            ),
            "<@42> started a giveaway in: <#7>"
        );
    }

    #[test]
    fn winners_guard_mirrors_ts() {
        assert!(!validate_winners(0));
        assert!(!validate_winners(-3));
        assert!(validate_winners(1));
        assert!(validate_winners(20));
    }

    #[test]
    fn prize_truncates_at_256_chars() {
        let long = "p".repeat(300);
        assert_eq!(truncate_prize(&long).chars().count(), 256);
        assert_eq!(truncate_prize("prize"), "prize");
    }

    #[test]
    fn requirement_gates_mirror_ts() {
        assert_eq!(
            requirement_error_key("invites", "abc"),
            Some("start_invalid_invites_req_value")
        );
        assert_eq!(requirement_error_key("invites", "5"), None);
        assert_eq!(
            requirement_error_key("messages", ""),
            Some("start_invalid_messages_req_value")
        );
        assert_eq!(requirement_error_key("messages", "10"), None);
        assert_eq!(
            requirement_error_key("roles", "not-a-role"),
            Some("start_invalid_roles_req_value")
        );
        assert_eq!(requirement_error_key("roles", "123"), None);
        assert_eq!(requirement_error_key("none", ""), None);
    }
}
