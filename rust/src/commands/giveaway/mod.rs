// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/giveaway/* via giveawaysManager.ts.
//
// TS store: giveawaysTable keyed by messageId {guildId, channelId,
// winnerCount, prize, hostedBy, expireIn, ended, entries[], winners[]}.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::Deserialize;

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
/// Seconds a stateless entries pager stays usable. Mirrors the 15-min
/// `createMessageComponentCollector({ time: 60_000 * 15 })` in
/// listEntries (giveawaysManager.ts:704-707); the Rust buttons carry
/// their creation timestamp in the custom id instead.
pub const GW_PAGER_TTL_SECS: i64 = 15 * 60;
/// Seconds a stateless leave-confirm stays usable. Mirrors the 60s
/// collector in removeEntries (giveawaysManager.ts:278-281); the Rust
/// prompt reuses the ephemeral message age instead (the locked
/// component router only parses `giveaway-leave:<mid>`).
pub const GW_LEAVE_TTL_SECS: i64 = 60;
/// Entries pager page size. Mirrors usersPerPage in listEntries.
pub const GW_ENTRIES_PER_PAGE: usize = 10;

pub fn gw_entries_page_id(message_id: u64, page: usize) -> String {
    format!("{GW_ENTRIES_PAGE_PREFIX}{message_id}:{page}")
}

/// Pager id carrying the viewing invoker, so presses stay scoped to
/// the user who opened the list (TS filters the collector by member
/// id). Legacy two-part ids still parse via parse_gw_entries_page.
pub fn gw_entries_page_id_for(message_id: u64, page: usize, invoker: u64) -> String {
    format!("{GW_ENTRIES_PAGE_PREFIX}{message_id}:{page}:{invoker}")
}

/// Parse a pager id back into (board, page, invoker). Accepts both
/// the legacy `gw-entries:<mid>:<page>` and the invoker-carrying
/// `gw-entries:<mid>:<page>:<invoker>` shapes.
pub fn parse_gw_entries_page_id(id: &str) -> Option<(u64, usize, Option<u64>)> {
    let (mid, page, invoker, _) = parse_gw_entries_page_full(id)?;
    Some((mid, page, invoker))
}

/// Full pager-id parse: `gw-entries:<mid>:<page>[:<invoker>[:<ts>]]`.
/// Legacy ids carry no invoker/timestamp; the timestamped shape is
/// emitted by `gw_entries_page_id_for_ts` (GW9 expiry).
pub fn parse_gw_entries_page_full(id: &str) -> Option<(u64, usize, Option<u64>, Option<i64>)> {
    let rest = id.strip_prefix(GW_ENTRIES_PAGE_PREFIX)?;
    let mut parts = rest.split(':');
    let mid = parts.next()?.parse::<u64>().ok()?;
    let page = parts.next()?.parse::<usize>().ok()?;
    let invoker = parts.next().and_then(|s| s.parse::<u64>().ok());
    let ts = parts.next().and_then(|s| s.parse::<i64>().ok());
    Some((mid, page, invoker, ts))
}

/// Pager id carrying viewer + creation time, for the 15-min TS window.
/// Mirrors listEntries' `createMessageComponentCollector({ time })`.
pub fn gw_entries_page_id_for_ts(
    message_id: u64,
    page: usize,
    invoker: u64,
    created_secs: i64,
) -> String {
    format!("{GW_ENTRIES_PAGE_PREFIX}{message_id}:{page}:{invoker}:{created_secs}")
}

/// True when a timestamped pager id is older than GW_PAGER_TTL_SECS.
/// Ids without a timestamp predate expiry (grandfathered, like the old
/// stateless buttons); clock skew into the future never expires.
pub fn pager_id_expired(created_secs: Option<i64>, now_secs: i64) -> bool {
    created_secs
        .map(|ts| now_secs.saturating_sub(ts) > GW_PAGER_TTL_SECS)
        .unwrap_or(false)
}

