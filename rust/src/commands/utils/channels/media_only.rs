use super::*;

/// Define channels for only pictures/videos sending (block other content)
// The TS subcommand (utils.ts:404) takes NO options: it shows a panel
// embed (title, description, registered channels, threshold, mute
// time, thread toggle) with a channel select menu, an option string
// select (change mute time / change threshold / toggle thread) and a
// save button, wired through 240s in-memory collectors plus two
// modals (`pic_only_time_config`, `pic_only_threshold_config`).
// This port keeps the same interactive surface with an in-command
// collector loop (author-gated like the TS collector filters,
// `time: 240_000`), following the notifier/schedule collector
// precedent (`msg.await_component_interaction` + deadline loop +
// modal via `build_modal` / `await_modal_submit`). There is no
// `channel` slash option in TS.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "media-only",
    aliases("piconly", "mediaonly"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir des canaux pour l'envoi d'images/videos uniquement (bloquer d'autres contenus)"
    ),
    description_localized(
        "ja",
        "画像/動画のみ送信可能なチャンネルを定義（他のコンテンツをブロック）"
    ),
    description_localized(
        "ru",
        "Определить каналы только для картинок/видео (блокировать другое содержимое)"
    ),
    description_localized(
        "es-ES",
        "Definir canales solo para enviar imágenes/videos (bloquear otro contenido)"
    )
)]
pub async fn media_only(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = ctx.data().pool.clone();
    let code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());

    // Panel state mirrors !media-only.ts: the registered channels
    // (`UTILS.picOnly`, `|| []`) plus the config row
    // (`UTILS.picOnlyConfig`, threshold 3 / muteTime 600000 /
    // createThread "yes" fallbacks).
    let mut channels: Vec<String> =
        crate::commands::owner::main::routed_get(&pool, &gid, &gid, "UTILS.picOnly")
            .await
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
    if channels.len() == 1 && channels[0].trim().is_empty() {
        channels.clear();
    }
    let cfg_raw: Option<serde_json::Value> =
        crate::commands::owner::main::routed_get(&pool, &gid, &gid, "UTILS.picOnlyConfig")
            .await
            .and_then(|s| serde_json::from_str(&s).ok());
    let mut cfg = PicOnlyConfig::from_json(cfg_raw.as_ref());

    let embed = render_panel_embed(&t, &channels, &cfg, &code);
    // Outside a guild there is no collector target and no config
    // scope: keep the stateless read-only panel.
    let Some(guild_id) = ctx.guild_id() else {
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
        return Ok(());
    };
    let rows = panel_rows(&t, &channels, false, false);
    let handle = ctx
        .send(poise::CreateReply::default().embed(embed).components(rows))
        .await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let not_for_you = t("help_not_for_you", "This interaction is not for you");
    let perm_issue = t(
        "setjoinroles_var_perm_issue",
        "I do not have permission to manage roles.",
    );

    // Combined 240s collector. Mirrors the three TS collectors
    // (`componentType` ChannelSelect / StringSelect / Button, each
    // `time: 240_000` with the invoker-only filter) plus the modal
    // submits both string-select legs open.
    let deadline =
        tokio::time::Instant::now() + std::time::Duration::from_secs(PICONLY_PANEL_TIMEOUT_SECS);
    let mut saved = false;
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
        if id == PICONLY_CHANNEL_SELECT_ID {
            let next: Vec<String> = match &press.data.kind {
                serenity::ComponentInteractionDataKind::ChannelSelect { values } => {
                    values.iter().map(|c| c.get().to_string()).collect()
                }
                _ => continue,
            };
            // Mirrors the TS `members.me.permissions.has(ManageRoles)`
            // gate on the channel-select leg (ephemeral perm issue).
            if !bot_guild_permissions(&ctx, guild_id).manage_roles() {
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(perm_issue.clone())
                                .ephemeral(true),
                        ),
                    )
                    .await;
                continue;
            }
            // Ack-first (TS deferUpdate), then re-render the embed.
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
            channels = next;
            let embed = render_panel_embed(&t, &channels, &cfg, &code);
            let _ = msg
                .edit(ctx.http(), serenity::EditMessage::new().embeds(vec![embed]))
                .await;
        } else if id == PICONLY_OPTION_SELECT_ID {
            let value = match &press.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => continue,
            };
            if value == PICONLY_OPT_TIME {
                let Some(mute_ms) =
                    resolve_modal_number(&ctx, &press, &mut msg, &t, time_modal_opts(&t)).await?
                else {
                    continue;
                };
                // Mirrors `to_ms(...) || 600000` plus the
                // `1296000000 < calculedTime ? 600000` clamp.
                cfg.mute_ms = clamp_mute_time_ms(
                    crate::commands::shared::parse_duration_ms(&mute_ms)
                        .unwrap_or(PICONLY_DEFAULT_MUTE_MS),
                );
                let _ = save_pic_only_config(&pool, &gid, &cfg).await;
                let embed = render_panel_embed(&t, &channels, &cfg, &code);
                let _ = msg
                    .edit(ctx.http(), serenity::EditMessage::new().embeds(vec![embed]))
                    .await;
            } else if value == PICONLY_OPT_THRESHOLD {
                let Some(raw) =
                    resolve_modal_number(&ctx, &press, &mut msg, &t, threshold_modal_opts(&t))
                        .await?
                else {
                    continue;
                };
                // Mirrors `parseInt(...)` plus the
                // `15 < threshold ? 3` clamp.
                cfg.threshold = parse_threshold_input(&raw);
                let _ = save_pic_only_config(&pool, &gid, &cfg).await;
                let embed = render_panel_embed(&t, &channels, &cfg, &code);
                let _ = msg
                    .edit(ctx.http(), serenity::EditMessage::new().embeds(vec![embed]))
                    .await;
            } else if value == PICONLY_OPT_THREAD {
                // Mirrors the create-thread toggle leg (deferUpdate,
                // flip yes/no, persist, re-render).
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
                cfg.create_thread = !cfg.create_thread;
                let _ = save_pic_only_config(&pool, &gid, &cfg).await;
                let embed = render_panel_embed(&t, &channels, &cfg, &code);
                let _ = msg
                    .edit(ctx.http(), serenity::EditMessage::new().embeds(vec![embed]))
                    .await;
            }
        } else if id == PICONLY_SAVE_BUTTON_ID {
            // Mirrors the save leg: persist both rows, swap the panel
            // to the disabled success button, stop the collectors.
            // The save button keeps its disk emoji here; TS swaps to
            // the custom Yes emoji, which has no button-emoji lookup
            // on this path.
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
            let channels_json =
                serde_json::to_string(&channels).unwrap_or_else(|_| "[]".to_string());
            let _ = crate::commands::owner::main::routed_set(
                &pool,
                &gid,
                &gid,
                "UTILS.picOnly",
                &channels_json,
            )
            .await;
            let _ = save_pic_only_config(&pool, &gid, &cfg).await;
            saved = true;
            let done_row = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
                PICONLY_SAVE_BUTTON_ID,
            )
            .style(serenity::ButtonStyle::Success)
            .emoji(serenity::ReactionType::Unicode("💾".to_string()))
            .disabled(true)]);
            let _ = msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new().components(vec![done_row]),
                )
                .await;
            break;
        }
    }
    // Collector `end` leg: disable every row (the save button keeps
    // its success style once saved, like the mutated TS button).
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(panel_rows(&t, &channels, true, saved)),
        )
        .await;
    Ok(())
}

