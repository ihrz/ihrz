use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

/// Giveaway manager config. Mirrors the GiveawayManager options in
/// core.ts (botsCanWin is inherent: only button users enter).
pub const GW_COLOR: u32 = 0x9a5af2;
pub const GW_END_COLOR: u32 = 0x2f3136;
pub const GW_REACTION: &str = "🎉";
/// TS-verbatim button ids (unique in the shared component router).
pub const GW_ENTRY_ID: &str = "confirm-entry-giveaway";
pub const GW_LIST_ID: &str = "giveaway-list-entries";
pub const GW_LEAVE_ID: &str = "giveaway-leave";
/// Namespaced pager (bare previousPage/nextPage are unsafe shared).
pub const GW_ENTRIES_PAGE_PREFIX: &str = "gw-entries:";
/// Winners link button on ended boards. Mirrors the Finnish button.
pub const GW_FINISH_URL: &str =
    "https://media.tenor.com/uO4u0ib3oK0AAAAC/done-and-done-spongebob.gif";
/// Entries pager page size. Mirrors usersPerPage in listEntries.
pub const GW_ENTRIES_PER_PAGE: usize = 10;

pub fn gw_entries_page_id(message_id: u64, page: usize) -> String {
    format!("{GW_ENTRIES_PAGE_PREFIX}{message_id}:{page}")
}

/// Split entries into (title, description) pages of
/// GW_ENTRIES_PER_PAGE `N. <@id>` lines. Mirrors listEntries paging.
pub fn entries_pages(title: &str, entries: &[String]) -> Vec<(String, String)> {
    entries
        .chunks(GW_ENTRIES_PER_PAGE)
        .enumerate()
        .map(|(page, chunk)| {
            let desc = chunk
                .iter()
                .enumerate()
                .map(|(i, id)| format!("{}. <@{id}>", page * GW_ENTRIES_PER_PAGE + i + 1))
                .collect::<Vec<_>>()
                .join("\n");
            (title.to_string(), desc)
        })
        .collect()
}

/// Bump the `Entries: **N**` line in a board description.
/// Mirrors the `event_gw_entries_words: \*\*\d+\*\*` regex replace
/// in addEntries/removeEntries. Returns (new_desc, replaced).
pub fn bump_entries_count(desc: &str, words: &str, count: usize) -> (String, bool) {
    let needle = format!("{words}: **");
    let Some(start) = desc.find(needle.as_str()) else {
        return (desc.to_string(), false);
    };
    let num_start = start + needle.len();
    let tail = &desc[num_start..];
    let num_end = tail.find("**").map(|i| num_start + i);
    let Some(num_end) = num_end else {
        return (desc.to_string(), false);
    };
    if !desc[num_start..num_end].chars().all(|c| c.is_ascii_digit()) {
        return (desc.to_string(), false);
    }
    let mut out = desc[..num_start].to_string();
    out.push_str(&count.to_string());
    out.push_str(&desc[num_end..]);
    (out, true)
}

/// Apply the stored embed image (TS setImage(embedImageURL)).
pub fn apply_giveaway_image(
    embed: serenity::CreateEmbed,
    image_url: Option<&str>,
) -> serenity::CreateEmbed {
    match image_url {
        Some(url) => embed.image(url.to_string()),
        None => embed,
    }
}

