use super::*;
use poise::serenity_prelude as serenity;
use std::collections::BTreeMap;

/// Canonical TS shape (`DbGuildAutoReact`): `{channelId: emoji | emoji[]}`.
/// Single strings normalize to one-element arrays on read, exactly like the
/// TS hybrid command does.
pub type AutoreactMap = BTreeMap<String, Vec<String>>;

fn normalize_value(v: &serde_json::Value) -> Option<Vec<String>> {
    match v {
        serde_json::Value::String(s) => Some(vec![s.clone()]),
        serde_json::Value::Array(arr) => {
            let out: Vec<String> = arr
                .iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect();
            Some(out)
        }
        _ => None,
    }
}

fn fold_list_shape(list: &[serde_json::Value]) -> AutoreactMap {
    let mut map: AutoreactMap = BTreeMap::new();
    for entry in list {
        let (Some(channel), Some(emoji)) = (
            entry.get("channelId").and_then(|c| c.as_str()),
            entry.get("emoji").and_then(|e| e.as_str()),
        ) else {
            continue;
        };
        let reactions = map.entry(channel.to_string()).or_default();
        if !reactions.iter().any(|e| e == emoji) {
            reactions.push(emoji.to_string());
        }
    }
    map
}

/// Parse any known stored shape into the canonical map: the TS nested map,
/// single-string values, or pre-recode list rows (`[{channelId, emoji}]`).
fn parse_autoreact_map(raw: &str) -> AutoreactMap {
    if let Ok(mixed) = serde_json::from_str::<BTreeMap<String, serde_json::Value>>(raw) {
        return mixed
            .into_iter()
            .filter_map(|(k, v)| normalize_value(&v).map(|emojis| (k, emojis)))
            .collect();
    }
    if let Ok(list) = serde_json::from_str::<Vec<serde_json::Value>>(raw) {
        return fold_list_shape(&list);
    }
    BTreeMap::new()
}

pub async fn save_autoreact_map_routed(
    pool: &crate::db::Pool,
    gid: &str,
    map: &AutoreactMap,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        gid,
        gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(map)?,
    )
    .await
}

/// Table-first read of the TS nested map with legacy fallback. List-shaped
/// rows are migrated to the map shape and persisted back.
pub async fn load_autoreact_map_routed(pool: &crate::db::Pool, gid: &str) -> AutoreactMap {
    let Some(raw) =
        crate::commands::owner::main::routed_get(pool, gid, gid, "GUILD.AUTOREACT").await
    else {
        return BTreeMap::new();
    };
    let map = parse_autoreact_map(&raw);
    if serde_json::from_str::<Vec<serde_json::Value>>(&raw).is_ok() {
        let _ = save_autoreact_map_routed(pool, gid, &map).await;
    }
    map
}

/// Reactions for one channel. Mirrors `Events/guildconfig/autoreact.ts`
/// (`GUILD.AUTOREACT.{channelId}`, string or array).
pub async fn reactions_for_channel_routed(
    pool: &crate::db::Pool,
    gid: &str,
    channel_id: &str,
) -> Vec<String> {
    load_autoreact_map_routed(pool, gid)
        .await
        .get(channel_id)
        .cloned()
        .unwrap_or_default()
}

/// Channel ids, numeric-descending like the TS config embed.
pub fn sorted_channel_ids(map: &AutoreactMap) -> Vec<String> {
    let mut ids: Vec<String> = map.keys().cloned().collect();
    ids.sort_by(
        |a, b| match (a.parse::<i64>().ok(), b.parse::<i64>().ok()) {
            (Some(x), Some(y)) => y.cmp(&x),
            _ => b.cmp(a),
        },
    );
    ids
}

/// Panel collector lifetime in seconds. Mirrors `time: 180_000` on the
/// TS button collector; the nested channel-select waits (`600_000` in
/// TS) share this single in-command deadline loop, following the
/// ignore-channels / media-only collector precedent.
pub const AUTOREACT_TIMEOUT_SECS: u64 = 180;
/// Channel cap. Mirrors the TS `currentValues.length >= 25` guard.
pub const AUTOREACT_MAX_ENTRIES: usize = 25;
/// Custom ids, byte-exact from `autoreact.ts`.
pub const AUTOREACT_PREV_ID: &str = "prev_page";
pub const AUTOREACT_NEXT_ID: &str = "next_page";
pub const AUTOREACT_ADD_ID: &str = "add_channel";
pub const AUTOREACT_REMOVE_ID: &str = "remove_channel";
pub const AUTOREACT_RETURN_ID: &str = "return_to_main";
pub const AUTOREACT_ADD_SELECT_ID: &str = "select_channel_to_add";
pub const AUTOREACT_REMOVE_SELECT_ID: &str = "select_channel_to_remove";
/// Modal + input ids, byte-exact from `autoreact.ts`
/// (`level_input_modal` / `reaction_input`).
pub const AUTOREACT_MODAL_ID: &str = "level_input_modal";
pub const AUTOREACT_INPUT_ID: &str = "reaction_input";