/// Panel collector lifetime in seconds. Mirrors `time: 240_000` on the
/// three collectors in !media-only.ts.
pub const PICONLY_PANEL_TIMEOUT_SECS: u64 = 240;

/// Custom ids, byte-exact from !media-only.ts (including the
/// `selecter` spelling).
pub const PICONLY_CHANNEL_SELECT_ID: &str = "utils-picOnly-role-selecter";
pub const PICONLY_OPTION_SELECT_ID: &str = "utils-picOnly-option-selecter";
pub const PICONLY_SAVE_BUTTON_ID: &str = "utils-picOnly-save-button";
/// String-select values, byte-exact from !media-only.ts.
pub const PICONLY_OPT_TIME: &str = "utils-picOnly-option-change-time";
pub const PICONLY_OPT_THRESHOLD: &str = "utils-picOnly-option-change-threshold";
pub const PICONLY_OPT_THREAD: &str = "utils-picOnly-option-change-create-thread";
/// Modal ids, byte-exact from !media-only.ts.
pub const PICONLY_TIME_MODAL_ID: &str = "pic_only_time_config";
pub const PICONLY_THRESHOLD_MODAL_ID: &str = "pic_only_threshold_config";
pub const PICONLY_MODAL_FIELD_ID: &str = "case_value";