/// Render the /<t:R> + /<t:D> end stamps. Mirrors discord.js
/// time(date, "R"/"D").
pub fn stamp_pair(expire_in_ms: i64) -> (String, String) {
    let secs = expire_in_ms / 1000;
    (format!("<t:{secs}:R>"), format!("<t:{secs}:D>"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Giveaway {
    pub guild_id: String,
    pub channel_id: String,
    pub winner_count: u32,
    pub prize: String,
    pub hosted_by: String,
    pub expire_in_ms: i64,
    #[serde(default)]
    pub ended: bool,
    #[serde(default)]
    pub entries: Vec<String>,
    #[serde(default)]
    pub winners: Vec<String>,
    /// none | invites | messages | roles (mirrors create requirement choice).
    #[serde(default = "default_req")]
    pub requirement: String,
    #[serde(default)]
    pub requirement_value: String,
    /// Validated embed image URL (mirrors create embedImageURL via
    /// mediaManipulation.isImageUrl; display rework pending).
    #[serde(default)]
    pub embed_image_url: Option<String>,
}

fn default_req() -> String {
    "none".to_string()
}

/// Requirement gate. Mirrors the entry checks in giveawaysManager.
pub async fn check_requirement(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    member_roles: &[u64],
    requirement: &str,
    value: &str,
) -> bool {
    match requirement {
        "invites" => {
            let need: i64 = value.trim().parse().unwrap_or(i64::MAX);
            let stats =
                crate::commands::invitesmanager::inv::load_invites(pool, guild_id, user_id).await;
            stats.invites >= need
        }
        "messages" => {
            let need: u64 = value.trim().parse().unwrap_or(u64::MAX);
            let stats = crate::commands::stats::main::load_stats(pool, guild_id, user_id).await;
            stats.messages >= need
        }
        "roles" => value
            .trim()
            .parse::<u64>()
            .map(|need| member_roles.contains(&need))
            .unwrap_or(false),
        _ => true,
    }
}

pub fn giveaway_key(message_id: u64) -> String {
    format!("GIVEAWAY.{message_id}")
}

/// Join a giveaway entry list. Returns false when already entered
/// (mirrors AvoidDoubleEntries in giveawaysManager).
pub fn join_giveaway(entries: &mut Vec<String>, user_id: &str) -> bool {
    if entries.iter().any(|e| e == user_id) {
        return false;
    }
    entries.push(user_id.to_string());
    true
}

/// Deterministic winner pick (xorshift over entries), excluding
/// past winners like selectWinners. Mirrors tirage; production
/// shuffles with randomness, tests stay deterministic.
pub fn pick_winners(
    entries: &[String],
    exclude: &[String],
    count: usize,
    seed: u64,
) -> Vec<String> {
    let mut pool: Vec<String> = entries.to_vec();
    pool.sort();
    pool.dedup();
    pool.retain(|e| !exclude.contains(e));
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = vec![];
    let n = count.min(pool.len());
    for _ in 0..n {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        let idx = (state % pool.len() as u64) as usize;
        out.push(pool.remove(idx));
    }
    out
}

/// Bot footer (name + optional icon bytes) without a poise Ctx.
/// Mirrors footerBuilder/footerAttachmentBuilder for the giveaway
/// embeds posted/edited from commands, buttons and the scheduler.
pub async fn giveaway_footer(
    pool: &crate::db::Pool,
    http: &std::sync::Arc<serenity::Http>,
    guild_id: &str,
) -> (String, Option<Vec<u8>>) {
    let name = crate::commands::botcat::bot_footer_name(
        crate::db::kv_get(pool, guild_id, crate::commands::botcat::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let stored = crate::db::kv_get(pool, guild_id, crate::commands::botcat::BOT_PFP_KEY).await;
    match crate::commands::botcat::footer_icon_bytes(stored.as_deref()) {
        Some(bytes) => (name, Some(bytes)),
        None => {
            let face = http
                .get_current_user()
                .await
                .map(|u| u.face())
                .unwrap_or_default();
            let bytes = if face.is_empty() {
                None
            } else {
                crate::commands::botcat::download_bytes(&face).await
            };
            (name, bytes)
        }
    }
}

/// Apply the shared footer to a giveaway embed, reporting whether
/// the icon file must be uploaded alongside.
pub fn giveaway_embed_footer(
    embed: serenity::CreateEmbed,
    footer_name: &str,
    with_icon: bool,
) -> serenity::CreateEmbed {
    let footer = serenity::CreateEmbedFooter::new(footer_name.to_string());
    embed.footer(if with_icon {
        footer.icon_url("attachment://footer_icon.png")
    } else {
        footer
    })
}

/// Entry + participants buttons for a live board. Mirrors the
/// confirm/giveaway-list-entries row in create().
pub fn giveaway_entry_row(entries_label: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(GW_ENTRY_ID)
            .emoji(serenity::ReactionType::Unicode(GW_REACTION.to_string()))
            .style(serenity::ButtonStyle::Primary),
        serenity::CreateButton::new(GW_LIST_ID)
            .label(entries_label)
            .style(serenity::ButtonStyle::Secondary),
    ])
}

/// Winners link button for ended boards. Mirrors the Finnish button.
pub fn giveaway_finish_row(finish_label: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new_link(GW_FINISH_URL).label(finish_label)
    ])
}

/// Ended-board embed shell (title + desc + image + footer).
/// Mirrors the finish()/reroll() embeds (GW_END_COLOR).
pub fn ended_board_shell(
    prize: &str,
    desc: String,
    image_url: Option<&str>,
    footer_name: &str,
    with_icon: bool,
    now_secs: i64,
) -> serenity::CreateEmbed {
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(GW_END_COLOR))
        .title(prize.to_string())
        .description(desc)
        .timestamp(unix_ts(now_secs));
    let embed = giveaway_embed_footer(embed, footer_name, with_icon);
    apply_giveaway_image(embed, image_url)
}

