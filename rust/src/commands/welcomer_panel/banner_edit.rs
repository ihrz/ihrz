// Split from `main.rs`: banner prop editors. Pure move, no logic change.

use poise::serenity_prelude as serenity;

use super::banner::*;
use super::command::*;
use super::constants::*;
use super::render::*;
use super::state::*;

/// Banner prop dispatch. Mirrors handlePropAction: background/colour/
/// message open modals with validation, frame/size open the contextual
/// picker rows. No live preview is rendered (unlike the TS
/// generateJoinImage MediaGallery).
pub(crate) async fn handle_banner_prop(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    prop: &str,
) -> anyhow::Result<()> {
    match prop {
        "change_background" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t(
                    lang_code,
                    "setjoinmessage_change_image_propreties_background",
                ),
                "welcomer-background-modal",
            );
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "url".to_string(),
                        label: t(lang_code, "setjoinmessage_modal_fields_background_url"),
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(300),
                        min_length: Some(7),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, "welcomer-background-modal").await
            else {
                return Ok(());
            };
            let url = crate::modal_helper::text_value(&submit, "url")
                .trim()
                .to_string();
            if !is_valid_background_url(&url) {
                let _ = submit
                    .create_response(
                        ctx,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t(lang_code, "setjoinmessage_change_image_invalid_url"))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                return Ok(());
            }
            let mut banner = load_banner(pool, gid, lang_code).await;
            banner.background_url = url;
            save_banner(pool, gid, &banner, BannerPicker::None).await?;
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "change_frame" => {
            let banner = load_banner(pool, gid, lang_code).await;
            save_banner(pool, gid, &banner, BannerPicker::Frame).await?;
        }
        "change_text_colour" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t(
                    lang_code,
                    "setjoinmessage_change_image_propreties_text_colour",
                ),
                "welcomer-colour-modal",
            );
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "colour".to_string(),
                        label: t(lang_code, "setjoinmessage_modal_fields_hex_color"),
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(9),
                        min_length: Some(3),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, "welcomer-colour-modal").await
            else {
                return Ok(());
            };
            let colour = crate::modal_helper::text_value(&submit, "colour")
                .trim()
                .to_string();
            if !is_valid_hex_colour(&colour) {
                let no = crate::emojis::app_emoji_markup(&ctx.http, "No")
                    .await
                    .unwrap_or_else(|| "❌".to_string());
                let _ = submit
                    .create_response(
                        ctx,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(
                                    t(lang_code, "embed_choose_12_error")
                                        .replace("${client.iHorizon_Emojis.No}", &no),
                                )
                                .ephemeral(true),
                        ),
                    )
                    .await;
                return Ok(());
            }
            let mut banner = load_banner(pool, gid, lang_code).await;
            banner.text_colour = colour;
            save_banner(pool, gid, &banner, BannerPicker::None).await?;
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "change_text_message" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t(
                    lang_code,
                    "setjoinmessage_change_image_propreties_text_message",
                ),
                "welcomer-text-modal",
            );
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "msg".to_string(),
                        label: t(lang_code, "setjoinmessage_modal_fields_message"),
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(100),
                        min_length: Some(15),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, "welcomer-text-modal").await
            else {
                return Ok(());
            };
            let message = crate::modal_helper::text_value(&submit, "msg")
                .trim()
                .to_string();
            if !validate_banner_message(&message) {
                let _ = submit
                    .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                return Ok(());
            }
            let mut banner = load_banner(pool, gid, lang_code).await;
            banner.message = Some(message);
            save_banner(pool, gid, &banner, BannerPicker::None).await?;
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "change_text_size" => {
            let banner = load_banner(pool, gid, lang_code).await;
            save_banner(pool, gid, &banner, BannerPicker::TextSize).await?;
        }
        "change_avatar_size" => {
            let banner = load_banner(pool, gid, lang_code).await;
            save_banner(pool, gid, &banner, BannerPicker::AvatarSize).await?;
        }
        _ => {}
    }
    rerender(ctx, comp, pool, gid, lang_code).await;
    Ok(())
}
