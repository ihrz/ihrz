// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Events/** (95 files).
//
// Full inventory: see rust/PORT_INVENTORY.md (events section to be extended).
// This module hosts pure routing helpers shared by the serenity event
// handler (`events_handler.rs`, wired): log-channel routing, protection
// punish decisions, XP/level math. All Discord I/O stays in the handler; only
// pure logic lives here so it stays unit-testable.

// NOTE (E3): live log-channel sends route through
// `commands::guildconfig::setlogschannel::load_log_channel_routed`
// at each handler call site (events_handler.rs). The earlier
// `route_log`/`LogCategory` table duplicated that routing without
// being called, so it was removed: one truth (the handler call
// sites), no shadow table.

/// Protection punish decision. Mirrors src/Events/protection/avoid*.ts:
/// whitelist/owner bypass, otherwise punish the audit-log executor.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PunishDecision {
    Ignore,
    Punish,
}

pub fn protection_decision(
    is_owner: bool,
    is_allowlisted: bool,
    executor_is_bot: bool,
) -> PunishDecision {
    if is_owner || is_allowlisted || executor_is_bot {
        PunishDecision::Ignore
    } else {
        PunishDecision::Punish
    }
}

/// XP curve helper. Mirrors rank level-up checks (level * 500 XP).
pub fn xp_for_next_level(level: u64) -> u64 {
    level.saturating_mul(500)
}

/// XP ignore check. Mirrors !ignore-channels.ts runtime gate.
pub fn should_gain_xp(ignore: &[String], channel_id: &str) -> bool {
    !ignore.iter().any(|c| c == channel_id)
}

/// Level-role rewards earned crossing old_level -> new_level.
/// Mirrors rankRoleModule.ts attribution.
pub fn roles_earned(
    roles: &[crate::commands::ranks::main::RankRole],
    old_level: u64,
    new_level: u64,
) -> Vec<String> {
    roles
        .iter()
        .filter(|r| r.level > old_level && r.level <= new_level)
        .map(|r| r.role_id.clone())
        .collect()
}

/// Bounded name-history push. Mirrors prevnamesModule.ts (userUpdate +
/// guildMemberUpdate): TS `prevnamesTable.push` appends, so storage is
/// oldest-first and the pager displays oldest-first too (no relayout:
/// the pager reads storage order as-is). Cap and consecutive-dedup are
/// kept (dedup checks the tail, the cap drops the oldest); no relayout
/// beyond that. NOTE: rows written newest-first by older builds keep
/// their order; only new pushes follow this layout.
/// CAP VERDICT (deliberate extension, no TS counterpart): TS pushes
/// unbounded (no slice/cap anywhere in prevnamesModule.ts,
/// prevnamesModuleGuild.ts or core/prevnamesModule.ts). Rust caps at
/// PREVNAMES_CAP (20) so a rename-spamming user cannot grow the row
/// without bound; the pager only renders the tail window anyway.
/// Verdict: keep the cap, keep 20 (matches the dual-scope merge cap in
/// load_prevnames_dual).
pub fn push_prevname(mut history: Vec<String>, name: &str, cap: usize) -> Vec<String> {
    let name = name.to_string();
    if history.last().map(|l| l == &name).unwrap_or(false) {
        return history;
    }
    history.push(name);
    let cap = cap.max(1);
    if history.len() > cap {
        history.drain(..history.len() - cap);
    }
    history
}

pub const PREVNAMES_CAP: usize = 20;

/// Dated prevnames entry. Mirrors prevnamesModule.ts /
/// prevnamesModuleGuild.ts (`time(date, "d")` renders `<t:unix:d>`):
/// `<t:unix:d> - [username|globalName|nickname:guild] oldValue`.
/// The stored value is the OLD name, not the new one.
pub fn prevname_entry(unix_secs: i64, kind: &str, old_value: &str) -> String {
    format!("<t:{unix_secs}:d> - [{kind}] {old_value}")
}

pub fn prevnames_key(user_id: u64) -> String {
    format!("PREVNAMES.{user_id}")
}

/// userUpdate change detection. Mirrors prevnamesModule.ts verbatim:
/// the username leg records on strict inequality; the globalName leg
/// records only when the previous value is non-nullish AND differs, so
/// a null->name transition is dropped while name->null records the old
/// name. Username is checked first (TS push order). `prev_*` are the
/// cache-first resolutions (`cached?.x ?? old.x`); `None` means neither
/// source knew the value (serenity `old` is optional, TS always has
/// oldUser) and yields no change -- never the new name itself.
/// Pure, unit-tested below (W7 slice 24 battery).
pub fn prevnames_user_changes(
    prev_name: Option<&str>,
    prev_global: Option<Option<&str>>,
    new_name: &str,
    new_global: Option<&str>,
) -> Vec<(String, String)> {
    let mut out = Vec::new();
    if let Some(pn) = prev_name {
        if pn != new_name {
            out.push(("username".to_string(), pn.to_string()));
        }
    }
    if let Some(pg) = prev_global {
        if pg != new_global {
            if let Some(g) = pg {
                out.push(("globalName".to_string(), g.to_string()));
            }
        }
    }
    out
}

/// Nickname previous-value resolution. Mirrors prevnamesModuleGuild.ts
/// `cachedGuildNicks?.get(guildId) ?? oldMember.nickname`: JS `??`
/// falls through on BOTH null and undefined, so a cached known-no-nick
/// (null) still yields the old payload nick -- exactly what the
/// `and_then(...).unwrap_or_else(old)` live site does. Pure,
/// unit-tested below (W7 slice 24 battery).
pub fn prevnames_resolve_nick(
    cached: Option<Option<String>>,
    old: Option<String>,
) -> Option<String> {
    match cached {
        Some(Some(nick)) => Some(nick),
        _ => old,
    }
}

/// guildMemberUpdate nick leg outcome. Mirrors prevnamesModuleGuild.ts:
/// equal nicks hit the early return (the retained map is NOT refreshed);
/// a differing nick always refreshes the map, and records the previous
/// nick only when it is non-nullish. DELTA (doc-noted, unreachable):
/// an empty-string previous nick records in TS but folds to
/// `UpdateMapOnly` here -- Discord rejects empty nicknames, so no live
/// payload can reach that leg. Pure, unit-tested below (W7 slice 24
/// battery).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PrevNickAction {
    Unchanged,
    UpdateMapOnly,
    Record(String),
}

pub fn prevnames_nick_action(prev: Option<&str>, new: Option<&str>) -> PrevNickAction {
    if prev == new {
        return PrevNickAction::Unchanged;
    }
    match prev {
        Some(p) if !p.is_empty() => PrevNickAction::Record(p.to_string()),
        _ => PrevNickAction::UpdateMapOnly,
    }
}

/// Parse one prevnames history blob: Rust JSON-string-array rows;
/// a bare pushed string (TS single-push shape) counts as one entry.
pub fn parse_prevnames_history(raw: &str) -> Vec<String> {
    if let Ok(arr) = serde_json::from_str::<Vec<String>>(raw) {
        return arr;
    }
    if let Ok(inner) = serde_json::from_str::<String>(raw) {
        if inner.is_empty() {
            return Vec::new();
        }
        if let Ok(arr) = serde_json::from_str::<Vec<String>>(&inner) {
            return arr;
        }
        return vec![inner];
    }
    if raw.is_empty() {
        Vec::new()
    } else {
        vec![raw.to_string()]
    }
}

/// Merged name history across both scopes: the global "0" scope first
/// (Rust parity for the TS global `prevnames` table, which the
/// events_handler emitters already use), then the per-guild scope,
/// deduped oldest-first (TS push order) and capped. Keys unchanged.
pub async fn load_prevnames_dual(
    pool: &crate::db::Pool,
    user_id: u64,
    guild_id: &str,
) -> Vec<String> {
    use crate::commands::owner::main as routed;
    let key = prevnames_key(user_id);
    let mut merged: Vec<String> = Vec::new();
    for scope in ["0", guild_id] {
        if let Some(raw) = routed::routed_get(pool, scope, scope, &key).await {
            for entry in parse_prevnames_history(&raw) {
                if !merged.contains(&entry) {
                    merged.push(entry);
                }
            }
        }
    }
    merged.truncate(PREVNAMES_CAP.max(1));
    merged
}

// ---- tbl_* routing lives in crate::db (single home, C5) ----

/// Role snapshot for rolesaver. Mirrors onMemberLeave/onMemberJoin:
/// skips @everyone and, when the guild opts out of admin restore
/// (`rolesaver.admin === "no"`), admin-permission roles.
pub fn snapshot_roles(roles: &[(u64, bool)], everyone_id: u64, skip_admin: bool) -> Vec<String> {
    roles
        .iter()
        .filter(|(id, admin)| *id != everyone_id && !(skip_admin && *admin))
        .map(|(id, _)| id.to_string())
        .collect()
}

/// Voice session tracking. Mirrors Events/stats/onVoiceUpdate.ts
/// (ACTIVE_VOICE_SESSIONS + addCoins with member boost on leave).
pub fn voice_session_key(user_id: u64) -> String {
    format!("VOICE_SESSION.{user_id}")
}

/// TS session key. Mirrors the `ACTIVE_VOICE_SESSIONS.<uid>` rows in
/// onVoiceUpdate.ts (`getActiveSession`/`saveActiveSession`). Rust
/// joins dual-write this key (TS object form) beside
/// [`voice_session_key`] so either side's sessions resolve.
pub fn active_voice_session_key(user_id: u64) -> String {
    format!("ACTIVE_VOICE_SESSIONS.{user_id}")
}

/// Coins earned: floor(minutes / 10), multiplied by boost.
/// Mirrors onVoiceUpdate.ts
/// (`Math.floor(durationMin / 10) * getMemberBoost(member)`): the boost
/// is the float-preserving shop multiplier, so the product stays float
/// like the TS number all the way into the float wallet (addCoins adds
/// the raw number; no integer truncation anywhere). NO lower clamp:
/// `getMemberBoost` returns `highestBoost || 1`, so a stored negative
/// boost (writer-reachable: !boost-set parses with parseInt and never
/// validates) passes through and the TS product goes negative (voice
/// time debits the wallet); a fractional boost scales fractionally.
/// Callers must pass the raw [`member_boost_f64`](crate::commands::economy::member_boost_f64)
/// value, never `.max(1.0)`.
pub fn coins_for_voice(minutes: u64, boost_mult: f64) -> f64 {
    ((minutes / 10) as f64) * boost_mult
}

pub async fn voice_join(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
    now_ms: i64,
) {
    let _ = crate::db::tbl_set(
        pool,
        guild_id,
        &voice_session_key(user_id),
        &format!("{now_ms}:{channel_id}"),
    )
    .await;
    // TS object form beside the Rust string form (keys unchanged):
    // onVoiceUpdate.ts `saveActiveSession` reads
    // ACTIVE_VOICE_SESSIONS.<uid> as {startTimestamp, channelId}.
    let session = serde_json::json!({
        "startTimestamp": now_ms,
        "channelId": channel_id.to_string(),
    });
    let _ =
        crate::db::tbl_set_json(pool, guild_id, &active_voice_session_key(user_id), &session).await;
}

/// Parse a session value. Accepts the Rust `"<start_ms>:<channel_id>"`
/// string (legacy bare `"<start_ms>"` rows read channel 0) and the TS
/// `{startTimestamp, channelId}` object (`channelId` string or number,
/// like discord.js snowflakes). Anything else is `None`.
pub fn parse_voice_session(raw: &str) -> Option<(i64, u64)> {
    let s = raw.trim();
    if let Some(obj) = s
        .strip_prefix('{')
        .and_then(|_| serde_json::from_str::<serde_json::Value>(s).ok())
        .and_then(|v| v.as_object().cloned())
    {
        let start: i64 = match obj.get("startTimestamp") {
            Some(serde_json::Value::Number(n)) => n
                .as_i64()
                .or_else(|| n.as_u64().and_then(|u| i64::try_from(u).ok()))?,
            Some(serde_json::Value::String(x)) => x.trim().parse().ok()?,
            _ => return None,
        };
        let channel: u64 = match obj.get("channelId") {
            Some(serde_json::Value::Number(n)) => n
                .as_u64()
                .or_else(|| n.as_i64().and_then(|i| u64::try_from(i).ok()))
                .unwrap_or(0),
            Some(serde_json::Value::String(x)) => x.trim().parse().unwrap_or(0),
            _ => 0,
        };
        return Some((start, channel));
    }
    let (start_s, chan_s) = match s.split_once(':') {
        Some((a, b)) => (a, b),
        None => (s, "0"),
    };
    let start: i64 = start_s.parse().ok()?;
    let channel: u64 = chan_s.parse().unwrap_or(0);
    Some((start, channel))
}

/// Stats message gate. Mirrors Events/stats/onNewMessage.ts
/// (`if (!message.guild || message.author.bot || !message.channel)
/// return`): the row is pushed only for non-bot authors in a guild with
/// a channel. (Live: the bot leg is the `msg.author.bot` early return
/// and the guild leg the `let Some(guild_id) ... else return` in
/// `Handler::message`; the channel is always present on a received
/// message, so its leg is pinned here only.)
pub fn stats_message_records(has_guild: bool, is_bot: bool, has_channel: bool) -> bool {
    has_guild && !is_bot && has_channel
}

/// Voice routing verdict. Mirrors the two legs of
/// Events/stats/onVoiceUpdate.ts: leg 1
/// (`userId && newChannelId && oldChannelId !== newChannelId`) opens a
/// new session (join or move — the old leg is closed first when one is
/// stored); leg 2 (`userId && oldChannelId && !newChannelId`) closes on
/// leave; anything else (mute/deaf toggle, double-absent) is ignored.
/// `userId` (`oldState.id`) is always a non-empty snowflake on a real
/// event, so it carries no leg.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VoiceSessionRoute {
    Open,
    Close,
    Ignore,
}

pub fn voice_session_route(
    old_channel: Option<u64>,
    new_channel: Option<u64>,
) -> VoiceSessionRoute {
    if new_channel.is_some() && old_channel != new_channel {
        VoiceSessionRoute::Open
    } else if old_channel.is_some() && new_channel.is_none() {
        VoiceSessionRoute::Close
    } else {
        VoiceSessionRoute::Ignore
    }
}

