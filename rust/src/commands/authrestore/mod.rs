// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/authrestore/*
// (authrestore.ts parent + !set/!delete/!get/!roles/!force-join.ts)
// and src/core/functions/authRestoreHelper.ts.
//
// The HorizonGateway HTTP API (create/securityCodeUpdate/changeRole/
// forcejoin + the force-join websocket stream) and the html2png stats
// image are external infra (see Blocked in MIGRATION.md): the request
// builders, response parsers and websocket-event parser below are
// ported and unit-tested, the live calls run only when the gateway is
// configured. Everything else (secret-code lookup, pagination,
// histogram/locale/recent stats, category navigation, RESTORECORD
// kv state) is fully offline.
//
// TS keys: GUILD.RESTORECORD {channelId, messageId}; the `authrestore`
// table rows are GuildAuthRestore blobs keyed by guild id.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Members per page in the `get` stored-users embed. Mirrors
/// `itemsPerPage = 5` in !get.ts.
pub const ITEMS_PER_PAGE: usize = 5;

/// OAuth scope used for the verify button. Mirrors
/// `"identify+guilds+guilds.join"` in !set.ts.
pub const VERIFY_SCOPE: &str = "identify+guilds+guilds.join";

/// Detail categories in the `get` pager. Mirrors `currentCategory`
/// 0 (main) / 1 (members) / 2 (stats image).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GetCategory {
    Main,
    Members,
    Stats,
}

/// OAuth author blob. Mirrors `oauth2Author`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Oauth2Author {
    pub id: String,
    pub username: String,
}

/// Per-guild config blob. Mirrors `GuildAuthRestore.config`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthRestoreConfig {
    #[serde(rename = "roleId")]
    pub role_id: String,
    #[serde(rename = "securityCode")]
    pub security_code: String,
    pub author: Oauth2Author,
    #[serde(rename = "createDate", default)]
    pub create_date: i64,
    #[serde(rename = "securityCodeUsed", default)]
    pub security_code_used: i64,
}

/// One `authrestore` table row. Mirrors `GuildAuthRestore`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuildAuthRestore {
    pub config: AuthRestoreConfig,
    pub members: Vec<String>,
}

/// One verified member. Mirrors `oauth2Member`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Oauth2Member {
    pub token: String,
    pub id: String,
    pub username: String,
    #[serde(rename = "globalName")]
    pub global_name: String,
    #[serde(rename = "registerTimestamp", default)]
    pub register_timestamp: i64,
    pub locale: String,
}

/// Local button binding. Mirrors `AuthRestoreSchema` stored at
/// `<guild>.GUILD.RESTORECORD`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RestoreRecord {
    #[serde(rename = "channelId")]
    pub channel_id: String,
    #[serde(rename = "messageId")]
    pub message_id: String,
}

/// Secret-code lookup. Mirrors `getGuildDataPerSecretCode`
/// (linear scan, first row whose config.securityCode matches).
pub fn find_guild_by_secret<'a>(
    entries: &'a [(String, GuildAuthRestore)],
    secret: &str,
) -> Option<(&'a str, &'a GuildAuthRestore)> {
    entries
        .iter()
        .find(|(_, v)| v.config.security_code == secret)
        .map(|(id, v)| (id.as_str(), v))
}

/// Keep only saved members referenced by the guild config. Mirrors
/// `AllUsersData.filter((x) => Data.data.members.includes(x.id))`.
pub fn saved_for_guild(all: &[Oauth2Member], member_ids: &[String]) -> Vec<Oauth2Member> {
    let wanted: HashSet<&str> = member_ids.iter().map(|s| s.as_str()).collect();
    all.iter()
        .filter(|m| wanted.contains(m.id.as_str()))
        .cloned()
        .collect()
}

/// Page count for the stored-users embed. Mirrors
/// `Math.ceil(members.length / itemsPerPage)`.
pub fn page_count(total: usize, per_page: usize) -> usize {
    if per_page == 0 {
        return 0;
    }
    total.div_ceil(per_page)
}

/// One page slice. Mirrors `members.slice(startIndex, endIndex)`.
pub fn page_slice<T>(items: &[T], page: usize, per_page: usize) -> &[T] {
    let start = page.saturating_mul(per_page);
    if start >= items.len() || per_page == 0 {
        return &[];
    }
    let end = (start + per_page).min(items.len());
    &items[start..end]
}

/// One stored-user line. Mirrors the per-member template in
/// `generateEmbed` (index is the 1-based global index).
pub fn member_line(
    global_index: usize,
    id: &str,
    locale_label: &str,
    locale_emoji: &str,
    locale: &str,
    username_label: &str,
    username: &str,
) -> String {
    format!(
        "{global_index}) <@{id}>\n`{locale_label}`: {locale_emoji} (**{locale}**)\n`{username_label}`: **{username}**"
    )
}

