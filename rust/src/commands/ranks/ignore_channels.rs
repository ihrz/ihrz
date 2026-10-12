use super::*;
use poise::serenity_prelude as serenity;

/// Table-first ignore-list load with legacy key fallback
/// (`GUILD.XP_LEVELING.bypassChannels`, legacy `GUILD.RANKS.ignoreChannels`).
/// A legacy hit promotes into the new key so rows migrate lazily; pair
/// with `save_ignore_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_ignore_routed(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    super::migrated_get(
        pool,
        guild_id,
        super::GUILD_BYPASS_NEW,
        &[super::GUILD_BYPASS_OLD],
    )
    .await
    .and_then(|s| serde_json::from_str(&s).ok())
    .unwrap_or_default()
}

/// Ignore-list store on the new key with legacy dual-write (keys migrated).
pub async fn save_ignore_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    list: &[String],
) -> anyhow::Result<()> {
    super::migrated_set(
        pool,
        guild_id,
        super::GUILD_BYPASS_NEW,
        &[super::GUILD_BYPASS_OLD],
        &serde_json::to_string(list)?,
    )
    .await
}

/// Parse one channel token: a `<#id>` mention or a raw channel id.
/// Returns the id on success.
pub fn parse_ignore_channel_token(token: &str) -> Option<String> {
    let t = token.trim().trim_start_matches("<#").trim_end_matches('>');
    let t = t.trim();
    if t.is_empty() || !t.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let id: u64 = t.parse().ok()?;
    if id == 0 {
        return None;
    }
    Some(id.to_string())
}

/// Split a comma-separated channel list (`<#id>`, raw ids, commas
/// and/or whitespace separated) into channel ids, deduplicated in
/// first-seen order. Mirrors the TS multi channel-select panel
/// (`!ignore-channels.ts`, `setMaxValues(25)`).
pub fn parse_ignore_channel_list(raw: &str) -> Vec<String> {
    let mut out = Vec::new();
    for token in raw.split([',', ' ', '\t', '\n']) {
        if let Some(id) = parse_ignore_channel_token(token) {
            if !out.contains(&id) {
                out.push(id);
            }
        }
    }
    out
}

/// Ignore-channels panel (`ignore-channels`).
// TS `ranks.ts:333-348` + `!ignore-channels.ts`: Administrator-gated
// interactive panel over the channels the Ranks module skips. Embed
// (title, desc, registered-channel field) + channel select (min 0,
// max 25, current list pre-selected) + save button, wired through a
// 240s in-command collector loop with the invoker-only
// `help_not_for_you` guard. The select leg live-updates the embed;
// the save leg persists via `save_ignore_routed` (dual-write, so
// kv-only readers stay fresh). A single deadline loop covers both TS
// collectors (`componentType` ChannelSelect / Button, each
// `time: 240_000`), following the media-only collector precedent.
// One deliberate deviation: TS seeds `allchannel = []`, so saving
// without touching the select clears the list; here the pending
// selection starts from the stored list, so an untouched save is a
// no-op instead of a wipe.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-channels",
    aliases("ignore", "ranks-ignore-channels"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Ignorer des salons afin que le module de Rangs ne l'ai prennent pas en compte"
    ),
    description_localized("ja", "ランクモジュールでこのチャンネルを無視"),
    description_localized("ru", "Игнорировать эти каналы в модуле рангов"),
    description_localized("es-ES", "Ignorar estos canales en el módulo de Rangos")
)]
pub async fn ranks_ignore_channels(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = ctx.data().pool.clone();
    let list = load_ignore_routed(&pool, &gid).await;
    let code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    // Outside a guild there is no collector target and no config
    // scope: keep the stateless read-only reply.
    if ctx.guild_id().is_none() {
        ctx.say(if list.is_empty() {
            t("msg_ignore_channels_empty", "No ignored channels.")
        } else {
            t("msg_ignore_channels_list", "Ignored channels: ${channels}.")
                .replace("${channels}", &ignore_field_mentions(&list))
        })
        .await?;
        return Ok(());
    }
    let mut pending = list;
    let icon = ctx
        .guild_id()
        .and_then(|g| ctx.cache().guild(g))
        .and_then(|g| g.icon_url());
    let not_for_you = t("help_not_for_you", "This interaction is not for you");
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(render_ignore_embed(&t, &pending, icon.clone()))
                .components(ignore_panel_rows(&t, &pending, false)),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    // Combined 240s collector. Mirrors the two TS collectors
    // (`componentType` ChannelSelect / Button, each `time: 240_000`
    // with the invoker-only filter).
    let deadline =
        tokio::time::Instant::now() + std::time::Duration::from_secs(IGNORE_PANEL_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let id = press.data.custom_id.clone();
        if id == IGNORE_SELECT_ID {
            let next: Vec<String> = match &press.data.kind {
                serenity::ComponentInteractionDataKind::ChannelSelect { values } => {
                    values.iter().map(|c| c.get().to_string()).collect()
                }
                _ => continue,
            };
            // Ack-first (TS deferUpdate), then re-render the embed
            // with the new selection.
            if press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await
                .is_err()
            {
                continue;
            }
            pending = next;
            let _ = msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new().embeds(vec![render_ignore_embed(
                        &t,
                        &pending,
                        icon.clone(),
                    )]),
                )
                .await;
        } else if id == IGNORE_SAVE_ID {
            // Mirrors the save leg: persist the pending selection,
            // stop the collector.
            if press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await
                .is_err()
            {
                continue;
            }
            let _ = save_ignore_routed(&pool, &gid, &pending).await;
            break;
        }
    }
    // Collector `end` leg: strip the components like TS
    // (`originalResponse.edit({ components: [] })`).
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

