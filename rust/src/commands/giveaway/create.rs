use super::*;
use poise::serenity_prelude as serenity;

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
    #[description = "Prize"] prize: String,
    #[description = "Requirement: none, invites, messages, roles"] requirement: Option<String>,
    #[description = "Requirement value"] requirement_value: Option<String>,
    #[description = "Embed image URL (must be an image)"] image: Option<String>,
) -> Result<(), anyhow::Error> {
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
                .unwrap_or_else(|| "Bad duration.".to_string()),
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
        winner_count: winners.clamp(1, 20) as u32,
        prize: prize.clone(),
        hosted_by: ctx.author().id.get().to_string(),
        expire_in_ms: now + delta,
        ended: false,
        entries: vec![],
        winners: vec![],
        requirement: requirement.unwrap_or_else(|| "none".to_string()),
        requirement_value: requirement_value.unwrap_or_default(),
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
    Ok(())
}