/// Locale flag. Mirrors `discordLocales[member.locale] || "🌐"`.
pub fn locale_emoji(locale: &str) -> &'static str {
    match locale {
        "en-US" => "🇺🇸",
        "en-GB" => "🇬🇧",
        "en-CA" => "🇨🇦",
        "en-AU" => "🇦🇺",
        "en-NZ" => "🇳🇿",
        "en-IN" => "🇮🇳",
        "en-SG" => "🇸🇬",
        "en-ZA" => "🇿🇦",
        "fr" => "🇫🇷",
        "fr-BE" => "🇧🇪",
        "fr-CA" => "🇨🇦",
        "fr-CH" => "🇨🇭",
        "de" => "🇩🇪",
        "de-AT" => "🇦🇹",
        "de-CH" => "🇨🇭",
        "es-ES" => "🇪🇸",
        "es-MX" => "🇲🇽",
        "es-AR" => "🇦🇷",
        "es-CO" => "🇨🇴",
        "es-CL" => "🇨🇱",
        "pt-BR" => "🇧🇷",
        "pt-PT" => "🇵🇹",
        "it" => "🇮🇹",
        "it-CH" => "🇨🇭",
        "nl" => "🇳🇱",
        "nl-BE" => "🇧🇪",
        "ru" => "🇷🇺",
        "pl" => "🇵🇱",
        "ja" => "🇯🇵",
        "ko" => "🇰🇷",
        "zh-CN" => "🇨🇳",
        "zh-TW" => "🇹🇼",
        "tr" => "🇹🇷",
        "sv-SE" => "🇸🇪",
        "da" => "🇩🇰",
        "fi" => "🇫🇮",
        "no" => "🇳🇴",
        "cs" => "🇨🇿",
        "el" => "🇬🇷",
        "hu" => "🇭🇺",
        "ro" => "🇷🇴",
        "vi" => "🇻🇳",
        "th" => "🇹🇭",
        "uk" => "🇺🇦",
        "hi" => "🇮🇳",
        "bg" => "🇧🇬",
        "hr" => "🇭🇷",
        "lt" => "🇱🇹",
        "lv" => "🇱🇻",
        "et" => "🇪🇪",
        "ms" => "🇲🇾",
        "he" => "🇮🇱",
        "ar-SA" => "🇸🇦",
        "ar-AE" => "🇦🇪",
        "fa" => "🇮🇷",
        "id" => "🇮🇩",
        _ => "🌐",
    }
}

const MONTHS_SHORT: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// `en-US` short date label (`"Oct 8"`). Mirrors
/// `toLocaleDateString("en-US", {month: "short", day: "numeric"})`.
/// Computed in UTC: the bot runs on UTC hosts (same as the TS
/// production containers), where the runtime TZ matches UTC.
pub fn short_day_label(unix_ms: i64) -> String {
    let days = unix_ms.div_euclid(86_400_000);
    let (_, month, day) = civil_from_days(days);
    format!("{} {day}", MONTHS_SHORT[(month - 1) as usize])
}

/// Recent-verification label (`"Oct 8, 02:30 PM"`). Mirrors
/// `toLocaleDateString("en-US", {month, day, hour 2-digit,
/// minute 2-digit})` (12-hour clock).
pub fn recent_label(unix_ms: i64) -> String {
    let days = unix_ms.div_euclid(86_400_000);
    let rem_ms = unix_ms.rem_euclid(86_400_000);
    let (_, month, day) = civil_from_days(days);
    let hour24 = (rem_ms / 3_600_000) as u32;
    let minute = ((rem_ms / 60_000) % 60) as u32;
    let (hour12, suffix) = match hour24 {
        0 => (12, "AM"),
        1..=11 => (hour24, "AM"),
        12 => (12, "PM"),
        _ => (hour24 - 12, "PM"),
    };
    format!(
        "{} {day}, {hour12:02}:{minute:02} {suffix}",
        MONTHS_SHORT[(month - 1) as usize]
    )
}

/// 30-day registration histogram. Mirrors the `timeLabels` /
/// `registrationData` computation in !get.ts (buckets compare the
/// `en-US` day label, so same month/day across years collides —
/// preserved intentionally).
pub fn registration_histogram(members: &[Oauth2Member], now_ms: i64) -> (Vec<String>, Vec<usize>) {
    const DAY_MS: i64 = 24 * 60 * 60 * 1000;
    let labels: Vec<String> = (0..30)
        .map(|i| short_day_label(now_ms - (29 - i) * DAY_MS))
        .collect();
    let counts = labels
        .iter()
        .map(|label| {
            members
                .iter()
                // Mirrors `if (!member.registerTimestamp) return false`.
                .filter(|m| m.register_timestamp != 0)
                .filter(|m| short_day_label(m.register_timestamp) == *label)
                .count()
        })
        .collect();
    (labels, counts)
}