/// Total pages, minimum 1. Mirrors
/// `Math.max(1, Math.ceil(len / itemsPerPage))`.
pub fn autoreact_total_pages(count: usize) -> usize {
    count.div_ceil(5).max(1)
}

/// Prev-button disabled state. Mirrors `currentPage === 0`.
pub fn autoreact_prev_disabled(page0: usize) -> bool {
    page0 == 0
}

/// Next-button disabled state. Mirrors
/// `currentPage >= Math.floor(len / itemsPerPage)`.
pub fn autoreact_next_disabled(page0: usize, count: usize) -> bool {
    page0 >= count / 5
}

/// Trimmed modal input. Mirrors
/// `response2?.fields.getTextInputValue("reaction_input") || ""`.
pub fn normalize_reaction_input(raw: &str) -> String {
    raw.trim().to_string()
}

/// Insert-if-absent. Mirrors the TS add leg (`!includes -> push`).
/// Returns true when the map changed.
pub fn autoreact_add_reaction(map: &mut AutoreactMap, channel_id: &str, emoji: &str) -> bool {
    let reactions = map.entry(channel_id.to_string()).or_default();
    if reactions.iter().any(|e| e == emoji) {
        return false;
    }
    reactions.push(emoji.to_string());
    true
}

/// Remove a whole channel entry. Mirrors
/// `delete autoreactConfig[channelToRemove]`. Returns true when an
/// entry was removed.
pub fn autoreact_remove_channel(map: &mut AutoreactMap, channel_id: &str) -> bool {
    map.remove(channel_id).is_some()
}

/// Remove-select option label. Mirrors
/// `lang.var_text_channel + ": " + name` with the `var_unknown`
/// fallback for channels outside the guild cache.
pub fn autoreact_option_label(
    text_channel_label: &str,
    name: Option<&str>,
    unknown_label: &str,
) -> String {
    match name {
        Some(n) => format!("{text_channel_label}: {n}"),
        None => unknown_label.to_string(),
    }
}

fn tr_or(code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
}

/// Dashboard embed for 0-based `page0`. Mirrors `createRankRolesEmbed`
/// (desc-sorted slice, per-channel `Reaction: ...` fields, page footer,
/// timestamp).
fn render_autoreact_embed(
    code: &str,
    map: &AutoreactMap,
    ids: &[String],
    page0: usize,
    names: &std::collections::HashMap<String, String>,
) -> serenity::CreateEmbed {
    let page = autoreact_list_page(ids, page0 + 1);
    let mut embed = serenity::CreateEmbed::default()
        // discord.js `Colors.Blurple` (0x5865F2), not serenity's legacy
        // `Colour::BLURPLE` (0x7289DA) — prod renders 5793266.
        .colour(0x5865F2)
        .title(tr_or(code, "autoreact_embed_title", "Autoreact"))
        .description(crate::lang::get(code, "autoreact_embed_desc").unwrap_or_default());
    if page.is_empty() {
        embed = embed.field(
            tr_or(code, "var_no_set", "Not set"),
            crate::lang::get(code, "autoreact_embed_autofields_none_value").unwrap_or_default(),
            false,
        );
    } else {
        for id in page {
            let reactions = map.get(id).cloned().unwrap_or_default().join(" ");
            let value = crate::lang::get(code, "autoreact_embed_autofields_value")
                .map(|t| t.replace("${reaction}", &reactions))
                .unwrap_or(reactions);
            let name = match names.get(id) {
                Some(_) => format!("<#{id}>"),
                None => tr_or(code, "var_unknown", "Unknown"),
            };
            embed = embed.field(name, value, false);
        }
    }
    let total_page = autoreact_total_pages(ids.len());
    let footer = crate::lang::get(code, "autoreact_embed_footer")
        .map(|t| {
            t.replace("${currentPage}", &(page0 + 1).to_string())
                .replace("${totalPage}", &total_page.to_string())
                .replace("${totalReact}", &ids.len().to_string())
        })
        .unwrap_or_else(|| format!("Page {} of {total_page}", page0 + 1));
    embed
        .footer(serenity::CreateEmbedFooter::new(footer))
        .timestamp(serenity::Timestamp::now())
}

