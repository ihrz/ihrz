use super::*;
use poise::serenity_prelude as serenity;
use poise::serenity_prelude::Mentionable;

// Button custom ids. Mirror `!message.ts:104,108`. Presses carry the
// panel invoker (`%<user id>`, like `newsletter-toggle%<guild>` in
// `MessageCommands/bot/@updates.ts:124`) so the stateless component
// arms in events_handler.rs can enforce the TS `collect` invoker
// gate (`!message.ts:124-130`).
pub const MSG_SET_ID: &str = "xpMessage-set-message";
pub const MSG_DEFAULT_ID: &str = "xpMessage-default-message";
/// Modal + input ids. Mirror `!message.ts:135,140`.
pub const MSG_MODAL_ID: &str = "xpMessage-modal";
pub const MSG_INPUT_ID: &str = "xpMessage-input";
/// Panel lifetime. Mirrors `createMessageComponentCollector({ time:
/// 80_000 })` (`!message.ts:118-121`).
pub const MSG_PANEL_TIMEOUT_MS: i64 = 80_000;

/// Cap a level-up template at 1010 chars. Mirrors the TS modal
/// `maxLength: 1010` (`!message.ts:144`) and the
/// `xpMessage?.substring(0, 1010)` read guard (`!message.ts:63`).
/// JS `substring` counts UTF-16 code units, so a non-BMP char (one
/// surrogate pair, e.g. an emoji) costs 2. The cut stays on a char
/// boundary — Rust strings cannot hold the lone surrogates a JS
/// split-pair would produce.
pub fn truncate_xp_message(template: &str) -> String {
    let mut units = 0usize;
    let mut end = 0usize;
    for (i, c) in template.char_indices() {
        units += c.len_utf16();
        if units > 1010 {
            break;
        }
        end = i + c.len_utf8();
    }
    template[..end].to_string()
}

/// Preview one template the way the level-up announce renders it:
/// raw template plus the member/guild render at level 4 (mirrors the
/// `!message.ts:73-83,88-98` help embed, whose previews render with
/// `ranks: { level: 4 }`).
fn preview_block(
    raw: &str,
    username: &str,
    mention: &str,
    member_count: u64,
    guild_name: &str,
) -> String {
    let rendered =
        crate::events::render_xp_announce(raw, username, mention, member_count, guild_name, 4);
    format!("```{raw}```\n{rendered}")
}

/// Split a panel custom id into its TS base (`MSG_SET_ID` /
/// `MSG_DEFAULT_ID` / `MSG_MODAL_ID`) and the `%<invoker>` suffix.
fn split_panel_id(id: &str) -> (&str, Option<u64>) {
    match id.split_once('%') {
        Some((base, who)) => (base, who.parse::<u64>().ok()),
        None => (id, None),
    }
}

/// True for either panel button id, bare or `%<invoker>`-suffixed.
pub fn is_rankmsg_button(id: &str) -> bool {
    let (base, _) = split_panel_id(id);
    base == MSG_SET_ID || base == MSG_DEFAULT_ID
}

/// True for the set modal id, bare or `%<invoker>`-suffixed.
pub fn is_rankmsg_modal(id: &str) -> bool {
    split_panel_id(id).0 == MSG_MODAL_ID
}

/// Panel invoker encoded in a button/modal custom id.
pub fn rankmsg_invoker(id: &str) -> Option<u64> {
    split_panel_id(id).1
}

/// Stateless 80s-collector gate. Mirrors the TS collector lifetime
/// plus the `end` leg that disables the panel: presses older than the
/// panel lifetime only re-render the disabled row, never mutate state
/// (same shape as the honeypot `panel_expired` gate).
pub fn rankmsg_expired(posted_unix_secs: i64, now_unix_secs: i64) -> bool {
    (now_unix_secs - posted_unix_secs) * 1000 >= MSG_PANEL_TIMEOUT_MS
}

/// Help embed accent. Mirrors `.setColor("#ffb3cc")`
/// (`!message.ts:66`).
pub const RANKMSG_HELP_COLOUR: u32 = 0xFFB3CC;