/// Locale distribution, most common first. Mirrors the
/// `localeData` reduce + sort in !get.ts: the TS object accumulator
/// preserves first-seen insertion order and `Array.sort` is stable,
/// so ties keep first-seen order (matched here with an explicit
/// order table, not alphabetical).
pub fn locale_distribution(members: &[Oauth2Member]) -> Vec<(String, usize)> {
    let mut order: Vec<String> = vec![];
    let mut counts: HashMap<String, usize> = HashMap::new();
    for m in members {
        if !counts.contains_key(&m.locale) {
            order.push(m.locale.clone());
        }
        *counts.entry(m.locale.clone()).or_default() += 1;
    }
    let mut rank: HashMap<&str, usize> = HashMap::new();
    for (i, locale) in order.iter().enumerate() {
        rank.insert(locale.as_str(), i);
    }
    let mut out: Vec<(String, usize)> = counts.into_iter().collect();
    out.sort_by(|a, b| {
        b.1.cmp(&a.1).then(
            rank.get(a.0.as_str())
                .unwrap_or(&usize::MAX)
                .cmp(rank.get(b.0.as_str()).unwrap_or(&usize::MAX)),
        )
    });
    out
}

/// Ten most recently verified members. Mirrors
/// `recentVerifications` in !get.ts (sorted desc, top 10).
pub fn recent_verifications(members: &[Oauth2Member]) -> Vec<(String, String)> {
    let mut sorted: Vec<&Oauth2Member> = members.iter().collect();
    sorted.sort_by_key(|m| std::cmp::Reverse(m.register_timestamp));
    sorted
        .into_iter()
        .take(10)
        .map(|m| (m.username.clone(), recent_label(m.register_timestamp)))
        .collect()
}

/// Split guild members into already-present vs to-force-join.
/// Mirrors the `membersAlreadyHere` / `forceJoinMembers` filters.
pub fn partition_force_join(
    member_ids: &[String],
    present: &HashSet<String>,
) -> (Vec<String>, Vec<String>) {
    let mut here = vec![];
    let mut missing = vec![];
    for id in member_ids {
        if present.contains(id) {
            here.push(id.clone());
        } else {
            missing.push(id.clone());
        }
    }
    (here, missing)
}

/// Progress numbers for the force-join confirm embed. Mirrors the
/// three fields in !force-join.ts
/// (members found / already here / possible join).
pub fn force_join_counts(
    member_ids: &[String],
    present: &HashSet<String>,
) -> (usize, usize, usize) {
    let (here, missing) = partition_force_join(member_ids, present);
    (member_ids.len(), here.len(), missing.len())
}

/// Split the force-join HTTP response (`"wsUrl%token"`). Mirrors
/// `res.message.split("%")` in !force-join.ts: the URL is segment 0
/// and the token segment 1 — further segments are dropped, exactly
/// like `data[0]` / `data[1]` in TS.
pub fn parse_forcejoin_response(message: &str) -> Option<(String, String)> {
    let mut parts = message.split('%');
    let url = parts.next()?;
    let token = parts.next()?;
    if url.is_empty() || token.is_empty() {
        return None;
    }
    Some((url.to_string(), token.to_string()))
}

/// Force-join websocket progress event. Mirrors the `message`
/// handler in !force-join.ts (`parts[1]` is the kind,
/// `parts[2..].join(":")` the payload).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ForceJoinWsEvent {
    Size(String),
    Start,
    Add,
    End(String),
    Unknown(String),
}

pub fn parse_ws_event(raw: &str) -> ForceJoinWsEvent {
    let parts: Vec<&str> = raw.split(':').collect();
    let kind = parts.get(1).copied().unwrap_or("");
    let payload = parts.get(2..).map(|p| p.join(":")).unwrap_or_default();
    match kind {
        "size" => ForceJoinWsEvent::Size(payload),
        "start" => ForceJoinWsEvent::Start,
        "add" => ForceJoinWsEvent::Add,
        "end" => ForceJoinWsEvent::End(payload),
        other => ForceJoinWsEvent::Unknown(other.to_string()),
    }
}

/// Step the `get` pager. Mirrors the collector in !get.ts
/// (`next`/`previous` switch category 0..=2 and reset the page;
/// `pnext`/`pprevious` move the page only in category 1).
/// Intentional hardening vs TS: `!get.ts:389-392` does bare
/// `currentPage++`/`--`, so paging past the last page renders an
/// empty embed (and below zero hits JS negative-index slicing);
/// the Rust port clamps to the valid range instead.
pub fn step_get_pager(
    category: GetCategory,
    page: usize,
    action: &str,
    total_members: usize,
) -> (GetCategory, usize) {
    let idx: usize = match category {
        GetCategory::Main => 0,
        GetCategory::Members => 1,
        GetCategory::Stats => 2,
    };
    let (next_idx, next_page) = match action {
        "next" => ((idx + 1).min(2), 0),
        "previous" => (idx.saturating_sub(1), 0),
        "pnext" if idx == 1 => {
            let max = page_count(total_members, ITEMS_PER_PAGE).saturating_sub(1);
            (1, (page + 1).min(max.max(page)))
        }
        "pprevious" if idx == 1 => (1, page.saturating_sub(1)),
        _ => (idx, page),
    };
    let next_category = match next_idx {
        0 => GetCategory::Main,
        1 => GetCategory::Members,
        _ => GetCategory::Stats,
    };
    (next_category, next_page)
}