/// Navigation row. Mirrors `createActionRow` (prev/add/remove/next
/// with the TS disabled flags).
fn autoreact_main_row(code: &str, page0: usize, count: usize) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(AUTOREACT_PREV_ID)
            .label("<<<")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(autoreact_prev_disabled(page0)),
        serenity::CreateButton::new(AUTOREACT_ADD_ID)
            .label(tr_or(code, "autoreact_btn_add_name", "Add channel"))
            .style(serenity::ButtonStyle::Success),
        serenity::CreateButton::new(AUTOREACT_REMOVE_ID)
            .label(tr_or(code, "autoreact_btn_remove_name", "Remove channel"))
            .style(serenity::ButtonStyle::Danger),
        serenity::CreateButton::new(AUTOREACT_NEXT_ID)
            .label(">>>")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(autoreact_next_disabled(page0, count)),
    ])
}

/// Cancel row. Mirrors `createReturnRow`.
fn autoreact_return_row(code: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(AUTOREACT_RETURN_ID)
        .label(tr_or(code, "backup_cancel_button", "Cancel"))
        .style(serenity::ButtonStyle::Secondary)])
}

/// Guild-text channel picker. Mirrors the add-flow
/// `ChannelSelectMenuBuilder` (`select_channel_to_add`, GuildText
/// only).
fn autoreact_add_select_row(code: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            AUTOREACT_ADD_SELECT_ID,
            serenity::CreateSelectMenuKind::Channel {
                channel_types: Some(vec![serenity::ChannelType::Text]),
                default_channels: None,
            },
        )
        .placeholder(tr_or(
            code,
            "autoreact_menu_add_place",
            "Select a channel to add",
        )),
    )
}

/// Configured-channel picker. Mirrors the remove-flow
/// `StringSelectMenuBuilder` (`select_channel_to_remove`).
fn autoreact_remove_select_row(
    code: &str,
    ids: &[String],
    names: &std::collections::HashMap<String, String>,
) -> serenity::CreateActionRow {
    let text_label = tr_or(code, "var_text_channel", "Text channel");
    let unknown = tr_or(code, "var_unknown", "Unknown");
    let options: Vec<serenity::CreateSelectMenuOption> = ids
        .iter()
        .map(|id| {
            // Discord caps select option labels at 100 chars.
            let label: String =
                autoreact_option_label(&text_label, names.get(id).map(String::as_str), &unknown)
                    .chars()
                    .take(100)
                    .collect();
            serenity::CreateSelectMenuOption::new(label, id)
        })
        .collect();
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            AUTOREACT_REMOVE_SELECT_ID,
            serenity::CreateSelectMenuKind::String { options },
        )
        .placeholder(tr_or(
            code,
            "autoreact_menu_remove_place",
            "Select a channel to remove",
        )),
    )
}

/// Ephemeral reply to a component press. Mirrors the TS
/// `interaction2.reply({ flags: [1 << 6] })` guard rails.
async fn autoreact_ephemeral(
    http: &serenity::Http,
    press: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = press
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Ack-first defer. Mirrors the TS `interaction2.update` ack before
/// the panel message is re-edited.
async fn autoreact_defer(http: &serenity::Http, press: &serenity::ComponentInteraction) -> bool {
    press
        .create_response(
            http,
            serenity::CreateInteractionResponse::Defer(
                serenity::CreateInteractionResponseMessage::new(),
            ),
        )
        .await
        .is_ok()
}

/// Re-render the dashboard view (content cleared, like the TS
/// `content: null` edits).
async fn autoreact_edit_main(
    http: &serenity::Http,
    msg: &mut serenity::Message,
    code: &str,
    map: &AutoreactMap,
    ids: &[String],
    page0: usize,
    names: &std::collections::HashMap<String, String>,
) {
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new()
                .content("")
                .embeds(vec![render_autoreact_embed(code, map, ids, page0, names)])
                .components(vec![autoreact_main_row(code, page0, ids.len())]),
        )
        .await;
}