/// Full-fidelity duration parser. Mirrors `client.timeCalculator.to_ms`
/// (src/core/functions/ms.ts), which !create.ts feeds raw into: greedy
/// `<signed float><unit-letters>` tokens are summed, so compounds like
/// `1h30m` work and FR/EN aliases, weeks, months and years resolve.
/// Bare numbers match no token and total 0 (invalid, like the TS
/// `!duration` gate); negatives keep their sign (a non-zero TS total is
/// truthy, i.e. accepted). A giveaway-local copy: the shared
/// `shared::parse_duration_ms` is single-unit only and owned by other
/// modules with their own tests.
pub fn gw_parse_duration_ms(raw: &str) -> Option<i64> {
    fn mult(unit: &str) -> i64 {
        match unit {
            "ms" | "msec" | "millisecond" | "milliseconds" | "milliseconde" | "millisecondes" => 1,
            "s" | "sec" | "secs" | "second" | "seconds" | "seconde" | "secondes" => 1_000,
            "m" | "min" | "mins" | "minute" | "minutes" => 60_000,
            "h" | "hr" | "hrs" | "hour" | "hours" | "heure" | "heures" => 3_600_000,
            "d" | "day" | "days" | "j" | "jour" | "jours" => 86_400_000,
            "w" | "sm" | "week" | "weeks" | "semaine" | "semaines" => 604_800_000,
            "mo" | "mois" | "month" | "months" => 2_592_000_000,
            "y" | "yr" | "yrs" | "year" | "years" | "an" | "ans" => 31_557_600_000,
            // Unknown units contribute value * 0 like the TS
            // `multipliers[unit] ?? 0` fallback.
            _ => 0,
        }
    }
    fn num_start_at(b: &[u8], i: usize) -> bool {
        if b[i].is_ascii_digit() {
            return true;
        }
        let after = |j: usize| b.get(j).copied().unwrap_or(0);
        if b[i] == b'.' && after(i + 1).is_ascii_digit() {
            return true;
        }
        if b[i] == b'-' {
            return after(i + 1).is_ascii_digit()
                || (after(i + 1) == b'.' && after(i + 2).is_ascii_digit());
        }
        false
    }
    let s = raw.trim().to_ascii_lowercase().replacen(' ', "", 1); // like the TS `replace(" ", "")`: only the first space
    if s.is_empty() {
        return None;
    }
    let b = s.as_bytes();
    let mut i = 0;
    let mut total: f64 = 0.0;
    while i < b.len() {
        if !num_start_at(b, i) {
            i += 1;
            continue;
        }
        let mut j = i + usize::from(b[i] == b'-');
        while j < b.len() && (b[j].is_ascii_digit() || b[j] == b'.') {
            j += 1;
        }
        let num: f64 = s[i..j].parse().unwrap_or(0.0);
        let mut k = j;
        while k < b.len() && b[k].is_ascii_alphabetic() {
            k += 1;
        }
        if k == j {
            // Bare number with no unit: no TS token, contributes nothing.
            i = j;
            continue;
        }
        total += num * mult(&s[j..k]) as f64;
        i = k;
    }
    if total == 0.0 {
        None
    } else {
        Some(total as i64)
    }
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

#[derive(Debug, Clone)]
pub struct Giveaway {
    pub guild_id: String,
    pub channel_id: String,
    pub winner_count: u32,
    pub prize: String,
    pub hosted_by: String,
    pub expire_in_ms: i64,
    pub ended: bool,
    pub entries: Vec<String>,
    pub winners: Vec<String>,
    /// none | invites | messages | roles (mirrors create requirement choice).
    pub requirement: String,
    pub requirement_value: String,
    /// Stored validity flag. Mirrors `isValid: true` written by
    /// create() in giveawaysManager.ts:166 and read by
    /// !get-data.ts:104-109. Old rows without the flag count as valid.
    pub is_valid: bool,
    /// Validated embed image URL (mirrors create embedImageURL via
    /// mediaManipulation.isImageUrl; display rework pending).
    pub embed_image_url: Option<String>,
}

// Custom deserializer: TS rows (types/giveaways.d.ts) use camelCase
// keys, a numeric `ended` enum (1 = ENDED, 2 = NOT_ENDED), an ISO
// `expireIn` Date, a nested `requirement: { type, value }` object and
// `winners: string[] | string`. Accept both shapes so legacy TS rows
// and Rust rows parse into one struct; serialization writes the TS
// camelCase shape (see the Serialize impl below).
impl<'de> Deserialize<'de> for Giveaway {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let v = serde_json::Value::deserialize(deserializer)?;
        let get = |snake: &str, camel: &str| -> Option<&serde_json::Value> {
            v.get(snake).or_else(|| v.get(camel))
        };
        let text = |snake: &str, camel: &str| -> String {
            get(snake, camel)
                .and_then(|x| x.as_str())
                .unwrap_or_default()
                .to_string()
        };
        // String-or-string[] list. A lone string wraps to one entry,
        // except the winners `"None"` sentinel (finish() stores
        // `winner || "None"`) which means no winners.
        let str_list = |key: &str, none_means_empty: bool| -> Vec<String> {
            match v.get(key) {
                Some(serde_json::Value::Array(a)) => a
                    .iter()
                    .filter_map(|x| {
                        x.as_str().map(|s| s.to_string()).or_else(|| {
                            x.as_u64()
                                .map(|n| n.to_string())
                                .or_else(|| x.as_i64().map(|n| n.to_string()))
                        })
                    })
                    .collect(),
                Some(serde_json::Value::String(s)) if s.is_empty() => vec![],
                Some(serde_json::Value::String(s)) if none_means_empty && s == "None" => {
                    vec![]
                }
                Some(serde_json::Value::String(s)) => vec![s.clone()],
                _ => vec![],
            }
        };
        let ended = match v.get("ended") {
            Some(serde_json::Value::Bool(b)) => *b,
            // GiveawayEndedStatus: ENDED = 1, NOT_ENDED = 2.
            Some(serde_json::Value::Number(n)) => n.as_i64().map(|i| i == 1).unwrap_or(false),
            _ => false,
        };
        let expire_in_ms = match get("expire_in_ms", "expireIn") {
            Some(serde_json::Value::Number(n)) => n.as_i64().unwrap_or(0),
            Some(serde_json::Value::String(s)) => s.parse::<i64>().unwrap_or_else(|_| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .map(|d| d.timestamp_millis())
                    .unwrap_or(0)
            }),
            _ => 0,
        };
        let (requirement, requirement_value) = match v.get("requirement") {
            Some(serde_json::Value::String(s)) => (
                s.clone(),
                v.get("requirement_value")
                    .or_else(|| v.get("requirementValue"))
                    .and_then(|x| x.as_str())
                    .unwrap_or_default()
                    .to_string(),
            ),
            Some(obj) if obj.is_object() => (
                obj.get("type")
                    .and_then(|x| x.as_str())
                    .unwrap_or("none")
                    .to_string(),
                obj.get("value")
                    .and_then(|x| x.as_str())
                    .unwrap_or_default()
                    .to_string(),
            ),
            _ => ("none".to_string(), String::new()),
        };
        Ok(Giveaway {
            guild_id: text("guild_id", "guildId"),
            channel_id: text("channel_id", "channelId"),
            winner_count: get("winner_count", "winnerCount")
                .and_then(|x| x.as_u64().or_else(|| x.as_f64().map(|f| f as u64)))
                .unwrap_or(1) as u32,
            prize: text("prize", "prize"),
            hosted_by: text("hosted_by", "hostedBy"),
            expire_in_ms,
            ended,
            entries: str_list("entries", false),
            winners: str_list("winners", true),
            requirement,
            requirement_value,
            is_valid: get("is_valid", "isValid")
                .and_then(|x| x.as_bool())
                .unwrap_or(true),
            embed_image_url: get("embed_image_url", "embedImageURL")
                .and_then(|x| x.as_str())
                .filter(|u| !u.is_empty())
                .map(|u| u.to_string()),
        })
    }
}