/// Unix timestamp that never panics: out-of-range input falls back to
/// the epoch, and `now()` is the infallible terminal fallback.
pub fn unix_ts(secs: i64) -> serenity::Timestamp {
    serenity::Timestamp::from_unix_timestamp(secs)
        .or_else(|_| serenity::Timestamp::from_unix_timestamp(0))
        .unwrap_or_else(|_| serenity::Timestamp::now())
}

/// Winners line: `<@a>,<@b>` or the None fallback. Mirrors
/// finish() (`join(",")`, null -> setjoinroles_var_none).
pub fn winners_line(winners: &[String], none_word: &str) -> String {
    if winners.is_empty() {
        none_word.to_string()
    } else {
        winners
            .iter()
            .map(|w| format!("<@{w}>"))
            .collect::<Vec<_>>()
            .join(",")
    }
}

/// End a giveaway board: pick winners (excluding past), persist,
/// edit the message with the ended embed + Finnish button, reply
/// winners/cannot. Mirrors finish(). Returns false when the board
/// message is gone (caller deletes the row, like the TS
/// fetch().catch(delete)).
#[allow(clippy::too_many_arguments)]
pub async fn finish_giveaway(
    pool: &crate::db::Pool,
    http: &std::sync::Arc<serenity::Http>,
    gid: &str,
    mid: u64,
    gw: &mut Giveaway,
    seed: u64,
    lang_code: &str,
    now_secs: i64,
) -> bool {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    gw.winners = pick_winners(&gw.entries, &gw.winners, gw.winner_count as usize, seed);
    gw.ended = true;
    let _ = crate::db::kv_set(
        pool,
        gid,
        &giveaway_key(mid),
        &serde_json::to_string(&gw).unwrap_or_default(),
    )
    .await;
    let Ok(channel_id) = gw.channel_id.parse::<u64>() else {
        return false;
    };
    let channel = serenity::ChannelId::new(channel_id);
    let Ok(message) = channel.message(http, serenity::MessageId::new(mid)).await else {
        return false;
    };
    let (time1, time2) = stamp_pair(gw.expire_in_ms);
    let desc = t("event_gw_ended_embed_desc")
        .replace("${time1}", &time1)
        .replace("${time2}", &time2)
        .replace("${fetch.hostedBy}", &gw.hosted_by)
        .replace("${fetch.entries.length}", &gw.entries.len().to_string())
        .replace(
            "${winners}",
            &winners_line(&gw.winners, &t("setjoinroles_var_none")),
        );
    let (footer_name, footer_icon) = giveaway_footer(pool, http, gid).await;
    let embed = ended_board_shell(
        &gw.prize,
        desc,
        gw.embed_image_url.as_deref(),
        &footer_name,
        footer_icon.is_some(),
        now_secs,
    );
    let edit = serenity::EditMessage::new()
        .embed(embed)
        .components(vec![giveaway_finish_row(&t(
            "event_gw_finnish_button_title",
        ))]);
    let _ = channel.edit_message(http, message.id, edit).await;
    if gw.winners.is_empty() {
        let _ = message.reply(http, t("event_gw_finnish_cannot_msg")).await;
    } else {
        let content = t("event_gw_reroll_win_msg")
            .replace(
                "${winners}",
                &gw.winners
                    .iter()
                    .map(|w| format!("<@{w}>"))
                    .collect::<Vec<_>>()
                    .join(","),
            )
            .replace("${fetch[channelId][messageId].prize}", &gw.prize);
        let _ = message.reply(http, content).await;
    }
    true
}

