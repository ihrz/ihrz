use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    category = "membercount",
    rename = "membercount",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn membercount(
    ctx: Ctx<'_>,
    #[description = "Power on / Power off"] action: String,
    #[description = "Voice channel used as counter"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
    #[description = "{MemberCount}, {RolesCount}, {ChannelCount}, {BoostCount}, {BotCount}, {VoiceCount}, {OnlineCount}"]
    name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(&action) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;

    if !enabled {
        delete_all_mcount(pool, &gid).await?;
        post_mcount_log(&ctx, true, 0, "").await;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        ctx.say(
            crate::lang::get(&code, "setmembercount_command_work_on_disable")
                .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
                .unwrap_or_else(|| {
                    "${client.iHorizon_Emojis.Yes} | Successfully removed MemberCount.".to_string()
                }),
        )
        .await?;
        return Ok(());
    }

    let Some(template) = name.filter(|n| !n.trim().is_empty()) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };
    let Some(slot) = mcount_slot(&template) else {
        send_mcount_help(&ctx).await?;
        return Ok(());
    };

    let value = serde_json::json!({
        "name": template,
        "enable": true,
        "channel": channel.id.get().to_string(),
    })
    .to_string();
    save_mcount(pool, &gid, slot, &value).await?;

    // Immediate rename, mirroring membercount.ts `channel.edit({ name })`
    // on enable (the 5-min sweep keeps it fresh afterwards).
    let counts = fetch_channel_counts(ctx.http(), guild_id).await;
    let rendered = render_name(&template, &counts);
    let _ = channel
        .id
        .edit(ctx.http(), serenity::EditChannel::new().name(&rendered))
        .await;

    post_mcount_log(&ctx, false, channel.id.get(), &template).await;

    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "setmembercount_command_work_on_enable")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| format!("Counter set: {template}")),
    )
    .await?;
    Ok(())
}

/// Live counter values for one guild. The member total prefers the exact
/// count from a completed bounded member walk, falling back to the
/// guild/preview approximation; the rest is best-effort HTTP (voice
/// occupancy has no HTTP surface in serenity 0.12 and stays 0).
/// Shared by the enable-path immediate rename and the scheduler sweep.
pub async fn fetch_channel_counts(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
) -> MemberCounts {
    let mut out = MemberCounts::default();
    let mut presence = 0u64;
    let mut have_preview = false;
    match http.get_guild(guild_id).await {
        Ok(g) => {
            out.member = g.approximate_member_count.unwrap_or(0);
            presence = g.approximate_presence_count.unwrap_or(0);
            out.roles = g.roles.len() as u64;
            out.boost = g.premium_subscription_count.unwrap_or(0);
        }
        Err(_) => {
            if let Ok(p) = http.get_guild_preview(guild_id).await {
                out.member = p.approximate_member_count;
                presence = p.approximate_presence_count;
                have_preview = true;
            }
        }
    }
    if let Ok(channels) = http.get_channels(guild_id).await {
        out.channel = channels.len() as u64;
    }
    // Bots need member rows: walk pages while the guild fits in a
    // bounded fetch (<= 10k members). A completed walk upgrades the
    // member total to the exact count and yields the exact bot count.
    if out.member > 0 && out.member <= 10_000 {
        let mut after: Option<u64> = None;
        let mut bots = 0u64;
        let mut seen = 0u64;
        loop {
            match http.get_guild_members(guild_id, Some(1000), after).await {
                Ok(page) if page.is_empty() => break,
                Ok(page) => {
                    for m in &page {
                        if m.user.bot {
                            bots += 1;
                        }
                    }
                    seen += page.len() as u64;
                    after = page.last().map(|m| m.user.id.get());
                    if page.len() < 1000 || seen >= out.member {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        if seen >= out.member && seen > 0 {
            out.member = seen;
            out.bot = bots;
        }
    }
    if presence == 0 && !have_preview {
        if let Ok(p) = http.get_guild_preview(guild_id).await {
            presence = p.approximate_presence_count;
        }
    }
    // Presence ≈ online/idle/dnd, mirroring the TS onlineCount filter.
    out.online = presence;
    out
}

/// Audit entry for enable/disable. Mirrors `client.func.ihorizon_logs`
/// in membercount.ts (best-effort, silent when `ihorizon-logs` is
/// missing). No new YAML: exact lang keys with a plain fallback.
pub async fn post_mcount_log(ctx: &Ctx<'_>, disabled: bool, channel_id: u64, template: &str) {
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let author = ctx.author().id.get().to_string();
    let (title, desc) = if disabled {
        (
            crate::lang::get(&code, "setmembercount_logs_embed_title_on_disable")
                .unwrap_or_else(|| "Set MemberCount Logs".to_string()),
            render_mcount_log_desc(
                &crate::lang::get(&code, "setmembercount_logs_embed_description_on_disable")
                    .unwrap_or_else(|| {
                        "<@${interaction.user.id}> removed the MemberCount of this guild!"
                            .to_string()
                    }),
                &author,
                "",
                "",
            ),
        )
    } else {
        (
            crate::lang::get(&code, "setmembercount_logs_embed_title_on_enable")
                .unwrap_or_else(|| "Set MemberCount Logs".to_string()),
            render_mcount_log_desc(
                &crate::lang::get(&code, "setmembercount_logs_embed_description_on_enable")
                    .unwrap_or_else(|| "<@${interaction.user.id}> set the MemberCount of <#${channel.id}> to `${messagei}`!".to_string()),
                &author,
                &channel_id.to_string(),
                template,
            ),
        )
    };
    let embed = serenity::CreateEmbed::default()
        .colour(0xbf_0b_b9)
        .title(title)
        .description(desc);
    let _ = ch
        .id
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Fill the `${interaction.user.id}` / `${channel.id}` / `${messagei}`
/// tokens of the membercount log descriptions.
pub fn render_mcount_log_desc(
    template: &str,
    author_id: &str,
    channel_id: &str,
    name: &str,
) -> String {
    template
        .replace("${interaction.user.id}", author_id)
        .replace("${channel.id}", channel_id)
        .replace("${messagei}", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_desc_fills_ts_tokens() {
        let out = render_mcount_log_desc(
            "<@${interaction.user.id}> set the MemberCount of <#${channel.id}> to `${messagei}`!",
            "11",
            "22",
            "Members: {MemberCount}",
        );
        assert_eq!(
            out,
            "<@11> set the MemberCount of <#22> to `Members: {MemberCount}`!"
        );
        let out = render_mcount_log_desc(
            "<@${interaction.user.id}> removed the MemberCount of this guild!",
            "11",
            "",
            "",
        );
        assert_eq!(out, "<@11> removed the MemberCount of this guild!");
    }
}