// TS write shape. Mirrors the `db.Create({...}, response.id)` row in
// giveawaysManager.ts create(): camelCase keys, an ISO `expireIn`
// Date (what `new Date(ms)` serializes to), and the nested
// `requirement: { type, value }` object. The Deserialize impl above
// stays tolerant so legacy snake_case rows keep parsing.
impl serde::Serialize for Giveaway {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("Giveaway", 11)?;
        s.serialize_field("guildId", &self.guild_id)?;
        s.serialize_field("channelId", &self.channel_id)?;
        s.serialize_field("winnerCount", &self.winner_count)?;
        s.serialize_field("prize", &self.prize)?;
        s.serialize_field("hostedBy", &self.hosted_by)?;
        // ISO Date like TS `new Date(...)`; out-of-range falls back
        // to raw millis (both parse back via the reader above).
        let expire = chrono::DateTime::from_timestamp_millis(self.expire_in_ms)
            .map(|d| d.to_rfc3339_opts(chrono::SecondsFormat::Millis, true));
        match &expire {
            Some(iso) => s.serialize_field("expireIn", iso)?,
            None => s.serialize_field("expireIn", &self.expire_in_ms)?,
        }
        s.serialize_field("ended", &self.ended)?;
        s.serialize_field("entries", &self.entries)?;
        s.serialize_field("winners", &self.winners)?;
        s.serialize_field("isValid", &self.is_valid)?;
        s.serialize_field("embedImageURL", &self.embed_image_url)?;
        s.serialize_field(
            "requirement",
            &serde_json::json!({
                "type": self.requirement,
                "value": self.requirement_value,
            }),
        )?;
        s.end()
    }
}

/// Entry-gate requirement from a stored row. Accepts the TS nested
/// `requirement: { type, value }` object (what create() writes) and
/// the flat `requirement` + `requirement_value`/`requirementValue`
/// strings (what the Rust port used to write). Missing shapes mean
/// no requirement, like the TS `undefined` path.
pub fn parse_entry_requirement(v: &serde_json::Value) -> (String, String) {
    match v.get("requirement") {
        Some(obj) if obj.is_object() => (
            obj.get("type")
                .and_then(|x| x.as_str())
                .unwrap_or("none")
                .to_string(),
            obj.get("value")
                .and_then(|x| x.as_str())
                .unwrap_or_default()
                .to_string(),
        ),
        Some(serde_json::Value::String(req)) => (
            req.clone(),
            v.get("requirement_value")
                .or_else(|| v.get("requirementValue"))
                .and_then(|x| x.as_str())
                .unwrap_or_default()
                .to_string(),
        ),
        _ => ("none".to_string(), String::new()),
    }
}

