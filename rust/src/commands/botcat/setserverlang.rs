use super::*;
use crate::commands::shared::{embed_with_footer, footer_parts};
use poise::serenity_prelude as serenity;

/// Language table. Mirrors AvailableLanguage in getLanguageData.ts
/// (code, display name, flag), same order.
pub const LANG_META: [(&str, &str, &str); 10] = [
    ("ar-EG", "Arab Egyptian", "🇪🇬"),
    ("de-DE", "Deutsch", "🇩🇪"),
    ("en-US", "English", "🇺🇸"),
    ("fr-FR", "French", "🇫🇷"),
    ("it-IT", "Italian", "🇮🇹"),
    ("jp-JP", "Japanese", "🇯🇵"),
    ("pt-PT", "Portuguese", "🇵🇹"),
    ("fr-ME", "Rude French", "🇫🇷"),
    ("ru-RU", "Russian", "🇷🇺"),
    ("es-ES", "Spanish", "🇪🇸"),
];

/// Component ids. Mirror the TS customIds verbatim.
pub const SETLANG_SELECT_ID: &str = "setlang-language-selecter";
pub const SETLANG_SAVE_ID: &str = "setlang-save-button";

/// Collector lifetime. Mirrors the TS `time: 240_000`.
pub const SETLANG_TIMEOUT_SECS: u64 = 240;

/// (display name, flag) for a supported code. Pure.
pub fn lang_meta(code: &str) -> Option<(&str, &str)> {
    LANG_META
        .iter()
        .copied()
        .find(|(c, _, _)| *c == code)
        .map(|(_, name, flag)| (name, flag))
}

/// Current-language field value (`"<flag> <name>"`). Pure.
pub fn current_field_value(code: &str) -> Option<String> {
    lang_meta(code).map(|(name, flag)| format!("{flag} {name}"))
}

/// Fill the `${type}` slot of the saved/log templates. Pure.
pub fn with_type(template: &str, code: &str) -> String {
    template.replace("${type}", code)
}

fn panel_embed(
    lang_code: &str,
    shown: &str,
    footer_name: &str,
    with_icon: bool,
) -> serenity::CreateEmbed {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let value = current_field_value(shown).unwrap_or_else(|| t("setserverlang_panel_select"));
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x475387)
        .title(t("setserverlang_panel_title"))
        .description(t("setserverlang_panel_description"))
        .field(t("setserverlang_panel_current"), value, false)
        .timestamp(serenity::Timestamp::now());
    embed = embed_with_footer(embed, footer_name, with_icon);
    if with_icon {
        embed = embed.thumbnail("attachment://footer_icon.png");
    }
    embed
}

fn select_row(selected: &str, placeholder: String, disabled: bool) -> serenity::CreateActionRow {
    let mut options = Vec::with_capacity(LANG_META.len());
    for (code, name, flag) in LANG_META {
        let mut opt = serenity::CreateSelectMenuOption::new(name, code)
            .emoji(serenity::ReactionType::Unicode(flag.to_string()));
        if code == selected {
            opt = opt.default_selection(true);
        }
        options.push(opt);
    }
    let mut menu = serenity::CreateSelectMenu::new(
        SETLANG_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder);
    if disabled {
        menu = menu.disabled(true);
    }
    serenity::CreateActionRow::SelectMenu(menu)
}

fn save_row(success_markup: Option<(u64, String, bool)>) -> serenity::CreateActionRow {
    // Mirrors the TS save button: Primary + floppy emoji, then Success +
    // Yes emoji + disabled after saving.
    let button = match success_markup {
        Some((id, name, _)) => serenity::CreateButton::new(SETLANG_SAVE_ID)
            .style(serenity::ButtonStyle::Success)
            .disabled(true)
            .emoji(serenity::ReactionType::Custom {
                animated: false,
                id: serenity::EmojiId::new(id),
                name: Some(name),
            }),
        None => serenity::CreateButton::new(SETLANG_SAVE_ID)
            .style(serenity::ButtonStyle::Primary)
            .emoji(serenity::ReactionType::Unicode("💾".to_string())),
    };
    serenity::CreateActionRow::Buttons(vec![button])
}

