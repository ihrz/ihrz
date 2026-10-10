use super::*;
use poise::serenity_prelude as serenity;

/// Interactive panel lifetime. Mirrors the 30min component collectors in
/// `nightmode.ts` (`client.timeCalculator.to_ms("30m")`).
pub const NIGHTMODE_PANEL_TIMEOUT_SECS: u64 = 1800;
/// Panel component ids. Mirror the customIds in `nightmode.ts`
/// (main panel select, bot-whitelist user select, save button, the
/// ephemeral UTC picker, and the hours modal + its two inputs).
pub const NIGHTMODE_MAIN_SELECT_ID: &str = "nightmode_main_panel";
pub const NIGHTMODE_WL_SELECT_ID: &str = "nightmode-wl-bots-wl";
pub const NIGHTMODE_SAVE_BUTTON_ID: &str = "nightmode_save_config";
pub const NIGHTMODE_TZ_SELECT_ID: &str = "utc_choice";
pub const NIGHTMODE_HOURS_MODAL_ID: &str = "night-mode";
pub const NIGHTMODE_HOURS_START_ID: &str = "start";
pub const NIGHTMODE_HOURS_END_ID: &str = "end";
/// Main-panel menu values. Mirror the `setValue` calls in `nightmode.ts`.
pub const NIGHTMODE_VALUE_ENABLE: &str = "enable_mode";
pub const NIGHTMODE_VALUE_NOTIFY: &str = "owner_notify";
pub const NIGHTMODE_VALUE_HOURS: &str = "hours_window";
pub const NIGHTMODE_VALUE_DERANK: &str = "derank_bot";
pub const NIGHTMODE_VALUE_TIMEZONE: &str = "change_timezone";
/// Embed colour. Mirrors `.setColor("#010101")` in `nightmode.ts`.
pub const NIGHTMODE_EMBED_COLOR: u32 = 0x01_01_01;

/// Nightmode panel and quick toggle (guild owner only).
// Bare `/nightmode` (or `panel`/`config`) opens the interactive config
// panel mirroring `nightmode.ts`; `on`/`off` with optional hours stays
// the owner-only quick toggle. The full blob is always loaded first
// and mutated in place (minutes, notify, derank, utc, wl_bots are
// never reset).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "nightmode",
    aliases("modenuit", "nuit", "night", "mode-nuit", "night-mode"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nightmode(
    ctx: Ctx<'_>,
    #[description = "on, off, or panel (default)"] action: Option<String>,
    #[description = "Start hour 0-23"] start: Option<i64>,
    #[description = "End hour 0-23"] end: Option<i64>,
) -> Result<(), anyhow::Error> {
    if wants_panel(action.as_deref()) {
        return run_nightmode_panel(ctx).await;
    }
    run_quick_toggle(ctx, action.as_deref().unwrap_or(""), start, end).await
}

/// Panel routing: no arg (or an explicit panel word) opens the panel;
/// anything else keeps the legacy quick-toggle semantics (where only
/// `on`/`power on` enables, everything else disables).
pub fn wants_panel(action: Option<&str>) -> bool {
    match action.map(str::trim) {
        None => true,
        Some(a) => matches!(
            a.to_ascii_lowercase().as_str(),
            "" | "panel" | "config" | "menu"
        ),
    }
}

/// Guild-owner gate (TS: interaction.guild.ownerId check). HTTP fetch
/// only: holding the cache Guild across an await is not Send.
async fn is_guild_owner(ctx: Ctx<'_>) -> bool {
    match ctx.guild_id() {
        Some(gid) => ctx
            .http()
            .get_guild(gid)
            .await
            .map(|g| g.owner_id == ctx.author().id)
            .unwrap_or(false),
        None => false,
    }
}

/// Load the full blob (defaults = TS fallback literal), never reset it.
async fn load_cfg(pool: &crate::db::Pool, gid: &str) -> NightmodeConfig {
    crate::db::tbl_get(pool, gid, "UTILS.NIGHT_MODE")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(NightmodeConfig {
            enabled: false,
            notify: true,
            time: [21, 0, 9, 0],
            wl_bots: Vec::new(),
            derank_bot: true,
            utc: 1,
        })
}

async fn persist_cfg(
    pool: &crate::db::Pool,
    gid: &str,
    cfg: &NightmodeConfig,
) -> Result<(), anyhow::Error> {
    crate::db::tbl_set_json(pool, gid, "UTILS.NIGHT_MODE", cfg).await?;
    Ok(())
}

/// Legacy quick toggle (owner only, on/off + hour args). Minutes are
/// preserved: the args only carry hours, and zeroing time[1]/time[3]
/// here would wipe panel-set minutes.
async fn run_quick_toggle(
    ctx: Ctx<'_>,
    action: &str,
    start: Option<i64>,
    end: Option<i64>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !is_guild_owner(ctx).await {
        ctx.say(
            crate::lang::get(&code, "blockbot_not_owner")
                .unwrap_or_else(|| ":x: **You are not the Owner of the server!**".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut cfg = load_cfg(&ctx.data().pool, &gid).await;
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    cfg.enabled = enabled;
    if let Some(s) = start {
        if !valid_hour(s) {
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "nightmode_invalid_hour_morning")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "${client.iHorizon_Emojis.No} Start time is not valid. Use format: 21:30 or 2130".to_string()),
            )
            .await?;
            return Ok(());
        }
        cfg.time[0] = s as u8;
    }
    if let Some(e) = end {
        if !valid_hour(e) {
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "nightmode_invalid_hour_night")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "${client.iHorizon_Emojis.No} End time is not valid. Use format: 06:15 or 0615".to_string()),
            )
            .await?;
            return Ok(());
        }
        cfg.time[2] = e as u8;
    }
    persist_cfg(&ctx.data().pool, &gid, &cfg).await?;
    let state = if enabled { "on" } else { "off" };
    let window = time_beautifuer(cfg.time);
    ctx.say(
        crate::lang::get(&code, "msg_nightmode_updated")
            .map(|s| {
                s.replace("${state}", state)
                    .replace("${start}", &cfg.time[0].to_string())
                    .replace("${end}", &cfg.time[2].to_string())
            })
            .unwrap_or_else(|| {
                format!(
                    "Nightmode {state} ({window}, notify {}, derank {}, UTC{}).",
                    if cfg.notify { "on" } else { "off" },
                    if cfg.derank_bot { "on" } else { "off" },
                    cfg.utc,
                )
            }),
    )
    .await?;
    Ok(())
}