/// Count a raw messages store value like the TS messages leg
/// (giveawaysManager.ts:198-205): TS pushes one record per message into
/// `<gid>.STATS.USER.<uid>.messages` (onNewMessage.ts:39), so an array
/// reads via `length`; the Rust `UserStats.messages` u64 counter reads
/// directly. Objects (a `STATS.USER.<uid>` row) recurse into `messages`.
pub fn count_messages_value(v: &serde_json::Value) -> u64 {
    match v {
        serde_json::Value::Array(a) => a.len() as u64,
        serde_json::Value::Number(n) => n
            .as_u64()
            .or_else(|| n.as_f64().filter(|f| *f >= 0.0).map(|f| f as u64))
            .unwrap_or(0),
        serde_json::Value::String(s) => s.trim().parse::<u64>().unwrap_or(0),
        serde_json::Value::Object(map) => {
            map.get("messages").map(count_messages_value).unwrap_or(0)
        }
        _ => 0,
    }
}

/// Table-routed read with legacy flat-row fallback for stats keys.
/// Mirrors `table_value_or_legacy` in stats (kept local: that helper is
/// private and this module is the only other reader of these keys).
async fn gw_stats_value(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = crate::backends::Backend::sqlite(pool.clone());
    if let Ok(Some(v)) = backend.table(guild_id).get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

/// Total messages for the giveaway entry gate. Accepts all three shapes:
/// the TS array at `STATS.USER.<uid>.messages` (length, per
/// giveawaysManager.ts:198-205 + onNewMessage.ts:39), the nested legacy
/// `STATS.USER` map indexed by user id, and the Rust `UserStats.messages`
/// u64 counter (plus `msg_log` length). Takes the max so split-brain
/// rows never undercount.
pub async fn load_messages_count(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> u64 {
    let mut best = 0u64;
    if let Some(v) = gw_stats_value(pool, guild_id, &format!("STATS.USER.{user_id}.messages")).await
    {
        best = best.max(count_messages_value(&v));
    }
    if let Some(v) = gw_stats_value(pool, guild_id, &format!("STATS.USER.{user_id}")).await {
        best = best.max(count_messages_value(&v));
    }
    if let Some(v) = gw_stats_value(pool, guild_id, "STATS.USER").await {
        if let Some(user) = v.get(user_id.to_string()) {
            best = best.max(count_messages_value(user));
        }
    }
    let stats = crate::commands::stats::main::load_stats(pool, guild_id, user_id).await;
    best.max(stats.messages.max(stats.msg_log.len() as u64))
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
            load_messages_count(pool, guild_id, user_id).await >= need
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

/// Reroll board winners: `<@a>,<@b>`, empty when there are none.
/// Mirrors reroll() (`winners.toString()` on the mapped array, so an
/// empty pick stays an empty string) — unlike finish(), which falls
/// back to `setjoinroles_var_none`.
pub fn reroll_winners_text(winners: &[String]) -> String {
    winners
        .iter()
        .map(|w| format!("<@{w}>"))
        .collect::<Vec<_>>()
        .join(",")
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
    let _ = gw::store_set(
        pool,
        gid,
        mid,
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
    // TS create() stores the nested `requirement: { type, value }`
    // object; older Rust rows carry the flat strings instead.
    let (requirement, req_value) = parse_entry_requirement(&v);
    let roles: Vec<u64> = guild_id
        .member(http, comp.user.id)
        .await
        .map(|m| m.roles.iter().map(|r| r.get()).collect())
        .unwrap_or_default();
    let uid = comp.user.id.get().to_string();
    // Already-entered check comes first like addEntries
    // (giveawaysManager.ts:184-187): a re-press opens the
    // leave-confirm even when the requirement would now fail.
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
    entries.push(uid);
    let new_count = entries.len();
    if let Some(obj) = v.as_object_mut() {
        obj.insert("entries".into(), serde_json::json!(entries));
    }
    let _ = gw::store_set(pool, &gid, mid, &v.to_string()).await;
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
    // Stateless expiry for the 60s TS collector (removeEntries,
    // giveawaysManager.ts:278-281): the prompt is the ephemeral message
    // carrying this button, so its age is the collector age. An expired
    // prompt loses its buttons like the TS collector-end cleanup, and
    // the press is dropped without touching entries.
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    if now_secs.saturating_sub(comp.message.timestamp.unix_timestamp()) > GW_LEAVE_TTL_SECS {
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(comp.message.content.clone())
                        .components(vec![]),
                ),
            )
            .await;
        return;
    }
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
        let _ = gw::store_set(pool, &gid, mid, &v.to_string()).await;
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

/// Entries-page render context. Bundles the eight arguments
/// `render_entries_page` needs so the function keeps a single
/// parameter (clippy `too_many_arguments`).
pub struct EntriesPage<'a, F: Fn(&str) -> String> {
    pub http: &'a std::sync::Arc<serenity::Http>,
    pub pool: &'a crate::db::Pool,
    pub gid: &'a str,
    pub t: F,
    pub mid: u64,
    pub entries: &'a [String],
    pub page: usize,
    pub invoker: Option<u64>,
}

/// Pure entries-page render shared by the list button, the pager
/// and the `list-entries` slash subcommand. Returns the footer icon
/// bytes alongside so callers can upload `footer_icon.png` (the embed
/// footer points at the attachment, never a remote URL).
pub async fn render_entries_page<F: Fn(&str) -> String>(
    p: EntriesPage<'_, F>,
) -> Option<(
    serenity::CreateEmbed,
    Vec<serenity::CreateActionRow>,
    Option<Vec<u8>>,
)> {
    let EntriesPage {
        http,
        pool,
        gid,
        t,
        mid,
        entries,
        page,
        invoker,
    } = p;
    let pages = entries_pages(&t("event_gw_entries_button_title"), entries);
    if pages.is_empty() {
        return None;
    }
    let page = page.min(pages.len() - 1);
    let (footer_name, icon) = giveaway_footer(pool, http, gid).await;
    let now_secs = crate::commands::schedule::main::now_ms() / 1000;
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
        .timestamp(unix_ts(now_secs));
    let mut components = vec![];
    if pages.len() > 1 {
        components.push(entries_pager_row(
            mid,
            page,
            pages.len(),
            invoker,
            now_secs,
            false,
        ));
    }
    Some((embed, components, icon))
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
    let invoker = Some(comp.user.id.get());
    let Some((embed, components, icon)) = render_entries_page(EntriesPage {
        http,
        pool,
        gid: &gid,
        t,
        mid,
        entries,
        page,
        invoker,
    })
    .await
    else {
        return;
    };
    let mut msg = serenity::CreateInteractionResponseMessage::new()
        .embed(embed)
        .components(components)
        .ephemeral(true);
    if let Some(bytes) = icon {
        msg = msg.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = comp
        .create_response(http, serenity::CreateInteractionResponse::Message(msg))
        .await;
}

/// Entries pager press (`gw-entries:<mid>:<page>[:<invoker>[:<ts>]]`).
/// Wrap-around paging like listEntries. Only the viewer who opened the
/// list may turn pages (the 15-min TS collector filtered by member id
/// instead); presses on an expired list re-render the page disabled
/// like the TS collector-end cleanup.
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
    let presser = comp.user.id.get();
    let (_, _, id_invoker, id_ts) =
        parse_gw_entries_page_full(&comp.data.custom_id).unwrap_or((mid, page, None, None));
    if let Some(invoker) = id_invoker {
        if invoker != presser {
            return;
        }
    }
    let now_secs = crate::commands::schedule::main::now_ms() / 1000;
    let expired = pager_id_expired(id_ts, now_secs);
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
    // Wrap-around like the TS previousPage/nextPage collector.
    let page = page % pages.len();
    // The creation timestamp rides along in the button id so the
    // 15-min window stays fixed from the list open (a fresh ts here
    // would slide it on every press, unlike the TS collector).
    let created = id_ts.unwrap_or(now_secs);
    let invoker = id_invoker.or(Some(presser));
    let (footer_name, icon) = giveaway_footer(pool, http, &gid).await;
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
    let mut msg = serenity::CreateInteractionResponseMessage::new()
        .embed(embed)
        .components(vec![entries_pager_row(
            mid,
            page,
            pages.len(),
            invoker,
            created,
            expired,
        )]);
    if let Some(bytes) = icon {
        msg = msg.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(msg),
        )
        .await;
}

/// Pager row for the entries list. Page rides in the button ids
/// (stateless; the 15-min TS collector has no equivalent). Wrap-around
/// like listEntries; the viewing invoker and the list creation time
/// ride along when known (`gw-entries:<mid>:<page>:<invoker>:<ts>`).
/// An expired list renders disabled like the TS collector-end cleanup.
pub fn entries_pager_row(
    message_id: u64,
    page: usize,
    pages: usize,
    invoker: Option<u64>,
    created_secs: i64,
    disabled: bool,
) -> serenity::CreateActionRow {
    let id = |p: usize| match invoker {
        Some(uid) => gw_entries_page_id_for_ts(message_id, p, uid, created_secs),
        None => gw_entries_page_id(message_id, p),
    };
    let prev = if page == 0 {
        pages.saturating_sub(1)
    } else {
        page - 1
    };
    let next = (page + 1) % pages;
    let off = pages <= 1 || disabled;
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(id(prev))
            .label("<<<")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(off),
        serenity::CreateButton::new(id(next))
            .label(">>>")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(off),
    ])
}