/// Whether the page arrows are enabled. Mirrors the `setDisabled`
/// flags in `updateComponents` (page arrows only in category 1).
pub fn pager_arrows(
    category: GetCategory,
    page: usize,
    total_members: usize,
) -> (bool, bool, bool, bool) {
    let pages = page_count(total_members, ITEMS_PER_PAGE);
    let in_members = category == GetCategory::Members;
    let prev_page = in_members && page > 0;
    let next_page = in_members && pages > 0 && page + 1 < pages;
    let prev_cat = category != GetCategory::Main;
    let next_cat = category != GetCategory::Stats;
    (prev_page, next_page, prev_cat, next_cat)
}

/// Verify-button OAuth2 link for a guild. Mirrors
/// `createOauth2LinkWithGuild` with the identify+guilds+guilds.join
/// scope from !set.ts.
pub fn verify_link(client_id: &str, gateway_base: &str, guild_id: &str) -> String {
    let redirect =
        crate::funcs::gateway_url(gateway_base, crate::funcs::GatewayMethod::GenerateOauthLink)
            .unwrap_or_default();
    crate::funcs::oauth2_link(client_id, &redirect, VERIFY_SCOPE, guild_id)
}

/// Gateway endpoint for an authrestore call. Mirrors
/// `HorizonGatewayInternal(method)` — the `HorizonGatewayLocal`
/// override wins over the public base (`apiUrlParser.ts:46-50`);
/// `None` when neither is configured (the live call is then skipped
/// like the TS catch path that replies `rc_command_horizongw_down`).
pub fn gateway_endpoint(method: crate::funcs::GatewayMethod) -> Option<String> {
    let base = std::env::var("HORIZON_GATEWAY_LOCAL")
        .ok()
        .filter(|s| !s.is_empty())
        .or_else(crate::config::gateway_base)?;
    crate::funcs::gateway_url(&base, method).ok()
}

/// Parse one `authrestore`-table row value. Used to rebuild the
/// `getGuildDataPerSecretCode` scan over the kv store (the TS
/// `authrestore` table holds `GuildAuthRestore` blobs keyed by guild
/// id; the Rust port keeps the same blobs under any kv key).
pub fn parse_authrestore_row(raw: &str) -> Option<GuildAuthRestore> {
    serde_json::from_str(raw).ok()
}

/// Load every locally stored authrestore config. Mirrors
/// `authRestoreTable.all()` from `Events/client/ready.ts`.
pub async fn load_authrestore_entries(pool: &crate::db::Pool) -> Vec<(String, GuildAuthRestore)> {
    let rows: Vec<(String, String)> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .map(|(gid, _, value)| (gid, value))
        .collect();
    rows.into_iter()
        .filter_map(|(gid, raw)| parse_authrestore_row(&raw).map(|data| (gid, data)))
        .collect()
}

/// `MM/DD/YYYY HH:mm` stamp. Mirrors `format(date,
/// "MM/DD/YYYY HH:mm")` from `date_and_time.ts` (UTC).
pub fn created_at_label(unix_ms: i64) -> String {
    let days = unix_ms.div_euclid(86_400_000);
    let rem = unix_ms.rem_euclid(86_400_000);
    let (year, month, day) = civil_from_days(days);
    format!(
        "{month:02}/{day:02}/{year} {:02}:{:02}",
        (rem / 3_600_000) as u32,
        ((rem / 60_000) % 60) as u32
    )
}

/// Main-info embed fields for `get`. Mirrors the five `setFields`
/// in !get.ts (ids/mentions are pre-rendered by the caller so the
/// pure layout stays testable).
pub fn main_info_fields(
    guild_id: &str,
    role_text: &str,
    date_note: &str,
    created: &str,
    key_used: i64,
    author_text: &str,
) -> Vec<(String, String, bool)> {
    vec![
        ("server-id".to_string(), guild_id.to_string(), true),
        ("role".to_string(), role_text.to_string(), true),
        (
            "created".to_string(),
            format!("{date_note}\n\n{created}"),
            false,
        ),
        ("key-used".to_string(), key_used.to_string(), true),
        ("author".to_string(), author_text.to_string(), true),
    ]
}