/// Rebuild a board embed from the posted one with a new
/// description (footer/timestamp/color preserved). Mirrors
/// EmbedBuilder.from(message.embeds[0]).setDescription(...).
pub fn restyle_board_embed(embed: &serenity::Embed, desc: String) -> serenity::CreateEmbed {
    let mut out = serenity::CreateEmbed::default().description(desc);
    if let Some(title) = &embed.title {
        out = out.title(title.clone());
    }
    if let Some(color) = embed.colour {
        out = out.colour(color);
    }
    if let Some(image) = &embed.image {
        out = out.image(image.url.clone());
    }
    if let Some(footer) = &embed.footer {
        let mut foot = serenity::CreateEmbedFooter::new(footer.text.clone());
        if let Some(icon) = &footer.icon_url {
            foot = foot.icon_url(icon.clone());
        }
        out = out.footer(foot);
    }
    if let Some(ts) = embed.timestamp {
        out = out.timestamp(ts);
    }
    out
}

/// Load a giveaway row by board message id.
pub async fn load_giveaway(
    pool: &crate::db::Pool,
    gid: &str,
    mid: u64,
) -> Option<serde_json::Value> {
    crate::db::kv_get(pool, gid, &giveaway_key(mid))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

/// Entry button flow. Mirrors addEntries/removeEntries: requirement
/// gate (event_gw_break_req), leave-confirm on re-press, live
/// Entries count edit on join.
pub async fn handle_giveaway_entry(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let mid = comp.message.id.get();
    let Some(mut v) = load_giveaway(pool, &gid, mid).await else {
        return;
    };
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mut entries: Vec<String> = v
        .get("entries")
        .and_then(|e| serde_json::from_value(e.clone()).ok())
        .unwrap_or_default();
    let requirement = v
        .get("requirement")
        .and_then(|r| r.as_str())
        .unwrap_or("none")
        .to_string();
    let req_value = v
        .get("requirement_value")
        .and_then(|r| r.as_str())
        .unwrap_or("")
        .to_string();
    let roles: Vec<u64> = guild_id
        .member(http, comp.user.id)
        .await
        .map(|m| m.roles.iter().map(|r| r.get()).collect())
        .unwrap_or_default();
    if !check_requirement(
        pool,
        &gid,
        comp.user.id.get(),
        &roles,
        &requirement,
        &req_value,
    )
    .await
    {
        let no = crate::emojis::app_emoji_markup(http, "No")
            .await
            .unwrap_or_default();
        let content = t("event_gw_break_req")
            .replace("${giveawayData?.requirement.value}", &req_value)
            .replace("${giveawayData?.requirement.type}", &requirement)
            .replace("${interaction.client.iHorizon_Emojis.No}", &no);
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(content)
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }
    let uid = comp.user.id.get().to_string();
    if entries.iter().any(|e| e == &uid) {
        // Already in: leave-confirm step (60s TS collector becomes a
        // stateless leave button carrying the board id).
        let content =
            t("event_gw_confirm_leave_msg").replace("${interaction.user}", &comp.user.to_string());
        let row = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(format!(
            "{GW_LEAVE_ID}:{mid}"
        ))
        .label(t("event_gw_leave_button_placeholder"))
        .style(serenity::ButtonStyle::Danger)]);
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(content)
                        .components(vec![row])
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }
    entries.push(uid);
    let new_count = entries.len();
    if let Some(obj) = v.as_object_mut() {
        obj.insert("entries".into(), serde_json::json!(entries));
    }
    let _ = crate::db::kv_set(pool, &gid, &giveaway_key(mid), &v.to_string()).await;
    // Live count edit (deferUpdate + message.edit in TS, one
    // UpdateMessage response here).
    let words = t("event_gw_entries_words");
    if let Some(posted) = comp.message.embeds.first() {
        let (desc, _) = bump_entries_count(
            &posted.description.clone().unwrap_or_default(),
            &words,
            new_count,
        );
        let embed = restyle_board_embed(posted, desc);
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new().embed(embed),
                ),
            )
            .await;
    } else {
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("event_gw_entries_button_title"))
                        .ephemeral(true),
                ),
            )
            .await;
    }
}