/// Role-hierarchy check. Mirrors `Basics_Check` in
/// `nightModeManager.ts`: bot role present, bot role on top, bot role
/// has Administrator. `bot_top_position` is None when the bot holds no
/// non-@everyone role (TS `roles.botRole` undefined).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BasicsCheck {
    pub has_bot_role: bool,
    pub im_on_top: bool,
    pub im_self_admin: bool,
}

pub fn basics_check(
    bot_top_position: Option<u16>,
    highest_position: u16,
    bot_top_admin: bool,
) -> BasicsCheck {
    let has_bot_role = bot_top_position.is_some();
    BasicsCheck {
        has_bot_role,
        im_on_top: matches!(bot_top_position, Some(p) if p == highest_position),
        im_self_admin: has_bot_role && bot_top_admin,
    }
}

/// Warning lang keys in TS emit order (`nightmode.ts` warn_msg block).
/// Callers replace `${client.iHorizon_Emojis.Warning_Icon}` like the TS.
pub fn basics_warning_keys(check: &BasicsCheck) -> Vec<&'static str> {
    let mut keys = Vec::with_capacity(3);
    if !check.has_bot_role {
        keys.push("var_nm_role_app_dont_exist");
    }
    if !check.im_on_top {
        keys.push("var_nm_role_app_not_high");
    }
    if !check.im_self_admin {
        keys.push("var_nm_role_app_not_admin");
    }
    keys
}

/// Live `Basics_Check` over HTTP (bot member roles + guild role list).
/// Best-effort: on any fetch failure it reports healthy so a Discord
/// blip never nags the owner with false hierarchy warnings.
async fn fetch_basics_check(http: &serenity::Http, guild_id: serenity::GuildId) -> BasicsCheck {
    let healthy = BasicsCheck {
        has_bot_role: true,
        im_on_top: true,
        im_self_admin: true,
    };
    let Ok(bot) = http.get_current_user().await else {
        return healthy;
    };
    let Ok(member) = http.get_member(guild_id, bot.id).await else {
        return healthy;
    };
    let Ok(roles) = http.get_guild_roles(guild_id).await else {
        return healthy;
    };
    let everyone = serenity::RoleId::new(guild_id.get());
    let highest = roles.iter().map(|r| r.position).max().unwrap_or(0);
    let mut bot_top: Option<(u16, bool)> = None;
    for rid in &member.roles {
        if *rid == everyone {
            continue;
        }
        if let Some(role) = roles.iter().find(|r| r.id == *rid) {
            let admin = role.permissions.administrator();
            let replace = match bot_top {
                Some((p, _)) => role.position > p,
                None => true,
            };
            if replace {
                bot_top = Some((role.position, admin));
            }
        }
    }
    match bot_top {
        // No bot role: every leg fails, like the TS undefined botRole.
        None => BasicsCheck {
            has_bot_role: false,
            im_on_top: false,
            im_self_admin: false,
        },
        Some((pos, admin)) => basics_check(Some(pos), highest, admin),
    }
}

/// Minute-level time input. Mirrors `parseTimeInput` in `nightmode.ts`
/// (`/^(\d{1,2})(?::(\d{2})|(\d{2}))?$/`): `21`, `21:30`, `2130` all
/// parse; out-of-range or malformed input is None.
pub fn parse_time_input(input: &str) -> Option<(u8, u8)> {
    fn digits(s: &str, min_len: usize, max_len: usize) -> Option<u64> {
        if s.len() < min_len || s.len() > max_len {
            return None;
        }
        if !s.bytes().all(|b| b.is_ascii_digit()) {
            return None;
        }
        s.parse().ok()
    }
    let s = input.trim();
    if s.is_empty() {
        return None;
    }
    let (h, m) = if let Some((a, b)) = s.split_once(':') {
        (a, Some(b))
    } else if s.len() <= 2 {
        (s, None)
    } else if s.len() == 3 || s.len() == 4 {
        let (a, b) = s.split_at(s.len() - 2);
        (a, Some(b))
    } else {
        return None;
    };
    let hour = digits(h, 1, 2)?;
    let minute = match m {
        None => 0,
        Some(mm) => digits(mm, 2, 2)?,
    };
    if hour > 23 || minute > 59 {
        return None;
    }
    Some((hour as u8, minute as u8))
}

/// Main-panel toggle choices (the three legs that flip a boolean and
/// re-render one embed field). Mirrors `editEnableMode` (field 0),
/// `editOwnerNotify` (field 1), `derank_bot` (field 2).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PanelChoice {
    EnableMode,
    OwnerNotify,
    DerankBot,
}