/// Help embed: custom + default previews (`!message.ts:65-100`).
fn rankmsg_embed(
    code: &str,
    custom_raw: Option<&str>,
    default_tpl: &str,
    username: &str,
    mention: &str,
    member_count: u64,
    guild_name: &str,
) -> serenity::CreateEmbed {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    let custom_field = match custom_raw.filter(|t| !t.is_empty()) {
        Some(t) => preview_block(t, username, mention, member_count, guild_name),
        None => say(
            "ranksSetMessage_help_embed_fields_custom_name_empy",
            "No custom message set.",
        ),
    };
    let default_field = preview_block(default_tpl, username, mention, member_count, guild_name);
    serenity::CreateEmbed::default()
        .colour(RANKMSG_HELP_COLOUR)
        .title(say("ranksSetMessage_help_embed_title", "Level-up message"))
        .description(say(
            "ranksSetMessage_help_embed_desc",
            "Preview of the level-up message.",
        ))
        .field(
            say(
                "ranksSetMessage_help_embed_fields_custom_name",
                "Custom message",
            ),
            custom_field,
            false,
        )
        .field(
            say(
                "ranksSetMessage_help_embed_fields_default_name_empy",
                "Default message",
            ),
            default_field,
            false,
        )
}

/// Set/default button row (`!message.ts:102-111`). `disabled`
/// renders the collector `end` leg (`!message.ts:237-242`).
fn rankmsg_row(code: &str, invoker_id: u64, disabled: bool) -> serenity::CreateActionRow {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    let mut set = serenity::CreateButton::new(format!("{MSG_SET_ID}%{invoker_id}"))
        .style(serenity::ButtonStyle::Primary)
        .label(say("ranksSetMessage_button_set_name", "Set message"));
    let mut def = serenity::CreateButton::new(format!("{MSG_DEFAULT_ID}%{invoker_id}"))
        .style(serenity::ButtonStyle::Danger)
        .label(say("ranksSetMessage_buttom_del_name", "Default Message"));
    if disabled {
        set = set.disabled(true);
        def = def.disabled(true);
    }
    serenity::CreateActionRow::Buttons(vec![set, def])
}

/// Set-message modal options. Mirrors the `iHorizonModalResolve` call
/// at `!message.ts:133-151`: no defer (`deferUpdate: false`), one
/// required paragraph input capped at 2..1010 chars (`maxLength:
/// 1010, minLength: 2`).
pub fn rankmsg_modal_opts(
    title: &str,
    label: &str,
    invoker_id: u64,
) -> crate::modal_helper::ModalOptions {
    let mut opts =
        crate::modal_helper::ModalOptions::new(title, &format!("{MSG_MODAL_ID}%{invoker_id}"));
    opts.defer_update = false;
    opts.fields = vec![crate::modal_helper::ModalField::Text(
        crate::modal_helper::TextField {
            custom_id: MSG_INPUT_ID.to_string(),
            label: label.to_string(),
            placeholder: None,
            style: crate::modal_helper::TextStyle::Paragraph,
            required: true,
            max_length: Some(1010),
            min_length: Some(2),
            value: None,
        },
    )];
    opts
}

/// Cached guild name + member count for preview renders.
fn guild_render_info(
    ctx: &serenity::Context,
    guild_id: Option<serenity::GuildId>,
) -> (String, u64) {
    guild_id
        .and_then(|id| ctx.cache.guild(id))
        .map(|g| (g.name.clone(), g.member_count))
        .unwrap_or_default()
}