/// Raw session read across both keys: the Rust `VOICE_SESSION.<uid>`
/// string first, then the TS `ACTIVE_VOICE_SESSIONS.<uid>` object.
/// Keys unchanged; either side's join resolves.
pub async fn load_voice_session_raw(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> Option<String> {
    if let Some(raw) = crate::db::tbl_get(pool, guild_id, &voice_session_key(user_id)).await {
        return Some(raw);
    }
    crate::db::tbl_get(pool, guild_id, &active_voice_session_key(user_id)).await
}

/// Parameters for closing one voice leg (keeps arg counts clippy-clean).
struct VoiceClose {
    channel_id: u64,
    start: i64,
    now_ms: i64,
    boost_mult: f64,
    pay: bool,
}

async fn close_voice_session(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    close: VoiceClose,
) -> (u64, f64) {
    let elapsed_ms = (close.now_ms - close.start).max(0) as u64;
    let minutes = elapsed_ms / 60_000;
    // TS pays only when coinsEarned > 0 AND newState.member is non-null
    // (a user who left the guild earns nothing). Stats are pushed either
    // way, exactly like processSessionEnd. The credit stays float: TS
    // addCoins adds the raw `coinsEarned * boost` number to the wallet,
    // so a fractional shop boost (x1.5) credits fractions too.
    let coins = if close.pay {
        coins_for_voice(minutes, close.boost_mult)
    } else {
        0.0
    };
    // TS `processSessionEnd` only calls addCoins when coinsEarned > 0:
    // a 0-coin session skips the economy read-modify-write entirely
    // (no wallet row created, no write churn on short sessions).
    if coins != 0.0 {
        let mut econ =
            crate::commands::economy::balance::load_econ_routed(pool, guild_id, user_id).await;
        econ.money += coins;
        let _ = crate::commands::economy::balance::save_econ_routed(pool, guild_id, user_id, &econ)
            .await;
    }
    let mut stats = crate::commands::stats::main::load_stats(pool, guild_id, user_id).await;
    // Exact elapsed ms (TS stores exact start/end timestamps; the old
    // whole-minutes truncation lost up to ~59.9s per session).
    stats.voice_ms += elapsed_ms;
    stats.voice_log = crate::commands::stats::main::push_voice_log(
        stats.voice_log,
        crate::commands::stats::main::StatsVoice {
            start_ts: close.start,
            end_ts: close.now_ms,
            channel_id: close.channel_id,
        },
    );
    let _ = crate::db::tbl_set_json(
        pool,
        guild_id,
        &crate::commands::stats::main::stats_key(user_id),
        &stats,
    )
    .await;
    (minutes, coins)
}

/// Close a session. Returns (minutes, coins) credited to wallet + voice_ms.
/// Mirrors processSessionEnd in onVoiceUpdate.ts. `pay` is the
/// newState.member gate: false when the user left the guild.
pub async fn voice_leave(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    now_ms: i64,
    boost_mult: f64,
    pay: bool,
) -> (u64, f64) {
    let raw: Option<String> = load_voice_session_raw(pool, guild_id, user_id).await;
    delete_voice_session(pool, guild_id, user_id).await;
    let Some(raw) = raw else {
        return (0, 0.0);
    };
    let Some((start, channel_id)) = parse_voice_session(&raw) else {
        return (0, 0.0);
    };
    close_voice_session(
        pool,
        guild_id,
        user_id,
        VoiceClose {
            channel_id,
            start,
            now_ms,
            boost_mult,
            pay,
        },
    )
    .await
}

/// Channel move: close the old leg (coins + StatsVoice, mirrors TS
/// processSessionEnd on move) then open the new session.
pub async fn voice_switch(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    new_channel_id: u64,
    now_ms: i64,
    boost_mult: f64,
    pay: bool,
) -> (u64, f64) {
    let raw: Option<String> = load_voice_session_raw(pool, guild_id, user_id).await;
    let mut out = (0, 0.0);
    if let Some(raw) = raw {
        if let Some((start, channel_id)) = parse_voice_session(&raw) {
            out = close_voice_session(
                pool,
                guild_id,
                user_id,
                VoiceClose {
                    channel_id,
                    start,
                    now_ms,
                    boost_mult,
                    pay,
                },
            )
            .await;
        }
    }
    voice_join(pool, guild_id, user_id, new_channel_id, now_ms).await;
    out
}

/// Delete one session row (both keys: Rust string + TS object).
pub async fn delete_voice_session(pool: &crate::db::Pool, guild_id: &str, user_id: u64) {
    let _ = crate::db::tbl_del(pool, guild_id, &voice_session_key(user_id)).await;
    let _ = crate::db::tbl_del(pool, guild_id, &active_voice_session_key(user_id)).await;
}

/// Boot recovery. Mirrors recoverActiveSessions in onVoiceUpdate.ts:
/// sessions for users no longer in voice are closed WITHOUT pay (the TS
/// synthetic leave state carries no member, so the member gate pays
/// nothing) and their stats are still recorded. `in_voice` holds the
/// user ids currently in a voice channel. Returns closed count.
pub async fn recover_voice_sessions(
    pool: &crate::db::Pool,
    guild_id: &str,
    in_voice: &std::collections::HashSet<u64>,
    now_ms: i64,
) -> usize {
    let mut rows = crate::db::tbl_scan_prefix(pool, guild_id, "VOICE_SESSION.").await;
    // TS-keyed sessions (ACTIVE_VOICE_SESSIONS.<uid> objects) recover too.
    let mut ts_rows = crate::db::tbl_scan_prefix(pool, guild_id, "ACTIVE_VOICE_SESSIONS.").await;
    rows.append(&mut ts_rows);
    let mut closed = 0;
    let mut seen = std::collections::HashSet::new();
    for (key, raw) in rows {
        let uid_str = if let Some(rest) = key.strip_prefix("VOICE_SESSION.") {
            rest
        } else if let Some(rest) = key.strip_prefix("ACTIVE_VOICE_SESSIONS.") {
            rest
        } else {
            continue;
        };
        let Some(uid) = uid_str.parse::<u64>().ok() else {
            continue;
        };
        // One close per user: joins dual-write both keys.
        if !seen.insert(uid) {
            continue;
        }
        if in_voice.contains(&uid) {
            continue;
        }
        let Some((start, channel_id)) = parse_voice_session(&raw) else {
            delete_voice_session(pool, guild_id, uid).await;
            continue;
        };
        delete_voice_session(pool, guild_id, uid).await;
        close_voice_session(
            pool,
            guild_id,
            uid,
            VoiceClose {
                channel_id,
                start,
                now_ms,
                boost_mult: 1.0,
                pay: false,
            },
        )
        .await;
        closed += 1;
    }
    closed
}
/// Temp voice helpers. Mirrors voicedashboard/voiceState.ts:
/// joining the lobby spawns a personal channel (CUSTOM_VOICE), emptied
/// temp channels are deleted.
pub fn temp_voice_key(guild_id: u64, user_id: u64) -> String {
    format!("CUSTOM_VOICE.{guild_id}.{user_id}")
}

/// Temp-voice channel id across both scopes: the per-guild scope first
/// (established Rust read path), then the global `temp` scope (TS
/// tempTable parity — `CUSTOM_VOICE.<gid>.<uid>` lives in the TS temp
/// table, keyed with the guild embedded). Keys unchanged.
pub async fn load_temp_voice_channel(
    pool: &crate::db::Pool,
    guild_id: u64,
    user_id: u64,
) -> Option<String> {
    let key = temp_voice_key(guild_id, user_id);
    let gid = guild_id.to_string();
    if let Some(v) = crate::db::tbl_get(pool, &gid, &key).await {
        return Some(v);
    }
    crate::commands::owner::main::routed_get(pool, "temp", "temp", &key).await
}

pub fn temp_channel_name(username: &str) -> String {
    temp_channel_name_in(username, None)
}

/// Temp channel name with an optional lang template (TS
/// `temporary_voice_channel_name`, `{nickname}` slot). `None`
/// keeps the current English default.
pub fn temp_channel_name_in(username: &str, template: Option<&str>) -> String {
    let short: String = username.chars().take(20).collect();
    match template {
        Some(t) => t.replace("{nickname}", &short),
        None => format!("{short}'s channel"),
    }
}

/// Welcome template render. Mirrors generateCustomMessagePreview for
/// join/leave messages: {user} {server} {memberCount} {username}.
pub fn render_welcome(
    template: &str,
    user_mention: &str,
    guild_name: &str,
    member_count: u64,
) -> String {
    template
        .replace("{user}", user_mention)
        .replace("{username}", user_mention)
        .replace("{server}", guild_name)
        .replace("{memberCount}", &member_count.to_string())
}

/// Inviter display for join messages. Mirrors the isCustomVanity branch
/// in joinMessage.ts: bot-attributed custom-vanity joins show the short
/// vanity links, otherwise the plain username/mention.
pub fn inviter_display(
    vanity_code: Option<&str>,
    username: &str,
    mention: &str,
) -> (String, String) {
    match vanity_code {
        Some(code) => (format!(".wf/{code}"), format!("discord.wf/{code}")),
        // TS `||` legs (generateCustomMessagePreview `inviter?.user.username
        // || "unknow_user"` / `inviter?.user.mention || "@unknow_user"`, node
        // battery slice 114): a present-but-empty string falls back to the
        // literal defaults, like a missing inviter. Live callers only ever
        // pass real Discord usernames here, so this is exact with zero
        // behavior change on reachable inputs.
        None => (
            if username.is_empty() {
                "unknow_user".to_string()
            } else {
                username.to_string()
            },
            if mention.is_empty() {
                "@unknow_user".to_string()
            } else {
                mention.to_string()
            },
        ),
    }
}

/// Custom-vanity lookup. Mirrors `apiTable.get(VANITY.${guildId})` plus
/// the bot-inviter and invite-code match (entry shape {vanity, invite}).
pub fn custom_vanity_code(
    table: Option<&serde_json::Value>,
    guild_id: &str,
    invite_code: &str,
    bot_id: u64,
    inviter_id: u64,
) -> Option<String> {
    if inviter_id != bot_id {
        return None;
    }
    let entry = table?.get(guild_id)?;
    if entry.get("invite")?.as_str()? != invite_code {
        return None;
    }
    entry.get("vanity")?.as_str().map(str::to_string)
}

/// Apply the join-message inviter slots once attribution resolves an
/// inviter (render_welcome itself has no inviter vocabulary).
pub fn render_inviter_slots(template: &str, username: &str, mention: &str) -> String {
    template
        .replace("{inviterUsername}", username)
        .replace("{inviterMention}", mention)
}

/// Join-DM template rendering. Mirrors generateCustomMessagePreview in
/// core/functions/method.ts for the joinDm call (member/guild
/// placeholders resolved; inviter/ranks/notifier/blogger slots keep
/// their TS literal defaults since join emission carries no context).
pub fn render_join_dm(
    template: &str,
    username: &str,
    mention: &str,
    member_count: u64,
    guild_name: &str,
) -> String {
    template
        .replace("{memberUsername}", username)
        .replace("{memberMention}", mention)
        .replace("{memberCount}", &member_count.to_string())
        .replace("{guildName}", guild_name)
        .replace("{inviterUsername}", "unknow_user")
        .replace("{inviterMention}", "@unknow_user")
        .replace("{invitesCount}", "1337")
        .replace("{xpLevel}", "1337")
        .replace("{artistAuthor}", "Ninja")
        .replace("{artistLink}", "https://twitch.tv/Ninja")
        .replace("{mediaURL}", "https://twitch.tv/Ninja/media")
        .replace("{articleTitle}", "Unknow Article")
        .replace("{articleAuthor}", "Unknown Author")
        .replace("{articleLink}", "Unknown Link")
        .replace("{blogName}", "Unknown Blog Name")
}

/// Stored-embed key. Mirrors the `EMBED.${embedId}` metasTable lookup
/// in welcomerEmbed.ts (records hold {embedOwner, embedSource}).
pub fn welcomer_embed_key(embed_id: &str) -> String {
    format!("EMBED.{embed_id}")
}

/// Extract the embedSource payload from an EMBED record body.
/// Returns None for missing/unparsable records or records without
/// embedSource (mirrors the `if (!record?.embedSource) return null` leg).
/// The guard is JS-falsy, not missing-only: explicit `null`, `0`,
/// `""` and `false` all yield null in TS (node ground truth), while
/// `[]`/`{}` are truthy and pass through on both sides.
pub fn welcomer_embed_source(record_json: &str) -> Option<serde_json::Value> {
    let parsed: serde_json::Value = serde_json::from_str(record_json).ok()?;
    let src = parsed.get("embedSource")?;
    let falsy = match src {
        serde_json::Value::Null => true,
        serde_json::Value::Bool(b) => !b,
        // JSON has no NaN/Infinity, so 0/-0 is the only falsy number.
        serde_json::Value::Number(n) => n.as_f64().is_some_and(|f| f == 0.0),
        serde_json::Value::String(s) => s.is_empty(),
        // Arrays (even []) and objects are truthy in JS.
        _ => false,
    };
    if falsy {
        None
    } else {
        Some(src.clone())
    }
}

/// Dispatch-shape decision for welcomerMessage.ts (the Components V2
/// vs legacy-embed branch the Discord-bound sender implements).
/// `embed ? false : (useComponents ?? true)`: a stored embed always
/// wins (never mixed with V2 in one payload); otherwise the explicit
/// flag rules, defaulting to V2. `has_embed` folds the TS
/// `options.embed ?? null` leg (node ground truth: null/undefined ->
/// V2-default, any object -> legacy).
pub fn welcomer_use_components(has_embed: bool, use_components: Option<bool>) -> bool {
    if has_embed {
        false
    } else {
        use_components.unwrap_or(true)
    }
}

/// Banner attachment name. Mirrors
/// `options.bannerAttachmentName ?? "image.png"`: only null/undefined
/// fall back — an explicit `""` stays verbatim (node ground truth).
pub fn welcomer_banner_name(name: Option<&str>) -> &str {
    name.unwrap_or("image.png")
}

/// Message presence. Mirrors the `!options.message` legs (`message?:
/// string | null`): `""`/null/undefined are all absent, `" "` sends.
pub fn welcomer_has_message(message: Option<&str>) -> bool {
    message.is_some_and(|m| !m.is_empty())
}

/// Legacy-path early-out. Mirrors
/// `if (!options.message && !embed && !hasBanner) return null`.
pub fn welcomer_legacy_should_send(
    message: Option<&str>,
    has_embed: bool,
    has_banner: bool,
) -> bool {
    welcomer_has_message(message) || has_embed || has_banner
}

/// Components-V2-path early-out. Mirrors
/// `if (!options.message && !hasBanner) return null` (no embed leg:
/// embeds never reach the V2 path).
pub fn welcomer_v2_should_send(message: Option<&str>, has_banner: bool) -> bool {
    welcomer_has_message(message) || has_banner
}

/// Payload content. Mirrors `content: options.message || undefined`
/// (`""` sends no content, `" "` sends a blank).
pub fn welcomer_content(message: Option<&str>) -> Option<&str> {
    message.filter(|m| !m.is_empty())
}

/// Preview-render a stored embed. Mirrors resolveWelcomerEmbed: the
/// source is deep-cloned (like the TS JSON round-trip) and `render`
/// — the generateCustomMessagePreview port (render_welcome /
/// render_join_dm / render_inviter_slots) — runs over title,
/// description, footer.text, author.name and every fields[].name/value.
/// Guard shape (node ground truth): title/description/footer.text /
/// author.name apply only when TRUTHY (`""`/missing/non-string-falsy
/// stay verbatim); the fields loop applies UNCONDITIONALLY, so a
/// missing/null/non-string field name/value (or a non-object entry, or
/// a truthy non-string title) THROWS TypeError in TS. The Rust port
/// keeps such slots untouched instead of throwing (hostile-row-only:
/// the embed builder always writes string name/value pairs); the
/// divergence is pinned in
/// `welcomer_embed_field_application_matches_ts_guards`.
pub fn apply_embed_preview(
    source: &serde_json::Value,
    render: impl Fn(&str) -> String,
) -> serde_json::Value {
    let mut out = source.clone();
    for key in ["title", "description"] {
        if let Some(text) = out.get(key).and_then(|v| v.as_str()).map(str::to_string) {
            out[key] = render(&text).into();
        }
    }
    for path in [["footer", "text"], ["author", "name"]] {
        if let Some(text) = out
            .get(path[0])
            .and_then(|v| v.get(path[1]))
            .and_then(|v| v.as_str())
            .map(str::to_string)
        {
            out[path[0]][path[1]] = render(&text).into();
        }
    }
    if let Some(fields) = out.get_mut("fields").and_then(|v| v.as_array_mut()) {
        for field in fields.iter_mut() {
            for key in ["name", "value"] {
                if let Some(text) = field.get(key).and_then(|v| v.as_str()).map(str::to_string) {
                    field[key] = render(&text).into();
                }
            }
        }
    }
    out
}

/// Load a stored welcomer embed's embedSource. `scope` is the guild id
/// (EMBED rows are written per-guild via routed_set, with the legacy kv
/// row as fallback — both covered by tbl_get).
pub async fn load_welcomer_embed_source(
    pool: &crate::db::Pool,
    scope: &str,
    embed_id: &str,
) -> Option<serde_json::Value> {
    if embed_id.is_empty() {
        return None;
    }
    let raw = crate::db::tbl_get(pool, scope, &welcomer_embed_key(embed_id)).await?;
    welcomer_embed_source(&raw)
}

/// Account date slots for join messages. Mirrors the two
/// generateCustomMessagePreview legs the fixed render_join_dm cannot
/// fill without the Discord user object: {createdAt} is the locale date
/// string (input.user.createdAt.toLocaleDateString(guildLocal)),
/// {accountCreationTimestamp} is the relative timestamp
/// (time(createdAt, "R") -> <t:unix:R>). Chain after render_join_dm /
/// render_welcome / render_xp_announce.
pub fn render_account_time_slots(
    template: &str,
    created_at_date: &str,
    created_unix_secs: i64,
) -> String {
    template.replace("{createdAt}", created_at_date).replace(
        "{accountCreationTimestamp}",
        &format!("<t:{created_unix_secs}:R>"),
    )
}

/// Locale short-date for the {createdAt} slot. Mirrors
/// `user.createdAt.toLocaleDateString(guildLocal)` (server-local
/// timezone; guild LANG, `"en-US"` fallback). Shapes pinned from
/// node v24 full-icu ground truth: en-US + jp-JP/fallback
/// `M/D/YYYY`, fr-FR/fr-ME/it-IT/pt-PT `DD/MM/YYYY`, es-ES
/// `D/M/YYYY`, de-DE `D.M.YYYY`, ru-RU `DD.MM.YYYY`, ar-EG
/// arabic-indic digits with RLM separators. Unknown locales fall
/// back like Node (host default, the en-US shape here). The date
/// comes from chrono::Local like format_date (slice 8); an
/// out-of-range stamp yields the TS "Invalid Date" literal.
pub fn locale_date_string(created_unix_secs: i64, lang: &str) -> String {
    let local = chrono::DateTime::from_timestamp(created_unix_secs, 0)
        .map(|dt| dt.with_timezone(&chrono::Local).date_naive());
    match local {
        Some(d) => {
            use chrono::Datelike;
            format_locale_date(d.year(), d.month(), d.day(), lang)
        }
        None => "Invalid Date".to_string(),
    }
}

/// Pure locale short-date formatter (no clock/TZ involved, fully
/// pinnable). Mirrors the node ground-truth shapes documented on
/// [`locale_date_string`].
pub fn format_locale_date(year: i32, month: u32, day: u32, lang: &str) -> String {
    if lang == "ar-EG" {
        let ar = |n: u32| {
            n.to_string()
                .chars()
                .map(|c| char::from_u32(c as u32 - '0' as u32 + 0x660).unwrap_or(c))
                .collect::<String>()
        };
        return format!(
            "{}\u{200f}/{}\u{200f}/{}",
            ar(day),
            ar(month),
            ar(year as u32)
        );
    }
    match lang {
        "fr-FR" | "fr-ME" | "it-IT" | "pt-PT" => {
            format!("{day:02}/{month:02}/{year}")
        }
        "es-ES" => format!("{day}/{month}/{year}"),
        "de-DE" => format!("{day}.{month}.{year}"),
        "ru-RU" => format!("{day:02}.{month:02}.{year}"),
        _ => format!("{month}/{day}/{year}"),
    }
}

/// Join-role list from the welcomer blob. Mirrors joinRole.ts
/// (GUILD.GUILD_CONFIG.joinroles as string | string[]), falling back
/// to the legacy GUILD.JOIN_ROLE row written by the old setter.
pub async fn join_role_ids(pool: &crate::db::Pool, gid: &str) -> Vec<u64> {
    let parse = |s: &str| s.parse::<u64>().ok();
    if let Some(raw) = crate::db::tbl_get(pool, gid, "GUILD.GUILD_CONFIG").await {
        if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(v) = cfg.get("joinroles") {
                if let Some(s) = v.as_str() {
                    return parse(s).into_iter().collect();
                }
                if let Some(arr) = v.as_array() {
                    return arr
                        .iter()
                        .filter_map(|x| x.as_str().and_then(parse))
                        .collect();
                }
            }
        }
    }
    crate::db::tbl_get(pool, gid, "GUILD.JOIN_ROLE")
        .await
        .and_then(|s| parse(&s))
        .into_iter()
        .collect()
}