/// Mute-time clamp. Mirrors `1296000000 < calculedTime ? 600000`
/// in !media-only.ts (inputs over 15 days fall back to 10 minutes).
pub const PICONLY_MAX_MUTE_MS: i64 = 1_296_000_000;
/// Threshold clamp. Mirrors `15 < threshold ? 3` in !media-only.ts.
pub const PICONLY_MAX_THRESHOLD: i64 = 15;

/// Media-only panel config. Mirrors the `UTILS.picOnlyConfig` row
/// (`threshold`, `muteTime`, `createThread: "yes" | "no"`) with the TS
/// fallbacks (threshold 3, muteTime 600000). These feed the live
/// enforcement in events_handler.rs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PicOnlyConfig {
    pub threshold: i64,
    pub mute_ms: i64,
    pub create_thread: bool,
}

impl PicOnlyConfig {
    pub fn from_json(v: Option<&serde_json::Value>) -> Self {
        let threshold = v
            .and_then(|j| j.get("threshold").and_then(|n| n.as_i64()))
            .filter(|n| *n > 0)
            .unwrap_or(PICONLY_DEFAULT_THRESHOLD);
        let mute_ms = v
            .and_then(|j| j.get("muteTime").and_then(|n| n.as_i64()))
            .filter(|n| *n > 0)
            .unwrap_or(PICONLY_DEFAULT_MUTE_MS);
        // TS defaults a missing row to `{ ..., createThread: "yes" }`,
        // but a present row needs an explicit "yes"
        // (`baseData.createThread === "yes"`).
        let create_thread = v
            .and_then(|j| j.get("createThread").and_then(|s| s.as_str()))
            .map(|s| s == "yes")
            .unwrap_or(true);
        Self {
            threshold,
            mute_ms,
            create_thread,
        }
    }

    pub fn to_json(self) -> serde_json::Value {
        serde_json::json!({
            "threshold": self.threshold,
            "muteTime": self.mute_ms,
            "createThread": if self.create_thread { "yes" } else { "no" },
        })
    }
}

/// Media-only panel config defaults. Mirrors !media-only.ts
/// (`UTILS.picOnlyConfig` fallbacks: threshold 3, muteTime 600000).
pub const PICONLY_DEFAULT_THRESHOLD: i64 = 3;
/// Default mute time in ms (10 minutes, the TS `|| 600000` fallback).
pub const PICONLY_DEFAULT_MUTE_MS: i64 = 600_000;

/// Clamp a mute time in ms. Mirrors
/// `1296000000 < calculedTime ? 600000 : calculedTime`.
pub fn clamp_mute_time_ms(ms: i64) -> i64 {
    if ms > PICONLY_MAX_MUTE_MS {
        PICONLY_DEFAULT_MUTE_MS
    } else {
        ms
    }
}

/// Clamp a threshold. Mirrors `15 < threshold ? 3 : threshold`.
pub fn clamp_threshold_value(n: i64) -> i64 {
    if n > PICONLY_MAX_THRESHOLD {
        PICONLY_DEFAULT_THRESHOLD
    } else {
        n
    }
}

/// Parse a threshold modal input. Mirrors `parseInt(...)` plus the
/// `15 < threshold` clamp. Garbage has no `i64` parse: TS stored NaN
/// there, which rendered and enforced as 3 everywhere via
/// `threshold || 3`, so this stores the default directly (same
/// observable behaviour, representable in the JSON-int row).
pub fn parse_threshold_input(raw: &str) -> i64 {
    match raw.trim().parse::<i64>() {
        Ok(n) => clamp_threshold_value(n),
        Err(_) => PICONLY_DEFAULT_THRESHOLD,
    }
}

/// Keep the ids Discord can pre-select. Mirrors the TS
/// `setDefaultChannels(channels)` call: unparsable entries are
/// dropped, never sent.
pub fn parse_channel_ids(ids: &[String]) -> Vec<poise::serenity_prelude::ChannelId> {
    ids.iter()
        .filter_map(|s| {
            s.trim()
                .parse::<u64>()
                .ok()
                .map(poise::serenity_prelude::ChannelId::new)
        })
        .collect()
}