pub fn panel_choice_of(value: &str) -> Option<PanelChoice> {
    match value {
        v if v == NIGHTMODE_VALUE_ENABLE => Some(PanelChoice::EnableMode),
        v if v == NIGHTMODE_VALUE_NOTIFY => Some(PanelChoice::OwnerNotify),
        v if v == NIGHTMODE_VALUE_DERANK => Some(PanelChoice::DerankBot),
        _ => None,
    }
}

/// Flip the chosen flag, returning the embed field index to re-render.
/// Only the chosen flag changes; minutes/utc/wl_bots stay intact.
pub fn apply_panel_choice(cfg: &mut NightmodeConfig, choice: PanelChoice) -> usize {
    match choice {
        PanelChoice::EnableMode => {
            cfg.enabled = !cfg.enabled;
            0
        }
        PanelChoice::OwnerNotify => {
            cfg.notify = !cfg.notify;
            1
        }
        PanelChoice::DerankBot => {
            cfg.derank_bot = !cfg.derank_bot;
            2
        }
    }
}

/// Status dot. Mirrors the `🟢`/`🔴` embed field values.
pub fn status_dot(on: bool) -> &'static str {
    if on {
        "🟢"
    } else {
        "🔴"
    }
}

/// Whitelisted-bots field. Mirrors the initial render
/// (`wlBots.map(mention).join("")`, `var_none` fallback).
pub fn wl_bots_field(wl_bots: &[String], none_word: &str) -> String {
    if wl_bots.is_empty() {
        none_word.to_string()
    } else {
        wl_bots
            .iter()
            .map(|x| format!("<@{x}>"))
            .collect::<Vec<_>>()
            .join("")
    }
}

/// UTC offset label. Mirrors the TS picker
/// (`offsetNum >= 0 ? UTC+${offsetNum} : UTC${offsetNum}`).
pub fn utc_offset_label(offset: i8) -> String {
    if offset >= 0 {
        format!("UTC+{offset}")
    } else {
        format!("UTC{offset}")
    }
}

/// Time-range field. Mirrors the TS template
/// (`time_beautifuer(time) (tz_word zone)`); unknown offsets fall back
/// to a `UTC±n` label instead of TS `undefined`.
pub fn time_field_value(cfg: &NightmodeConfig, tz_word: &str) -> String {
    let zone = utc_timezone_name(cfg.utc)
        .map(str::to_string)
        .unwrap_or_else(|| utc_offset_label(cfg.utc));
    format!("{} ({tz_word} {zone})", time_beautifuer(cfg.time))
}

/// Ordered UTC picker entries (offset, IANA name). Order matches the
/// `utcTimezones` table; the missing +8 slot stays missing.
pub fn utc_options() -> Vec<(i8, &'static str)> {
    (-11..=14)
        .filter_map(|o: i32| {
            let off = o as i8;
            utc_timezone_name(off).map(|name| (off, name))
        })
        .collect()
}

/// Stateless 30min collector gate. Mirrors the TS `time` legs plus the
/// `end` leg that disables the panel: presses older than the panel
/// lifetime only re-render the disabled panel, never mutate state.
pub fn panel_expired(posted_unix_secs: i64, now_unix_secs: i64) -> bool {
    (now_unix_secs - posted_unix_secs) * 1000 >= (NIGHTMODE_PANEL_TIMEOUT_SECS * 1000) as i64
}

/// Panel embed. Field order mirrors `nightmode.ts`: enabled, notify,
/// derank, whitelisted bots, time range.
pub fn build_panel_embed(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    cfg: &NightmodeConfig,
) -> serenity::CreateEmbed {
    let f = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };
    let none = f("var_none", "None");
    serenity::CreateEmbed::default()
        .colour(NIGHTMODE_EMBED_COLOR)
        .description(f(
            "nightmode_embed_desc",
            "Night Mode: disable administrator permissions during the night.",
        ))
        .field(
            f("nightmode_embed_fields_0_name", "Enable Module"),
            status_dot(cfg.enabled),
            false,
        )
        .field(
            f("nightmode_embed_fields_1_name", "Notify server owner"),
            status_dot(cfg.notify),
            false,
        )
        .field(
            f("nightmode_embed_fields_2_name", "Derank bots?"),
            status_dot(cfg.derank_bot),
            false,
        )
        .field(
            f("nightmode_embed_fields_3_name", "Whitelisted bots"),
            wl_bots_field(&cfg.wl_bots, &none),
            false,
        )
        .field(
            f("nightmode_embed_fields_4_name", "Time Range"),
            time_field_value(cfg, &f("nightmode_utc_timezone_on", "UTC timezone on")),
            false,
        )
}