/// Stored-users page body. Mirrors `generateEmbed` in !get.ts:
/// one `member_line` per row on the page, empty when the page is
/// out of range (with the pager clamp above this only happens for
/// an empty member list).
pub fn members_page_text(
    members: &[Oauth2Member],
    page: usize,
    locale_label: &str,
    username_label: &str,
) -> String {
    page_slice(members, page, ITEMS_PER_PAGE)
        .iter()
        .enumerate()
        .map(|(i, m)| {
            member_line(
                page * ITEMS_PER_PAGE + i + 1,
                &m.id,
                locale_label,
                locale_emoji(&m.locale),
                &m.locale,
                username_label,
                &m.username,
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Page footer. Mirrors `rc_get_secondEmbed_footer`
/// (`"Page ${from} / ${to}"`).
pub fn page_footer(template: &str, page: usize, total_members: usize) -> String {
    template
        .replace("${from}", &(page + 1).to_string())
        .replace(
            "${to}",
            &page_count(total_members, ITEMS_PER_PAGE).to_string(),
        )
}

/// Stats-category text summary. Carries the same numbers as the
/// html2png dashboard (`registrationData`, `localeData`,
/// `recentVerifications`): the Chromium render is external infra,
/// so the Rust port renders them as text.
pub fn stats_summary_text(
    members: &[Oauth2Member],
    now_ms: i64,
    total_members_label: &str,
    locales_label: &str,
    recent_label_title: &str,
) -> String {
    let (labels, counts) = registration_histogram(members, now_ms);
    let spark: String = counts
        .iter()
        .map(|c| match c {
            0 => " ",
            1..=2 => ".",
            3..=5 => ":",
            _ => "#",
        })
        .collect();
    let dist = locale_distribution(members)
        .into_iter()
        .map(|(locale, n)| format!("{} {}: {n}", locale_emoji(&locale), locale))
        .collect::<Vec<_>>()
        .join(", ");
    let recent = recent_verifications(members)
        .into_iter()
        .map(|(name, date)| format!("{name} ({date})"))
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "{total_members_label}: {}\n{} [{}]\n{locales_label}: {}\n{recent_label_title}:\n{}",
        members.len(),
        labels.first().cloned().unwrap_or_default()
            + " -> "
            + &labels.last().cloned().unwrap_or_default(),
        spark,
        if dist.is_empty() { "-" } else { &dist },
        if recent.is_empty() { "-" } else { &recent },
    )
}

/// Create payload. Mirrors `AuthRestore_EntryType` sent by
/// `createAuthRestore` (!set.ts passes the full interaction user as
/// `author`; callers serialize the live user object).
pub fn create_payload(
    guild_id: &str,
    api_token: &str,
    role_id: &str,
    author: serde_json::Value,
) -> serde_json::Value {
    serde_json::json!({
        "guildId": guild_id,
        "apiToken": api_token,
        "roleId": role_id,
        "author": author,
    })
}

/// Force-join payload. Mirrors `AuthRestore_ForceJoin_EntryType`.
pub fn forcejoin_payload(
    guild_id: &str,
    api_token: &str,
    secret_code: &str,
    target_guild_id: &str,
    members: &[String],
) -> serde_json::Value {
    serde_json::json!({
        "guildId": guild_id,
        "apiToken": api_token,
        "secretCode": secret_code,
        "targetGuildId": target_guild_id,
        "membersToForceJoin": members,
    })
}

/// Key-update payload. Mirrors `AuthRestore_KeyUpdate_EntryType`
/// sent by `securityCodeUpdate` (TS key `securityCodeUpdate`).
pub fn key_update_payload(guild_id: &str, api_token: &str, secret_code: &str) -> serde_json::Value {
    serde_json::json!({
        "guildId": guild_id,
        "apiToken": api_token,
        "secretCode": secret_code,
    })
}

/// Role-update payload. Mirrors `AuthRestore_RoleUpdate_EntryType`
/// sent by `changeRoleAuthRestore`.
pub fn role_update_payload(guild_id: &str, api_token: &str, role_id: &str) -> serde_json::Value {
    serde_json::json!({
        "guildId": guild_id,
        "apiToken": api_token,
        "roleId": role_id,
    })
}

/// Gateway response. Mirrors `AuthRestore_ResponseType`
/// (`status: "OK" | "ERR"`, `message`, optional `secretCode`);
/// `ForceJoin_ResponseType` is the same shape without the code.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthRestoreResponse {
    pub ok: bool,
    pub message: String,
    pub secret_code: String,
}

/// Parse a gateway response body. `None` when `status` is missing
/// (mirrors the TS `|| {}` fallback: no status means unusable).
/// `secretCode` defaults to empty like the TS `?.` access.
pub fn parse_authrestore_response(body: &serde_json::Value) -> Option<AuthRestoreResponse> {
    let status = body.get("status")?.as_str()?;
    Some(AuthRestoreResponse {
        ok: status == "OK",
        message: body
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or_default()
            .to_string(),
        secret_code: body
            .get("secretCode")
            .and_then(|s| s.as_str())
            .unwrap_or_default()
            .to_string(),
    })
}

/// `secretCode` string from a gateway body, empty when absent.
/// Mirrors the `body.secretCode` reads in !set.ts / !force-join.ts.
pub fn secret_from_response(body: &serde_json::Value) -> String {
    parse_authrestore_response(body)
        .map(|r| r.secret_code)
        .unwrap_or_default()
}

/// OAuth2 link without a guild state. Mirrors
/// `createOauth2LinkWithoutGuild` (`Oauth2_Link.split("&state=")[0]`,
/// default scope `"identify"`).
pub fn oauth2_link_without_guild(
    client_id: &str,
    redirect_uri: &str,
    scope: Option<&str>,
) -> String {
    crate::funcs::oauth2_link(client_id, redirect_uri, scope.unwrap_or("identify"), "")
        .split("&state=")
        .next()
        .unwrap_or_default()
        .to_string()
}

/// POST a JSON payload to the gateway. Returns the decoded body;
/// any transport error means the gateway is down (TS catch path).
pub async fn gateway_post(
    url: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value, reqwest::Error> {
    reqwest::Client::new()
        .post(url)
        .header("Accept", "application/json")
        .json(payload)
        .send()
        .await?
        .json()
        .await
}

async fn t(ctx: &Ctx<'_>, key: &str, fallback: &str) -> String {
    crate::commands::lang_for(ctx, key, fallback).await
}

// Bind the verify button to a message.
// Mirrors !set.ts: the role option is optional in the slash schema
// (`authrestore.ts:93-107`, missing role ->
// `buttonreaction_roles_not_found`); the message must belong to the
// bot (`buttonreaction_message_other_user_error`); on success the
// gateway creates the config, the button (label `rc_verify`) is
// edited onto the message, GUILD.RESTORECORD is stored, the secret
// is replied (ephemeral) and DM'd (`rc_command_ok_dm` +
// `rc_command_dm_ok` / `rc_command_dm_failed` follow-ups).

// Remove the AuthRestore button.
// Mirrors !delete.ts: the stored message is fetched (fetch failure ->
// `reactionroles_cant_fetched_reaction_remove`), must belong to the

/// Load every locally stored verified member. Mirrors
/// `authRestoreTable.get("saved_users")` (the `SavedMembersAuthRestore`
/// array lives in the same table as the guild configs).
pub async fn load_saved_members(pool: &crate::db::Pool) -> Vec<Oauth2Member> {
    let rows: Vec<String> = crate::db::kv_scan_all(pool)
        .await
        .into_iter()
        .map(|(_, _, v)| v)
        .collect();
    let mut out = vec![];
    for raw in rows {
        if let Ok(list) = serde_json::from_str::<Vec<Oauth2Member>>(&raw) {
            out.extend(list);
        }
    }
    out
}

/// Ephemeral `rc_key_doesnt_exist` reply. Mirrors the miss path in
/// !get.ts / !roles.ts / !force-join.ts.
async fn reply_missing_key(ctx: &Ctx<'_>, secret: &str) -> Result<(), anyhow::Error> {
    let text = t(
        ctx,
        "rc_key_doesnt_exist",
        "${client.iHorizon_Emojis.No} The AuthRestore module with the following key: **${secretCode}** doesn't exist!",
    )
    .await
    .replace("${secretCode}", secret);
    ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
        .await?;
    Ok(())
}

// Show AuthRestore config info.
// Mirrors !get.ts: secret lookup first (`rc_key_doesnt_exist` on
// miss), security-code tick only on hit, then the main embed, the
// paginated stored-users

/// Force stored members to join.
// Mirrors !force-join.ts: secret lookup (`rc_key_doesnt_exist` on
// miss), the found/already-here/possible-join counts embed, a yes/no
// confirm (shared `prompt_yes_or_no` helper: Danger yes / Success no,
// invoker-only; declining stops like the TS `no` path), then the
// gateway forcejoin POST with `guildId = Data.id`,
// `targetGuildId = interaction.guildId` and
// `membersToForceJoin = members-not-here`. The renewed private code
// from the `end` event is DM'd like the TS handler
// (`rc_command_ok_dm` + `rc_command_dm_ok` / `rc_command_dm_failed`
// follow-ups). Deferred live-only piece: the live websocket progress
// stream off the returned URL (event parsing in `parse_ws_event`).
#[allow(clippy::module_inception)]
pub mod authrestore;
pub mod delete;
pub mod force_join;
pub mod get;
pub mod roles;
pub mod set;

/// Old registry path (`authrestore::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::authrestore::*;
    pub use super::delete::*;
    pub use super::force_join::*;
    pub use super::get::*;
    pub use super::roles::*;
    pub use super::set::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_guild(id: &str, secret: &str) -> (String, GuildAuthRestore) {
        (
            id.to_string(),
            GuildAuthRestore {
                config: AuthRestoreConfig {
                    role_id: "7".to_string(),
                    security_code: secret.to_string(),
                    author: Oauth2Author {
                        id: "1".to_string(),
                        username: "owner".to_string(),
                    },
                    create_date: 1_700_000_000_000,
                    security_code_used: 3,
                },
                members: vec!["a".to_string(), "b".to_string()],
            },
        )
    }

    fn sample_member(id: &str, ts: i64, locale: &str) -> Oauth2Member {
        Oauth2Member {
            token: "tok".to_string(),
            id: id.to_string(),
            username: format!("user-{id}"),
            global_name: String::new(),
            register_timestamp: ts,
            locale: locale.to_string(),
        }
    }

    #[test]
    fn secret_lookup_matches_ts_scan() {
        let entries = vec![sample_guild("g1", "s1"), sample_guild("g2", "s2")];
        let (id, data) = find_guild_by_secret(&entries, "s2").unwrap();
        assert_eq!(id, "g2");
        assert_eq!(data.members.len(), 2);
        assert!(find_guild_by_secret(&entries, "nope").is_none());
    }

    #[test]
    fn saved_members_filter_and_pager() {
        let all = vec![
            sample_member("a", 10, "en-US"),
            sample_member("zzz", 20, "fr"),
            sample_member("b", 30, "en-US"),
        ];
        let kept = saved_for_guild(&all, &["a".to_string(), "b".to_string()]);
        assert_eq!(kept.len(), 2);
        assert_eq!(page_count(kept.len(), ITEMS_PER_PAGE), 1);
        assert_eq!(page_count(6, ITEMS_PER_PAGE), 2);
        assert_eq!(page_slice(&kept, 0, ITEMS_PER_PAGE).len(), 2);
        assert!(page_slice(&kept, 1, ITEMS_PER_PAGE).is_empty());
        assert_eq!(page_count(0, ITEMS_PER_PAGE), 0);
    }

    #[test]
    fn histogram_locale_recent_shapes() {
        // 2026-10-01 00:00:00 UTC in ms.
        let now = 1_789_123_200_000i64;
        let members = vec![
            sample_member("a", now, "en-US"),
            sample_member("b", now, "fr"),
            sample_member("c", now - 86_400_000, "en-US"),
        ];
        let (labels, counts) = registration_histogram(&members, now);
        assert_eq!(labels.len(), 30);
        assert_eq!(counts.iter().sum::<usize>(), 3);
        assert_eq!(*counts.last().unwrap(), 2);
        let dist = locale_distribution(&members);
        assert_eq!(dist[0], ("en-US".to_string(), 2));
        let recent = recent_verifications(&members);
        assert_eq!(recent.len(), 3);
        assert!(recent[0].1.contains(','));
    }

    #[test]
    fn force_join_partition_and_ws_protocol() {
        let ids = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let present: HashSet<String> = ["b".to_string()].into_iter().collect();
        let (here, missing) = partition_force_join(&ids, &present);
        assert_eq!(here, vec!["b".to_string()]);
        assert_eq!(missing.len(), 2);
        assert_eq!(force_join_counts(&ids, &present), (3, 1, 2));
        let (url, token) = parse_forcejoin_response("wss://gw/x%tok123").unwrap();
        assert_eq!((url.as_str(), token.as_str()), ("wss://gw/x", "tok123"));
        assert!(parse_forcejoin_response("no-separator").is_none());
        assert_eq!(
            parse_ws_event("fj:size:12"),
            ForceJoinWsEvent::Size("12".to_string())
        );
        assert_eq!(parse_ws_event("fj:start:"), ForceJoinWsEvent::Start);
        assert_eq!(parse_ws_event("fj:add:"), ForceJoinWsEvent::Add);
        assert_eq!(
            parse_ws_event("fj:end:newcode"),
            ForceJoinWsEvent::End("newcode".to_string())
        );
        // Payload may itself contain colons (value2 = rest joined).
        assert_eq!(
            parse_ws_event("fj:size:a:b"),
            ForceJoinWsEvent::Size("a:b".to_string())
        );
    }

    #[test]
    fn pager_navigation_matches_collector() {
        let total = 12;
        assert_eq!(
            step_get_pager(GetCategory::Main, 0, "next", total),
            (GetCategory::Members, 0)
        );
        assert_eq!(
            step_get_pager(GetCategory::Members, 0, "next", total),
            (GetCategory::Stats, 0)
        );
        assert_eq!(
            step_get_pager(GetCategory::Stats, 0, "previous", total),
            (GetCategory::Members, 0)
        );
        assert_eq!(
            step_get_pager(GetCategory::Members, 0, "pnext", total),
            (GetCategory::Members, 1)
        );
        assert_eq!(
            step_get_pager(GetCategory::Members, 1, "pprevious", total),
            (GetCategory::Members, 0)
        );
        // Page buttons are inert outside the members category.
        assert_eq!(
            step_get_pager(GetCategory::Main, 0, "pnext", total),
            (GetCategory::Main, 0)
        );
        let (pp, pn, pc_prev, pc_next) = pager_arrows(GetCategory::Members, 0, total);
        assert!(!pp && pn && pc_prev && pc_next);
    }

    #[test]
    fn member_lines_render_like_ts() {
        let line = member_line(2, "123", "Locale", "🇺🇸", "en-US", "Username", "alice");
        assert_eq!(
            line,
            "2) <@123>\n`Locale`: 🇺🇸 (**en-US**)\n`Username`: **alice**"
        );
    }

    #[test]
    fn links_and_payloads_mirror_ts() {
        let link = verify_link("cid", "https://gw.example/", "gid9");
        assert!(link.contains("client_id=cid"));
        assert!(link.contains("state=gid9"));
        // TS template substitution is raw (no percent-encoding).
        assert!(link.contains(VERIFY_SCOPE));
        assert!(link.contains("https://gw.example/api/ihorizon/v1/oauth2"));
        let payload = create_payload(
            "g",
            "tok",
            "r",
            serde_json::json!({"id": "u", "username": "name"}),
        );
        assert_eq!(payload["roleId"], "r");
        assert_eq!(payload["author"]["id"], "u");
        let fj = forcejoin_payload("g", "tok", "s", "t", &["a".to_string()]);
        assert_eq!(fj["membersToForceJoin"][0], "a");
        assert_eq!(fj["guildId"], "g");
        assert_eq!(fj["targetGuildId"], "t");
        assert_eq!(locale_emoji("en-US"), "🇺🇸");
        assert_eq!(locale_emoji("xx-YY"), "🌐");
        // Exact TS table: unknown regional variants fall back to 🌐.
        assert_eq!(locale_emoji("fr-FR"), "🌐");
    }

    #[test]
    fn secret_flow_payloads_responses_and_guildless_link() {
        // Key/role update payloads mirror the TS entry types exactly.
        let key = key_update_payload("g", "tok", "s3cr3t");
        assert_eq!(key["guildId"], "g");
        assert_eq!(key["apiToken"], "tok");
        assert_eq!(key["secretCode"], "s3cr3t");
        let role = role_update_payload("g", "tok", "r9");
        assert_eq!(role["guildId"], "g");
        assert_eq!(role["roleId"], "r9");
        // Gateway response parsing (AuthRestore_ResponseType shape).
        let ok = serde_json::json!({"status": "OK", "message": "m", "secretCode": "abc"});
        let parsed = parse_authrestore_response(&ok).unwrap();
        assert!(parsed.ok);
        assert_eq!(parsed.secret_code, "abc");
        assert_eq!(secret_from_response(&ok), "abc");
        let err = serde_json::json!({"status": "ERR", "message": "bad"});
        let parsed_err = parse_authrestore_response(&err).unwrap();
        assert!(!parsed_err.ok);
        assert_eq!(parsed_err.secret_code, "");
        assert_eq!(secret_from_response(&err), "");
        // TS `|| {}` fallback: no status means unusable.
        assert!(parse_authrestore_response(&serde_json::json!({})).is_none());
        assert_eq!(secret_from_response(&serde_json::json!({})), "");
        // Guild-less link drops the state like split("&state=")[0].
        let bare = oauth2_link_without_guild("cid", "https://gw/cb", None);
        assert!(bare.contains("scope=identify"));
        assert!(!bare.contains("state="));
        let scoped = oauth2_link_without_guild("cid", "https://gw/cb", Some("guilds.join"));
        assert!(scoped.contains("scope=guilds.join"));
    }

    #[test]
    fn rows_views_and_labels() {
        let raw = serde_json::json!({
            "config": {
                "roleId": "7",
                "securityCode": "s",
                "author": {"id": "1", "username": "owner"},
                "createDate": 1_700_000_000_000i64,
                "securityCodeUsed": 3
            },
            "members": ["a"]
        })
        .to_string();
        let row = parse_authrestore_row(&raw).unwrap();
        assert_eq!(row.config.security_code, "s");
        assert!(parse_authrestore_row("not json").is_none());
        // 2023-11-14 22:13:20 UTC.
        assert_eq!(created_at_label(1_700_000_000_000), "11/14/2023 22:13");
        let fields = main_info_fields("g1", "<@&7>", "*note*", "11/14/2023 22:13", 3, "<@1>");
        assert_eq!(fields.len(), 5);
        assert!(fields[2].1.contains("\n\n"));
        assert_eq!(page_footer("Page ${from} / ${to}", 0, 6), "Page 1 / 2");
        // Histogram skips zero timestamps (TS falsy check) and
        // collides same month/day across years like the TS labels.
        let members = vec![
            sample_member("a", 1_700_000_000_000, "en-US"),
            sample_member("b", 1_700_000_000_000 - 31_557_600_000, "fr"),
            sample_member("c", 0, "en-US"),
        ];
        let (labels, counts) = registration_histogram(&members, 1_700_000_000_000);
        assert_eq!(labels.len(), 30);
        // 2, not 1: same month/day across years shares the TS day
        // label (collision preserved), while ts==0 is skipped.
        assert_eq!(counts.iter().sum::<usize>(), 2);
        let page = members_page_text(&members, 0, "Locale", "Username");
        assert!(page.contains("1) <@a>"));
        assert!(page.contains("3) <@c>"));
        let stats = stats_summary_text(&members, 1_700_000_000_000, "Total", "Locales", "Recent");
        assert!(stats.contains("Total: 3"));
        // Locale ties keep first-seen order (TS stable sort), not
        // alphabetical.
        let tied = vec![sample_member("x", 5, "fr"), sample_member("y", 6, "en-US")];
        let dist = locale_distribution(&tied);
        assert_eq!(dist[0].0, "fr");
        // Extra `%` segments are dropped like TS data[0]/data[1].
        assert_eq!(
            parse_forcejoin_response("u%t%extra").unwrap(),
            ("u".to_string(), "t".to_string())
        );
    }
}