pub mod create;
pub mod end;
pub mod get_all;
pub mod get_data;
pub mod gw;
pub mod list_entries;
pub mod reroll;

/// Old registry path (`giveaway::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::create::*;
    pub use super::end::*;
    pub use super::get_all::*;
    pub use super::get_data::*;
    pub use super::gw::*;
    pub use super::list_entries::*;
    pub use super::reroll::*;
    pub use super::*;
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
    fn reroll_board_stays_empty_without_winners() {
        // reroll() maps to `<@id>` strings and `.toString()`s the array
        // (empty -> ""), while finish() falls back to the none-word.
        let empty: Vec<String> = vec![];
        assert_eq!(reroll_winners_text(&empty), "");
        assert_eq!(
            reroll_winners_text(&["1".to_string(), "2".to_string()]),
            "<@1>,<@2>"
        );
        assert_eq!(winners_line(&empty, "None"), "None");
        assert_eq!(
            winners_line(&["1".to_string(), "2".to_string()], "None"),
            "<@1>,<@2>"
        );
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
        // Invoker-carrying ids parse back; legacy ids parse with no invoker.
        assert_eq!(
            parse_gw_entries_page_id("gw-entries:9:2:42"),
            Some((9, 2, Some(42)))
        );
        assert_eq!(
            parse_gw_entries_page_id("gw-entries:9:2"),
            Some((9, 2, None))
        );
        assert_eq!(gw_entries_page_id_for(9, 2, 42), "gw-entries:9:2:42");
        // Stored rows default to valid like TS `isValid: true`.
        let raw = serde_json::to_string(&Giveaway {
            guild_id: "g".into(),
            channel_id: "c".into(),
            winner_count: 1,
            prize: "p".into(),
            hosted_by: "h".into(),
            expire_in_ms: 1,
            ended: false,
            entries: vec![],
            winners: vec![],
            requirement: "none".into(),
            requirement_value: String::new(),
            is_valid: true,
            embed_image_url: None,
        })
        .unwrap();
        let back: Giveaway = serde_json::from_str(&raw).unwrap();
        assert!(back.is_valid);
        let legacy = raw.replace(",\"is_valid\":true", "");
        let migrated: Giveaway = serde_json::from_str(&legacy).unwrap();
        assert!(migrated.is_valid);
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

    #[test]
    fn duration_parser_mirrors_ts_time_calculator() {
        // Single units.
        assert_eq!(gw_parse_duration_ms("10s"), Some(10_000));
        assert_eq!(gw_parse_duration_ms("5m"), Some(300_000));
        assert_eq!(gw_parse_duration_ms("2h"), Some(7_200_000));
        assert_eq!(gw_parse_duration_ms("7d"), Some(604_800_000));
        assert_eq!(gw_parse_duration_ms("500ms"), Some(500));
        // Compound sums.
        assert_eq!(gw_parse_duration_ms("1h30m"), Some(5_400_000));
        assert_eq!(gw_parse_duration_ms("1h 30m"), Some(5_400_000));
        // Floats.
        assert_eq!(gw_parse_duration_ms("1.5h"), Some(5_400_000));
        // Weeks / months / years + FR aliases.
        assert_eq!(gw_parse_duration_ms("1w"), Some(604_800_000));
        assert_eq!(gw_parse_duration_ms("2 semaines"), Some(2 * 604_800_000));
        assert_eq!(gw_parse_duration_ms("1mois"), Some(2_592_000_000));
        assert_eq!(gw_parse_duration_ms("1an"), Some(31_557_600_000));
        assert_eq!(gw_parse_duration_ms("3 jours"), Some(3 * 86_400_000));
        assert_eq!(gw_parse_duration_ms("1hour"), Some(3_600_000));
        // Bare numbers total 0 like the TS `!duration` gate.
        assert_eq!(gw_parse_duration_ms("10"), None);
        assert_eq!(gw_parse_duration_ms(""), None);
        assert_eq!(gw_parse_duration_ms("abc"), None);
        assert_eq!(gw_parse_duration_ms("0s"), None);
        assert_eq!(gw_parse_duration_ms("10x"), None);
        // Negatives keep their sign (non-zero TS totals are truthy).
        assert_eq!(gw_parse_duration_ms("-5m"), Some(-300_000));
    }

    #[test]
    fn pager_ids_carry_invoker_and_expiry() {
        assert_eq!(
            gw_entries_page_id_for_ts(9, 2, 42, 1000),
            "gw-entries:9:2:42:1000"
        );
        assert_eq!(
            parse_gw_entries_page_full("gw-entries:9:2:42:1000"),
            Some((9, 2, Some(42), Some(1000)))
        );
        // Legacy shapes still parse with no timestamp.
        assert_eq!(
            parse_gw_entries_page_full("gw-entries:9:2:42"),
            Some((9, 2, Some(42), None))
        );
        assert_eq!(
            parse_gw_entries_page_full("gw-entries:9:2"),
            Some((9, 2, None, None))
        );
        // 15-min window; missing timestamps are grandfathered.
        assert!(!pager_id_expired(Some(1000), 1000 + GW_PAGER_TTL_SECS));
        assert!(pager_id_expired(Some(1000), 1001 + GW_PAGER_TTL_SECS));
        assert!(!pager_id_expired(None, i64::MAX));
        assert!(!pager_id_expired(Some(2000), 1000));
    }

    #[test]
    fn legacy_ts_rows_parse() {
        // TS-shaped row: numeric ended enum, ISO expireIn, nested
        // requirement, camelCase keys (types/giveaways.d.ts).
        let raw = r#"{"isValid":true,"guildId":"g","channelId":"c","entries":["a"],"winners":[],"winnerCount":1,"prize":"p","hostedBy":"h","ended":2,"expireIn":"2030-01-01T00:00:00.000Z","embedImageURL":null,"requirement":{"type":"roles","value":"9"}}"#;
        let gw: Giveaway = serde_json::from_str(raw).unwrap();
        assert!(!gw.ended);
        assert!(gw.is_valid);
        assert_eq!(gw.requirement, "roles");
        assert_eq!(gw.requirement_value, "9");
        assert!(gw.expire_in_ms > 1_800_000_000_000);
        // ENDED = 1 reads as ended.
        let ended_raw = raw.replace("\"ended\":2", "\"ended\":1");
        let ended: Giveaway = serde_json::from_str(&ended_raw).unwrap();
        assert!(ended.ended);
        // Winners as a string: "None" sentinel means empty.
        let s = r#"{"guildId":"g","winners":"None"}"#;
        let gw2: Giveaway = serde_json::from_str(s).unwrap();
        assert!(gw2.winners.is_empty());
        // expireIn as raw ms number.
        let n = r#"{"guildId":"g","expireIn":1700000000000}"#;
        let gw3: Giveaway = serde_json::from_str(n).unwrap();
        assert_eq!(gw3.expire_in_ms, 1_700_000_000_000);
    }

    #[tokio::test]
    async fn requirement_gates() {
        let pool = crate::db::memory_pool().await;
        assert!(check_requirement(&pool, "g", 1, &[], "none", "").await);
        assert!(!check_requirement(&pool, "g", 1, &[], "invites", "5").await);
        assert!(!check_requirement(&pool, "g", 1, &[], "messages", "5").await);
        assert!(!check_requirement(&pool, "g", 1, &[7], "roles", "9").await);
        assert!(check_requirement(&pool, "g", 1, &[9], "roles", "9").await);
    }

    #[test]
    fn messages_count_reads_all_store_shapes() {
        // TS array shape (onNewMessage pushes one record per message).
        let arr = serde_json::json!([{"a": 1}, {"a": 2}, {"a": 3}]);
        assert_eq!(count_messages_value(&arr), 3);
        assert_eq!(count_messages_value(&serde_json::json!([])), 0);
        // Rust u64 counter (plus floats/strings that coerce cleanly).
        assert_eq!(count_messages_value(&serde_json::json!(7)), 7);
        assert_eq!(count_messages_value(&serde_json::json!(5.0)), 5);
        assert_eq!(count_messages_value(&serde_json::json!("4")), 4);
        assert_eq!(count_messages_value(&serde_json::json!(-2)), 0);
        assert_eq!(count_messages_value(&serde_json::json!(null)), 0);
        // User rows recurse into `messages` (TS array or Rust counter).
        let row = serde_json::json!({"messages": [{"a": 1}], "voices": []});
        assert_eq!(count_messages_value(&row), 1);
        let row = serde_json::json!({"messages": 6});
        assert_eq!(count_messages_value(&row), 6);
        assert_eq!(count_messages_value(&serde_json::json!({"voices": []})), 0);
    }

    #[tokio::test]
    async fn messages_gate_accepts_ts_array_nested_and_counter() {
        let pool = crate::db::memory_pool().await;
        let backend = crate::backends::Backend::sqlite(pool.clone());
        // 1. TS array shape: one record per message (onNewMessage.ts:39),
        // read via length (giveawaysManager.ts:198-205).
        let msgs: Vec<serde_json::Value> =
            (0..5).map(|i| serde_json::json!({"sent_ts": i})).collect();
        backend
            .table("ts-array")
            .set("STATS.USER.1.messages", &msgs)
            .await
            .unwrap();
        assert_eq!(load_messages_count(&pool, "ts-array", 1).await, 5);
        assert!(check_requirement(&pool, "ts-array", 1, &[], "messages", "5").await);
        assert!(!check_requirement(&pool, "ts-array", 1, &[], "messages", "6").await);
        // 2. Nested legacy `STATS.USER` map (flat kv row) indexed by user.
        let map = serde_json::json!({"1": {"messages": [{"a": 1}, {"a": 2}, {"a": 3}]}});
        crate::db::kv_set(&pool, "legacy-map", "STATS.USER", &map.to_string())
            .await
            .unwrap();
        assert_eq!(load_messages_count(&pool, "legacy-map", 1).await, 3);
        assert!(check_requirement(&pool, "legacy-map", 1, &[], "messages", "3").await);
        assert!(!check_requirement(&pool, "legacy-map", 1, &[], "messages", "4").await);
        // 3. Rust u64 counter row.
        crate::commands::stats::save_stats(
            &pool,
            "rust-counter",
            1,
            &crate::commands::stats::UserStats {
                messages: 5,
                ..Default::default()
            },
        )
        .await
        .unwrap();
        assert_eq!(load_messages_count(&pool, "rust-counter", 1).await, 5);
        assert!(check_requirement(&pool, "rust-counter", 1, &[], "messages", "5").await);
        assert!(!check_requirement(&pool, "rust-counter", 1, &[], "messages", "6").await);
    }

    #[test]
    fn writes_ts_camel_shape_and_reads_back() {
        // G5: rows go out in the TS create() shape (camelCase keys,
        // ISO expireIn, nested requirement) and parse back losslessly.
        let gw = Giveaway {
            guild_id: "g".to_string(),
            channel_id: "c".to_string(),
            winner_count: 2,
            prize: "p".to_string(),
            hosted_by: "h".to_string(),
            expire_in_ms: 1_700_000_000_000,
            ended: false,
            entries: vec!["a".to_string()],
            winners: vec![],
            requirement: "invites".to_string(),
            requirement_value: "5".to_string(),
            is_valid: true,
            embed_image_url: Some("https://x/y.png".to_string()),
        };
        let raw = serde_json::to_string(&gw).unwrap();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(v.get("guildId").and_then(|x| x.as_str()), Some("g"));
        assert_eq!(v.get("channelId").and_then(|x| x.as_str()), Some("c"));
        assert_eq!(v.get("winnerCount").and_then(|x| x.as_u64()), Some(2));
        assert_eq!(v.get("hostedBy").and_then(|x| x.as_str()), Some("h"));
        assert!(v.get("expireIn").and_then(|x| x.as_str()).is_some());
        assert_eq!(v.get("isValid").and_then(|x| x.as_bool()), Some(true));
        assert_eq!(
            v.get("embedImageURL").and_then(|x| x.as_str()),
            Some("https://x/y.png")
        );
        assert_eq!(
            v.get("requirement"),
            Some(&serde_json::json!({"type": "invites", "value": "5"}))
        );
        assert!(v.get("guild_id").is_none());
        assert!(v.get("winner_count").is_none());
        let back: Giveaway = serde_json::from_str(&raw).unwrap();
        assert_eq!(back.guild_id, "g");
        assert_eq!(back.expire_in_ms, 1_700_000_000_000);
        assert_eq!(back.requirement, "invites");
        assert_eq!(back.requirement_value, "5");
    }

    #[test]
    fn entry_requirement_parses_both_shapes() {
        // Nested TS object (what create() writes now).
        let nested = serde_json::json!({"requirement": {"type": "roles", "value": "9"}});
        assert_eq!(
            parse_entry_requirement(&nested),
            ("roles".to_string(), "9".to_string())
        );
        // Flat legacy strings (what the Rust port used to write).
        let flat = serde_json::json!({"requirement": "messages", "requirement_value": "10"});
        assert_eq!(
            parse_entry_requirement(&flat),
            ("messages".to_string(), "10".to_string())
        );
        let flat_camel = serde_json::json!({"requirement": "messages", "requirementValue": "10"});
        assert_eq!(
            parse_entry_requirement(&flat_camel),
            ("messages".to_string(), "10".to_string())
        );
        // Missing requirement means no gate.
        assert_eq!(
            parse_entry_requirement(&serde_json::json!({})),
            ("none".to_string(), String::new())
        );
    }
}