/// Panel components. Mirrors `getComponent`: main string select, bot
/// whitelist user select (0..=20, like `setMinValues(0)` /
/// `setMaxValues(20)`), save button. Follows the honeypot
/// `build_panel_components` shape with a single `disabled` flag.
pub fn build_panel_components(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    disabled: bool,
) -> Vec<serenity::CreateActionRow> {
    let ph = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };
    let opt = |value: &str, label_key: &str, label_fb: &str, desc_key: &str, desc_fb: &str| {
        serenity::CreateSelectMenuOption::new(ph(label_key, label_fb), value.to_string())
            .description(ph(desc_key, desc_fb))
    };
    let main_menu = serenity::CreateSelectMenu::new(
        NIGHTMODE_MAIN_SELECT_ID,
        serenity::CreateSelectMenuKind::String {
            options: vec![
                opt(
                    NIGHTMODE_VALUE_ENABLE,
                    "nightmode_select_0_label",
                    "Enable night mode",
                    "nightmode_select_0_desc",
                    "Enable/Disable night mode.",
                ),
                opt(
                    NIGHTMODE_VALUE_NOTIFY,
                    "nightmode_select_1_label",
                    "Warn server owner",
                    "nightmode_select_1_desc",
                    "Notify the server owner when activating/deactivating",
                ),
                opt(
                    NIGHTMODE_VALUE_HOURS,
                    "nightmode_select_2_label",
                    "Configure night mode time range",
                    "nightmode_select_2_desc",
                    "Time range where admin permissions are automatically removed.",
                ),
                opt(
                    NIGHTMODE_VALUE_DERANK,
                    "nightmode_select_3_label",
                    "Derank bots",
                    "nightmode_select_3_desc",
                    "Should bots be deranked during the night?",
                ),
                opt(
                    NIGHTMODE_VALUE_TIMEZONE,
                    "nightmode_select_4_label",
                    "Change timezone (UTC)",
                    "nightmode_select_4_desc",
                    "If you have a specific time, you must set it (UTC number format)",
                ),
            ],
        },
    )
    .placeholder(ph(
        "nightmode_select_placeholder",
        "Configure night mode on the server.",
    ))
    .disabled(disabled);
    let wl_menu = serenity::CreateSelectMenu::new(
        NIGHTMODE_WL_SELECT_ID,
        serenity::CreateSelectMenuKind::User {
            default_users: None,
        },
    )
    .placeholder(ph(
        "nightmode_select1_placeholder",
        "Bots authorized to be admin during the night",
    ))
    .min_values(0)
    .max_values(20)
    .disabled(disabled);
    // TS shows an emoji-only success button; a label is required here
    // (Discord rejects buttons with neither label nor emoji).
    let save_label = ph("nightmode_save_button", "Save");
    vec![
        serenity::CreateActionRow::SelectMenu(main_menu),
        serenity::CreateActionRow::SelectMenu(wl_menu),
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
            NIGHTMODE_SAVE_BUTTON_ID,
        )
        .style(serenity::ButtonStyle::Success)
        .label(save_label)
        .disabled(disabled)]),
    ]
}

/// Timezone picker menu for the ephemeral follow-up. Mirrors the
/// `change_timezone` leg (IANA name label, UTC offset description).
pub fn build_timezone_menu(disabled: bool) -> serenity::CreateSelectMenu {
    let options = utc_options()
        .into_iter()
        .map(|(off, name)| {
            serenity::CreateSelectMenuOption::new(name.to_string(), off.to_string())
                .description(utc_offset_label(off))
        })
        .collect();
    serenity::CreateSelectMenu::new(
        NIGHTMODE_TZ_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder("UTC".to_string())
    .disabled(disabled)
}

/// Hours modal options. Mirrors the `editHoursWindow` modal
/// (`night-mode`, start/end short inputs, minute-level placeholders).
pub fn hours_modal_opts(
    title: &str,
    start_label: &str,
    end_label: &str,
) -> crate::modal_helper::ModalOptions {
    use crate::modal_helper::{ModalField, ModalOptions, TextField, TextStyle};
    let mut opts = ModalOptions::new(title, NIGHTMODE_HOURS_MODAL_ID);
    opts.fields.push(ModalField::Text(TextField {
        custom_id: NIGHTMODE_HOURS_START_ID.to_string(),
        label: start_label.to_string(),
        placeholder: Some("21:30 / 2130".to_string()),
        style: TextStyle::Short,
        required: true,
        max_length: Some(5),
        min_length: Some(1),
        value: None,
    }));
    opts.fields.push(ModalField::Text(TextField {
        custom_id: NIGHTMODE_HOURS_END_ID.to_string(),
        label: end_label.to_string(),
        placeholder: Some("06:15 / 0615".to_string()),
        style: TextStyle::Short,
        required: true,
        max_length: Some(5),
        min_length: Some(1),
        value: None,
    }));
    opts
}

/// Interactive config panel. Mirrors `nightmode.ts`: owner gate,
/// Basics_Check warnings, 5-field embed, main select (enable / notify
/// / hours modal / derank / timezone picker), bot-whitelist user
/// select (bots only, like the TS fetch filter), save button, 30min
/// collector lifecycle with disabled-components + persist on end.
pub(crate) async fn run_nightmode_panel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let pool = ctx.data().pool.clone();
    let lang_code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let ph = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };
    if !is_guild_owner(ctx).await {
        ctx.say(ph(
            "blockbot_not_owner",
            ":x: **You are not the Owner of the server!**",
        ))
        .await?;
        return Ok(());
    }
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let author = ctx.author().id;
    let mut cfg = load_cfg(&pool, &gid).await;

    // Basics_Check warnings, prefixed by the owner mention like the TS.
    let check = fetch_basics_check(ctx.http(), guild_id).await;
    let warn_icon = crate::emojis::app_emoji_markup(ctx.http(), "Warning_Icon")
        .await
        .unwrap_or_else(|| "⚠️".to_string());
    let owner_id = ctx
        .http()
        .get_guild(guild_id)
        .await
        .map(|g| g.owner_id.get().to_string())
        .unwrap_or_default();
    let mut warn_msg = format!("<@{owner_id}>\n");
    for key in basics_warning_keys(&check) {
        warn_msg += &t(key).replace("${client.iHorizon_Emojis.Warning_Icon}", &warn_icon);
    }

    let render_embed = |cfg: &NightmodeConfig| build_panel_embed(&t, cfg);
    let render_rows = |disabled: bool| build_panel_components(&t, disabled);
    let not_for_you = ph("help_not_for_you", "This interaction is not for you");
    let refresh = |cfg: &NightmodeConfig| (render_embed(cfg), render_rows(false));

    let handle = ctx
        .send(
            poise::CreateReply::default()
                .content(warn_msg.clone())
                .embed(render_embed(&cfg))
                .components(render_rows(false)),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let shard = ctx.serenity_context().shard.clone();
    let deadline =
        std::time::Instant::now() + std::time::Duration::from_secs(NIGHTMODE_PANEL_TIMEOUT_SECS);
    // Single loop serves the three TS collectors (string select, user
    // select, save button); the modal and the ephemeral UTC picker run
    // nested inside their legs and share the same deadline.
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(shard.clone())
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
        match press.data.custom_id.as_str() {
            NIGHTMODE_MAIN_SELECT_ID => {
                let value = match &press.data.kind {
                    serenity::ComponentInteractionDataKind::StringSelect { values } => {
                        values.first().cloned().unwrap_or_default()
                    }
                    _ => continue,
                };
                if value == NIGHTMODE_VALUE_HOURS {
                    if let Err(()) = hours_leg(ctx, &press, &mut msg, &mut cfg, &lang_code).await {
                        break;
                    }
                } else if value == NIGHTMODE_VALUE_TIMEZONE {
                    timezone_leg(ctx, &press, &mut msg, &mut cfg, &t, deadline).await;
                } else if let Some(choice) = panel_choice_of(&value) {
                    apply_panel_choice(&mut cfg, choice);
                    let (embed, rows) = refresh(&cfg);
                    let _ = press
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Acknowledge,
                        )
                        .await;
                    let _ = msg
                        .edit(
                            ctx.http(),
                            serenity::EditMessage::new().embed(embed).components(rows),
                        )
                        .await;
                }
            }
            NIGHTMODE_WL_SELECT_ID => {
                // Bots only, like the TS fetch-then-filter-bots leg.
                let ids: Vec<serenity::UserId> = match &press.data.kind {
                    serenity::ComponentInteractionDataKind::UserSelect { values } => values.clone(),
                    _ => vec![],
                };
                let mut bots = Vec::with_capacity(ids.len());
                for id in &ids {
                    if let Ok(user) = ctx.http().get_user(*id).await {
                        if user.bot {
                            bots.push(id.get().to_string());
                        }
                    }
                }
                cfg.wl_bots = bots;
                let (embed, rows) = refresh(&cfg);
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                let _ = msg
                    .edit(
                        ctx.http(),
                        serenity::EditMessage::new().embed(embed).components(rows),
                    )
                    .await;
            }
            NIGHTMODE_SAVE_BUTTON_ID => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                break;
            }
            _ => continue,
        }
    }
    // End leg: disable the panel and persist the full blob (TS
    // `collector2wish.on("end")` persists even without save).
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .embed(render_embed(&cfg))
                .components(render_rows(true)),
        )
        .await;
    persist_cfg(&pool, &gid, &cfg).await?;
    Ok(())
}