/// Ephemeral reply (TS `interaction.reply` with the ephemeral flag).
async fn rankmsg_ephemeral(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors `ihorizon_logs.ts` (best-effort, silent when
/// missing) for callers without a poise `Ctx` (same colour as
/// `economy::post_ihorizon_log`).
async fn post_rankmsg_log(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    title: &str,
    description: &str,
) {
    let Ok(channels) = ctx.http.get_channels(guild_id).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|c| (c.id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = serenity::CreateEmbed::default()
        .colour(0xBF0BB9)
        .title(title.to_string())
        .description(description.to_string());
    let _ = serenity::ChannelId::new(log_id)
        .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Preview the custom level-up message.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    aliases("msg", "ranks-message"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir un message personalisé quand un membre gagne un niveaus"
    ),
    description_localized("ja", "ユーザーがレベルアップした時のカスタムメッセージを設定"),
    description_localized("ru", "Установить сообщение при повышении уровня"),
    description_localized(
        "es-ES",
        "Establecer un mensaje personalizado cuando el usuario gana nivel"
    )
)]
pub async fn ranks_msg(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    // TS invocation always renders the preview help embed
    // (`!message.ts:65-116`); set/clear happen only through the button
    // modal flow, which takes no slash option.
    let stored = super::migrated_get(
        &ctx.data().pool,
        &gid,
        super::GUILD_MESSAGE_NEW,
        &[super::GUILD_MESSAGE_OLD],
    )
    .await
    .map(|t| truncate_xp_message(&t));
    let default_tpl = say("event_xp_level_earn", crate::events::XP_EARN_FALLBACK);
    let mention = ctx.author().mention().to_string();
    let (guild_name, member_count) = ctx
        .guild_id()
        .and_then(|id| ctx.cache().guild(id))
        .map(|g| (g.name.clone(), g.member_count))
        .unwrap_or_default();
    let embed = rankmsg_embed(
        &code,
        stored.as_deref(),
        &default_tpl,
        &ctx.author().name,
        &mention,
        member_count,
        &guild_name,
    );
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .components(vec![rankmsg_row(&code, ctx.author().id.get(), false)]),
    )
    .await?;
    Ok(())
}

/// Panel button router for the two `xpMessage-*` custom ids.
/// Stateless 80s-collector equivalent: expiry re-renders the disabled
/// row, non-invokers get the ephemeral `help_not_for_you` reply, the
/// set button opens the modal and the default button deletes the row
/// (mirrors `!message.ts:123-135,203-234`).
pub async fn handle_rankmsg_component(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let (base, invoker) = split_panel_id(comp.data.custom_id.as_str());
    if base != MSG_SET_ID && base != MSG_DEFAULT_ID {
        return;
    }
    // Collector `end` leg: expired panels only re-render disabled.
    if rankmsg_expired(
        comp.message.timestamp.unix_timestamp(),
        serenity::Timestamp::now().unix_timestamp(),
    ) {
        let row = rankmsg_row(&code, invoker.unwrap_or(comp.user.id.get()), true);
        let _ = comp
            .channel_id
            .edit_message(
                &ctx.http,
                comp.message.id,
                serenity::EditMessage::new().components(vec![row]),
            )
            .await;
        return;
    }
    // Invoker-only panel (mirrors the TS `collect` guard
    // `buttonInteraction.user.id !== interaction.member?.user.id`).
    let Some(invoker) = invoker else {
        return;
    };
    if comp.user.id.get() != invoker {
        rankmsg_ephemeral(
            ctx,
            comp,
            say("help_not_for_you", "This interaction is not for you."),
        )
        .await;
        return;
    }
    if base == MSG_SET_ID {
        let opts = rankmsg_modal_opts(
            &say(
                "ranksSetMessage_awaiting_response",
                "Write the new custom ranks message.",
            ),
            &say("ranksSetMessage_embed_fields_xpmessage", "Ranks Message"),
            invoker,
        );
        let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
            return;
        };
        let _ = comp
            .create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await;
        return;
    }
    // Default leg: delete the row, confirm, re-render the empty
    // preview, and log (mirrors `!message.ts:203-234`). TS saves
    // nothing here — the read path falls back to the default template.
    let _ = super::migrated_del(
        pool,
        &gid,
        super::GUILD_MESSAGE_NEW,
        &[super::GUILD_MESSAGE_OLD],
    )
    .await;
    let tick = crate::emojis::app_emoji_markup(&ctx.http, "GreenTick")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let confirm = say(
        "ranksSetMessage_command_work_on_enable",
        "Successfully set ranks message.",
    )
    .replace("${client.iHorizon_Emojis.GreenTick}", &tick);
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(confirm)
                    .ephemeral(true),
            ),
        )
        .await;
    let default_tpl = say("event_xp_level_earn", crate::events::XP_EARN_FALLBACK);
    let (guild_name, member_count) = guild_render_info(ctx, comp.guild_id);
    let embed = rankmsg_embed(
        &code,
        None,
        &default_tpl,
        &comp.user.name,
        &comp.user.mention().to_string(),
        member_count,
        &guild_name,
    );
    let _ = comp
        .channel_id
        .edit_message(
            &ctx.http,
            comp.message.id,
            serenity::EditMessage::new().embeds(vec![embed]),
        )
        .await;
    let title = say(
        "ranksSetMessage_logs_embed_title_on_disable",
        "RanksSetMessage Logs",
    );
    let desc = say(
        "ranksSetMessage_logs_embed_description_on_disable",
        "deleted the ranks message!",
    )
    .replace("${interaction.user.id}", &invoker.to_string());
    post_rankmsg_log(ctx, guild_id, &title, &desc).await;
}