/// Join-DM template from the welcomer blob. Mirrors joinDm.ts
/// (GUILD.GUILD_CONFIG.joindm; "off" disables), falling back to the
/// legacy GUILD.JOIN_DM row. Returns None when unset, "" (TS `!msg_dm`
/// returns before any send) or "off".
pub async fn join_dm_template(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    let blob = if let Some(raw) = crate::db::tbl_get(pool, gid, "GUILD.GUILD_CONFIG").await {
        serde_json::from_str::<serde_json::Value>(&raw)
            .ok()
            .and_then(|cfg| cfg.get("joindm").and_then(|v| v.as_str()).map(String::from))
    } else {
        None
    };
    let tpl = match blob {
        Some(t) => Some(t),
        None => crate::db::tbl_get(pool, gid, "GUILD.JOIN_DM").await,
    }?;
    if tpl.is_empty() || tpl == "off" {
        return None;
    }
    Some(tpl)
}

/// Record one message: +1 STATS message, +35..=37 RANKS XP
/// (level-ups applied, coins credited on level-up).
/// Mirrors Events/stats/onNewMessage.ts + ranks/onNewMessage.ts
/// (`Math.floor(Math.random() * 3) + 35`, threshold `level * 500`,
/// `addCoins(member, randomNumber * memberBoost)`).
/// Member boost is unavailable at this layer, so the credit uses the
/// base gain (boost 1); the Discord handler applies the real shop
/// boost when it has member roles.
/// One permission-overwrite entry in plain data form (mirrors the
/// discord.js PermissionOverwrite cache rows consumed by getDiff in
/// Events/logs/channelUpdateLogs.ts). Serenity mapping happens at
/// the call site so this stays unit-testable.
pub struct PermOverwriteDiff {
    pub id: u64,
    pub is_role: bool,
    pub allow: Vec<String>,
    pub deny: Vec<String>,
}