/// Hours leg: modal with minute-level start/end inputs, then re-render
/// field 4 or an ephemeral invalid-hour error. Returns Err when the
/// panel message is gone and the loop should stop.
async fn hours_leg(
    ctx: Ctx<'_>,
    press: &serenity::ComponentInteraction,
    msg: &mut serenity::Message,
    cfg: &mut NightmodeConfig,
    lang_code: &str,
) -> Result<(), ()> {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let ph = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };
    let opts = hours_modal_opts(
        &ph(
            "nightmode_modal_hours_window_title",
            "NightMode - Time Range",
        ),
        &ph(
            "nightmode_modal_hours_window_fields0_label",
            "Start Time (ex: 21:30 or 2130)",
        ),
        &ph(
            "nightmode_modal_hours_window_fields1_label",
            "End Time (ex: 06:15 or 0615)",
        ),
    );
    let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
        return Ok(());
    };
    if press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await
        .is_err()
    {
        return Err(());
    }
    let Some(submit) = crate::commands::await_modal_submit(
        ctx.serenity_context(),
        press,
        NIGHTMODE_HOURS_MODAL_ID,
    )
    .await
    else {
        return Ok(());
    };
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let start_raw = crate::modal_helper::text_value(&submit, NIGHTMODE_HOURS_START_ID);
    let end_raw = crate::modal_helper::text_value(&submit, NIGHTMODE_HOURS_END_ID);
    match (parse_time_input(&start_raw), parse_time_input(&end_raw)) {
        (Some((sh, sm)), Some((eh, em))) => {
            cfg.time = [sh, sm, eh, em];
            let _ = submit
                .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let _ = msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new()
                        .embed(build_panel_embed(&t, cfg))
                        .components(build_panel_components(&t, false)),
                )
                .await;
        }
        (None, _) => {
            let _ = submit
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(
                                t("nightmode_invalid_hour_morning")
                                    .replace("${client.iHorizon_Emojis.No}", &no),
                            )
                            .ephemeral(true),
                    ),
                )
                .await;
        }
        (_, None) => {
            let _ = submit
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(
                                t("nightmode_invalid_hour_night")
                                    .replace("${client.iHorizon_Emojis.No}", &no),
                            )
                            .ephemeral(true),
                    ),
                )
                .await;
        }
    }
    Ok(())
}