/// Panel collector lifetime in seconds. Mirrors `time: 240_000` on
/// both collectors in !ignore-channels.ts.
pub const IGNORE_PANEL_TIMEOUT_SECS: u64 = 240;

/// Custom ids, byte-exact from !ignore-channels.ts.
pub const IGNORE_SELECT_ID: &str = "ranks-select-config";
pub const IGNORE_SAVE_ID: &str = "ranks-manage-save-config";

/// Mention list for the panel field. Mirrors the TS field value
/// (`all_channels.map((x) => `<#${x}>`).join(", ")`).
pub fn ignore_field_mentions(channels: &[String]) -> String {
    channels
        .iter()
        .map(|id| format!("<#{id}>"))
        .collect::<Vec<_>>()
        .join(", ")
}

/// Field value with the empty fallback. Mirrors the TS ternary
/// (`length > 0 ? mentions : lang.setjoinroles_var_none`).
pub fn ignore_field_value(channels: &[String], none_label: &str) -> String {
    if channels.is_empty() {
        none_label.to_string()
    } else {
        ignore_field_mentions(channels)
    }
}

/// Keep the ids Discord can pre-select. Mirrors the TS
/// `setDefaultChannels(channels)` call: unparsable entries are
/// dropped, never sent.
pub fn parse_panel_channel_ids(ids: &[String]) -> Vec<serenity::ChannelId> {
    ids.iter()
        .filter_map(|s| {
            s.trim()
                .parse::<u64>()
                .ok()
                .filter(|n| *n != 0)
                .map(serenity::ChannelId::new)
        })
        .collect()
}

/// Render the panel embed. Mirrors the TS embed: title, description,
/// guild thumbnail, and the registered-channels field (or
/// `setjoinroles_var_none` when empty).
fn render_ignore_embed(
    t: &impl Fn(&str, &str) -> String,
    pending: &[String],
    icon: Option<String>,
) -> serenity::CreateEmbed {
    let mut embed = serenity::CreateEmbed::default()
        .title(t(
            "ranks_ignorechannels_embed_title",
            "Ranks Module Configurations",
        ))
        .description(t(
            "ranks_ignorechannels_embed_desc",
            "When new messages are sent in one of these channels, the Ranks Module ignores them.",
        ))
        .color(0x6666FF)
        .field(
            t(
                "joinghostping_add_ok_embed_fields_name",
                "All registered channels",
            ),
            ignore_field_value(pending, &t("setjoinroles_var_none", "None")),
            false,
        );
    if let Some(url) = icon {
        embed = embed.thumbnail(url);
    }
    embed
}

/// Build the two panel rows. Mirrors the TS components: the channel
/// select (Text/Forum/Media, min 0, max 25, current list
/// pre-selected) and the save button.
fn ignore_panel_rows(
    t: &impl Fn(&str, &str) -> String,
    pending: &[String],
    disabled: bool,
) -> Vec<serenity::CreateActionRow> {
    let defaults = parse_panel_channel_ids(pending);
    let menu = serenity::CreateSelectMenu::new(
        IGNORE_SELECT_ID,
        serenity::CreateSelectMenuKind::Channel {
            // TS `setChannelTypes([GuildText, GuildForum, GuildMedia])`.
            // serenity 0.12 has no Media variant, so GuildMedia (16)
            // rides as `Unknown(16)` — wire-identical on serialize.
            channel_types: Some(vec![
                serenity::ChannelType::Text,
                serenity::ChannelType::Forum,
                serenity::ChannelType::Unknown(16),
            ]),
            default_channels: if defaults.is_empty() {
                None
            } else {
                Some(defaults)
            },
        },
    )
    .placeholder(t("help_select_menu", "Make a selection!"))
    .min_values(0)
    .max_values(25)
    .disabled(disabled);
    let save = serenity::CreateButton::new(IGNORE_SAVE_ID)
        .style(serenity::ButtonStyle::Success)
        .label(t("antispam_manage_button_label", "Save config"))
        .disabled(disabled);
    vec![
        serenity::CreateActionRow::SelectMenu(menu),
        serenity::CreateActionRow::Buttons(vec![save]),
    ]
}