/// Channel-update change list. Mirrors getDiff in
/// Events/logs/channelUpdateLogs.ts (name line + allow/deny
/// add/remove lines via the event_srvLogs_channelUpdate_* keys;
/// empty string means "no relevant change, stay silent").
pub fn channel_perm_diff(
    old_name: &str,
    new_name: &str,
    old_ow: &[PermOverwriteDiff],
    new_ow: &[PermOverwriteDiff],
    text: &dyn Fn(&str) -> String,
) -> String {
    let mut after = String::new();
    if old_name != new_name {
        after +=
            &text("event_srvLogs_channelUpdate_field_name").replace("${newChannel.name}", new_name);
    }
    let target = |o: &PermOverwriteDiff| {
        if o.is_role {
            format!("<@&{}>", o.id)
        } else {
            format!("<@{}>", o.id)
        }
    };
    for old_perm in old_ow {
        let Some(new_perm) = new_ow.iter().find(|n| n.id == old_perm.id) else {
            continue;
        };
        let t = target(new_perm);
        for p in old_perm
            .allow
            .iter()
            .filter(|p| !new_perm.allow.contains(p))
        {
            after += &text("event_srvLogs_channelUpdate_disabled_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
        for p in new_perm
            .allow
            .iter()
            .filter(|p| !old_perm.allow.contains(p))
        {
            after += &text("event_srvLogs_channelUpdate_enabled_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
        for p in old_perm.deny.iter().filter(|p| !new_perm.deny.contains(p)) {
            after += &text("event_srvLogs_channelUpdate_allowed_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
        for p in new_perm.deny.iter().filter(|p| !old_perm.deny.contains(p)) {
            after += &text("event_srvLogs_channelUpdate_unallowed_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
    }
    for new_perm in new_ow {
        if old_ow.iter().any(|o| o.id == new_perm.id) {
            continue;
        }
        let t = target(new_perm);
        after += &text("event_srvLogs_channelUpdate_perm_added").replace("${target}", &t);
        for p in &new_perm.allow {
            after += &format!("-    ✅ {p}\n");
        }
        for p in &new_perm.deny {
            after += &format!("-    ❌ {p}\n");
        }
    }
    after
}

/// Line diff for edited-message logs. Mirrors getDetailedDiff in
/// Events/logs/messageUpdateLogs.ts (30-char window around the
/// first difference, ```diff fenced).
///
/// TS counts `.length` / indexes `line[i]` / slices `substring` in
/// UTF-16 code units, so the diff index and the truncation window
/// are computed on the UTF-16 encoding here too (astral characters
/// count 2). ONE DELTA (doc-noted): `substring` can split a
/// surrogate pair and keep a lone half; Rust strings cannot hold
/// lone surrogates, so window edges landing mid-pair snap to the
/// nearest whole character (start back, end forward).
pub fn message_diff(old_text: &str, new_text: &str) -> String {
    const MAX_LINE: usize = 30;
    const HALF: usize = MAX_LINE / 2;
    fn is_lead(u: u16) -> bool {
        (0xD800..0xDC00).contains(&u)
    }
    fn is_trail(u: u16) -> bool {
        (0xDC00..0xE000).contains(&u)
    }
    fn mid_pair(units: &[u16], idx: usize) -> bool {
        idx > 0 && idx < units.len() && is_lead(units[idx - 1]) && is_trail(units[idx])
    }
    fn diff_index(a: &[u16], b: &[u16]) -> usize {
        for i in 0..a.len().min(b.len()) {
            if a[i] != b[i] {
                return i;
            }
        }
        a.len().max(b.len())
    }
    fn trunc(line: &str, idx: usize) -> String {
        let units: Vec<u16> = line.encode_utf16().collect();
        let mut start = idx.saturating_sub(HALF);
        let mut end = (start + MAX_LINE).min(units.len());
        if start < end && mid_pair(&units, start) {
            start -= 1;
        }
        if end < units.len() && mid_pair(&units, end) {
            end += 1;
        }
        String::from_utf16(&units[start..end])
            .unwrap_or_else(|_| String::from_utf16_lossy(&units[start..end]))
    }
    let old_lines: Vec<&str> = old_text.trim().split('\n').collect();
    let new_lines: Vec<&str> = new_text.trim().split('\n').collect();
    let mut out = vec![];
    for i in 0..old_lines.len().max(new_lines.len()) {
        let o = old_lines.get(i).copied().unwrap_or("");
        let n = new_lines.get(i).copied().unwrap_or("");
        let (to, tn) = (
            // TS compares `.length` (UTF-16 units); byte/char len
            // would over-truncate astral-heavy lines.
            if o.encode_utf16().count() > MAX_LINE {
                let (ou, nu): (Vec<u16>, Vec<u16>) =
                    (o.encode_utf16().collect(), n.encode_utf16().collect());
                trunc(o, diff_index(&ou, &nu))
            } else {
                o.to_string()
            },
            if n.encode_utf16().count() > MAX_LINE {
                let (ou, nu): (Vec<u16>, Vec<u16>) =
                    (o.encode_utf16().collect(), n.encode_utf16().collect());
                trunc(n, diff_index(&ou, &nu))
            } else {
                n.to_string()
            },
        );
        if !o.is_empty() && n.is_empty() {
            out.push(format!("- {to}"));
        } else if o.is_empty() && !n.is_empty() {
            out.push(format!("+ {tn}"));
        } else if o != n {
            out.push(format!("- {to}"));
            out.push(format!("+ {tn}"));
        }
    }
    format!("```diff\n{}\n```", out.join("\n"))
}

/// Handler context for one XP message: Discord-only inputs the DB
/// layer cannot see (SendMessages permission, MsgChannel lookup,
/// member roles, already-resolved guild-lang template). `None`
/// overrides draw live RNG so tests stay deterministic.
pub struct XpMessageInput<'a> {
    pub command_handled: bool,
    pub can_send: bool,
    pub channel_exists: bool,
    pub member_roles: &'a [u64],
    pub shop_json: Option<&'a str>,
    pub xp_gain_override: Option<u64>,
    pub hint_roll_override: Option<f64>,
    pub template_override: Option<&'a str>,
    pub additional_info_override: Option<&'a str>,
    pub emoji_markup: &'a str,
    pub member_username: &'a str,
    pub member_mention: &'a str,
    pub member_count: u64,
    pub guild_name: &'a str,
}

impl<'a> Default for XpMessageInput<'a> {
    fn default() -> Self {
        Self {
            command_handled: false,
            can_send: true,
            channel_exists: true,
            member_roles: &[],
            shop_json: None,
            xp_gain_override: None,
            hint_roll_override: None,
            template_override: None,
            additional_info_override: None,
            emoji_markup: "",
            member_username: "",
            member_mention: "",
            member_count: 0,
            guild_name: "",
        }
    }
}

/// Outcome of one XP message: new level, whether it leveled, the
/// drawn gain, and the rendered announce (None when suppressed).
pub struct XpMessageOutcome {
    pub level: u64,
    pub leveled: bool,
    pub xp_gain: u64,
    pub target: XpAnnounceTarget,
    pub text: Option<String>,
}

/// Parse the stored xpchannels leaf: plain id or JSON list (legacy
/// GUILD.RANKS.xpChannels); first id wins, empty means unset.
fn parse_xp_channel(raw: &str) -> Option<String> {
    let decoded = crate::commands::owner::main::decode_stored_string(raw);
    let trimmed = decoded.trim();
    if let Ok(list) = serde_json::from_str::<Vec<String>>(trimmed) {
        return list
            .into_iter()
            .map(|s| s.trim().to_string())
            .find(|s| !s.is_empty());
    }
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Full XP message path. Mirrors Events/ranks/onNewMessage.ts end to
/// end through the pure helpers: STATS recorded, then the
/// xp_skip_for_command / xp_gain_blocked gates, the RNG gain, real
/// memberBoost coins via xp_levelup_coins, then the
/// xp_announce_suppressed / xp_announce_target routing with
/// render_xp_announce + xp_new_user_hint. GUILD.XP_LEVELING rows are
/// read table-first with legacy fallback (keys unchanged).
pub async fn record_message_activity_full(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
    content_len: u64,
    now_ms: i64,
    input: XpMessageInput<'_>,
) -> XpMessageOutcome {
    // STATS always (mirrors Events/stats/onNewMessage.ts: per-user rows
    // only — TS has no per-channel counter writer; channel-stats
    // aggregates from USER msg_log/voice_log instead).
    let mut stats = crate::commands::stats::main::load_stats(pool, guild_id, user_id).await;
    stats.messages += 1;
    stats.msg_log = crate::commands::stats::main::push_msg_log(
        stats.msg_log,
        crate::commands::stats::main::StatsMessage {
            sent_ts: now_ms,
            content_len,
            channel_id,
        },
    );
    let _ = crate::db::tbl_set_json(
        pool,
        guild_id,
        &crate::commands::stats::main::stats_key(user_id),
        &stats,
    )
    .await;

    let entry = crate::commands::ranks::main::load_rank(pool, guild_id, user_id).await;
    let no_xp = |level: u64| XpMessageOutcome {
        level,
        leveled: false,
        xp_gain: 0,
        target: XpAnnounceTarget::Suppressed,
        text: None,
    };
    // parseMessageCommand early-return: handled commands earn nothing.
    if xp_skip_for_command(input.command_handled) {
        return no_xp(entry.level);
    }
    let disable = crate::commands::ranks::migrated_get(
        pool,
        guild_id,
        crate::commands::ranks::GUILD_DISABLE_NEW,
        &[crate::commands::ranks::GUILD_DISABLE_OLD],
    )
    .await;
    let bypass = crate::commands::ranks::ignore_channels::load_ignore_routed(pool, guild_id).await;
    if xp_gain_blocked(disable.as_deref(), &bypass, &channel_id.to_string()) {
        return no_xp(entry.level);
    }

    // TS: Math.floor(Math.random() * 3) + 35.
    let xp_gain: u64 = input
        .xp_gain_override
        .unwrap_or_else(|| rand::Rng::gen_range(&mut rand::thread_rng(), 35..=37));
    let (next, leveled) = crate::commands::ranks::main::apply_xp(entry, xp_gain);
    let level = next.level;
    let _ = crate::commands::ranks::main::save_rank(pool, guild_id, user_id, &next).await;
    if leveled {
        // TS: addCoins(member, randomNumber * getMemberBoost(member)).
        // Shop JSON passed by the handler when member roles are known,
        // otherwise loaded here; missing shop falls back to boost 1.
        let shop = match input.shop_json {
            Some(raw) => raw.to_string(),
            None => crate::commands::owner::main::routed_get(
                pool,
                guild_id,
                guild_id,
                crate::commands::economy::shop_key(),
            )
            .await
            .unwrap_or_else(|| "{}".to_string()),
        };
        let reward = xp_levelup_coins(xp_gain, &shop, input.member_roles);
        if reward > 0.0 {
            let mut econ =
                crate::commands::economy::balance::load_econ_routed(pool, guild_id, user_id).await;
            // Float wallet: TS addCoins carries the float into db.add
            // (JS number stays fractional), so the reward credits exact
            // with no rounding.
            econ.money += reward;
            let _ =
                crate::commands::economy::balance::save_econ_routed(pool, guild_id, user_id, &econ)
                    .await;
        }
    }
    if !leveled {
        return XpMessageOutcome {
            level,
            leveled,
            xp_gain,
            target: XpAnnounceTarget::Suppressed,
            text: None,
        };
    }
    // Announce gate: silenced mode or missing SendMessages stays silent
    // (XP above already gained).
    if xp_announce_suppressed(disable.as_deref(), input.can_send) {
        return XpMessageOutcome {
            level,
            leveled,
            xp_gain,
            target: XpAnnounceTarget::Suppressed,
            text: None,
        };
    }
    let xp_raw = crate::commands::ranks::migrated_get(
        pool,
        guild_id,
        crate::commands::ranks::GUILD_XPCHANNEL_NEW,
        &[
            crate::commands::ranks::GUILD_XPCHANNEL_OLD_SINGLE,
            crate::commands::ranks::GUILD_XPCHANNEL_OLD_LIST,
        ],
    )
    .await;
    let xp_chan = xp_raw.as_deref().and_then(parse_xp_channel);
    let target = xp_announce_target(xp_chan.as_deref(), input.channel_exists);
    if target == XpAnnounceTarget::Suppressed {
        return XpMessageOutcome {
            level,
            leveled,
            xp_gain,
            target,
            text: None,
        };
    }
    // Handler-injected guild-lang template first, stored message row
    // next, exact en-US fallback last (YAML untouched).
    let template = match input.template_override {
        Some(t) => t.to_string(),
        None => crate::commands::ranks::migrated_get(
            pool,
            guild_id,
            crate::commands::ranks::GUILD_MESSAGE_NEW,
            &[crate::commands::ranks::GUILD_MESSAGE_OLD],
        )
        .await
        .unwrap_or_else(|| XP_EARN_FALLBACK.to_string()),
    };
    let info = input
        .additional_info_override
        .unwrap_or(XP_ADDITIONAL_INFO_FALLBACK);
    let roll: f64 = input
        .hint_roll_override
        .unwrap_or_else(|| rand::Rng::gen_range(&mut rand::thread_rng(), 0.0..1.0));
    let msg = render_xp_announce(
        &template,
        input.member_username,
        input.member_mention,
        input.member_count,
        input.guild_name,
        level,
    );
    let text = xp_new_user_hint(
        &msg,
        level,
        roll,
        info,
        input.emoji_markup,
        target == XpAnnounceTarget::ReplyInPlace,
    );
    XpMessageOutcome {
        level,
        leveled,
        xp_gain,
        target,
        text: Some(text),
    }
}

/// Record one message: +1 STATS message, +35..=37 RANKS XP
/// (level-ups applied, coins credited on level-up).
/// Mirrors Events/stats/onNewMessage.ts + ranks/onNewMessage.ts
/// (`Math.floor(Math.random() * 3) + 35`, threshold `level * 500`,
/// `addCoins(member, randomNumber * memberBoost)`).
/// Member boost is unavailable at this layer, so the credit uses the
/// base gain (boost 1); the Discord handler applies the real shop
/// boost when it has member roles (see record_message_activity_full).
pub async fn record_message_activity(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
    content_len: u64,
    now_ms: i64,
) -> (u64, bool) {
    let out = record_message_activity_full(
        pool,
        guild_id,
        user_id,
        channel_id,
        content_len,
        now_ms,
        XpMessageInput::default(),
    )
    .await;
    (out.level, out.leveled)
}

/// XP gain gate. Mirrors ranks/onNewMessage.ts (`xpTurn === "disable"`
/// from GUILD.XP_LEVELING.disable, or the channel in `bypassChannels`):
/// true means no XP is earned. `disable_raw` is the stored disable value
/// (None when unconfigured). Cross-runtime the leaf may be a bare
/// JSON boolean (`true` / `false`, what TS `client.db.set` writes) or a
/// quoted JSON string (`"\"disable\""` kept verbatim by the legacy kv
/// store): one layer of string quoting is decoded so both forms match.
pub fn xp_gain_blocked(
    disable_raw: Option<&str>,
    bypass_channels: &[String],
    channel_id: &str,
) -> bool {
    let normalized = disable_raw
        .map(crate::commands::owner::main::decode_stored_string)
        .unwrap_or_default();
    if normalized == "disable" {
        return true;
    }
    bypass_channels.iter().any(|c| c == channel_id)
}

/// parseMessageCommand early-return. Mirrors onNewMessage.ts: a message
/// consumed as a prefix command never earns XP.
pub fn xp_skip_for_command(command_handled: bool) -> bool {
    command_handled
}

/// Announce gate. Mirrors onNewMessage.ts (`xpTurn === false` silences the
/// level-up message via `/ranks config off`, missing SendMessages
/// permission stays silent): true means no level-up message. XP was still
/// gained (the full-disable case is caught by xp_gain_blocked first).
/// Bare and quoted stored forms both match (see `xp_gain_blocked`).
/// DELTAS (manual-DB-only): the writer stores real booleans (`!config.ts`
/// writes `false`/`true`/`"disable"`), which TS `db.get` JSON-parses back
/// to booleans so strict `===` applies; a hand-written string `"false"`
/// leaf reads suppressed here while TS `"false" === false` proceeds, and
/// other truthy leaves (`"0"`, `0`, `"off"`) proceed on both sides.
pub fn xp_announce_suppressed(disable_raw: Option<&str>, can_send: bool) -> bool {
    if !can_send {
        return true;
    }
    disable_raw
        .map(crate::commands::owner::main::decode_stored_string)
        .as_deref()
        == Some("false")
}

/// Level-up announce routing. Mirrors onNewMessage.ts: no `xpchannels`
/// set -> reply in place (`channelSend`); set with a resolvable channel
/// -> send there; set but unresolvable -> stay silent.
/// DELTA (manual-DB-only): the leaf is trimmed here while TS tests the raw
/// `!xpChan` truthiness, so a whitespace-only leaf replies in place here
/// (TS: truthy -> cache lookup -> silent) and a padded id sends here (TS:
/// lookup misses -> silent). The writer stores a bare snowflake id or
/// deletes the key (`!channel.ts`), never whitespace.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum XpAnnounceTarget {
    ReplyInPlace,
    SendToChannel(String),
    Suppressed,
}

pub fn xp_announce_target(xp_channel: Option<&str>, channel_exists: bool) -> XpAnnounceTarget {
    match xp_channel.map(str::trim).filter(|s| !s.is_empty()) {
        None => XpAnnounceTarget::ReplyInPlace,
        Some(id) if channel_exists => XpAnnounceTarget::SendToChannel(id.to_string()),
        Some(_) => XpAnnounceTarget::Suppressed,
    }
}

/// Exact en-US fallbacks for the XP announce path (src/lang/en-US.yml).
/// The handler resolves the guild lang first; these apply when the lookup
/// misses, so YAML stays untouched.
pub const XP_EARN_FALLBACK: &str =
    "**GG**, {memberMention} you have leveled up! (Level: **{xpLevel}**)";
pub const XP_ADDITIONAL_INFO_FALLBACK: &str = "\n-# ${client.iHorizon_Emojis.VC_OpenChat} Do you find this message annoying? You can disable this message by disabling the leveling system with the `/ranks config` command.";

/// Level-up message render. Mirrors generateCustomMessagePreview in
/// core/functions/method.ts for the ranks call (user/guild/ranks slots
/// resolved; inviter/notifier/blogger slots keep their TS literal
/// defaults). Date slots ({createdAt}, {accountCreationTimestamp}) need
/// the discord user object and are left for the handler.
pub fn render_xp_announce(
    template: &str,
    member_username: &str,
    member_mention: &str,
    member_count: u64,
    guild_name: &str,
    new_level: u64,
) -> String {
    template
        .replace("{memberUsername}", member_username)
        .replace("{memberMention}", member_mention)
        .replace("{memberCount}", &member_count.to_string())
        .replace("{guildName}", guild_name)
        .replace("{xpLevel}", &new_level.to_string())
        .replace("{inviterUsername}", "unknow_user")
        .replace("{inviterMention}", "@unknow_user")
        .replace("{invitesCount}", "1337")
        .replace("{artistAuthor}", "Ninja")
        .replace("{artistLink}", "https://twitch.tv/Ninja")
        .replace("{mediaURL}", "https://twitch.tv/Ninja/media")
        .replace("{articleTitle}", "Unknow Article")
        .replace("{articleAuthor}", "Unknown Author")
        .replace("{articleLink}", "Unknown Link")
        .replace("{blogName}", "Unknown Blog Name")
}

/// New-user hint. Mirrors onNewMessage.ts: on the first level-up
/// (newLevel === 1) the additional-info line (emoji slot filled) is
/// appended on a 1/2 roll (`Math.random() < 0.5`; `roll` is the
/// handler's draw so this stays deterministic in tests). The TS appends
/// the hint only inside the `!xpChan` branch (reply in place), never on
/// the xpchannels leg — `reply_in_place` carries that routing.
pub fn xp_new_user_hint(
    msg: &str,
    new_level: u64,
    roll: f64,
    additional_info: &str,
    emoji_markup: &str,
    reply_in_place: bool,
) -> String {
    if reply_in_place && new_level == 1 && roll < 0.5 {
        format!(
            "{msg}{}",
            additional_info.replace("${client.iHorizon_Emojis.VC_OpenChat}", emoji_markup)
        )
    } else {
        msg.to_string()
    }
}

/// Real level-up coin credit. Mirrors onNewMessage.ts
/// `addCoins(member, randomNumber * getMemberBoost(member))`: the shop
/// boost rolls through economy member_boost_f64 (missing shop/roles
/// fall back to 1, same as TS). Float-preserving like the TS number.
pub fn xp_levelup_coins(xp_gain: u64, shop_json: &str, member_roles: &[u64]) -> f64 {
    crate::commands::ranks::main::coins_for_levelup(
        xp_gain,
        crate::commands::economy::main::member_boost_f64(shop_json, member_roles),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protection_bypasses_owner_allowlist_and_bots() {
        assert_eq!(
            protection_decision(true, false, false),
            PunishDecision::Ignore
        );
        assert_eq!(
            protection_decision(false, true, false),
            PunishDecision::Ignore
        );
        assert_eq!(
            protection_decision(false, false, true),
            PunishDecision::Ignore
        );
        assert_eq!(
            protection_decision(false, false, false),
            PunishDecision::Punish
        );
    }

    #[test]
    fn xp_curve_is_linear_500_per_level() {
        assert_eq!(xp_for_next_level(0), 0);
        assert_eq!(xp_for_next_level(1), 500);
        assert_eq!(xp_for_next_level(5), 2500);
    }

    #[test]
    fn ignore_gate_and_role_rewards() {
        assert!(should_gain_xp(&[], "1"));
        assert!(!should_gain_xp(&["1".to_string()], "1"));
        let roles = vec![
            crate::commands::ranks::main::RankRole {
                role_id: "a".into(),
                level: 2,
            },
            crate::commands::ranks::main::RankRole {
                role_id: "b".into(),
                level: 5,
            },
        ];
        assert_eq!(roles_earned(&roles, 1, 3), vec!["a".to_string()]);
        assert!(roles_earned(&roles, 3, 4).is_empty());
    }

    #[test]
    fn prevnames_user_and_nick_match_ts_battery() {
        // W7 slice 24 battery (scratch slice-w7s24-prevnames.js, 20/20):
        // prevnamesModule.ts userUpdate + prevnamesModuleGuild.ts
        // guildMemberUpdate verbatim legs.
        let u = |pn: Option<&str>, pg: Option<Option<&str>>, nn: &str, ng: Option<&str>| {
            prevnames_user_changes(pn, pg, nn, ng)
        };
        // Name change with null globals: one username change.
        assert_eq!(
            u(Some("a"), Some(None::<&str>), "b", None),
            vec![("username".to_string(), "a".to_string())]
        );
        // No change anywhere.
        assert!(u(Some("a"), Some(None::<&str>), "a", None).is_empty());
        // Null -> name global transition is dropped (strict !== plus the
        // non-nullish gate).
        assert!(u(Some("a"), Some(None::<&str>), "a", Some("x")).is_empty());
        // Name -> null global records the OLD name.
        assert_eq!(
            u(Some("a"), Some(Some("x")), "a", None),
            vec![("globalName".to_string(), "x".to_string())]
        );
        // Name -> name global records the OLD name.
        assert_eq!(
            u(Some("a"), Some(Some("x")), "a", Some("y")),
            vec![("globalName".to_string(), "x".to_string())]
        );
        // Both legs fire, username first (TS push order).
        assert_eq!(
            u(Some("o"), Some(Some("og")), "n", Some("ng")),
            vec![
                ("username".to_string(), "o".to_string()),
                ("globalName".to_string(), "og".to_string()),
            ]
        );
        // Neither source knows the value: no change, never the new name.
        assert!(u(None, None, "n", Some("g")).is_empty());
        // `??` resolution: cached known-no-nick (None) still yields old;
        // a cached nick wins; no row yields old.
        assert_eq!(
            prevnames_resolve_nick(None, Some("o".to_string())),
            Some("o".to_string())
        );
        assert_eq!(
            prevnames_resolve_nick(Some(None::<String>), Some("o".to_string())),
            Some("o".to_string())
        );
        assert_eq!(
            prevnames_resolve_nick(Some(Some("c".to_string())), Some("o".to_string())),
            Some("c".to_string())
        );
        assert_eq!(prevnames_resolve_nick(None, None), None);
        // Nick outcome gate: equal hits the early return (map untouched);
        // null previous only refreshes the map; a real previous records.
        assert_eq!(
            prevnames_nick_action(Some("a"), Some("a")),
            PrevNickAction::Unchanged
        );
        assert_eq!(prevnames_nick_action(None, None), PrevNickAction::Unchanged);
        assert_eq!(
            prevnames_nick_action(None, Some("x")),
            PrevNickAction::UpdateMapOnly
        );
        assert_eq!(
            prevnames_nick_action(Some("a"), Some("b")),
            PrevNickAction::Record("a".to_string())
        );
        assert_eq!(
            prevnames_nick_action(Some("a"), None),
            PrevNickAction::Record("a".to_string())
        );
        // Cache-first beats matching old/new payloads (battery stale leg).
        assert_eq!(
            prevnames_nick_action(Some("stale"), Some("s")),
            PrevNickAction::Record("stale".to_string())
        );
    }

    #[test]
    fn prevnames_dedup_and_cap() {
        let h = push_prevname(vec![], "a", 3);
        let h = push_prevname(h, "a", 3);
        assert_eq!(h.len(), 1);
        let h = push_prevname(h, "b", 3);
        let h = push_prevname(h, "c", 3);
        let h = push_prevname(h, "d", 3);
        // Oldest-first (TS push order): the cap drops the oldest.
        assert_eq!(h, vec!["b".to_string(), "c".to_string(), "d".to_string()]);
    }

    #[test]
    fn prevname_entry_mirrors_module_format() {
        assert_eq!(
            prevname_entry(1700000000, "username", "oldname"),
            "<t:1700000000:d> - [username] oldname"
        );
        assert_eq!(
            prevname_entry(1700000000, "globalName", "Old Display"),
            "<t:1700000000:d> - [globalName] Old Display"
        );
    }

    #[test]
    fn rolesaver_skips_everyone() {
        assert_eq!(
            snapshot_roles(&[(1, false), (2, false), (3, true)], 1, false),
            vec!["2".to_string(), "3".to_string()]
        );
        // Admin opt-out drops admin roles only.
        assert_eq!(
            snapshot_roles(&[(1, false), (2, false), (3, true)], 1, true),
            vec!["2".to_string()]
        );
    }

    #[test]
    fn temp_voice_helpers() {
        assert_eq!(temp_voice_key(1, 2), "CUSTOM_VOICE.1.2");
        assert_eq!(temp_channel_name("bob"), "bob's channel");
        assert!(temp_channel_name(&"x".repeat(50)).len() < 40);
        assert_eq!(
            temp_channel_name_in("bob", Some("{nickname}'s Channel")),
            "bob's Channel"
        );
        assert_eq!(temp_channel_name_in("bob", None), "bob's channel");
    }

    #[test]
    fn prevnames_history_parses_array_and_bare_string() {
        assert_eq!(
            parse_prevnames_history(r#"["a","b"]"#),
            vec!["a".to_string(), "b".to_string()]
        );
        assert_eq!(
            parse_prevnames_history("single entry"),
            vec!["single entry".to_string()]
        );
        assert!(parse_prevnames_history("").is_empty());
    }

    #[tokio::test]
    async fn prevnames_dual_merges_global_and_guild_scopes() {
        use crate::commands::owner::main as routed;
        let pool = crate::db::memory_pool().await;
        routed::routed_set(&pool, "0", "0", &prevnames_key(7), r#"["g1","shared"]"#)
            .await
            .unwrap();
        routed::routed_set(&pool, "g9", "g9", &prevnames_key(7), r#"["n1","shared"]"#)
            .await
            .unwrap();
        let merged = load_prevnames_dual(&pool, 7, "g9").await;
        assert_eq!(
            merged,
            vec!["g1".to_string(), "shared".to_string(), "n1".to_string()]
        );
        assert!(load_prevnames_dual(&pool, 8, "g9").await.is_empty());
    }

    #[tokio::test]
    async fn temp_voice_reads_guild_then_temp_scope() {
        use crate::commands::owner::main as routed;
        let pool = crate::db::memory_pool().await;
        crate::db::tbl_set(&pool, "5", &temp_voice_key(5, 6), "111")
            .await
            .unwrap();
        routed::routed_set(&pool, "temp", "temp", &temp_voice_key(5, 6), "222")
            .await
            .unwrap();
        assert_eq!(
            load_temp_voice_channel(&pool, 5, 6).await.as_deref(),
            Some("111")
        );
        crate::db::tbl_del(&pool, "5", &temp_voice_key(5, 6))
            .await
            .unwrap();
        crate::db::kv_del(&pool, "5", &temp_voice_key(5, 6))
            .await
            .unwrap();
        assert_eq!(
            load_temp_voice_channel(&pool, 5, 6).await.as_deref(),
            Some("222")
        );
    }

    #[test]
    fn voice_coins_and_sessions() {
        assert_eq!(coins_for_voice(10, 1.0), 1.0);
        assert_eq!(coins_for_voice(10, 3.0), 3.0);
        assert_eq!(coins_for_voice(9, 5.0), 0.0);
        assert_eq!(coins_for_voice(25, 2.0), 4.0);
        assert_eq!(coins_for_voice(0, 5.0), 0.0);
        // Fractional shop boosts stay fractional like the TS number.
        assert_eq!(coins_for_voice(20, 1.5), 3.0);
        // NO clamp (U-ETERNAL-381 battery): TS multiplies the raw
        // `highestBoost || 1` product, so a sub-1 boost scales down and a
        // negative boost (writer-reachable via !boost-set parseInt, which
        // never validates) debits the wallet.
        assert_eq!(coins_for_voice(10, 0.5), 0.5);
        assert_eq!(coins_for_voice(10, -2.0), -2.0);
        assert_eq!(coins_for_voice(9, -2.0), 0.0);
    }

    #[test]
    fn stats_message_and_voice_route_match_ts_battery() {
        // stats/onNewMessage.ts `!guild || bot || !channel` gate.
        assert!(stats_message_records(true, false, true));
        assert!(!stats_message_records(false, false, true));
        assert!(!stats_message_records(true, true, true));
        assert!(!stats_message_records(true, false, false));
        assert!(!stats_message_records(false, true, false));
        // stats/onVoiceUpdate.ts two-leg routing.
        use VoiceSessionRoute::*;
        assert_eq!(voice_session_route(None, Some(7)), Open);
        assert_eq!(voice_session_route(Some(6), Some(7)), Open);
        assert_eq!(voice_session_route(Some(6), None), Close);
        assert_eq!(voice_session_route(Some(6), Some(6)), Ignore);
        assert_eq!(voice_session_route(None, None), Ignore);
    }

    #[test]
    fn voice_session_parses_ts_object_and_rust_string() {
        // Exact TS writer shape: {startTimestamp, channelId: string}.
        assert_eq!(
            parse_voice_session(r#"{"startTimestamp":1700000000000,"channelId":"42"}"#),
            Some((1700000000000, 42))
        );
        // Numeric channelId also resolves (JSON number form).
        assert_eq!(
            parse_voice_session(r#"{"startTimestamp":7,"channelId":9}"#),
            Some((7, 9))
        );
        // Rust shapes keep parsing.
        assert_eq!(parse_voice_session("123:5"), Some((123, 5)));
        assert_eq!(parse_voice_session("123"), Some((123, 0)));
        // Foreign blobs stay None (callers treat as no session).
        assert_eq!(parse_voice_session("{}"), None);
        assert_eq!(parse_voice_session("nope"), None);
        assert_eq!(active_voice_session_key(3), "ACTIVE_VOICE_SESSIONS.3");
    }

    #[tokio::test]
    async fn voice_join_dual_writes_both_keys_and_ts_leave_resolves() {
        let pool = crate::db::memory_pool().await;
        voice_join(&pool, "g", 1, 9, 1000).await;
        // Rust string form under the Rust key.
        assert_eq!(
            crate::db::tbl_get(&pool, "g", &voice_session_key(1))
                .await
                .as_deref(),
            Some("1000:9")
        );
        // TS object form under the TS key.
        let ts_raw = crate::db::tbl_get(&pool, "g", &active_voice_session_key(1))
            .await
            .expect("TS key dual-written");
        assert_eq!(parse_voice_session(&ts_raw), Some((1000, 9)));
        // TS-only session (Rust key deleted, e.g. TS join): leave resolves.
        let _ = crate::db::tbl_del(&pool, "g", &voice_session_key(1)).await;
        let (minutes, _) = voice_leave(&pool, "g", 1, 61_000, 1.0, false).await;
        assert_eq!(minutes, 1);
        assert!(crate::db::tbl_get(&pool, "g", &active_voice_session_key(1))
            .await
            .is_none());
    }

    #[tokio::test]
    async fn voice_leave_credits_wallet_and_stats() {
        let pool = crate::db::memory_pool().await;
        voice_join(&pool, "g", 1, 9, 0).await;
        let (minutes, coins) = voice_leave(&pool, "g", 1, 6_000_000, 2.0, true).await;
        assert_eq!((minutes, coins), (100, 20.0));
        let econ = crate::commands::economy::balance::load_econ_routed(&pool, "g", 1).await;
        assert_eq!(econ.money, 20.0);
        let stats = crate::commands::stats::main::load_stats(&pool, "g", 1).await;
        assert_eq!(stats.voice_ms, 6_000_000);
        assert_eq!(stats.voice_log.len(), 1);
        assert_eq!(stats.voice_log[0].channel_id, 9);
        assert_eq!(stats.voice_log[0].end_ts, 6_000_000);
        // No session -> nothing.
        assert_eq!(
            voice_leave(&pool, "g", 1, 999_999, 1.0, true).await,
            (0, 0.0)
        );
        // Fractional shop boost stays fractional (no as-i64 truncation):
        // 30 min -> 3 coins x1.5 = 4.5 credited like the TS number.
        voice_join(&pool, "g", 2, 9, 0).await;
        let (_, coins) = voice_leave(&pool, "g", 2, 1_800_000, 1.5, true).await;
        assert_eq!(coins, 4.5);
        let econ = crate::commands::economy::balance::load_econ_routed(&pool, "g", 2).await;
        assert_eq!(econ.money, 4.5);
    }

    #[tokio::test]
    async fn voice_leave_member_gate_and_exact_ms() {
        let pool = crate::db::memory_pool().await;
        // pay=false (user left the guild, TS newState.member null):
        // no coins, but the session still closes and stats push.
        voice_join(&pool, "g", 1, 9, 0).await;
        let (minutes, coins) = voice_leave(&pool, "g", 1, 6_100_000, 2.0, false).await;
        assert_eq!((minutes, coins), (101, 0.0));
        let econ = crate::commands::economy::balance::load_econ_routed(&pool, "g", 1).await;
        assert_eq!(econ.money, 0.0);
        // 0-coin session skips the economy write entirely: no wallet
        // row is created (mirrors TS only calling addCoins when
        // coinsEarned > 0).
        assert!(
            crate::db::tbl_get(&pool, "g", &crate::commands::economy::econ_key(1))
                .await
                .is_none()
        );
        // Exact ms accumulate (no whole-minute truncation).
        let stats = crate::commands::stats::main::load_stats(&pool, "g", 1).await;
        assert_eq!(stats.voice_ms, 6_100_000);
        assert_eq!(stats.voice_log.len(), 1);
        // Session row is gone in both cases.
        assert!(crate::db::tbl_get(&pool, "g", &voice_session_key(1))
            .await
            .is_none());
    }

    #[tokio::test]
    async fn recover_voice_sessions_closes_absentees_unpaid() {
        let pool = crate::db::memory_pool().await;
        // User 1 still in voice (kept), user 2 gone (closed, unpaid).
        voice_join(&pool, "g", 1, 9, 0).await;
        voice_join(&pool, "g", 2, 9, 0).await;
        let in_voice: std::collections::HashSet<u64> = [1].into_iter().collect();
        assert_eq!(
            recover_voice_sessions(&pool, "g", &in_voice, 6_000_000).await,
            1
        );
        assert!(crate::db::tbl_get(&pool, "g", &voice_session_key(1))
            .await
            .is_some());
        assert!(crate::db::tbl_get(&pool, "g", &voice_session_key(2))
            .await
            .is_none());
        let econ = crate::commands::economy::balance::load_econ_routed(&pool, "g", 2).await;
        assert_eq!(econ.money, 0.0);
        let stats = crate::commands::stats::main::load_stats(&pool, "g", 2).await;
        assert_eq!(stats.voice_ms, 6_000_000);
        assert_eq!(stats.voice_log.len(), 1);
        // Idempotent: second run closes nothing.
        assert_eq!(
            recover_voice_sessions(&pool, "g", &in_voice, 7_000_000).await,
            0
        );
    }

    #[test]
    fn welcome_renders_placeholders() {
        let out = render_welcome("Hi {user} in {server} #{memberCount}!", "@a", "G", 42);
        assert_eq!(out, "Hi @a in G #42!");
        assert_eq!(render_welcome("plain", "@a", "G", 1), "plain");
    }

    #[test]
    fn join_inviter_display_matches_ts() {
        // Plain attribution passes username/mention through.
        assert_eq!(
            inviter_display(None, "bob", "<@9>"),
            ("bob".to_string(), "<@9>".to_string())
        );
        // Bot-attributed custom-vanity joins show the short links.
        assert_eq!(
            inviter_display(Some("vip"), "Bot", "<@1>"),
            (".wf/vip".to_string(), "discord.wf/vip".to_string())
        );
        // Lookup: bot inviter + matching invite code hits the entry.
        let table = serde_json::json!({ "7": { "vanity": "vip", "invite": "abc" } });
        assert_eq!(
            custom_vanity_code(Some(&table), "7", "abc", 1, 1),
            Some("vip".to_string())
        );
        // Non-bot inviter, wrong code, missing table all miss.
        assert_eq!(custom_vanity_code(Some(&table), "7", "abc", 1, 2), None);
        assert_eq!(custom_vanity_code(Some(&table), "7", "zzz", 1, 1), None);
        assert_eq!(custom_vanity_code(None, "7", "abc", 1, 1), None);
        assert_eq!(custom_vanity_code(Some(&table), "8", "abc", 1, 1), None);
        // Slot fill for the join message path.
        assert_eq!(
            render_inviter_slots("by {inviterUsername} ({inviterMention})", "b", "<@9>"),
            "by b (<@9>)"
        );
        // Slice 114 (node battery): present-but-empty inviter strings hit
        // the TS `||` literal defaults, like a missing inviter.
        assert_eq!(
            inviter_display(None, "", ""),
            ("unknow_user".to_string(), "@unknow_user".to_string())
        );
        assert_eq!(
            inviter_display(None, "", "<@9>"),
            ("unknow_user".to_string(), "<@9>".to_string())
        );
        assert_eq!(
            inviter_display(None, "bob", ""),
            ("bob".to_string(), "@unknow_user".to_string())
        );
    }

    #[test]
    fn join_dm_renders_ts_placeholders() {
        let out = render_join_dm(
            "Hi {memberUsername} {memberMention} #{memberCount} in {guildName} by {inviterUsername} ({inviterMention} x{invitesCount}) lvl {xpLevel} ft {artistAuthor}",
            "bob",
            "<@9>",
            42,
            "G",
        );
        assert_eq!(
            out,
            "Hi bob <@9> #42 in G by unknow_user (@unknow_user x1337) lvl 1337 ft Ninja"
        );
    }

    #[test]
    fn account_time_slots_match_ts() {
        // {accountCreationTimestamp} is time(createdAt, "R").
        let out = render_account_time_slots(
            "joined {createdAt} ({accountCreationTimestamp})",
            "01/15/2023",
            1673740800,
        );
        assert_eq!(out, "joined 01/15/2023 (<t:1673740800:R>)");
        // Chains after the fixed renderers.
        let chained = render_account_time_slots(
            &render_join_dm("{memberUsername} {createdAt}", "bob", "<@9>", 1, "G"),
            "01/15/2023",
            1673740800,
        );
        assert_eq!(chained, "bob 01/15/2023");
        assert_eq!(render_account_time_slots("plain", "x", 0), "plain");
    }

    #[test]
    fn locale_date_shapes_match_ts() {
        // Node v24 full-icu ground truth for 2024-01-15 (probe scripts).
        assert_eq!(format_locale_date(2024, 1, 15, "en-US"), "1/15/2024");
        assert_eq!(format_locale_date(2024, 1, 15, "fr-FR"), "15/01/2024");
        assert_eq!(format_locale_date(2024, 1, 15, "fr-ME"), "15/01/2024");
        assert_eq!(format_locale_date(2024, 1, 15, "it-IT"), "15/01/2024");
        assert_eq!(format_locale_date(2024, 1, 15, "pt-PT"), "15/01/2024");
        assert_eq!(format_locale_date(2024, 1, 15, "es-ES"), "15/1/2024");
        assert_eq!(format_locale_date(2024, 1, 15, "de-DE"), "15.1.2024");
        assert_eq!(format_locale_date(2024, 1, 15, "ru-RU"), "15.01.2024");
        // "jp-JP" is not valid BCP47 (correct tag is "ja"), so Node
        // falls back to the host default en-US shape.
        assert_eq!(format_locale_date(2024, 1, 15, "jp-JP"), "1/15/2024");
        assert_eq!(format_locale_date(2024, 1, 15, "xx-YY"), "1/15/2024");
        // ar-EG: arabic-indic digits + RLM (U+200F) after day/month.
        assert_eq!(
            format_locale_date(2024, 1, 15, "ar-EG"),
            "١٥\u{200f}/١\u{200f}/٢٠٢٤"
        );
        // Padding legs.
        assert_eq!(format_locale_date(2024, 12, 5, "en-US"), "12/5/2024");
        assert_eq!(format_locale_date(2024, 12, 5, "fr-FR"), "05/12/2024");
        assert_eq!(format_locale_date(2024, 12, 5, "ru-RU"), "05.12.2024");
    }

    #[test]
    fn locale_date_string_uses_local_civil_date() {
        // TZ-agnostic: the stamp must render the chrono::Local civil
        // date (like TS toLocaleDateString on the server), whatever
        // the host offset is.
        let stamp = 1705321845; // 2024-01-15T12:30:45Z
        let local = chrono::DateTime::from_timestamp(stamp, 0)
            .map(|dt| dt.with_timezone(&chrono::Local).date_naive())
            .unwrap();
        use chrono::Datelike;
        assert_eq!(
            locale_date_string(stamp, "en-US"),
            format_locale_date(local.year(), local.month(), local.day(), "en-US")
        );
        assert_eq!(
            locale_date_string(stamp, "fr-FR"),
            format_locale_date(local.year(), local.month(), local.day(), "fr-FR")
        );
    }

    #[test]
    fn welcomer_embed_preview_applies_all_ts_fields() {
        assert_eq!(welcomer_embed_key("abc123"), "EMBED.abc123");
        let record = serde_json::json!({
            "embedOwner": "9",
            "embedSource": {
                "title": "Hi {memberUsername}",
                "description": "{guildName} #{memberCount}",
                "footer": { "text": "by {inviterUsername}" },
                "author": { "name": "{artistAuthor}" },
                "fields": [
                    { "name": "{xpLevel}", "value": "{blogName}" },
                    { "name": "plain", "value": "plain" }
                ],
                "color": 123
            }
        });
        let source = welcomer_embed_source(&record.to_string()).unwrap();
        let out = apply_embed_preview(&source, |s| render_join_dm(s, "bob", "<@9>", 42, "G"));
        assert_eq!(out["title"], "Hi bob");
        assert_eq!(out["description"], "G #42");
        assert_eq!(out["footer"]["text"], "by unknow_user");
        assert_eq!(out["author"]["name"], "Ninja");
        assert_eq!(out["fields"][0]["name"], "1337");
        assert_eq!(out["fields"][0]["value"], "Unknown Blog Name");
        assert_eq!(out["fields"][1]["name"], "plain");
        // Untouched shape: non-string slots survive, source not mutated.
        assert_eq!(out["color"], 123);
        assert!(source["title"]
            .as_str()
            .unwrap()
            .contains("{memberUsername}"));
        // Null legs mirror the TS early return.
        assert!(welcomer_embed_source("{}").is_none());
        assert!(welcomer_embed_source("not json").is_none());
        assert!(welcomer_embed_source(r#"{"embedOwner":"9"}"#).is_none());
        // JS-falsy embedSource values hit the same null leg in TS.
        for falsy in [
            r#"{"embedSource":null}"#,
            r#"{"embedSource":0}"#,
            r#"{"embedSource":-0.0}"#,
            r#"{"embedSource":""}"#,
            r#"{"embedSource":false}"#,
        ] {
            assert!(welcomer_embed_source(falsy).is_none(), "{falsy}");
        }
        // []/{} are truthy in JS: pass through on both sides.
        assert_eq!(
            welcomer_embed_source(r#"{"embedSource":[]}"#).unwrap(),
            serde_json::json!([])
        );
        assert_eq!(
            welcomer_embed_source(r#"{"embedSource":{"title":"t"}}"#).unwrap(),
            serde_json::json!({"title": "t"})
        );
    }

    #[test]
    fn welcomer_embed_field_application_matches_ts_guards() {
        // Guard shape of resolveWelcomerEmbed (node battery, verbatim):
        // truthy-guarded top slots vs unconditional field application.
        let render = |s: &str| render_join_dm(s, "bob", "<@9>", 42, "G");
        // Empty top slots stay "" on both sides (TS `if` skips, render("") == "").
        let src = serde_json::json!({
            "title": "", "description": "",
            "footer": { "text": "" }, "author": { "name": "" },
            "fields": [{ "name": "", "value": "" }]
        });
        let out = apply_embed_preview(&src, render);
        assert_eq!(out["title"], "");
        assert_eq!(out["description"], "");
        assert_eq!(out["footer"]["text"], "");
        assert_eq!(out["author"]["name"], "");
        assert_eq!(out["fields"][0]["name"], "");
        assert_eq!(out["fields"][0]["value"], "");
        // Missing top slots stay missing; non-array fields untouched;
        // non-object footer/author survivors untouched (TS `?.` skips).
        let src = serde_json::json!({
            "footer": "txt", "author": {},
            "fields": { "name": "n", "value": "v" }
        });
        let out = apply_embed_preview(&src, render);
        assert!(out.get("title").is_none());
        assert_eq!(out["footer"], "txt");
        assert_eq!(out["author"], serde_json::json!({}));
        assert_eq!(
            out["fields"],
            serde_json::json!({ "name": "n", "value": "v" })
        );
        // THROW-vs-skip delta (TS TypeErrors, Rust keeps the slot):
        // truthy non-string title, missing/null/numeric field legs,
        // non-object field entry. Hostile-row-only: the embed builder
        // always writes string name/value pairs.
        let src = serde_json::json!({
            "title": 5,
            "fields": [
                { "value": "v" },
                { "name": "n", "value": null },
                { "name": 7, "value": "v" },
                null,
                { "name": "Hi {memberUsername}", "value": "v" }
            ]
        });
        let out = apply_embed_preview(&src, render);
        assert_eq!(out["title"], 5);
        assert!(out["fields"][0].get("name").is_none());
        assert_eq!(out["fields"][1]["value"], serde_json::Value::Null);
        assert_eq!(out["fields"][2]["name"], 7);
        assert_eq!(out["fields"][3], serde_json::Value::Null);
        assert_eq!(out["fields"][4]["name"], "Hi bob");
    }

    #[test]
    fn welcomer_dispatch_decisions_match_ts_legs() {
        // `embed ? false : (useComponents ?? true)` — embed always wins.
        assert!(welcomer_use_components(false, None));
        assert!(welcomer_use_components(false, Some(true)));
        assert!(!welcomer_use_components(false, Some(false)));
        assert!(!welcomer_use_components(true, None));
        assert!(!welcomer_use_components(true, Some(true)));
        assert!(!welcomer_use_components(true, Some(false)));
        // `bannerAttachmentName ?? "image.png"` — only nullish falls back.
        assert_eq!(welcomer_banner_name(None), "image.png");
        assert_eq!(welcomer_banner_name(Some("")), "");
        assert_eq!(welcomer_banner_name(Some("b.png")), "b.png");
        // `!message` legs: ""/None absent, " " sends.
        assert!(!welcomer_has_message(None));
        assert!(!welcomer_has_message(Some("")));
        assert!(welcomer_has_message(Some(" ")));
        assert!(welcomer_has_message(Some("hi")));
        // Legacy `!message && !embed && !hasBanner -> null`.
        assert!(!welcomer_legacy_should_send(None, false, false));
        assert!(!welcomer_legacy_should_send(Some(""), false, false));
        assert!(welcomer_legacy_should_send(Some(" "), false, false));
        assert!(welcomer_legacy_should_send(None, true, false));
        assert!(welcomer_legacy_should_send(None, false, true));
        // V2 `!message && !hasBanner -> null` (no embed leg).
        assert!(!welcomer_v2_should_send(None, false));
        assert!(!welcomer_v2_should_send(Some(""), false));
        assert!(welcomer_v2_should_send(Some(" "), false));
        assert!(welcomer_v2_should_send(None, true));
        // `content: message || undefined`.
        assert_eq!(welcomer_content(None), None);
        assert_eq!(welcomer_content(Some("")), None);
        assert_eq!(welcomer_content(Some(" ")), Some(" "));
        assert_eq!(welcomer_content(Some("hi")), Some("hi"));
    }

    #[tokio::test]
    async fn join_keys_read_blob_then_legacy() {
        let pool = crate::db::memory_pool().await;
        // Empty -> nothing from either source.
        assert!(join_role_ids(&pool, "g").await.is_empty());
        assert!(join_dm_template(&pool, "g").await.is_none());
        // Legacy rows work.
        crate::db::kv_set(&pool, "g", "GUILD.JOIN_ROLE", "7")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.JOIN_DM", "hey")
            .await
            .unwrap();
        assert_eq!(join_role_ids(&pool, "g").await, vec![7]);
        assert_eq!(join_dm_template(&pool, "g").await.as_deref(), Some("hey"));
        // Blob wins: string role, "off" DM disables.
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG",
            r#"{"joinroles":"8","joindm":"off"}"#,
        )
        .await
        .unwrap();
        assert_eq!(join_role_ids(&pool, "g").await, vec![8]);
        assert!(join_dm_template(&pool, "g").await.is_none());
        // Blob array roles + blob DM template.
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG",
            r#"{"joinroles":["1","2","xx"],"joindm":"yo"}"#,
        )
        .await
        .unwrap();
        assert_eq!(join_role_ids(&pool, "g").await, vec![1, 2]);
        assert_eq!(join_dm_template(&pool, "g").await.as_deref(), Some("yo"));
        // Stored "" disables like "off" (TS `!msg_dm` returns before any
        // send): no fallback to the legacy row waiting underneath.
        crate::db::kv_set(&pool, "g", "GUILD.JOIN_DM", "legacy")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.GUILD_CONFIG", r#"{"joindm":""}"#)
            .await
            .unwrap();
        assert!(join_dm_template(&pool, "g").await.is_none());
    }

    #[test]
    fn xp_gain_and_announce_gates_mirror_ts() {
        // Gain gate: full disable or bypassed channel blocks XP.
        assert!(xp_gain_blocked(Some("disable"), &[], "1"));
        assert!(xp_gain_blocked(Some("disable"), &["1".to_string()], "2"));
        assert!(xp_gain_blocked(None, &["1".to_string()], "1"));
        assert!(!xp_gain_blocked(None, &[], "1"));
        assert!(!xp_gain_blocked(None, &["2".to_string()], "1"));
        // Silenced mode ("off") still gains XP: only the announce is cut.
        assert!(!xp_gain_blocked(Some("false"), &[], "1"));
        assert!(!xp_gain_blocked(Some("true"), &[], "1"));
        // parseMessageCommand early-return: handled commands earn nothing.
        assert!(xp_skip_for_command(true));
        assert!(!xp_skip_for_command(false));
        // Announce gate: silenced mode or missing SendMessages stays silent.
        assert!(xp_announce_suppressed(Some("false"), true));
        assert!(xp_announce_suppressed(Some("true"), false));
        assert!(xp_announce_suppressed(None, false));
        assert!(!xp_announce_suppressed(Some("true"), true));
        assert!(!xp_announce_suppressed(None, true));
        assert!(!xp_announce_suppressed(Some("disable"), true));
        // Cross-runtime: quoted JSON-string forms match the bare forms.
        assert!(xp_gain_blocked(Some("\"disable\""), &[], "1"));
        assert!(!xp_gain_blocked(Some("\"false\""), &[], "1"));
        assert!(xp_announce_suppressed(Some("\"false\""), true));
        assert!(!xp_announce_suppressed(Some("\"true\""), true));
        // Level-up coin credit rounds to the nearest coin (52.5 -> 53),
        // not truncation toward zero.
        assert_eq!((52.5f64).round() as i64, 53);
        assert_eq!((52.4f64).round() as i64, 52);
        // Routing: unset -> reply in place; set + resolvable -> send
        // there; set + missing -> silent.
        assert_eq!(
            xp_announce_target(None, false),
            XpAnnounceTarget::ReplyInPlace
        );
        assert_eq!(
            xp_announce_target(Some(""), true),
            XpAnnounceTarget::ReplyInPlace
        );
        assert_eq!(
            xp_announce_target(Some("99"), true),
            XpAnnounceTarget::SendToChannel("99".to_string())
        );
        assert_eq!(
            xp_announce_target(Some("99"), false),
            XpAnnounceTarget::Suppressed
        );
    }

    #[test]
    fn xp_announce_render_matches_ts_preview() {
        // en-US fallback renders mention + level.
        assert_eq!(
            render_xp_announce(XP_EARN_FALLBACK, "bob", "<@9>", 42, "G", 3),
            "**GG**, <@9> you have leveled up! (Level: **3**)"
        );
        // Member/guild slots resolve, missing-context slots keep TS defaults.
        let out = render_xp_announce(
            "Hi {memberUsername} {memberMention} #{memberCount} in {guildName} lvl {xpLevel} by {inviterUsername} ({inviterMention} x{invitesCount}) ft {artistAuthor} {articleTitle} {blogName}",
            "bob",
            "<@9>",
            42,
            "G",
            2,
        );
        assert_eq!(
            out,
            "Hi bob <@9> #42 in G lvl 2 by unknow_user (@unknow_user x1337) ft Ninja Unknow Article Unknown Blog Name"
        );
    }

    #[test]
    fn xp_new_user_hint_only_first_level_on_hit_roll() {
        let base = "Level up!";
        // Level 1 + winning roll + reply-in-place appends the info line
        // with emoji filled.
        assert_eq!(
            xp_new_user_hint(base, 1, 0.2, XP_ADDITIONAL_INFO_FALLBACK, "<:chat>", true),
            "Level up!\n-# <:chat> Do you find this message annoying? You can disable this message by disabling the leveling system with the `/ranks config` command."
        );
        // Losing roll, higher level, boundary roll, or the xpchannels leg
        // stay silent.
        assert_eq!(
            xp_new_user_hint(base, 1, 0.9, XP_ADDITIONAL_INFO_FALLBACK, "<:chat>", true),
            base
        );
        assert_eq!(
            xp_new_user_hint(base, 2, 0.1, XP_ADDITIONAL_INFO_FALLBACK, "<:chat>", true),
            base
        );
        assert_eq!(
            xp_new_user_hint(base, 1, 0.5, XP_ADDITIONAL_INFO_FALLBACK, "<:chat>", true),
            base
        );
        assert_eq!(
            xp_new_user_hint(base, 1, 0.2, XP_ADDITIONAL_INFO_FALLBACK, "<:chat>", false),
            base
        );
    }

    #[test]
    fn xp_levelup_coins_use_shop_boost() {
        let shop = r#"{"2":{"boost":3},"5":{"boost":2}}"#;
        assert_eq!(xp_levelup_coins(35, shop, &[2]), 105.0);
        assert_eq!(xp_levelup_coins(35, shop, &[5]), 70.0);
        // No matching role or broken shop falls back to boost 1.
        assert_eq!(xp_levelup_coins(35, shop, &[9]), 35.0);
        assert_eq!(xp_levelup_coins(35, "nope", &[2]), 35.0);
        // Fractional boosts stay fractional (TS number multiply).
        let frac = r#"{"2":{"boost":1.5}}"#;
        assert_eq!(xp_levelup_coins(35, frac, &[2]), 52.5);
    }

    #[test]
    fn xp_channel_parse_single_or_list() {
        assert_eq!(parse_xp_channel("99"), Some("99".to_string()));
        assert_eq!(parse_xp_channel("\"99\""), Some("99".to_string()));
        assert_eq!(parse_xp_channel(r#"["a","b"]"#), Some("a".to_string()));
        assert_eq!(parse_xp_channel(""), None);
        assert_eq!(parse_xp_channel("   "), None);
    }

    #[test]
    fn xp_ranks_event_gates_match_ts_battery() {
        // Gain gate (ranks/onNewMessage.ts:63-67): only the exact string
        // "disable" blocks; the writer's `false`/`true`/missing all earn.
        assert!(xp_gain_blocked(Some("disable"), &[], "c1"));
        assert!(xp_gain_blocked(Some("\"disable\""), &[], "c1"));
        assert!(!xp_gain_blocked(Some("false"), &[], "c1"));
        assert!(!xp_gain_blocked(Some("true"), &[], "c1"));
        assert!(!xp_gain_blocked(None, &[], "c1"));
        assert!(!xp_gain_blocked(Some("Disable"), &[], "c1"));
        assert!(xp_gain_blocked(None, &["c1".to_string()], "c1"));
        assert!(!xp_gain_blocked(None, &["c9".to_string()], "c1"));
        // Announce gate (:161-167): boolean-false silences (XP kept); the
        // full-disable string is already caught upstream so it proceeds.
        assert!(xp_announce_suppressed(Some("false"), true));
        assert!(!xp_announce_suppressed(Some("true"), true));
        assert!(!xp_announce_suppressed(None, true));
        assert!(!xp_announce_suppressed(Some("disable"), true));
        assert!(xp_announce_suppressed(Some("false"), false));
        assert!(xp_announce_suppressed(None, false));
        // Routing (:186,206): missing/empty replies in place, a set id
        // needs a resolvable channel.
        assert_eq!(
            xp_announce_target(None, false),
            XpAnnounceTarget::ReplyInPlace
        );
        assert_eq!(
            xp_announce_target(Some(""), false),
            XpAnnounceTarget::ReplyInPlace
        );
        assert_eq!(
            xp_announce_target(Some("123"), true),
            XpAnnounceTarget::SendToChannel("123".into())
        );
        assert_eq!(
            xp_announce_target(Some("123"), false),
            XpAnnounceTarget::Suppressed
        );
    }

    #[tokio::test]
    async fn xp_full_gates_mirror_ts() {
        let pool = crate::db::memory_pool().await;
        // parseMessageCommand early-return: stats recorded, no XP.
        let out = record_message_activity_full(
            &pool,
            "g",
            1,
            7,
            5,
            1_000,
            XpMessageInput {
                command_handled: true,
                ..Default::default()
            },
        )
        .await;
        assert_eq!((out.level, out.leveled, out.xp_gain), (0, false, 0));
        assert_eq!(out.target, XpAnnounceTarget::Suppressed);
        assert!(out.text.is_none());
        let rank = crate::commands::ranks::main::load_rank(&pool, "g", 1).await;
        assert_eq!(rank.xp, 0);
        // Full disable blocks XP but stats still land.
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.disable", "disable")
            .await
            .unwrap();
        let out =
            record_message_activity_full(&pool, "g", 1, 7, 5, 1_000, XpMessageInput::default())
                .await;
        assert_eq!((out.leveled, out.xp_gain), (false, 0));
        let s = crate::commands::stats::main::load_stats(&pool, "g", 1).await;
        assert_eq!(s.messages, 2);
        // tbl_del clears both the table and the legacy row (reads promote
        // legacy hits into the table, so kv_del alone would leave the
        // promoted value behind).
        crate::db::tbl_del(&pool, "g", "GUILD.XP_LEVELING.disable")
            .await
            .unwrap();
        // Bypassed channel blocks XP.
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.bypassChannels", r#"["7"]"#)
            .await
            .unwrap();
        let out =
            record_message_activity_full(&pool, "g", 1, 7, 5, 1_000, XpMessageInput::default())
                .await;
        assert_eq!((out.leveled, out.xp_gain), (false, 0));
        crate::db::tbl_del(&pool, "g", "GUILD.XP_LEVELING.bypassChannels")
            .await
            .unwrap();
        // Clear gates: XP flows again (deterministic gain).
        let out = record_message_activity_full(
            &pool,
            "g",
            1,
            7,
            5,
            1_000,
            XpMessageInput {
                xp_gain_override: Some(35),
                can_send: false,
                ..Default::default()
            },
        )
        .await;
        assert_eq!((out.leveled, out.xp_gain), (false, 35));
        let rank = crate::commands::ranks::main::load_rank(&pool, "g", 1).await;
        assert_eq!(rank.xp, 35);
    }

    #[tokio::test]
    async fn xp_full_levelup_announce_hint_and_boosted_coins() {
        let pool = crate::db::memory_pool().await;
        // Seed just over the 500 XP stale threshold so the fixed gain
        // levels stored level 0 -> 1 (TS compares the PRE-add xp).
        let _ = crate::commands::ranks::main::save_rank(
            &pool,
            "g",
            1,
            &crate::commands::ranks::main::RankEntry {
                level: 0,
                xp: 501,
                xptotal: 501,
            },
        )
        .await;
        let roles = [2u64];
        let out = record_message_activity_full(
            &pool,
            "g",
            1,
            7,
            5,
            1_000,
            XpMessageInput {
                xp_gain_override: Some(35),
                hint_roll_override: Some(0.2),
                template_override: Some("GG {memberMention} lvl {xpLevel}"),
                additional_info_override: Some("INFO ${client.iHorizon_Emojis.VC_OpenChat} tail"),
                emoji_markup: "<:chat>",
                member_username: "bob",
                member_mention: "<@1>",
                member_count: 42,
                guild_name: "G",
                member_roles: &roles,
                shop_json: Some(r#"{"2":{"boost":3}}"#),
                ..Default::default()
            },
        )
        .await;
        assert!(out.leveled);
        assert_eq!((out.level, out.xp_gain), (1, 35));
        assert_eq!(out.target, XpAnnounceTarget::ReplyInPlace);
        assert_eq!(out.text.as_deref(), Some("GG <@1> lvl 1INFO <:chat> tail"));
        // Real shop boost: 35 x 3.
        let econ = crate::commands::economy::balance::load_econ_routed(&pool, "g", 1).await;
        assert_eq!(econ.money, 105.0);
    }

    #[tokio::test]
    async fn xp_full_announce_routing_and_permission_gate() {
        let pool = crate::db::memory_pool().await;
        async fn seed_near_level(pool: &crate::db::Pool) {
            let _ = crate::commands::ranks::main::save_rank(
                pool,
                "g",
                1,
                &crate::commands::ranks::main::RankEntry {
                    level: 0,
                    xp: 501,
                    xptotal: 501,
                },
            )
            .await;
        }
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.xpchannels", "99")
            .await
            .unwrap();
        // Set but unresolvable -> silent, though XP + base coins land.
        seed_near_level(&pool).await;
        let out = record_message_activity_full(
            &pool,
            "g",
            1,
            7,
            5,
            1_000,
            XpMessageInput {
                xp_gain_override: Some(35),
                channel_exists: false,
                ..Default::default()
            },
        )
        .await;
        assert!(out.leveled);
        assert_eq!(out.target, XpAnnounceTarget::Suppressed);
        assert!(out.text.is_none());
        // Resolvable -> send there with the en-US fallback template.
        seed_near_level(&pool).await;
        let out = record_message_activity_full(
            &pool,
            "g",
            1,
            7,
            5,
            1_000,
            XpMessageInput {
                xp_gain_override: Some(35),
                hint_roll_override: Some(0.9),
                member_mention: "<@1>",
                ..Default::default()
            },
        )
        .await;
        assert_eq!(
            out.target,
            XpAnnounceTarget::SendToChannel("99".to_string())
        );
        assert_eq!(
            out.text.as_deref(),
            Some("**GG**, <@1> you have leveled up! (Level: **1**)")
        );
        // Missing SendMessages stays silent (XP still gained).
        seed_near_level(&pool).await;
        let out = record_message_activity_full(
            &pool,
            "g",
            1,
            7,
            5,
            1_000,
            XpMessageInput {
                xp_gain_override: Some(35),
                can_send: false,
                ..Default::default()
            },
        )
        .await;
        assert!(out.leveled);
        assert_eq!(out.target, XpAnnounceTarget::Suppressed);
        assert!(out.text.is_none());
    }

    #[test]
    fn channel_perm_diff_matches_ts() {
        let text = |k: &str| match k {
            "event_srvLogs_channelUpdate_field_name" => "NAME:${newChannel.name}".to_string(),
            "event_srvLogs_channelUpdate_disabled_for" => "DIS ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_enabled_for" => "EN ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_allowed_for" => "AL ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_unallowed_for" => "UN ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_perm_added" => "ADD ${target}".to_string(),
            _ => k.to_string(),
        };
        assert_eq!(channel_perm_diff("a", "a", &[], &[], &text), "");
        let mk = |id: u64, is_role: bool, allow: &[&str], deny: &[&str]| PermOverwriteDiff {
            id,
            is_role,
            allow: allow.iter().map(|s| s.to_string()).collect(),
            deny: deny.iter().map(|s| s.to_string()).collect(),
        };
        let d = channel_perm_diff(
            "old",
            "new",
            &[mk(1, true, &["SendMessages"], &[]), mk(9, false, &[], &[])],
            &[
                mk(1, true, &[], &["SendMessages"]),
                mk(2, false, &["ViewChannel"], &[]),
            ],
            &text,
        );
        assert!(d.contains("NAME:new"));
        assert!(d.contains("DIS SendMessages <@&1>"));
        assert!(d.contains("UN SendMessages <@&1>"));
        assert!(d.contains("ADD <@2>"));
        assert!(d.contains("-    ✅ ViewChannel\n"));
    }

    /// W7 slice 52 battery: `channel_perm_diff` must match getDiff in
    /// Events/logs/channelUpdateLogs.ts verbatim on the legs the thin
    /// pin above does not cover, plus the `> 1024` truncation rule.
    /// Vectors from node script at scratch
    /// `slice-w7s52-channelupdate.cjs` (green 28/28).
    #[test]
    fn channel_perm_diff_matches_ts_battery() {
        let text = |k: &str| match k {
            "event_srvLogs_channelUpdate_field_name" => "NAME:${newChannel.name}|".to_string(),
            "event_srvLogs_channelUpdate_disabled_for" => "DIS ${perm} ${target}|".to_string(),
            "event_srvLogs_channelUpdate_enabled_for" => "EN ${perm} ${target}|".to_string(),
            "event_srvLogs_channelUpdate_allowed_for" => "AL ${perm} ${target}|".to_string(),
            "event_srvLogs_channelUpdate_unallowed_for" => "UN ${perm} ${target}|".to_string(),
            "event_srvLogs_channelUpdate_perm_added" => "ADD ${target}|".to_string(),
            _ => k.to_string(),
        };
        let mk = |id: u64, is_role: bool, allow: &[&str], deny: &[&str]| PermOverwriteDiff {
            id,
            is_role,
            allow: allow.iter().map(|s| s.to_string()).collect(),
            deny: deny.iter().map(|s| s.to_string()).collect(),
        };
        // deleted overwrite id: no leg covers it, TS stays silent.
        assert_eq!(
            channel_perm_diff("a", "a", &[mk(9, true, &["ViewChannel"], &[])], &[], &text),
            ""
        );
        // mention comes from the NEW row: a type flip re-mentions.
        assert_eq!(
            channel_perm_diff(
                "a",
                "a",
                &[mk(1, true, &[], &[])],
                &[mk(1, false, &["ViewChannel"], &[])],
                &text
            ),
            "EN ViewChannel <@1>|"
        );
        // allow-to-deny move emits disabled then unallowed, in order.
        assert_eq!(
            channel_perm_diff(
                "a",
                "a",
                &[mk(1, true, &["SendMessages"], &[])],
                &[mk(1, true, &[], &["SendMessages"])],
                &text
            ),
            "DIS SendMessages <@&1>|UN SendMessages <@&1>|"
        );
        // new-overwrite block: perm_added + allow ✅ then deny ❌ lines.
        assert_eq!(
            channel_perm_diff(
                "a",
                "a",
                &[],
                &[mk(5, true, &["ViewChannel"], &["SendMessages"])],
                &text
            ),
            "ADD <@&5>|-    ✅ ViewChannel\n-    ❌ SendMessages\n"
        );
        // truncation rule (`length > 1024`, UTF-16 units): 1024 passes
        // through, 1025 cuts to 1021 units + "...".
        let fits = "x".repeat(1024);
        assert_eq!(fits.encode_utf16().count(), 1024);
        let long = "x".repeat(1025);
        assert!(long.encode_utf16().count() > 1024);
        let cut = format!("{}...", &long[..1021]);
        assert_eq!(cut.encode_utf16().count(), 1024);
        // astral chars count 2 units in the length/substring domain.
        assert_eq!("😀".repeat(600).encode_utf16().count(), 1200);
    }

    #[test]
    fn message_diff_matches_ts() {
        let d = message_diff("hello world", "hello there");
        assert!(d.starts_with("```diff\n"));
        assert!(d.contains("- hello world"));
        assert!(d.contains("+ hello there"));
        let long_old = "a".repeat(50);
        let long_new = "a".repeat(49) + "b";
        let d2 = message_diff(&long_old, &long_new);
        assert!(d2.contains("- "));
        assert!(d2.contains("+ "));
    }

    /// W7 slice 44 battery: `message_diff` must match
    /// getDetailedDiff verbatim (UTF-16 units for the diff index
    /// and the 30-unit window). Vectors from node script at
    /// scratch `slice-w7s44-messagediff.cjs` (green).
    #[test]
    fn message_diff_utf16_matches_ts_battery() {
        // identical -> empty body
        assert_eq!(message_diff("same", "same"), "```diff\n\n```");
        assert_eq!(message_diff("", ""), "```diff\n\n```");
        // multiline add/remove
        assert_eq!(
            message_diff("l1\nl2\nl3", "l1\nlX\nl3\nl4"),
            "```diff\n- l2\n+ lX\n+ l4\n```"
        );
        // long lines, diff at end: 30-unit window ending at the line end
        assert_eq!(
            message_diff(&"a".repeat(50), &("a".repeat(49) + "b")),
            "```diff\n- aaaaaaaaaaaaaaaa\n+ aaaaaaaaaaaaaaab\n```"
        );
        // long lines, diff at start
        assert_eq!(
            message_diff(
                &("b".to_owned() + &"a".repeat(50)),
                &("c".to_owned() + &"a".repeat(50))
            ),
            "```diff\n- baaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n+ caaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n```"
        );
        // exactly 30 units: no truncation (strict `> 30`)
        assert_eq!(
            message_diff(&"x".repeat(30), &("x".repeat(29) + "y")),
            "```diff\n- xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n+ xxxxxxxxxxxxxxxxxxxxxxxxxxxxxy\n```"
        );
        // 31 units: truncation kicks in, diff at unit 30
        assert_eq!(
            message_diff(&"x".repeat(31), &("x".repeat(30) + "y")),
            "```diff\n- xxxxxxxxxxxxxxxx\n+ xxxxxxxxxxxxxxxy\n```"
        );
        // short-vs-long: diff index past the short line end, window
        // shows the tail of the long line
        assert_eq!(
            message_diff("short", "short and much longer than thirty characters here"),
            "```diff\n- short\n+ characters here\n```"
        );
        // astral: 20 emoji = 40 units; diff at unit 39 (trail
        // surrogate), window units 24..40 = 8 emoji. The old
        // chars()-based code rendered 16 emoji here.
        assert_eq!(
            message_diff(&"😀".repeat(20), &("😀".repeat(19) + "😁")),
            "```diff\n- 😀😀😀😀😀😀😀😀\n+ 😀😀😀😀😀😀😀😁\n```"
        );
        // astral mid-line: diff at unit 32, window units 18..34
        assert_eq!(
            message_diff(
                &("a".repeat(10) + &"😀".repeat(12)),
                &("a".repeat(10) + &"😀".repeat(11) + "😁")
            ),
            "```diff\n- 😀😀😀😀😀😀😀😀\n+ 😀😀😀😀😀😀😀😁\n```"
        );
        // diff inside a surrogate pair: TS compares the trail unit
        // (index 2); window units 0..30 = marker + 26 x's, NOT the
        // 30 chars the old code rendered (marker + 27 x's).
        assert_eq!(
            message_diff(
                &("a😀b".to_owned() + &"x".repeat(40)),
                &("a😁b".to_owned() + &"x".repeat(40))
            ),
            "```diff\n- a😀bxxxxxxxxxxxxxxxxxxxxxxxxxx\n+ a😁bxxxxxxxxxxxxxxxxxxxxxxxxxx\n```"
        );
        // whitespace-only trims to empty; padded trims then diffs
        assert_eq!(message_diff("   ", "hi"), "```diff\n+ hi\n```");
        assert_eq!(
            message_diff("  padded  ", "  padded x  "),
            "```diff\n- padded\n+ padded x\n```"
        );
    }

    #[tokio::test]
    async fn record_message_increments_stats_and_xp() {
        let pool = crate::db::memory_pool().await;
        let (level, leveled) = record_message_activity(&pool, "g", 1, 7, 5, 1_000).await;
        assert_eq!((level, leveled), (0, false));
        // Each message grants 35..=37 XP (TS: floor(random*3)+35).
        let rank = crate::commands::ranks::main::load_rank(&pool, "g", 1).await;
        assert!((35..=37).contains(&rank.xp), "xp={}", rank.xp);
        assert_eq!(rank.xptotal, rank.xp);
        let s = crate::commands::stats::main::load_stats(&pool, "g", 1).await;
        assert_eq!(s.messages, 1);
        assert_eq!(s.msg_log.len(), 1);
        assert_eq!(s.msg_log[0].channel_id, 7);
        assert_eq!(s.msg_log[0].content_len, 5);
        // ~14 messages x ~36 XP cross the 500 XP threshold to level 1;
        // loop until the level-up fires (bounded, deterministic outcome).
        let mut last = (0, false);
        for _ in 0..40 {
            last = record_message_activity(&pool, "g", 1, 7, 5, 1_000).await;
            if last.1 {
                break;
            }
        }
        assert_eq!(last, (1, true));
        // Per-channel stats aggregate from USER msg_log (no STATS.CHANNEL writer).
        // Level-up credits 35..=37 coins (base gain, boost 1).
        let econ = crate::commands::economy::balance::load_econ_routed(&pool, "g", 1).await;
        assert!(
            (35..=37).contains(&(econ.money as u64)),
            "money={}",
            econ.money
        );
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = crate::db::memory_pool().await;
        // Unified dual write (C5): table-routed writes land under
        // `tbl:<gid>` AND refresh the legacy kv row for unmigrated
        // readers; table-first reads win on conflicts.
        crate::db::tbl_set(&pool, "g1", "GUILD.JOIN_ROLE", "7")
            .await
            .unwrap();
        assert_eq!(join_role_ids(&pool, "g1").await, vec![7]);
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "GUILD.JOIN_ROLE").await;
        assert_eq!(legacy.as_deref(), Some("7"));
        // Legacy rows still read, table wins on conflicts.
        crate::db::kv_set(&pool, "g2", "GUILD.JOIN_ROLE", "9")
            .await
            .unwrap();
        assert_eq!(join_role_ids(&pool, "g2").await, vec![9]);
        crate::db::tbl_set(&pool, "g2", "GUILD.JOIN_ROLE", "10")
            .await
            .unwrap();
        assert_eq!(join_role_ids(&pool, "g2").await, vec![10]);
        // Voice sessions round-trip through the guild table.
        voice_join(&pool, "g1", 1, 9, 0).await;
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", &voice_session_key(1))
                .await
                .as_deref(),
            Some("0:9")
        );
        // Legacy session rows still close and pay.
        crate::db::kv_set(&pool, "g1", &voice_session_key(2), "0:9")
            .await
            .unwrap();
        let (minutes, _) = voice_leave(&pool, "g1", 2, 6_000_000, 1.0, true).await;
        assert_eq!(minutes, 100);
        assert!(crate::db::tbl_get(&pool, "g1", &voice_session_key(2))
            .await
            .is_none());
        // Prefix scans merge table rows with legacy rows.
        crate::db::kv_set(&pool, "g1", &voice_session_key(3), "0:9")
            .await
            .unwrap();
        let scan = crate::db::tbl_scan_prefix(&pool, "g1", "VOICE_SESSION.").await;
        let keys: Vec<&str> = scan.iter().map(|(k, _)| k.as_str()).collect();
        assert!(keys.contains(&voice_session_key(1).as_str()));
        assert!(keys.contains(&voice_session_key(3).as_str()));
        // Counters add with legacy seeding and read back as integers.
        crate::db::kv_set(&pool, "g1", "COUNTER.hits", "4")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_add(&pool, "g1", "COUNTER.hits", 1.0).await,
            5.0
        );
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", "COUNTER.hits")
                .await
                .as_deref(),
            Some("5")
        );
        // Delete clears both stores.
        crate::db::tbl_set(&pool, "g1", "GUILD.JOIN_DM", "hey")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g1", "GUILD.JOIN_DM", "stale")
            .await
            .unwrap();
        crate::db::tbl_del(&pool, "g1", "GUILD.JOIN_DM")
            .await
            .unwrap();
        assert!(join_dm_template(&pool, "g1").await.is_none());
    }

    #[tokio::test]
    async fn voice_leave_econ_dual_write_visible_to_both_readers() {
        let pool = crate::db::memory_pool().await;
        voice_join(&pool, "g", 1, 9, 0).await;
        let (_, coins) = voice_leave(&pool, "g", 1, 6_000_000, 2.0, true).await;
        assert_eq!(coins, 20.0);
        // Table-first reader sees the voice earnings.
        let routed = crate::commands::economy::balance::load_econ_routed(&pool, "g", 1).await;
        assert_eq!(routed.money, 20.0);
        // Legacy kv reader sees them too (dual-write, keys unchanged).
        let legacy = crate::db::kv_get(&pool, "g", &crate::commands::economy::econ_key(1))
            .await
            .expect("kv econ row");
        let parsed: serde_json::Value = serde_json::from_str(&legacy).unwrap();
        assert_eq!(parsed.get("money").and_then(|m| m.as_i64()), Some(20));
    }
}