/// Timezone leg: ephemeral UTC picker sharing the panel deadline, then
/// re-render field 4. Unknown offsets are ignored (the picker only
/// offers known ones, like the TS `utcTimezones` entries).
async fn timezone_leg(
    ctx: Ctx<'_>,
    press: &serenity::ComponentInteraction,
    msg: &mut serenity::Message,
    cfg: &mut NightmodeConfig,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    deadline: std::time::Instant,
) {
    let question = {
        let v = t("nightmode_change_timezone_question");
        if v.trim().is_empty() {
            "Choose UTC for your Discord server".to_string()
        } else {
            v
        }
    };
    if press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(question)
                    .components(vec![serenity::CreateActionRow::SelectMenu(
                        build_timezone_menu(false),
                    )])
                    .ephemeral(true),
            ),
        )
        .await
        .is_err()
    {
        return;
    }
    let remaining = deadline.saturating_duration_since(std::time::Instant::now());
    if remaining.is_zero() {
        return;
    }
    let author = press.user.id;
    let picked: Option<i8> = serenity::collector::ComponentInteractionCollector::new(
        ctx.serenity_context().shard.clone(),
    )
    .custom_ids(vec![NIGHTMODE_TZ_SELECT_ID.to_string()])
    .author_id(author)
    .timeout(remaining)
    .await
    .and_then(|tz_press| match &tz_press.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().and_then(|v| v.parse::<i8>().ok())
        }
        _ => None,
    });
    let Some(off) = picked else { return };
    if utc_timezone_name(off).is_none() {
        return;
    }
    cfg.utc = off;
    // Best-effort ack on the picker press (it may already be stale);
    // the panel re-render below is the source of truth.
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .embed(build_panel_embed(t, cfg))
                .components(build_panel_components(t, false)),
        )
        .await;
}

/// One clock reading. Mirrors time_beautifuer_with_minutes: 24h renders
/// `HH:MM` zero-padded, 12h renders `H:MMAM/PM` with the TS period rule
/// (hour < 12 || hour == 24 -> AM; hour % 12 == 0 shows 12).
pub fn time_beautifuer_with_minutes(hour: u8, minute: u8, twelve_hour: bool) -> String {
    if twelve_hour {
        let period = if hour < 12 || hour == 24 { "AM" } else { "PM" };
        let display = match hour % 12 {
            0 => 12,
            h => h,
        };
        format!("{display}:{minute:02}{period}")
    } else {
        format!("{hour:02}:{minute:02}")
    }
}

/// Whole night window label. Mirrors time_beautifuer for the 4-slot
/// format [startHour, startMinute, endHour, endMinute]:
/// `start24 - end24 (start12 - end12)`.
pub fn time_beautifuer(range: [u8; 4]) -> String {
    let start24 = time_beautifuer_with_minutes(range[0], range[1], false);
    let end24 = time_beautifuer_with_minutes(range[2], range[3], false);
    let start12 = time_beautifuer_with_minutes(range[0], range[1], true);
    let end12 = time_beautifuer_with_minutes(range[2], range[3], true);
    format!("{start24} - {end24} ({start12} - {end12})")
}