/// Leave-confirm button (`giveaway-leave:<mid>`). Mirrors the
/// collector leg in removeEntries: DB removal, board count edit,
/// confirm text on the ephemeral prompt.
pub async fn handle_giveaway_leave(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
    mid: u64,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mut entries: Vec<String> = load_giveaway(pool, &gid, mid)
        .await
        .and_then(|v| v.get("entries").cloned())
        .and_then(|e| serde_json::from_value(e).ok())
        .unwrap_or_default();
    let uid = comp.user.id.get().to_string();
    entries.retain(|e| e != &uid);
    if let Some(mut v) = load_giveaway(pool, &gid, mid).await {
        if let Some(obj) = v.as_object_mut() {
            obj.insert("entries".into(), serde_json::json!(entries.clone()));
        }
        let _ = crate::db::kv_set(pool, &gid, &giveaway_key(mid), &v.to_string()).await;
    }
    // Board count edit (best-effort fetch of the board message).
    if let Ok(channel) = comp.channel_id.to_channel(http).await {
        if let Ok(board) = channel
            .id()
            .message(http, serenity::MessageId::new(mid))
            .await
        {
            if let Some(posted) = board.embeds.first() {
                let words = t("event_gw_entries_words");
                let (desc, _) = bump_entries_count(
                    &posted.description.clone().unwrap_or_default(),
                    &words,
                    entries.len(),
                );
                let edit = serenity::EditMessage::new().embed(restyle_board_embed(posted, desc));
                let _ = channel.id().edit_message(http, board.id, edit).await;
            }
        }
    }
    let content =
        t("event_gw_removeentries_msg").replace("${interaction.user}", &comp.user.to_string());
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .components(vec![]),
            ),
        )
        .await;
}

/// Participants button. Mirrors listEntries (ephemeral page 0 +
/// stateless pager; the 15-min TS collector has no equivalent).
pub async fn handle_giveaway_list(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let mid = comp.message.id.get();
    let Some(v) = load_giveaway(pool, &gid, mid).await else {
        return;
    };
    let row_gid = v.get("guild_id").and_then(|g| g.as_str()).unwrap_or("");
    if row_gid != gid {
        return;
    }
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let entries: Vec<String> = v
        .get("entries")
        .and_then(|e| serde_json::from_value(e.clone()).ok())
        .unwrap_or_default();
    if entries.is_empty() {
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("history_no_entries"))
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }
    send_entries_page(http, pool, comp, mid, &entries, 0).await;
}

/// Pure entries-page render shared by the list button, the pager
/// and the `list-entries` slash subcommand.
pub async fn render_entries_page(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    t: impl Fn(&str) -> String,
    mid: u64,
    entries: &[String],
    page: usize,
) -> Option<(serenity::CreateEmbed, Vec<serenity::CreateActionRow>)> {
    let pages = entries_pages(&t("event_gw_entries_button_title"), entries);
    if pages.is_empty() {
        return None;
    }
    let page = page.min(pages.len() - 1);
    let (footer_name, _) = giveaway_footer(pool, http, gid).await;
    let footer = format!(
        "{} • {} {}/{}",
        footer_name,
        t("var_page"),
        page + 1,
        pages.len()
    );
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(GW_COLOR))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(serenity::CreateEmbedFooter::new(footer).icon_url("attachment://footer_icon.png"))
        .timestamp(unix_ts(crate::commands::schedule::main::now_ms() / 1000));
    let mut components = vec![];
    if pages.len() > 1 {
        components.push(entries_pager_row(mid, page, pages.len()));
    }
    Some((embed, components))
}

