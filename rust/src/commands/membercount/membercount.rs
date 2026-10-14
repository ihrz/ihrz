use super::*;
use poise::serenity_prelude as serenity;

/// Membercount action choice. Mirrors the `action` option `choices` in
/// membercount.ts:65-85 (note the lowercase `Power on` / `Power off`
/// labels): slash shows the localized display names, the handler maps
/// each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum MembercountAction {
    #[name = "on"]
    #[name_localized("en-US", "Power on")]
    #[name_localized("en-GB", "Power on")]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    On,
    #[name = "off"]
    #[name_localized("en-US", "Power off")]
    #[name_localized("en-GB", "Power off")]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    Off,
}

impl MembercountAction {
    /// TS `value` parsed by `parse_on_off`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Set a member count channels!
#[poise::command(
    slash_command,
    prefix_command,
    category = "membercount",
    rename = "membercount",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn membercount(
    ctx: Ctx<'_>,
    #[description = "Power on / Power off"] action: MembercountAction,
    #[description = "Voice channel used as counter"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
    #[description = "{MemberCount}, {RolesCount}, {ChannelCount}, {BoostCount}, {BotCount}, {VoiceCount}, {OnlineCount}"]
    name: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(action.as_str()) else {
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
    let mut counts = fetch_channel_counts(ctx.http(), guild_id).await;
    // Voice occupancy has no HTTP surface: snapshot the gateway cache
    // (mirrors the TS `channel.members.size` sums; same
    // `cache.guild().voice_states` pattern as massmove/bringall).
    counts.voice = cached_voice_count(&ctx, guild_id);
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
/// guild/preview approximation; the rest is best-effort HTTP, except
/// voice occupancy which has no HTTP surface in serenity 0.12 and stays
/// 0 here. Callers with gateway access must override `voice` afterwards
/// via [`cached_voice_count`]; the scheduler sweep (HTTP-only) still
/// reports 0 pending cache plumbing outside this module.
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

/// Voice occupancy from raw voice-state channel links: one count per
/// user currently connected (`channel_id.is_some()`). Each connected
/// user appears in exactly one voice/stage channel's `members`, so this
/// equals the TS sum of `channel.members.size` over GuildVoice +
/// GuildStageVoice channels. Pure iterator for unit tests; the cache
/// snapshot lives in [`cached_voice_count`].
pub fn count_voice_occupancy(channels: impl Iterator<Item = Option<serenity::ChannelId>>) -> u64 {
    channels.filter(Option::is_some).count() as u64
}

/// Snapshot the cached voice occupancy for a guild (0 when uncached).
/// Same `cache.guild().voice_states` read as massmove/bringall; the
/// u64 is copied out under the cache guard and released before any
/// await so the command future stays Send.
pub fn cached_voice_count(ctx: &Ctx<'_>, guild_id: serenity::GuildId) -> u64 {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| count_voice_occupancy(g.voice_states.values().map(|v| v.channel_id)))
        .unwrap_or(0)
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
    fn membercount_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = MembercountAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(MembercountAction::On.as_str(), "on");
        assert_eq!(MembercountAction::Off.as_str(), "off");
        assert_eq!(
            MembercountAction::from_name("on"),
            Some(MembercountAction::On)
        );
        assert_eq!(
            MembercountAction::from_name("off"),
            Some(MembercountAction::Off)
        );
        assert_eq!(MembercountAction::from_name("maybe"), None);
        assert_eq!(
            MembercountAction::from_index(0),
            Some(MembercountAction::On)
        );
        assert_eq!(
            MembercountAction::from_index(1),
            Some(MembercountAction::Off)
        );
        let list = MembercountAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            MembercountAction::Off.localized_name("fr"),
            Some("Désactiver")
        );
    }

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

    #[test]
    fn voice_occupancy_counts_connected_states_only() {
        let linked = vec![
            Some(serenity::ChannelId::new(1)),
            None,
            Some(serenity::ChannelId::new(2)),
            None,
        ];
        assert_eq!(count_voice_occupancy(linked.into_iter()), 2);
        let empty: Vec<Option<serenity::ChannelId>> = vec![];
        assert_eq!(count_voice_occupancy(empty.into_iter()), 0);
        let all_linked = vec![Some(serenity::ChannelId::new(7))];
        assert_eq!(count_voice_occupancy(all_linked.into_iter()), 1);
    }
}