/// Render the panel embed. Mirrors the TS embed plus `updateEmbed`:
/// registered channels (or `setjoinroles_var_none`), threshold
/// (`|| 3`), mute time (`to_beautiful_string(muteTime)`), thread
/// toggle.
fn render_panel_embed(
    t: &impl Fn(&str, &str) -> String,
    channels: &[String],
    cfg: &PicOnlyConfig,
    code: &str,
) -> poise::serenity_prelude::CreateEmbed {
    let channels_value = if channels.is_empty() {
        t("setjoinroles_var_none", "None")
    } else {
        channels
            .iter()
            .map(|c| format!("<#{c}>"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    let thread_value = if cfg.create_thread {
        t("var_yes", "Yes")
    } else {
        t("var_no", "No")
    };
    poise::serenity_prelude::CreateEmbed::default()
        .title(t("utils_pic_only_embed_title", "Media Only Channels"))
        .description(t(
            "utils_pic_only_emnbed_desc",
            "Channel where pictures/images/videos are the only things allowed.",
        ))
        .color(0x475387)
        .field(
            t(
                "joinghostping_add_ok_embed_fields_name",
                "All registered channels",
            ),
            channels_value,
            false,
        )
        .field(
            t(
                "antispam_manage_choices_12_label",
                "Threshold before punishment",
            ),
            cfg.threshold.to_string(),
            true,
        )
        .field(
            t("utils_piconly_embed_fields_3_name", "Timeout Time"),
            crate::commands::guildconfig::beautiful_ms_lang(cfg.mute_ms as f64, code),
            true,
        )
        .field(
            t(
                "utils_piconly_embed_fields2_placeholder",
                "Create a thread under the image/video",
            ),
            thread_value,
            true,
        )
}

/// Build the three panel rows. Mirrors the TS components: the
/// GuildText channel select (min 0, max 25, current list pre-selected),
/// the option string select (change time / change threshold / thread
/// toggle), and the save button. `disabled` renders the collector
/// `end` leg; `save_success` renders the post-save success style.
fn panel_rows(
    t: &impl Fn(&str, &str) -> String,
    channels: &[String],
    disabled: bool,
    save_success: bool,
) -> Vec<poise::serenity_prelude::CreateActionRow> {
    use poise::serenity_prelude as serenity;
    let defaults = parse_channel_ids(channels);
    let channel_menu = serenity::CreateSelectMenu::new(
        PICONLY_CHANNEL_SELECT_ID,
        serenity::CreateSelectMenuKind::Channel {
            channel_types: Some(vec![serenity::ChannelType::Text]),
            default_channels: if defaults.is_empty() {
                None
            } else {
                Some(defaults)
            },
        },
    )
    .min_values(0)
    .max_values(25)
    .disabled(disabled);
    let option_menu = serenity::CreateSelectMenu::new(
        PICONLY_OPTION_SELECT_ID,
        serenity::CreateSelectMenuKind::String {
            options: vec![
                serenity::CreateSelectMenuOption::new(
                    t("utils_piconly_select1_option1_label", "Change timeout time"),
                    PICONLY_OPT_TIME.to_string(),
                ),
                serenity::CreateSelectMenuOption::new(
                    t("utils_piconly_select1_option2_label", "Change threshold"),
                    PICONLY_OPT_THRESHOLD.to_string(),
                ),
                serenity::CreateSelectMenuOption::new(
                    t(
                        "utils_piconly_embed_fields2_placeholder",
                        "Create a thread under the image/video",
                    ),
                    PICONLY_OPT_THREAD.to_string(),
                ),
            ],
        },
    )
    .disabled(disabled);
    let save = serenity::CreateButton::new(PICONLY_SAVE_BUTTON_ID)
        .style(if save_success {
            serenity::ButtonStyle::Success
        } else {
            serenity::ButtonStyle::Primary
        })
        .emoji(serenity::ReactionType::Unicode("💾".to_string()))
        .disabled(disabled);
    vec![
        serenity::CreateActionRow::SelectMenu(channel_menu),
        serenity::CreateActionRow::SelectMenu(option_menu),
        serenity::CreateActionRow::Buttons(vec![save]),
    ]
}

/// Mute-time modal options. Mirrors the `pic_only_time_config` modal
/// in !media-only.ts (Short, max 8, min 2, required).
fn time_modal_opts(t: &impl Fn(&str, &str) -> String) -> crate::modal_helper::ModalOptions {
    let mut opts = crate::modal_helper::ModalOptions::new(
        &t(
            "utils_piconly_modal1_title",
            "MediaOnly - Time Configurations",
        ),
        PICONLY_TIME_MODAL_ID,
    );
    opts.fields = vec![crate::modal_helper::ModalField::Text(
        crate::modal_helper::TextField {
            custom_id: PICONLY_MODAL_FIELD_ID.to_string(),
            label: t("utils_piconly_modal1_fields1_label", "Mute Time"),
            placeholder: Some(t(
                "utils_piconly_modal1_fields1_placeholder",
                "the time of the mute",
            )),
            style: crate::modal_helper::TextStyle::Short,
            required: true,
            max_length: Some(8),
            min_length: Some(2),
            value: None,
        },
    )];
    opts
}

/// Threshold modal options. Mirrors the `pic_only_threshold_config`
/// modal in !media-only.ts (Short, max 4, min 1, required).
fn threshold_modal_opts(t: &impl Fn(&str, &str) -> String) -> crate::modal_helper::ModalOptions {
    let mut opts = crate::modal_helper::ModalOptions::new(
        &t(
            "utils_piconly_modal2_title",
            "MediaOnly - Threshold Configuration",
        ),
        PICONLY_THRESHOLD_MODAL_ID,
    );
    opts.fields = vec![crate::modal_helper::ModalField::Text(
        crate::modal_helper::TextField {
            custom_id: PICONLY_MODAL_FIELD_ID.to_string(),
            label: t("utils_piconly_modal2_fields1_label", "Threshold"),
            placeholder: Some(t(
                "utils_piconly_modal2_fields1_placeholder",
                "the threshold before mute",
            )),
            style: crate::modal_helper::TextStyle::Short,
            required: true,
            max_length: Some(4),
            min_length: Some(1),
            value: None,
        },
    )];
    opts
}

/// Show a config modal from a string-select press and await its
/// submit. Mirrors `iHorizonModalResolve` (modal response on the
/// press, author + customId filtered wait). Returns `Ok(None)` when
/// the modal cannot be shown or the submit times out, so the panel
/// stays usable until the collector lapses.
async fn resolve_modal_number(
    ctx: &Ctx<'_>,
    press: &poise::serenity_prelude::ComponentInteraction,
    msg: &mut poise::serenity_prelude::Message,
    t: &impl Fn(&str, &str) -> String,
    opts: crate::modal_helper::ModalOptions,
) -> Result<Option<String>, anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let modal_id = opts.custom_id.clone();
    let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
        return Ok(None);
    };
    if press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await
        .is_err()
    {
        let _ = msg
            .edit(
                ctx.http(),
                serenity::EditMessage::new().components(panel_rows(t, &[], false, false)),
            )
            .await;
        return Ok(None);
    }
    let sctx = ctx.serenity_context().clone();
    let Some(submit) = crate::commands::await_modal_submit(&sctx, press, &modal_id).await else {
        return Ok(None);
    };
    let value = crate::modal_helper::text_value(&submit, PICONLY_MODAL_FIELD_ID);
    // Ack the submit (TS `deferUpdate: true`); the panel re-render
    // below carries the new value.
    let _ = submit
        .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
        .await;
    Ok(Some(value))
}

/// Persist the `UTILS.picOnlyConfig` row. Mirrors the
/// `client.db.set(...)` calls in every config leg of !media-only.ts.
async fn save_pic_only_config(
    pool: &crate::db::Pool,
    gid: &str,
    cfg: &PicOnlyConfig,
) -> anyhow::Result<()> {
    let value = cfg.to_json().to_string();
    crate::commands::owner::main::routed_set(pool, gid, gid, "UTILS.picOnlyConfig", &value).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mute_clamp_caps_at_15_days_like_ts() {
        assert_eq!(clamp_mute_time_ms(600_000), 600_000);
        assert_eq!(clamp_mute_time_ms(1_296_000_000), 1_296_000_000);
        assert_eq!(clamp_mute_time_ms(1_296_000_001), PICONLY_DEFAULT_MUTE_MS);
        assert_eq!(clamp_mute_time_ms(2_592_000_000), PICONLY_DEFAULT_MUTE_MS);
    }

    #[test]
    fn threshold_clamp_caps_at_15_like_ts() {
        assert_eq!(clamp_threshold_value(3), 3);
        assert_eq!(clamp_threshold_value(15), 15);
        assert_eq!(clamp_threshold_value(16), PICONLY_DEFAULT_THRESHOLD);
        assert_eq!(clamp_threshold_value(100), PICONLY_DEFAULT_THRESHOLD);
    }

    #[test]
    fn threshold_input_parses_and_clamps() {
        assert_eq!(parse_threshold_input("5"), 5);
        assert_eq!(parse_threshold_input(" 7 "), 7);
        assert_eq!(parse_threshold_input("16"), PICONLY_DEFAULT_THRESHOLD);
        // Garbage stored NaN in TS, which behaved as 3 via `|| 3`.
        assert_eq!(parse_threshold_input("abc"), PICONLY_DEFAULT_THRESHOLD);
        assert_eq!(parse_threshold_input(""), PICONLY_DEFAULT_THRESHOLD);
    }

    #[test]
    fn mute_time_resolution_mirrors_to_ms_fallback() {
        // `to_ms(input) || 600000`: valid spans pass through the clamp.
        let five = crate::commands::shared::parse_duration_ms("5m").unwrap();
        assert_eq!(clamp_mute_time_ms(five), 300_000);
        // Garbage / zero resolve to None, i.e. the 600000 fallback.
        assert_eq!(crate::commands::shared::parse_duration_ms("abc"), None);
        let fallback =
            crate::commands::shared::parse_duration_ms("abc").unwrap_or(PICONLY_DEFAULT_MUTE_MS);
        assert_eq!(clamp_mute_time_ms(fallback), 600_000);
        // 30d parses but exceeds the 15-day cap.
        let thirty_days = crate::commands::shared::parse_duration_ms("30d").unwrap();
        assert_eq!(clamp_mute_time_ms(thirty_days), PICONLY_DEFAULT_MUTE_MS);
    }

    #[test]
    fn channel_id_parsing_drops_garbage_like_default_channels() {
        let ids = parse_channel_ids(&[
            "123".to_string(),
            "nope".to_string(),
            "".to_string(),
            " 456 ".to_string(),
        ]);
        assert_eq!(
            ids,
            vec![
                poise::serenity_prelude::ChannelId::new(123),
                poise::serenity_prelude::ChannelId::new(456),
            ]
        );
        assert!(parse_channel_ids(&[]).is_empty());
    }

    #[test]
    fn config_round_trip_matches_ts_row_shape() {
        let cfg = PicOnlyConfig {
            threshold: 5,
            mute_ms: 300_000,
            create_thread: false,
        };
        let json = cfg.to_json();
        assert_eq!(json.get("threshold").and_then(|n| n.as_i64()), Some(5));
        assert_eq!(json.get("muteTime").and_then(|n| n.as_i64()), Some(300_000));
        assert_eq!(
            json.get("createThread").and_then(|s| s.as_str()),
            Some("no")
        );
        assert_eq!(PicOnlyConfig::from_json(Some(&json)), cfg);
    }

    #[test]
    fn config_defaults_match_ts_fallbacks() {
        let cfg = PicOnlyConfig::from_json(None);
        assert_eq!(cfg.threshold, PICONLY_DEFAULT_THRESHOLD);
        assert_eq!(cfg.mute_ms, PICONLY_DEFAULT_MUTE_MS);
        assert!(cfg.create_thread);
    }

    #[test]
    fn custom_ids_are_distinct() {
        let ids = [
            PICONLY_CHANNEL_SELECT_ID,
            PICONLY_OPTION_SELECT_ID,
            PICONLY_SAVE_BUTTON_ID,
            PICONLY_TIME_MODAL_ID,
            PICONLY_THRESHOLD_MODAL_ID,
        ];
        let mut seen = std::collections::HashSet::new();
        for id in ids {
            assert!(seen.insert(id), "duplicate custom id {id}");
        }
    }
}