/// Ephemeral entries page render shared by the list button, the
/// pager and the `list-entries` slash subcommand.
pub async fn send_entries_page(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
    mid: u64,
    entries: &[String],
    page: usize,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some((embed, components)) =
        render_entries_page(http, pool, &gid, t, mid, entries, page).await
    else {
        return;
    };
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(components)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Entries pager press (`gw-entries:<mid>:<page>`).
pub async fn handle_giveaway_entries_page(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
    mid: u64,
    page: usize,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some(v) = load_giveaway(pool, &gid, mid).await else {
        return;
    };
    let entries: Vec<String> = v
        .get("entries")
        .and_then(|e| serde_json::from_value(e.clone()).ok())
        .unwrap_or_default();
    if entries.is_empty() {
        return;
    }
    let pages = entries_pages(&t("event_gw_entries_button_title"), &entries);
    if pages.is_empty() {
        return;
    }
    let page = page.min(pages.len() - 1);
    let (footer_name, _) = giveaway_footer(pool, http, &gid).await;
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(GW_COLOR))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(
            serenity::CreateEmbedFooter::new(format!(
                "{} • {} {}/{}",
                footer_name,
                t("var_page"),
                page + 1,
                pages.len()
            ))
            .icon_url("attachment://footer_icon.png"),
        )
        .timestamp(unix_ts(crate::commands::schedule::main::now_ms() / 1000));
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(vec![entries_pager_row(mid, page, pages.len())]),
            ),
        )
        .await;
}