/// Persist the language plus the TS save side-effects: per-guild bot bio
/// in the new language (`bot_server_bio`, PATCH members/@me) and the
/// ihorizon-logs report embed.
async fn apply_language(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    code: &str,
) -> Result<(), anyhow::Error> {
    crate::db::kv_set(
        &ctx.data().pool,
        &guild_id.get().to_string(),
        "GUILD.LANG",
        code,
    )
    .await?;
    if let Some(tpl) = crate::lang::get(code, "bot_server_bio") {
        let count = crate::commands::all().len();
        let http = &ctx.serenity_context().http;
        let wink = crate::emojis::app_emoji_markup(http, "Wink")
            .await
            .unwrap_or_default();
        let home = crate::emojis::app_emoji_markup(http, "Home")
            .await
            .unwrap_or_default();
        let bio = sanitize_bio(
            &tpl.replace("{count}", &count.to_string())
                .replace("{wink_emoji}", &wink)
                .replace("{home_emoji}", &home),
        );
        if let Some(token) = crate::config::bot_token() {
            patch_guild_me(&token, guild_id.get(), serde_json::json!({ "bio": bio })).await;
        }
    }
    if let Ok(channels) = guild_id.channels(ctx.http()).await {
        let list: Vec<(u64, String)> = channels
            .iter()
            .map(|(id, c)| (id.get(), c.name.clone()))
            .collect();
        if let Some(log_id) = crate::funcs::logs_channel_id(&list) {
            let title = crate::lang::get(code, "setserverlang_logs_embed_title_on_enable")
                .unwrap_or_default();
            let desc = crate::lang::get(code, "setserverlang_logs_embed_description_on_enable")
                .unwrap_or_default()
                .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
                .replace("${type}", code);
            let _ = serenity::ChannelId::new(log_id)
                .send_message(
                    ctx.http(),
                    serenity::CreateMessage::new().embed(
                        serenity::CreateEmbed::default()
                            .title(title)
                            .description(desc),
                    ),
                )
                .await;
        }
    }
    Ok(())
}

