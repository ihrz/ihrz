// Split from `main.rs`: component dispatch. Pure move, no logic change.

use poise::serenity_prelude as serenity;

use super::banner::*;
use super::banner_edit::*;
use super::command::*;
use super::constants::*;
use super::render::*;
use super::roles::*;
use super::state::*;

/// Component dispatch. Mirrors the panel collector (section switch,
/// message/embed/dm modals + resets, toggles, channel + role picks,
/// dangerous-role confirm, banner reset/toggle + 6 banner prop editors
/// with hex/enum validation and prop/size picker rows; no live preview).
pub async fn handle_welcomer_component(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    // Collector timeout (stateless form): the panel message timestamp
    // bounds interactions; expired panels re-render disabled, like the
    // TS collector `end` handler.
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    if welcomer_panel_expired(comp.message.timestamp.timestamp(), now_secs) {
        render_disabled(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    let id = comp.data.custom_id.as_str();
    // Collector guard: the panel answers only to its opener. Anyone
    // else (or an unbound/expired panel) gets the ephemeral denial —
    // never silence, never a config write. See `crate::collector`.
    let key = format!("welcomer:{}", comp.message.id.get());
    if crate::collector::check_collector_owner(&ctx.http, comp, &key, &lang_code)
        .await
        .is_none()
    {
        return Ok(());
    }

    if id == WELCOMER_SECTION_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            if let Some(section) = values.first().and_then(|s| welcomer_section(s)) {
                set_section(pool, &gid, section).await;
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Message set/reset (modal with 2..1010 chars, like askForMessage).
    if let Some(kind) = ["welcomer-join-set", "welcomer-leave-set"]
        .iter()
        .find(|k| **k == id)
        .map(|_| if id.contains("join") { "join" } else { "leave" })
    {
        let join = kind == "join";
        let modal_id = format!("welcomer-{kind}-modal");
        let input_id = format!("welcomer-{kind}-input");
        let mut modal_opts = crate::modal_helper::ModalOptions::new(
            &t(
                &lang_code,
                if join {
                    "setjoinmessage_awaiting_response"
                } else {
                    "setleavemessage_awaiting_response"
                },
            ),
            &modal_id,
        );
        modal_opts
            .fields
            .push(crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: input_id.clone(),
                    label: t(
                        &lang_code,
                        if join {
                            "guildprofil_embed_fields_joinmessage"
                        } else {
                            "guildprofil_embed_fields_leavemessage"
                        },
                    ),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Paragraph,
                    required: true,
                    max_length: Some(1010),
                    min_length: Some(2),
                    value: None,
                },
            ));
        let modal = crate::modal_helper::build_modal(&modal_opts)
            .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) = crate::commands::await_modal_submit(ctx, comp, &modal_id).await else {
            return Ok(());
        };
        let text = crate::modal_helper::text_value(&submit, &input_id);
        if text.len() < 2 {
            return Ok(());
        }
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinmessage" } else { "leavemessage" },
            Some(serde_json::Value::String(text)),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        let _ = submit
            .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
            .await;
        let _ = comp
            .channel_id
            .send_message(
                &ctx.http,
                serenity::CreateMessage::new()
                    .content(t(
                        &lang_code,
                        if join {
                            "setjoinmessage_command_work_on_enable"
                        } else {
                            "setleavemessage_command_work_on_enable"
                        },
                    ))
                    .reference_message((comp.channel_id, comp.message.id)),
            )
            .await;
        post_panel_log(
            &ctx.http,
            guild_id,
            t(
                &lang_code,
                if join {
                    "setjoinmessage_logs_embed_title_on_enable"
                } else {
                    "setleavemessage_logs_embed_title_on_enable"
                },
            ),
            t(
                &lang_code,
                if join {
                    "setjoinmessage_logs_embed_description_on_enable"
                } else {
                    "setleavemessage_logs_embed_description_on_enable"
                },
            )
            .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
        )
        .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Message reset.
    if id == "welcomer-join-reset" || id == "welcomer-leave-reset" {
        let join = id.contains("join");
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinmessage" } else { "leavemessage" },
            None,
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        ephemeral(
            ctx,
            comp,
            t(
                &lang_code,
                if join {
                    "setjoinmessage_command_work_on_disable"
                } else {
                    "setleavemessage_command_work_on_disable"
                },
            ),
        )
        .await;
        return Ok(());
    }

    // Embed-id set/reset (validates the EMBED row, like askForEmbed).
    if id == "welcomer-join-embed-set" || id == "welcomer-leave-embed-set" {
        let join = id.contains("-join-");
        let kind = if join { "join" } else { "leave" };
        let modal_id = format!("welcomer-{kind}-embed-modal");
        let input_id = format!("welcomer-{kind}-embed-input");
        let mut modal_opts = crate::modal_helper::ModalOptions::new(
            &t(&lang_code, "welcomer_embed_modal_title"),
            &modal_id,
        );
        modal_opts
            .fields
            .push(crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: input_id.clone(),
                    label: t(&lang_code, "welcomer_embed_modal_label"),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Short,
                    required: true,
                    max_length: Some(64),
                    min_length: Some(1),
                    value: None,
                },
            ));
        let modal = crate::modal_helper::build_modal(&modal_opts)
            .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) = crate::commands::await_modal_submit(ctx, comp, &modal_id).await else {
            return Ok(());
        };
        let embed_id = crate::modal_helper::text_value(&submit, &input_id)
            .trim()
            .to_string();
        if !welcomer_embed_exists(pool, &gid, &embed_id).await {
            let _ = submit
                .create_response(
                    ctx,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(
                                t(&lang_code, "welcomer_embed_not_found")
                                    .replace("${embed_id}", &embed_id),
                            )
                            .ephemeral(true),
                    ),
                )
                .await;
            return Ok(());
        }
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinEmbedId" } else { "leaveEmbedId" },
            Some(serde_json::Value::String(embed_id.clone())),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        let _ = submit
            .create_response(
                ctx,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(
                            t(&lang_code, "welcomer_embed_set_ok")
                                .replace("${embed_id}", &embed_id),
                        )
                        .ephemeral(true),
                ),
            )
            .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-join-embed-reset" || id == "welcomer-leave-embed-reset" {
        let join = id.contains("-join-");
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinEmbedId" } else { "leaveEmbedId" },
            None,
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        ephemeral(ctx, comp, t(&lang_code, "welcomer_embed_removed_ok")).await;
        return Ok(());
    }

    // Text / components toggles.
    for (button_id, field) in [
        ("welcomer-join-text-toggle", "joinTextEnabled"),
        ("welcomer-leave-text-toggle", "leaveTextEnabled"),
        ("welcomer-join-components-toggle", "joinComponentsEnabled"),
        ("welcomer-leave-components-toggle", "leaveComponentsEnabled"),
    ] {
        if id == button_id {
            let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            let cur = cfg.get(field).and_then(|v| v.as_bool()).unwrap_or(true);
            crate::commands::guildconfig::welcomer_set(
                &mut cfg,
                field,
                Some(serde_json::Value::Bool(!cur)),
            );
            crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
            rerender(ctx, comp, pool, &gid, &lang_code).await;
            return Ok(());
        }
    }

    // Join-DM set/reset (modal 2..1010, like askForDm/resetDm).
    if id == "welcomer-dm-set" {
        let mut modal_opts = crate::modal_helper::ModalOptions::new(
            &t(&lang_code, "setjoindm_awaiting_response"),
            "welcomer-dm-modal",
        );
        modal_opts
            .fields
            .push(crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: "welcomer-dm-input".to_string(),
                    label: t(&lang_code, "guildprofil_embed_fields_joinDmMessage"),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Paragraph,
                    required: true,
                    max_length: Some(1010),
                    min_length: Some(2),
                    value: None,
                },
            ));
        let modal = crate::modal_helper::build_modal(&modal_opts)
            .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) =
            crate::commands::await_modal_submit(ctx, comp, "welcomer-dm-modal").await
        else {
            return Ok(());
        };
        let text = crate::modal_helper::text_value(&submit, "welcomer-dm-input");
        if text.len() < 2 {
            return Ok(());
        }
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            "joindm",
            Some(serde_json::Value::String(text.clone())),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        let _ = submit
            .create_response(
                ctx,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(
                            t(&lang_code, "setjoindm_confirmation_message_on_enable")
                                .replace("${dm_msg}", &text),
                        )
                        .ephemeral(true),
                ),
            )
            .await;
        post_panel_log(
            &ctx.http,
            guild_id,
            t(&lang_code, "setjoindm_logs_embed_title_on_enable"),
            t(&lang_code, "setjoindm_logs_embed_description_on_enable")
                .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
        )
        .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-dm-reset" {
        let cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        if cfg.get("joindm").and_then(|v| v.as_str()).is_none() {
            ephemeral(ctx, comp, t(&lang_code, "setjoindm_already_disable")).await;
            return Ok(());
        }
        let mut cfg = cfg;
        crate::commands::guildconfig::welcomer_set(&mut cfg, "joindm", None);
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        ephemeral(
            ctx,
            comp,
            t(&lang_code, "setjoindm_confirmation_message_on_disable"),
        )
        .await;
        post_panel_log(
            &ctx.http,
            guild_id,
            t(&lang_code, "setjoindm_logs_embed_title_on_disable"),
            t(&lang_code, "setjoindm_logs_embed_description_on_disable")
                .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
        )
        .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Channel picks + reset.
    if id == "welcomer-channel-join" || id == "welcomer-channel-leave" {
        let join = id.ends_with("-join");
        if let serenity::ComponentInteractionDataKind::ChannelSelect { values } = &comp.data.kind {
            let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            crate::commands::guildconfig::welcomer_set(
                &mut cfg,
                if join { "join" } else { "leave" },
                values
                    .first()
                    .map(|c| serde_json::Value::String(c.get().to_string())),
            );
            crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-channels-reset" {
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(&mut cfg, "join", None);
        crate::commands::guildconfig::welcomer_set(&mut cfg, "leave", None);
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Role pick (dangerous-perm confirm + too-high warn, like
    // handleRolesPick/saveRoles/askDangerousConfirm).
    if id == "welcomer-roles-pick" {
        handle_roles_pick(ctx, comp, pool, &gid, &lang_code).await?;
        return Ok(());
    }
    if id == "welcomer-dangerous-yes" || id == "welcomer-dangerous-no" {
        if id.ends_with("-yes") {
            let cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            let pending: Vec<String> = cfg
                .get(PENDING_ROLES_FIELD)
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            save_roles(ctx, comp, pool, &gid, &lang_code, &pending).await?;
        } else {
            ephemeral(ctx, comp, t(&lang_code, "setjoinroles_action_canceled")).await;
        }
        return Ok(());
    }

    // Banner reset (defaults like TS) + on/off toggle.
    if id == "welcomer-banner-reset" {
        let banner = BannerConfig {
            message: Some(t(&lang_code, "setjoinmessage_image_default_text")),
            ..BannerConfig::default()
        };
        save_banner(pool, &gid, &banner, BannerPicker::None).await?;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-banner-toggle" {
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        let cur = blob_str(&cfg, "joinbannerStates").unwrap_or_else(|| "on".to_string());
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            "joinbannerStates",
            Some(serde_json::Value::String(if cur == "off" {
                "on".to_string()
            } else {
                "off".to_string()
            })),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Banner prop picker (opens modals or the frame/size pickers).
    // Mirrors handlePropAction.
    if id == BANNER_PROP_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            if let Some(prop) = values.first().and_then(|s| banner_prop(s)) {
                handle_banner_prop(ctx, comp, pool, &gid, &lang_code, prop).await?;
                return Ok(());
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Frame pick (hexProfileColor | status). Mirrors welcomer-frame-pick.
    if id == BANNER_FRAME_PICK_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            if let Some(frame) = values.first().and_then(|s| banner_frame(s)) {
                let mut banner = load_banner(pool, &gid, &lang_code).await;
                banner.frame = frame.to_string();
                save_banner(pool, &gid, &banner, BannerPicker::None).await?;
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Size pick (text vs avatar targets). Mirrors welcomer-size-pick.
    if id == BANNER_SIZE_PICK_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            let cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            let picker = cfg
                .get(BANNER_PICKER_FIELD)
                .and_then(|v| v.as_str())
                .map(BannerPicker::parse)
                .unwrap_or_default();
            if let Some(value) = values.first().map(String::as_str) {
                let mut banner =
                    banner_config(&cfg, &t(&lang_code, "setjoinmessage_image_default_text"));
                let valid = match picker {
                    BannerPicker::TextSize => banner_text_size(value).map(|_| {
                        banner.text_size = value.to_string();
                    }),
                    BannerPicker::AvatarSize => banner_avatar_size(value).map(|_| {
                        banner.avatar_size = value.to_string();
                    }),
                    _ => None,
                };
                if valid.is_some() {
                    save_banner(pool, &gid, &banner, BannerPicker::None).await?;
                }
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    Ok(())
}