/// Set-modal submit router (`xpMessage-modal%<invoker>`). Completes
/// the TS modal leg (`!message.ts:154-202`): the value saves verbatim
// (the read path truncates), the submitter gets the ephemeral
// confirmation, the panel re-renders, and the enable log posts.
pub async fn handle_rankmsg_modal_submit(
    ctx: &serenity::Context,
    submit: &serenity::ModalInteraction,
    pool: &crate::db::Pool,
) {
    let Some(guild_id) = submit.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let Some(invoker) = rankmsg_invoker(submit.data.custom_id.as_str()) else {
        return;
    };
    if submit.user.id.get() != invoker {
        let _ = submit
            .create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(say("help_not_for_you", "This interaction is not for you."))
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }
    let response = crate::modal_helper::text_value(submit, MSG_INPUT_ID);
    if super::migrated_set(
        pool,
        &gid,
        super::GUILD_MESSAGE_NEW,
        &[super::GUILD_MESSAGE_OLD],
        &response,
    )
    .await
    .is_err()
    {
        return;
    }
    let tick = crate::emojis::app_emoji_markup(&ctx.http, "GreenTick")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let confirm = say(
        "ranksSetMessage_command_work_on_enable",
        "Successfully set ranks message.",
    )
    .replace("${client.iHorizon_Emojis.GreenTick}", &tick);
    let _ = submit
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(confirm)
                    .ephemeral(true),
            ),
        )
        .await;
    // Re-render the panel the modal came from (TS `message.edit`
    // `:190`). Component-origin submits carry the source message;
    // app-command-origin submits never do.
    if let Some(panel) = submit.message.as_deref() {
        let username = serenity::UserId::new(invoker)
            .to_user(&ctx.http)
            .await
            .map(|u| u.name)
            .unwrap_or_else(|_| format!("<@{invoker}>"));
        let mention = format!("<@{invoker}>");
        let default_tpl = say("event_xp_level_earn", crate::events::XP_EARN_FALLBACK);
        let (guild_name, member_count) = guild_render_info(ctx, submit.guild_id);
        let embed = rankmsg_embed(
            &code,
            Some(&response),
            &default_tpl,
            &username,
            &mention,
            member_count,
            &guild_name,
        );
        let _ = submit
            .channel_id
            .edit_message(
                &ctx.http,
                panel.id,
                serenity::EditMessage::new().embeds(vec![embed]),
            )
            .await;
    }
    let title = say(
        "ranksSetMessage_logs_embed_title_on_enable",
        "RanksSetMessage Logs",
    );
    let desc = say(
        "ranksSetMessage_logs_embed_description_on_enable",
        "set the ranks message!",
    )
    .replace("${interaction.user.id}", &invoker.to_string());
    post_rankmsg_log(ctx, guild_id, &title, &desc).await;
}

#[cfg(test)]
mod tests {
    use super::truncate_xp_message;
    use super::{
        is_rankmsg_button, is_rankmsg_modal, rankmsg_expired, rankmsg_invoker, rankmsg_modal_opts,
        MSG_DEFAULT_ID, MSG_INPUT_ID, MSG_MODAL_ID, MSG_SET_ID, RANKMSG_HELP_COLOUR,
    };

    #[test]
    fn help_embed_accent_matches_ts_setcolor() {
        // `!message.ts:66` `.setColor("#ffb3cc")` == decimal 16757708
        // as observed on the live prod payload.
        assert_eq!(RANKMSG_HELP_COLOUR, 0xFFB3CC);
        assert_eq!(RANKMSG_HELP_COLOUR, 16757708);
    }

    #[test]
    fn truncation_caps_at_1010_chars_like_ts_substring() {
        let long = "a".repeat(2000);
        assert_eq!(truncate_xp_message(&long).len(), 1010);
        assert_eq!(truncate_xp_message("hi"), "hi");
        let wide = "é".repeat(2000);
        assert_eq!(truncate_xp_message(&wide).chars().count(), 1010);
    }