/// UTC offset (hours) to IANA zone. Mirrors utcTimezones in
/// src/core/locales.ts exactly — including the missing +8 slot (the TS
/// table jumps from +7 Asia/Bangkok to +9 Asia/Tokyo), so unknown
/// offsets stay None like the TS `utcTimezones[utc]` undefined leg.
pub fn utc_timezone_name(offset_hours: i8) -> Option<&'static str> {
    Some(match offset_hours {
        -11 => "Pacific/Pago_Pago",
        -10 => "Pacific/Honolulu",
        -9 => "America/Anchorage",
        -8 => "America/Los_Angeles",
        -7 => "America/Denver",
        -6 => "America/Chicago",
        -5 => "America/New_York",
        -4 => "America/Halifax",
        -3 => "America/Argentina/Buenos_Aires",
        -2 => "America/Noronha",
        -1 => "Atlantic/Azores",
        0 => "Etc/UTC",
        1 => "Europe/Paris",
        2 => "Europe/Athens",
        3 => "Europe/Moscow",
        4 => "Asia/Dubai",
        5 => "Asia/Karachi",
        6 => "Asia/Dhaka",
        7 => "Asia/Bangkok",
        9 => "Asia/Tokyo",
        10 => "Australia/Sydney",
        11 => "Pacific/Noumea",
        12 => "Pacific/Auckland",
        13 => "Pacific/Tongatapu",
        14 => "Pacific/Kiritimati",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        apply_panel_choice, basics_check, basics_warning_keys, load_cfg, panel_choice_of,
        panel_expired, parse_time_input, persist_cfg, status_dot, time_beautifuer,
        time_beautifuer_with_minutes, utc_offset_label, utc_options, utc_timezone_name,
        wants_panel, wl_bots_field, NightmodeConfig, PanelChoice, NIGHTMODE_EMBED_COLOR,
        NIGHTMODE_HOURS_END_ID, NIGHTMODE_HOURS_MODAL_ID, NIGHTMODE_HOURS_START_ID,
        NIGHTMODE_MAIN_SELECT_ID, NIGHTMODE_PANEL_TIMEOUT_SECS, NIGHTMODE_SAVE_BUTTON_ID,
        NIGHTMODE_TZ_SELECT_ID, NIGHTMODE_VALUE_DERANK, NIGHTMODE_VALUE_ENABLE,
        NIGHTMODE_VALUE_HOURS, NIGHTMODE_VALUE_NOTIFY, NIGHTMODE_VALUE_TIMEZONE,
        NIGHTMODE_WL_SELECT_ID,
    };

    #[test]
    fn minutes_render_matches_ts() {
        // Doc example: 21:30 -> "21:30" / "9:30PM".
        assert_eq!(time_beautifuer_with_minutes(21, 30, false), "21:30");
        assert_eq!(time_beautifuer_with_minutes(21, 30, true), "9:30PM");
        assert_eq!(time_beautifuer_with_minutes(0, 5, false), "00:05");
        assert_eq!(time_beautifuer_with_minutes(0, 5, true), "12:05AM");
        assert_eq!(time_beautifuer_with_minutes(12, 0, true), "12:00PM");
        assert_eq!(time_beautifuer_with_minutes(9, 7, true), "9:07AM");
    }

    #[test]
    fn window_label_matches_ts() {
        assert_eq!(
            time_beautifuer([22, 0, 7, 30]),
            "22:00 - 07:30 (10:00PM - 7:30AM)"
        );
    }

    #[test]
    fn utc_table_matches_ts() {
        assert_eq!(utc_timezone_name(0), Some("Etc/UTC"));
        assert_eq!(utc_timezone_name(1), Some("Europe/Paris"));
        assert_eq!(utc_timezone_name(-5), Some("America/New_York"));
        assert_eq!(utc_timezone_name(9), Some("Asia/Tokyo"));
        // The TS table has no +8 entry.
        assert_eq!(utc_timezone_name(8), None);
        assert_eq!(utc_timezone_name(99), None);
    }

    #[test]
    fn panel_ids_match_ts_custom_ids() {
        assert_eq!(NIGHTMODE_MAIN_SELECT_ID, "nightmode_main_panel");
        assert_eq!(NIGHTMODE_WL_SELECT_ID, "nightmode-wl-bots-wl");
        assert_eq!(NIGHTMODE_SAVE_BUTTON_ID, "nightmode_save_config");
        assert_eq!(NIGHTMODE_TZ_SELECT_ID, "utc_choice");
        assert_eq!(NIGHTMODE_HOURS_MODAL_ID, "night-mode");
        assert_eq!(NIGHTMODE_HOURS_START_ID, "start");
        assert_eq!(NIGHTMODE_HOURS_END_ID, "end");
        assert_eq!(NIGHTMODE_VALUE_ENABLE, "enable_mode");
        assert_eq!(NIGHTMODE_VALUE_NOTIFY, "owner_notify");
        assert_eq!(NIGHTMODE_VALUE_HOURS, "hours_window");
        assert_eq!(NIGHTMODE_VALUE_DERANK, "derank_bot");
        assert_eq!(NIGHTMODE_VALUE_TIMEZONE, "change_timezone");
        assert_eq!(NIGHTMODE_EMBED_COLOR, 0x01_01_01);
    }

    #[test]
    fn panel_lifetime_matches_30m_collectors() {
        assert_eq!(NIGHTMODE_PANEL_TIMEOUT_SECS, 1800);
        assert!(!panel_expired(1000, 1000));
        assert!(!panel_expired(1000, 1000 + 1799));
        assert!(panel_expired(1000, 1000 + 1800));
        assert!(panel_expired(1000, 1000 + 10_000));
        // Clock skew never expires the panel.
        assert!(!panel_expired(2000, 1000));
    }

    #[test]
    fn routing_keeps_quick_toggle() {
        assert!(wants_panel(None));
        assert!(wants_panel(Some("panel")));
        assert!(wants_panel(Some("config")));
        assert!(wants_panel(Some("menu")));
        assert!(!wants_panel(Some("on")));
        assert!(!wants_panel(Some("off")));
        assert!(!wants_panel(Some("power on")));
    }

    #[test]
    fn defaults_match_ts_fallback_literal() {
        // `{}` must deserialize to the TS `||` literal, with the TS
        // wire names (wlBots/derankBot).
        let cfg: NightmodeConfig = serde_json::from_str("{}").unwrap();
        assert!(!cfg.enabled);
        assert!(cfg.notify);
        assert_eq!(cfg.time, [21, 0, 9, 0]);
        assert!(cfg.wl_bots.is_empty());
        assert!(cfg.derank_bot);
        assert_eq!(cfg.utc, 1);
        let v: serde_json::Value = serde_json::from_str(
            r#"{"enabled":true,"notify":false,"time":[22,30,6,15],"wlBots":["1"],"derankBot":false,"utc":-5}"#,
        )
        .unwrap();
        let back: NightmodeConfig = serde_json::from_value(v).unwrap();
        assert_eq!(back.time, [22, 30, 6, 15]);
        assert_eq!(back.wl_bots, vec!["1".to_string()]);
        // Blob round-trips on the TS wire names (scheduler tick reads
        // this exact shape).
        let raw = serde_json::to_string(&back).unwrap();
        assert!(raw.contains("\"wlBots\""));
        assert!(raw.contains("\"derankBot\""));
    }

    #[test]
    fn toggles_flip_one_flag_and_preserve_blob() {
        let mut cfg = NightmodeConfig {
            enabled: false,
            notify: true,
            time: [21, 30, 9, 15],
            wl_bots: vec!["42".to_string()],
            derank_bot: true,
            utc: -5,
        };
        assert_eq!(
            panel_choice_of("enable_mode"),
            Some(PanelChoice::EnableMode)
        );
        assert_eq!(
            panel_choice_of("owner_notify"),
            Some(PanelChoice::OwnerNotify)
        );
        assert_eq!(panel_choice_of("derank_bot"), Some(PanelChoice::DerankBot));
        assert_eq!(panel_choice_of("hours_window"), None);
        assert_eq!(panel_choice_of("change_timezone"), None);
        assert_eq!(panel_choice_of("bogus"), None);
        assert_eq!(apply_panel_choice(&mut cfg, PanelChoice::EnableMode), 0);
        assert!(cfg.enabled);
        assert_eq!(apply_panel_choice(&mut cfg, PanelChoice::OwnerNotify), 1);
        assert!(!cfg.notify);
        assert_eq!(apply_panel_choice(&mut cfg, PanelChoice::DerankBot), 2);
        assert!(!cfg.derank_bot);
        // Full-blob preservation: nothing else moved.
        assert_eq!(cfg.time, [21, 30, 9, 15]);
        assert_eq!(cfg.wl_bots, vec!["42".to_string()]);
        assert_eq!(cfg.utc, -5);
    }

    #[test]
    fn time_inputs_parse_minutes_like_ts() {
        assert_eq!(parse_time_input("21"), Some((21, 0)));
        assert_eq!(parse_time_input("9"), Some((9, 0)));
        assert_eq!(parse_time_input("21:30"), Some((21, 30)));
        assert_eq!(parse_time_input("2130"), Some((21, 30)));
        assert_eq!(parse_time_input("06:15"), Some((6, 15)));
        assert_eq!(parse_time_input("0615"), Some((6, 15)));
        assert_eq!(parse_time_input("0:05"), Some((0, 5)));
        assert_eq!(parse_time_input(" 21:30 "), Some((21, 30)));
        assert_eq!(parse_time_input("24:00"), None);
        assert_eq!(parse_time_input("21:60"), None);
        assert_eq!(parse_time_input("21:5"), None);
        assert_eq!(parse_time_input("21:"), None);
        assert_eq!(parse_time_input(""), None);
        assert_eq!(parse_time_input("abc"), None);
        assert_eq!(parse_time_input("21:30:00"), None);
        assert_eq!(parse_time_input("12345"), None);
    }

    #[test]
    fn hierarchy_warnings_match_basics_check() {
        // Healthy bot: no warnings.
        let ok = basics_check(Some(10), 10, true);
        assert!(basics_warning_keys(&ok).is_empty());
        // Role not on top (but admin): only the not-high warning.
        let low = basics_check(Some(3), 10, true);
        assert_eq!(basics_warning_keys(&low), vec!["var_nm_role_app_not_high"]);
        // Role on top without admin: only the not-admin warning.
        let no_admin = basics_check(Some(10), 10, false);
        assert_eq!(
            basics_warning_keys(&no_admin),
            vec!["var_nm_role_app_not_admin"]
        );
        // No bot role (TS undefined botRole): all three fire.
        let missing = basics_check(None, 10, false);
        assert_eq!(
            basics_warning_keys(&missing),
            vec![
                "var_nm_role_app_dont_exist",
                "var_nm_role_app_not_high",
                "var_nm_role_app_not_admin",
            ]
        );
    }

    #[test]
    fn field_renders_match_ts() {
        assert_eq!(status_dot(true), "🟢");
        assert_eq!(status_dot(false), "🔴");
        assert_eq!(wl_bots_field(&[], "None"), "None");
        assert_eq!(
            wl_bots_field(&["1".to_string(), "2".to_string()], "None"),
            "<@1><@2>"
        );
        assert_eq!(utc_offset_label(1), "UTC+1");
        assert_eq!(utc_offset_label(0), "UTC+0");
        assert_eq!(utc_offset_label(-5), "UTC-5");
    }

    #[test]
    fn timezone_picker_covers_table_without_plus8() {
        let opts = utc_options();
        // -11..=14 minus the missing +8 slot.
        assert_eq!(opts.len(), 25);
        assert_eq!(opts.first(), Some(&(-11, "Pacific/Pago_Pago")));
        assert_eq!(opts.last(), Some(&(14, "Pacific/Kiritimati")));
        assert!(opts.iter().all(|(o, _)| *o != 8));
        assert!(opts.iter().any(|(o, n)| *o == 1 && *n == "Europe/Paris"));
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn cfg_loads_legacy_only_blob() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "UTILS.NIGHT_MODE",
            r#"{"enabled":true,"notify":false,"time":[22,30,6,15],"wlBots":[],"derankBot":true,"utc":-5}"#,
        )
        .await
        .unwrap();
        let cfg = load_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(!cfg.notify);
        assert_eq!(cfg.time, [22, 30, 6, 15]);
        assert_eq!(cfg.utc, -5);
    }

    #[tokio::test]
    async fn persist_dual_writes_table_and_legacy() {
        let pool = mem_pool().await;
        let cfg = NightmodeConfig {
            enabled: true,
            notify: false,
            time: [22, 30, 6, 15],
            wl_bots: vec!["7".to_string()],
            derank_bot: false,
            utc: -5,
        };
        persist_cfg(&pool, "g", &cfg).await.unwrap();
        // Legacy kv row stays fresh for unmigrated readers.
        let raw = crate::db::kv_get(&pool, "g", "UTILS.NIGHT_MODE")
            .await
            .expect("legacy row");
        let back: NightmodeConfig = serde_json::from_str(&raw).unwrap();
        assert!(back.enabled);
        assert_eq!(back.wl_bots, vec!["7".to_string()]);
        // Table-first load hits the table row.
        let loaded = load_cfg(&pool, "g").await;
        assert!(loaded.enabled);
        assert!(!loaded.derank_bot);
        assert_eq!(loaded.time, [22, 30, 6, 15]);
    }
}