/// Pager row for the entries list. Page rides in the button ids
/// (stateless; the 15-min TS collector has no equivalent).
pub fn entries_pager_row(message_id: u64, page: usize, pages: usize) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(gw_entries_page_id(message_id, page.saturating_sub(1)))
            .label("<<<")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(page == 0),
        serenity::CreateButton::new(gw_entries_page_id(
            message_id,
            (page + 1).min(pages.saturating_sub(1)),
        ))
        .label(">>>")
        .style(serenity::ButtonStyle::Secondary)
        .disabled(page + 1 >= pages),
    ])
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "giveaway",
    rename = "gw",
    subcommands(
        "gw_create",
        "gw_end",
        "gw_reroll",
        "gw_list",
        "gw_entries",
        "gw_get_data",
        "gw_get_all"
    )
)]
pub async fn giveaway(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
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
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &giveaway_key(mid),
        &serde_json::to_string(&gw)?,
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "end",
    aliases("gstop", "gbreak"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_end(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    let code_early = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    let Some(raw) = raw else {
        ctx.say(t_early("end_not_find_giveaway").replace("${gw}", message_id.trim()))
            .await?;
        return Ok(());
    };
    let mut gw: Giveaway = serde_json::from_str(&raw).unwrap_or_else(|_| Giveaway {
        guild_id: gid.clone(),
        channel_id: String::new(),
        winner_count: 1,
        prize: String::new(),
        hosted_by: String::new(),
        expire_in_ms: 0,
        ended: false,
        entries: vec![],
        winners: vec![],
        requirement: "none".to_string(),
        requirement_value: String::new(),
        embed_image_url: None,
    });
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    if gw.ended {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "end_command_error").unwrap_or_default())
            .await?;
        return Ok(());
    }
    // Shared end flow: winners, board edit, winners reply.
    // Mirrors end() -> finish().
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let now_secs = seed / 1_000_000_000;
    let lived = finish_giveaway(
        pool,
        &ctx.serenity_context().http,
        &gid,
        mid,
        &mut gw,
        seed,
        &code,
        now_secs as i64,
    )
    .await;
    if !lived {
        // Board message gone: drop the row like the TS fetch catch.
        let _ = crate::db::kv_del(pool, &gid, &giveaway_key(mid)).await;
        ctx.say(crate::lang::get(&code, "event_gw_finnish_cannot_msg").unwrap_or_default())
            .await?;
    }
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "reroll",
    aliases("re"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn gw_reroll(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    let code_early = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    let Some(raw) = raw else {
        ctx.say(t_early("reroll_dont_find_giveaway").replace("{args}", message_id.trim()))
            .await?;
        return Ok(());
    };
    let mut gw: Giveaway = serde_json::from_str(&raw).unwrap_or_else(|_| Giveaway {
        guild_id: gid.clone(),
        channel_id: String::new(),
        winner_count: 1,
        prize: String::new(),
        hosted_by: String::new(),
        expire_in_ms: 0,
        ended: true,
        entries: vec![],
        winners: vec![],
        requirement: "none".to_string(),
        requirement_value: String::new(),
        embed_image_url: None,
    });
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1)
        .wrapping_add(1);
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if !gw.ended {
        ctx.say(t("reroll_giveaway_not_over")).await?;
        return Ok(());
    }
    // Fresh winners excluding past ones, like selectWinners.
    // Mirrors reroll().
    gw.winners = pick_winners(
        &gw.entries,
        &gw.winners.clone(),
        gw.winner_count as usize,
        seed,
    );
    let winners_now = gw.winners.clone();
    let _ = crate::db::kv_set(pool, &gid, &giveaway_key(mid), &serde_json::to_string(&gw)?).await;
    let http = &ctx.serenity_context().http;
    let Ok(channel) = gw.channel_id.parse::<u64>() else {
        return Ok(());
    };
    let channel = serenity::ChannelId::new(channel);
    let Ok(message) = channel.message(http, serenity::MessageId::new(mid)).await else {
        // Board message gone: drop the row like the TS fetch catch.
        let _ = crate::db::kv_del(pool, &gid, &giveaway_key(mid)).await;
        return Ok(());
    };
    let (ended, time2) = stamp_pair(gw.expire_in_ms);
    let desc = t("event_gw_ended_word")
        .replace(
            "${winners}",
            &winners_line(&winners_now, &t("setjoinroles_var_none")),
        )
        .replace("${ended}", &ended)
        .replace("${time2}", &time2)
        .replace("${hostedBy}", &gw.hosted_by)
        .replace("${entries}", &gw.entries.len().to_string());
    let (footer_name, footer_icon) = giveaway_footer(pool, http, &gid).await;
    let embed = ended_board_shell(
        &gw.prize,
        desc,
        gw.embed_image_url.as_deref(),
        &footer_name,
        footer_icon.is_some(),
        crate::commands::schedule::main::now_ms() / 1000,
    );
    let mut edit = serenity::EditMessage::new().embed(embed);
    if let Some(icon) = footer_icon {
        edit = edit.attachments(crate::commands::embed::embed_builder::edit_attachments(
            vec![serenity::CreateAttachment::bytes(icon, "footer_icon.png")],
        ));
    }
    let _ = channel.edit_message(http, message.id, edit).await;
    if winners_now.first().map(|w| w.as_str()) == Some("None") || winners_now.is_empty() {
        let _ = message.reply(http, t("event_gw_finnish_cannot_msg")).await;
    } else {
        let content = t("event_gw_reroll_win_msg")
            .replace(
                "${winners}",
                &winners_now
                    .iter()
                    .map(|w| format!("<@{w}>"))
                    .collect::<Vec<_>>()
                    .join(","),
            )
            .replace("${fetch[channelId][messageId].prize}", &gw.prize);
        let _ = message.reply(http, content).await;
    }
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No giveaways.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list-entries",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_entries(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    let code_early = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t_early = |k: &str| crate::lang::get(&code_early, k).unwrap_or_default();
    let Some(raw) = raw else {
        ctx.say(t_early("reroll_dont_find_giveaway").replace("{args}", message_id.trim()))
            .await?;
        return Ok(());
    };
    let entries: Vec<String> = serde_json::from_str::<serde_json::Value>(&raw)
        .ok()
        .and_then(|v| v.get("entries").cloned())
        .and_then(|e| serde_json::from_value(e).ok())
        .unwrap_or_default();
    if entries.is_empty() {
        ctx.send(
            poise::CreateReply::default()
                .content(t_early("history_no_entries"))
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let http = ctx.serenity_context().http.clone();
    let Some((embed, components)) =
        render_entries_page(&http, &ctx.data().pool, &gid, t_early, mid, &entries, 0).await
    else {
        return Ok(());
    };
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .components(components)
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

/// Show one giveaway's data. Mirrors !get-data.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-data",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_data(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    match raw.and_then(|r| serde_json::from_str::<Giveaway>(&r).ok()) {
        Some(gw) => {
            ctx.say(format!(
                "Prize: {} | Winners: {} | Ended: {} | Entries: {}",
                gw.prize,
                gw.winner_count,
                gw.ended,
                gw.entries.len()
            ))
            .await?
        }
        None => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "gw_doesnt_exit")
                    .unwrap_or_else(|| "Giveaway not found.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

/// List all giveaways with status. Mirrors !get-all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-all",
    aliases("gall"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut lines = vec![];
    for (k, v) in &rows {
        if let Ok(gw) = serde_json::from_str::<Giveaway>(v) {
            lines.push(format!(
                "{}: {} ({} entries, {})",
                k,
                gw.prize,
                gw.entries.len(),
                if gw.ended { "ended" } else { "live" }
            ));
        }
    }
    ctx.say(if lines.is_empty() {
        "No giveaways.".to_string()
    } else {
        lines.join("\n")
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn winners_are_unique_and_bounded() {
        let entries = vec!["a".into(), "b".into(), "a".into(), "c".into()];
        let w = pick_winners(&entries, &[], 2, 42);
        assert_eq!(w.len(), 2);
        let mut sorted = w.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(sorted.len(), 2);
    }

    #[test]
    fn empty_entries_no_winners() {
        assert!(pick_winners(&[], &[], 3, 1).is_empty());
    }

    #[test]
    fn join_dedupes_entries() {
        let mut entries = vec!["a".to_string()];
        assert!(join_giveaway(&mut entries, "b"));
        assert!(!join_giveaway(&mut entries, "a"));
        assert_eq!(entries.len(), 2);
    }

    #[test]
    fn board_helpers_match_ts() {
        assert_eq!(GW_COLOR, 0x9a5af2);
        assert_eq!(GW_END_COLOR, 0x2f3136);
        assert_eq!(GW_REACTION, "🎉");
        assert_eq!(gw_entries_page_id(9, 2), "gw-entries:9:2");
        let (r, d) = stamp_pair(1_700_000_000_000);
        assert_eq!(r, "<t:1700000000:R>");
        assert_eq!(d, "<t:1700000000:D>");
        // Winners exclude past winners like selectWinners.
        let entries = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let winners = pick_winners(&entries, &["a".to_string()], 3, 42);
        assert!(!winners.contains(&"a".to_string()));
        assert_eq!(winners.len(), 2);
        assert_eq!(pick_winners(&[], &[], 1, 1).len(), 0);
        // Entries count line bump (addEntries/removeEntries regex).
        let desc = "Ends: <t:1:R>\nEntries: **0**\nWinners: **1**";
        let (bumped, ok) = bump_entries_count(desc, "Entries", 5);
        assert!(ok);
        assert!(bumped.contains("Entries: **5**"));
        assert!(bumped.contains("Winners: **1**"));
        assert!(!bump_entries_count("no count here", "Entries", 5).1);
        assert!(!bump_entries_count("Entries: **x**", "Entries", 5).1);
        // Entries paging (10/page, N. <@id> lines).
        let many: Vec<String> = (1..=12).map(|i| i.to_string()).collect();
        let pages = entries_pages("T", &many);
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "T");
        assert!(pages[0].1.starts_with("1. <@1>"));
        assert!(pages[0].1.ends_with("10. <@10>"));
        assert_eq!(pages[1].1, "11. <@11>\n12. <@12>");
        assert!(entries_pages("T", &[]).is_empty());
    }

    #[tokio::test]
    async fn requirement_gates() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool).await.unwrap();
        assert!(check_requirement(&pool, "g", 1, &[], "none", "").await);
        assert!(!check_requirement(&pool, "g", 1, &[], "invites", "5").await);
        assert!(!check_requirement(&pool, "g", 1, &[], "messages", "5").await);
        assert!(!check_requirement(&pool, "g", 1, &[7], "roles", "9").await);
        assert!(check_requirement(&pool, "g", 1, &[9], "roles", "9").await);
    }
}