    #[test]
    fn truncation_counts_utf16_units_like_js_substring() {
        // Non-BMP chars cost 2 UTF-16 units each (one surrogate pair),
        // so 505 emoji fill the 1010-unit budget exactly.
        let emoji = "😀".repeat(2000);
        let capped = truncate_xp_message(&emoji);
        assert_eq!(capped.chars().count(), 505);
        assert_eq!(capped.encode_utf16().count(), 1010);
        // Mixed BMP/non-BMP: 'a' costs 1 unit, '😀' costs 2.
        let mixed = format!("{}{}", "a".repeat(1008), "😀".repeat(10));
        let capped = truncate_xp_message(&mixed);
        assert_eq!(capped.encode_utf16().count(), 1010);
        assert_eq!(capped.chars().count(), 1009);
        assert!(capped.ends_with('😀'));
    }

    #[test]
    fn panel_ids_match_ts_bases_with_invoker_suffix() {
        assert_eq!(MSG_SET_ID, "xpMessage-set-message");
        assert_eq!(MSG_DEFAULT_ID, "xpMessage-default-message");
        assert_eq!(MSG_MODAL_ID, "xpMessage-modal");
        assert_eq!(MSG_INPUT_ID, "xpMessage-input");
        assert!(is_rankmsg_button(MSG_SET_ID));
        assert!(is_rankmsg_button(MSG_DEFAULT_ID));
        assert!(is_rankmsg_button(&format!("{MSG_SET_ID}%123")));
        assert!(is_rankmsg_button(&format!("{MSG_DEFAULT_ID}%123")));
        assert!(!is_rankmsg_button(MSG_MODAL_ID));
        assert!(!is_rankmsg_button("rk-roles-next"));
        assert!(!is_rankmsg_button(""));
        assert!(is_rankmsg_modal(MSG_MODAL_ID));
        assert!(is_rankmsg_modal(&format!("{MSG_MODAL_ID}%123")));
        assert!(!is_rankmsg_modal(MSG_SET_ID));
        assert_eq!(rankmsg_invoker(&format!("{MSG_SET_ID}%123")), Some(123));
        assert_eq!(rankmsg_invoker(MSG_SET_ID), None);
        assert_eq!(rankmsg_invoker(&format!("{MSG_SET_ID}%abc")), None);
    }

    #[test]
    fn panel_expiry_matches_80s_ts_collector() {
        assert!(!rankmsg_expired(1000, 1000 + 79));
        assert!(rankmsg_expired(1000, 1000 + 80));
        assert!(rankmsg_expired(1000, 1000 + 800));
    }

    #[test]
    fn set_modal_mirrors_ts_constraints() {
        use crate::modal_helper::{ModalField, TextStyle};
        let opts = rankmsg_modal_opts("T", "Ranks Message", 7);
        assert_eq!(opts.custom_id, format!("{MSG_MODAL_ID}%7"));
        assert!(!opts.defer_update);
        assert_eq!(opts.fields.len(), 1);
        let ModalField::Text(f) = &opts.fields[0] else {
            panic!("set modal must hold one text field");
        };
        assert_eq!(f.custom_id, MSG_INPUT_ID);
        assert_eq!(f.style, TextStyle::Paragraph);
        assert!(f.required);
        assert_eq!((f.max_length, f.min_length), (Some(1010), Some(2)));
        assert!(crate::modal_helper::build_modal(&opts).is_ok());
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn message_key_roundtrips_through_both_stores() {
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::{migrated_del, migrated_get, migrated_set};
        let pool = mem_pool().await;
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
        migrated_set(
            &pool,
            "g",
            GUILD_MESSAGE_NEW,
            &[GUILD_MESSAGE_OLD],
            "gg {user}",
        )
        .await
        .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("gg {user}")
        );
        // Locked legacy readers still see the write.
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_OLD)
                .await
                .as_deref(),
            Some("gg {user}")
        );
        assert!(
            migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
        assert!(
            !migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
    }

    #[tokio::test]
    async fn legacy_message_key_reads_and_promotes() {
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::migrated_get;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", GUILD_MESSAGE_OLD, "hi {user}")
            .await
            .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("hi {user}")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
                .await
                .as_deref(),
            Some("hi {user}")
        );
    }
}