/// Sent specified emoji when new message in specified channel
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "autoreact",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Envoyer un emoji spécifié lorsqu'un nouveau message est envoyé dans un canal spécifié"
    ),
    description_localized("ja", "指定チャンネルの新規メッセージに指定絵文字を送信"),
    description_localized("ru", "Отправить эмодзи при новом сообщении в канале"),
    description_localized(
        "es-ES",
        "Enviar emoji especificado cuando haya nuevo mensaje en el canal especificado"
    )
)]
pub async fn gc_autoreact(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    // TS declares zero slash options: channel/emoji are picked via the
    // channel-select + modal collectors below.
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = ctx.data().pool.clone();
    // Ack-first + one round-trip for the lang row and the stored map.
    ctx.defer().await?;
    let (code, mut map) = tokio::join!(
        crate::db::guild_lang(&pool, Some(guild_id.get())),
        load_autoreact_map_routed(&pool, &gid)
    );
    let author = ctx.author().id;
    let http = ctx.http();
    let not_for_you = tr_or(
        &code,
        "help_not_for_you",
        "This interaction is not for you.",
    );
    // Channel-name lookup over the guild cache, mirroring
    // `interaction.guild?.channels.cache.get(channelId)`.
    let names: std::collections::HashMap<String, String> = ctx
        .cache()
        .guild(guild_id)
        .map(|g| {
            g.channels
                .iter()
                .map(|(id, c)| (id.get().to_string(), c.name.clone()))
                .collect()
        })
        .unwrap_or_default();
    let mut ids = sorted_channel_ids(&map);
    let mut page0: usize = 0;
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(render_autoreact_embed(&code, &map, &ids, page0, &names))
                .components(vec![autoreact_main_row(&code, page0, ids.len())]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let deadline =
        tokio::time::Instant::now() + std::time::Duration::from_secs(AUTOREACT_TIMEOUT_SECS);
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
            autoreact_ephemeral(http, &press, not_for_you.clone()).await;
            continue;
        }
        let id = press.data.custom_id.clone();
        if id == AUTOREACT_PREV_ID {
            page0 = page0.saturating_sub(1);
            if !autoreact_defer(http, &press).await {
                continue;
            }
            ids = sorted_channel_ids(&map);
            autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
        } else if id == AUTOREACT_NEXT_ID {
            // Mirrors `Math.min(Math.floor(len / itemsPerPage), page + 1)`.
            page0 = (page0 + 1).min(map.len() / 5);
            if !autoreact_defer(http, &press).await {
                continue;
            }
            ids = sorted_channel_ids(&map);
            autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
        } else if id == AUTOREACT_RETURN_ID {
            if !autoreact_defer(http, &press).await {
                continue;
            }
            ids = sorted_channel_ids(&map);
            autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
        } else if id == AUTOREACT_ADD_ID {
            if map.len() >= AUTOREACT_MAX_ENTRIES {
                autoreact_ephemeral(
                    http,
                    &press,
                    tr_or(
                        &code,
                        "autoreact_max_25",
                        "Maximum of 25 autoreact configurations can be set.",
                    ),
                )
                .await;
                continue;
            }
            if !autoreact_defer(http, &press).await {
                continue;
            }
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content(tr_or(
                            &code,
                            "autoreact_awaiting1_msg",
                            "Please select a channel to add to the autoreact module.",
                        ))
                        .components(vec![
                            autoreact_add_select_row(&code),
                            autoreact_return_row(&code),
                        ]),
                )
                .await;
        } else if id == AUTOREACT_ADD_SELECT_ID {
            let selected = match &press.data.kind {
                serenity::ComponentInteractionDataKind::ChannelSelect { values } => {
                    values.first().map(|c| c.get().to_string())
                }
                _ => continue,
            };
            let Some(selected) = selected else {
                continue;
            };
            // Mirrors the `level_input_modal` / `reaction_input` modal
            // (required Short, 1..=200 chars, no placeholder in TS).
            let mut opts = crate::modal_helper::ModalOptions::new(
                &tr_or(&code, "autoreact_modal_title", "AutoReact Configuration"),
                AUTOREACT_MODAL_ID,
            );
            opts.defer_update = false;
            opts.fields = vec![crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: AUTOREACT_INPUT_ID.to_string(),
                    label: tr_or(
                        &code,
                        "autoreact_modal_fields1_label",
                        "The reaction (emoji)",
                    ),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Short,
                    required: true,
                    max_length: Some(200),
                    min_length: Some(1),
                    value: None,
                },
            )];
            let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
                continue;
            };
            if press
                .create_response(http, serenity::CreateInteractionResponse::Modal(modal))
                .await
                .is_err()
            {
                continue;
            }
            let Some(submit) = crate::commands::await_modal_submit(
                ctx.serenity_context(),
                &press,
                AUTOREACT_MODAL_ID,
            )
            .await
            else {
                // Modal dismissed: back to the dashboard like the TS
                // select-timeout leg.
                ids = sorted_channel_ids(&map);
                autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
                continue;
            };
            let input = normalize_reaction_input(&crate::modal_helper::text_value(
                &submit,
                AUTOREACT_INPUT_ID,
            ));
            if input.is_empty()
                || (!crate::funcs::is_single_emoji(&input)
                    && !crate::funcs::is_discord_emoji(&input))
            {
                let _ = submit
                    .create_response(
                        http,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(tr_or(
                                    &code,
                                    "autoreact_invalid_emoji",
                                    "Invalid emoji. Please enter a valid emoji.",
                                ))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                ids = sorted_channel_ids(&map);
                autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
                continue;
            }
            if autoreact_add_reaction(&mut map, &selected, &input) {
                let _ = save_autoreact_map_routed(&pool, &gid, &map).await;
            }
            ids = sorted_channel_ids(&map);
            autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
            let _ = submit
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(tr_or(
                                &code,
                                "autoreact_add_command_ok",
                                "The autoreact configuration has been set.",
                            ))
                            .ephemeral(true),
                    ),
                )
                .await;
        } else if id == AUTOREACT_REMOVE_ID {
            ids = sorted_channel_ids(&map);
            if ids.is_empty() {
                autoreact_ephemeral(
                    http,
                    &press,
                    tr_or(
                        &code,
                        "autoreact_remove_not_found",
                        "No autoreact configurations set.",
                    ),
                )
                .await;
                autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
                continue;
            }
            if !autoreact_defer(http, &press).await {
                continue;
            }
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content(tr_or(
                            &code,
                            "autoreact_awaiting_remove_msg",
                            "Please select a channel to remove from the autoreact module.",
                        ))
                        .components(vec![
                            autoreact_remove_select_row(&code, &ids, &names),
                            autoreact_return_row(&code),
                        ]),
                )
                .await;
        } else if id == AUTOREACT_REMOVE_SELECT_ID {
            let selected = match &press.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned()
                }
                _ => continue,
            };
            let Some(selected) = selected else {
                continue;
            };
            if autoreact_remove_channel(&mut map, &selected) {
                let _ = save_autoreact_map_routed(&pool, &gid, &map).await;
            }
            ids = sorted_channel_ids(&map);
            // Plain HTTP edit first, then ack the select (mirrors the TS
            // `message.edit` + `response1.reply` order).
            autoreact_edit_main(http, &mut msg, &code, &map, &ids, page0, &names).await;
            autoreact_ephemeral(
                http,
                &press,
                tr_or(
                    &code,
                    "autoreact_remove_command_ok",
                    "The autoreact configuration for this channel has been removed.",
                ),
            )
            .await;
        }
    }
    // Collector `end` leg: strip the components like TS
    // (`message.edit({ components: [] })`).
    let _ = msg
        .edit(http, serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

/// Pure toggle for the greeting-reaction switch. Mirrors
/// `@toggle-react.ts` (`set(hey_reaction, !state)`): a missing key
/// reads as disabled, so the first toggle writes `true`.
pub fn toggle_hey_reaction_value(raw: Option<&str>) -> bool {
    !matches!(raw.map(|s| s.trim()), Some("true"))
}

/// Enable / Disable the reaction when user greets someone
#[poise::command(
    prefix_command,
    category = "guildconfig",
    rename = "toggle-react",
    aliases("react-toggle", "togglereact", "reacttoggle"),
    description_localized(
        "fr",
        "Activer/Désactiver la réaction lorsque l'utilisateur salue quelqu'un"
    ),
    description_localized("ja", "ユーザーが挨拶した時のリアクションを有効/無効"),
    description_localized("ru", "Включить/выключить реакцию при приветствии"),
    description_localized(
        "es-ES",
        "Habilitar / Deshabilitar la reacción cuando un usuario saluda a alguien"
    ),
    // @toggle-react.ts: permission ManageGuildExpressions.
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn gc_toggle_react(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    // Ack-first + one round-trip for the stored flag and the lang row
    // (the write below depends on the read, so only the lang fetch joins).
    ctx.defer().await?;
    let (raw, code) = tokio::join!(
        crate::commands::owner::main::routed_get(
            pool,
            &gid,
            &gid,
            "GUILD.GUILD_CONFIG.hey_reaction",
        ),
        crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get()))
    );
    let next = toggle_hey_reaction_value(raw.as_deref());
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "GUILD.GUILD_CONFIG.hey_reaction",
        &next.to_string(),
    )
    .await?;
    let active_msg = if next {
        crate::lang::get(&code, "toggle_react_react").unwrap_or_else(|| "react".to_string())
    } else {
        crate::lang::get(&code, "toggle_react_doesnt_react")
            .unwrap_or_else(|| "no longer react".to_string())
    };
    ctx.say(crate::lang::get(&code, "toggle_react_command_work")
            .map(|s| {
                s.replace("{activeMsg}", &active_msg).replace(
                    "${interaction.member?.id}",
                    &ctx.author().id.get().to_string(),
                )
            })
            .unwrap_or_else(|| {
                format!(
                    "<@{}>, now when a member sends a welcome message, the bot will **{active_msg}**",
                    ctx.author().id.get()
                )
            }),
    )
    .await?;
    Ok(())
}