#[cfg(test)]
mod tests {
    use super::{
        ignore_field_mentions, ignore_field_value, load_ignore_routed, parse_ignore_channel_list,
        parse_panel_channel_ids, save_ignore_routed, IGNORE_PANEL_TIMEOUT_SECS, IGNORE_SAVE_ID,
        IGNORE_SELECT_ID,
    };

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn toggle_adds_then_removes_channel() {
        // `toggle_ignore` (super) backs the TS multi channel-select
        // panel (`!ignore-channels.ts:78-87`): unknown ids append
        // (added=true), known ids drop (added=false).
        let (next, added) = super::toggle_ignore(Vec::new(), "123");
        assert!(added);
        assert_eq!(next, vec!["123".to_string()]);
        let (next, added) = super::toggle_ignore(next, "123");
        assert!(!added);
        assert!(next.is_empty());
    }

    #[test]
    fn comma_separated_channel_list_parses_mentions_and_ids() {
        assert_eq!(
            parse_ignore_channel_list("<#123>,456"),
            vec!["123".to_string(), "456".to_string()]
        );
        assert_eq!(
            parse_ignore_channel_list("  <#7> , 8 ,bogus, ,0"),
            vec!["7".to_string(), "8".to_string()]
        );
        // Duplicates collapse, first-seen order kept.
        assert_eq!(parse_ignore_channel_list("9,9,<#9>"), vec!["9".to_string()]);
        assert!(parse_ignore_channel_list("").is_empty());
        assert!(parse_ignore_channel_list("abc").is_empty());
    }

    #[tokio::test]
    async fn legacy_key_reads_and_promotes_to_new_key() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.ignoreChannels", r#"["7"]"#)
            .await
            .unwrap();
        assert_eq!(load_ignore_routed(&pool, "g").await, vec!["7".to_string()]);
        assert!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.bypassChannels")
                .await
                .is_some()
        );
        assert!(load_ignore_routed(&pool, "g9").await.is_empty());
    }

    #[tokio::test]
    async fn new_key_wins_over_legacy_on_conflict() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.ignoreChannels", r#"["7"]"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.bypassChannels", r#"["8"]"#)
            .await
            .unwrap();
        assert_eq!(load_ignore_routed(&pool, "g").await, vec!["8".to_string()]);
    }

    #[test]
    fn panel_ids_and_timeout_match_ts() {
        // Custom ids byte-exact from !ignore-channels.ts; timeout
        // mirrors `time: 240_000` on both collectors.
        assert_eq!(IGNORE_SELECT_ID, "ranks-select-config");
        assert_eq!(IGNORE_SAVE_ID, "ranks-manage-save-config");
        assert_eq!(IGNORE_PANEL_TIMEOUT_SECS, 240);
        assert_ne!(IGNORE_SELECT_ID, IGNORE_SAVE_ID);
    }

    #[test]
    fn field_value_mentions_channels_or_none() {
        assert_eq!(ignore_field_value(&[], "None"), "None");
        assert_eq!(
            ignore_field_value(&["7".to_string(), "8".to_string()], "None"),
            "<#7>, <#8>"
        );
        assert_eq!(ignore_field_mentions(&["9".to_string()]), "<#9>");
    }

    #[test]
    fn panel_channel_ids_drop_garbage_like_default_channels() {
        let ids = parse_panel_channel_ids(&[
            "123".to_string(),
            "nope".to_string(),
            "".to_string(),
            "0".to_string(),
            " 456 ".to_string(),
        ]);
        assert_eq!(
            ids,
            vec![
                poise::serenity_prelude::ChannelId::new(123),
                poise::serenity_prelude::ChannelId::new(456),
            ]
        );
        assert!(parse_panel_channel_ids(&[]).is_empty());
    }

    #[tokio::test]
    async fn save_dual_writes_new_and_legacy_keys() {
        let pool = mem_pool().await;
        save_ignore_routed(&pool, "g", &["7".to_string()])
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.bypassChannels")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.ignoreChannels")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
    }
}