/// Set the server language (panel or direct code).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "setlang",
    aliases("setsrvlang", "lang"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setlang(
    ctx: Ctx<'_>,
    #[description = "Server language"] lang: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        let glang = crate::db::guild_lang(&ctx.data().pool, None).await;
        ctx.say(
            crate::lang::get(&glang, "msg_this_command_must_be_used_in_a_server")
                .unwrap_or_else(|| "This command must be used in a server.".to_string()),
        )
        .await?;
        return Ok(());
    };
    if let Some(given) = lang.map(|l| l.trim().to_string()).filter(|l| !l.is_empty()) {
        let Some(code) = parse_lang(&given).map(|c| c.to_string()) else {
            let glang = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
            ctx.say(
                crate::lang::get(&glang, "msg_invalid_language_supported_ar_eg_de_de_en_us_es_es_fr_fr_fr_me_it_it_jp_jp_pt_pt_ru_ru")
                    .unwrap_or_else(|| "Invalid language. Supported: ar-EG, de-DE, en-US, es-ES, fr-FR, fr-ME, it-IT, jp-JP, pt-PT, ru-RU.".to_string()),
            )
            .await?;
            return Ok(());
        };
        apply_language(&ctx, guild_id, &code).await?;
        let saved = with_type(
            &crate::lang::get(&code, "setserverlang_panel_saved")
                .unwrap_or_else(|| "The language has been successfully changed!".to_string()),
            &code,
        );
        ctx.say(saved).await?;
        return Ok(());
    }

    let pool = &ctx.data().pool;
    let gid = guild_id.get();
    let glang = crate::db::guild_lang(pool, Some(gid)).await;
    let current = crate::db::guild_lang(pool, Some(gid)).await;
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid.to_string()).await;
    let has_icon = footer_bytes.is_some();
    let placeholder =
        |code: &str| crate::lang::get(code, "setserverlang_panel_select").unwrap_or_default();

    let mut reply = poise::CreateReply::default()
        .embed(panel_embed(&glang, &current, &footer_name, has_icon))
        .components(vec![
            select_row(&current, placeholder(&glang), false),
            save_row(None),
        ]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(SETLANG_TIMEOUT_SECS);
    let mut selected: Option<String> = None;
    let mut saved = false;

    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .filter(|i| {
                i.data.custom_id == SETLANG_SELECT_ID || i.data.custom_id == SETLANG_SAVE_ID
            })
            .await
        else {
            break;
        };
        if press.user.id != author {
            let code = crate::db::guild_lang(pool, Some(gid)).await;
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(
                                crate::lang::get(&code, "help_not_for_you").unwrap_or_default(),
                            )
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        if press.data.custom_id == SETLANG_SELECT_ID {
            let serenity::ComponentInteractionDataKind::StringSelect { values } = &press.data.kind
            else {
                continue;
            };
            let Some(choice) = values.first().filter(|v| parse_lang(v).is_some()).cloned() else {
                continue;
            };
            selected = Some(choice.clone());
            // Live preview in the picked language, like the TS select
            // collector (title/description/field + default option follow
            // the selection).
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .embed(panel_embed(&choice, &choice, &footer_name, has_icon))
                            .components(vec![
                                select_row(&choice, placeholder(&choice), false),
                                save_row(None),
                            ]),
                    ),
                )
                .await;
        } else {
            let Some(code) = selected.clone() else {
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(placeholder(&glang))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                continue;
            };
            apply_language(&ctx, guild_id, &code).await?;
            let yes = crate::emojis::cached_emoji_entry(ctx.http(), "Yes").await;
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new().components(vec![
                            select_row(&code, placeholder(&code), true),
                            save_row(yes),
                        ]),
                    ),
                )
                .await;
            let saved_text = with_type(
                &crate::lang::get(&code, "setserverlang_panel_saved")
                    .unwrap_or_else(|| "The language has been successfully changed!".to_string()),
                &code,
            );
            let _ = press
                .create_followup(
                    ctx.http(),
                    serenity::CreateInteractionResponseFollowup::new()
                        .content(saved_text)
                        .ephemeral(true),
                )
                .await;
            saved = true;
            break;
        }
    }

    if !saved {
        // Collector ended without saving: disable both rows like the TS
        // end handler.
        let shown = selected.as_deref().unwrap_or(&current);
        let _ = msg
            .edit(
                ctx.http(),
                serenity::EditMessage::new().components(vec![
                    select_row(shown, placeholder(&glang), true),
                    serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
                        SETLANG_SAVE_ID,
                    )
                    .style(serenity::ButtonStyle::Primary)
                    .disabled(true)
                    .emoji(serenity::ReactionType::Unicode("💾".to_string()))]),
                ]),
            )
            .await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lang_table_covers_all_supported_codes() {
        assert_eq!(LANG_META.len(), 10);
        for code in super::super::SUPPORTED_LANGS {
            assert!(lang_meta(code).is_some(), "missing {code}");
        }
    }

    #[test]
    fn lang_meta_matches_ts_available_language() {
        assert_eq!(lang_meta("ar-EG"), Some(("Arab Egyptian", "🇪🇬")));
        assert_eq!(lang_meta("fr-ME"), Some(("Rude French", "🇫🇷")));
        assert_eq!(lang_meta("es-ES"), Some(("Spanish", "🇪🇸")));
        assert_eq!(lang_meta("xx-XX"), None);
    }

    #[test]
    fn current_field_value_formats_flag_name() {
        assert_eq!(current_field_value("en-US").as_deref(), Some("🇺🇸 English"));
        assert_eq!(current_field_value("xx-XX"), None);
    }

    #[test]
    fn with_type_fills_template_slot() {
        assert_eq!(with_type("now **${type}**", "fr-FR"), "now **fr-FR**");
        assert_eq!(with_type("no slot", "fr-FR"), "no slot");
    }
}