/// One 5-per-page slice of the desc-sorted channel list (TS
/// `itemsPerPage = 5`, `parseInt(levelB) - parseInt(levelA)` order).
/// Pure so the paging math is unit-testable; page is 1-based.
pub fn autoreact_list_page(ids: &[String], page: usize) -> &[String] {
    let page = page.max(1);
    let start = (page - 1) * 5;
    if start >= ids.len() {
        return &[];
    }
    let end = (start + 5).min(ids.len());
    &ids[start..end]
}

/// Table-first autoreact list read with legacy fallback, kept for the
/// message-create emitter: same key (`GUILD.AUTOREACT`), derived as a
/// list view over the TS nested map so pre-recode list rows resolve too.
pub async fn load_autoreact_routed(pool: &crate::db::Pool, gid: &str) -> Vec<serde_json::Value> {
    let map = load_autoreact_map_routed(pool, gid).await;
    let mut list = Vec::new();
    for id in sorted_channel_ids(&map) {
        if let Some(emojis) = map.get(&id) {
            for emoji in emojis {
                list.push(serde_json::json!({"channelId": id, "emoji": emoji}));
            }
        }
    }
    list
}

/// Deprecated shim: TS `Events/guildconfig/autoreact.ts` has no master
/// switch (a configured channel always fires), so this is always on.
/// Kept so the emitter gate compiles while the phantom
/// `GUILD.AUTOREACT.enabled` key stays dead.
pub async fn autoreact_enabled_routed(_pool: &crate::db::Pool, _gid: &str) -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn list_page_slices_five_per_desc_page() {
        let ids: Vec<String> = (1..=7).map(|i| i.to_string()).collect();
        assert_eq!(
            autoreact_list_page(&ids, 1),
            &[
                "1".to_string(),
                "2".to_string(),
                "3".to_string(),
                "4".to_string(),
                "5".to_string()
            ]
        );
        assert_eq!(
            autoreact_list_page(&ids, 2),
            &["6".to_string(), "7".to_string()]
        );
        assert!(autoreact_list_page(&ids, 3).is_empty());
        assert_eq!(autoreact_list_page(&ids, 0).len(), 5);
        let empty: Vec<String> = vec![];
        assert!(autoreact_list_page(&empty, 1).is_empty());
    }

    #[test]
    fn parse_covers_map_single_string_and_list_shapes() {
        let map = parse_autoreact_map(r#"{"1": ["a", "c"], "2": "b"}"#);
        assert_eq!(
            map.get("1").unwrap(),
            &vec!["a".to_string(), "c".to_string()]
        );
        assert_eq!(map.get("2").unwrap(), &vec!["b".to_string()]);
        let migrated = parse_autoreact_map(r#"[{"channelId": "1", "emoji": "a"}]"#);
        assert_eq!(migrated.get("1").unwrap(), &vec!["a".to_string()]);
        assert!(parse_autoreact_map("0").is_empty());
    }

    #[tokio::test]
    async fn autoreact_write_routes_nested_map_to_table_and_legacy() {
        let pool = memory_pool().await;
        let mut map: AutoreactMap = BTreeMap::new();
        map.insert("1".to_string(), vec!["a".to_string(), "c".to_string()]);
        save_autoreact_map_routed(&pool, "g1", &map).await.unwrap();
        let routed = crate::commands::owner::main::routed_get(&pool, "g1", "g1", "GUILD.AUTOREACT")
            .await
            .unwrap();
        let doc: serde_json::Value = serde_json::from_str(&routed).unwrap();
        assert_eq!(doc.pointer("/1").unwrap(), &serde_json::json!(["a", "c"]));
        let legacy = crate::db::kv_get(&pool, "g1", "GUILD.AUTOREACT")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            serde_json::json!({"1": ["a", "c"]})
        );
        assert_eq!(
            reactions_for_channel_routed(&pool, "g1", "1").await,
            vec!["a".to_string(), "c".to_string()]
        );
        assert!(reactions_for_channel_routed(&pool, "g1", "9")
            .await
            .is_empty());
        // List view still feeds the emitter helper.
        assert_eq!(
            crate::commands::guildconfig::autoreact_for_channel(
                &load_autoreact_routed(&pool, "g1").await,
                "1"
            ),
            vec!["a".to_string(), "c".to_string()]
        );
        assert!(load_autoreact_routed(&pool, "g2").await.is_empty());
    }

    #[tokio::test]
    async fn autoreact_list_shaped_legacy_row_migrates_to_map() {
        let pool = memory_pool().await;
        crate::db::kv_set(
            &pool,
            "g1",
            "GUILD.AUTOREACT",
            &serde_json::json!([
                {"channelId": "2", "emoji": "b"},
                {"channelId": "2", "emoji": "b"},
                {"channelId": "2", "emoji": "d"},
            ])
            .to_string(),
        )
        .await
        .unwrap();
        assert_eq!(
            reactions_for_channel_routed(&pool, "g1", "2").await,
            vec!["b".to_string(), "d".to_string()]
        );
        // Migration persisted the map shape back over the legacy row.
        let legacy = crate::db::kv_get(&pool, "g1", "GUILD.AUTOREACT")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            serde_json::json!({"2": ["b", "d"]})
        );
    }

    #[tokio::test]
    async fn autoreact_switch_is_gone_and_single_string_normalizes() {
        let pool = memory_pool().await;
        assert!(autoreact_enabled_routed(&pool, "g1").await);
        crate::db::kv_set(&pool, "g1", "GUILD.AUTOREACT", r#"{"3": "z"}"#)
            .await
            .unwrap();
        assert_eq!(
            reactions_for_channel_routed(&pool, "g1", "3").await,
            vec!["z".to_string()]
        );
        // Phantom key is never written anymore.
        let phantom = crate::db::kv_get(&pool, "g1", "GUILD.AUTOREACT.enabled").await;
        assert_eq!(phantom, None);
    }

    #[test]
    fn hey_reaction_toggle_mirrors_ts_negation() {
        // TS `!state`: missing/false -> true, true -> false.
        assert!(toggle_hey_reaction_value(None));
        assert!(toggle_hey_reaction_value(Some("false")));
        assert!(!toggle_hey_reaction_value(Some("true")));
        assert!(!toggle_hey_reaction_value(Some(" true ")));
    }

    #[test]
    fn toggle_react_prefix_contract_matches_ts() {
        // PREFIX_IHORIZON_COMMAND, prefix-only, primary + 3 aliases
        // (@toggle-react.ts). The no-arg probe `.toggle-react` must
        // resolve at top level with no params (toggle + reply, so no
        // ArgumentParse denial is possible on that shape).
        let cmds = crate::commands::all();
        let cmd = cmds
            .iter()
            .find(|c| c.name == "toggle-react")
            .expect("toggle-react missing");
        assert!(cmd.prefix_action.is_some());
        assert!(cmd.slash_action.is_none());
        for alias in ["react-toggle", "togglereact", "reacttoggle"] {
            assert!(
                cmd.aliases.iter().any(|a| a == alias),
                "alias {alias} missing"
            );
        }
        assert!(cmd.parameters.is_empty());
    }

    #[test]
    fn panel_ids_are_ts_byte_exact() {
        assert_eq!(AUTOREACT_PREV_ID, "prev_page");
        assert_eq!(AUTOREACT_NEXT_ID, "next_page");
        assert_eq!(AUTOREACT_ADD_ID, "add_channel");
        assert_eq!(AUTOREACT_REMOVE_ID, "remove_channel");
        assert_eq!(AUTOREACT_RETURN_ID, "return_to_main");
        assert_eq!(AUTOREACT_ADD_SELECT_ID, "select_channel_to_add");
        assert_eq!(AUTOREACT_REMOVE_SELECT_ID, "select_channel_to_remove");
        assert_eq!(AUTOREACT_MODAL_ID, "level_input_modal");
        assert_eq!(AUTOREACT_INPUT_ID, "reaction_input");
    }

    #[test]
    fn paging_math_mirrors_ts_buttons() {
        // totalPage = max(1, ceil(len / 5)).
        assert_eq!(autoreact_total_pages(0), 1);
        assert_eq!(autoreact_total_pages(1), 1);
        assert_eq!(autoreact_total_pages(5), 1);
        assert_eq!(autoreact_total_pages(6), 2);
        assert_eq!(autoreact_total_pages(25), 5);
        // prev disabled on page 0 only.
        assert!(autoreact_prev_disabled(0));
        assert!(!autoreact_prev_disabled(1));
        // next disabled when page >= floor(len / 5) (with exactly 5
        // entries TS still enables next, landing on an empty page).
        assert!(autoreact_next_disabled(0, 0));
        assert!(!autoreact_next_disabled(0, 5));
        assert!(!autoreact_next_disabled(0, 6));
        assert!(autoreact_next_disabled(1, 6));
        assert!(!autoreact_next_disabled(1, 11));
    }

    #[test]
    fn modal_input_trims_like_ts_fallback() {
        assert_eq!(normalize_reaction_input("  🎉  "), "🎉");
        assert_eq!(normalize_reaction_input(""), "");
        assert_eq!(normalize_reaction_input("   "), "");
    }

    #[test]
    fn add_dedupes_and_remove_drops_channel() {
        let mut map: AutoreactMap = BTreeMap::new();
        assert!(autoreact_add_reaction(&mut map, "7", "a"));
        // Duplicate emoji on the same channel is a no-op.
        assert!(!autoreact_add_reaction(&mut map, "7", "a"));
        assert!(autoreact_add_reaction(&mut map, "7", "b"));
        assert_eq!(
            map.get("7").unwrap(),
            &vec!["a".to_string(), "b".to_string()]
        );
        // Id list stays desc-sorted for the dashboard + remove picker.
        autoreact_add_reaction(&mut map, "3", "z");
        assert_eq!(
            sorted_channel_ids(&map),
            vec!["7".to_string(), "3".to_string()]
        );
        assert!(!autoreact_remove_channel(&mut map, "9"));
        assert!(autoreact_remove_channel(&mut map, "7"));
        assert_eq!(sorted_channel_ids(&map), vec!["3".to_string()]);
    }

    #[test]
    fn dashboard_embed_uses_discordjs_blurple_not_legacy() {
        // TS `Colors.Blurple` = 0x5865F2 (5793266, prod-observed);
        // serenity `Colour::BLURPLE` is the legacy 0x7289DA (7506394).
        let map: AutoreactMap = BTreeMap::new();
        let ids: Vec<String> = vec![];
        let names: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        let json =
            serde_json::to_value(&render_autoreact_embed("en-US", &map, &ids, 0, &names)).unwrap();
        assert_eq!(json.get("color").and_then(|c| c.as_u64()), Some(0x5865F2));
    }

    #[test]
    fn remove_option_label_falls_back_to_unknown() {
        assert_eq!(
            autoreact_option_label("Text channel", Some("general"), "Unknown"),
            "Text channel: general"
        );
        assert_eq!(
            autoreact_option_label("Text channel", None, "Unknown"),
            "Unknown"
        );
    }

    #[tokio::test]
    async fn toggle_react_round_trips_through_routed_store() {
        let pool = memory_pool().await;
        let key = "GUILD.GUILD_CONFIG.hey_reaction";
        // Missing key enables first (TS `!undefined === true`)...
        let raw = crate::commands::owner::main::routed_get(&pool, "g1", "g1", key).await;
        assert!(raw.is_none());
        let next = toggle_hey_reaction_value(raw.as_deref());
        assert!(next);
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", key, &next.to_string())
            .await
            .unwrap();
        // ...then disables (TS `!true === false`).
        let raw2 = crate::commands::owner::main::routed_get(&pool, "g1", "g1", key).await;
        assert_eq!(raw2.as_deref(), Some("true"));
        assert!(!toggle_hey_reaction_value(raw2.as_deref()));
    }
}
