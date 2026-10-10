// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Serenity event handler. Mirrors src/Events/** dispatch (95 files) +
// src/core/handlers/loadEvent.ts binding.
//
// Strategy: best-effort, never panic. Every DB access is optional-chained;
// failures are traced, never propagated. Pure decisions live in events.rs
// / voice.rs (unit-tested); this file only does Discord + KV I/O.

use crate::db::Pool;
use poise::serenity_prelude as serenity;
use poise::serenity_prelude::Mentionable;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

/// Invite uses cache: guild -> code -> (uses, inviter).
type InviteCache = HashMap<String, HashMap<String, (u64, u64)>>;

/// One live invite snapshot for join attribution (code, uses, inviter).
/// Pure data so concurrent joins can share one fetch.
#[derive(Debug, Clone)]
pub(crate) struct InviteSnap {
    code: String,
    uses: u64,
    inviter_id: u64,
    inviter_name: String,
}

/// In-flight invite-fetch dedup: guild -> shared live snapshot.
/// Mirrors pendingInviteFetch in Events/guildconfig/joinMessage.ts
/// (concurrent joins share one fetch; the entry is dropped ~1500ms
/// after settle so the next burst re-fetches fresh uses). None means
/// the Discord fetch failed (mirrors a rejected promise: no
/// attribution, and the entry is dropped at once so the next join
/// retries instead of reusing the miss).
type PendingInviteFetch = HashMap<String, Arc<tokio::sync::OnceCell<Option<Vec<InviteSnap>>>>>;

/// Invite-seed permission gate. Mirrors the ready-burst fetchInvites
/// gate (`ManageGuild` + `ViewAuditLog`, both required: discord.js
/// `.has([A, B])` is an AND): an invite fetch without both bits 403s
/// the same way. The guild_create join leg applies the same pair —
/// the TS join leg checks ViewAuditLog only, but the fetch needs both.
/// Guild owners bypass (their fetch cannot 403 on perms); a payload
/// without our member row keeps the best-effort fetch (403s ignored).
pub fn invite_seed_allowed(is_owner: bool, view_audit_log: bool, manage_guild: bool) -> bool {
    is_owner || (view_audit_log && manage_guild)
}

// tbl_* routing lives in crate::db (single home, C5); the forks that
// lived here are deleted and call sites below use `crate::db::tbl_*`.

/// Leaf routed read: table handle first, legacy kv fallback (keys
/// unchanged). Thin wrapper over the shared routed primitive so each
/// emitter leaf below has a named loader.
async fn leaf_routed(pool: &crate::db::Pool, gid: &str, key: &str) -> Option<String> {
    crate::commands::owner::main::routed_get(pool, gid, gid, key).await
}

/// GUILD.GUILD_CONFIG blob, table-routed (keys unchanged).
async fn guild_config_routed(pool: &crate::db::Pool, gid: &str) -> serde_json::Value {
    crate::commands::shared::load_guild_config(pool, gid).await
}

/// One GUILD.GUILD_CONFIG.<field> leaf (e.g. antipub, hey_reaction).
async fn guild_config_field_routed(
    pool: &crate::db::Pool,
    gid: &str,
    field: &str,
) -> Option<String> {
    leaf_routed(pool, gid, &format!("GUILD.GUILD_CONFIG.{field}")).await
}

/// GUILD.RANK_ROLES.roles single-role leaf (raw role-id string).
async fn rank_role_single_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.RANK_ROLES.roles").await
}

/// GUILD.RANK_ROLES.nicknames leaf (raw matcher string).
async fn rank_nicknames_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.RANK_ROLES.nicknames").await
}

/// GUILD.XP_LEVELING.xpchannels leaf (legacy GUILD.RANKS.channel single /
/// GUILD.RANKS.xpChannels list promote into the new key).
async fn ranks_xp_channels_routed(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    let raw = crate::commands::ranks::migrated_get(
        pool,
        gid,
        crate::commands::ranks::GUILD_XPCHANNEL_NEW,
        &[
            crate::commands::ranks::GUILD_XPCHANNEL_OLD_SINGLE,
            crate::commands::ranks::GUILD_XPCHANNEL_OLD_LIST,
        ],
    )
    .await;
    match raw {
        None => Vec::new(),
        Some(s) => {
            if let Ok(list) = serde_json::from_str::<Vec<String>>(&s) {
                list
            } else {
                let id = crate::commands::owner::main::decode_stored_string(&s);
                if id.is_empty() {
                    Vec::new()
                } else {
                    vec![id]
                }
            }
        }
    }
}

/// GUILD.XP_LEVELING.message leaf (level-up template, legacy
/// GUILD.RANKS.message promotes into the new key).
async fn ranks_message_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    crate::commands::ranks::migrated_get(
        pool,
        gid,
        crate::commands::ranks::GUILD_MESSAGE_NEW,
        &[crate::commands::ranks::GUILD_MESSAGE_OLD],
    )
    .await
}

/// COUNTER.channel leaf.
async fn counter_channel_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "COUNTER.channel").await
}

/// COUNTER.config leaf.
async fn counter_config_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "COUNTER.config").await
}

/// COUNTER_DATA leaf.
async fn counter_data_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "COUNTER_DATA").await
}

/// SUGGEST.channel leaf.
async fn suggest_channel_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    crate::commands::suggestion::load_suggest_string(pool, gid, "SUGGEST.channel").await
}

/// SUGGEST.disable leaf, true on "1".
async fn suggest_disabled_routed(pool: &crate::db::Pool, gid: &str) -> bool {
    crate::commands::suggestion::load_suggest_string(pool, gid, "SUGGEST.disable")
        .await
        .as_deref()
        == Some("1")
}

/// GUILD.VOICE_INTERFACE.voice_channel lobby leaf.
async fn voice_lobby_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.VOICE_INTERFACE.voice_channel").await
}

/// VOICE_INTERFACE.voice_channel_name template leaf.
async fn voice_name_tpl_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "VOICE_INTERFACE.voice_channel_name")
        .await
        .filter(|t| !t.trim().is_empty())
}

/// Legacy dashboard button id -> tempvoice action suffix. Mirrors the
/// `customId` values of the buttonRows in
/// voicedashboard/!set-text-channel.ts (`temporary_voice_<action>_button`,
/// 11 live buttons). Disabled spacer buttons
/// (`temporary_voice_disable*_button`) and unknown ids map to None.
pub fn legacy_tempvoice_action(id: &str) -> Option<&'static str> {
    match id {
        "temporary_voice_limit_button" => Some("limit"),
        "temporary_voice_name_button" => Some("name"),
        "temporary_voice_claim_button" => Some("claim"),
        "temporary_voice_privacy_button" => Some("privacy"),
        "temporary_voice_region_button" => Some("region"),
        "temporary_voice_trust_button" => Some("trust"),
        "temporary_voice_block_button" => Some("block"),
        "temporary_voice_transfer_button" => Some("transfer"),
        "temporary_voice_unblock_button" => Some("unblock"),
        "temporary_voice_untrust_button" => Some("untrust"),
        "temporary_voice_delete_button" => Some("delete"),
        _ => None,
    }
}

/// Allow set for staff roles on lobby-spawned temp channels. Mirrors the
/// staff permissionOverwrites.edit block in
/// Events/voicedashboard/voiceState.ts (join + moderate rights).
pub fn staff_voice_allow() -> serenity::Permissions {
    use serenity::Permissions as P;
    P::VIEW_CHANNEL
        | P::CONNECT
        | P::STREAM
        | P::SPEAK
        | P::SEND_MESSAGES
        | P::USE_APPLICATION_COMMANDS
        | P::ATTACH_FILES
        | P::ADD_REACTIONS
        | P::MUTE_MEMBERS
        | P::DEAFEN_MEMBERS
        | P::PRIORITY_SPEAKER
        | P::KICK_MEMBERS
}

/// CUSTOM_VOICE.<gid>.<uid> rows as (key, channel_id), table-first
/// with legacy fallback (keys unchanged).
/// Placement verdict (M5): TS owns these rows in the global `temp`
/// table (`tempTable` in Events/client/ready.ts, voicedashboard/
/// voiceState.ts); the guild-scope read above is the established Rust
/// path and the temp scope is covered by load_temp_voice_channel in
/// events.rs. Keep this dual placement as-is — do NOT move rows
/// between tables without lead sign-off (live prod rows exist under
/// both scopes).
async fn custom_voice_rows_routed(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    crate::db::tbl_scan_prefix(pool, gid, "CUSTOM_VOICE.")
        .await
        .into_iter()
        .filter(|(k, _)| k["CUSTOM_VOICE.".len()..].contains('.'))
        .collect()
}

/// PROTECTION.<rule> allow flag leaf. Absent rows mean allowed (open
/// by default, mirrors the guard).
async fn protection_rule_routed(
    pool: &crate::db::Pool,
    gid: &str,
    rule: &str,
) -> Option<crate::commands::protection::protect::RuleState> {
    leaf_routed(pool, gid, &format!("PROTECTION.{rule}"))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

/// PROTECTION.SANCTION leaf ("ban" default at the call site).
async fn protection_sanction_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "PROTECTION.SANCTION").await
}

/// GUILD.OWNER.<uid> leaf (owner entries).
async fn owner_entry_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Option<String> {
    leaf_routed(pool, gid, &format!("GUILD.OWNER.{user_id}")).await
}

/// True when the executor holds an owner row. Mirrors the TS
/// `${gid}.OWNER.${uid}` read (top-level key); the GUILD.OWNER.*
/// shape stays as a fallback.
async fn owner_exempt_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> bool {
    leaf_routed(pool, gid, &format!("OWNER.{user_id}"))
        .await
        .is_some()
        || owner_entry_routed(pool, gid, user_id).await.is_some()
}

/// ALLOWLIST.list.<uid> leaf.
async fn allowlist_entry_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Option<String> {
    leaf_routed(pool, gid, &format!("ALLOWLIST.list.{user_id}")).await
}

/// True once any ALLOWLIST.list.* entry exists (lazy-seed gate).
async fn allowlist_seeded_routed(pool: &crate::db::Pool, gid: &str) -> bool {
    !crate::commands::protection::protect::load_allowlist(pool, gid)
        .await
        .is_empty()
}

/// True when the executor is derogated (exempt from protection
/// sanctions). Mirrors the GUILD.UTILS.DEROGATION list check.
async fn derogated_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> bool {
    leaf_routed(pool, gid, "GUILD.UTILS.DEROGATION")
        .await
        .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
        .map(|list| list.contains(&user_id.to_string()))
        .unwrap_or(false)
}

/// Rebuild + persist the protection structure snapshot for one guild.
/// Shared by the guild_create seed and the 60s refresh sweep (audit
/// P1). Mirrors backupGuildStructure in protection/ready.ts.
async fn seed_protection_snapshot(pool: &crate::db::Pool, guild: &serenity::Guild) {
    use crate::commands::protection::backup::{BackupRole, RawChannel};
    let raws: Vec<RawChannel> = guild.channels.values().map(RawChannel::from).collect();
    let roles: Vec<BackupRole> = guild
        .roles
        .keys()
        .map(|id| {
            let members: Vec<String> = guild
                .members
                .values()
                .filter(|m| m.roles.contains(id))
                .map(|m| m.user.id.get().to_string())
                .collect();
            BackupRole {
                id: id.get().to_string(),
                members,
            }
        })
        .collect();
    let backup = crate::commands::protection::backup::build_backup(&raws, roles);
    let _ = crate::commands::protection::backup::save_backup(
        pool,
        &guild.id.get().to_string(),
        &backup,
    )
    .await;
}

/// GUILD.PUNISH.PUNISH_PUB leaf (raw JSON blob string).
async fn punish_pub_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.PUNISH.PUNISH_PUB").await
}

/// PUNISH_DATA.<gid>.<uid> leaf (raw JSON blob string).
/// Backing parity with blockSpam.ts re-verified against
/// Events/client/ready.ts:88 (`tempTable = await db.table("temp")`),
/// core/database/index.ts:43 (`"temp"` in `tables`) + :146 (5-minute
/// `syncToPostgres` tick), and ready.ts:178 (boot-time
/// `tempTable.deleteAll()` commented out) — so flag rows survive
/// restarts. The persistent tbl row here is parity, not a divergence;
/// the `PUNISH_DATA.{gid}.{uid}` key shape is frozen on purpose (prod
/// rows already use it, and the guild table already scopes by gid).
async fn punish_data_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Option<String> {
    leaf_routed(pool, gid, &format!("PUNISH_DATA.{gid}.{user_id}")).await
}

/// GUILD.AUTOMOD.<kind> flag leaf, true on "1".
async fn automod_flag_routed(pool: &crate::db::Pool, gid: &str, kind: &str) -> bool {
    leaf_routed(pool, gid, &crate::commands::guildconfig::automod_key(kind))
        .await
        .as_deref()
        == Some("1")
}

/// GUILD.LANG leaf.
async fn guild_lang_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    // C1/C2: kv GUILD.LANG is the single source (TS getLanguageData).
    // Table rows are legacy and must never shadow it here; blank ==
    // unset so the guild_create setLangByRegion default still fires.
    crate::db::kv_get(pool, gid, crate::db::GUILD_LANG_KEY)
        .await
        .filter(|s| !s.trim().is_empty())
}

/// GUILD.BLOCK_BOT flag leaf. Accepts the Rust "1" write and the TS
/// legacy boolean ("true") / deleted-key shapes via
/// [`crate::commands::guildconfig::blockbot::blockbot_enabled_value`].
async fn block_bot_routed(pool: &crate::db::Pool, gid: &str) -> bool {
    crate::commands::guildconfig::blockbot::blockbot_enabled_value(
        leaf_routed(pool, gid, "GUILD.BLOCK_BOT").await.as_deref(),
    )
}

/// GUILD.BLOCK_NEW_ACCOUNT leaf (raw JSON blob string).
async fn block_new_account_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.BLOCK_NEW_ACCOUNT").await
}

/// UTILS.NICK_KICKER leaf (raw JSON blob string).
async fn nick_kicker_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.NICK_KICKER").await
}

/// Global api.VANITY table (scope "0"), parsed.
async fn vanity_table_routed(pool: &crate::db::Pool) -> Option<serde_json::Value> {
    leaf_routed(pool, "0", "api.VANITY")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

/// ROLE_SAVER.<uid> leaf (raw role-id JSON array string).
async fn rolesaver_row_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Option<String> {
    leaf_routed(pool, gid, &format!("ROLE_SAVER.{user_id}")).await
}

/// SECURITY leaf (raw JSON blob string).
async fn security_cfg_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "SECURITY").await
}

/// USER.<uid>.INVITES.BY leaf (raw inviter-id string).
async fn invites_by_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Option<String> {
    leaf_routed(pool, gid, &format!("USER.{user_id}.INVITES.BY")).await
}

/// UTILS.picOnly leaf (raw JSON string-list).
async fn pic_only_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.picOnly").await
}

/// UTILS.picOnlyConfig leaf (raw JSON blob: threshold/muteTime/createThread).
async fn pic_only_config_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.picOnlyConfig").await
}

/// Pic-only media allowlist. Mirrors the `validMediaTypes` array in
/// Events/utils/picOnlyModule.ts (compared case-insensitively).
pub const PICONLY_MEDIA_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "video/x-matroska",
    "video/mp4",
    "video/webm",
    "video/quicktime",
];

/// True when any attachment content type is on the pic-only allowlist.
/// Pure half of the picOnlyModule.ts `hasValidMediaAttachment` check
/// (case-insensitive, missing type never matches).
pub fn pic_only_has_media(content_types: &[Option<String>]) -> bool {
    content_types.iter().any(|ct| {
        ct.as_deref()
            .map(|c| PICONLY_MEDIA_TYPES.contains(&c.to_lowercase().as_str()))
            .unwrap_or(false)
    })
}

/// Pic-only warn window. Mirrors `cleanOldWarnings` (10 minutes).
pub const PICONLY_WARN_WINDOW_MS: i64 = 10 * 60 * 1000;

/// Strike count that triggers the pic-only timeout. Mirrors the
/// hardcoded `if (userWarnings.length >= 3)` in picOnlyModule.ts
/// (the configured threshold only feeds the warn-DM text).
pub const PICONLY_STRIKE_LIMIT: usize = 3;

/// Drop warn timestamps older than the pic-only window (unix ms).
pub fn pic_only_recent_warns(warns: &[i64], now_ms: i64) -> Vec<i64> {
    warns
        .iter()
        .copied()
        .filter(|t| now_ms.saturating_sub(*t) < PICONLY_WARN_WINDOW_MS)
        .collect()
}

/// Role-limit counter name. Mirrors the roleLimit.ts rename leg:
/// strip a trailing ` [n/m]` counter (TS `/\s*\[\d+\/\d+\]\s*$/`)
/// then append the fresh `[members/limit]`.
pub fn role_limit_counter_name(current: &str, members: usize, limit: usize) -> String {
    let mut base = current.trim_end().to_string();
    if let Some(open) = base.rfind('[') {
        if base.ends_with(']') {
            let inner = &base[open + 1..base.len() - 1];
            let mut parts = inner.split('/');
            let counter_like = match (parts.next(), parts.next(), parts.next()) {
                (Some(a), Some(b), None) => {
                    a.trim().parse::<u64>().is_ok() && b.trim().parse::<u64>().is_ok()
                }
                _ => false,
            };
            if counter_like {
                base = base[..open].trim_end().to_string();
            }
        }
    }
    format!("{base} [{members}/{limit}]")
}

/// UTILS.autoFeur leaf.
async fn autofeur_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.autoFeur").await
}

/// UTILS.antiExe leaf.
async fn antiexe_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.antiExe").await
}

/// GUILD.REACT_MSG.* trigger keys, table-first with legacy fallback
/// (keys unchanged).
async fn react_msg_keys_routed(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    crate::db::tbl_scan_prefix(pool, gid, "GUILD.REACT_MSG.")
        .await
        .into_iter()
        .map(|(k, _)| k)
        .collect()
}

/// One GUILD.REACT_MSG.<trigger> emoji leaf.
async fn react_msg_emoji_routed(pool: &crate::db::Pool, gid: &str, key: &str) -> Option<String> {
    leaf_routed(pool, gid, key).await
}

/// UTILS.git_lines leaf.
async fn git_lines_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.git_lines").await
}

/// GUILD.ANTISPAM.BYPASS_ROLES leaf, parsed.
async fn antispam_bypass_roles_routed(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    leaf_routed(pool, gid, "GUILD.ANTISPAM.BYPASS_ROLES")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// GUILD.ANTISPAM.BYPASS_CHANNELS leaf, parsed.
async fn antispam_bypass_channels_routed(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    leaf_routed(pool, gid, "GUILD.ANTISPAM.BYPASS_CHANNELS")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// GUILD.ANTISPAM config blob leaf, parsed.
async fn antispam_cfg_routed(
    pool: &crate::db::Pool,
    gid: &str,
) -> Option<crate::commands::antispam::main::AntispamConfig> {
    leaf_routed(pool, gid, crate::commands::antispam::main::ANTISPAM_KEY)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

/// GUILD.H247 leaf (raw string).
async fn h247_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.H247").await
}

/// ECONOMY.buyableRoles leaf (raw JSON string, empty when unset).
async fn buyable_roles_routed(pool: &crate::db::Pool, gid: &str) -> String {
    leaf_routed(pool, gid, "ECONOMY.buyableRoles")
        .await
        .unwrap_or_default()
}

/// UTILS.LEASH leaf (raw JSON blob string).
async fn leash_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.LEASH").await
}

/// UTILS.VOICE_FREEZE leaf (raw JSON blob string).
async fn voice_freeze_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.VOICE_FREEZE").await
}

/// UTILS.VOICE_TALK leaf (raw JSON blob string, `{ channelId }`).
async fn voice_talk_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "UTILS.VOICE_TALK").await
}

/// Repeat-join counter parse (mirrors tooNewAccount.ts `|| 0`).
fn too_new_join_count(raw: Option<&str>) -> u64 {
    raw.and_then(|s| s.parse::<u64>().ok()).unwrap_or(0)
}

/// Ban once the counter passes maxJoin (mirrors
/// `if (baseData.maxJoin && joinCount > baseData.maxJoin)`; a missing
/// or non-positive maxJoin never bans).
fn too_new_should_ban(join_count: u64, max_join: Option<i64>) -> bool {
    max_join.is_some_and(|m| m > 0 && (join_count as i64) > m)
}

/// Voice talk/freeze bypass (mirrors voiceTalkFreeze.ts: bots,
/// Administrators and ManageChannels members are never muted,
/// unmuted, disconnected or timed out by these legs).
fn voice_talk_bypass(is_bot: bool, administrator: bool, manage_channels: bool) -> bool {
    is_bot || administrator || manage_channels
}

/// Autocomplete choice filter for the commandlimit `command` option
/// (mirrors commandlimit.ts autocomplete: substring-or-prefix match
/// on the focused value, first 25). Pure for unit tests.
fn autocomplete_command_choices(paths: &[String], focused: &str) -> Vec<String> {
    paths
        .iter()
        .filter(|p| p.contains(focused) || p.starts_with(focused))
        .take(25)
        .cloned()
        .collect()
}

/// LastFM tracked-channel membership change (mirrors the TS
/// wasInTrackedChannel/isInTrackedChannel branch in
/// lastFMScrobblerManager.ts `handleVoiceStateUpdate`):
/// `Some(true)` = attach, `Some(false)` = detach, `None` = no-op.
/// Pure; the live caller is the voice_state_update LastFM leg below.
fn lastfm_tracked_change(old_ch: Option<u64>, new_ch: Option<u64>, tracked: u64) -> Option<bool> {
    match (old_ch == Some(tracked), new_ch == Some(tracked)) {
        (false, true) => Some(true),
        (true, false) => Some(false),
        _ => None,
    }
}

/// GUILD.TTS leaf (raw JSON blob string).
async fn tts_raw_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.TTS").await
}

/// GUILD.REACTION_ROLES.<mid>.<name> leaf, parsed to a role id.
async fn reaction_role_routed(
    pool: &crate::db::Pool,
    gid: &str,
    message_id: u64,
    name: &str,
) -> Option<u64> {
    leaf_routed(
        pool,
        gid,
        &format!("GUILD.REACTION_ROLES.{message_id}.{name}"),
    )
    .await
    .as_deref()
    .and_then(crate::commands::rolereactions::rolereaction::parse_reaction_role)
}

/// Global PREVNAMES.<uid> history leaf, parsed.
async fn prevnames_routed(pool: &crate::db::Pool, user_id: u64) -> Vec<String> {
    leaf_routed(pool, "0", &crate::events::prevnames_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// GUILD.UTILS.ROLE_LIMIT.<role> leaf, parsed.
async fn role_limit_routed(pool: &crate::db::Pool, gid: &str, role_id: u64) -> Option<usize> {
    leaf_routed(pool, gid, &format!("GUILD.UTILS.ROLE_LIMIT.{role_id}"))
        .await
        .and_then(|s| s.parse::<usize>().ok())
}

/// GUILD.SUPPORT leaf (raw JSON blob string).
async fn support_cfg_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "GUILD.SUPPORT").await
}

/// BOT.botName leaf.
async fn bot_name_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, crate::commands::botcat::BOT_NAME_KEY).await
}

/// BOT.botPFP leaf.
async fn bot_pfp_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, crate::commands::botcat::BOT_PFP_KEY).await
}

/// Global BLACKLIST.<uid> reason leaf, routed via the named blacklist
/// table (legacy scope "0", keys unchanged).
async fn blacklist_reason_routed(pool: &crate::db::Pool, user_id: u64) -> Option<String> {
    crate::commands::owner::main::bl_get(pool, user_id).await
}

/// Per-guild BLACKLIST.<uid> marker leaf (keys unchanged).
async fn guild_blacklist_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Option<String> {
    leaf_routed(pool, gid, &format!("BLACKLIST.{user_id}")).await
}

/// EMBED_AWAIT.<uid> builder-input marker leaf (keys unchanged).
async fn embed_await_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Option<String> {
    leaf_routed(
        pool,
        gid,
        &crate::commands::embed::embed_builder::await_key(user_id),
    )
    .await
}

/// SNIPE.<channel> snapshot leaf, table-routed (keys unchanged).
async fn snipe_snapshot_routed(
    pool: &crate::db::Pool,
    gid: &str,
    channel_id: u64,
) -> Option<String> {
    leaf_routed(pool, gid, &format!("SNIPE.{channel_id}")).await
}

/// SNIPE.last_deleted_id marker leaf, table-routed (keys unchanged).
async fn snipe_last_id_routed(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    leaf_routed(pool, gid, "SNIPE.last_deleted_id").await
}

/// SNIPE write via the shared routed primitive (dual-store, keys
/// unchanged). Mirrors the snipe command read path (routed_get).
async fn save_snipe_routed(
    pool: &crate::db::Pool,
    gid: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(pool, gid, gid, key, value).await
}

/// TS snipe snapshot JSON. Mirrors Events/utils/snipeModule.ts verbatim:
/// `{snipe, snipeUserInfoTag, snipeUserInfoPp, snipeTimestamp}` with the
/// content masked via maskLink (`Hidden Link` on any URL-ish input).
/// Pure, unit-tested below.
pub fn ts_snipe_json(
    raw_content: &str,
    author_name: &str,
    author_id: u64,
    avatar_url: &str,
    timestamp_ms: i64,
) -> String {
    serde_json::json!({
        "snipe": crate::funcs::mask_link(raw_content),
        "snipeUserInfoTag": format!("{author_name} ({author_id})"),
        "snipeUserInfoPp": avatar_url,
        "snipeTimestamp": timestamp_ms,
    })
    .to_string()
}

/// TICKET_ALL.<user>.<channel> rows for one user, table-first with
/// legacy fallback (keys unchanged).
async fn ticket_user_rows_routed(pool: &crate::db::Pool, gid: &str, user_id: u64) -> Vec<String> {
    crate::db::tbl_scan_prefix(pool, gid, &format!("TICKET_ALL.{user_id}."))
        .await
        .into_iter()
        .map(|(k, _)| k)
        .collect()
}

/// All TICKET_ALL.* rows, table-first with legacy fallback (keys
/// unchanged).
async fn ticket_rows_routed(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    crate::db::tbl_scan_prefix(pool, gid, "TICKET_ALL.").await
}

/// Last-known names per user: (username, globalName).
/// Mirrors `usersNamesMap` in src/core/prevnamesModule.ts.
pub type NamesMap = HashMap<u64, (String, Option<String>)>;

/// Last-known nicknames per user per guild: user -> (guild -> nick).
/// Mirrors `usersNicknamesMap` in src/core/prevnamesModule.ts.
/// Populated by the guild_member_update nick leg (no ready warm in TS
/// either); unknown nicks stay `None`, exactly like the TS
/// `string | null` values.
pub type NicksMap = HashMap<u64, HashMap<u64, Option<String>>>;

#[derive(Clone)]
pub struct Handler {
    pub pool: Pool,
    /// Sliding-window message timestamps per (guild,user).
    /// Mirrors Events/antispam in-memory raidInfo cache.
    pub spam: Arc<tokio::sync::Mutex<HashMap<String, Vec<i64>>>>,
    /// Antispam message cache per guild. Mirrors `cache.messages` in
    /// Events/antispam/onNewMessage.ts (8h TTL, purged on each hit).
    pub antispam_msgs: Arc<tokio::sync::Mutex<HashMap<String, Vec<CachedSpamMessage>>>>,
    /// Antispam warn flags per guild per user. Mirrors
    /// `cache.membersFlags` (dropped once the author has no live
    /// message left).
    pub antispam_flags: Arc<tokio::sync::Mutex<HashMap<String, HashMap<String, u32>>>>,
    /// Guilds -> users awaiting the debounced punish batch. Mirrors
    /// `cache.membersToPunish`.
    pub antispam_punish: Arc<tokio::sync::Mutex<HashMap<String, HashSet<u64>>>>,
    /// Per-guild debounce deadlines (epoch ms). Mirrors the
    /// `timeouts` map behind `waitForFinish` (5s of quiet, reset on
    /// every tripping message).
    pub antispam_deadline: Arc<tokio::sync::Mutex<HashMap<String, i64>>>,
    /// Guilds with a debounce flush task already scheduled.
    pub antispam_flush: Arc<tokio::sync::Mutex<HashSet<String>>>,
    /// Last tripping channel per guild (warn-message target).
    /// Mirrors `message.channel` in the TS punish branch.
    pub antispam_warn_ch: Arc<tokio::sync::Mutex<HashMap<String, u64>>>,
    /// Invite uses cache per guild: code -> (uses, inviter).
    /// Mirrors invitemanager onInviteCreate/Delete tracking.
    pub invites: Arc<tokio::sync::Mutex<InviteCache>>,
    /// In-flight invite-fetch dedup per guild. Mirrors
    /// pendingInviteFetch in Events/guildconfig/joinMessage.ts.
    pub invite_fetch: Arc<tokio::sync::Mutex<PendingInviteFetch>>,
    /// Guilds already owner-sealed this boot.
    /// Mirrors guildOwnerSafetySetWhenMessage already_visited.
    pub sealed: Arc<tokio::sync::Mutex<std::collections::HashSet<String>>>,
    /// Pending security captcha challenges: "guild.user" -> challenge.
    /// Mirrors Events/security/onMemberJoin.ts (message-collector flow).
    pub security: Arc<tokio::sync::Mutex<HashMap<String, SecurityChallenge>>>,
    /// Slash-command file log. Mirrors Events/logs/slashCommandLogger.ts
    /// (SafeJSONLogger at src/files/slash.log.json).
    pub slashlog: Arc<crate::slashlog::SlashLog>,
    /// Guilds with a protection restore currently running.
    /// Mirrors restorationInProgress in avoidChannelDelete.ts.
    pub restoring: Arc<tokio::sync::Mutex<HashSet<String>>>,
    /// Handled audit-log entry ids for protection attribution.
    /// Mirrors handledAuditLogEntries in Events/protection/ready.ts
    /// (getLogs dedup: each entry sanctions at most once).
    pub handled_audit: Arc<tokio::sync::Mutex<HashSet<String>>>,
    /// In-flight temp-voice creations: "guild.user".
    /// Mirrors pendingCustomVoiceCreations in
    /// Events/voicedashboard/voiceState.ts.
    pub temp_pending: Arc<tokio::sync::Mutex<HashSet<String>>>,
    /// Last-known names per user, warmed from the member cache at ready.
    pub names: Arc<tokio::sync::Mutex<NamesMap>>,
    /// Last-known nicknames per user per guild (usersNicknamesMap-style).
    /// Read by the guild_member_update nick leg only.
    pub nicks: Arc<tokio::sync::Mutex<NicksMap>>,
    /// Pic-only warn timestamps per user id. Mirrors the `warnings`
    /// map in Events/utils/picOnlyModule.ts (10-minute sliding window,
    /// 3-strike timeout).
    pub pic_warns: Arc<tokio::sync::Mutex<HashMap<String, Vec<i64>>>>,
    /// SMTP owner mailer. Mirrors `client.email` (core.ts:134).
    /// Silent when SMTP env is incomplete (guarded by `connected`).
    pub mailer: Arc<crate::mailer::Mailer>,
}

/// Pending captcha challenge for a newcomer.
pub struct SecurityChallenge {
    pub channel_id: u64,
    pub message_id: u64,
    pub user_id: u64,
    pub code: String,
    pub attempts_left: u8,
    pub role: Option<u64>,
    pub role2: Option<u64>,
    pub joined_at: Option<i64>,
    /// Absolute expiry (unix secs) pinned at challenge issue, mirrored
    /// in the `<t:…:R>` stamp. Wrong attempts reuse it (TS keeps one
    /// `expiresAt`); the per-challenge expiry task spawned below owns
    /// the actual kick (there is no separate sweep task).
    pub expires_at: i64,
}

/// Key for the pending-challenge map.
pub fn security_key(guild_id: u64, user_id: u64) -> String {
    format!("{guild_id}.{user_id}")
}

/// Captcha code alphabet. Mirrors generateRandomCode in
/// Events/security/onMemberJoin.ts (no J, 7 chars).
pub const SECURITY_CODE_ALPHABET: &str = "ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789";

/// Generate a 7-char captcha code. Single live path delegates to the
/// security module's CSPRNG (`OsRng`, mirroring TS `crypto.randomInt`);
/// no seeded / `thread_rng` fallback exists on the live path.
pub fn security_code() -> String {
    crate::commands::security::security_code()
}

/// Captcha image challenge is rasterized by `crate::cards::captcha_png`
/// (900x300 parchment PNG, no Chromium); the join leg attaches it as
/// `captcha.png` with the code only in the image, never in text.
///
/// Welcome target: system channel, else the lowest-position text
/// channel. Mirrors the guildCreate.ts channel pick.
pub fn welcome_channel(guild: &serenity::Guild) -> Option<serenity::ChannelId> {
    if let Some(ch) = guild.system_channel_id {
        return Some(ch);
    }
    guild
        .channels
        .values()
        .filter(|c| c.kind == serenity::ChannelType::Text)
        .min_by_key(|c| c.position)
        .map(|c| c.id)
}

/// Snapshot entry for a deleted channel id: top-level first, then
/// nested inside categories. None when the channel was never
/// snapshotted (created after the last backup). Pure, unit-tested.
pub fn backup_channel_for<'a>(
    backup: &'a crate::commands::protection::backup::GuildBackup,
    channel_id: &str,
) -> Option<&'a crate::commands::protection::backup::BackupChannel> {
    backup
        .channels
        .iter()
        .find(|c| c.id == channel_id)
        .or_else(|| {
            backup
                .categories
                .iter()
                .flat_map(|cat| cat.channels.iter())
                .find(|c| c.id == channel_id)
        })
}

/// Snapshot entry for a deleted category id. None when the category
/// was never snapshotted. Pure, unit-tested.
pub fn backup_category_for<'a>(
    backup: &'a crate::commands::protection::backup::GuildBackup,
    category_id: &str,
) -> Option<&'a crate::commands::protection::backup::BackupCategory> {
    backup.categories.iter().find(|c| c.id == category_id)
}

/// True when a role-update revert would change anything. Pure gate
/// backing revert_role_edit so identical snapshots stay audit-clean.
/// Covers the EditRole::from_role fields (position is serde-skipped on
/// edit, the role icon has no snapshot round-trip).
pub fn role_revert_needed(old: &serenity::Role, new: &serenity::Role) -> bool {
    old.name != new.name
        || old.permissions != new.permissions
        || old.colour != new.colour
        || old.colours.primary_colour != new.colours.primary_colour
        || old.colours.secondary_colour != new.colours.secondary_colour
        || old.colours.tertiary_colour != new.colours.tertiary_colour
        || old.hoist != new.hoist
        || old.mentionable != new.mentionable
        || old.unicode_emoji != new.unicode_emoji
}

/// True when a channel-update revert would change anything. Pure gate
/// backing revert_channel_edit. Covers the TS editOptions fields
/// (name, permission overwrites, parent, position, topic, nsfw,
/// rate-limit, bitrate, user-limit, rtc region).
pub fn channel_revert_needed(old: &serenity::GuildChannel, new: &serenity::GuildChannel) -> bool {
    old.name != new.name
        || old.permission_overwrites != new.permission_overwrites
        || old.parent_id != new.parent_id
        || old.position != new.position
        || old.topic != new.topic
        || old.nsfw != new.nsfw
        || old.rate_limit_per_user != new.rate_limit_per_user
        || old.bitrate != new.bitrate
        || old.user_limit != new.user_limit
        || old.rtc_region != new.rtc_region
}

/// Guild icon CDN URL for a snapshot hash. Animated hashes (a_*) serve
/// gif, the rest png. Pure, unit-tested.
pub fn guild_icon_cdn_url(guild_id: u64, hash: &serenity::ImageHash) -> String {
    let ext = if hash.is_animated() { "gif" } else { "png" };
    format!("https://cdn.discordapp.com/icons/{guild_id}/{hash}.{ext}")
}

/// Try to claim the per-guild restore slot. True on first claim,
/// false while a restore is already running. Pure predicate backing
/// Handler::restore_claim, unit-tested below (no Discord needed).
pub fn restore_slot_claim(running: &mut HashSet<String>, guild_id: &str) -> bool {
    running.insert(guild_id.to_string())
}

/// Release the per-guild restore slot (no-op when absent). Pure
/// predicate backing Handler::restore_release, unit-tested below.
pub fn restore_slot_release(running: &mut HashSet<String>, guild_id: &str) {
    running.remove(guild_id);
}

/// Audit-log attribution window in ms. Mirrors AUDIT_LOG_WINDOW_MS in
/// Events/protection/ready.ts (the getLogs 20s recency gate).
pub const AUDIT_LOG_WINDOW_MS: i64 = 20_000;

/// Audit-log fetch depth. Mirrors AUDIT_LOG_FETCH_LIMIT in
/// Events/protection/ready.ts: the last 40 entries are scanned for a
/// target-id match instead of trusting the latest entry blindly.
pub const AUDIT_LOG_FETCH_LIMIT: u8 = 40;

/// Attributed protection hit: the sanctioned executor plus the audit
/// entry's target id. The target id backs the webhook-delete revert
/// leg (delete exactly the created webhook, mirroring
/// avoidWebhookModifying.ts). Pure data.
pub struct ProtectionHit {
    pub executor: serenity::UserId,
    pub entry_target: Option<u64>,
}

/// Pure audit-log attribution predicate backing protection_guard.
/// Mirrors getLogs in Events/protection/ready.ts: target-id match,
/// executor present and not the bot, entry created within the 20s
/// window. `entry_created_ms` is the snowflake-derived creation time
/// in ms. Unit-tested below (no Discord needed).
pub fn audit_entry_relevant(
    entry_target: Option<u64>,
    executor_id: u64,
    bot_id: u64,
    entry_created_ms: i64,
    now_ms: i64,
    expected_target: Option<u64>,
) -> bool {
    let target_ok = match (entry_target, expected_target) {
        (Some(found), Some(expected)) => found == expected,
        // TS always passes a concrete target; without one there is
        // nothing to attribute.
        _ => false,
    };
    target_ok
        && executor_id != 0
        && executor_id != bot_id
        && now_ms.saturating_sub(entry_created_ms) <= AUDIT_LOG_WINDOW_MS
}

/// Leash pairing lifetime. Mirrors the 30-minute expiry filter in
/// Events/utils/leashModule.ts.
pub const LEASH_EXPIRY_MS: i64 = 30 * 60 * 1000;

/// One UTILS.LEASH row. Mirrors DatabaseStructure.LeashData
/// ({dom, sub, timestamp}); sub may hold a comma-separated list of
/// follower ids.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct LeashEntry {
    pub dom: String,
    pub sub: String,
    pub timestamp: i64,
}

/// True while a pairing is still live (age within the 30-minute window).
/// Pure predicate backing the leash prune, unit-tested below.
pub fn leash_valid(entry_timestamp: i64, now_ms: i64) -> bool {
    now_ms.saturating_sub(entry_timestamp) <= LEASH_EXPIRY_MS
}

/// Split a pairing's sub CSV into follower ids (trims whitespace,
/// drops empties). Pure, unit-tested below.
pub fn leash_sub_ids(sub_csv: &str) -> Vec<String> {
    sub_csv
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// True when the changing member belongs to this pairing (either as
/// dom or as the whole sub field). Mirrors leashModule.ts verbatim:
/// `x.sub === id || x.dom === id` compares the raw sub string, NOT
/// the split CSV parts (so a multi-sub pairing only matches on the
/// dom side, like TS). The CSV split (`leash_sub_ids`) applies only
/// once a pairing matched, when resolving which subs to move.
/// Pure, unit-tested below.
pub fn leash_entry_matches(entry: &LeashEntry, changing_id: &str) -> bool {
    entry.dom == changing_id || entry.sub == changing_id
}

/// True when the changing member is the dom of this pairing.
/// Decides the move direction: dom moved -> subs follow the dom's new
/// channel; sub moved -> the sub is pulled back to the dom's channel.
/// Pure, unit-tested below.
pub fn leash_is_dom(entry: &LeashEntry, changing_id: &str) -> bool {
    entry.dom == changing_id
}

/// In-flight temp-voice creation key. Mirrors the
/// `${guildId}.${userId}` key of pendingCustomVoiceCreations in
/// Events/voicedashboard/voiceState.ts. Pure, unit-tested below.
pub fn temp_creation_key(guild_id: &str, user_id: &str) -> String {
    format!("{guild_id}.{user_id}")
}

/// Exact bot-mention ping gate. Mirrors rankRoleModule.ts: only a
/// message whose whole content is `<@{botId}>` triggers the
/// rank-role grant/info path. Pure, unit-tested below.
pub fn is_bot_ping(content: &str, bot_id: u64) -> bool {
    content == format!("<@{bot_id}>")
}

/// Per-user ping-bot info cooldown. Mirrors helper.cooldown(authorId,
/// "ping_bot", 7000): true on first sight inside the 7s window expiry
/// (send allowed, window recorded), false while the window holds (send
/// skipped). The caller records before the UseApplicationCommands gate
/// exactly like TS, so an ungated ping still starts the window. Pure,
/// unit-tested below.
pub fn ping_bot_cooldown_ok(user_id: u64, now_ms: i64) -> bool {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static MAP: OnceLock<Mutex<HashMap<u64, i64>>> = OnceLock::new();
    let map = MAP.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
    let next = guard.get(&user_id).copied().unwrap_or(0);
    if now_ms < next {
        return false;
    }
    guard.insert(user_id, now_ms + 7_000);
    true
}

/// Vanity display for the guild-leave log embed. Mirrors
/// removeGuildLog.ts (`discord.gg/<code>`, else "None"). Pure,
/// unit-tested below.
pub fn leave_embed_vanity(vanity_code: Option<&str>) -> String {
    match vanity_code {
        Some(code) if !code.is_empty() => format!("discord.gg/{code}"),
        _ => "None".to_string(),
    }
}

/// Expression thumbnails for guild leave / wipe DMs. Mirrors
/// `Expressions.Sob` / `Expressions.Wink` in
/// core/functions/randomExpression.ts.
pub const EXPRESSION_SOB_THUMB: &str =
    "https://www.ihorizon.org/assets/img/bot/expression/ihorizon_sob.png";
pub const EXPRESSION_WINK_THUMB: &str =
    "https://www.ihorizon.org/assets/img/bot/expression/ihorizon_wink.png";

/// Strip the trailing DM-variant marker from a component custom id.
/// Mirrors buttonHandler.ts:30-37 (`?dm` slice); select ids never
/// carry it, so stripping globally is a no-op for them. Pure,
/// unit-tested below.
pub fn strip_dm_suffix(id: &str) -> &str {
    id.strip_suffix("?dm").unwrap_or(id)
}

/// Prefix segment of a component custom id. Mirrors
/// buttonHandler.ts:38 / selectMenuHandler.ts:35 (`split("%")[0]`,
/// the client.buttons / client.selectmenu registry key). Pure,
/// unit-tested below.
pub fn component_prefix(id: &str) -> &str {
    id.split('%').next().unwrap_or(id)
}

/// Discord timestamp mention. Renders the `${deleteAt}` placeholder
/// of the guild_leave_data_clear_* templates (`F` in the embed
/// description, `R` in the DM content). Pure, unit-tested below.
pub fn discord_timestamp(unix_secs: i64, style: char) -> String {
    format!("<t:{unix_secs}:{style}>")
}

/// Fill a guild_leave_data_clear_* template carrying both
/// placeholders (`${guild.name}` + `${deleteAt}`). Pure,
/// unit-tested below.
pub fn render_leave_notice_text(
    template: &str,
    guild_name: &str,
    delete_at_secs: i64,
    ts_style: char,
) -> String {
    template
        .replace("${guild.name}", guild_name)
        .replace("${deleteAt}", &discord_timestamp(delete_at_secs, ts_style))
}

/// Fill a guild template carrying only `${guild.name}` (the
/// guild_leave_data_clear_cancelled_* set). Pure, unit-tested below.
pub fn render_guild_name_text(template: &str, guild_name: &str) -> String {
    template.replace("${guild.name}", guild_name)
}

/// Shard tag for the guild log embeds. Mirrors
/// `#${client.shard?.ids[0]}` in removeGuildLog.ts. Pure,
/// unit-tested below.
pub fn shard_label(shard_id: u32) -> String {
    format!("#{shard_id}")
}

/// Delay before a left guild's data is wiped. Mirrors
/// GUILD_DELETE_DELAY in Events/client/deleteDatabaseDataOnGuildLeave.ts.
pub const GUILD_WIPE_DELAY_MS: i64 = 10 * 60 * 60 * 1000;

/// Global wipe-queue key. Mirrors GUILD_DELETE_QUEUE_KEY (a single
/// global row, hence the "0" scope like other global keys).
pub const GUILD_DELETE_QUEUE_KEY: &str = "GUILD_DELETE_QUEUE_KEY";
/// Scope holding the global wipe queue (mirrors the single-key TS store).
pub const GUILD_WIPE_QUEUE_SCOPE: &str = "0";

/// Pending deferred guild-data wipe. Mirrors PendingGuildDeletion
/// in Events/client/deleteDatabaseDataOnGuildLeave.ts (camelCase
/// wire shape kept for fidelity).
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct PendingGuildDeletion {
    #[serde(rename = "guildId")]
    pub guild_id: String,
    #[serde(rename = "guildName")]
    pub guild_name: String,
    #[serde(rename = "ownerId")]
    pub owner_id: String,
    #[serde(rename = "deleteAt")]
    pub delete_at: i64,
}

/// Enqueue (or refresh) a deferred wipe for a left guild. Returns
/// the wipe deadline. Pure predicate backing guild_delete,
/// unit-tested below (no Discord needed).
pub fn wipe_queue_enqueue(
    queue: &mut HashMap<String, PendingGuildDeletion>,
    guild_id: &str,
    guild_name: &str,
    owner_id: &str,
    now_ms: i64,
) -> i64 {
    let delete_at = now_ms.saturating_add(GUILD_WIPE_DELAY_MS);
    queue.insert(
        guild_id.to_string(),
        PendingGuildDeletion {
            guild_id: guild_id.to_string(),
            guild_name: guild_name.to_string(),
            owner_id: owner_id.to_string(),
            delete_at,
        },
    );
    delete_at
}

/// Cancel a pending wipe on rejoin. True when an entry existed.
/// Pure predicate backing guild_create (mirrors
/// cancelPendingGuildDataDeletion), unit-tested below.
pub fn wipe_queue_cancel(
    queue: &mut HashMap<String, PendingGuildDeletion>,
    guild_id: &str,
) -> bool {
    queue.remove(guild_id).is_some()
}

/// Guilds whose wipe is due: deadline passed and the bot is still
/// absent (mirrors clearGuildData's cache guard that skips guilds
/// back in cache). Pure predicate backing the wipe-queue sweep and
/// the ready recovery, unit-tested below.
pub fn wipe_queue_due(
    queue: &HashMap<String, PendingGuildDeletion>,
    now_ms: i64,
    present: &HashSet<String>,
) -> Vec<String> {
    queue
        .iter()
        .filter(|(gid, p)| now_ms >= p.delete_at && !present.contains(*gid))
        .map(|(gid, _)| gid.clone())
        .collect()
}

/// Owner leave-notice DM. Mirrors notifyOwnerFromAnotherGuild in
/// Events/client/deleteDatabaseDataOnGuildLeave.ts:118-159 (best
/// effort, failures only traced). Sends only when the owner still
/// shares another guild with the bot (the TS another-guild gate);
/// templates are the guild_leave_data_clear_notice_* YAML keys.
pub async fn send_leave_notice_dm(
    ctx: &serenity::Context,
    pool: &Pool,
    guild: &serenity::Guild,
    delete_at_ms: i64,
) {
    let owner_id = guild.owner_id;
    let still_shared =
        ctx.cache.guilds().iter().any(|id| {
            *id != guild.id && ctx.cache.guild(*id).is_some_and(|g| g.owner_id == owner_id)
        });
    if !still_shared {
        return;
    }
    let gid = guild.id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild.id.get())).await;
    let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let Ok(owner) = owner_id.to_user(&ctx.http).await else {
        return;
    };
    let delete_at_secs = delete_at_ms.div_euclid(1000);
    let embed = serenity::CreateEmbed::default()
        .colour(0x11304C_u32)
        .title(render_leave_notice_text(
            &text("guild_leave_data_clear_notice_title"),
            &guild.name,
            delete_at_secs,
            'F',
        ))
        .description(render_leave_notice_text(
            &text("guild_leave_data_clear_notice_description"),
            &guild.name,
            delete_at_secs,
            'F',
        ))
        .timestamp(serenity::Timestamp::now())
        .thumbnail(EXPRESSION_SOB_THUMB)
        .footer(serenity::CreateEmbedFooter::new(
            crate::commands::botcat::bot_footer_name(bot_name_routed(pool, &gid).await.as_deref()),
        ));
    let content = render_leave_notice_text(
        &text("guild_leave_data_clear_notice_message"),
        &guild.name,
        delete_at_secs,
        'R',
    );
    let _ = owner
        .direct_message(
            &ctx.http,
            serenity::CreateMessage::new().content(content).embed(embed),
        )
        .await;
}

/// Owner cancel-notice DM. Mirrors cancelPendingGuildDataDeletion in
/// Events/client/deleteDatabaseDataOnGuildLeave.ts:179-209 (best
/// effort, failures only traced). Templates are the
/// guild_leave_data_clear_cancelled_* YAML keys.
pub async fn send_wipe_cancel_dm(ctx: &serenity::Context, pool: &Pool, guild: &serenity::Guild) {
    let gid = guild.id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild.id.get())).await;
    let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let Ok(owner) = guild.owner_id.to_user(&ctx.http).await else {
        return;
    };
    let embed = serenity::CreateEmbed::default()
        .colour(0x57F287_u32)
        .title(render_guild_name_text(
            &text("guild_leave_data_clear_cancelled_title"),
            &guild.name,
        ))
        .description(render_guild_name_text(
            &text("guild_leave_data_clear_cancelled_description"),
            &guild.name,
        ))
        .timestamp(serenity::Timestamp::now())
        .thumbnail(EXPRESSION_WINK_THUMB)
        .footer(serenity::CreateEmbedFooter::new(
            crate::commands::botcat::bot_footer_name(bot_name_routed(pool, &gid).await.as_deref()),
        ));
    let content = render_guild_name_text(
        &text("guild_leave_data_clear_cancelled_message"),
        &guild.name,
    );
    let _ = owner
        .direct_message(
            &ctx.http,
            serenity::CreateMessage::new().content(content).embed(embed),
        )
        .await;
}

/// Debounce quiet window before a tripping guild is punished.
/// Mirrors the 5000ms `setTimeout` in `waitForFinish`
/// (Events/antispam/onNewMessage.ts).
pub const ANTISPAM_DEBOUNCE_MS: i64 = 5000;

/// Cached-message lifetime. Mirrors ANTISPAM_MESSAGE_TTL (8h) in
/// Events/antispam/onNewMessage.ts.
pub const ANTISPAM_TTL_MS: i64 = 8 * 60 * 60 * 1000;

/// Bulk-delete slice size. Mirrors CHUNK_SIZE in clearSpamMessages.
pub const ANTISPAM_BULK_CHUNK: usize = 15;

/// Channel batch width for the clear pass. Mirrors `batchSize: 3`
/// in the clearSpamMessages processBatchAsync call.
pub const ANTISPAM_CHANNEL_BATCH: usize = 3;

/// Pacing between channel batches. Mirrors `delay: 100`.
pub const ANTISPAM_CHANNEL_BATCH_DELAY_MS: u64 = 100;

/// Self-delete delay of the warn message. Mirrors the 4000ms
/// `setTimeout(() => msg.delete())` in sendWarningMessage.
pub const ANTISPAM_WARN_DELETE_SECS: u64 = 4;

/// One cached guild message. Mirrors AntiSpam.CachedMessage
/// (messageID, guildID, authorID, channelID, content,
/// sentTimestamp, isSpam). Pure data, unit-tested below.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CachedSpamMessage {
    pub message_id: u64,
    pub channel_id: u64,
    pub author_id: u64,
    pub sent_at: i64,
    pub is_spam: bool,
}

/// Log-embed context for one antispam sanction batch. Bundles the
/// seven arguments `antispam_log` needs so the method keeps a single
/// parameter (clippy `too_many_arguments`).
pub struct AntispamLog<'a> {
    pub http: &'a std::sync::Arc<serenity::Http>,
    pub guild_id: serenity::GuildId,
    pub gid: &'a str,
    pub users: &'a [u64],
    pub punishment_type: &'a str,
    pub lang_code: &'a str,
    pub bot_id: u64,
}

/// Sanction context for one antispam-punished member. Bundles the
/// seven arguments `antispam_punish_user` needs so the method keeps
/// a single parameter (clippy `too_many_arguments`).
pub struct AntispamPunish<'a> {
    pub http: &'a std::sync::Arc<serenity::Http>,
    pub guild_id: serenity::GuildId,
    pub gid: &'a str,
    pub user_id: u64,
    pub cfg: &'a crate::commands::antispam::main::AntispamConfig,
    pub lang_code: &'a str,
    pub bot_id: u64,
}

/// Exemption snapshot for one message. Mirrors the early-return
/// chain at the top of the TS messageCreate run (bot Administrator
/// gate, Enabled flag, webhook/self, guild owner, Administrator
/// members, ignoreBots, bypass roles/channels incl. parent).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct AntispamGate {
    pub bot_admin: bool,
    pub enabled: bool,
    pub webhook: bool,
    pub self_msg: bool,
    pub owner: bool,
    pub admin: bool,
    pub bot_ignored: bool,
    pub bypass: bool,
}

/// True when the message skips antispam analysis. Pure predicate
/// backing Handler::antispam_message, unit-tested below.
pub fn antispam_skipped(g: &AntispamGate) -> bool {
    !g.bot_admin
        || !g.enabled
        || g.webhook
        || g.self_msg
        || g.owner
        || g.admin
        || g.bot_ignored
        || g.bypass
}

/// Drop cached messages older than the 8h TTL. Mirrors
/// purgeOldGuildMessages (strict `>`, like TS). Pure, unit-tested.
pub fn antispam_purge_old(msgs: &mut Vec<CachedSpamMessage>, now_ms: i64) {
    msgs.retain(|m| now_ms - m.sent_at <= ANTISPAM_TTL_MS);
}

/// Drop warn flags for authors with no live message left. Mirrors
/// purgeOldMemberFlags. Pure, unit-tested.
pub fn antispam_prune_flags(flags: &mut HashMap<String, u32>, msgs: &[CachedSpamMessage]) {
    let active: HashSet<u64> = msgs.iter().map(|m| m.author_id).collect();
    flags.retain(|k, _| {
        k.parse::<u64>()
            .map(|id| active.contains(&id))
            .unwrap_or(false)
    });
}

/// Newest cached timestamp for one author, if any. Pure, unit-tested.
pub fn antispam_last_sent(msgs: &[CachedSpamMessage], author_id: u64) -> Option<i64> {
    msgs.iter()
        .filter(|m| m.author_id == author_id)
        .map(|m| m.sent_at)
        .max()
}

/// Elapsed time since the author's previous message. None on first
/// sight (TS then uses `maxInterval + 1`, i.e. no flag). Pure,
/// unit-tested.
pub fn antispam_elapsed(
    msgs: &[CachedSpamMessage],
    author_id: u64,
    now_ms: i64,
    max_interval_ms: i64,
) -> Option<i64> {
    match antispam_last_sent(msgs, author_id) {
        Some(last) => Some(now_ms - last),
        None => Some(max_interval_ms + 1),
    }
}

/// True when the elapsed gap trips the sliding window
/// (`elapsedTime < maxInterval` -> flag +1, isSpam). Pure,
/// unit-tested.
pub fn antispam_gap_tripped(elapsed_ms: Option<i64>, max_interval_ms: i64) -> bool {
    // TS: `if (elapsedTime && elapsedTime < maxInterval)` — elapsed 0 is falsy, no flag.
    elapsed_ms
        .map(|e| e > 0 && e < max_interval_ms)
        .unwrap_or(false)
}

/// True when accumulated flags reach the punish threshold.
/// Pure, unit-tested.
pub fn antispam_threshold_tripped(flags: u32, threshold: u32) -> bool {
    threshold > 0 && flags >= threshold
}

/// Split message ids into bulk-delete slices. Mirrors the
/// `slice(i, i + CHUNK_SIZE)` loop in clearSpamMessages. Pure,
/// unit-tested.
pub fn antispam_chunks<T: Clone>(ids: &[T], size: usize) -> Vec<Vec<T>> {
    if size == 0 {
        return Vec::new();
    }
    ids.chunks(size).map(|c| c.to_vec()).collect()
}

/// Build the warn text: base template with the mentions slot
/// filled, plus the punishment-type suffix. Mirrors
/// sendWarningMessage. Pure, unit-tested.
pub fn antispam_warn_text(base: &str, suffix: &str, mentions: &str) -> String {
    format!("{}{suffix}", base.replace("${mentionedMembers}", mentions))
}

impl Handler {
    pub fn new(pool: Pool, slashlog: Arc<crate::slashlog::SlashLog>) -> Self {
        Self {
            pool,
            spam: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            antispam_msgs: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            antispam_flags: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            antispam_punish: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            antispam_deadline: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            antispam_flush: Arc::new(tokio::sync::Mutex::new(HashSet::new())),
            antispam_warn_ch: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            invites: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            invite_fetch: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            sealed: Arc::new(tokio::sync::Mutex::new(std::collections::HashSet::new())),
            security: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            slashlog,
            restoring: Arc::new(tokio::sync::Mutex::new(HashSet::new())),
            handled_audit: Arc::new(tokio::sync::Mutex::new(HashSet::new())),
            temp_pending: Arc::new(tokio::sync::Mutex::new(HashSet::new())),
            names: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            nicks: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            pic_warns: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            mailer: Arc::new(crate::mailer::Mailer::init_from_env("iHorizon")),
        }
    }

    /// File-log one slash command invocation. Mirrors the
    /// interactionCreate leg of Events/logs/slashCommandLogger.ts
    /// (bot + non-guild skipped; option values redacted by
    /// sanitizeInteractionOptionValue).
    async fn log_slash_command(&self, ctx: &serenity::Context, cmd: &serenity::CommandInteraction) {
        if cmd.user.bot {
            return;
        }
        let Some(guild_id) = cmd.guild_id else {
            return;
        };
        let guild_name = ctx
            .cache
            .guild(guild_id)
            .map(|g| g.name.clone())
            .unwrap_or_else(|| guild_id.get().to_string());
        let channel_name = cmd
            .channel_id
            .to_channel(&ctx.http)
            .await
            .ok()
            .and_then(|c| c.guild().map(|g| g.name.clone()))
            .unwrap_or_else(|| "unknown".to_string());
        let (sub, opts) = crate::slashlog::split_command_options(&cmd.data.options());
        let entry = crate::slashlog::ParsedSavedCommand {
            guild_name,
            guild_id: Some(guild_id.get().to_string()),
            executor_username: cmd.user.name.clone(),
            timestamp: chrono::Local::now().timestamp_millis(),
            channel_name,
            channel_id: cmd.channel_id.get().to_string(),
            command: crate::slashlog::format_logged_command(&sub, &opts),
        };
        self.slashlog.log(entry).await;
    }

    /// Captcha attempt handling (mirrors the collector "collect" leg
    /// in Events/security/onMemberJoin.ts): delete the attempt, pass
    /// on exact code match (role add, role2 remove, delete prompt),
    /// otherwise decrement and re-render, kicking at zero.
    async fn security_answer(&self, ctx: &serenity::Context, msg: &serenity::Message) {
        let Some(guild_id) = msg.guild_id else {
            return;
        };
        if msg.author.bot {
            return;
        }
        let key = security_key(guild_id.get(), msg.author.id.get());
        let mut guard = self.security.lock().await;
        let Some(ch) = guard.get_mut(&key) else {
            return;
        };
        if ch.channel_id != msg.channel_id.get() {
            return;
        }
        // 150s expiry enforced at answer time (mirrors the collector
        // `time: COLLECTOR_TIMEOUT_MS` end leg in onMemberJoin.ts): a stale
        // challenge — expiry task raced or kick failed — never accepts a
        // code again. The late answer is deleted, the member kicked, the
        // challenge message removed.
        if crate::commands::context::now_ms() / 1000 >= ch.expires_at {
            let (message_id, channel_id, joined_at) = (ch.message_id, ch.channel_id, ch.joined_at);
            guard.remove(&key);
            drop(guard);
            let _ = msg.delete(&ctx.http).await;
            let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
            let kick_reason =
                crate::lang::get(&lang_code, "event_security_kick_reason").unwrap_or_default();
            if let Ok(member) = guild_id.member(&ctx.http, msg.author.id).await {
                // Same-join guard (mirrors the collector "end" leg in
                // onMemberJoin.ts `if (!member.joinedAt ||
                // memberJoinDate === member.joinedAt)`): a member who left
                // and rejoined under a new join is never kicked for the
                // previous challenge.
                let same_join = member.joined_at.map(|t| t.unix_timestamp()) == joined_at;
                if member.joined_at.is_none() || same_join {
                    let _ = member.kick_with_reason(&ctx.http, &kick_reason).await;
                }
            }
            let _ = serenity::ChannelId::new(channel_id)
                .delete_message(&ctx.http, serenity::MessageId::new(message_id))
                .await;
            return;
        }
        let _ = msg.delete(&ctx.http).await;
        if msg.content == ch.code {
            let (role, role2, message_id, channel_id) =
                (ch.role, ch.role2, ch.message_id, ch.channel_id);
            guard.remove(&key);
            drop(guard);
            if guild_id.member(&ctx.http, msg.author.id).await.is_ok() {
                if let Some(r) = role {
                    let _ = crate::commands::security::grant_role(
                        &ctx.http,
                        guild_id,
                        msg.author.id,
                        serenity::RoleId::new(r),
                    )
                    .await;
                }
                if let Some(r) = role2 {
                    let _ = crate::commands::security::strip_role(
                        &ctx.http,
                        guild_id,
                        msg.author.id,
                        serenity::RoleId::new(r),
                    )
                    .await;
                }
            }
            let _ = serenity::ChannelId::new(channel_id)
                .delete_message(&ctx.http, serenity::MessageId::new(message_id))
                .await;
            return;
        }
        if ch.attempts_left <= 1 {
            let (message_id, channel_id, joined_at) = (ch.message_id, ch.channel_id, ch.joined_at);
            guard.remove(&key);
            drop(guard);
            let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
            let kick_reason =
                crate::lang::get(&lang_code, "event_security_kick_reason").unwrap_or_default();
            if let Ok(member) = guild_id.member(&ctx.http, msg.author.id).await {
                // Same-join guard, as above (onMemberJoin.ts collector
                // "end" leg): never kick a rejoined member for the old
                // challenge.
                let same_join = member.joined_at.map(|t| t.unix_timestamp()) == joined_at;
                if member.joined_at.is_none() || same_join {
                    let _ = member.kick_with_reason(&ctx.http, &kick_reason).await;
                }
            }
            let _ = serenity::ChannelId::new(channel_id)
                .delete_message(&ctx.http, serenity::MessageId::new(message_id))
                .await;
            return;
        }
        ch.attempts_left -= 1;
        let (left, message_id, channel_id, expires_at) = (
            ch.attempts_left,
            ch.message_id,
            ch.channel_id,
            ch.expires_at,
        );
        drop(guard);
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let emoji = crate::emojis::app_emoji_markup(&ctx.http, "Schedule")
            .await
            .unwrap_or_default();
        // The code lives only in the captcha.png image, never in text;
        // the timestamp reuses the pinned issue-time expiry (TS keeps
        // one `expiresAt`).
        let content = format!(
            "{}\n\n{}\n-# {}",
            text("event_security").replace("${member}", &format!("<@{}>", msg.author.id.get())),
            text("event_security_expiry")
                .replace("${timestamp}", &format!("<t:{expires_at}:R>"))
                .replace("${attempts}", &left.to_string())
                .replace("{emoji}", &emoji),
            text("event_security_footer"),
        );
        let _ = serenity::ChannelId::new(channel_id)
            .edit_message(
                &ctx.http,
                serenity::MessageId::new(message_id),
                serenity::EditMessage::new().content(content),
            )
            .await;
    }

    /// True when the channel is a plain guild text channel. Cache
    /// first, HTTP fallback; an unresolvable kind fails closed
    /// (mirrors the blockSpam.ts GuildText early return).
    async fn is_guild_text_channel(
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        channel_id: serenity::ChannelId,
    ) -> bool {
        if let Some(g) = ctx.cache.guild(guild_id) {
            if let Some(ch) = g.channels.get(&channel_id) {
                return ch.kind == serenity::ChannelType::Text;
            }
        }
        ctx.http
            .get_channel(channel_id)
            .await
            .ok()
            .and_then(|c| c.guild())
            .map(|g| g.kind == serenity::ChannelType::Text)
            .unwrap_or(false)
    }

    /// Apply one punishpub sanction (ban / kick / mute + flag-row
    /// clear). Shared by the max-flags pre-check and the
    /// post-increment check; mirrors applySanction in blockSpam.ts.
    async fn apply_punishpub_sanction(
        &self,
        ctx: &serenity::Context,
        gid: &str,
        guild_id: serenity::GuildId,
        author: serenity::UserId,
        kind: &str,
    ) {
        match kind {
            "kick" => {
                let _ = guild_id
                    .kick_with_reason(&ctx.http, author, "Kick by PunishPub")
                    .await;
            }
            "mute" => {
                if let Ok(member) = guild_id.member(&ctx.http, author).await {
                    let mut member = member;
                    if let Ok(until) = serenity::Timestamp::from_unix_timestamp(
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_secs() as i64)
                            .unwrap_or(0)
                            + 40,
                    ) {
                        let _ = member
                            .disable_communication_until_datetime(&ctx.http, until)
                            .await;
                    }
                }
                // Warn entry (mirrors the blockSpam.ts `mute` leg:
                // `member.timeout(40000, "Timeout by PunishPUB")` +
                // `warnMember(..., "Timeout by PunishPUB", lang)`).
                // The serenity timeout call carries no audit-log
                // reason, so the reason lives on this warn record.
                let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                // Clone owned values out of the cache guards at once:
                // the guards themselves are not Send and must not be
                // held across the awaits below.
                let bot_name = ctx.cache.current_user().name.clone();
                let bot_id = ctx.cache.current_user().id.get();
                let guild_name = ctx.cache.guild(guild_id).map(|gd| gd.name.clone());
                // Message author for the warn record (HTTP fetch:
                // the cache user may be missing; without it the
                // timeout still applies but no warn row is written).
                if let Ok(target) = ctx.http.get_user(author).await {
                    crate::commands::moderation::warn_member_with_author(
                        &crate::commands::moderation::WarnContext {
                            http: &ctx.http,
                            guild_name,
                            author_top_roles: None,
                            guild_roles: None,
                            pool: &self.pool,
                            gid,
                            guild_id,
                            author_name: &bot_name,
                            target: &target,
                            reason: "Timeout by PunishPUB",
                            lang_code: &lang_code,
                        },
                        Some(bot_id),
                    )
                    .await;
                }
            }
            _ => {
                let _ = guild_id
                    .ban_with_reason(&ctx.http, author, 0, "Ban by PUNISHPUB")
                    .await;
            }
        }
        // Exact-row clear of the flag (mirrors the post-sanction
        // `table.set(`${guildId}.PUNISH_DATA.${author}`, {})` reset in
        // blockSpam.ts, as a real delete instead of an empty-object
        // tombstone).
        let flag_key = format!("PUNISH_DATA.{gid}.{}", author.get());
        let _ = crate::db::tbl_del(&self.pool, gid, &flag_key).await;
    }

    async fn check_punishpub(&self, ctx: &serenity::Context, gid: &str, msg: &serenity::Message) {
        // Mirrors blockSpam.ts basic validation: guild, channel and
        // member present, GuildText channel only, and no webhook /
        // bot / self messages (webhook and bot messages, including
        // the bot's own, never trigger punishpub).
        let Some(guild_id) = msg.guild_id else {
            return;
        };
        if msg.webhook_id.is_some() || msg.author.bot {
            return;
        }
        if ctx.cache.current_user().id == msg.author.id {
            return;
        }
        // Member-present gate (blockSpam.ts returns without
        // message.member); an HTTP fetch covers a serenity cache
        // miss before giving up.
        let member_present =
            msg.member.is_some() || guild_id.member(&ctx.http, msg.author.id).await.is_ok();
        if !member_present {
            return;
        }
        // GuildText-only gate (blockSpam.ts `channel.type !==
        // ChannelType.GuildText` return): threads, voice channels
        // and DMs never trigger punishpub.
        if !Self::is_guild_text_channel(ctx, guild_id, msg.channel_id).await {
            return;
        }
        let antipub_off: bool = guild_config_field_routed(&self.pool, gid, "antipub")
            .await
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|v| v.as_str().map(|x| x == "off"))
            .unwrap_or(false);
        let is_staff = msg
            .member
            .as_ref()
            .map(|m| {
                m.permissions
                    .map(|p| p.administrator() || p.manage_guild())
                    .unwrap_or(false)
            })
            .unwrap_or(false);
        if antipub_off || is_staff {
            return;
        }
        // Mirrors the blockSpam.ts native Keyword rule + exemptRoles
        // gate: roles exempted on Discord's rule skip the kv sanction
        // pipeline too. Best-effort: a failed fetch sanctions as before.
        if let Some(guild_id) = msg.guild_id {
            if let Ok(rules) = guild_id.automod_rules(&ctx.http).await {
                if let Some(rule) = rules.iter().find(|r| {
                    matches!(
                        r.trigger,
                        serenity::Trigger::Keyword { .. } | serenity::Trigger::Unknown(1)
                    )
                }) {
                    let member_roles: Vec<u64> = if let Some(m) = &msg.member {
                        m.roles.iter().map(|r| r.get()).collect()
                    } else {
                        guild_id
                            .member(&ctx.http, msg.author.id)
                            .await
                            .map(|m| m.roles.iter().map(|r| r.get()).collect())
                            .unwrap_or_default()
                    };
                    if rule
                        .exempt_roles
                        .iter()
                        .any(|r| member_roles.contains(&r.get()))
                    {
                        return;
                    }
                }
            }
        }
        // PUNISH_PUB config + current flags, loaded before the link
        // analysis so the max-flags pre-check below runs on every
        // message like blockSpam.ts (which reads LOG + LOGfetched
        // right after the exemptRoles gate).
        let cfg: Option<(Option<i64>, bool, String)> = punish_pub_routed(&self.pool, gid)
            .await
            .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
            .map(|cfg| {
                (
                    cfg.get("amountMax").and_then(|n| n.as_i64()),
                    cfg.get("state").and_then(|s| s.as_str()) == Some("true"),
                    cfg.get("punishementType")
                        .and_then(|s| s.as_str())
                        .unwrap_or("ban")
                        .to_string(),
                )
            });
        let stored: Option<i64> = punish_data_routed(&self.pool, gid, msg.author.id.get())
            .await
            .and_then(|s| {
                serde_json::from_str::<serde_json::Value>(&s)
                    .ok()
                    .and_then(|v| v.get("flags").and_then(|f| f.as_i64()))
            });
        // Max-flags-any-message sanction (mirrors the
        // `LOG?.amountMax === LOGfetched?.flags` pre-check in
        // blockSpam.ts): a user already sitting at max flags is
        // sanctioned again on ANY further message, even one with no
        // sanctionable link. Quirk parity, kept on purpose; like TS
        // the pipeline continues to the link analysis afterwards.
        if let Some((max, state_on, kind)) = cfg.as_ref() {
            if *state_on && *max == stored {
                self.apply_punishpub_sanction(ctx, gid, guild_id, msg.author.id, kind)
                    .await;
            }
        }
        let links = crate::funcs::extract_links(&msg.content);
        let mut sanction = false;
        if !links.is_empty() {
            let mut all_media = true;
            let mut whitelisted = false;
            for url in &links {
                if !crate::funcs::is_media_link(url).await {
                    all_media = false;
                }
                if crate::funcs::is_whitelisted_url(url, &[]) {
                    whitelisted = true;
                }
            }
            sanction = !all_media && !whitelisted;
        }
        if !sanction && crate::funcs::has_blacklisted_term(&msg.content) {
            sanction = true;
        }
        if !sanction {
            return;
        }
        let _ = msg.delete(&ctx.http).await;
        // Flag increment runs even without a PUNISH_PUB row (mirrors
        // blockSpam.ts, which deletes + counts before consulting
        // LOG?.amountMax / LOG?.state).
        let new_flags = stored.unwrap_or(0) + 1;
        let flag_key = format!("PUNISH_DATA.{gid}.{}", msg.author.id.get());
        let _ = crate::db::tbl_set(
            &self.pool,
            gid,
            &flag_key,
            &serde_json::json!({"flags": new_flags}).to_string(),
        )
        .await;
        // Post-increment sanction (mirrors the
        // `LOG?.amountMax === newFlagsCount` check in blockSpam.ts).
        if let Some((max, state_on, kind)) = cfg.as_ref() {
            if *state_on && *max == Some(new_flags) {
                self.apply_punishpub_sanction(ctx, gid, guild_id, msg.author.id, kind)
                    .await;
            }
        }
    }

    /// Full antispam pipeline. Mirrors the messageCreate run in
    /// Events/antispam/onNewMessage.ts: bot-Administrator gate,
    /// GUILD.ANTISPAM config load, bypass roles/channels (channel +
    /// parent), then the webhook/self/owner/Administrator/ignoreBots
    /// exemptions, the sliding-window flag counting with the 8h TTL
    /// purges, and the 5s debounced punish batch on threshold.
    /// Best-effort, never panics.
    ///
    /// Runs before the bot gate in `message` (its own TS listener):
    /// bot messages are still scanned unless `ignoreBots` is set.
    async fn antispam_message(&self, ctx: &serenity::Context, msg: &serenity::Message) {
        let Some(guild_id) = msg.guild_id else {
            return;
        };
        let gid = guild_id.get().to_string();
        let bot_id = ctx.cache.current_user().id.get();
        let bot_admin = self.bot_is_admin(ctx, guild_id).await;
        let cfg = antispam_cfg_routed(&self.pool, &gid).await;
        let Some(cfg) = cfg else {
            return;
        };
        // Bypass roles + channels (channel id and its parent, like
        // the TS `BYPASS_CHANNELS.includes(parentId)` check).
        let bypass_roles: Vec<String> = antispam_bypass_roles_routed(&self.pool, &gid).await;
        let bypass_channels: Vec<String> = antispam_bypass_channels_routed(&self.pool, &gid).await;
        // Victim member via HTTP on Member cache miss (audit P3):
        // discord.js always populates `message.member`, but serenity may
        // leave it empty — without the fetch, bypass-role holders and
        // administrators would lose their exemptions on a miss.
        let http_member: Option<serenity::Member> = if msg.member.is_none() {
            guild_id.member(&ctx.http, msg.author.id).await.ok()
        } else {
            None
        };
        let eff_roles: Vec<serenity::RoleId> = msg
            .member
            .as_ref()
            .map(|m| m.roles.clone())
            .or_else(|| http_member.as_ref().map(|m| m.roles.clone()))
            .unwrap_or_default();
        let eff_admin_bit: bool = msg
            .member
            .as_ref()
            .and_then(|m| m.permissions)
            .or_else(|| http_member.as_ref().and_then(|m| m.permissions))
            .map(|p| p.administrator())
            .unwrap_or(false);
        let member_roles: Vec<String> = eff_roles.iter().map(|r| r.get().to_string()).collect();
        let parent = Self::antispam_parent_id(ctx, guild_id, msg.channel_id).await;
        let bypass = bypass_channels.contains(&msg.channel_id.get().to_string())
            || parent
                .map(|p| bypass_channels.contains(&p.to_string()))
                .unwrap_or(false)
            || member_roles.iter().any(|r| bypass_roles.contains(r));
        // Owner + Administrator snapshots (cache-only, no await while
        // the guard lives; the victim Member above already covers the
        // author-admin bit on cache miss).
        let (owner_id, author_admin) = match ctx.cache.guild(guild_id) {
            Some(g) => {
                let owner = g.owner_id.get();
                let admin = eff_admin_bit
                    || eff_roles.iter().any(|r| {
                        g.roles
                            .get(r)
                            .map(|role| role.permissions.administrator())
                            .unwrap_or(false)
                    });
                (owner, admin)
            }
            None => (0, eff_admin_bit),
        };
        let gate = AntispamGate {
            bot_admin,
            enabled: cfg.enabled,
            webhook: msg.webhook_id.is_some(),
            self_msg: msg.author.id.get() == bot_id,
            owner: msg.author.id.get() == owner_id,
            admin: author_admin,
            bot_ignored: cfg.ignore_bots && msg.author.bot,
            bypass,
        };
        if antispam_skipped(&gate) {
            return;
        }
        let now = crate::commands::context::now_ms();
        let author_id = msg.author.id.get();
        let tripped = {
            let mut stored = self.antispam_msgs.lock().await;
            let mut flags = self.antispam_flags.lock().await;
            let vec = stored.entry(gid.clone()).or_default();
            antispam_purge_old(vec, now);
            let fmap = flags.entry(gid.clone()).or_default();
            antispam_prune_flags(fmap, vec);
            let elapsed = antispam_elapsed(vec, author_id, now, cfg.max_interval_ms);
            let is_spam = antispam_gap_tripped(elapsed, cfg.max_interval_ms);
            let count = fmap.entry(author_id.to_string()).or_insert(0);
            if is_spam {
                *count = count.saturating_add(1);
            }
            let threshold_hit = antispam_threshold_tripped(*count, cfg.threshold);
            let flagged_spam = is_spam || threshold_hit;
            vec.push(CachedSpamMessage {
                message_id: msg.id.get(),
                channel_id: msg.channel_id.get(),
                author_id,
                sent_at: msg.timestamp.unix_timestamp() * 1000,
                is_spam: flagged_spam,
            });
            if threshold_hit {
                self.antispam_punish
                    .lock()
                    .await
                    .entry(gid.clone())
                    .or_default()
                    .insert(author_id);
                self.antispam_deadline
                    .lock()
                    .await
                    .insert(gid.clone(), now + ANTISPAM_DEBOUNCE_MS);
                self.antispam_warn_ch
                    .lock()
                    .await
                    .insert(gid.clone(), msg.channel_id.get());
            }
            threshold_hit
        };
        if tripped {
            self.antispam_ensure_flush(ctx, guild_id, bot_id).await;
        }
    }

    /// Parent channel id for the bypass check. Cache first, HTTP
    /// fallback. None for top-level channels. Mirrors
    /// `(message.channel as GuildBasedChannel).parentId`.
    async fn antispam_parent_id(
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        channel_id: serenity::ChannelId,
    ) -> Option<u64> {
        if let Some(g) = ctx.cache.guild(guild_id) {
            if let Some(ch) = g.channels.get(&channel_id) {
                return ch.parent_id.map(|p| p.get());
            }
        }
        ctx.http
            .get_channel(channel_id)
            .await
            .ok()
            .and_then(|c| c.guild())
            .and_then(|g| g.parent_id.map(|p| p.get()))
    }

    /// Claim the debounce flush slot and spawn the flush task.
    /// Mirrors `waitForFinish`: the task waits for 5s of quiet
    /// (deadline resets on every tripping message), then runs the
    /// punish + clear + warn + log batch once.
    async fn antispam_ensure_flush(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        bot_id: u64,
    ) {
        let gid = guild_id.get().to_string();
        {
            let mut flushing = self.antispam_flush.lock().await;
            if !flushing.insert(gid.clone()) {
                return;
            }
        }
        let this = self.clone();
        let http = ctx.http.clone();
        tokio::spawn(async move {
            loop {
                let deadline = this
                    .antispam_deadline
                    .lock()
                    .await
                    .get(&gid)
                    .copied()
                    .unwrap_or(0);
                let now = crate::commands::context::now_ms();
                if now >= deadline {
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(
                    // Clamp kept on purpose (audit P10): the re-armed
                    // sleep never overshoots the deadline nor spins at 0.
                    (deadline - now).clamp(1, 1000) as u64,
                ))
                .await;
            }
            this.antispam_flush_guild(&http, guild_id, bot_id).await;
            this.antispam_flush.lock().await.remove(&gid);
        });
    }

    /// Debounced punish batch. Mirrors the post-`waitForFinish`
    /// branch: PunishUsers, clearSpamMessages, sendWarningMessage,
    /// logsAction, then the membersToPunish clear. Best-effort.
    async fn antispam_flush_guild(
        &self,
        http: &std::sync::Arc<serenity::Http>,
        guild_id: serenity::GuildId,
        bot_id: u64,
    ) {
        let gid = guild_id.get().to_string();
        let users: Vec<u64> = self
            .antispam_punish
            .lock()
            .await
            .remove(&gid)
            .map(|s| s.into_iter().collect())
            .unwrap_or_default();
        self.antispam_deadline.lock().await.remove(&gid);
        if users.is_empty() {
            return;
        }
        let Some(cfg) = antispam_cfg_routed(&self.pool, &gid).await else {
            return;
        };
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
        // PunishUsers leg (batchSize 5 / delay 200 in TS; sequential
        // here, each call best-effort like the TS `.catch(() => {})`).
        for uid in &users {
            self.antispam_punish_user(AntispamPunish {
                http,
                guild_id,
                gid: &gid,
                user_id: *uid,
                cfg: &cfg,
                lang_code: &lang_code,
                bot_id,
            })
            .await;
        }
        // Flags clear per punished member (TS deletes inside the
        // punish batch).
        if let Some(fmap) = self.antispam_flags.lock().await.get_mut(&gid) {
            for uid in &users {
                fmap.remove(&uid.to_string());
            }
        }
        // TS always clears spam messages after punish (clearSpamMessages
        // runs unconditionally in onNewMessage.ts, no removeMessages gate).
        self.antispam_clear_guild(http, &gid, &users).await;
        let warn_ch = self.antispam_warn_ch.lock().await.remove(&gid);
        if let Some(ch) = warn_ch {
            self.antispam_warn(http, &gid, ch, &users, &cfg.punishment_type, &lang_code)
                .await;
        }
        self.antispam_log(AntispamLog {
            http,
            guild_id,
            gid: &gid,
            users: &users,
            punishment_type: &cfg.punishment_type,
            lang_code: &lang_code,
            bot_id,
        })
        .await;
    }

    /// One member sanction. Mirrors PunishUsers: mute needs
    /// ModerateMembers + role hierarchy + non-owner (then a
    /// `timeout` plus the warnMember "Antispam Punishment" entry),
    /// ban needs BanMembers + hierarchy + bannable, kick needs
    /// KickMembers + hierarchy + kickable. Best-effort, never panics.
    async fn antispam_punish_user(&self, p: AntispamPunish<'_>) {
        let AntispamPunish {
            http,
            guild_id,
            gid,
            user_id,
            cfg,
            lang_code,
            bot_id,
        } = p;
        let owner: u64 = guild_id
            .to_partial_guild(http)
            .await
            .map(|g| g.owner_id.get())
            .unwrap_or(0);
        if user_id == owner {
            return;
        }
        let roles = http.get_guild_roles(guild_id).await.unwrap_or_default();
        let bot_roles: Vec<serenity::RoleId> = guild_id
            .member(http, serenity::UserId::new(bot_id))
            .await
            .map(|m| m.roles)
            .unwrap_or_default();
        let mut bot_perms = serenity::Permissions::empty();
        let mut bot_top: u16 = 0;
        for r in &roles {
            if bot_roles.contains(&r.id) {
                bot_perms |= r.permissions;
                bot_top = bot_top.max(r.position);
            }
            if r.id.get() == guild_id.get() {
                bot_perms |= r.permissions;
            }
        }
        if bot_perms.administrator() {
            bot_perms = serenity::Permissions::all();
        }
        let target = guild_id
            .member(http, serenity::UserId::new(user_id))
            .await
            .ok();
        let target_top: Option<u16> = target.as_ref().map(|m| {
            m.roles
                .iter()
                .filter_map(|id| roles.iter().find(|r| &r.id == id))
                .map(|r| r.position)
                .max()
                .unwrap_or(0)
        });
        let outranked = target_top.map(|t| bot_top > t).unwrap_or(false);
        match cfg.punishment_type.trim().to_ascii_lowercase().as_str() {
            "mute" => {
                let Some(member) = target else {
                    return;
                };
                if !bot_perms.moderate_members() || !outranked {
                    return;
                }
                let mut member = member;
                // Clamp kept on purpose (audit P11): Discord timeouts
                // reject >28 days, and 0 would mean "no timeout".
                let secs = (cfg.punish_time_ms / 1000).clamp(1, 28 * 24 * 60 * 60);
                let now_secs = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                if let Ok(until) = serenity::Timestamp::from_unix_timestamp(now_secs + secs) {
                    let _ = member
                        .disable_communication_until_datetime(http, until)
                        .await;
                }
                // warnMember "Antispam Punishment" entry (TS
                // `member.client.func.method.warnMember(...,
                // "Antispam Punishment", lang).catch(() => {})`).
                if let Ok(target_user) = serenity::UserId::new(user_id).to_user(http).await {
                    let guild_name = guild_id
                        .to_partial_guild(http)
                        .await
                        .map(|g| g.name)
                        .unwrap_or_else(|_| "this server".to_string());
                    let bot_name = http
                        .get_current_user()
                        .await
                        .map(|u| u.name.clone())
                        .unwrap_or_default();
                    let guild_roles = roles
                        .iter()
                        .map(|r| (r.id, (r.name.clone(), r.position)))
                        .collect();
                    crate::commands::moderation::warn_member_with_author(
                        &crate::commands::moderation::WarnContext {
                            http,
                            guild_name: Some(guild_name),
                            author_top_roles: Some(bot_roles),
                            guild_roles: Some(guild_roles),
                            pool: &self.pool,
                            gid,
                            guild_id,
                            author_name: &bot_name,
                            target: &target_user,
                            reason: "Antispam Punishment",
                            lang_code,
                        },
                        Some(bot_id),
                    )
                    .await;
                }
            }
            "ban" => {
                if !bot_perms.ban_members() {
                    return;
                }
                if target.is_some() && !outranked {
                    return;
                }
                let _ = guild_id
                    .ban_with_reason(http, serenity::UserId::new(user_id), 0, "Spamming!")
                    .await;
            }
            "kick" => {
                if !bot_perms.kick_members() {
                    return;
                }
                if target.is_some() && !outranked {
                    return;
                }
                let _ = guild_id
                    .kick_with_reason(http, serenity::UserId::new(user_id), "Spamming!")
                    .await;
            }
            // No default arm in the TS switch (onNewMessage.ts punish
            // branch): an unknown punishment type is a no-op. Verdict
            // (kept): never fall through to kick here.
            _ => {}
        }
    }

    /// Bulk-delete pass. Mirrors clearSpamMessages: spam-flagged
    /// messages plus every message of punished authors, grouped by
    /// channel, 15 ids per bulkDelete, 3 channels per batch with
    /// 100ms pacing. Deleted ids leave the cache, like TS.
    async fn antispam_clear_guild(
        &self,
        http: &std::sync::Arc<serenity::Http>,
        gid: &str,
        users: &[u64],
    ) {
        let punished: HashSet<u64> = users.iter().copied().collect();
        let doomed: Vec<(u64, u64)> = {
            let mut stored = self.antispam_msgs.lock().await;
            let Some(vec) = stored.get_mut(gid) else {
                return;
            };
            let pick: Vec<(u64, u64)> = vec
                .iter()
                .filter(|m| m.is_spam || punished.contains(&m.author_id))
                .map(|m| (m.channel_id, m.message_id))
                .collect();
            vec.retain(|m| !(m.is_spam || punished.contains(&m.author_id)));
            pick
        };
        if doomed.is_empty() {
            return;
        }
        let mut by_channel: Vec<(u64, Vec<u64>)> = Vec::new();
        for (ch, id) in doomed {
            match by_channel.iter_mut().find(|(c, _)| *c == ch) {
                Some((_, ids)) => ids.push(id),
                None => by_channel.push((ch, vec![id])),
            }
        }
        for batch in by_channel.chunks(ANTISPAM_CHANNEL_BATCH) {
            for (ch, ids) in batch {
                let channel = serenity::ChannelId::new(*ch);
                for chunk in antispam_chunks(ids, ANTISPAM_BULK_CHUNK) {
                    let mids: Vec<serenity::MessageId> = chunk
                        .iter()
                        .map(|id| serenity::MessageId::new(*id))
                        .collect();
                    // bulkDelete(chunk, true) filters >14d messages;
                    // fall back to single deletes when the bulk call
                    // rejects the chunk, best-effort either way.
                    if channel.delete_messages(http, &mids).await.is_err() {
                        for mid in mids {
                            let _ = http.delete_message(channel, mid, None).await;
                        }
                    }
                }
            }
            tokio::time::sleep(std::time::Duration::from_millis(
                ANTISPAM_CHANNEL_BATCH_DELAY_MS,
            ))
            .await;
        }
    }

    /// Warn message with the punishment suffix, self-deleting after
    /// 4s. Mirrors sendWarningMessage. Best-effort.
    async fn antispam_warn(
        &self,
        http: &std::sync::Arc<serenity::Http>,
        gid: &str,
        channel_id: u64,
        users: &[u64],
        punishment_type: &str,
        lang_code: &str,
    ) {
        let _ = gid;
        let valid: Vec<u64> = users.to_vec();
        if valid.is_empty() {
            return;
        }
        let text = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
        let mentions: String = valid
            .iter()
            .map(|u| format!("<@{u}>"))
            .collect::<Vec<_>>()
            .join(", ");
        let suffix = match punishment_type.trim().to_ascii_lowercase().as_str() {
            "mute" => text("antispam_more_mute_msg"),
            "kick" => text("antispam_more_kick_msg"),
            "ban" => text("antispam_more_ban_msg"),
            _ => String::new(),
        };
        let content = antispam_warn_text(&text("antispam_base_warn_message"), &suffix, &mentions);
        if content.trim().is_empty() {
            return;
        }
        if let Ok(sent) = serenity::ChannelId::new(channel_id)
            .send_message(http, serenity::CreateMessage::new().content(content))
            .await
        {
            let http = http.clone();
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(ANTISPAM_WARN_DELETE_SECS)).await;
                let _ = http.delete_message(sent.channel_id, sent.id, None).await;
            });
        }
    }

    /// Moderation log embed. Mirrors logsAction:
    /// GUILD.SERVER_LOGS.antispam channel, `#e4433f` embed titled
    /// `antispam_log_embed_title` with the sanction type, description
    /// with the bot mention, the literal "sanction" action and the
    /// punished mentions. Silent without a log channel, like TS.
    async fn antispam_log(&self, l: AntispamLog<'_>) {
        let AntispamLog {
            http,
            guild_id,
            gid,
            users,
            punishment_type,
            lang_code,
            bot_id,
        } = l;
        if users.is_empty() {
            return;
        }
        let text = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
        let logs_ch: Option<u64> =
            crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                &self.pool, gid, "antispam",
            )
            .await
            .and_then(|s| s.parse().ok());
        let Some(logs_ch) = logs_ch else {
            return;
        };
        let sanction = punishment_type.trim().to_ascii_lowercase();
        let mentions: String = users
            .iter()
            .map(|u| format!("<@{u}>"))
            .collect::<Vec<_>>()
            .join(",");
        let embed = serenity::CreateEmbed::default()
            .colour(0xe4433f_u32)
            .title(text("antispam_log_embed_title").replace("${actionType}", &sanction))
            .description(
                text("antispam_log_embed_desc")
                    .replace("${client.user?.toString()}", &format!("<@{bot_id}>"))
                    .replace("${actionType}", "sanction")
                    .replace("${user.toString()}", &mentions),
            )
            .timestamp(serenity::Timestamp::now());
        let _ = serenity::ChannelId::new(logs_ch)
            .send_message(http, serenity::CreateMessage::new().embed(embed))
            .await;
        let _ = guild_id;
    }

    /// Moderation audit embed (mirrors logs/addBanLogs.ts,
    /// removeBanLogs.ts, kickLogs.ts): latest audit entry for the
    /// action -> #010101 embed with the Reason field, posted to
    /// GUILD.SERVER_LOGS.moderation. Silent when no log channel or
    /// no audit entry, like TS. Executor comes from the audit entry;
    /// target from the caller.
    async fn mod_audit_log(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        action: serenity::model::guild::audit_log::Action,
        desc_key: &str,
        target_id: u64,
        target_name: Option<&str>,
    ) {
        let gid = guild_id.get().to_string();
        let logs_ch: Option<u64> =
            crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                &self.pool,
                &gid,
                "moderation",
            )
            .await
            .and_then(|s| s.parse().ok());
        let Some(logs_ch) = logs_ch else {
            return;
        };
        let Ok(logs) = guild_id
            .audit_logs(&ctx.http, Some(action), None, None, Some(1))
            .await
        else {
            return;
        };
        let Some(entry) = logs.entries.first() else {
            return;
        };
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let desc = text(desc_key)
            .replace(
                "${firstEntry.executor.id}",
                &entry.user_id.get().to_string(),
            )
            .replace("${firstEntry.target.id}", &target_id.to_string())
            .replace("${firstEntry.target.username}", target_name.unwrap_or(""));
        let reason = entry
            .reason
            .clone()
            .unwrap_or_else(|| text("blacklist_var_no_reason"));
        let embed = serenity::CreateEmbed::default()
            .colour(0x010101_u32)
            .description(desc)
            .field(
                text("event_srvLogs_banAdd_fields_name"),
                text("event_srvLogs_banAdd_fields_value").replace("{reason}", &reason),
                false,
            )
            .timestamp(serenity::Timestamp::now());
        let _ = serenity::ChannelId::new(logs_ch)
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }

    /// Autoreact emitter. Extracted from the message handler so the
    /// master switch gates it cleanly.
    async fn autoreact_emit(
        pool: &crate::db::Pool,
        http: &std::sync::Arc<poise::serenity_prelude::Http>,
        gid: &str,
        msg: &serenity::Message,
    ) {
        let list = crate::commands::guildconfig::autoreact::load_autoreact_routed(pool, gid).await;
        if list.is_empty() {
            return;
        }
        for emoji in crate::commands::guildconfig::autoreact_for_channel(
            &list,
            &msg.channel_id.get().to_string(),
        ) {
            let reaction = if let Ok(id) = emoji.parse::<u64>() {
                serenity::ReactionType::Custom {
                    animated: false,
                    id: serenity::EmojiId::new(id),
                    name: None,
                }
            } else {
                serenity::ReactionType::Unicode(emoji.clone())
            };
            let _ = msg.react(http, reaction).await;
        }
    }

    async fn automod_on(&self, guild_id: &str, kind: &str) -> bool {
        automod_flag_routed(&self.pool, guild_id, kind).await
    }

    /// Anti-raid guard. Mirrors Events/protection/avoid*.ts with
    /// PROTECTION.<rule> {mode} + PROTECTION.SANCTION + ALLOWLIST keys:
    /// attribute via getLogs semantics (target-id match, 20s recency,
    /// handled-set dedup), skip owner/allowlisted/bot, apply the
    /// configured sanction otherwise. Returns the hit on sanction so
    /// callers can run their restore leg (channel delete, ban lift,
    /// re-ban, webhook delete, guild-field revert). Never panics.
    /// Ordering note (audit S4): the avoid*.ts flows fetch the audit log
    /// (`getLogs`) before the bot-perm and mode checks, while this guard
    /// checks the rule mode and the bot gate first and only then fetches
    /// the audit log. Same sanction outcome in every leg (a missing grant
    /// or a non-sanctioning mode never sanctions either way); the reorder
    /// only skips a wasted audit-log fetch.
    async fn protection_guard(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        action: serenity::model::guild::audit_log::Action,
        rule: &str,
        target_id: Option<u64>,
    ) -> Option<ProtectionHit> {
        use crate::commands::protection::protect as protect_cmd;
        let gid = guild_id.get().to_string();
        // TS rule vocabulary: only `allowlist` / `nobody` modes sanction;
        // `member` (and absent rows) leave everyone alone. Strict on
        // purpose (audit P9 kept): TS checks `if (data.<rule>)` then the
        // inner mode, so a `member`-mode rule never sanctions either —
        // same outcome, no divergence.
        let mode: String = protection_rule_routed(&self.pool, &gid, rule)
            .await
            .map(|r| r.effective_mode().to_string())
            .unwrap_or_else(|| "member".to_string());
        if mode != "allowlist" && mode != "nobody" {
            return None;
        }
        // Per-rule bot-permission gate (audit P2) before attribution:
        // without the grant the bot can neither read the audit log nor
        // revert, so no one is sanctioned.
        if !self.protection_bot_gate(ctx, guild_id, rule).await {
            return None;
        }
        // Attribution (mirrors getLogs in Events/protection/ready.ts):
        // scan the recent entries for a target-id match inside the 20s
        // window instead of trusting the latest entry blindly.
        let Ok(logs) = guild_id
            .audit_logs(
                &ctx.http,
                Some(action),
                None,
                None,
                Some(AUDIT_LOG_FETCH_LIMIT),
            )
            .await
        else {
            return None;
        };
        let bot_id = ctx.cache.current_user().id.get();
        let now_ms = chrono::Local::now().timestamp_millis();
        let entry = logs.entries.iter().find(|e| {
            audit_entry_relevant(
                e.target_id.map(|t| t.get()),
                e.user_id.get(),
                bot_id,
                e.id.created_at().unix_timestamp() * 1000,
                now_ms,
                target_id,
            )
        })?;
        let exec = entry.user_id;
        let entry_target = entry.target_id.map(|t| t.get());
        let entry_key = entry.id.get().to_string();
        // Handled-set dedup (mirrors handledAuditLogEntries in
        // ready.ts): each audit entry sanctions at most once.
        if !self.handled_audit.lock().await.insert(entry_key) {
            return None;
        }
        // Derogations are exempt from protection sanctions.
        let derogated: bool = derogated_routed(&self.pool, &gid, exec.get()).await;
        if derogated {
            return None;
        }
        // Mode enforcement mirrors avoid*.ts: `allowlist` sanctions
        // anyone without an allowlist entry; `nobody` sanctions anyone
        // but the guild owner. Verdict (kept, nested on purpose): the
        // allowlist lookup stays nested inside the `allowlist` arm only,
        // exactly like the TS `if (data.<rule>.mode === "allowlist")`
        // branch — no cross-mode allowlist exemption exists in either
        // path, so keep it nested and deliberate.
        let should = match mode.as_str() {
            "allowlist" => allowlist_entry_routed(&self.pool, &gid, exec.get())
                .await
                .is_none(),
            _ => {
                let owner = guild_id
                    .to_partial_guild(&ctx.http)
                    .await
                    .map(|g| g.owner_id)
                    .ok();
                Some(exec) != owner
            }
        };
        if !should {
            return None;
        }
        // OWNER-table entries are derogated too (mirrors `!isOwner`,
        // reading the top-level `<gid>.OWNER.<uid>` row first).
        if owner_exempt_routed(&self.pool, &gid, exec.get()).await {
            return None;
        }
        // Unban-first-then-punish (audit P6): avoidBanMember.ts lifts the
        // victim's ban BEFORE punish() runs on the executor. The victim
        // is the audit target, already in hand; placed after the
        // exemption checks so only sanctioned flows unban.
        if rule == "banmembers" {
            if let Some(victim) = target_id {
                let _ = guild_id
                    .unban(&ctx.http, serenity::UserId::new(victim))
                    .await;
            }
        }
        // TS punish(): `simply` only cancels the action (the caller's
        // restore leg); the +derank / +ban suffixes add the sanction.
        let sanction: String = protection_sanction_routed(&self.pool, &gid)
            .await
            .unwrap_or_else(|| "simply".to_string());
        protect_cmd::apply_sanction(&ctx.http, guild_id, exec, &sanction, "Protect!").await;
        // Mirrors ihorizon_logs.ts: report to the ihorizon-logs channel.
        // Kept on purpose (audit P13): the extra confirmation embed is
        // wanted even though no avoid*.ts file sends one itself.
        if let Ok(channels) = guild_id.channels(&ctx.http).await {
            let list: Vec<(u64, String)> = channels
                .iter()
                .map(|(id, c)| (id.get(), c.name.clone()))
                .collect();
            if let Some(log_id) = crate::funcs::logs_channel_id(&list) {
                // No embed title by default (audit S9): no avoid*.ts file
                // sends a titled log embed, so the hit report carries only
                // the sanction description.
                let _ = serenity::ChannelId::new(log_id)
                    .send_message(
                        &ctx.http,
                        serenity::CreateMessage::new().embed(
                            serenity::CreateEmbed::default()
                                .description(format!("Sanction {sanction} applied to <@{exec}>."))
                                .colour(0xBF0BB9),
                        ),
                    )
                    .await;
            }
        }
        Some(ProtectionHit {
            executor: exec,
            entry_target,
        })
    }

    /// Claim the per-guild restore slot. Returns false when a restore
    /// is already running (caller must skip). Mirrors the
    /// restorationInProgress.get check in avoidChannelDelete.ts.
    async fn restore_claim(&self, guild_id: &str) -> bool {
        restore_slot_claim(&mut *self.restoring.lock().await, guild_id)
    }

    /// Release the per-guild restore slot. Mirrors the `finally`
    /// restorationInProgress.delete in avoidChannelDelete.ts.
    async fn restore_release(&self, guild_id: &str) {
        restore_slot_release(&mut *self.restoring.lock().await, guild_id);
    }

    /// Bot administrator gate. Mirrors the members.me Administrator
    /// check at the top of avoidChannelDelete.ts / avoidRoleDelete.ts.
    async fn bot_is_admin(&self, ctx: &serenity::Context, guild_id: serenity::GuildId) -> bool {
        self.bot_effective_perms(ctx, guild_id)
            .await
            .administrator()
    }

    /// Effective guild-level permissions of the bot. Cache first, HTTP
    /// member fetch on cache miss (mirrors the `members.me` resolution
    /// in the avoid*.ts guards). Empty when unresolvable (fail-closed:
    /// gates deny, never allow).
    async fn bot_effective_perms(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
    ) -> serenity::Permissions {
        let bot = ctx.cache.current_user().id;
        // Snapshot out of the cache without holding the !Send guard
        // across an await.
        let cached: Option<(serenity::Guild, serenity::Member)> = ctx
            .cache
            .guild(guild_id)
            .and_then(|g| g.members.get(&bot).cloned().map(|m| (g.clone(), m)));
        if let Some((guild, member)) = cached {
            return guild.member_permissions(&member);
        }
        // Cache miss: fetch our member row, then compute against the
        // cached roles.
        if let Ok(member) = guild_id.member(&ctx.http, bot).await {
            if let Some(guild) = ctx.cache.guild(guild_id).map(|g| g.clone()) {
                return guild.member_permissions(&member);
            }
        }
        serenity::Permissions::empty()
    }

    /// ViewAuditLog + ManageGuild gate. Mirrors the attribution perm
    /// checks in avoidBanMember.ts / avoidUnbanMember.ts / the inner
    /// avoidKickMember.ts check (`permissions.has([ViewAuditLog,
    /// ManageGuild])` requires both bits).
    async fn bot_can_audit(&self, ctx: &serenity::Context, guild_id: serenity::GuildId) -> bool {
        let perms = self.bot_effective_perms(ctx, guild_id).await;
        perms.view_audit_log() && perms.manage_guild()
    }

    /// ManageRoles gate. Mirrors the `members.me` ManageRoles early
    /// return at the top of guildconfig/joinRole.ts and
    /// utils/supportModule.ts: without it every role add/remove
    /// below would fail.
    async fn bot_can_manage_roles(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
    ) -> bool {
        self.bot_effective_perms(ctx, guild_id).await.manage_roles()
    }

    /// Per-rule bot-permission gate (audit P2). Mirrors the `members.me`
    /// early returns at the top of each Events/protection/avoid*.ts
    /// file, evaluated BEFORE audit-log attribution like the
    /// channel/role/guild/webhook/kick legs. The ban/unban
    /// ViewAuditLog+ManageGuild checks sit after getLogs in TS; they run
    /// up-front here instead so a missing grant never sanctions.
    /// `updatemember` / `add_admin_roles` carry no bot gate in TS, so
    /// they stay gateless on purpose.
    async fn protection_bot_gate(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        rule: &str,
    ) -> bool {
        match rule {
            "webhook" | "updateguild" | "createchannel" | "updatechannel" | "deletechannel"
            | "createrole" | "deleterole" | "updaterole" => self.bot_is_admin(ctx, guild_id).await,
            "kickmember" => {
                // avoidKickMember.ts: outer Administrator gate plus the
                // ViewAuditLog+ManageGuild attribution gate.
                self.bot_is_admin(ctx, guild_id).await && self.bot_can_audit(ctx, guild_id).await
            }
            "banmembers" | "unbanmembers" => self.bot_can_audit(ctx, guild_id).await,
            _ => true,
        }
    }

    /// Clone-restore one snapshot channel: name, type, position,
    /// permission overwrites and parent. Mirrors the create-channel
    /// branch of avoidChannelDelete.ts.
    async fn create_snapshot_channel(
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        entry: &crate::commands::protection::backup::BackupChannel,
        parent: Option<serenity::ChannelId>,
        reason: Option<&str>,
    ) -> Option<serenity::GuildChannel> {
        let mut builder = serenity::CreateChannel::new(entry.name.clone())
            .kind(entry.kind)
            .position(entry.position)
            .permissions(entry.permissions.clone());
        if let Some(parent) = parent {
            builder = builder.category(parent);
        }
        if let Some(reason) = reason {
            builder = builder.audit_log_reason(reason);
        }
        guild_id.create_channel(&ctx.http, builder).await.ok()
    }

    /// Clone-restore a deleted channel or category from the structure
    /// snapshot. Mirrors avoidChannelDelete.ts: category recreates
    /// with its missing children (300ms pacing), a plain channel
    /// recreates with perms/parent/position. Best-effort, never panics.
    async fn restore_deleted_channel(
        &self,
        ctx: &serenity::Context,
        channel: &serenity::GuildChannel,
        executor: Option<u64>,
    ) {
        let gid = channel.guild_id.get().to_string();
        if !self.bot_is_admin(ctx, channel.guild_id).await {
            return;
        }
        if !self.restore_claim(&gid).await {
            return;
        }
        self.restore_deleted_channel_inner(ctx, channel, executor)
            .await;
        self.restore_release(&gid).await;
    }

    async fn restore_deleted_channel_inner(
        &self,
        ctx: &serenity::Context,
        channel: &serenity::GuildChannel,
        executor: Option<u64>,
    ) {
        use crate::commands::protection::backup as backup_mod;
        let gid = channel.guild_id.get().to_string();
        let Some(backup) = backup_mod::load_backup(&self.pool, &gid).await else {
            return;
        };
        let blame = executor.map(|e| e.to_string()).unwrap_or_default();
        let cat_reason = format!("Category re-created by Protect ({blame})");
        let chan_reason = format!("Restoration by Protect ({blame})");
        // Live snapshot for the full sweep (mirrors the cache reads in
        // avoidChannelDelete.ts).
        let live = channel
            .guild_id
            .channels(&ctx.http)
            .await
            .unwrap_or_default();
        let live_ids: HashSet<String> = live.keys().map(|id| id.get().to_string()).collect();
        let live_parents: HashMap<String, Option<String>> = live
            .iter()
            .map(|(id, c)| {
                (
                    id.get().to_string(),
                    c.parent_id.map(|p| p.get().to_string()),
                )
            })
            .collect();
        // Pass 1 (mirrors the categoryMap loop): every snapshot category
        // exists afterwards; snapshot id -> live id mapping for the
        // children pass.
        let mut category_map: HashMap<String, serenity::ChannelId> = HashMap::new();
        for cat in backup_mod::missing_categories(&backup, &live_ids) {
            let still_missing = !channel
                .guild_id
                .channels(&ctx.http)
                .await
                .map(|m| m.keys().map(|id| id.get().to_string()).any(|s| s == cat.id))
                .unwrap_or(false);
            if !still_missing {
                continue;
            }
            let builder = serenity::CreateChannel::new(cat.name.clone())
                .kind(serenity::ChannelType::Category)
                .position(cat.position)
                .audit_log_reason(&cat_reason);
            if let Ok(new_cat) = channel.guild_id.create_channel(&ctx.http, builder).await {
                category_map.insert(cat.id.clone(), new_cat.id);
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            }
        }
        for cat in &backup.categories {
            if category_map.contains_key(&cat.id) {
                continue;
            }
            if let Some((id, _)) = live.iter().find(|(id, _)| id.get().to_string() == cat.id) {
                category_map.insert(cat.id.clone(), *id);
            }
        }
        // Pass 2 (mirrors the create-channel loop): missing snapshot
        // children are recreated under their mapped category.
        for cat in &backup.categories {
            let Some(live_cat) = category_map.get(&cat.id) else {
                continue;
            };
            for child in backup_mod::category_children_to_create(&backup, &cat.id, &live_ids) {
                let _ = Self::create_snapshot_channel(
                    ctx,
                    channel.guild_id,
                    child,
                    Some(*live_cat),
                    Some(&chan_reason),
                )
                .await;
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            }
        }
        // Pass 3 (mirrors the setParent/setPosition loop): live channels
        // that drifted out of their snapshot category move back.
        for (entry, want_parent, position) in
            backup_mod::channels_to_reparent(&backup, &live_parents)
        {
            let Some(live_cat) = category_map.get(&want_parent) else {
                continue;
            };
            let Some(live_id) = entry.id.parse::<u64>().ok().map(serenity::ChannelId::new) else {
                continue;
            };
            let Some(mut live_chan) = live.get(&live_id).cloned() else {
                continue;
            };
            let builder = serenity::EditChannel::new()
                .category(*live_cat)
                .position(position);
            let _ = live_chan.edit(&ctx.http, builder).await;
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        }
        // Pass 4: snapshot top-level channels with no snapshot parent that
        // are still missing (uncategorized text channels, which the
        // category passes never cover) recreate top-level.
        // Verdict (deliberate extension, no TS counterpart):
        // avoidChannelDelete.ts only rebuilds categories plus their
        // categorized children, so an uncategorized top-level channel
        // would otherwise never come back.
        for entry in &backup.channels {
            if live_ids.contains(&entry.id) || entry.parent.is_some() {
                continue;
            }
            let _ = Self::create_snapshot_channel(
                ctx,
                channel.guild_id,
                entry,
                None,
                Some(&chan_reason),
            )
            .await;
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        }
    }

    /// Rebuild a deleted role from the event payload (name, permissions,
    /// colour, hoist, mentionable, position via EditRole::from_role,
    /// mirroring the TS `...role` spread) and re-add the snapshot
    /// members. Mirrors avoidRoleDelete.ts. Best-effort, never panics.
    async fn restore_deleted_role(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        removed_role_id: serenity::RoleId,
        removed: &Option<serenity::Role>,
        executor: Option<u64>,
    ) {
        if !self.bot_is_admin(ctx, guild_id).await {
            return;
        }
        let Some(deleted) = removed else {
            return;
        };
        let blame = executor.map(|e| e.to_string()).unwrap_or_default();
        let gid = guild_id.get().to_string();
        let backup = crate::commands::protection::backup::load_backup(&self.pool, &gid).await;
        let members: Vec<u64> = backup
            .as_ref()
            .map(|b| {
                crate::commands::protection::backup::role_members(
                    b,
                    &removed_role_id.get().to_string(),
                )
                .iter()
                .filter_map(|s| s.parse::<u64>().ok())
                .collect()
            })
            .unwrap_or_default();
        let reason = format!("Role re-create by Protect ({blame} break the rule!)");
        let builder = serenity::EditRole::from_role(deleted)
            .position(deleted.position)
            .audit_log_reason(&reason);
        let Ok(new_role) = guild_id.create_role(&ctx.http, builder).await else {
            return;
        };
        // Post-create position set (mirrors avoidRoleDelete.ts
        // `await newRole.setPosition(role.rawPosition)`): the create
        // payload carries no operative position, the reorder happens here.
        let _ = guild_id
            .edit_role(
                &ctx.http,
                new_role.id,
                serenity::EditRole::new().position(deleted.position),
            )
            .await;
        for uid in members {
            if let Ok(member) = guild_id.member(&ctx.http, serenity::UserId::new(uid)).await {
                let _ = member.add_role(&ctx.http, new_role.id).await;
            }
        }
    }

    /// Role-field revert. Mirrors avoidRoleUpdate.ts
    /// (`newRole.edit({...oldRole, colors})`): after punish ran inside
    /// the guard, the pre-update snapshot is written back onto the role.
    /// Best-effort, never panics.
    async fn revert_role_edit(
        &self,
        ctx: &serenity::Context,
        new: &serenity::Role,
        old: &serenity::Role,
    ) {
        if !role_revert_needed(old, new) {
            return;
        }
        let builder = serenity::EditRole::from_role(old).audit_log_reason("Protect!");
        let _ = new.guild_id.edit_role(&ctx.http, new.id, builder).await;
    }

    /// Channel-field revert. Mirrors avoidChannelUpdate.ts: after punish
    /// ran inside the guard, the pre-update snapshot (name, permission
    /// overwrites, parent, position, plus text topic/nsfw/rate-limit and
    /// voice bitrate/user-limit/rtc-region) is written back in one edit.
    /// Best-effort, never panics.
    async fn revert_channel_edit(
        &self,
        ctx: &serenity::Context,
        new: &serenity::GuildChannel,
        old: &serenity::GuildChannel,
    ) {
        if !channel_revert_needed(old, new) {
            return;
        }
        let mut builder = serenity::EditChannel::new()
            .name(old.name.clone())
            .permissions(old.permission_overwrites.clone())
            .category(old.parent_id)
            .position(old.position)
            .nsfw(old.nsfw)
            .voice_region(old.rtc_region.clone())
            .audit_log_reason("Protect!");
        if let Some(topic) = old.topic.clone() {
            builder = builder.topic(topic);
        }
        if let Some(slowmode) = old.rate_limit_per_user {
            builder = builder.rate_limit_per_user(slowmode);
        }
        if let Some(bitrate) = old.bitrate {
            builder = builder.bitrate(bitrate);
        }
        if let Some(limit) = old.user_limit {
            builder = builder.user_limit(limit);
        }
        let mut live = new.clone();
        let _ = live.edit(&ctx.http, builder).await;
    }

    /// Guild-field revert. Mirrors avoidGuildEdit.ts: after punish ran
    /// inside the guard, each field that drifted from the pre-update
    /// snapshot is written back in one edit. The icon re-uploads the
    /// snapshot CDN bytes (discord.js setIcon re-uploads too) and the
    /// MFA level goes through its dedicated endpoint; both best-effort.
    /// Never panics.
    async fn revert_guild_edit(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        old: &serenity::Guild,
        new: &serenity::PartialGuild,
    ) {
        // Icon bytes up front: EditGuild::icon needs a fresh upload, and
        // a failed download must not block the other fields.
        let icon_changed = old.icon != new.icon;
        let icon_attachment: Option<serenity::CreateAttachment> = if icon_changed {
            match &old.icon {
                Some(hash) => {
                    let url = guild_icon_cdn_url(guild_id.get(), hash);
                    let mut bytes: Option<Vec<u8>> = None;
                    if let Ok(resp) = reqwest::get(&url).await {
                        if let Ok(body) = resp.bytes().await {
                            bytes = Some(body.to_vec());
                        }
                    }
                    bytes.map(|b| serenity::CreateAttachment::bytes(b, "icon.png"))
                }
                None => None,
            }
        } else {
            None
        };
        let mut builder = serenity::EditGuild::new();
        let mut dirty = false;
        if old.name != new.name {
            builder = builder.name(old.name.clone());
            dirty = true;
        }
        let afk_changed = match (&old.afk_metadata, &new.afk_metadata) {
            (Some(o), Some(n)) => {
                o.afk_channel_id != n.afk_channel_id || o.afk_timeout != n.afk_timeout
            }
            (None, None) => false,
            _ => true,
        };
        if afk_changed {
            match &old.afk_metadata {
                Some(o) => {
                    builder = builder
                        .afk_channel(Some(o.afk_channel_id))
                        .afk_timeout(o.afk_timeout);
                }
                None => {
                    builder = builder.afk_channel(None);
                }
            }
            dirty = true;
        }
        if old.banner != new.banner {
            builder = builder.banner(old.banner.clone());
            dirty = true;
        }
        if old.default_message_notifications != new.default_message_notifications {
            builder =
                builder.default_message_notifications(Some(old.default_message_notifications));
            dirty = true;
        }
        let old_splash = old.discovery_splash.as_ref().map(|h| h.to_string());
        let new_splash = new.discovery_splash.as_ref().map(|h| h.to_string());
        if old_splash != new_splash {
            builder = builder.discovery_splash(old_splash);
            dirty = true;
        }
        if old.explicit_content_filter != new.explicit_content_filter {
            builder = builder.explicit_content_filter(Some(old.explicit_content_filter));
            dirty = true;
        }
        if old.preferred_locale != new.preferred_locale {
            builder = builder.preferred_locale(Some(old.preferred_locale.clone()));
            dirty = true;
        }
        if old.premium_progress_bar_enabled != new.premium_progress_bar_enabled {
            builder = builder.premium_progress_bar_enabled(old.premium_progress_bar_enabled);
            dirty = true;
        }
        if icon_changed {
            match icon_attachment.as_ref() {
                Some(att) => {
                    builder = builder.icon(Some(att));
                    dirty = true;
                }
                // Snapshot has no icon: clear it like setIcon(null).
                None if old.icon.is_none() => {
                    builder = builder.delete_icon();
                    dirty = true;
                }
                // Icon download failed: leave the icon alone, still
                // revert the other fields.
                None => {}
            }
        }
        if dirty {
            let _ = guild_id.edit(&ctx.http, builder).await;
        }
        if old.mfa_level != new.mfa_level {
            // No EditGuild setter (mirrors setMFALevel): dedicated
            // endpoint, best-effort like every other revert leg.
            let _ = guild_id
                .edit_mfa_level(&ctx.http, old.mfa_level, Some("Protect!"))
                .await;
        }
    }

    async fn guild_key(&self, guild_id: u64) -> String {
        guild_id.to_string()
    }

    /// Voice state log (mirrors logs/voiceLogs.ts): #010101 embed
    /// for leave / join / self-deafen / self-undeafen / self-mute /
    /// self-unmute. Silent when no log channel, for the bot itself,
    /// or when nothing relevant changed (moves included).
    async fn voice_state_log(
        &self,
        ctx: &serenity::Context,
        gid: &str,
        old: Option<&serenity::VoiceState>,
        new: &serenity::VoiceState,
    ) {
        let logs_ch: Option<u64> =
            crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                &self.pool, gid, "voice",
            )
            .await
            .and_then(|s| s.parse().ok());
        let Some(logs_ch) = logs_ch else {
            return;
        };
        if new.user_id == ctx.cache.current_user().id {
            return;
        }
        let guild_u64: u64 = gid.parse().unwrap_or(0);
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_u64)).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let uid = new.user_id.get().to_string();
        let old_ch = old.and_then(|o| o.channel_id);
        let desc = if new.channel_id.is_none() {
            text("event_srvLogs_voiceStateUpdate_description")
                .replace("${targetUser.id}", &uid)
                .replace(
                    "${OchannelID}",
                    &old_ch.map(|c| c.get().to_string()).unwrap_or_default(),
                )
        } else if old_ch.is_none() {
            text("event_srvLogs_voiceStateUpdate_2_description")
                .replace("${targetUser.id}", &uid)
                .replace(
                    "${channelID}",
                    &new.channel_id
                        .map(|c| c.get().to_string())
                        .unwrap_or_default(),
                )
        } else {
            let ch = new
                .channel_id
                .map(|c| c.get().to_string())
                .unwrap_or_default();
            let old_deaf = old.map(|o| o.self_deaf).unwrap_or(false);
            let old_mute = old.map(|o| o.self_mute).unwrap_or(false);
            if !old_deaf && new.self_deaf {
                text("event_srvLogs_voiceStateUpdate_3_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else if old_deaf && !new.self_deaf {
                text("event_srvLogs_voiceStateUpdate_4_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else if !old_mute && new.self_mute {
                text("event_srvLogs_voiceStateUpdate_5_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else if old_mute && !new.self_mute {
                text("event_srvLogs_voiceStateUpdate_6_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else {
                return;
            }
        };
        let (name, avatar) = new
            .user_id
            .to_user(&ctx.http)
            .await
            .map(|u| (u.name.clone(), u.avatar_url().unwrap_or_default()))
            .unwrap_or_default();
        let embed = serenity::CreateEmbed::default()
            .colour(0x010101_u32)
            .author(serenity::CreateEmbedAuthor::new(name).icon_url(avatar))
            .description(desc)
            .timestamp(serenity::Timestamp::now());
        let _ = serenity::ChannelId::new(logs_ch)
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }
}

/// One rendered board message: content line + embed + file uploads.
pub struct BoardRender {
    pub content: String,
    pub embed: serenity::CreateEmbed,
    pub files: Vec<serenity::CreateAttachment>,
}

/// Build the send payload for a new board message (content + embed
/// + footer/author file uploads).
pub fn board_send(render: BoardRender) -> serenity::CreateMessage {
    let mut msg = serenity::CreateMessage::new()
        .content(render.content)
        .embed(render.embed);
    for f in render.files {
        msg = msg.add_file(f);
    }
    msg
}

/// Accent colors mirror joinMessage.ts / leaveMessage.ts
/// (WELCOME_ACCENT_COLOR / GOODBYE_ACCENT_COLOR). Serenity 0.12 has
/// no Components V2 Container/Thumbnail, so the closest equivalent
/// is a colored embed with the avatar snapshot as an attached
/// thumbnail file.
pub const WELCOME_ACCENT: u32 = 0x57_F287;
pub const GOODBYE_ACCENT: u32 = 0xED_4245;
pub const WELCOME_AVATAR_NAME: &str = "welcomer-avatar.png";
pub const GOODBYE_AVATAR_NAME: &str = "goodbye-avatar.png";

/// One rendered welcomer message: text embed + avatar snapshot upload.
pub struct WelcomerRender {
    pub embed: serenity::CreateEmbed,
    pub files: Vec<serenity::CreateAttachment>,
}

/// Pure welcomer payload build. Mirrors welcomerMessage.ts without
/// the Components V2 layer: accent-colored embed carrying the
/// rendered text plus the avatar snapshot as `attachment://`
/// thumbnail (never a raw CDN URL, so the image survives avatar
/// changes). No snapshot bytes means no thumbnail, no CDN fallback.
pub fn welcomer_render(
    text: &str,
    accent: u32,
    avatar_bytes: Option<Vec<u8>>,
    avatar_name: &str,
) -> WelcomerRender {
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(accent))
        .description(text.to_string());
    let mut files = Vec::new();
    if let Some(bytes) = avatar_bytes {
        embed = embed.thumbnail(format!("attachment://{avatar_name}"));
        files.push(serenity::CreateAttachment::bytes(
            bytes,
            avatar_name.to_string(),
        ));
    }
    WelcomerRender { embed, files }
}

/// Avatar snapshot URL for welcomer thumbnails. Mirrors
/// `member.displayAvatarURL({ size: 256, extension: "png", forceStatic:
/// true })` in welcomerMessage.ts: a downscaled static PNG (animated
/// avatars stay png via forceStatic, never a full-size webp/gif);
/// users without an avatar keep the default avatar URL. Pure,
/// unit-tested below.
pub fn welcomer_avatar_url(user: &serenity::User) -> String {
    if let Some(hash) = &user.avatar {
        format!(
            "https://cdn.discordapp.com/avatars/{}/{hash}.png?size=256",
            user.id.get()
        )
    } else {
        user.default_avatar_url()
    }
}

/// Shared welcomer sender for the join/leave sites. Snapshots the
/// member avatar (image64 equivalent) and sends the accent-colored
/// embed + thumbnail file (welcomerMessage.ts Components V2 path,
/// serenity 0.12 equivalent).
pub async fn send_welcomer_message(
    http: &serenity::Http,
    channel_id: serenity::ChannelId,
    user: &serenity::User,
    text: &str,
    accent: u32,
    avatar_name: &str,
) {
    let snapshot = crate::commands::botcat::download_bytes(&welcomer_avatar_url(user)).await;
    let render = welcomer_render(text, accent, snapshot, avatar_name);
    let mut msg = serenity::CreateMessage::new().embed(render.embed);
    for f in render.files {
        msg = msg.add_file(f);
    }
    let _ = channel_id.send_message(http, msg).await;
}

/// Leave-message sender. Mirrors leaveMessage.ts sendGoodbye ->
/// welcomerMessage.ts: `message` is None when leaveTextEnabled is false,
/// `stored` is the resolveWelcomerEmbed result (None when no
/// leaveEmbedId / no record). With a stored embed it is sent as-is
/// (plus the text content when enabled); without one the text falls
/// back to the accent-colored snapshot embed above. Returns the send
/// result so the caller can run the TS default-template fallback leg.
#[allow(clippy::result_large_err)]
pub async fn send_leave_message(
    http: &serenity::Http,
    channel_id: serenity::ChannelId,
    user: &serenity::User,
    content: Option<String>,
    stored: Option<serenity::CreateEmbed>,
) -> Result<(), serenity::Error> {
    // useComponents parity (`embed ? false : componentsEnabled`):
    // serenity 0.12 has no Components V2, so the send is embed-only
    // with no extra components row either way.
    match (content, stored) {
        (None, None) => Ok(()),
        (text, Some(embed)) => {
            let mut msg = serenity::CreateMessage::new().embed(embed);
            if let Some(t) = text {
                msg = msg.content(t);
            }
            channel_id.send_message(http, msg).await.map(|_| ())
        }
        (Some(text), None) => {
            let snapshot = crate::commands::botcat::download_bytes(&user.face()).await;
            let render = welcomer_render(&text, GOODBYE_ACCENT, snapshot, GOODBYE_AVATAR_NAME);
            let mut msg = serenity::CreateMessage::new().embed(render.embed);
            for f in render.files {
                msg = msg.add_file(f);
            }
            channel_id.send_message(http, msg).await.map(|_| ())
        }
    }
}

/// Render one board message. Mirrors the embed build shared by all
/// four starboard/skullboard files: board color, author tag +
/// avatar snapshot (TS uses the raw CDN URL; bytes are attached so
/// the icon survives avatar changes), 2000-char description
/// (chars; TS cuts UTF-16 units), original-message link field,
/// source timestamp, bot footer + icon file, first image
/// attachment.
pub async fn render_board_message(
    pool: &crate::db::Pool,
    ctx: &serenity::Context,
    board: &str,
    message: &serenity::Message,
    count: i64,
    gid: &str,
) -> BoardRender {
    let code = crate::db::guild_lang(pool, message.guild_id.map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let url = crate::funcs::message_url(
        gid.parse().unwrap_or(0),
        message.channel_id.get(),
        message.id.get(),
    );
    let desc: String = message.content.chars().take(2000).collect();
    let desc = if desc.is_empty() { t("var_none") } else { desc };
    let mut files = Vec::new();
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(
            crate::commands::starboard::board_color(board),
        ))
        .description(desc)
        .field(
            t("var_original_message"),
            format!("[{}]({url})", t("var_click_here")),
            false,
        )
        .timestamp(message.timestamp);
    match crate::commands::botcat::download_bytes(&message.author.face()).await {
        Some(bytes) => {
            embed = embed.author(
                serenity::CreateEmbedAuthor::new(message.author.tag())
                    .icon_url("attachment://board_author.png"),
            );
            files.push(serenity::CreateAttachment::bytes(bytes, "board_author.png"));
        }
        None => {
            embed = embed.author(serenity::CreateEmbedAuthor::new(message.author.tag()));
        }
    }
    if let Some(first) = message.attachments.iter().find(|a| {
        a.content_type
            .as_deref()
            .unwrap_or_default()
            .starts_with("image/")
    }) {
        embed = embed.image(&first.url);
    }
    let footer_name =
        crate::commands::botcat::bot_footer_name(bot_name_routed(pool, gid).await.as_deref());
    let stored = bot_pfp_routed(pool, gid).await;
    let icon = match crate::commands::botcat::footer_icon_bytes(stored.as_deref()) {
        Some(bytes) => Some(bytes),
        None => {
            let face = ctx.cache.current_user().face();
            crate::commands::botcat::download_bytes(&face).await
        }
    };
    match icon {
        Some(bytes) => {
            embed = embed.footer(
                serenity::CreateEmbedFooter::new(footer_name)
                    .icon_url("attachment://footer_icon.png"),
            );
            files.push(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        None => {
            embed = embed.footer(serenity::CreateEmbedFooter::new(footer_name));
        }
    }
    let content = crate::commands::starboard::board_content(
        crate::commands::starboard::board_emoji(board),
        count,
        message.channel_id.get(),
    );
    BoardRender {
        content,
        embed,
        files,
    }
}

/// Fetch the source message + fresh emoji count for board handling.
/// Returns None when the message is gone or authored by a bot
/// (both TS files skip those).
pub async fn board_source_message(
    ctx: &serenity::Context,
    reaction: &serenity::Reaction,
    emoji: &str,
    message_id: serenity::MessageId,
) -> Option<(serenity::Message, i64)> {
    let channel = reaction.channel(&ctx.http).await.ok()?;
    let message = channel.id().message(&ctx.http, message_id).await.ok()?;
    if message.author.bot {
        return None;
    }
    let count: i64 = message
        .reactions
        .iter()
        .filter(|r| r.reaction_type == serenity::ReactionType::Unicode(emoji.to_string()))
        .map(|r| r.count as i64)
        .sum();
    Some((message, count))
}

/// Mirrors starboard/skullboard onNewReact.ts: threshold post with
/// the rich embed, edit-in-place on further reactions, repost +
/// number update when the board message is gone, thread creation
/// on new posts, DATA entry store.
pub async fn board_reaction_add(
    pool: &crate::db::Pool,
    ctx: &serenity::Context,
    guild_id: u64,
    emoji: &str,
    message: &serenity::Message,
    count: i64,
) {
    let gid = guild_id.to_string();
    for board in ["starboard", "skullboard"] {
        if crate::commands::starboard::board_emoji(board) != emoji {
            continue;
        }
        let cfg = crate::commands::starboard::load_board(pool, &gid, board).await;
        if cfg.enabled == "no" || cfg.channel.is_empty() {
            continue;
        }
        if count < cfg.threshold {
            continue;
        }
        let Ok(board_channel_id) = cfg.channel.parse::<u64>() else {
            continue;
        };
        let board_channel = serenity::ChannelId::new(board_channel_id);
        // TS instanceof TextChannel gate.
        let is_text = board_channel
            .to_channel(&ctx.http)
            .await
            .ok()
            .and_then(|c| c.guild())
            .is_some();
        if !is_text {
            continue;
        }
        let mut entries = crate::commands::starboard::load_entries(pool, &gid, board).await;
        let chan_str = message.channel_id.get().to_string();
        let msg_str = message.id.get().to_string();
        let render = render_board_message(pool, ctx, board, message, count, &gid).await;
        let number: Option<String> =
            crate::commands::starboard::find_entry(&entries, &chan_str, &msg_str)
                .map(|e| e.number.clone());
        if let Some(number) = number {
            let number: u64 = number.parse().unwrap_or(0);
            if let Ok(board_msg) = board_channel
                .message(&ctx.http, serenity::MessageId::new(number))
                .await
            {
                let edit = serenity::EditMessage::new()
                    .content(render.content)
                    .embed(render.embed)
                    .attachments(crate::commands::embed::embed_builder::edit_attachments(
                        render.files,
                    ));
                let _ = board_channel
                    .edit_message(&ctx.http, board_msg.id, edit)
                    .await;
            } else if let Ok(new_msg) = board_channel
                .send_message(&ctx.http, board_send(render))
                .await
            {
                // Board message gone: repost + number update.
                let num = new_msg.id.get().to_string();
                for e in entries.iter_mut() {
                    if e.message_id == msg_str && e.channel_id == chan_str {
                        e.number = num.clone();
                    }
                }
                crate::commands::starboard::save_entries(pool, &gid, board, &entries).await;
            }
        } else if let Ok(board_msg) = board_channel
            .send_message(&ctx.http, board_send(render))
            .await
        {
            if cfg.create_thread {
                let code = crate::db::guild_lang(pool, Some(guild_id)).await;
                let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
                let nick = if message.author.name.is_empty() {
                    t("var_unknown")
                } else {
                    message.author.name.clone()
                };
                let emoji = crate::commands::starboard::board_emoji(board);
                let name = format!(
                    "{emoji} {}",
                    t("var_s_message").replace("{nickname}", &nick)
                );
                let builder = serenity::CreateThread::new(name)
                    .auto_archive_duration(serenity::model::channel::AutoArchiveDuration::OneDay);
                let _ = ctx
                    .http
                    .create_thread_from_message(board_channel, board_msg.id, &builder, None)
                    .await;
            }
            entries.push(crate::commands::starboard::BoardEntry {
                channel_id: chan_str,
                message_id: msg_str,
                number: board_msg.id.get().to_string(),
                author: message.author.id.get().to_string(),
            });
            crate::commands::starboard::save_entries(pool, &gid, board, &entries).await;
        }
    }
}

/// Mirrors starboard/skullboard onDeletedReact.ts: below threshold
/// the board message is deleted and its DATA entry dropped (entry
/// kept when the delete itself fails); at or above threshold the
/// board message is re-rendered.
pub async fn board_reaction_remove(
    pool: &crate::db::Pool,
    ctx: &serenity::Context,
    guild_id: u64,
    emoji: &str,
    message: &serenity::Message,
    count: i64,
) {
    let gid = guild_id.to_string();
    for board in ["starboard", "skullboard"] {
        if crate::commands::starboard::board_emoji(board) != emoji {
            continue;
        }
        let cfg = crate::commands::starboard::load_board(pool, &gid, board).await;
        if cfg.enabled == "no" || cfg.channel.is_empty() {
            continue;
        }
        let mut entries = crate::commands::starboard::load_entries(pool, &gid, board).await;
        let chan_str = message.channel_id.get().to_string();
        let msg_str = message.id.get().to_string();
        let Some(entry) = crate::commands::starboard::find_entry(&entries, &chan_str, &msg_str)
        else {
            continue;
        };
        let number: u64 = entry.number.parse().unwrap_or(0);
        let Ok(board_channel_id) = cfg.channel.parse::<u64>() else {
            continue;
        };
        let board_channel = serenity::ChannelId::new(board_channel_id);
        let Ok(board_msg) = board_channel
            .message(&ctx.http, serenity::MessageId::new(number))
            .await
        else {
            // TS returns here without touching DATA.
            continue;
        };
        if count < cfg.threshold {
            if board_channel
                .delete_message(&ctx.http, board_msg.id)
                .await
                .is_ok()
            {
                entries.retain(|e| !(e.message_id == msg_str && e.channel_id == chan_str));
                crate::commands::starboard::save_entries(pool, &gid, board, &entries).await;
            }
        } else {
            let render = render_board_message(pool, ctx, board, message, count, &gid).await;
            let edit = serenity::EditMessage::new()
                .content(render.content)
                .embed(render.embed)
                .attachments(crate::commands::embed::embed_builder::edit_attachments(
                    render.files,
                ));
            let _ = board_channel
                .edit_message(&ctx.http, board_msg.id, edit)
                .await;
        }
    }
}

impl Handler {
    /// Live invite snapshot with per-guild in-flight dedup + resolve
    /// timeout. Mirrors fetchInvitesOnce + withTimeout(resolveInvite,
    /// INVITE_RESOLVE_TIMEOUT_MS = 1200) in
    /// Events/guildconfig/joinMessage.ts: concurrent joins share one
    /// Discord fetch via the `invite_fetch` map (dropped ~1500ms after
    /// settle, like the TS post-settle delete), and a slow API never
    /// stalls the greeting past the timeout. None on timeout or fetch
    /// failure means unattributed (the TS resolveInvite null path);
    /// a failure also drops the map entry at once so the next join
    /// retries instead of reusing the miss.
    async fn fetch_invites_dedup(
        &self,
        http: &std::sync::Arc<serenity::Http>,
        guild_id: serenity::GuildId,
    ) -> Option<Vec<InviteSnap>> {
        const INVITE_RESOLVE_TIMEOUT_MS: u64 = 1200;
        const INVITE_FETCH_DEDUP_KEEP_MS: u64 = 1500;
        let gid = guild_id.get().to_string();
        let (cell, fresh) = {
            let mut pending = self.invite_fetch.lock().await;
            match pending.entry(gid.clone()) {
                std::collections::hash_map::Entry::Occupied(o) => (o.get().clone(), false),
                std::collections::hash_map::Entry::Vacant(v) => {
                    let cell = Arc::new(tokio::sync::OnceCell::new());
                    v.insert(cell.clone());
                    (cell, true)
                }
            }
        };
        if fresh {
            let pending = self.invite_fetch.clone();
            let cell_ref = cell.clone();
            let gid_cleanup = gid.clone();
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(INVITE_FETCH_DEDUP_KEEP_MS))
                    .await;
                let mut pending = pending.lock().await;
                if pending
                    .get(&gid_cleanup)
                    .is_some_and(|cur| Arc::ptr_eq(cur, &cell_ref))
                {
                    pending.remove(&gid_cleanup);
                }
            });
        }
        // Outer None = resolve timeout (the entry is left: the fetch may
        // still settle for other waiters, or the next join retries the
        // init). Inner None = settled fetch failure (entry dropped at
        // once, mirroring the rejected promise leaving nothing cached).
        let settled: Option<Option<Vec<InviteSnap>>> = tokio::time::timeout(
            std::time::Duration::from_millis(INVITE_RESOLVE_TIMEOUT_MS),
            cell.get_or_init(|| async {
                match guild_id.invites(http).await {
                    Ok(live) => Some(
                        live.into_iter()
                            .map(|inv| InviteSnap {
                                code: inv.code.clone(),
                                uses: inv.uses,
                                inviter_id: inv.inviter.as_ref().map(|u| u.id.get()).unwrap_or(0),
                                inviter_name: inv
                                    .inviter
                                    .as_ref()
                                    .map(|u| u.name.clone())
                                    .unwrap_or_default(),
                            })
                            .collect(),
                    ),
                    Err(_) => None,
                }
            }),
        )
        .await
        .ok()
        .cloned();
        match settled {
            None => None,
            Some(snaps) => {
                if snaps.is_none() {
                    let mut pending = self.invite_fetch.lock().await;
                    if pending.get(&gid).is_some_and(|cur| Arc::ptr_eq(cur, &cell)) {
                        pending.remove(&gid);
                    }
                }
                snaps
            }
        }
    }
}

#[serenity::async_trait]
impl serenity::EventHandler for Handler {
    async fn ready(&self, ctx: serenity::Context, ready: serenity::Ready) {
        // Mirrors src/Events/client/ready.ts (cache warm, owner fetch).
        // The `[Shard #id]` tag mirrors the shardCreate Ready leg in
        // src/index.ts: serenity exposes no post-spawn hook, so each
        // shard's ready line is the shards-spawned evidence (the spawn
        // plan itself is logged in bot::run).
        let ready_shard = ready.shard.as_ref().map(|s| s.id.get()).unwrap_or(0);
        tracing::info!(
            "[Shard #{}] {} connected ({} guilds)",
            ready_shard,
            ready.user.tag(),
            ready.guilds.len()
        );
        // Owner-mail From name from the live username (mirrors
        // `fromName: client.user?.username` in Mailer.init, which
        // ready.ts runs after login). Idempotent across per-shard readys.
        self.mailer.set_from_name(&ready.user.name);
        // No boot presence (O10): TS keeps the setPresence block commented
        // out in ready.ts, so no-presence here is parity, not a gap.
        // Track-start nowplaying announcer (mirrors the trackStart send
        // in playerManager.ts). Registered once: ready fires per shard
        // and the dispatcher would otherwise post once per shard.
        static ANNOUNCE_ONCE: std::sync::OnceLock<()> = std::sync::OnceLock::new();
        if ANNOUNCE_ONCE.set(()).is_ok() {
            crate::lavalink::manager()
                .register_announce(ctx.http.clone())
                .await;
        }
        // Flowery voice prefetch (mirrors prefetchFloweryVoices() in
        // ready.ts). Once per process; silent on failure, speakTTS
        // falls back to the default voice.
        static FLOWERY_ONCE: std::sync::OnceLock<()> = std::sync::OnceLock::new();
        if FLOWERY_ONCE.set(()).is_ok() {
            tokio::spawn(async move {
                crate::commands::tts::speak::prefetch_flowery_voices().await;
            });
        }
        // Protection snapshot refresh (mirrors the 60s setInterval in
        // Events/protection/ready.ts, audit P1): re-seed the structure
        // snapshot so delete-restore knows channels/roles created after
        // boot. Guilds with a restore in flight are skipped (mirrors
        // isRaiding). Once per process: ready fires per shard.
        static SNAPSHOT_ONCE: std::sync::OnceLock<()> = std::sync::OnceLock::new();
        if SNAPSHOT_ONCE.set(()).is_ok() {
            let cache = ctx.cache.clone();
            let pool = self.pool.clone();
            let restoring = self.restoring.clone();
            tokio::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                    // Snapshot the cached guilds first; guards drop
                    // before any await below.
                    let guilds: Vec<serenity::Guild> = cache
                        .guilds()
                        .into_iter()
                        .filter_map(|id| cache.guild(id).map(|g| g.clone()))
                        .collect();
                    for guild in &guilds {
                        if restoring.lock().await.contains(&guild.id.get().to_string()) {
                            continue;
                        }
                        seed_protection_snapshot(&pool, guild).await;
                    }
                }
            });
        }
        // Owner "Bot Is Ready" mail (mirrors ready.ts:467-483, main shard
        // only). Blocking SMTP goes through spawn_blocking; the mailer is
        // silent when SMTP env is incomplete, and the skip is traced
        // below (silent-but-logged, never fails boot).
        {
            let mailer = self.mailer.clone();
            let tag = ready.user.tag();
            let shard_label = match &ready.shard {
                Some(info) => format!("shard {}/{}", info.id.get(), info.total),
                None => "shard 0/1".to_string(),
            };
            let is_main = match &ready.shard {
                None => true,
                Some(info) => info.id.get() == 0,
            };
            let date = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            tokio::task::spawn_blocking(move || {
                if !mailer.send_ready(&tag, &date, &shard_label, is_main) {
                    tracing::debug!("ready mail skipped (SMTP unconfigured or non-main shard)");
                }
            });
        }
        // Username warm map (mirrors the usersNamesMap loop at the end
        // of ready.ts: `usersNamesMap.set(id, { username, globalName })`
        // over every cached guild member). Retained in `self.names` so
        // user_update has a previous-name fallback when the serenity
        // `old` payload is None (cache miss), exactly like TS
        // `cached?.username ?? oldUser.username`.
        {
            let entries: Vec<(u64, String, Option<String>)> = ctx
                .cache
                .guilds()
                .into_iter()
                .filter_map(|id| ctx.cache.guild(id))
                .flat_map(|g| {
                    g.members
                        .iter()
                        .map(|(uid, m)| {
                            (uid.get(), m.user.name.clone(), m.user.global_name.clone())
                        })
                        .collect::<Vec<_>>()
                })
                .collect();
            let warmed = crate::bot::collect_users_names(entries);
            tracing::debug!("ready: warmed {} username rows", warmed.len());
            *self.names.lock().await = warmed;
        }
        // BOT metas push (mirrors refreshBotData in ready.ts: boot push
        // + 45s interval, main shard only; the retry budget lives in
        // push_bot_metas). Once per process: ready fires per shard.
        // CROSS-SHARD CAVEAT: members/servers come from this process's
        // cache (no broadcastEval; see push_bot_metas) — exact for the
        // single-process autoshard layout only.
        // VANITY GAP (B5): boot warms the regular-invite cache per
        // guild (guild_create replays at boot, mirroring fetchInvites),
        // but the native VanityURL uses-counter has no serenity fetch
        // equivalent here, so the join-time vanity-uses attribution in
        // joinMessage.ts (vanityInvites uses diff) is not mirrored.
        // Custom-vanity attribution via api.VANITY is covered at join
        // time instead (see custom_vanity_code at the join leg).
        static BOT_METAS_ONCE: std::sync::OnceLock<()> = std::sync::OnceLock::new();
        {
            let shard_id = match &ready.shard {
                Some(info) => info.id.get() as u64,
                None => 0,
            };
            let total_shards = match &ready.shard {
                Some(info) => info.total as u64,
                None => 1,
            };
            // Langs mirror AvailableLanguage names in TS; the port has
            // codes only (no name table), so codes are stored with the
            // row instead. Not user-visible from this row.
            let langs = [
                "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT",
                "ru-RU",
            ]
            .into_iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>();
            if shard_id == 0 && BOT_METAS_ONCE.set(()).is_ok() {
                tracing::info!("refreshBotData interval scheduled (shard #{shard_id})");
                let pool = self.pool.clone();
                let cache = ctx.cache.clone();
                let http = ctx.http.clone();
                tokio::spawn(async move {
                    loop {
                        let me = cache.current_user().clone();
                        let mut members = 0u64;
                        for gid in cache.guilds() {
                            if let Some(g) = cache.guild(gid) {
                                members += g.member_count;
                            }
                        }
                        let all_cmds = crate::commands::all();
                        // Count parity (O8/O18): TS sums 3 collections
                        // (commands.size + message_commands.size +
                        // applicationsCommands.size) for content.commands,
                        // and client.content.length for the join-time bio.
                        // commands::all() merges the same three families
                        // (slash-capable incl. legacy prefix entries +
                        // user/message context-menu commands), so len() is
                        // the equivalent total in both spots.
                        let mut cats = std::collections::HashSet::new();
                        for c in &all_cmds {
                            if let Some(cat) = c.category.as_deref() {
                                cats.insert(cat.to_string());
                            }
                        }
                        // Bio mirrors retrieveMyself.retrieveBio(), awaited
                        // at each push: the live app description wins; when
                        // the fetch fails the previous row bio survives
                        // (mirrors the `metasTable.get("BOT.user.bio") ||
                        // username` read in bio.rs), then the live
                        // username when no row exists yet.
                        let prev_bio =
                            crate::db::kv_get(&pool, crate::core::release::META_SCOPE, "BOT")
                                .await
                                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                                .and_then(|v| {
                                    v.pointer("/user/bio")
                                        .and_then(|b| b.as_str())
                                        .map(|s| s.to_string())
                                })
                                .filter(|s| !s.is_empty());
                        let bio = crate::bot::fetch_app_bio(&http)
                            .await
                            .or(prev_bio)
                            .unwrap_or_else(|| me.name.clone());
                        let input = crate::bot::BotMetasInput {
                            members,
                            servers: cache.guilds().len() as u64,
                            shards: total_shards,
                            // O7: TS pushes the live websocket average; no
                            // serenity 0.12 equivalent at this call site, so
                            // 0 is recorded, not measured.
                            ping_ms: 0,
                            commands: all_cmds.len(),
                            categories: cats.len(),
                            // O6: TS stores AvailableLanguage display names;
                            // the port keeps codes only (no name table).
                            langs: langs.clone(),
                            username: me.name.clone(),
                            tag: me.tag(),
                            user_id: me.id.get(),
                            discriminator: me.discriminator.map(|d| d.get()),
                            // O9: TS uses displayAvatarURL png/4096; the
                            // default CDN URL is stored instead.
                            avatar: me.avatar_url().unwrap_or_else(|| me.face()),
                            bio,
                            shard_id,
                        };
                        let now_ms = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_millis() as i64)
                            .unwrap_or(0);
                        crate::bot::push_bot_metas(
                            &pool,
                            &crate::bot::bot_metas_row(&input, now_ms),
                            shard_id,
                        )
                        .await;
                        tokio::time::sleep(std::time::Duration::from_secs(
                            crate::bot::BOT_METAS_PUSH_SECS,
                        ))
                        .await;
                    }
                });
            }
        }
    }

    async fn guild_create(
        &self,
        ctx: serenity::Context,
        guild: serenity::Guild,
        _is_new: Option<bool>,
    ) {
        // Mirrors client/guildCreate.ts.
        let gid = guild.id.get().to_string();
        // Owner "New Guild" mail (mirrors guildCreate.ts:441). Serenity
        // replays guild_create for cached guilds at boot, so only a real
        // join (`is_new`) notifies. Blocking SMTP via spawn_blocking.
        if matches!(_is_new, Some(true)) {
            let mailer = self.mailer.clone();
            let name = guild.name.clone();
            let id = guild.id.get();
            let joined_at = guild.joined_at.format("%Y-%m-%d %H:%M:%S").to_string();
            let shard = format!("shard {}", ctx.shard_id.get());
            let members = guild.member_count;
            let vanity = guild.vanity_url_code.clone().unwrap_or_default();
            let owner = guild.owner_id.get().to_string();
            tokio::task::spawn_blocking(move || {
                mailer.send_join(
                    &name, id, &joined_at, &shard, members, "", &vanity, "", &owner,
                );
            });
        }
        // Cancel a pending deferred wipe from a previous leave (mirrors
        // cancelPendingGuildDataDeletion in deleteDatabaseDataOnGuildLeave.ts).
        {
            let mut queue = crate::scheduler::load_wipe_queue(&self.pool).await;
            if wipe_queue_cancel(&mut queue, &gid) {
                crate::scheduler::save_wipe_queue(&self.pool, &queue).await;
                tracing::info!("guildCreate {} cancelled pending wipe", gid);
                // Owner cancel-notice DM (mirrors the cancelled-notice
                // leg of cancelPendingGuildDataDeletion).
                send_wipe_cancel_dm(&ctx, &self.pool, &guild).await;
            }
        }
        // Drop the legacy immediate flag (migration from the old design).
        let _ = crate::db::tbl_del(&self.pool, &gid, "GUILD_DELETE_QUEUED").await;
        // Auto-locale default (setLangByRegion, O14/O17). Verdict: set only
        // when absent — TS overwrites unconditionally on every join, but
        // serenity replays guild_create for cached guilds at boot (discord.js
        // does not), so an overwrite here would clobber an operator-set
        // language on every restart. Intentional divergence, recorded.
        // Mapping verified 1:1 vs the guildCreate.ts switch (fr->fr-FR,
        // en-US/en-GB->en-US, es-ES, de->de-DE, it->it-IT, ja->jp-JP,
        // pt-BR->pt-PT, ru->ru-RU, default en-US) in locale_lang_code.
        if guild_lang_routed(&self.pool, &gid).await.is_none() {
            let _ = crate::db::tbl_set(
                &self.pool,
                &gid,
                "GUILD.LANG",
                crate::lang::locale_lang_code(&guild.preferred_locale),
            )
            .await;
        }
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild.id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        // Seed the guild owner (ownerHelper.addGuildOwner).
        let _ = crate::db::tbl_set(
            &self.pool,
            &gid,
            &format!("GUILD.OWNER.{}", guild.owner_id.get()),
            "1",
        )
        .await;
        // Blacklist leave: blacklisted owner -> farewell embed, then leave.
        // Key parity (O15, guildCreate.ts `blacklist.<ownerId>.blacklisted`):
        // intra-Rust reads/writes share bl_get/bl_set (`BLACKLIST.<uid>`
        // under the `blacklist` table + legacy kv fallback), so the gate is
        // self-consistent; TS bare-id row layout is not re-read here — the
        // sibling owner module owns any cross-impl migration.
        if blacklist_reason_routed(&self.pool, guild.owner_id.get())
            .await
            .is_some()
        {
            let embed = serenity::CreateEmbed::default()
                .colour(0xFF0000_u32)
                .description(format!(
                    "Dear <@{}>, I'm sorry, but you have been blacklisted by the bot.\nAs a result, I will be leaving your server. If you have any questions or concerns, please contact my developer.\n\nThank you for your understanding",
                    guild.owner_id.get()
                ))
                .timestamp(serenity::Timestamp::now());
            if let Some(ch) = welcome_channel(&guild) {
                let _ = ch
                    .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                    .await;
            }
            let _ = guild.id.leave(&ctx.http).await;
            return;
        }
        // Cache invites for join attribution (getInvites, O16): the seed
        // runs on the boot replay too (serenity replays guild_create per
        // cached guild; discord.js seeds the same table from the ready
        // burst fetchInvites), so join attribution has a baseline from
        // the first minute. The fetch gate is invite_seed_allowed below.
        // guild_create streams per guild (no batch-5 sweep like the ready
        // burst), so only the perm gate applies here.
        let bot_id = ctx.cache.current_user().id;
        let (is_owner, view_audit, manage_guild) = if guild.owner_id == bot_id {
            (true, true, true)
        } else if let Some(me) = guild.members.get(&bot_id) {
            let perms = guild.member_permissions(me);
            (false, perms.view_audit_log(), perms.manage_guild())
        } else {
            // Payload without our member row: best-effort fetch below
            // (403s are ignored), mirroring the TS unguarded path.
            (true, true, true)
        };
        if invite_seed_allowed(is_owner, view_audit, manage_guild) {
            if let Ok(live) = guild.id.invites(&ctx.http).await {
                let mut cache = self.invites.lock().await;
                let entry = cache.entry(gid.clone()).or_default();
                for inv in live {
                    entry.insert(
                        inv.code.clone(),
                        (
                            inv.uses,
                            inv.inviter.as_ref().map(|u| u.id.get()).unwrap_or(0),
                        ),
                    );
                }
            }
        }
        // Voice-session recovery (mirrors recoverActiveSessions, which TS
        // runs once at ready): guild_create carries full voice states, so
        // stale sessions close here with no cache race. Runs per guild
        // stream (idempotent) rather than once at boot.
        {
            let in_voice: std::collections::HashSet<u64> =
                guild.voice_states.keys().map(|u| u.get()).collect();
            let now = crate::commands::context::now_ms();
            crate::events::recover_voice_sessions(&self.pool, &gid, &in_voice, now).await;
        }
        // Temp-voice ready recovery (mirrors recoverCustomVoiceChannels
        // in voicedashboard/voiceState.ts): drop malformed rows, drop
        // rows whose channel no longer exists, delete emptied temp
        // channels (guild_create carries full voice states, so no cache
        // race like the per-update sweep).
        {
            let rows: Vec<(String, String)> = custom_voice_rows_routed(&self.pool, &gid).await;
            for (key, ch_id) in rows {
                let Ok(ch_num) = ch_id.trim().parse::<u64>() else {
                    let _ = crate::db::tbl_del(&self.pool, &gid, &key).await;
                    continue;
                };
                if ch_num == 0 || !guild.channels.keys().any(|c| c.get() == ch_num) {
                    let _ = crate::db::tbl_del(&self.pool, &gid, &key).await;
                    continue;
                }
                let occupied = guild
                    .voice_states
                    .values()
                    .any(|v| v.channel_id == Some(serenity::ChannelId::new(ch_num)));
                if !occupied {
                    let _ = serenity::ChannelId::new(ch_num).delete(&ctx.http).await;
                    let _ = crate::db::tbl_del(&self.pool, &gid, &key).await;
                }
            }
        }
        // Serving-shard messenger mirror for the H247 watchdog (the
        // lavalink registry exposes no accessor; event arms run on the
        // guild's shard, so this is always the right one).
        crate::commands::h247::session::note_messenger(guild.id.get(), ctx.shard.clone()).await;
        // Orphan TTS sweep (mirrors cleanupOrphanedTTS -> cleanupTTS in
        // ttsManager.ts, called from ready.ts): no voice session
        // survives a restart, so a stored TTS row is stale.
        // guild_create replays per guild at boot, which covers both
        // boot and late joins. The row delete alone would strand the
        // welcome embed and the voice-channel status, so both
        // cleanupTTS legs run here too (best-effort, like the TS
        // `.catch(() => {})` legs). No OP4 leave is needed: nothing
        // is connected after a restart.
        {
            let raw = tts_raw_routed(&self.pool, &gid).await;
            let swept =
                crate::commands::tts::sweep_orphaned_tts(&self.pool, std::slice::from_ref(&gid))
                    .await;
            if !swept.is_empty() {
                crate::lavalink::manager()
                    .remove_player(guild.id.get())
                    .await;
                if let Some(raw) = raw {
                    if let Some((text_ch, embed_msg)) = crate::commands::tts::tts_embed_ids(&raw) {
                        let _ = ctx
                            .http
                            .delete_message(
                                serenity::ChannelId::new(text_ch),
                                serenity::MessageId::new(embed_msg),
                                None,
                            )
                            .await;
                    }
                    if let Ok(cfg) = serde_json::from_str::<crate::commands::tts::TtsConfig>(&raw) {
                        if let Ok(vc) = cfg.voice_channel_id.parse::<u64>() {
                            crate::lavalink::LavalinkManager::clear_voice_status(&ctx.http, vc)
                                .await;
                        }
                    }
                }
                tracing::info!("guildCreate {} swept orphaned TTS row", gid);
            }
        }
        // H247 rejoin on guild_create/boot (mirrors recoverH247Sessions,
        // which TS runs once at ready): re-emit the parked presence
        // send-only (confirm=false, like TS) unless the replayed voice
        // states already show the bot parked.
        {
            let stored = crate::commands::h247::load_h247(&self.pool, &gid).await;
            if stored.enabled {
                if let Ok(ch_num) = stored.voice_channel_id.parse::<u64>() {
                    crate::commands::h247::session::prime_session(guild.id.get(), ch_num).await;
                    let bot_id = ctx.cache.current_user().id;
                    let parked = guild
                        .voice_states
                        .get(&bot_id)
                        .and_then(|v| v.channel_id)
                        .map(|c| c.get());
                    if parked != Some(ch_num) {
                        crate::lavalink::LavalinkManager::send_voice_state(
                            &ctx.shard,
                            guild.id.get(),
                            Some(ch_num),
                        );
                        tracing::info!("guildCreate {} rejoined H247 channel {}", gid, ch_num);
                    }
                }
            }
        }
        // Seed the protection structure snapshot so delete-restore
        // works before the first 60s sweep (mirrors
        // backupGuildStructure in protection/ready.ts).
        seed_protection_snapshot(&self.pool, &guild).await;
        // Owner log embed to the guild-logs channel (email leg is SMTP-blocked).
        // Real joins only: serenity replays guild_create for every guild at
        // boot, and TS guildCreate.ts answers joins, not the ready burst.
        if !matches!(_is_new, Some(true)) {
            return;
        }
        // Shared join-message chrome (O12/O13): per-guild display name +
        // footer icon attachment like displayBotName.footerBuilder /
        // footerAttachmentBuilder (stored bot pfp, else a snapshot of the
        // live avatar — never a remote URL), the Wink expression thumbnail
        // (mirrors Expressions.Wink), and the TS button app-emojis from the
        // boot-warmed cache (missing entries leave buttons text-only).
        async fn join_button_emoji(
            http: &serenity::Http,
            name: &str,
        ) -> Option<serenity::ReactionType> {
            let (id, full, animated) = crate::emojis::cached_emoji_entry(http, name).await?;
            Some(serenity::ReactionType::Custom {
                animated,
                id: serenity::EmojiId::new(id),
                name: Some(full),
            })
        }
        const WINK_THUMB: &str =
            "https://www.ihorizon.org/assets/img/bot/expression/ihorizon_wink.png";
        let footer_name = crate::commands::botcat::bot_footer_name(
            bot_name_routed(&self.pool, &gid).await.as_deref(),
        );
        let footer_icon: Option<Vec<u8>> = match crate::commands::botcat::footer_icon_bytes(
            bot_pfp_routed(&self.pool, &gid).await.as_deref(),
        ) {
            Some(bytes) => Some(bytes),
            None => {
                let face = ctx.cache.current_user().face();
                crate::commands::shared::download_bytes(&face).await
            }
        };
        let emoji_crown = join_button_emoji(&ctx.http, "Crown").await;
        let emoji_sparkles = join_button_emoji(&ctx.http, "Sparkles").await;
        let emoji_search = join_button_emoji(&ctx.http, "Search").await;
        let emoji_gitlab = join_button_emoji(&ctx.http, "GitLab_Logo").await;
        let emoji_logo = join_button_emoji(&ctx.http, "Logo").await;
        let emoji_docs = join_button_emoji(&ctx.http, "Documentation").await;
        if let Ok(logs_ch) = crate::config::load()
            .map(|c| c.guild_logs_channel_id)
            .unwrap_or_default()
            .trim()
            .parse::<u64>()
        {
            // O11: TS ownerLogs creates a join invite, resolves the owner
            // name and appends shard-wide totals (getShardStats); the totals
            // here are this process's cache (single-process autoshard).
            let invite_link = match welcome_channel(&guild) {
                Some(ch) => ch
                    .create_invite(&ctx.http, serenity::CreateInvite::new().max_age(0))
                    .await
                    .map(|i| format!("discord.gg/{}", i.code))
                    .unwrap_or_else(|_| "None".to_string()),
                None => "None".to_string(),
            };
            let owner_name = match guild.members.get(&guild.owner_id) {
                Some(m) => m.user.name.clone(),
                None => guild
                    .owner_id
                    .to_user(&ctx.http)
                    .await
                    .map(|u| u.name)
                    .unwrap_or_else(|_| "Unknown".to_string()),
            };
            let mut total_members = 0u64;
            for cached_id in ctx.cache.guilds() {
                if let Some(cached) = ctx.cache.guild(cached_id) {
                    total_members += cached.member_count;
                }
            }
            let vanity = guild
                .vanity_url_code
                .as_ref()
                .map(|v| format!("discord.gg/{v}"))
                .unwrap_or_else(|| "None".to_string());
            let mut log_embed = serenity::CreateEmbed::default()
                .colour(0x00FF00_u32)
                .description("**A new guild added iHorizon !**")
                .field("Server Name", format!("`{}`", guild.name), true)
                .field("Server ID", format!("`{}`", guild.id.get()), true)
                .field(
                    "Server Region",
                    format!("`{}`", guild.preferred_locale),
                    true,
                )
                .field(
                    "Member Count",
                    format!("`{}` members", guild.member_count),
                    true,
                )
                .field("Invite Link", format!("`{invite_link}`"), true)
                .field(
                    "Server Owner",
                    format!("({}) {owner_name}", guild.owner_id.get()),
                    true,
                )
                .field("Vanity URL", format!("`{vanity}`"), true)
                .field("Guilds total", ctx.cache.guild_count().to_string(), true)
                .field("Members total", format!("{total_members} members"), true)
                .field("Shard", format!("#{}", ctx.shard_id.get()), true)
                .timestamp(guild.joined_at);
            if let Some(icon) = guild.icon_url() {
                log_embed = log_embed.thumbnail(icon);
            }
            if footer_icon.is_some() {
                log_embed = log_embed.footer(
                    serenity::CreateEmbedFooter::new(footer_name.clone())
                        .icon_url("attachment://footer_icon.png"),
                );
            } else {
                log_embed = log_embed.footer(serenity::CreateEmbedFooter::new(footer_name.clone()));
            }
            let mut log_msg = serenity::CreateMessage::new().embed(log_embed);
            if let Some(bytes) = footer_icon.clone() {
                log_msg =
                    log_msg.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
            }
            let _ = serenity::ChannelId::new(logs_ch)
                .send_message(&ctx.http, log_msg)
                .await;
        }
        // Welcome message to the server (O13: footer icon attachment +
        // Wink thumbnail + cached app-emoji buttons like TS; the banner
        // image stays pending on html2png parity).
        if let Some(ch) = welcome_channel(&guild) {
            let titles = crate::lang::get_list(&lang_code, "new_guild_embed_title");
            let pick = titles
                .get((crate::commands::context::now_ms() as usize) % titles.len().max(1))
                .cloned()
                .unwrap_or_default();
            let app_id = ctx.cache.current_user().id.get();
            let mut embed = serenity::CreateEmbed::default()
                .colour(0x2134FF_u32)
                .description(text("new_guild_embed_desc").replace("${randomMessage}", &pick))
                .thumbnail(WINK_THUMB);
            if footer_icon.is_some() {
                embed = embed.footer(
                    serenity::CreateEmbedFooter::new(footer_name.clone())
                        .icon_url("attachment://footer_icon.png"),
                );
            } else {
                embed = embed.footer(serenity::CreateEmbedFooter::new(footer_name.clone()));
            }
            let mut b_invite = serenity::CreateButton::new_link(format!(
                "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
            ))
            .label(text("guild_create_btn_invite"));
            if let Some(e) = emoji_crown.clone() {
                b_invite = b_invite.emoji(e);
            }
            let mut b_site = serenity::CreateButton::new_link("https://www.ihorizon.org")
                .label(text("guild_create_btn_website"));
            if let Some(e) = emoji_sparkles.clone() {
                b_site = b_site.emoji(e);
            }
            let mut b_search = serenity::CreateButton::new_link("https://www.ihorizon.org/search")
                .label(text("guild_create_btn_search"));
            if let Some(e) = emoji_search.clone() {
                b_search = b_search.emoji(e);
            }
            let row1 = serenity::CreateActionRow::Buttons(vec![b_invite, b_site, b_search]);
            let mut b_repos = serenity::CreateButton::new_link("https://gitlab.com/ihrz/ihrz")
                .label(text("guild_create_btn_repos"));
            if let Some(e) = emoji_gitlab.clone() {
                b_repos = b_repos.emoji(e);
            }
            let mut b_support = serenity::CreateButton::new_link("https://discord.gg/ihorizon")
                .label(text("guild_create_btn_support"));
            if let Some(e) = emoji_logo.clone() {
                b_support = b_support.emoji(e);
            }
            let mut b_docs = serenity::CreateButton::new_link("https://docs.ihorizon.org")
                .label(text("guild_create_btn_docs"));
            if let Some(e) = emoji_docs.clone() {
                b_docs = b_docs.emoji(e);
            }
            let row2 = serenity::CreateActionRow::Buttons(vec![b_repos, b_support, b_docs]);
            let mut welcome_msg = serenity::CreateMessage::new()
                .embed(embed)
                .components(vec![row1, row2]);
            if let Some(bytes) = footer_icon.clone() {
                welcome_msg = welcome_msg
                    .add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
            }
            let _ = ch.send_message(&ctx.http, welcome_msg).await;
        }
        // Owner welcome DM (inviter resolved via BotAdd audit log, best effort).
        let app_id = ctx.cache.current_user().id.get();
        let mut dm_targets = vec![guild.owner_id];
        if let Ok(logs) = guild
            .id
            .audit_logs(
                &ctx.http,
                Some(serenity::model::guild::audit_log::Action::Member(
                    serenity::model::guild::audit_log::MemberAction::BotAdd,
                )),
                None,
                None,
                Some(1),
            )
            .await
        {
            if let Some(entry) = logs.entries.first() {
                let bot_id = ctx.cache.current_user().id.get();
                if entry.target_id.map(|t| t.get()) == Some(bot_id)
                    && entry.user_id.get() != guild.owner_id.get()
                {
                    dm_targets.push(entry.user_id);
                }
            }
        }
        for target in dm_targets {
            if let Ok(user) = target.to_user(&ctx.http).await {
                // O12: TS ownerWelcomeDM sends 5 buttons (invite, website,
                // support, docs, repos) with thumbnail + footer attachment.
                let mut dm_embed = serenity::CreateEmbed::default()
                    .colour(0x2B2D31_u32)
                    .description(
                        text("new_guild_owner_dm_description")
                            .replace("${owner}", &user.name)
                            .replace("${guild.name}", &guild.name),
                    )
                    .thumbnail(WINK_THUMB)
                    .timestamp(serenity::Timestamp::now());
                if footer_icon.is_some() {
                    dm_embed = dm_embed.footer(
                        serenity::CreateEmbedFooter::new(footer_name.clone())
                            .icon_url("attachment://footer_icon.png"),
                    );
                } else {
                    dm_embed =
                        dm_embed.footer(serenity::CreateEmbedFooter::new(footer_name.clone()));
                }
                let mut d_invite = serenity::CreateButton::new_link(format!(
                    "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
                ))
                .label(text("guild_create_btn_invite"));
                if let Some(e) = emoji_crown.clone() {
                    d_invite = d_invite.emoji(e);
                }
                let mut d_site = serenity::CreateButton::new_link("https://www.ihorizon.org")
                    .label(text("guild_create_btn_website"));
                if let Some(e) = emoji_sparkles.clone() {
                    d_site = d_site.emoji(e);
                }
                let mut d_support = serenity::CreateButton::new_link("https://discord.gg/ihorizon")
                    .label(text("guild_create_btn_support"));
                if let Some(e) = emoji_logo.clone() {
                    d_support = d_support.emoji(e);
                }
                let mut d_docs = serenity::CreateButton::new_link("https://docs.ihorizon.org")
                    .label(text("guild_create_btn_docs"));
                if let Some(e) = emoji_docs.clone() {
                    d_docs = d_docs.emoji(e);
                }
                let mut d_repos = serenity::CreateButton::new_link("https://gitlab.com/ihrz/ihrz")
                    .label(text("guild_create_btn_repos"));
                if let Some(e) = emoji_gitlab.clone() {
                    d_repos = d_repos.emoji(e);
                }
                let row = serenity::CreateActionRow::Buttons(vec![
                    d_invite, d_site, d_support, d_docs, d_repos,
                ]);
                let mut dm_msg = serenity::CreateMessage::new()
                    .embed(dm_embed)
                    .components(vec![row]);
                if let Some(bytes) = footer_icon.clone() {
                    dm_msg = dm_msg
                        .add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
                }
                let _ = user.direct_message(&ctx.http, dm_msg).await;
            }
        }
        // Per-guild bot bio in the join language (setBotBioByLang).
        if let Some(bio_tpl) = crate::lang::get(&lang_code, "bot_server_bio") {
            let command_count = crate::commands::all().len();
            let bio = crate::commands::botcat::sanitize_bio(
                &bio_tpl.replace("{count}", &command_count.to_string()),
            );
            if let Some(token) = crate::config::bot_token() {
                let _ = crate::commands::botcat::patch_guild_me(
                    &token,
                    guild.id.get(),
                    serde_json::json!({ "bio": bio }),
                )
                .await;
            }
        }
        tracing::debug!("guildCreate {}", gid);
    }

    async fn guild_delete(
        &self,
        ctx: serenity::Context,
        incomplete: serenity::UnavailableGuild,
        full: Option<serenity::Guild>,
    ) {
        // Mirrors deleteDatabaseDataOnGuildLeave.ts: enqueue a 10h
        // cancellable wipe instead of deleting inline (shard race safety).
        let gid = incomplete.id.get().to_string();
        let now = crate::commands::context::now_ms();
        let mut queue = crate::scheduler::load_wipe_queue(&self.pool).await;
        // The unavailable payload only carries the id; name/owner are
        // best effort from the full guild when Discord provides it.
        let name = full.as_ref().map(|g| g.name.clone()).unwrap_or_default();
        let owner = full
            .as_ref()
            .map(|g| g.owner_id.get().to_string())
            .unwrap_or_default();
        let delete_at = wipe_queue_enqueue(&mut queue, &gid, &name, &owner, now);
        crate::scheduler::save_wipe_queue(&self.pool, &queue).await;
        // Owner leave-notice DM (mirrors notifyOwnerFromAnotherGuild in
        // deleteDatabaseDataOnGuildLeave.ts:118-159). Only when Discord
        // ships the full guild (boot unavailability carries no payload).
        if let Some(g) = full.as_ref() {
            send_leave_notice_dm(&ctx, &self.pool, g, delete_at).await;
        }
        // Owner "Leave Guild" mail (mirrors removeGuildLog.ts:95). Only
        // when Discord ships the full guild (boot unavailability carries
        // no payload). Blocking SMTP via spawn_blocking.
        if let Some(g) = full.as_ref() {
            let mailer = self.mailer.clone();
            let name = g.name.clone();
            let id = g.id.get();
            let date = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            let shard = format!("shard {}", ctx.shard_id.get());
            let members = g.member_count;
            let vanity = g.vanity_url_code.clone().unwrap_or_default();
            tokio::task::spawn_blocking(move || {
                mailer.send_leave(&name, id, &date, &shard, members, &vanity, "");
            });
        }
        // Drop the legacy immediate flag (migration from the old design).
        let _ = crate::db::tbl_del(&self.pool, &gid, "GUILD_DELETE_QUEUED").await;
        // Mirrors invitemanager/onGuildLeave.ts: drop the invite cache.
        self.invites.lock().await.remove(&gid);
        // Drop the H247 in-memory session + serving-shard mirror (the
        // persisted GUILD.H247 row itself is wiped with everything else
        // by the deferred queue above).
        crate::commands::h247::session::clear_guild(incomplete.id.get()).await;
        crate::commands::h247::session::prune_messenger(incomplete.id.get()).await;
        tracing::info!("guildDelete {} queued, wipe at {}", gid, delete_at);
        // Leave log embed (mirrors Events/client/removeGuildLog.ts).
        // The unavailable payload only carries the id; fields fall back
        // to the id when Discord provides no full guild.
        if let Ok(logs_ch) = crate::config::load()
            .map(|c| c.guild_logs_channel_id)
            .unwrap_or_default()
            .trim()
            .parse::<u64>()
        {
            let vanity =
                leave_embed_vanity(full.as_ref().and_then(|g| g.vanity_url_code.as_deref()));
            let (gname, locale, members, icon) = full
                .as_ref()
                .map(|g| {
                    (
                        g.name.clone(),
                        g.preferred_locale.clone(),
                        g.member_count.to_string(),
                        g.icon_url(),
                    )
                })
                .unwrap_or_else(|| (gid.clone(), "unknown".to_string(), "idk".to_string(), None));
            // Shard-wide member total (mirrors getShardStats users in
            // removeGuildLog.ts; this process's cache here, like the
            // join log embed above).
            let mut total_members = 0u64;
            for cached_id in ctx.cache.guilds() {
                if let Some(cached) = ctx.cache.guild(cached_id) {
                    total_members += cached.member_count;
                }
            }
            // Footer icon attachment (mirrors the join log embed chrome;
            // removeGuildLog.ts:90-93 sets iconURL
            // "attachment://footer_icon.png").
            let footer_icon: Option<Vec<u8>> = match crate::commands::botcat::footer_icon_bytes(
                bot_pfp_routed(&self.pool, &gid).await.as_deref(),
            ) {
                Some(bytes) => Some(bytes),
                None => {
                    let face = ctx.cache.current_user().face();
                    crate::commands::shared::download_bytes(&face).await
                }
            };
            let mut leave_embed = serenity::CreateEmbed::default()
                .colour(0xFF0505_u32)
                .description("**A guild removed iHorizon !**")
                .field("Server Name", format!("`{gname}`"), true)
                .field("Server ID", format!("`{gid}`"), true)
                .field("Server Region", format!("`{locale}`"), true)
                .field("Member Count", format!("`{members}` members"), true)
                .field("Vanity URL", format!("`{vanity}`"), true)
                .field(
                    "New guilds total",
                    ctx.cache.guild_count().to_string(),
                    true,
                )
                .field(
                    "New members total",
                    format!("{total_members} members"),
                    true,
                )
                .field("Shard", shard_label(ctx.shard_id.get()), true);
            // Joined-at timestamp (mirrors
            // `.setTimestamp(guild.joinedTimestamp)` in removeGuildLog.ts).
            if let Some(g) = full.as_ref() {
                leave_embed = leave_embed.timestamp(g.joined_at);
            }
            if footer_icon.is_some() {
                leave_embed = leave_embed.footer(
                    serenity::CreateEmbedFooter::new("iHorizon ・ Joined at")
                        .icon_url("attachment://footer_icon.png"),
                );
            } else {
                leave_embed =
                    leave_embed.footer(serenity::CreateEmbedFooter::new("iHorizon ・ Joined at"));
            }
            if let Some(url) = icon {
                leave_embed = leave_embed.thumbnail(url);
            }
            let mut leave_msg = serenity::CreateMessage::new().embed(leave_embed);
            if let Some(bytes) = footer_icon {
                leave_msg =
                    leave_msg.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
            }
            let _ = serenity::ChannelId::new(logs_ch)
                .send_message(&ctx.http, leave_msg)
                .await;
        }
    }

    async fn guild_member_addition(
        &self,
        ctx: serenity::Context,
        mut new_member: serenity::Member,
    ) {
        // Mirrors guildconfig/joinRole.ts + joinMessage.ts + joinDm.ts
        // + blockBot.ts + tooNewAccount.ts.
        let gid = new_member.guild_id.get().to_string();
        // Block bots when configured (mirrors
        // Events/guildconfig/blockBot.ts: ban the bot, derank the
        // audit-attributed adder with simply+derank, DM the owner).
        if new_member.user.bot && block_bot_routed(&self.pool, &gid).await {
            if !self.bot_is_admin(&ctx, new_member.guild_id).await {
                return;
            }
            let _ = new_member
                .guild_id
                .ban_with_reason(
                    &ctx.http,
                    new_member.user.id,
                    0,
                    "The BlockBot function is enabled!",
                )
                .await;
            // Attribute the adder via the BotAdd audit entry (target-id
            // match, 20s recency, handled-set dedup like getLogs).
            let mut adder: Option<serenity::UserId> = None;
            {
                use serenity::model::guild::audit_log::{Action, MemberAction};
                if let Ok(logs) = new_member
                    .guild_id
                    .audit_logs(
                        &ctx.http,
                        Some(Action::Member(MemberAction::BotAdd)),
                        None,
                        None,
                        Some(AUDIT_LOG_FETCH_LIMIT),
                    )
                    .await
                {
                    let bot_id = ctx.cache.current_user().id.get();
                    let now_ms = chrono::Local::now().timestamp_millis();
                    if let Some(entry) = logs.entries.iter().find(|e| {
                        audit_entry_relevant(
                            e.target_id.map(|t| t.get()),
                            e.user_id.get(),
                            bot_id,
                            e.id.created_at().unix_timestamp() * 1000,
                            now_ms,
                            Some(new_member.user.id.get()),
                        )
                    }) {
                        if self
                            .handled_audit
                            .lock()
                            .await
                            .insert(entry.id.get().to_string())
                        {
                            adder = Some(entry.user_id);
                        }
                    }
                }
            }
            // Owner-exempt adder (mirrors the `executorId !== ownerId`
            // gate); anyone else is deranked.
            let owner_id = new_member
                .guild_id
                .to_partial_guild(&ctx.http)
                .await
                .map(|g| g.owner_id)
                .ok();
            if let Some(exec) = adder {
                if Some(exec) != owner_id {
                    crate::commands::protection::protect::apply_sanction(
                        &ctx.http,
                        new_member.guild_id,
                        exec,
                        "simply+derank",
                        "Attempt to add a Discord bot into this guild! -> Derank",
                    )
                    .await;
                }
            }
            // Owner DM embed (mirrors the blockBot.ts
            // protection_blockbot embed).
            if let Some(owner) = owner_id {
                let lang_code =
                    crate::db::guild_lang(&self.pool, Some(new_member.guild_id.get())).await;
                let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                let guild_name = ctx
                    .cache
                    .guild(new_member.guild_id)
                    .map(|g| g.name.clone())
                    .unwrap_or_default();
                let title = text("protection_blockbot_embed_title")
                    .replace("${member.guild.name}", &guild_name);
                let desc = text("protection_blockbot_embed_desc");
                let adder_text = adder
                    .map(|a| format!("<@{a}>"))
                    .unwrap_or_else(|| format!("`{}`", text("var_not_detected")));
                let embed = serenity::CreateEmbed::default()
                    .colour(0x2B2D31_u32)
                    .title(title)
                    .description(desc)
                    .field(text("var_user"), adder_text, true)
                    .field(
                        text("var_target_bot"),
                        format!("<@{}>", new_member.user.id.get()),
                        true,
                    )
                    .timestamp(serenity::Timestamp::now())
                    .footer(serenity::CreateEmbedFooter::new(
                        crate::commands::botcat::bot_footer_name(
                            bot_name_routed(&self.pool, &gid).await.as_deref(),
                        ),
                    ));
                if let Ok(dm) = owner.create_dm_channel(&ctx.http).await {
                    let _ = dm
                        .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                        .await;
                }
            }
            // Early return is intentional: the bot is banned above, so the
            // rest of the join pipeline (roles, greeting, captcha) must not
            // run for it. TS's parallel listeners race the ban; serialising
            // the ban first is the sane order.
            return;
        }
        // Minimum account age gate (mirrors tooNewAccount.ts: repeat-join
        // counter on USER.<uid>.BLOCK_NEW_ACCOUNT, kick while under
        // maxJoin, ban past it). TS skips bots up front
        // (`if (!member.guild || member.user.bot) return`), so the leg
        // below must not run for bots either (blockBot handles bots).
        if !new_member.user.bot {
            if let Some(raw) = block_new_account_routed(&self.pool, &gid).await {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                    let req = v.get("req").and_then(|r| r.as_i64()).unwrap_or(0);
                    let max_join = v.get("maxJoin").and_then(|m| m.as_i64());
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_secs() as i64)
                        .unwrap_or(0);
                    if crate::commands::guildconfig::too_young(
                        new_member.user.created_at().unix_timestamp(),
                        req,
                        now,
                    ) {
                        let count_key =
                            format!("USER.{}.BLOCK_NEW_ACCOUNT", new_member.user.id.get());
                        let join_count = too_new_join_count(
                            crate::db::tbl_get(&self.pool, &gid, &count_key)
                                .await
                                .as_deref(),
                        ) + 1;
                        let _ = crate::db::tbl_set(
                            &self.pool,
                            &gid,
                            &count_key,
                            &join_count.to_string(),
                        )
                        .await;
                        if too_new_should_ban(join_count, max_join) {
                            let _ = new_member
                                .guild_id
                                .ban_with_reason(
                                    &ctx.http,
                                    new_member.user.id,
                                    0,
                                    "[TooNewAccount] User join too much.",
                                )
                                .await;
                        } else {
                            let _ = new_member
                                .guild_id
                                .kick_with_reason(
                                    &ctx.http,
                                    new_member.user.id,
                                    "[TooNewAccount] Account is too new",
                                )
                                .await;
                        }
                        return;
                    }
                }
            }
        }
        // Join roles (mirrors joinRole.ts: blob joinroles string|string[],
        // legacy GUILD.JOIN_ROLE fallback). Array.isArray decides the shape:
        // a stored array (even single-element) replaces the member's roles
        // like roles.set, a bare string adds like roles.add.
        // GATE VERDICT: the TS ManageRoles early return lives at the top
        // of joinRole.ts only, where each guildMemberAdd file is its own
        // parallel listener. Scoping it to the whole Rust pipeline would
        // also kill joinMessage/joinDm/captcha for the newcomer, so the
        // gate below skips role assignment only and the pipeline continues.
        // OWNER VERDICT: joinRole.ts carries no owner exemption (unlike
        // blockBot.ts `executorId !== ownerId`), so none is added here.
        // JOINROLES-EMPTY VERDICT: `if (!roleid) return` in joinRole.ts —
        // an empty/missing joinroles row assigns nothing, mirrored by the
        // is_empty/first() guards below.
        // JOIN-REASONS VERDICT: TS passes "[AutoRole] Assign role for new
        // member" (set path) / "[JoinRole]" (add path). Serenity 0.12
        // Member::add_role carries no reason slot, so the add path stays
        // reasonless; the set path keeps the verbatim TS reason via
        // EditMember::audit_log_reason.
        if self.bot_can_manage_roles(&ctx, new_member.guild_id).await {
            let join_roles = crate::events::join_role_ids(&self.pool, &gid).await;
            let join_is_array: bool = guild_config_routed(&self.pool, &gid)
                .await
                .get("joinroles")
                .map(|v| v.is_array())
                .unwrap_or(false);
            if join_is_array && !join_roles.is_empty() {
                let want: Vec<serenity::RoleId> = join_roles
                    .iter()
                    .map(|rid| serenity::RoleId::new(*rid))
                    .collect();
                let _ = new_member
                    .edit(
                        &ctx.http,
                        serenity::EditMember::new()
                            .roles(want)
                            .audit_log_reason("[AutoRole] Assign role for new member"),
                    )
                    .await;
            } else if let Some(rid) = join_roles.first() {
                let _ = new_member
                    .add_role(&ctx.http, serenity::RoleId::new(*rid))
                    .await;
            }
        }
        // Invite attribution (mirrors joinMessage invite tracker):
        // diff live invite uses against the cache to find the inviter.
        // The winner is kept for the join message inviter slots below.
        // The live fetch is deduplicated per guild with a 1200ms resolve
        // timeout (mirrors fetchInvitesOnce + withTimeout in
        // joinMessage.ts); a slow/failed fetch leaves the join
        // unattributed, like the TS resolveInvite null path. The diff
        // stops at the first uses increase (mirrors the TS `.find`),
        // even when that invite carries no inviter.
        let mut attributed: Option<(u64, String, String)> = None;
        if let Some(live) = self
            .fetch_invites_dedup(&ctx.http, new_member.guild_id)
            .await
        {
            let mut cache = self.invites.lock().await;
            let entry = cache.entry(gid.clone()).or_default();
            for inv in &live {
                let cached = entry.get(&inv.code).map(|(u, _)| *u).unwrap_or(0);
                if inv.uses > cached {
                    if inv.inviter_id != 0 {
                        let inviter_id = inv.inviter_id;
                        attributed = Some((inviter_id, inv.code.clone(), inv.inviter_name.clone()));
                        entry.insert(inv.code.clone(), (inv.uses, inviter_id));
                        // BY shape mirrors joinMessage.ts recordInviterStats
                        // (`db.set(....INVITES.BY, {inviter, invite})`): the
                        // TS object form, so either side's leave leg reads
                        // the inviter and the code. Legacy raw-id rows still
                        // parse via parse_inviter_by_str.
                        let stats = crate::commands::invitesmanager::inv::load_invites(
                            &self.pool, &gid, inviter_id,
                        )
                        .await;
                        let next = crate::commands::invitesmanager::inv::InviteStats {
                            invites: stats.invites + 1,
                            regular: stats.regular + 1,
                            bonus: stats.bonus,
                            leaves: stats.leaves,
                        };
                        let _ = crate::commands::invitesmanager::inv::save_invites(
                            &self.pool, &gid, inviter_id, &next,
                        )
                        .await;
                        let _ = crate::db::tbl_set_json(
                            &self.pool,
                            &gid,
                            &format!("USER.{}.INVITES.BY", new_member.user.id.get()),
                            &serde_json::json!({
                                "inviter": inviter_id.to_string(),
                                "invite": inv.code,
                            }),
                        )
                        .await;
                    }
                    break;
                }
            }
            // Refresh cache snapshot (mirrors clientInviteCache in
            // joinMessage.ts: the whole live list is re-cached).
            for inv in &live {
                entry.insert(inv.code.clone(), (inv.uses, inv.inviter_id));
            }
        }
        // Guild blacklist gate (mirrors blacklistFetcher.ts): the global
        // BLACKLIST.<uid> table carries a reason; DM it, then ban.
        if let Some(reason) = blacklist_reason_routed(&self.pool, new_member.user.id.get()).await {
            let lang_code =
                crate::db::guild_lang(&self.pool, Some(new_member.guild_id.get())).await;
            let dm = crate::lang::get(&lang_code, "global_blacklist_msg_to_send")
                .unwrap_or_default()
                .replace("${data.reason}", &reason);
            let _ = new_member
                .user
                .direct_message(&ctx.http, serenity::CreateMessage::new().content(dm))
                .await;
            let ban_reason = crate::lang::get(&lang_code, "global_blacklist_reason")
                .unwrap_or_default()
                .replace("${data.reason}", &reason);
            let _ = new_member
                .guild_id
                .ban_with_reason(&ctx.http, new_member.user.id, 0, &ban_reason)
                .await;
            return;
        }
        if guild_blacklist_routed(&self.pool, &gid, new_member.user.id.get())
            .await
            .is_some()
        {
            let _ = new_member
                .guild_id
                .ban(&ctx.http, new_member.user.id, 0)
                .await;
            return;
        }
        // Nickname kicker (mirrors nickKicker.ts: the user-level
        // username, displayName (globalName ?? username in discord.js)
        // and globalName are all scanned — never the guild nickname;
        // the member is DM'd the `event_nick_kicker_kick_msg` notice,
        // then kicked with the `event_nick_kicker_kick_reason` lang
        // reason).
        if let Some(raw) = nick_kicker_routed(&self.pool, &gid).await {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
                let enabled = cfg
                    .get("enabled")
                    .and_then(|e| e.as_bool())
                    .unwrap_or(false);
                let words: Vec<String> = cfg
                    .get("words")
                    .and_then(|w| serde_json::from_value(w.clone()).ok())
                    .unwrap_or_default();
                if enabled
                    && crate::commands::utils::nick_matches(
                        &words,
                        &new_member.user.name,
                        Some(
                            new_member
                                .user
                                .global_name
                                .as_deref()
                                .unwrap_or(&new_member.user.name),
                        ),
                        new_member.user.global_name.as_deref(),
                    )
                {
                    let lang_code =
                        crate::db::guild_lang(&self.pool, Some(new_member.guild_id.get())).await;
                    let guild_name = ctx
                        .cache
                        .guild(new_member.guild_id)
                        .map(|g| g.name.clone())
                        .unwrap_or_else(|| "this server".to_string());
                    let dm = crate::lang::get(&lang_code, "event_nick_kicker_kick_msg")
                        .unwrap_or_default()
                        .replace("${member.guild.name}", &guild_name);
                    let _ = new_member
                        .user
                        .direct_message(&ctx.http, serenity::CreateMessage::new().content(dm))
                        .await;
                    let reason = crate::lang::get(&lang_code, "event_nick_kicker_kick_reason")
                        .unwrap_or_default();
                    let _ = new_member
                        .guild_id
                        .kick_with_reason(&ctx.http, new_member.user.id, &reason)
                        .await;
                    return;
                }
            }
        }
        // Join DM (mirrors joinDm.ts: blob joindm template, legacy
        // GUILD.JOIN_DM fallback, "off" disables; rendered preview +
        // disabled "Message from <guild id>" button, keeping the TS quirk).
        if let Some(tpl) = crate::events::join_dm_template(&self.pool, &gid).await {
            let count = ctx
                .cache
                .guild(new_member.guild_id)
                .map(|g| g.member_count)
                .unwrap_or(0);
            let guild_name = ctx
                .cache
                .guild(new_member.guild_id)
                .map(|g| g.name.clone())
                .unwrap_or_else(|| "this server".to_string());
            let text = crate::events::render_join_dm(
                &tpl,
                &new_member.user.name,
                &new_member.user.mention().to_string(),
                count,
                &guild_name,
            );
            let button = serenity::CreateButton::new("join-dm-from-server")
                .label(format!("Message from {}", new_member.guild_id.get()))
                .style(serenity::ButtonStyle::Secondary)
                .disabled(true);
            let row = serenity::CreateActionRow::Buttons(vec![button]);
            let _ = new_member
                .user
                .direct_message(
                    &ctx.http,
                    serenity::CreateMessage::new()
                        .content(text)
                        .components(vec![row]),
                )
                .await;
        }
        // Welcome message via the shared welcomer sender (mirrors
        // joinMessage.ts sendWelcome -> welcomerMessage.ts: rendered
        // template + avatar snapshot thumbnail + welcome accent).
        {
            let cfg = guild_config_routed(&self.pool, &gid).await;
            if let (Some(ch), Some(tpl)) = (
                cfg.get("join").and_then(|c| c.as_str()),
                cfg.get("joinmessage").and_then(|m| m.as_str()),
            ) {
                if let Ok(ch_id) = ch.parse::<u64>() {
                    let count = ctx
                        .cache
                        .guild(new_member.guild_id)
                        .map(|g| g.member_count)
                        .unwrap_or(0);
                    // Attributed inviter display (mirrors the joinMessage
                    // inviterUsername/inviterMention slots incl. the
                    // custom-vanity variant; TS literal defaults kept
                    // when unattributed).
                    let (inv_name, inv_mention) = match &attributed {
                        Some((iid, code, uname)) => {
                            let table = vanity_table_routed(&self.pool).await;
                            let bot_id = ctx.cache.current_user().id.get();
                            let vanity = crate::events::custom_vanity_code(
                                table.as_ref(),
                                &gid,
                                code,
                                bot_id,
                                *iid,
                            );
                            crate::events::inviter_display(
                                vanity.as_deref(),
                                uname,
                                &format!("<@{iid}>"),
                            )
                        }
                        None => ("unknow_user".to_string(), "@unknow_user".to_string()),
                    };
                    let text = crate::events::render_inviter_slots(
                        &crate::events::render_welcome(
                            tpl,
                            &new_member.user.mention().to_string(),
                            "this server",
                            count,
                        ),
                        &inv_name,
                        &inv_mention,
                    );
                    send_welcomer_message(
                        &ctx.http,
                        serenity::ChannelId::new(ch_id),
                        &new_member.user,
                        &text,
                        WELCOME_ACCENT,
                        WELCOME_AVATAR_NAME,
                    )
                    .await;
                }
            }
        }
        // Mirrors rolesaver/onMemberJoin.ts: restore snapshot roles
        // (replace semantics) when enabled, then drop the row.
        // ATOMICITY VERDICT: TS itself is not atomic either
        // (`roles.set` then `db.delete` as two awaits). A crash between
        // the two re-restores idempotently on next join, and the row
        // delete only runs after the role calls, so a partial restore
        // is retried rather than lost. Kept as-is on purpose.
        if crate::commands::newfeatures::load_rolesaver_cfg(&self.pool, &gid)
            .await
            .enabled
        {
            let key = format!("ROLE_SAVER.{}", new_member.user.id.get());
            if let Some(raw) =
                rolesaver_row_routed(&self.pool, &gid, new_member.user.id.get()).await
            {
                let roles: Vec<String> = serde_json::from_str(&raw).unwrap_or_default();
                // TS `if (!array || array.length === 0) return` only skips
                // the restore itself: scoped here (no early return) so an
                // empty snapshot neither wipes roles nor aborts the rest
                // of the join pipeline below.
                if !roles.is_empty() {
                    let want: Vec<serenity::RoleId> = roles
                        .iter()
                        .filter_map(|s| s.parse::<u64>().ok())
                        .map(serenity::RoleId::new)
                        .collect();
                    // Delta: no audit-log reason in serenity 0.12.
                    for r in want.iter().filter(|r| !new_member.roles.contains(r)) {
                        let _ = new_member.add_role(&ctx.http, *r).await;
                    }
                    for r in new_member
                        .roles
                        .iter()
                        .filter(|r| r.get() != new_member.guild_id.get() && !want.contains(r))
                    {
                        let _ = new_member.remove_role(&ctx.http, *r).await;
                    }
                    let _ = crate::db::tbl_del(&self.pool, &gid, &key).await;
                }
            }
        }
        // Ghost-ping watch prime (mirrors ghostPingModule.ts): send the
        // newcomer's mention into each watch channel, then delete it.
        // Per-channel bot-Administrator gate (mirrors the TS skip when
        // the bot lacks Administrator): cache-only like the TS
        // `channels.cache.get`, default-deny on lookup failure.
        for ch in crate::commands::guildconfig::load_ghost(&self.pool, &gid).await {
            if let Ok(ch_id) = ch.parse::<u64>() {
                let bot_id = ctx.cache.current_user().id;
                let allowed = ctx
                    .cache
                    .guild(new_member.guild_id)
                    .and_then(|gd| {
                        let gch = gd.channels.get(&serenity::ChannelId::new(ch_id))?;
                        let bot_member = gd.members.get(&bot_id)?;
                        Some(gd.user_permissions_in(gch, bot_member).administrator())
                    })
                    .unwrap_or(false);
                if !allowed {
                    continue;
                }
                // Nonce mirrors ghostPingModule.ts `enforceNonce: true,
                // nonce: SnowflakeUtil.generate()`: the prime ping is a real
                // send (so watch channels toast) instantly deleted; the
                // unique nonce keeps client-side dedup sane.
                let nonce_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);
                let prime = serenity::CreateMessage::new()
                    .content(format!("<@{}>", new_member.user.id.get()))
                    .nonce(serenity::model::channel::Nonce::String(format!(
                        "ghostping-{}-{}-{nonce_ms}",
                        new_member.guild_id.get(),
                        new_member.user.id.get()
                    )))
                    .enforce_nonce(true);
                if let Ok(sent) = serenity::ChannelId::new(ch_id)
                    .send_message(&ctx.http, prime)
                    .await
                {
                    let _ = sent.delete(&ctx.http).await;
                }
            }
        }
        // Security captcha challenge (mirrors security/onMemberJoin.ts).
        // Image decision: TS attaches html2png `captcha.png`; Rust
        // rasterizes `crate::cards::captcha_png` (900x300 parchment, no
        // Chromium). The code lives only in the image, never in text.
        // Attempts, roles, and the expiry kick all mirror TS.
        if let Some(raw) = security_cfg_routed(&self.pool, &gid).await {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
                let disabled =
                    crate::commands::security::security_disabled_value(cfg.get("disable"));
                let ch_id = cfg
                    .get("channel")
                    .and_then(|c| c.as_str())
                    .and_then(|c| c.parse::<u64>().ok());
                if !disabled {
                    if let Some(ch_id) = ch_id {
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(new_member.guild_id.get()))
                                .await;
                        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                        let code = security_code();
                        let expires = crate::commands::context::now_ms() / 1000 + 150;
                        let emoji = crate::emojis::app_emoji_markup(&ctx.http, "Schedule")
                            .await
                            .unwrap_or_default();
                        let content = format!(
                            "{}\n\n{}\n-# {}",
                            text("event_security")
                                .replace("${member}", &format!("<@{}>", new_member.user.id.get())),
                            text("event_security_expiry")
                                .replace("${timestamp}", &format!("<t:{expires}:R>"))
                                .replace("${attempts}", "3")
                                .replace("{emoji}", &emoji),
                            text("event_security_footer"),
                        );
                        if let Ok(sent) = serenity::ChannelId::new(ch_id)
                            .send_message(
                                &ctx.http,
                                serenity::CreateMessage::new()
                                    .content(content)
                                    .add_file(serenity::CreateAttachment::bytes(
                                        crate::cards::captcha_png(&code),
                                        "captcha.png",
                                    ))
                                    // Nonce mirrors onMemberJoin.ts
                                    // (`enforceNonce: true, nonce:
                                    // SnowflakeUtil.generate()`), same pattern as
                                    // the ghost-ping prime above: a unique nonce
                                    // keeps client-side dedup sane.
                                    .nonce(serenity::model::channel::Nonce::String(format!(
                                        "captcha-{}-{}-{expires}",
                                        new_member.guild_id.get(),
                                        new_member.user.id.get()
                                    )))
                                    .enforce_nonce(true),
                            )
                            .await
                        {
                            let role = cfg
                                .get("role")
                                .and_then(|r| r.as_str())
                                .and_then(|r| r.parse::<u64>().ok());
                            let role2 = cfg
                                .get("role2")
                                .and_then(|r| r.as_str())
                                .and_then(|r| r.parse::<u64>().ok());
                            // Still-present guard: the member may have left
                            // between join and the challenge send. Parking a
                            // challenge (and its expiry kick) for a gone
                            // member would kick a later rejoin under the old
                            // same-join window, so drop the message instead.
                            if new_member
                                .guild_id
                                .member(&ctx.http, new_member.user.id)
                                .await
                                .is_err()
                            {
                                let _ = sent.delete(&ctx.http).await;
                                return;
                            }
                            let key =
                                security_key(new_member.guild_id.get(), new_member.user.id.get());
                            let joined_at = new_member.joined_at.map(|t| t.unix_timestamp());
                            self.security.lock().await.insert(
                                key.clone(),
                                SecurityChallenge {
                                    channel_id: ch_id,
                                    message_id: sent.id.get(),
                                    user_id: new_member.user.id.get(),
                                    code,
                                    attempts_left: 3,
                                    role,
                                    role2,
                                    joined_at,
                                    expires_at: expires,
                                },
                            );
                            // Expiry task (mirrors the collector "end" leg):
                            // sleeps until expires_at, then kicks
                            // (same-join guard) and deletes the challenge
                            // message.
                            let http = ctx.http.clone();
                            let pool = self.pool.clone();
                            let security = self.security.clone();
                            let guild_id = new_member.guild_id;
                            let user_id = new_member.user.id;
                            let delay_secs =
                                (expires - crate::commands::context::now_ms() / 1000).max(0) as u64;
                            tokio::spawn(async move {
                                tokio::time::sleep(std::time::Duration::from_secs(delay_secs))
                                    .await;
                                let taken = security.lock().await.remove(&key);
                                if let Some(ch) = taken {
                                    let lang_code =
                                        crate::db::guild_lang(&pool, Some(guild_id.get())).await;
                                    let kick_reason =
                                        crate::lang::get(&lang_code, "event_security_kick_reason")
                                            .unwrap_or_default();
                                    if let Ok(member) = guild_id.member(&http, user_id).await {
                                        let same_join =
                                            member.joined_at.map(|t| t.unix_timestamp())
                                                == ch.joined_at;
                                        if member.joined_at.is_none() || same_join {
                                            let _ =
                                                member.kick_with_reason(&http, &kick_reason).await;
                                        }
                                    }
                                    let _ = serenity::ChannelId::new(ch.channel_id)
                                        .delete_message(
                                            &http,
                                            serenity::MessageId::new(ch.message_id),
                                        )
                                        .await;
                                }
                            });
                        }
                    }
                }
            }
        }
    }

    async fn guild_member_removal(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        user: serenity::User,
        member: Option<serenity::Member>,
    ) {
        // Mirrors avoidKickMember.ts: audit-log kick attribution
        // (target-id match, 20s recency, handled-set dedup live inside
        // the guard now). Kick has no reversal leg in TS.
        {
            use serenity::model::guild::audit_log::{Action, MemberAction};
            let _ = self
                .protection_guard(
                    &ctx,
                    guild_id,
                    Action::Member(MemberAction::Kick),
                    "kickmember",
                    Some(user.id.get()),
                )
                .await;
            // Rich audit embed (mirrors logs/kickLogs.ts).
            self.mod_audit_log(
                &ctx,
                guild_id,
                Action::Member(MemberAction::Kick),
                "event_srvLogs_guildMemberRemove_description",
                user.id.get(),
                None,
            )
            .await;
        }
        // Leaves tracking (mirrors invitesmanager leaves): decrement the
        // recorded inviter, record the leave.
        let gid = guild_id.get().to_string();
        if let Some(by) = invites_by_routed(&self.pool, &gid, user.id.get())
            .await
            .and_then(|s| crate::commands::invitesmanager::parse_inviter_by_str(&s))
        {
            let stats =
                crate::commands::invitesmanager::inv::load_invites(&self.pool, &gid, by).await;
            let next = crate::commands::invitesmanager::inv::InviteStats {
                invites: (stats.invites - 1).max(0),
                regular: stats.regular,
                bonus: stats.bonus,
                leaves: stats.leaves + 1,
            };
            let _ = crate::commands::invitesmanager::inv::save_invites(&self.pool, &gid, by, &next)
                .await;
        }
        // Leave message (mirrors leaveMessage.ts sendGoodbye ->
        // welcomerMessage.ts: leaveEmbedId/text/components variant with
        // welcomerEmbed resolve, inviter slots, default-template
        // fallback on send failure).
        let gid = guild_id.get().to_string();
        {
            let cfg = guild_config_routed(&self.pool, &gid).await;
            let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
            let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
            let text_enabled = cfg
                .get("leaveTextEnabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            // componentsEnabled is read for parity (`useComponents:
            // embed ? false : componentsEnabled`); serenity 0.12 has no
            // Components V2, so the send below is embed-only either way.
            let _components_enabled = cfg
                .get("leaveComponentsEnabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            // Inviter display for the {inviterUsername}/{inviterMention}
            // slots (mirrors the base?.inviter branch; the stats
            // decrement itself stays in the leaves-tracking leg above).
            let (inv_name, inv_mention, has_inviter) =
                match invites_by_routed(&self.pool, &gid, user.id.get())
                    .await
                    .and_then(|s| crate::commands::invitesmanager::parse_inviter_by_str(&s))
                {
                    Some(inviter_id) => {
                        let name = ctx
                            .cache
                            .guild(guild_id)
                            .and_then(|g| {
                                g.members
                                    .get(&serenity::UserId::new(inviter_id))
                                    .map(|m| m.user.name.clone())
                            })
                            .or_else(|| {
                                ctx.cache
                                    .user(serenity::UserId::new(inviter_id))
                                    .map(|u| u.name.clone())
                            })
                            .unwrap_or_else(|| "unknow_user".to_string());
                        let mention = format!("<@{inviter_id}>");
                        (name, mention, true)
                    }
                    None => ("unknow_user".to_string(), "@unknow_user".to_string(), false),
                };
            let render_leave = |tpl: &str| {
                crate::events::render_inviter_slots(
                    &crate::events::render_welcome(
                        tpl,
                        &user.mention().to_string(),
                        "this server",
                        0,
                    ),
                    &inv_name,
                    &inv_mention,
                )
            };
            let default_key = if has_inviter {
                "event_goodbye_inviter"
            } else {
                "event_goodbye_default"
            };
            let tpl = cfg.get("leavemessage").and_then(|m| m.as_str());
            // `leaveMessage || data.event_goodbye_*`, like TS.
            let message_content = render_leave(tpl.unwrap_or(&text(default_key)));
            // resolveWelcomerEmbed(leaveEmbedId, variables): global
            // EMBED.<id> record, embedSource preview-rendered over the
            // same mention/inviter slots, converted via the shared
            // build_embed (title/desc/url/color/author/footer/image/
            // thumbnail; fields beyond that are a documented delta).
            let stored_embed: Option<serenity::CreateEmbed> =
                match cfg
                    .get("leaveEmbedId")
                    .and_then(|c| c.as_str())
                    .filter(|s| !s.is_empty())
                {
                    Some(embed_id) => crate::commands::embed::embed_builder::load_stored_embed(
                        &self.pool, embed_id,
                    )
                    .await
                    .and_then(|rec| crate::events::welcomer_embed_source(&rec.to_string()))
                    .map(|source| crate::events::apply_embed_preview(&source, |s| render_leave(s)))
                    .map(|previewed| {
                        crate::commands::embed::embed_builder::build_embed(&previewed)
                    }),
                    None => None,
                };
            if let (Some(ch),) = (cfg.get("leave").and_then(|c| c.as_str()),) {
                if let Ok(ch_id) = ch.parse::<u64>() {
                    let channel_id = serenity::ChannelId::new(ch_id);
                    let content = text_enabled.then(|| message_content.clone());
                    if send_leave_message(&ctx.http, channel_id, &user, content, stored_embed)
                        .await
                        .is_err()
                    {
                        // Fallback leg (mirrors the TS catch: default
                        // template, inviter-free variables).
                        let fallback = crate::events::render_inviter_slots(
                            &crate::events::render_welcome(
                                &text("event_goodbye_default"),
                                &user.mention().to_string(),
                                "this server",
                                0,
                            ),
                            "unknow_user",
                            "@unknow_user",
                        );
                        let _ = send_leave_message(
                            &ctx.http,
                            channel_id,
                            &user,
                            text_enabled.then_some(fallback),
                            None,
                        )
                        .await;
                    }
                }
            }
        }
        // Mirrors rolesaver/onMemberLeave.ts: snapshot roles when
        // enabled (skips @everyone + admin roles on opt-out).
        // ROLESAVER-NONE VERDICT: TS always receives the member object
        // on guildMemberRemove and unconditionally writes the snapshot
        // array (possibly empty). Serenity delivers `member: Option` —
        // None on cache miss means the role list is unknowable, so no
        // row is written and any previous snapshot is left untouched
        // (fail-closed; the next leave with a cache hit re-snapshots).
        // Writing an empty row on None would wipe a good snapshot.
        let rs_cfg = crate::commands::newfeatures::load_rolesaver_cfg(&self.pool, &gid).await;
        if rs_cfg.enabled {
            if let Some(m) = member {
                let admin_of: std::collections::HashMap<u64, bool> = ctx
                    .cache
                    .guild(guild_id)
                    .map(|g| {
                        g.roles
                            .iter()
                            .map(|(id, r)| (id.get(), r.permissions.administrator()))
                            .collect()
                    })
                    .unwrap_or_default();
                let flagged: Vec<(u64, bool)> = m
                    .roles
                    .iter()
                    .map(|r| (r.get(), admin_of.get(&r.get()).copied().unwrap_or(false)))
                    .collect();
                let roles =
                    crate::events::snapshot_roles(&flagged, guild_id.get(), rs_cfg.skip_admin);
                let _ = crate::db::tbl_set(
                    &self.pool,
                    &gid,
                    &format!("ROLE_SAVER.{}", user.id.get()),
                    &serde_json::to_string(&roles).unwrap_or_default(),
                )
                .await;
            }
        }
        // Ticket cleanup on leave (mirrors deleteTicketOnLeave.ts):
        // transcript + log each of the leaver's tickets, delete the
        // channels, then drop their TICKET_ALL rows. Deliberate
        // deviation: TS `return`s out of the whole loop (skipping the
        // channel delete AND the row delete for that and every
        // remaining ticket) when the logs channel is missing. Here
        // close_ticket_channel still deletes the channel without a
        // logs channel, and every ticket is processed, so one missing
        // channel can never orphan the rest.
        let ticket_rows: Vec<String> =
            ticket_user_rows_routed(&self.pool, &gid, user.id.get()).await;
        if !ticket_rows.is_empty() {
            let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
            let actor = format!("<@{}>", user.id.get());
            for key in &ticket_rows {
                if let Some(ch_str) = key.rsplit('.').next() {
                    if let Ok(ch_id) = ch_str.parse::<u64>() {
                        let channel_id = serenity::ChannelId::new(ch_id);
                        let name = channel_id
                            .to_channel(&ctx.http)
                            .await
                            .ok()
                            .and_then(|c| c.guild().map(|g| g.name.clone()))
                            .unwrap_or_default();
                        let _ = crate::commands::ticket::main::close_ticket_channel(
                            &ctx.http,
                            &self.pool,
                            crate::commands::ticket::main::TicketCloseSpec {
                                gid: &gid,
                                lang_code: &lang_code,
                                channel_id,
                                title_key: "event_ticket_logsChannel_onDelete_embed_title",
                                desc_key: "event_ticket_logsChannel_onDelete_embed_desc",
                                replacements: &[
                                    ("${interaction.user}", &actor),
                                    ("${interaction.channel.name}", &name),
                                ],
                                colour: 0x008000_u32,
                            },
                        )
                        .await;
                    }
                }
            }
            let _ = crate::db::tbl_del_prefix(
                &self.pool,
                &gid,
                &format!("TICKET_ALL.{}.", user.id.get()),
            )
            .await;
        }
        tracing::debug!("memberLeave {} user {}", gid, user.id.get());
    }

    async fn message(&self, _ctx: serenity::Context, msg: serenity::Message) {
        // Mirrors Events/antispam/onNewMessage.ts (its own TS
        // listener): evaluated before the bot gate so `ignoreBots:
        // false` configs still scan bot messages; the leg applies
        // its own exemptions (webhook/self/owner/Admin/bypass).
        self.antispam_message(&_ctx, &msg).await;
        // Mirrors Events/stats/onNewMessage.ts + ranks/onNewMessage.ts.
        if msg.author.bot {
            return;
        }
        // Guild owner safety seal (once per guild per boot).
        if let Some(guild_id) = msg.guild_id {
            let gid = guild_id.get().to_string();
            let fresh = {
                let mut sealed = self.sealed.lock().await;
                sealed.insert(gid.clone())
            };
            if fresh {
                if let Ok(owner_id) = guild_id
                    .to_partial_guild(&_ctx.http)
                    .await
                    .map(|g| g.owner_id.get().to_string())
                {
                    let _ = crate::db::tbl_set(
                        &self.pool,
                        &gid,
                        &format!("GUILD.OWNER.{owner_id}"),
                        "1",
                    )
                    .await;
                }
            }
        }
        let Some(guild_id) = msg.guild_id else { return };
        let gid = guild_id.get().to_string();
        // TTS speak arm (mirrors src/Events/tts/messageCreate.ts): an
        // enabled TTS row + message in the TTS text channel + author in
        // the TTS voice channel + text within the 300-char cap speaks
        // via Flowery (script-locale override -> TTS lang -> guild lang
        // -> en-US). URL-only messages are skipped, failures are
        // silent. `content_safe` is the cleanContent equivalent (user /
        // role / channel mentions resolved to names instead of being
        // spoken as raw `<@...>` / `<#...>` syntax); the URL skip stays
        // on the raw content exactly like TS `isUrl(message.content)`.
        // Owned snapshot first: the cache guard is not Send and must
        // drop before any await.
        {
            let speak_text = msg.content_safe(&_ctx.cache);
            let armed: Option<(u64, String)> = match tts_raw_routed(&self.pool, &gid).await {
                Some(raw) if crate::commands::tts::tts_row_enabled(&raw) => {
                    match serde_json::from_str::<crate::commands::tts::TtsConfig>(&raw) {
                        Ok(cfg) => {
                            let text_ok = crate::commands::tts::tts_message_text_ok(&speak_text)
                                && !crate::commands::tts::tts_is_url(&msg.content);
                            let in_text = cfg
                                .text_channel_id
                                .parse::<u64>()
                                .map(|tc| tc == msg.channel_id.get())
                                .unwrap_or(false);
                            let in_voice = cfg
                                .voice_channel_id
                                .parse::<u64>()
                                .map(|vc| {
                                    _ctx.cache
                                        .guild(guild_id)
                                        .and_then(|g| g.voice_states.get(&msg.author.id).cloned())
                                        .and_then(|v| v.channel_id)
                                        .map(|c| c.get() == vc)
                                        .unwrap_or(false)
                                })
                                .unwrap_or(false);
                            if text_ok && in_text && in_voice {
                                cfg.voice_channel_id
                                    .parse::<u64>()
                                    .ok()
                                    .map(|vc| (vc, cfg.lang.clone()))
                            } else {
                                None
                            }
                        }
                        Err(_) => None,
                    }
                }
                _ => None,
            };
            if let Some((tts_vc, tts_lang)) = armed {
                let detected = crate::commands::tts::detect_message_locale(&speak_text);
                let server_lang = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                let locale = crate::commands::tts::resolve_tts_locale(
                    detected,
                    Some(&tts_lang),
                    Some(&server_lang),
                );
                // Self-heal (mirrors the createPlayer + connect leg in
                // speakTTS): no live player -> re-emit the OP4 join to
                // the TTS channel before queueing.
                if crate::lavalink::manager()
                    .snapshot(guild_id.get())
                    .await
                    .is_none()
                {
                    crate::lavalink::LavalinkManager::send_voice_state(
                        &_ctx.shard,
                        guild_id.get(),
                        Some(tts_vc),
                    );
                    // U4: await the voice-ready handshake before queueing
                    // audio (H247 8 x 300ms pattern in
                    // h247/join.rs `confirm_h247_join`): speak_tts must
                    // not race the OP4 join or the first chunk is lost.
                    let bot_uid = _ctx.cache.current_user().id;
                    for _ in 0..crate::voice::H247_JOIN_CONFIRM_ATTEMPTS {
                        tokio::time::sleep(std::time::Duration::from_millis(
                            crate::voice::H247_JOIN_CONFIRM_INTERVAL_MS as u64,
                        ))
                        .await;
                        let parked = _ctx
                            .cache
                            .guild(guild_id)
                            .and_then(|g| g.voice_states.get(&bot_uid).cloned())
                            .and_then(|v| v.channel_id)
                            .map(|c| c.get());
                        if parked == Some(tts_vc) {
                            break;
                        }
                    }
                }
                let bot_id = _ctx.cache.current_user().id.get();
                if let Err(e) = crate::commands::tts::speak::speak_tts(
                    &self.pool,
                    guild_id.get(),
                    &speak_text,
                    &locale,
                    bot_id,
                )
                .await
                {
                    tracing::warn!("tts speak failed in guild {gid}: {e:#}");
                }
            }
        }
        // Embed-builder awaited input (mirrors the handleCollector
        // message collectors in utils !embed.ts). The input still
        // flows through normal processing below, like TS.
        if embed_await_routed(&self.pool, &gid, msg.author.id.get())
            .await
            .is_some()
        {
            let guild_name = guild_id
                .to_partial_guild(&_ctx.http)
                .await
                .map(|g| g.name)
                .unwrap_or_else(|_| "this server".to_string());
            crate::commands::embed::embed_builder::handle_builder_input(
                &_ctx.http,
                &self.pool,
                &gid,
                &guild_name,
                &msg,
            )
            .await;
        }
        // Allowlist lazy seed (mirrors createAllowlistOnMessage.ts):
        // first observed message creates the owner entry.
        if !msg.author.bot {
            let seeded: bool = allowlist_seeded_routed(&self.pool, &gid).await;
            if !seeded {
                if let Ok(owner) = guild_id
                    .to_partial_guild(&_ctx.http)
                    .await
                    .map(|g| g.owner_id.get().to_string())
                {
                    let _ = crate::db::tbl_set(
                        &self.pool,
                        &gid,
                        &format!("ALLOWLIST.list.{owner}"),
                        r#"{"allowed":true}"#,
                    )
                    .await;
                }
            }
        }
        // Security captcha answers (mirrors the onMemberJoin collector).
        self.security_answer(&_ctx, &msg).await;
        // Mention-ping rank-role grant + info (mirrors
        // Events/utils/rankRoleModule.ts): a message whose whole content
        // is `<@{botId}>`, sent by someone else in a guild text channel
        // where the bot holds SendMessages + ManageRoles. With a
        // GUILD.RANK_ROLES role configured (and present in the guild,
        // like the TS roles.cache find), the author's username/globalName
        // is matched — a missing nicknames row grants directly, like
        // falsy `dbGet.nicknames` — and the grant embed carries the bot
        // footer + attachment, sent plain to the channel. Without a
        // configured role the info text replies instead (7s per-user
        // cooldown + member UseApplicationCommands gate, mirroring
        // interactionSend on a Message). Anything else is a silent
        // no-op, like the TS early returns; processing then falls
        // through below.
        let bot_id = _ctx.cache.current_user().id;
        if !msg.author.bot
            && msg.author.id != bot_id
            && is_bot_ping(&msg.content, bot_id.get())
            && Self::is_guild_text_channel(&_ctx, guild_id, msg.channel_id).await
        {
            // Bot channel perms (mirrors the channel.permissionsFor
            // SendMessages + ManageRoles guard): cache-computed, failing
            // closed like the TS early return.
            let bot_chan_ok = _ctx
                .cache
                .guild(guild_id)
                .map(
                    |g| match (g.channels.get(&msg.channel_id), g.members.get(&bot_id)) {
                        (Some(ch), Some(me)) => {
                            let p = g.user_permissions_in(ch, me);
                            p.send_messages() && p.manage_roles()
                        }
                        _ => false,
                    },
                )
                .unwrap_or(false);
            if bot_chan_ok {
                if let Ok(member) = guild_id.member(&_ctx.http, msg.author.id).await {
                    let roles_raw = rank_role_single_routed(&self.pool, &gid).await;
                    let role_num = roles_raw
                        .as_deref()
                        .and_then(crate::commands::h247::grant::parse_role_id)
                        .filter(|n| {
                            _ctx.cache
                                .guild(guild_id)
                                .is_some_and(|g| g.roles.contains_key(&serenity::RoleId::new(*n)))
                        });
                    match role_num {
                        Some(role_num) => {
                            let needles = rank_nicknames_routed(&self.pool, &gid)
                                .await
                                .map(|raw| crate::commands::h247::grant::rank_needles(&raw))
                                .unwrap_or_default();
                            // Empty needles = no nickname gate configured
                            // (mirrors falsy `dbGet.nicknames`): grant
                            // directly.
                            let matched = needles.is_empty()
                                || needles.iter().any(|n| {
                                    crate::commands::h247::grant::username_matches(
                                        &msg.author.name,
                                        msg.author.global_name.as_deref(),
                                        n,
                                    )
                                });
                            let role_id = serenity::RoleId::new(role_num);
                            if matched && !member.roles.contains(&role_id) {
                                let _ = member.add_role(&_ctx.http, role_id).await;
                                let lang_code =
                                    crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                                let text = crate::lang::get(&lang_code, "event_rank_role")
                                    .unwrap_or_default()
                                    .replace(
                                        "${message.author.id}",
                                        &msg.author.id.get().to_string(),
                                    )
                                    .replace("${fetch.id}", &role_num.to_string());
                                if !text.is_empty() {
                                    let footer_name = crate::commands::botcat::bot_footer_name(
                                        bot_name_routed(&self.pool, &gid).await.as_deref(),
                                    );
                                    let stored = bot_pfp_routed(&self.pool, &gid).await;
                                    let icon = match crate::commands::botcat::footer_icon_bytes(
                                        stored.as_deref(),
                                    ) {
                                        Some(bytes) => Some(bytes),
                                        None => {
                                            let face = _ctx.cache.current_user().face();
                                            crate::commands::botcat::download_bytes(&face).await
                                        }
                                    };
                                    let mut embed = serenity::CreateEmbed::default()
                                        .description(text)
                                        .timestamp(serenity::Timestamp::now());
                                    let mut out_msg = serenity::CreateMessage::new();
                                    if let Some(bytes) = icon {
                                        embed = embed.footer(
                                            serenity::CreateEmbedFooter::new(footer_name)
                                                .icon_url("attachment://footer_icon.png"),
                                        );
                                        out_msg =
                                            out_msg.add_file(serenity::CreateAttachment::bytes(
                                                bytes,
                                                "footer_icon.png",
                                            ));
                                    } else {
                                        embed = embed
                                            .footer(serenity::CreateEmbedFooter::new(footer_name));
                                    }
                                    let _ = msg
                                        .channel_id
                                        .send_message(&_ctx.http, out_msg.embed(embed))
                                        .await;
                                }
                            }
                        }
                        None => {
                            // Info leg (mirrors the `!dbGet || !dbGet.roles`
                            // branch): prefix + mention + badge text, 1/8
                            // prefix-change upsell, 7s per-user cooldown,
                            // member UseApplicationCommands gate, then a
                            // reply (interactionSend on a Message replies).
                            let lang_code =
                                crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                            let prefix =
                                crate::db::guild_prefix(&self.pool, Some(guild_id.get()), "?")
                                    .await;
                            let mut text = crate::lang::get(&lang_code, "ping_bot_show_info_msg")
                                .unwrap_or_default()
                                .replace("${prefix}", &prefix)
                                .replace(
                                    "${message.author.toString()}",
                                    &msg.author.mention().to_string(),
                                )
                                .replace(
                                    "${client.iHorizon_Emojis.Slash_Bot_Badge}",
                                    &crate::emojis::app_emoji_markup(&_ctx.http, "Slash_Bot_Badge")
                                        .await
                                        .unwrap_or_default(),
                                );
                            if rand::random::<u8>().is_multiple_of(8) {
                                text.push_str(
                                    &crate::lang::get(
                                        &lang_code,
                                        "ping_bot_show_info_msg_about_change_prefix",
                                    )
                                    .unwrap_or_default()
                                    .replace(
                                        "${client.iHorizon_Emojis.VC_OpenChat}",
                                        &crate::emojis::app_emoji_markup(&_ctx.http, "VC_OpenChat")
                                            .await
                                            .unwrap_or_default(),
                                    ),
                                );
                            }
                            // Cooldown records first: TS calls
                            // helper.cooldown before the canUseCommands
                            // check, so an ungated ping still starts the
                            // window; only a fresh window + the gate sends.
                            // The gate is channel-level on the fetched
                            // member row (like channel.permissionsFor),
                            // falling back to the guild-level bit when the
                            // channel is out of cache.
                            let now = crate::commands::context::now_ms();
                            let fresh = ping_bot_cooldown_ok(msg.author.id.get(), now);
                            let can_use = _ctx
                                .cache
                                .guild(guild_id)
                                .and_then(|g| {
                                    g.channels.get(&msg.channel_id).map(|ch| {
                                        g.user_permissions_in(ch, &member)
                                            .use_application_commands()
                                    })
                                })
                                .unwrap_or_else(|| {
                                    member
                                        .permissions
                                        .map(|p| p.use_application_commands())
                                        .unwrap_or(false)
                                });
                            if fresh && can_use && !text.is_empty() {
                                let _ = msg.reply(&_ctx.http, text).await;
                            }
                        }
                    }
                }
            }
        }
        // XP + stats (mirrors Events/ranks/onNewMessage.ts +
        // Events/stats/onNewMessage.ts). Placed above the custom-automod
        // block on purpose: TS runs stats/ranks as independent listeners,
        // so a deleted message still earns its activity row — the automod
        // delete+return below must never skip it. STATS are recorded for
        // message; the XP legs gate inside `record_message_activity_full`
        // (parseMessageCommand skip, `disable`, bypassChannels). There is
        // no xpchannels earning gate in TS — the channel only routes the
        // announce. Non-GuildText channels earn no XP (TS
        // `channel.type !== ChannelType.GuildText` return) but still
        // record stats, so they ride the same command-skip leg.
        // Bot SendMessages in this channel (best-effort allow on
        // lookup failure, like the other emitter guards here).
        // Deprecated GuildChannel::permissions_for_user avoided:
        // Guild::user_permissions_in is the supported path.
        let bot_id = _ctx.cache.current_user().id.get();
        let (is_guild_text, can_send) = match msg.channel(&_ctx.http).await {
            Ok(serenity::Channel::Guild(g)) => {
                let text = g.kind == serenity::ChannelType::Text;
                let send = _ctx
                    .cache
                    .guild(guild_id)
                    .and_then(|gd| {
                        let bot = _ctx.cache.current_user().id;
                        gd.members
                            .get(&bot)
                            .map(|m| gd.user_permissions_in(&g, m).send_messages())
                    })
                    .unwrap_or(true);
                (text, send)
            }
            _ => (false, true),
        };
        // Prefix-command detection (mirrors the parseMessageCommand
        // early-return): a consumed command earns no XP, stats still land.
        let prefix = crate::db::guild_prefix(&self.pool, Some(guild_id.get()), "?").await;
        let command_handled =
            crate::commands::ranks::main::message_is_prefix_command(&msg.content, &prefix, bot_id)
                || !is_guild_text;
        // Stored custom message or guild-lang default, rendered by the
        // full path with the POST-level-up level (TS
        // `generateCustomMessagePreview(..., { ranks: { level: newLevel } })`).
        // Never pre-rendered here: the stale pre-level value is wrong.
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
        let stored_tpl = ranks_message_routed(&self.pool, &gid).await;
        let earn_tpl = stored_tpl.or_else(|| {
            crate::lang::get(&lang_code, "event_xp_level_earn").filter(|s| !s.is_empty())
        });
        let info_tpl = crate::lang::get(&lang_code, "event_xp_level_additional_info")
            .filter(|s| !s.is_empty());
        let role_ids: Vec<u64> = msg
            .member
            .as_ref()
            .map(|m| m.roles.iter().map(|r| r.get()).collect())
            .unwrap_or_default();
        let mention_owned = msg.author.mention().to_string();
        let (guild_name_owned, member_count) = _ctx
            .cache
            .guild(guild_id)
            .map(|g| (g.name.clone(), g.member_count))
            .unwrap_or_default();
        let out = crate::events::record_message_activity_full(
            &self.pool,
            &gid,
            msg.author.id.get(),
            msg.channel_id.get(),
            // UTF-16 code units, mirroring TS `message.content.length`
            // (JS strings count UTF-16 units, not bytes).
            msg.content.encode_utf16().count() as u64,
            msg.timestamp.unix_timestamp() * 1000,
            crate::events::XpMessageInput {
                command_handled,
                can_send,
                channel_exists: true,
                member_roles: &role_ids,
                shop_json: None,
                template_override: earn_tpl.as_deref(),
                additional_info_override: info_tpl.as_deref(),
                member_username: &msg.author.name,
                member_mention: &mention_owned,
                member_count,
                guild_name: &guild_name_owned,
                ..Default::default()
            },
        )
        .await;
        let level = out.level;
        if out.leveled {
            // Level-up announce routed by the full path (in place,
            // xpchannels, or silent).
            if let Some(text) = out.text {
                match out.target {
                    crate::events::XpAnnounceTarget::ReplyInPlace => {
                        // U5: trace-log announce failures (never silent).
                        if let Err(e) = msg.channel_id.say(&_ctx.http, text).await {
                            tracing::warn!("xp level-up announce failed in guild {gid}: {e:#}");
                        }
                    }
                    crate::events::XpAnnounceTarget::SendToChannel(id) => {
                        if let Ok(chan) = id.parse::<u64>() {
                            if let Err(e) =
                                serenity::ChannelId::new(chan).say(&_ctx.http, text).await
                            {
                                tracing::warn!(
                                    "xp level-up announce failed in guild {gid} channel {chan}: {e:#}"
                                );
                            }
                        }
                    }
                    crate::events::XpAnnounceTarget::Suppressed => {}
                }
            }
            // Rank-role rewards (mirrors onNewMessage.ts:103-158): the
            // highest role at or below the new level is assigned, every
            // other configured rank role the member holds is removed.
            if let Ok(member) = guild_id.member(&_ctx.http, msg.author.id).await {
                let roles: Vec<crate::commands::ranks::main::RankRole> =
                    crate::commands::ranks::roles::load_rank_roles_routed(&self.pool, &gid).await;
                let held: Vec<String> = member.roles.iter().map(|r| r.get().to_string()).collect();
                let (assign, remove) =
                    crate::commands::ranks::main::rank_role_assignment(&roles, level, &held);
                for role_id in remove {
                    if let Ok(rid) = role_id.parse::<u64>() {
                        // U1: audit reason mirrors onNewMessage.ts
                        // "Removal of old rank roles" (Member::remove_role
                        // carries no reason, so go through Http).
                        let _ = _ctx
                            .http
                            .remove_member_role(
                                guild_id,
                                msg.author.id,
                                poise::serenity_prelude::RoleId::new(rid),
                                Some("Removal of old rank roles"),
                            )
                            .await;
                    }
                }
                if let Some(role_id) = assign {
                    if let Ok(rid) = role_id.parse::<u64>() {
                        // U1: audit reason mirrors onNewMessage.ts
                        // "Rank Role Assignment".
                        let _ = _ctx
                            .http
                            .add_member_role(
                                guild_id,
                                msg.author.id,
                                poise::serenity_prelude::RoleId::new(rid),
                                Some("Rank Role Assignment"),
                            )
                            .await;
                    }
                }
            }
        }
        // Custom automod enforcement (link/invite/telegram/mass-mention).
        // Sits below XP + stats on purpose (see above): the delete+return
        // never skips activity recording. The return still skips the
        // downstream game/fun arms (counter, github-lines, honeypot) —
        // intentional: a removed message must not drive games or unfurls.
        {
            let content = &msg.content;
            let tripped = (self.automod_on(&gid, "discord-invite").await
                && crate::commands::guildconfig::contains_discord_invite(content))
                || (self.automod_on(&gid, "telegram-link").await
                    && crate::commands::guildconfig::contains_telegram_link(content))
                || (self.automod_on(&gid, "link").await
                    && crate::commands::guildconfig::contains_link(content))
                || (self.automod_on(&gid, "mass-mention").await
                    && crate::commands::guildconfig::mention_count(content) >= 5);
            if tripped {
                // Staff + exempt-role + webhook gates (mirrors the
                // blockSpam.ts head: Administrator/ManageGuild staff skip,
                // native Keyword-rule exemptRoles skip; webhook messages
                // never trigger). A skip only spares the delete —
                // processing falls through below.
                let mut exempt = msg.webhook_id.is_some();
                if !exempt {
                    exempt = msg
                        .member
                        .as_ref()
                        .map(|m| {
                            m.permissions
                                .map(|p| p.administrator() || p.manage_guild())
                                .unwrap_or(false)
                        })
                        .unwrap_or(false);
                }
                if !exempt {
                    if let Ok(rules) = guild_id.automod_rules(&_ctx.http).await {
                        if let Some(rule) = rules.iter().find(|r| {
                            matches!(
                                r.trigger,
                                serenity::Trigger::Keyword { .. } | serenity::Trigger::Unknown(1)
                            )
                        }) {
                            let member_roles: Vec<u64> = if let Some(m) = &msg.member {
                                m.roles.iter().map(|r| r.get()).collect()
                            } else {
                                guild_id
                                    .member(&_ctx.http, msg.author.id)
                                    .await
                                    .map(|m| m.roles.iter().map(|r| r.get()).collect())
                                    .unwrap_or_default()
                            };
                            if rule
                                .exempt_roles
                                .iter()
                                .any(|r| member_roles.contains(&r.get()))
                            {
                                exempt = true;
                            }
                        }
                    }
                }
                if !exempt {
                    let _ = msg.delete(&_ctx.http).await;
                    return;
                }
            }
        }
        // Counting game. Mirrors Events/counter/onNewMessage.ts
        // (bots/webhooks/empty messages skip; wrong entries reset
        // COUNTER_DATA to zero with ✅/❌ reactions, replies and
        // topic updates). The empty check is the raw `=== ""` (only a
        // truly empty content returns early); anything else — including
        // whitespace-only — reaches the isNumber gate below and takes
        // the wrong-number path, exactly like TS.
        if msg.webhook_id.is_none() && !msg.content.is_empty() {
            if let Some(counter_ch) = counter_channel_routed(&self.pool, &gid).await {
                if counter_ch == msg.channel_id.get().to_string() {
                    let enabled = counter_config_routed(&self.pool, &gid)
                        .await
                        .map(|v| v != "off")
                        .unwrap_or(true);
                    if enabled {
                        use crate::commands::newfeatures as nf;
                        let author_id = msg.author.id.get().to_string();
                        let raw = counter_data_routed(&self.pool, &gid).await;
                        let mut last = nf::parse_counter_data(raw.as_deref());
                        // LEGACY-NUMBER VERDICT: TS backports ANY JSON
                        // number (`typeof lastNumber === "number"`), while
                        // parse_counter_data only takes i64 — a bare float
                        // or u64-wide row would read amount 0 and wrongly
                        // reset the game. Re-read such rows here (fraction
                        // truncated, u64 saturated) so legacy rows keep
                        // counting instead of resetting.
                        if last.amount == 0 && last.user_id.is_none() {
                            if let Some(raw) = raw.as_deref() {
                                if let Ok(v) = serde_json::from_str::<serde_json::Value>(raw.trim())
                                {
                                    if v.is_number() && v.as_i64().is_none() {
                                        let n = v
                                            .as_u64()
                                            .map(|u| u.min(i64::MAX as u64) as i64)
                                            .or_else(|| v.as_f64().map(|f| f as i64))
                                            .unwrap_or(0);
                                        last = nf::CounterData {
                                            amount: n,
                                            user_id: None,
                                        };
                                    }
                                }
                            }
                        }
                        let code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                        let text = |key: &str, fallback: &str| {
                            crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
                        };
                        let reset = || {
                            nf::counter_data_json(&nf::CounterData {
                                amount: 0,
                                user_id: None,
                            })
                        };
                        match nf::counter_step(&last, &author_id, &msg.content) {
                            nf::CounterOutcome::Accept { number } => {
                                let data = nf::CounterData {
                                    amount: number,
                                    user_id: Some(author_id),
                                };
                                let _ = crate::db::tbl_set(
                                    &self.pool,
                                    &gid,
                                    "COUNTER_DATA",
                                    &nf::counter_data_json(&data),
                                )
                                .await;
                                let _ = msg.react(&_ctx.http, '✅').await;
                                let topic =
                                    text("counter_actual_number", "Current Number: {number}")
                                        .replace("{number}", &number.to_string());
                                let _ = msg
                                    .channel_id
                                    .edit(&_ctx.http, serenity::EditChannel::new().topic(topic))
                                    .await;
                            }
                            nf::CounterOutcome::WrongNumber { same_user, number } => {
                                let _ = msg.react(&_ctx.http, '❌').await;
                                let _ =
                                    crate::db::tbl_set(&self.pool, &gid, "COUNTER_DATA", &reset())
                                        .await;
                                if same_user {
                                    let reply = text(
                                        "counter_error_too_much_u",
                                        "You cannot count twice in a row. Next number is 1.",
                                    )
                                    .replace(
                                        "${message.author.id}",
                                        &msg.author.id.get().to_string(),
                                    )
                                    .replace("${number}", &number.to_string());
                                    let _ = msg.reply(&_ctx.http, reply).await;
                                } else {
                                    let reply = text(
                                        "counter_error_syntaxic",
                                        "Wrong number. Next number is 1.",
                                    )
                                    .replace(
                                        "${message.author.id}",
                                        &msg.author.id.get().to_string(),
                                    );
                                    let _ = msg.reply(&_ctx.http, reply).await;
                                }
                            }
                            nf::CounterOutcome::NotNumber => {
                                let _ = msg.react(&_ctx.http, '❌').await;
                                let _ =
                                    crate::db::tbl_set(&self.pool, &gid, "COUNTER_DATA", &reset())
                                        .await;
                                let reply = text(
                                    "counter_error_syntaxic",
                                    "Wrong number. Next number is 1.",
                                )
                                .replace("${message.author.id}", &msg.author.id.get().to_string());
                                let _ = msg.reply(&_ctx.http, reply).await;
                            }
                        }
                    }
                }
            }
        }
        // Mirrors Events/utils/picOnlyModule.ts: media-only channels.
        // TS is its own messageCreate listener, so nothing here returns
        // out of message(): each leg below only skips itself.
        if !msg.author.bot && msg.webhook_id.is_none() {
            if let Some(raw) = pic_only_routed(&self.pool, &gid).await {
                let list: Vec<String> = serde_json::from_str(&raw).unwrap_or_default();
                if list.contains(&msg.channel_id.get().to_string()) {
                    let cfg: serde_json::Value = pic_only_config_routed(&self.pool, &gid)
                        .await
                        .and_then(|s| serde_json::from_str(&s).ok())
                        .unwrap_or(serde_json::Value::Null);
                    let types: Vec<Option<String>> = msg
                        .attachments
                        .iter()
                        .map(|a| a.content_type.clone())
                        .collect();
                    let has_media = pic_only_has_media(&types);
                    let staff = msg
                        .member
                        .as_ref()
                        .and_then(|m| m.permissions)
                        .map(|p| p.moderate_members())
                        .unwrap_or(false);
                    if !has_media && !staff {
                        let _ = msg.delete(&_ctx.http).await;
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                        let now_ms = crate::commands::context::now_ms();
                        let mut warns = self.pic_warns.lock().await;
                        let recent = pic_only_recent_warns(
                            warns
                                .get(&msg.author.id.get().to_string())
                                .map(Vec::as_slice)
                                .unwrap_or(&[]),
                            now_ms,
                        );
                        let mut next = recent;
                        next.push(now_ms);
                        let strikes = next.len();
                        if next.is_empty() {
                            warns.remove(&msg.author.id.get().to_string());
                        } else {
                            warns.insert(msg.author.id.get().to_string(), next);
                        }
                        drop(warns);
                        // Strike trigger is a hardcoded 3 in TS
                        // (`if (userWarnings.length >= 3)`); the configured
                        // threshold only feeds the warn-DM text.
                        if strikes >= PICONLY_STRIKE_LIMIT {
                            self.pic_warns
                                .lock()
                                .await
                                .remove(&msg.author.id.get().to_string());
                            let mute_ms = cfg
                                .get("muteTime")
                                .and_then(|m| m.as_i64())
                                .filter(|m| *m > 0)
                                .unwrap_or(
                                    crate::commands::utils::channels::media_only::PICONLY_DEFAULT_MUTE_MS,
                                );
                            if let Ok(member) = guild_id.member(&_ctx.http, msg.author.id).await {
                                let mut member = member;
                                let until_secs = now_ms / 1000 + mute_ms / 1000;
                                // TIMEOUT-REASON VERDICT: TS passes
                                // `lang.piconly_module_timeout_reason` to
                                // `member.timeout()`; serenity 0.12
                                // `disable_communication_until_datetime`
                                // carries no reason slot, so the key is
                                // read for parity only via the warn/timeout
                                // DMs below. No YAML change needed (key
                                // already exists).
                                if let Ok(until) =
                                    serenity::Timestamp::from_unix_timestamp(until_secs)
                                {
                                    let _ = member
                                        .disable_communication_until_datetime(&_ctx.http, until)
                                        .await;
                                }
                            }
                            let bot_id = _ctx.cache.current_user().id;
                            let bot_name = _ctx.cache.current_user().name.clone();
                            let (bot_roles, guild_name, guild_roles) = _ctx
                                .cache
                                .guild(guild_id)
                                .map(|g| {
                                    (
                                        g.members.get(&bot_id).map(|m| m.roles.clone()),
                                        g.name.clone(),
                                        g.roles
                                            .iter()
                                            .map(|(id, r)| (*id, (r.name.clone(), r.position)))
                                            .collect(),
                                    )
                                })
                                .unwrap_or((None, "this server".to_string(), Default::default()));
                            let bot_author_id = _ctx.cache.current_user().id.get();
                            crate::commands::moderation::warn_member_with_author(
                                &crate::commands::moderation::WarnContext {
                                    http: &_ctx.http,
                                    guild_name: Some(guild_name),
                                    author_top_roles: bot_roles,
                                    guild_roles: Some(guild_roles),
                                    pool: &self.pool,
                                    gid: &gid,
                                    guild_id,
                                    author_name: &bot_name,
                                    target: &msg.author,
                                    reason: "Automated Punishment - Pic Only",
                                    lang_code: &lang_code,
                                },
                                Some(bot_author_id),
                            )
                            .await;
                            let punish = text("piconly_module_punish_msg")
                                .replace("${message.author}", &msg.author.mention().to_string());
                            let _ = msg
                                .author
                                .direct_message(
                                    &_ctx.http,
                                    serenity::CreateMessage::new().content(punish),
                                )
                                .await;
                        } else {
                            let threshold = cfg
                                .get("threshold")
                                .and_then(|t| t.as_i64())
                                .filter(|t| *t > 0)
                                .unwrap_or(
                                    crate::commands::utils::channels::media_only::PICONLY_DEFAULT_THRESHOLD,
                                );
                            let warn = text("piconly_module_warn_msg")
                                .replace("${message.author}", &msg.author.mention().to_string())
                                .replace("${userWarnings.length}", &strikes.to_string())
                                .replace("${threshold}", &threshold.to_string());
                            let _ = msg
                                .author
                                .direct_message(
                                    &_ctx.http,
                                    serenity::CreateMessage::new().content(warn),
                                )
                                .await;
                        }
                    }
                    // Thread leg runs for every message in the channel
                    // (inside the channel match, outside the media/staff
                    // gate), exactly like the TS createThread block.
                    if cfg.get("createThread").and_then(|c| c.as_str()) == Some("yes") {
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                        let name = crate::lang::get(&lang_code, "utils_piconly_var_thread_name")
                            .unwrap_or_default()
                            .replace(
                                "{name}",
                                &msg.member
                                    .as_ref()
                                    .and_then(|m| m.nick.clone())
                                    .unwrap_or_else(|| msg.author.name.clone()),
                            );
                        if let Ok(thread) = _ctx
                            .http
                            .create_thread_from_message(
                                msg.channel_id,
                                msg.id,
                                &serenity::CreateThread::new(name),
                                None,
                            )
                            .await
                        {
                            let _ = _ctx
                                .http
                                .edit_thread(
                                    thread.id,
                                    &serenity::EditThread::new()
                                        .invitable(true)
                                        .locked(false)
                                        .archived(false),
                                    None,
                                )
                                .await;
                        }
                    }
                }
            }
        }
        // Mirrors Events/guildconfig/autoreact.ts (master switch first).
        let autoreact_on =
            crate::commands::guildconfig::autoreact::autoreact_enabled_routed(&self.pool, &gid)
                .await;
        if autoreact_on {
            Self::autoreact_emit(&self.pool, &_ctx.http, &gid, &msg).await;
        }
        // Mirrors Events/sticky/onNewMessage.ts: 5s debounced
        // repost of the enabled sticky (bot/webhook messages skip).
        if !msg.author.bot && msg.webhook_id.is_none() {
            if let Some(guild_id) = msg.guild_id {
                if crate::commands::sticky::main::load_sticky(
                    &self.pool,
                    &gid,
                    msg.channel_id.get(),
                )
                .await
                .is_some()
                {
                    crate::commands::sticky::main::schedule_refresh(
                        _ctx.http.clone(),
                        _ctx.cache.clone(),
                        self.pool.clone(),
                        gid.clone(),
                        guild_id,
                        msg.channel_id,
                    );
                }
            }
        }
        // Mirrors Events/suggestion/onNewMessage.ts: delete the original,
        // 5-word gate, bot-posted `#code` embed, thread on the bot
        // message, Yes/No votes, SUGGESTION.<code> record.
        // Kept expanded: the nested channel/disabled guards span awaits.
        #[allow(clippy::collapsible_if)]
        if let Some(suggest_ch) = suggest_channel_routed(&self.pool, &gid).await {
            if suggest_ch == msg.channel_id.get().to_string() {
                if !suggest_disabled_routed(&self.pool, &gid).await {
                    if msg.webhook_id.is_none() {
                        let _ = msg.delete(&_ctx.http).await;
                        if msg.content.split(' ').count() >= 5 {
                            let now = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_nanos() as u64)
                                .unwrap_or(1);
                            let code = crate::commands::suggestion::gen_suggest_code(now);
                            let lang_code =
                                crate::db::guild_lang(&self.pool, msg.guild_id.map(|g| g.get()))
                                    .await;
                            let text =
                                |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                            let author_name = text("event_suggestion_embed_author")
                                .replace("${message.author.username}", &msg.author.name);
                            let mut embed = serenity::CreateEmbed::default()
                                .colour(0x4000FF_u32)
                                .title(format!("#{code}"))
                                .author(
                                    serenity::CreateEmbedAuthor::new(author_name)
                                        .icon_url(msg.author.face()),
                                )
                                .description(format!("```{}```", msg.content))
                                .footer(serenity::CreateEmbedFooter::new(
                                    crate::commands::botcat::bot_footer_name(
                                        bot_name_routed(&self.pool, &gid).await.as_deref(),
                                    ),
                                ))
                                .timestamp(serenity::Timestamp::now());
                            if let Ok(guild) = guild_id.to_partial_guild(&_ctx.http).await {
                                if let Some(icon) = guild.icon_url() {
                                    embed = embed.thumbnail(icon);
                                }
                            }
                            let sent = msg
                                .channel_id
                                .send_message(
                                    &_ctx.http,
                                    serenity::CreateMessage::new()
                                        .content(format!("<@{}>", msg.author.id.get()))
                                        .embed(embed),
                                )
                                .await;
                            if let Ok(sent) = sent {
                                let builder = serenity::CreateThread::new(format!("#{code}"));
                                if let Ok(thread) = _ctx
                                    .http
                                    .create_thread_from_message(
                                        msg.channel_id,
                                        sent.id,
                                        &builder,
                                        None,
                                    )
                                    .await
                                {
                                    // Mirrors `x.edit({ invitable: true, locked: false,
                                    // archived: false })` after startThread in
                                    // Events/suggestion/onNewMessage.ts.
                                    let _ = _ctx
                                        .http
                                        .edit_thread(
                                            thread.id,
                                            &serenity::EditThread::new()
                                                .invitable(true)
                                                .locked(false)
                                                .archived(false),
                                            None,
                                        )
                                        .await;
                                    for vote in ["Yes", "No"] {
                                        let reaction = match crate::emojis::cached_emoji_entry(
                                            &_ctx.http, vote,
                                        )
                                        .await
                                        {
                                            Some((id, name, animated)) => {
                                                serenity::ReactionType::Custom {
                                                    animated,
                                                    id: serenity::EmojiId::new(id),
                                                    name: Some(name),
                                                }
                                            }
                                            None => {
                                                serenity::ReactionType::Unicode(if vote == "Yes" {
                                                    "✅".to_string()
                                                } else {
                                                    "❌".to_string()
                                                })
                                            }
                                        };
                                        let _ = sent.react(&_ctx.http, reaction).await;
                                    }
                                    let rec = crate::commands::suggestion::Suggestion {
                                        author: msg.author.id.get().to_string(),
                                        msg_id: sent.id.get().to_string(),
                                        thread_id: thread.id.get().to_string(),
                                        status: "open".to_string(),
                                        replied: false,
                                    };
                                    let _ = crate::db::tbl_set_json(
                                        &self.pool,
                                        &gid,
                                        &crate::commands::suggestion::suggestion_key(&code),
                                        &rec,
                                    )
                                    .await;
                                }
                            }
                        }
                    }
                }
            }
        }
        // Mirrors Events/utils/autoFeur.ts + antiExe.ts + custom reacts.
        {
            use crate::commands::legacy;
            let raw = autofeur_routed(&self.pool, &gid).await;
            if legacy::autofeur_on(raw.clone()) {
                let lang = crate::db::guild_lang(&self.pool, msg.guild_id.map(|g| g.get())).await;
                if lang == "fr-ME" {
                    if let Some(reply) = legacy::autofeur_match(&msg.content) {
                        let now = crate::commands::context::now_ms();
                        if legacy::autofeur_cooldown_ok(now, msg.author.id.get()) {
                            let mut text = reply.to_string();
                            // Promo suffix 1/8 when never configured.
                            if raw.is_none() && {
                                use rand::Rng;
                                rand::thread_rng().gen_range(0..8) == 0
                            } {
                                let prefix = crate::db::guild_prefix(
                                    &self.pool,
                                    msg.guild_id.map(|g| g.get()),
                                    ".",
                                )
                                .await;
                                let emoji =
                                    crate::emojis::app_emoji_markup(&_ctx.http, "VC_OpenChat")
                                        .await
                                        .unwrap_or_default();
                                text += &legacy::autofeur_promo(&emoji, &prefix);
                            }
                            let _ = msg.reply(&_ctx.http, text).await;
                        }
                    }
                } else if legacy::is_quoi_bait(&msg.content) {
                    let _ = msg.reply(&_ctx.http, "feur.").await;
                }
            }
            // antiExe (mirrors Events/utils/antiExe.ts): webhook, self
            // and Administrator/ModerateMembers bypass; bots and DMs
            // already return above. On a blocked attachment: 15-min
            // timeout when moderatable, best-effort delete, then a
            // warnMember `[Anti-Exe]` warn. No early return — like the
            // TS listener, processing falls through to reacts below.
            let raw = antiexe_routed(&self.pool, &gid).await;
            if crate::commands::legacy::flag_on(raw) {
                let staff = msg
                    .member
                    .as_ref()
                    .and_then(|m| m.permissions)
                    .map(|p| p.administrator() || p.moderate_members())
                    .unwrap_or(false);
                let bypassed = crate::commands::legacy::antiexe_bypassed(
                    msg.author.bot,
                    msg.webhook_id.is_some(),
                    false,
                    msg.author.id == _ctx.cache.current_user().id,
                    staff,
                );
                if !bypassed {
                    let names: Vec<String> =
                        msg.attachments.iter().map(|a| a.filename.clone()).collect();
                    if crate::commands::legacy::has_blocked_exe(&names) {
                        if let Ok(member) = guild_id.member(&_ctx.http, msg.author.id).await {
                            let mut member = member;
                            if let Ok(until) = serenity::Timestamp::from_unix_timestamp(
                                std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| d.as_secs() as i64)
                                    .unwrap_or(0)
                                    + crate::commands::legacy::ANTIEXE_TIMEOUT_SECS,
                            ) {
                                let _ = member
                                    .disable_communication_until_datetime(&_ctx.http, until)
                                    .await;
                            }
                        }
                        let _ = msg.delete(&_ctx.http).await;
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                        let bot_id = _ctx.cache.current_user().id;
                        let bot_name = _ctx.cache.current_user().name.clone();
                        let (bot_roles, guild_name, guild_roles) = _ctx
                            .cache
                            .guild(guild_id)
                            .map(|g| {
                                (
                                    g.members.get(&bot_id).map(|m| m.roles.clone()),
                                    g.name.clone(),
                                    g.roles
                                        .iter()
                                        .map(|(id, r)| (*id, (r.name.clone(), r.position)))
                                        .collect(),
                                )
                            })
                            .unwrap_or((None, "this server".to_string(), Default::default()));
                        // Copy the bot id out first: the CacheRef guard is
                        // !Send and must not live across the await below.
                        let bot_author_id = _ctx.cache.current_user().id.get();
                        crate::commands::moderation::warn_member_with_author(
                            &crate::commands::moderation::WarnContext {
                                http: &_ctx.http,
                                guild_name: Some(guild_name),
                                author_top_roles: bot_roles,
                                guild_roles: Some(guild_roles),
                                pool: &self.pool,
                                gid: &gid,
                                guild_id,
                                author_name: &bot_name,
                                target: &msg.author,
                                reason: "[Anti-Exe] sending binary file",
                                lang_code: &lang_code,
                            },
                            Some(bot_author_id),
                        )
                        .await;
                    }
                }
            }
            // Custom + greeting reacts (mirrors
            // guildconfig/reactToMessage.ts): literal `false` in
            // GUILD.GUILD_CONFIG.hey_reaction disables; otherwise a
            // case-insensitive trigger substring earns its emoji react
            // and a greeting first word earns a wave.
            let hey_off = guild_config_field_routed(&self.pool, &gid, "hey_reaction")
                .await
                .as_deref()
                == Some("false");
            if !hey_off {
                let lowered = msg.content.to_ascii_lowercase();
                let triggers: Vec<String> = react_msg_keys_routed(&self.pool, &gid).await;
                for key in triggers {
                    if let Some(trigger) = key.strip_prefix("GUILD.REACT_MSG.") {
                        if !trigger.is_empty() && lowered.contains(trigger) {
                            if let Some(emoji) =
                                react_msg_emoji_routed(&self.pool, &gid, &key).await
                            {
                                let _ = msg
                                    .react(
                                        &_ctx.http,
                                        crate::commands::legacy::parse_react_emoji(&emoji),
                                    )
                                    .await;
                            }
                            break;
                        }
                    }
                }
                if crate::commands::legacy::is_greeting_word(&msg.content) {
                    let _ = msg
                        .react(
                            &_ctx.http,
                            serenity::ReactionType::Unicode("👋".to_string()),
                        )
                        .await;
                }
            }
        }
        // Mirrors Events/github-lines/onNewMessage.ts: unfurl code
        // links (GitHub/GitLab/Gist) with spam/limit guards.
        if !msg.author.bot && msg.webhook_id.is_none() {
            let stored = git_lines_routed(&self.pool, &gid).await;
            if crate::commands::utils::github_lines_enabled(stored.as_deref()) {
                let targets = crate::commands::utils::extract_git_targets(&msg.content);
                if !targets.is_empty() {
                    let code =
                        crate::db::guild_lang(&self.pool, msg.guild_id.map(|g| g.get())).await;
                    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
                    let mut items = vec![];
                    for target in &targets {
                        if let Some(d) = crate::commands::utils::fetch_git_target(target).await {
                            items.push(d);
                        }
                    }
                    let total: usize = items.iter().map(|d| d.line_length).sum();
                    // Shared 5s auto-delete for the guard replies.
                    let auto_delete =
                        |sent: serenity::Message, http: std::sync::Arc<serenity::Http>| {
                            tokio::spawn(async move {
                                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                                let _ = http.delete_message(sent.channel_id, sent.id, None).await;
                            });
                        };
                    if total > 50 {
                        if let Ok(sent) = msg
                            .channel_id
                            .say(&_ctx.http, t("git_lines_avoiding_spam"))
                            .await
                        {
                            auto_delete(sent, _ctx.http.clone());
                        }
                    } else {
                        let joined = items
                            .iter()
                            .map(|d| crate::commands::utils::render_block(&d.display, &d.extension))
                            .collect::<Vec<_>>()
                            .join("\n");
                        if joined.is_empty() {
                            // No resolvable snippet: silent, like botMsg null.
                        } else if joined.len() >= 2000 {
                            if let Ok(sent) = msg
                                .channel_id
                                .say(&_ctx.http, t("git_lines_avoiding_limit"))
                                .await
                            {
                                auto_delete(sent, _ctx.http.clone());
                            }
                        } else {
                            let mut out = joined;
                            // Promo upsell on first sight (key absent, 1/8).
                            if stored.is_none() && rand::random::<u8>().is_multiple_of(8) {
                                let promo = t("git_lines_borred_warning");
                                if let Some(chat) =
                                    crate::emojis::app_emoji_markup(&_ctx.http, "VC_OpenChat").await
                                {
                                    out.push_str(
                                        &promo.replace(
                                            "${client.iHorizon_Emojis.VC_OpenChat}",
                                            &chat,
                                        ),
                                    );
                                }
                            }
                            if let Ok(sent) = msg.channel_id.say(&_ctx.http, out).await {
                                // Suppress the source message embeds (mirrors
                                // handleMessage's `botMsg && msg.deletable`
                                // suppressEmbeds leg, 100ms delay).
                                // Best-effort: ignored without Manage
                                // Messages, like the TS catch.
                                let suppress_http = _ctx.http.clone();
                                let suppress_channel = msg.channel_id;
                                let suppress_id = msg.id;
                                tokio::spawn(async move {
                                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                                    let _ = suppress_channel
                                        .edit_message(
                                            &suppress_http,
                                            suppress_id,
                                            serenity::EditMessage::new().suppress_embeds(true),
                                        )
                                        .await;
                                });
                                // Author-only trash delete (15s, like the TS
                                // reaction collector); spawned so the event
                                // handler never blocks.
                                let http = _ctx.http.clone();
                                let shard = _ctx.shard.clone();
                                let author = msg.author.id;
                                tokio::spawn(async move {
                                    let trash = serenity::ReactionType::Unicode("🗑️".to_string());
                                    let _ = sent.react(&http, trash.clone()).await;
                                    let collected =
                                        serenity::collector::ReactionCollector::new(&shard)
                                            .channel_id(sent.channel_id)
                                            .message_id(sent.id)
                                            .author_id(author)
                                            .timeout(std::time::Duration::from_secs(15))
                                            .next()
                                            .await;
                                    match collected {
                                        Some(r) if r.emoji == trash => {
                                            let _ = http
                                                .delete_message(sent.channel_id, sent.id, None)
                                                .await;
                                        }
                                        _ => {
                                            let _ = http
                                                .delete_reaction_me(
                                                    sent.channel_id,
                                                    sent.id,
                                                    &trash,
                                                )
                                                .await;
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
        self.check_punishpub(&_ctx, &gid, &msg).await;
        // Honeypot trap trigger (debounced two-pass pipeline).
        // Mirrors honeypotManager scheduleHoneypotTrigger plus the
        // enabled/channel early return in Events/honeypot/honeypot.ts
        // (audit P8): nothing spawns while disabled or on channel
        // mismatch — the in-pipeline re-check stays as the second gate
        // for config changes during the debounce delay.
        if crate::commands::honeypot::main::trap_spawn_allowed(
            &self.pool,
            &gid,
            msg.channel_id.get(),
        )
        .await
        {
            crate::commands::honeypot::main::schedule_trap(&_ctx, &self.pool, &msg);
        }
    }

    async fn message_delete(
        &self,
        ctx: serenity::Context,
        channel_id: serenity::ChannelId,
        deleted_message_id: serenity::MessageId,
        guild_id: Option<serenity::GuildId>,
    ) {
        // Mirrors Events/utils/snipeModule.ts: snapshot the deleted
        // message from cache (the bot's own messages and empty
        // contents are skipped, links masked via maskLink).
        if let Some(gid) = guild_id {
            let gid = gid.get().to_string();
            // Full content from the message cache (mirrors snipeModule.ts).
            // Owned snapshot first: the cache guard is not Send and
            // must drop before any await.
            let bot_id = ctx.cache.current_user().id.get();
            let snap: Option<(String, String)> = ctx
                .cache
                .message(channel_id, deleted_message_id)
                .filter(|cached| cached.author.id.get() != bot_id && !cached.content.is_empty())
                .map(|cached| {
                    (
                        serde_json::json!({
                            "author": cached.author.tag(),
                            "content": cached.content.clone(),
                        })
                        .to_string(),
                        ts_snipe_json(
                            &cached.content,
                            &cached.author.name,
                            cached.author.id.get(),
                            &cached.author.avatar_url().unwrap_or_default(),
                            cached.timestamp.unix_timestamp() * 1000,
                        ),
                    )
                });
            if let Some((legacy, ts_snap)) = snap {
                // DUAL-WRITE VERDICT: TS snipeModule.ts sets the SAME
                // GUILD.SNIPE.<channel> key twice back-to-back with the
                // identical payload (a redundant double-set, not two
                // shapes). One write carries the full TS shape; the
                // second write keeps the legacy SNIPE.<channel> row as
                // fallback for old readers. No behavior is lost by
                // collapsing the duplicate.
                let _ = save_snipe_routed(
                    &self.pool,
                    &gid,
                    &format!("GUILD.SNIPE.{}", channel_id.get()),
                    &ts_snap,
                )
                .await;
                let _ = save_snipe_routed(
                    &self.pool,
                    &gid,
                    &format!("SNIPE.{}", channel_id.get()),
                    &legacy,
                )
                .await;
            }
            let _ = save_snipe_routed(
                &self.pool,
                &gid,
                "SNIPE.last_deleted_id",
                &deleted_message_id.get().to_string(),
            )
            .await;
            // Drop any ticket-panel marker bound to the deleted message
            // (mirrors deleteTicketPanelOnMessageDelete.ts).
            let _ = crate::db::tbl_del(
                &self.pool,
                &gid,
                &format!("GUILD.TICKET.{}", deleted_message_id.get()),
            )
            .await;
            // Rich delete log (mirrors logs/messageDeleteLogs.ts):
            // #010101 embed with author + content from the message
            // cache, attachments re-uploaded; silent on cache miss.
            // The bot's own messages are skipped, like TS.
            // Owned snapshot first: the cache guard is not Send and
            // must drop before any await.
            let snap: Option<(u64, String, String, String, Vec<(String, String, String)>)> = ctx
                .cache
                .message(channel_id, deleted_message_id)
                .map(|cached| {
                    (
                        cached.author.id.get(),
                        cached.author.name.clone(),
                        cached.author.avatar_url().unwrap_or_default(),
                        cached.content.clone(),
                        cached
                            .attachments
                            .iter()
                            .take(5)
                            .map(|a| {
                                (
                                    a.url.clone(),
                                    a.filename.clone(),
                                    a.content_type.clone().unwrap_or_default(),
                                )
                            })
                            .collect(),
                    )
                });
            if let Some((author_id, author_name, avatar, content, attachments)) = snap {
                if author_id != ctx.cache.current_user().id.get() {
                    let logs_ch: Option<u64> =
                        crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                            &self.pool, &gid, "message",
                        )
                        .await
                        .and_then(|s| s.parse().ok());
                    if let Some(logs_ch) = logs_ch {
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(gid.parse().unwrap_or(0))).await;
                        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                        let desc = text("event_srvLogs_messageDelete_description")
                            .replace("${message.channel.id}", &channel_id.get().to_string())
                            .replace("${message.content}", &format!(" {content}"));
                        let mut embed = serenity::CreateEmbed::default()
                            .colour(0x010101_u32)
                            .author(serenity::CreateEmbedAuthor::new(author_name).icon_url(avatar))
                            .description(desc)
                            .timestamp(serenity::Timestamp::now());
                        let mut files = vec![];
                        if attachments.len() == 1 && attachments[0].2.starts_with("image/") {
                            if let Some(bytes) =
                                crate::commands::botcat::download_bytes(&attachments[0].0).await
                            {
                                files.push(serenity::CreateAttachment::bytes(
                                    bytes,
                                    "sniped-image-by-ihorizon.png",
                                ));
                                embed = embed.image("attachment://sniped-image-by-ihorizon.png");
                            }
                        } else {
                            for (url, filename, _) in &attachments {
                                if let Some(bytes) =
                                    crate::commands::botcat::download_bytes(url).await
                                {
                                    files.push(serenity::CreateAttachment::bytes(
                                        bytes,
                                        filename.clone(),
                                    ));
                                }
                            }
                        }
                        let _ = serenity::ChannelId::new(logs_ch)
                            .send_message(
                                &ctx.http,
                                serenity::CreateMessage::new().embed(embed).files(files),
                            )
                            .await;
                    }
                }
            }
            // Cache miss: TS messageDeleteLogs.ts reads the message
            // from cache and stays silent without it — no fallback.
        }
    }

    async fn message_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::Message>,
        new: Option<serenity::Message>,
        _event: serenity::MessageUpdateEvent,
    ) {
        // Rich edit log (mirrors logs/messageUpdateLogs.ts): #010101
        // embed with author, jump link, Before/After fields (or the
        // ```diff block past 160 chars). Bots and empty contents
        // are skipped, like TS.
        if let (Some(old), Some(new)) = (old, new) {
            if new.author.bot || old.content.is_empty() || new.content.is_empty() {
                return;
            }
            if old.content == new.content {
                return;
            }
            let Some(gid) = new.guild_id else {
                return;
            };
            let gid = gid.get().to_string();
            let logs_ch: Option<u64> =
                crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                    &self.pool, &gid, "message",
                )
                .await
                .and_then(|s| s.parse().ok());
            let Some(logs_ch) = logs_ch else {
                return;
            };
            let lang_code = crate::db::guild_lang(&self.pool, new.guild_id.map(|g| g.get())).await;
            let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
            let jump = format!(
                "(https://discord.com/channels/{}/{}/{})",
                gid,
                new.channel_id.get(),
                new.id.get()
            );
            let desc = text("event_srvLogs_messageUpdate_description")
                .replace("${oldMessage.channelId}", &new.channel_id.get().to_string())
                .replace("(xxx)", &jump);
            let avatar = new.author.avatar_url().unwrap_or_default();
            let mut embed = serenity::CreateEmbed::default()
                .colour(0x010101_u32)
                .author(serenity::CreateEmbedAuthor::new(new.author.name.clone()).icon_url(avatar))
                .description(desc)
                .timestamp(serenity::Timestamp::now());
            // TS `.length` counts UTF-16 code units, not bytes: `.len()`
            // would flip to the diff block too early on multibyte text.
            if old.content.encode_utf16().count() > 160 || new.content.encode_utf16().count() > 160
            {
                embed = embed.field(
                    text("var_message"),
                    crate::events::message_diff(&old.content, &new.content),
                    false,
                );
            } else {
                embed = embed
                    .field(
                        text("event_srvLogs_messageUpdate_footer_1"),
                        old.content.clone(),
                        false,
                    )
                    .field(
                        text("event_srvLogs_messageUpdate_footer_2"),
                        new.content.clone(),
                        false,
                    );
            }
            let _ = serenity::ChannelId::new(logs_ch)
                .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                .await;
        }
    }

    async fn voice_state_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::VoiceState>,
        new: serenity::VoiceState,
    ) {
        let Some(guild_id) = new.guild_id else {
            return;
        };
        let gid = guild_id.get().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        // Serving-shard messenger mirror for the H247 watchdog (this
        // arm runs on the guild's shard).
        crate::commands::h247::session::note_messenger(guild_id.get(), ctx.shard.clone()).await;
        // Lavalink voice handshake, state half (mirrors the raw.ts
        // voice-packet forward): our own VoiceStateUpdate carries the
        // Discord session id. Noted always; pushed to the node only
        // while joined (channel None = leaving, nothing to forward).
        if new.user_id == ctx.cache.current_user().id {
            // Live voice mirror for the H247 watchdog (the
            // `guild.members.me?.voice` equivalent): noted on every
            // own voice update, handshake-independent.
            crate::commands::h247::session::note_live_voice(
                guild_id.get(),
                new.channel_id.map(|c| c.get()),
            )
            .await;
            let m = crate::lavalink::manager();
            let combined = m
                .note_voice_state(
                    guild_id.get(),
                    new.channel_id.map(|c| c.get()),
                    new.session_id.clone(),
                )
                .await;
            if new.channel_id.is_some() {
                if let Some(voice) = combined {
                    let _ = m.push_voice_state(guild_id.get(), voice).await;
                }
            } else if crate::lavalink::LavalinkManager::should_destroy_on_disconnect(None) {
                // onDisconnect.destroyPlayer leg (playerManager.ts:65):
                // the bot left every channel — drop the guild player
                // state + REST-destroy the node player + LastFM
                // queue-end, then clear the voice status.
                if let Some(target) = m.on_voice_disconnect(guild_id.get()).await {
                    if let Some(vc) = target.voice_channel {
                        crate::lavalink::LavalinkManager::clear_voice_status(&ctx.http, vc).await;
                    }
                }
            }
        }
        // H247 24/7 rejoin guard (mirrors Events/h247/voiceState.ts +
        // handleH247VoiceStateChange -> ensureH247VoicePresence): only
        // the bot's own channel change can break the presence. The
        // voluntary /h247 leave deletes GUILD.H247 first, so this
        // resolves to a no-op then. Rejoin goes out as a gateway OP4
        // voice-state update (send_voice_state), like sendH247VoiceStateUpdate.
        // Rejoin cooldown (mirrors h247EventRejoinCooldowns): a burst
        // of gateway updates cannot loop the rejoin. Stamps only when
        // the presence actually broke (short-circuit order matters).
        let h247_broken = crate::commands::h247::grant::h247_voice_broken(
            new.user_id == ctx.cache.current_user().id,
            old.as_ref().and_then(|o| o.channel_id).map(|c| c.get()),
            new.channel_id.map(|c| c.get()),
        );
        let h247_due = !h247_broken
            || crate::commands::h247::session::event_rejoin_due(guild_id.get(), now).await;
        if h247_broken && h247_due {
            if let Some(raw) = h247_routed(&self.pool, &gid).await {
                let target = crate::commands::h247::grant::h247_rejoin_target(
                    crate::commands::h247::grant::parse_h247(&raw).as_ref(),
                    new.channel_id.map(|c| c.get()),
                );
                if let Some(ch) = target {
                    // Channel + permission gate (mirrors
                    // fetchH247VoiceChannel + the Connect/Speak
                    // permissionsIn check in joinH247VoiceChannel): the
                    // parked channel must still exist as a voice channel
                    // and still grant the bot both. Unresolvable cache
                    // state skips the rejoin like the TS `!me` /
                    // fetch-catch legs (the 60s watchdog covers it over
                    // HTTP). The cache guard is not Send and drops
                    // before the OP4 send.
                    let bot_id = ctx.cache.current_user().id;
                    let may_join = ctx
                        .cache
                        .guild(guild_id)
                        .and_then(|g| {
                            let channel = g.channels.get(&serenity::ChannelId::new(ch))?;
                            if !crate::commands::h247::join::h247_joinable_channel(&channel.kind) {
                                return None;
                            }
                            let me = g.members.get(&bot_id)?.clone();
                            Some(crate::commands::h247::join::h247_bot_may_join(
                                g.user_permissions_in(channel, &me),
                            ))
                        })
                        .unwrap_or(false);
                    if may_join {
                        crate::lavalink::LavalinkManager::send_voice_state(
                            &ctx.shard,
                            guild_id.get(),
                            Some(ch),
                        );
                        tracing::info!("h247 rejoin {} -> {}", gid, ch);
                    }
                }
            }
        }
        // Rich voice log (mirrors logs/voiceLogs.ts).
        self.voice_state_log(&ctx, &gid, old.as_ref(), &new).await;
        // Session tracking (mirrors stats/onVoiceUpdate.ts + economy coins).
        match (old.as_ref().and_then(|o| o.channel_id), new.channel_id) {
            (old_ch, Some(new_ch)) if old_ch != Some(new_ch) => {
                // Boost from shop roles (mirrors getMemberBoost in
                // processSessionEnd, also applied on move).
                let roles: Vec<u64> = guild_id
                    .member(&ctx.http, new.user_id)
                    .await
                    .map(|m| m.roles.iter().map(|r| r.get()).collect())
                    .unwrap_or_default();
                let shop_raw = buyable_roles_routed(&self.pool, &gid).await;
                let boost =
                    crate::commands::economy::main::member_boost_f64(&shop_raw, &roles).max(1.0);
                crate::events::voice_switch(
                    &self.pool,
                    &gid,
                    new.user_id.get(),
                    new_ch.get(),
                    now,
                    boost,
                    true,
                )
                .await;
                // Leash follow (mirrors Events/utils/leashModule.ts): the
                // single UTILS.LEASH array holds {dom, sub (CSV), timestamp}
                // pairings with a 30-minute life. Expired rows are pruned,
                // then both move directions apply: dom moved -> subs follow
                // the dom's new channel; sub moved -> the sub is pulled back
                // to the dom's channel.
                if let Some(raw) = leash_routed(&self.pool, &gid).await {
                    let entries: Vec<LeashEntry> = serde_json::from_str(&raw).unwrap_or_default();
                    let valid: Vec<LeashEntry> = entries
                        .iter()
                        .filter(|e| leash_valid(e.timestamp, now))
                        .cloned()
                        .collect();
                    if valid.len() != entries.len() {
                        let _ = crate::db::tbl_set(
                            &self.pool,
                            &gid,
                            "UTILS.LEASH",
                            &serde_json::to_string(&valid).unwrap_or_default(),
                        )
                        .await;
                    }
                    let changing = new.user_id.get().to_string();
                    let dom_channels: std::collections::HashMap<String, serenity::ChannelId> = ctx
                        .cache
                        .guild(guild_id)
                        .map(|g| {
                            g.voice_states
                                .iter()
                                .filter_map(|(uid, vs)| {
                                    vs.channel_id.map(|c| (uid.get().to_string(), c))
                                })
                                .collect()
                        })
                        .unwrap_or_default();
                    for pairing in valid.iter().filter(|e| leash_entry_matches(e, &changing)) {
                        let subs = leash_sub_ids(&pairing.sub);
                        let Some(dom_ch) = dom_channels.get(&pairing.dom).copied() else {
                            continue;
                        };
                        if leash_is_dom(pairing, &changing) {
                            // Dom moved: drag every sub that is not already
                            // in the dom's new channel.
                            for sub in &subs {
                                if dom_channels.get(sub).copied() == Some(dom_ch) {
                                    continue;
                                }
                                if let Ok(uid) = sub.parse::<u64>() {
                                    let _ = guild_id
                                        .move_member(&ctx.http, serenity::UserId::new(uid), dom_ch)
                                        .await;
                                }
                            }
                        } else if dom_channels.get(&changing).copied() != Some(dom_ch) {
                            // Sub moved away: pull it back to the dom.
                            let _ = guild_id.move_member(&ctx.http, new.user_id, dom_ch).await;
                        }
                    }
                }
                // Lobby spawn (mirrors voicedashboard/voiceState.ts).
                if let Some(lobby) = voice_lobby_routed(&self.pool, &gid).await {
                    if lobby == new_ch.get().to_string() {
                        let own_key =
                            crate::events::temp_voice_key(guild_id.get(), new.user_id.get());
                        // Owned-channel redirect (voiceState.ts:131-136): the
                        // joiner already owns a live temp channel → move them
                        // back into it and stop. A stale row (gone /
                        // non-voice channel) is dropped like the TS
                        // `channelDb && !ownedChannel` cleanup.
                        if let Some(own_raw) = crate::db::tbl_get(&self.pool, &gid, &own_key).await
                        {
                            let stale = match own_raw.trim().parse::<u64>() {
                                Ok(own_num) if own_num != 0 => {
                                    let own_ch = serenity::ChannelId::new(own_num);
                                    if crate::commands::voicedashboard::main::fetch_voice_channel(
                                        &ctx.http, own_ch,
                                    )
                                    .await
                                    .is_some()
                                    {
                                        let _ = guild_id
                                            .move_member(&ctx.http, new.user_id, own_ch)
                                            .await;
                                        return;
                                    }
                                    true
                                }
                                _ => true,
                            };
                            if stale {
                                let _ = crate::db::tbl_del(&self.pool, &gid, &own_key).await;
                            }
                        }
                        // Pending-creation lock (mirrors
                        // pendingCustomVoiceCreations): Discord may emit
                        // several updates for one hub join while creation is
                        // still async; without it two concurrent creations
                        // orphan each other's channel.
                        let creation_key = temp_creation_key(&gid, &new.user_id.get().to_string());
                        {
                            let mut pending = self.temp_pending.lock().await;
                            if !restore_slot_claim(&mut pending, &creation_key) {
                                return;
                            }
                        }
                        // Display name (mirrors `displayName || nickname`).
                        let raw_display = new
                            .member
                            .as_ref()
                            .map(|m| m.display_name().to_string())
                            .unwrap_or_else(|| "voice".to_string());
                        // Default title from the lang template (`{nickname}`
                        // slot, full masked display name like TS
                        // `maskLink(username)` — no truncation), with links
                        // masked like TS maskLink.
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                        let masked = crate::funcs::mask_link(&raw_display);
                        let title =
                            match crate::lang::get(&lang_code, "temporary_voice_channel_name")
                                .as_deref()
                            {
                                Some(t) => t.replace("{nickname}", &masked),
                                None => crate::events::temp_channel_name(&masked),
                            };
                        // The lobby channel must still exist (mirrors `&&
                        // result_channel`); temp channels spawn under its
                        // parent (mirrors `parent: result_channel?.parentId`).
                        let lobby_num: u64 = match lobby.parse() {
                            Ok(n) => n,
                            Err(_) => {
                                let mut pending = self.temp_pending.lock().await;
                                restore_slot_release(&mut pending, &creation_key);
                                return;
                            }
                        };
                        let lobby_parent = match ctx
                            .http
                            .get_channel(serenity::ChannelId::new(lobby_num))
                            .await
                            .ok()
                        {
                            Some(serenity::Channel::Guild(g)) => g.parent_id,
                            _ => {
                                let mut pending = self.temp_pending.lock().await;
                                restore_slot_release(&mut pending, &creation_key);
                                return;
                            }
                        };
                        // Category override + its overwrites to copy (mirrors
                        // PotentialCategory / `permissionOverwrites:` from the
                        // category channel).
                        let category_num: Option<u64> =
                            leaf_routed(&self.pool, &gid, "VOICE_INTERFACE.voice_channel_category")
                                .await
                                .and_then(|s| s.trim().parse().ok());
                        let cat_overwrites: Vec<serenity::PermissionOverwrite> = match category_num
                        {
                            Some(cat) => ctx
                                .http
                                .get_channel(serenity::ChannelId::new(cat))
                                .await
                                .ok()
                                .and_then(|c| match c {
                                    serenity::Channel::Guild(g) => Some(g.permission_overwrites),
                                    _ => None,
                                })
                                .unwrap_or_default(),
                            None => Vec::new(),
                        };
                        let mut builder =
                            serenity::CreateChannel::new(title).kind(serenity::ChannelType::Voice);
                        if let Some(p) = lobby_parent {
                            builder = builder.category(p);
                        }
                        // Category overwrites go out AT create (mirrors
                        // `permissionOverwrites:` in the TS create call):
                        // a post-create copy would leave a window where
                        // the channel carries no overwrites.
                        if !cat_overwrites.is_empty() {
                            builder = builder.permissions(cat_overwrites);
                        }
                        let Ok(ch) = guild_id.create_channel(&ctx.http, builder).await else {
                            let mut pending = self.temp_pending.lock().await;
                            restore_slot_release(&mut pending, &creation_key);
                            return;
                        };
                        // Track the row before any follow-up edit (mirrors
                        // tempTable.set right after create): a failed move
                        // below rolls back exactly this row.
                        let _ = crate::db::tbl_set(
                            &self.pool,
                            &gid,
                            &own_key,
                            &ch.id.get().to_string(),
                        )
                        .await;
                        // Category move (mirrors setParent(PotentialCategory)).
                        if let Some(cat) = category_num {
                            let _ = ch
                                .id
                                .edit(
                                    &ctx.http,
                                    serenity::EditChannel::new()
                                        .category(serenity::ChannelId::new(cat)),
                                )
                                .await;
                        }
                        // Position top (mirrors setPosition(0, relative)).
                        if leaf_routed(&self.pool, &gid, "VOICE_INTERFACE.voice_channel_position")
                            .await
                            .as_deref()
                            == Some("top")
                        {
                            let _ = ch
                                .id
                                .edit(&ctx.http, serenity::EditChannel::new().position(0))
                                .await;
                        }
                        // Name template (`{Username}` slot or append
                        // fallback, raw display name like TS).
                        if let Some(tpl) = voice_name_tpl_routed(&self.pool, &gid).await {
                            let renamed = crate::commands::voicedashboard::main::render_temp_name(
                                &tpl,
                                &raw_display,
                            );
                            let _ = ch
                                .id
                                .edit(&ctx.http, serenity::EditChannel::new().name(renamed))
                                .await;
                        }
                        // Move with rollback (mirrors the setChannel
                        // then/catch): on failure the channel is deleted
                        // and the tracked row dropped while it points at it.
                        if guild_id
                            .move_member(&ctx.http, new.user_id, ch.id)
                            .await
                            .is_err()
                        {
                            let _ = ch.id.delete(&ctx.http).await;
                            if let Some(cur) = crate::db::tbl_get(&self.pool, &gid, &own_key).await
                            {
                                if cur.trim() == ch.id.get().to_string() {
                                    let _ = crate::db::tbl_del(&self.pool, &gid, &own_key).await;
                                }
                            }
                            {
                                let mut pending = self.temp_pending.lock().await;
                                restore_slot_release(&mut pending, &creation_key);
                            }
                            return;
                        }
                        // Post-move verify (mirrors the fetch({force: true})
                        // then-leg after setChannel): the create only
                        // sticks when the member actually landed in the
                        // new channel. The REST member fetch refreshes
                        // the cache (no voice state on the wire, so the
                        // channel itself is read back from cache right
                        // after); a fetch failure or a channel mismatch
                        // deletes the channel and drops the tracked row
                        // while it points at it.
                        let moved_ok = match guild_id.member(&ctx.http, new.user_id).await {
                            Err(_) => false,
                            Ok(_) => {
                                let landed = ctx
                                    .cache
                                    .guild(guild_id)
                                    .and_then(|g| g.voice_states.get(&new.user_id).cloned())
                                    .and_then(|v| v.channel_id)
                                    .map(|c| c.get());
                                crate::voice::temp_move_verified(landed, ch.id.get())
                            }
                        };
                        if !moved_ok {
                            let _ = ch.id.delete(&ctx.http).await;
                            if let Some(cur) = crate::db::tbl_get(&self.pool, &gid, &own_key).await
                            {
                                if cur.trim() == ch.id.get().to_string() {
                                    let _ = crate::db::tbl_del(&self.pool, &gid, &own_key).await;
                                }
                            }
                            {
                                let mut pending = self.temp_pending.lock().await;
                                restore_slot_release(&mut pending, &creation_key);
                            }
                            return;
                        }
                        // Owner full allow set (mirrors the propriétaire
                        // edit after the move).
                        let _ = ch
                            .id
                            .create_permission(
                                &ctx.http,
                                serenity::PermissionOverwrite {
                                    allow: crate::commands::voicedashboard::main::owner_voice_allow(
                                    ),
                                    deny: serenity::Permissions::empty(),
                                    kind: serenity::PermissionOverwriteType::Member(new.user_id),
                                },
                            )
                            .await;
                        // Staff overwrites (mirrors voiceState.ts:273):
                        // VOICE_INTERFACE.staff_role is one role id
                        // (legacy string) or a JSON array; every listed
                        // role gets join + moderate rights, like TS.
                        // Roles missing from the guild cache are skipped
                        // (mirrors the roles.cache.get guard).
                        if let Some(staff_raw) =
                            leaf_routed(&self.pool, &gid, "VOICE_INTERFACE.staff_role").await
                        {
                            let staff = crate::commands::voicedashboard::main::parse_staff_roles(
                                Some(&staff_raw),
                            );
                            // Resolve ids up front: the cache guard is
                            // not Send and must not be held across awaits.
                            let staff_ids: Vec<u64> = {
                                let cached = ctx.cache.guild(guild_id);
                                staff
                                    .iter()
                                    .filter_map(|r| r.parse::<u64>().ok())
                                    .filter(|rid| {
                                        cached.as_ref().is_none_or(|g| {
                                            g.roles.contains_key(&serenity::RoleId::new(*rid))
                                        })
                                    })
                                    .collect()
                            };
                            for role_id in staff_ids {
                                let _ = ch
                                    .id
                                    .create_permission(
                                        &ctx.http,
                                        serenity::PermissionOverwrite {
                                            allow: staff_voice_allow(),
                                            deny: serenity::Permissions::empty(),
                                            kind: serenity::PermissionOverwriteType::Role(
                                                serenity::RoleId::new(role_id),
                                            ),
                                        },
                                    )
                                    .await;
                            }
                        }
                        // No spawn message: TS voiceState.ts sends nothing
                        // into the new channel (the dashboard panel is the
                        // only UI).
                        // Release the creation lock (mirrors the finally
                        // delete in voiceState.ts).
                        {
                            let mut pending = self.temp_pending.lock().await;
                            restore_slot_release(&mut pending, &creation_key);
                        }
                        return;
                    }
                }
            }
            (Some(_), None) => {
                // Member gate (mirrors `newState.member` in processSessionEnd):
                // a user who left the guild earns nothing. Roles prefer the
                // event member, falling back to a fetch.
                let (roles, present) = match new.member.as_ref() {
                    Some(m) => (m.roles.iter().map(|r| r.get()).collect(), true),
                    None => match guild_id.member(&ctx.http, new.user_id).await {
                        Ok(m) => (m.roles.iter().map(|r| r.get()).collect(), true),
                        Err(_) => (vec![], false),
                    },
                };
                let shop_raw = buyable_roles_routed(&self.pool, &gid).await;
                let boost =
                    crate::commands::economy::main::member_boost_f64(&shop_raw, &roles).max(1.0);
                crate::events::voice_leave(
                    &self.pool,
                    &gid,
                    new.user_id.get(),
                    now,
                    boost,
                    present,
                )
                .await;
            }
            _ => {}
        }
        // Voice talk auto-mute (mirrors the UTILS.VOICE_TALK leg of
        // voiceTalkFreeze.ts): leaving the talk channel while
        // server-muted unmutes; joining it server-mutes. Bots,
        // Administrators and ManageChannels members bypass both.
        if let Some(raw) = voice_talk_routed(&self.pool, &gid).await {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let Some(talk_ch) = v
                    .get("channelId")
                    .and_then(|c| c.as_str())
                    .map(str::to_string)
                {
                    let old_ch = old
                        .as_ref()
                        .and_then(|o| o.channel_id)
                        .map(|c| c.get().to_string());
                    let new_ch = new.channel_id.map(|c| c.get().to_string());
                    // Leave cleanup (runs even when leaving to nowhere).
                    if old_ch.as_deref() == Some(&talk_ch) && new_ch.as_deref() != Some(&talk_ch) {
                        let was_muted = old.as_ref().map(|o| o.mute).unwrap_or(false);
                        if was_muted {
                            if let Ok(mut member) = guild_id.member(&ctx.http, new.user_id).await {
                                if !member.user.bot {
                                    let _ = member
                                        .edit(
                                            &ctx.http,
                                            serenity::EditMember::new()
                                                .mute(false)
                                                .audit_log_reason("talk leave cleanup"),
                                        )
                                        .await;
                                }
                            }
                        }
                    }
                    // Join auto-mute.
                    if new_ch.as_deref() == Some(&talk_ch) && old_ch.as_deref() != Some(&talk_ch) {
                        let member_opt = match new.member.clone() {
                            Some(m) => Some(m),
                            None => guild_id.member(&ctx.http, new.user_id).await.ok(),
                        };
                        if let Some(member) = member_opt {
                            let (admin, manage) = ctx
                                .cache
                                .guild(guild_id)
                                .map(|gd| {
                                    let p = gd.member_permissions(&member);
                                    (p.administrator(), p.manage_channels())
                                })
                                .unwrap_or((false, false));
                            if !voice_talk_bypass(member.user.bot, admin, manage) && !new.mute {
                                let mut member = member;
                                let _ = member
                                    .edit(
                                        &ctx.http,
                                        serenity::EditMember::new()
                                            .mute(true)
                                            .audit_log_reason("talk join auto mute"),
                                    )
                                    .await;
                            }
                        }
                    }
                }
            }
        }
        // LastFM tracked-channel member attach/detach (mirrors
        // lavalink-client/lastFMScrobbler.ts -> handleVoiceStateUpdate ->
        // lastFMScrobblerManager.handleVoiceStateUpdate): the move is
        // classified against the player voice channel via
        // lastfm_tracked_change. Per-listener session-key I/O (decrypted
        // `<uid>.lastfm` profile rows, signed now-playing/scrobble POSTs
        // plus per-listener thresholds) stays with the live scrobbler
        // caller behind rows and secrets this handler cannot reach, so
        // the resolution itself — attach / detach / no-op — runs here
        // on every voice move instead of staying deferred.
        {
            let member = new
                .member
                .clone()
                .or_else(|| old.as_ref().and_then(|o| o.member.clone()));
            if let Some(member) = member {
                if !member.user.bot {
                    if let Some(tracked) = crate::lavalink::manager()
                        .snapshot(guild_id.get())
                        .await
                        .and_then(|s| s.voice_channel)
                    {
                        let old_ch = old.as_ref().and_then(|o| o.channel_id).map(|c| c.get());
                        let new_ch = new.channel_id.map(|c| c.get());
                        match lastfm_tracked_change(old_ch, new_ch, tracked) {
                            Some(true) => tracing::debug!(
                                "lastfm attach: user {} joined tracked channel {} in guild {}",
                                member.user.id.get(),
                                tracked,
                                gid
                            ),
                            Some(false) => tracing::debug!(
                                "lastfm detach: user {} left tracked channel {} in guild {}",
                                member.user.id.get(),
                                tracked,
                                gid
                            ),
                            None => {}
                        }
                    }
                }
            }
        }
        // Voice freeze enforcement (mirrors the UTILS.VOICE_FREEZE leg
        // of voiceTalkFreeze.ts).
        if let Some(raw) = voice_freeze_routed(&self.pool, &gid).await {
            // Array shape: frozen member list from !freeze (mute leg,
            // unchanged).
            if new.channel_id.is_some() {
                let frozen_member = serde_json::from_str::<Vec<String>>(&raw)
                    .map(|list| list.contains(&new.user_id.get().to_string()))
                    .unwrap_or(false);
                if frozen_member {
                    if let Ok(mut member) = guild_id.member(&ctx.http, new.user_id).await {
                        let _ = member
                            .edit(&ctx.http, serenity::EditMember::new().mute(true))
                            .await;
                    }
                }
            }
            // Object shape: channel-bound freeze with allowedUsers
            // (mirrors !wlvc.ts). Enforcement is disconnect + 5s
            // timeout (mirrors `setChannel(null)` + `timeout(5000)`),
            // never a mute. A missing/non-voice channel or an emptied
            // channel drops the stale key.
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let Some(freeze_ch) = v
                    .get("channelId")
                    .and_then(|c| c.as_str())
                    .map(str::to_string)
                {
                    let freeze_id = freeze_ch.parse::<u64>().unwrap_or(0);
                    let occupants = match serenity::ChannelId::new(freeze_id)
                        .to_channel(&ctx.http)
                        .await
                    {
                        Ok(serenity::Channel::Guild(g))
                            if g.kind == serenity::ChannelType::Voice =>
                        {
                            ctx.cache
                                .guild(guild_id)
                                .map(|gd| {
                                    gd.voice_states
                                        .values()
                                        .filter(|vs| {
                                            vs.channel_id
                                                == Some(serenity::ChannelId::new(freeze_id))
                                        })
                                        .count()
                                })
                                .unwrap_or(usize::MAX)
                        }
                        _ => usize::MAX - 1,
                    };
                    if occupants == 0 || occupants == usize::MAX - 1 {
                        let _ = crate::db::tbl_del(&self.pool, &gid, "UTILS.VOICE_FREEZE").await;
                    } else {
                        let old_ch = old
                            .as_ref()
                            .and_then(|o| o.channel_id)
                            .map(|c| c.get().to_string());
                        let new_ch = new.channel_id.map(|c| c.get().to_string());
                        if new_ch.as_deref() == Some(&freeze_ch)
                            && old_ch.as_deref() != Some(&freeze_ch)
                        {
                            let allowed: Vec<String> = v
                                .get("allowedUsers")
                                .and_then(|a| serde_json::from_value(a.clone()).ok())
                                .unwrap_or_default();
                            let member_opt = match new.member.clone() {
                                Some(m) => Some(m),
                                None => guild_id.member(&ctx.http, new.user_id).await.ok(),
                            };
                            if let Some(member) = member_opt {
                                let (admin, manage) = ctx
                                    .cache
                                    .guild(guild_id)
                                    .map(|gd| {
                                        let p = gd.member_permissions(&member);
                                        (p.administrator(), p.manage_channels())
                                    })
                                    .unwrap_or((false, false));
                                if !voice_talk_bypass(member.user.bot, admin, manage)
                                    && !allowed.contains(&new.user_id.get().to_string())
                                {
                                    let _ =
                                        guild_id.disconnect_member(&ctx.http, new.user_id).await;
                                    if let Ok(mut member) =
                                        guild_id.member(&ctx.http, new.user_id).await
                                    {
                                        let until = std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .map(|d| d.as_secs() as i64)
                                            .unwrap_or(0)
                                            + 5;
                                        if let Ok(ts) =
                                            serenity::Timestamp::from_unix_timestamp(until)
                                        {
                                            let _ = member
                                                .disable_communication_until_datetime(&ctx.http, ts)
                                                .await;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // Same-channel early return (mirrors `newState.channelId ===
        // oldState.channelId → return`): no join/leave/move happened,
        // so the temp-voice sweep below does not apply.
        if old.as_ref().and_then(|o| o.channel_id) != new.channel_id {
            if let Some(old_ch) = old.as_ref().and_then(|o| o.channel_id) {
                // Event-tied sweep (mirrors the cleanup legs of
                // voicedashboard/voiceState.ts): only rows pointing at
                // the abandoned channel are examined — the mover's own
                // row (`oldState.channelId === channelDb`) and any
                // other owner's row matching it. The channel is fetched
                // from the API (mirrors guild.channels.fetch, not the
                // cache): a gone channel drops its rows (mirrors
                // `!channel`), an emptied one is deleted then dropped
                // (mirrors isMemberlessChannel, whose fetch failure
                // counts as empty).
                let old_s = old_ch.get().to_string();
                let tied: Vec<(String, String)> = custom_voice_rows_routed(&self.pool, &gid)
                    .await
                    .into_iter()
                    .filter(|(_, c)| c.trim() == old_s)
                    .collect();
                if !tied.is_empty() {
                    use crate::commands::voicedashboard::main as vd;
                    if vd::fetch_voice_channel(&ctx.http, old_ch).await.is_none() {
                        for (key, _) in &tied {
                            let _ = crate::db::tbl_del(&self.pool, &gid, key).await;
                        }
                    } else if vd::voice_occupants(&ctx, guild_id, old_ch) == 0 {
                        let _ = old_ch.delete(&ctx.http).await;
                        for (key, _) in &tied {
                            let _ = crate::db::tbl_del(&self.pool, &gid, key).await;
                        }
                    }
                }
            }
        }
        // Music empty-channel guard (mirrors
        // stopMusicOnEmptyVoiceChannel.ts, whose TS body is commented
        // out: bot alone in its music voice channel -> stop + OP4
        // leave + destroy the node player + notify the stored text
        // channel with event_mp_emptyChannel). DISABLED by default
        // (audit M6): the entire TS handler body is commented-out dead
        // code, so production never stops on empty voice. Flip to true
        // only if the TS handler is ever re-enabled. Skipped for the
        // bot's own updates (it just joined/moved; humans may follow)
        // and when the cache guild is unavailable (no blind leaves).
        // NOTE: this arm lives on even while disabled so the mirror
        // stays one flag away from the TS shape.
        const MUSIC_EMPTY_STOP_ENABLED: bool = false;
        {
            let m = crate::lavalink::manager();
            let snap = m.snapshot(guild_id.get()).await;
            let bot_id = ctx.cache.current_user().id;
            if MUSIC_EMPTY_STOP_ENABLED && new.user_id != bot_id {
                if let Some(s) = snap {
                    if let (Some(vc), true) = (s.voice_channel, s.current.is_some()) {
                        let occupants = ctx
                            .cache
                            .guild(guild_id)
                            .map(|g| {
                                g.voice_states
                                    .values()
                                    .filter(|v| v.channel_id == Some(serenity::ChannelId::new(vc)))
                                    .count()
                            })
                            .unwrap_or(usize::MAX);
                        let alone = m
                            .with_player(guild_id.get(), |p| {
                                p.voice_channel == Some(vc)
                                    && crate::lavalink::LavalinkManager::should_leave_when_alone(
                                        p, occupants,
                                    )
                            })
                            .await;
                        if alone {
                            m.with_player(guild_id.get(), |p| p.stop(now)).await;
                            crate::lavalink::LavalinkManager::send_voice_state(
                                &ctx.shard,
                                guild_id.get(),
                                None,
                            );
                            if let Ok((node, session)) =
                                m.live_node_and_session(guild_id.get()).await
                            {
                                let _ = m.rest_destroy(&node, &session, guild_id.get()).await;
                            }
                            if let Some(tc) = s.text_channel {
                                let lang_code =
                                    crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                                let msg = crate::lang::get(&lang_code, "event_mp_emptyChannel")
                                    .unwrap_or_default();
                                if !msg.is_empty() {
                                    let _ = serenity::ChannelId::new(tc).say(&ctx.http, msg).await;
                                }
                            }
                        }
                    }
                }
            }
        }
        // TTS memberless cleanup (mirrors Events/tts/voiceState.ts +
        // the offline leg of cleanupTTS in ttsManager.ts): someone left
        // the TTS voice channel and no non-bot member remains -> stop
        // playback, OP4-leave (unless H24/7 parks the bot there),
        // destroy the node player, delete the welcome embed
        // best-effort, drop GUILD.TTS. The Flowery speak leg stays TS.
        {
            let old_ch = old.as_ref().and_then(|o| o.channel_id).map(|c| c.get());
            let new_ch = new.channel_id.map(|c| c.get());
            if let Some(raw) = tts_raw_routed(&self.pool, &gid).await {
                if crate::commands::tts::tts_row_enabled(&raw) {
                    if let Ok(cfg) = serde_json::from_str::<crate::commands::tts::TtsConfig>(&raw) {
                        if let Ok(tts_vc) = cfg.voice_channel_id.parse::<u64>() {
                            if crate::commands::tts::tts_voice_left(old_ch, new_ch, tts_vc) {
                                // Memberless check mirrors isMemberlessChannel:
                                // non-voice channels never count (TS returns
                                // false unless GuildVoice), the fetch doubles
                                // as the existence check (a fetch failure
                                // means deleted channel => cleanup, like the
                                // TS catch => true).
                                // The member count itself stays cache-based
                                // (Discord exposes no REST voice-state list;
                                // discord.js `channel.members` is cache data
                                // too, so this matches TS in practice).
                                // Missing cache guild = no blind leaves.
                                let fetched = serenity::ChannelId::new(tts_vc)
                                    .to_channel(&ctx.http)
                                    .await
                                    .ok();
                                let is_voice = fetched.as_ref().is_some_and(|c| {
                                    matches!(
                                        c,
                                        serenity::Channel::Guild(g)
                                        if g.kind == serenity::ChannelType::Voice
                                    )
                                });
                                let channel_gone = fetched.is_none();
                                let bot_id = ctx.cache.current_user().id;
                                // Human tally mirrors
                                // `members.filter((m) => !m.user.bot)`: a
                                // voice occupant counts only when the
                                // cache resolves them as a non-bot —
                                // cache-unknown ids count as non-human
                                // and bots must resolve to count.
                                let humans = ctx.cache.guild(guild_id).map(|g| {
                                    g.voice_states
                                        .values()
                                        .filter(|v| {
                                            v.channel_id == Some(serenity::ChannelId::new(tts_vc))
                                                && v.user_id != bot_id
                                                && ctx.cache.user(v.user_id).is_some_and(|u| !u.bot)
                                        })
                                        .count()
                                });
                                // Missing cache guild = no blind leaves, a gone
                                // channel always cleans up (TS catch =>
                                // true), and a non-voice channel never does
                                // (TS isMemberlessChannel false unless
                                // GuildVoice).
                                if channel_gone || (is_voice && humans == Some(0)) {
                                    let keep = match h247_routed(&self.pool, &gid).await {
                                        Some(hraw) => crate::commands::tts::tts_keep_voice(
                                            crate::commands::h247::grant::parse_h247(&hraw)
                                                .as_ref(),
                                            tts_vc,
                                        ),
                                        None => false,
                                    };
                                    let m = crate::lavalink::manager();
                                    m.with_player(guild_id.get(), |p| p.stop(now)).await;
                                    if !keep {
                                        crate::lavalink::LavalinkManager::send_voice_state(
                                            &ctx.shard,
                                            guild_id.get(),
                                            None,
                                        );
                                    }
                                    if let Ok((node, session)) =
                                        m.live_node_and_session(guild_id.get()).await
                                    {
                                        let _ =
                                            m.rest_destroy(&node, &session, guild_id.get()).await;
                                    }
                                    if let Some((tc, msg)) =
                                        crate::commands::tts::tts_embed_ids(&raw)
                                    {
                                        if let Ok(message) = serenity::ChannelId::new(tc)
                                            .message(&ctx.http, serenity::MessageId::new(msg))
                                            .await
                                        {
                                            let _ = message.delete(&ctx.http).await;
                                        }
                                    }
                                    // Voice-status leg of cleanupTTS in
                                    // ttsManager.ts: the stale TTS status
                                    // must not linger on the channel.
                                    crate::lavalink::LavalinkManager::clear_voice_status(
                                        &ctx.http, tts_vc,
                                    )
                                    .await;
                                    let _ = crate::db::tbl_del(&self.pool, &gid, "GUILD.TTS").await;
                                    tracing::info!("tts cleanup {} channel {}", gid, tts_vc);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    async fn voice_server_update(
        &self,
        _ctx: serenity::Context,
        event: serenity::VoiceServerUpdateEvent,
    ) {
        // Lavalink voice handshake, server half (mirrors the raw.ts
        // voice-packet forward): token + endpoint. Combined with the
        // noted Discord session it is pushed to the node via
        // update_player. Best-effort: fails silently offline.
        let Some(guild_id) = event.guild_id else {
            return;
        };
        let Some(endpoint) = event.endpoint else {
            return;
        };
        let m = crate::lavalink::manager();
        if let Some(voice) = m
            .note_voice_server(guild_id.get(), event.token, endpoint)
            .await
        {
            let _ = m.push_voice_state(guild_id.get(), voice).await;
        }
    }

    async fn reaction_add(&self, ctx: serenity::Context, add: serenity::Reaction) {
        // Mirrors reactionrole/onReactAdd.ts (toggle) + starboard/onNewReact.ts.
        let Some(guild_id) = add.guild_id else { return };
        let Some(user_id) = add.user_id else { return };
        // The bot's own seeded reactions never trigger toggles.
        if user_id != ctx.cache.current_user().id {
            if let Some(role_id) =
                crate::commands::rolereactions::rolereaction::lookup_reaction_role(
                    &self.pool,
                    &guild_id.get().to_string(),
                    add.message_id.get(),
                    &add.emoji,
                )
                .await
            {
                // Missing roles are skipped (cache first, fetch fallback).
                let mut roles = ctx.cache.guild(guild_id).map(|g| g.roles.clone());
                if roles
                    .as_ref()
                    .map(|m| m.contains_key(&role_id))
                    .unwrap_or(false)
                    || guild_id
                        .roles(&ctx.http)
                        .await
                        .map(|m| {
                            let hit = m.contains_key(&role_id);
                            roles = Some(m);
                            hit
                        })
                        .unwrap_or(false)
                {
                    if let Ok(member) = guild_id.member(&ctx.http, user_id).await {
                        // Toggle, like the TS has/remove legs (no audit
                        // reason in serenity 0.12).
                        if member.roles.contains(&role_id) {
                            let _ = member.remove_role(&ctx.http, role_id).await;
                        } else {
                            let _ = member.add_role(&ctx.http, role_id).await;
                        }
                    }
                }
            }
        }
        // Mirrors starboard/skullboard onNewReact.ts (rich post/edit +
        // DATA entries + threads). Independent of the role handler.
        if let serenity::ReactionType::Unicode(emoji) = &add.emoji {
            if emoji == "⭐" || emoji == "💀" {
                let reactor_bot = ctx.cache.user(user_id).map(|u| u.bot).unwrap_or(false);
                if !reactor_bot {
                    if let Some((message, count)) =
                        board_source_message(&ctx, &add, emoji, add.message_id).await
                    {
                        board_reaction_add(
                            &self.pool,
                            &ctx,
                            guild_id.get(),
                            emoji,
                            &message,
                            count,
                        )
                        .await;
                    }
                }
            }
        }
    }

    async fn reaction_remove(&self, ctx: serenity::Context, removed: serenity::Reaction) {
        // Mirrors reactionrole/onReactRemove.ts (name-key lookup in
        // both legs, like the TS duplicate).
        if let (Some(guild_id), Some(user_id)) = (removed.guild_id, removed.user_id) {
            if user_id != ctx.cache.current_user().id {
                let name = match &removed.emoji {
                    serenity::ReactionType::Unicode(u) => u.clone(),
                    serenity::ReactionType::Custom { name, .. } => name.clone().unwrap_or_default(),
                    _ => String::new(),
                };
                if !name.is_empty() {
                    let gid = guild_id.get().to_string();
                    if let Some(role_id) =
                        reaction_role_routed(&self.pool, &gid, removed.message_id.get(), &name)
                            .await
                    {
                        if let Ok(member) = guild_id.member(&ctx.http, user_id).await {
                            let _ = member
                                .remove_role(&ctx.http, serenity::RoleId::new(role_id))
                                .await;
                        }
                    }
                }
            }
        }
        // Mirrors starboard/skullboard onDeletedReact.ts (delete or
        // re-render below/above threshold). Independent of roles.
        let Some(guild_id) = removed.guild_id else {
            return;
        };
        let emoji = match &removed.emoji {
            serenity::ReactionType::Unicode(u) => u.clone(),
            _ => return,
        };
        if emoji != "⭐" && emoji != "💀" {
            return;
        }
        if let Some(user_id) = removed.user_id {
            if ctx.cache.user(user_id).map(|u| u.bot).unwrap_or(false) {
                return;
            }
        }
        if let Some((message, count)) =
            board_source_message(&ctx, &removed, &emoji, removed.message_id).await
        {
            board_reaction_remove(&self.pool, &ctx, guild_id.get(), &emoji, &message, count).await;
        }
    }

    async fn user_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::CurrentUser>,
        new: serenity::CurrentUser,
    ) {
        // Mirrors prevnamesModule.ts (global username history): on
        // change, the OLD username / globalName is recorded with a date
        // stamp and type tag (`<t:unix:d> - [username|globalName]
        // oldValue`). Previous names resolve cache-first like TS
        // `cached?.username ?? oldUser.username`: the retained
        // `self.names` map (warmed at ready, refreshed below) first, the
        // serenity `old` payload on cache miss. With neither known,
        // nothing is stored — never the new name itself.
        let known: Option<(String, Option<String>)> =
            self.names.lock().await.get(&new.id.get()).cloned();
        let (prev_name, prev_global): (Option<String>, Option<Option<String>>) = match known {
            Some((n, g)) => (Some(n), Some(g)),
            None => match old.as_ref() {
                Some(o) => (Some(o.name.clone()), Some(o.global_name.clone())),
                None => (None, None),
            },
        };
        if let (Some(pn), Some(pg)) = (&prev_name, &prev_global) {
            let now = crate::commands::context::now_ms() / 1000;
            let mut changes: Vec<String> = Vec::new();
            if *pn != new.name {
                changes.push(crate::events::prevname_entry(now, "username", pn));
            }
            if *pg != new.global_name {
                if let Some(prev_global) = pg.as_deref() {
                    changes.push(crate::events::prevname_entry(
                        now,
                        "globalName",
                        prev_global,
                    ));
                }
            }
            if !changes.is_empty() {
                let key = crate::events::prevnames_key(new.id.get());
                let mut history: Vec<String> = prevnames_routed(&self.pool, new.id.get()).await;
                for entry in changes {
                    history =
                        crate::events::push_prevname(history, &entry, crate::events::PREVNAMES_CAP);
                }
                let _ = crate::db::tbl_set(
                    &self.pool,
                    "0",
                    &key,
                    &serde_json::to_string(&history).unwrap_or_default(),
                )
                .await;
            }
        }
        // Refresh the retained map (mirrors the trailing
        // `usersNamesMap.set` in prevnamesModule.ts).
        self.names
            .lock()
            .await
            .insert(new.id.get(), (new.name.clone(), new.global_name.clone()));
        // Rank-role username-change grant (mirrors
        // Events/utils/rankRoleModule_2.ts): on username/globalName
        // change, grant or remove the GUILD.RANK_ROLES role based on
        // whether the new names contain the configured substring.
        // Reuses the GUILD.RANK_ROLES.roles / .nicknames keys (no new keys).
        if !crate::commands::h247::grant::names_changed(
            prev_name.as_deref(),
            prev_global.as_ref().map(|g| g.as_deref()),
            &new.name,
            new.global_name.as_deref(),
        ) {
            return;
        }
        // Cache snapshot first (mirrors guilds.cache.filter(has member));
        // the guards are dropped before any await below.
        let gids: Vec<serenity::GuildId> = ctx
            .cache
            .guilds()
            .into_iter()
            .filter(|gid| {
                ctx.cache
                    .guild(*gid)
                    .map(|g| g.members.contains_key(&new.id))
                    .unwrap_or(false)
            })
            .collect();
        for gid in gids {
            let g = gid.get().to_string();
            let roles_raw = rank_role_single_routed(&self.pool, &g).await;
            let nick_raw = rank_nicknames_routed(&self.pool, &g).await;
            let (Some(roles_raw), Some(nick_raw)) = (roles_raw, nick_raw) else {
                continue;
            };
            let Some(role_num) = crate::commands::h247::grant::parse_role_id(&roles_raw) else {
                continue;
            };
            let matched = crate::commands::h247::grant::rank_needles(&nick_raw)
                .iter()
                .any(|n| {
                    crate::commands::h247::grant::username_matches(
                        &new.name,
                        new.global_name.as_deref(),
                        n,
                    )
                });
            let Ok(member) = gid.member(&ctx.http, new.id).await else {
                continue;
            };
            let role_id = serenity::RoleId::new(role_num);
            match crate::commands::h247::grant::grant_decision(
                member.roles.contains(&role_id),
                matched,
            ) {
                crate::commands::h247::grant::RankGrant::Grant => {
                    let _ = member.add_role(&ctx.http, role_id).await;
                }
                crate::commands::h247::grant::RankGrant::Remove => {
                    let _ = member.remove_role(&ctx.http, role_id).await;
                }
                crate::commands::h247::grant::RankGrant::Keep => {}
            }
        }
    }

    async fn guild_role_create(&self, ctx: serenity::Context, new: serenity::Role) {
        use serenity::model::guild::audit_log::{Action, RoleAction};
        let hit = self
            .protection_guard(
                &ctx,
                new.guild_id,
                Action::Role(RoleAction::Create),
                "createrole",
                Some(new.id.get()),
            )
            .await;
        // Unauthorized role-create revert (mirrors
        // avoidRoleCreate.ts): punish ran inside the guard, then
        // the created role is deleted.
        if hit.is_some() {
            let _ = ctx
                .http
                .delete_role(new.guild_id, new.id, Some("Protect!"))
                .await;
        }
    }

    async fn guild_role_delete(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        removed_role_id: serenity::RoleId,
        removed_role_data_if_available: Option<serenity::Role>,
    ) {
        use serenity::model::guild::audit_log::{Action, RoleAction};
        let hit = self
            .protection_guard(
                &ctx,
                guild_id,
                Action::Role(RoleAction::Delete),
                "deleterole",
                Some(removed_role_id.get()),
            )
            .await;
        // Live restore (mirrors avoidRoleDelete.ts): punish ran inside the
        // guard, then the role is rebuilt from the event payload with the
        // snapshot members re-added. No hit means no restore.
        if let Some(hit) = hit.as_ref() {
            self.restore_deleted_role(
                &ctx,
                guild_id,
                removed_role_id,
                &removed_role_data_if_available,
                Some(hit.executor.get()),
            )
            .await;
        }
    }

    async fn guild_role_update(
        &self,
        ctx: serenity::Context,
        old_data_if_available: Option<serenity::Role>,
        new: serenity::Role,
    ) {
        use serenity::model::guild::audit_log::{Action, RoleAction};
        let hit = self
            .protection_guard(
                &ctx,
                new.guild_id,
                Action::Role(RoleAction::Update),
                "updaterole",
                Some(new.id.get()),
            )
            .await;
        // Role-update revert (mirrors avoidRoleUpdate.ts): punish ran
        // inside the guard, then the pre-update snapshot is written back.
        if hit.is_some() {
            if let Some(old) = old_data_if_available.as_ref() {
                self.revert_role_edit(&ctx, &new, old).await;
            }
        }
    }

    async fn channel_create(&self, ctx: serenity::Context, channel: serenity::GuildChannel) {
        use serenity::model::guild::audit_log::{Action, ChannelAction};
        let hit = self
            .protection_guard(
                &ctx,
                channel.guild_id,
                Action::Channel(ChannelAction::Create),
                "createchannel",
                Some(channel.id.get()),
            )
            .await;
        // Unauthorized channel-create revert (mirrors
        // avoidChannelCreate.ts): punish ran inside the guard, then
        // the created channel is deleted.
        if hit.is_some() {
            let _ = channel.id.delete(&ctx.http).await;
        }
        // Setup embed for freshly created "ihorizon-logs" channels
        // (mirrors logs/ihorizon_logs.ts).
        if channel.name.contains("ihorizon-logs") {
            let lang_code = crate::db::guild_lang(&self.pool, Some(channel.guild_id.get())).await;
            let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
            let embed = serenity::CreateEmbed::default()
                .colour(0x1E1D22_u32)
                .title(text("event_channel_create_message_embed_title"))
                .description(text("event_channel_create_message_embed_description"));
            let _ = channel
                .id
                .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                .await;
        }
    }

    async fn channel_delete(
        &self,
        ctx: serenity::Context,
        channel: serenity::GuildChannel,
        _messages: Option<Vec<serenity::Message>>,
    ) {
        use serenity::model::guild::audit_log::{Action, ChannelAction};
        let hit = self
            .protection_guard(
                &ctx,
                channel.guild_id,
                Action::Channel(ChannelAction::Delete),
                "deletechannel",
                Some(channel.id.get()),
            )
            .await;
        // No TS channel-delete log file exists — the protection
        // guard above is the whole parity surface.
        // Purge ticket rows bound to this channel (mirrors
        // deleteTicketPanel.ts).
        let gid = channel.guild_id.get().to_string();
        // Purge ticket rows bound to this channel: TICKET_ALL.<user>.<channel>.
        let chan_suffix = format!(".{}", channel.id.get());
        for (k, _) in ticket_rows_routed(&self.pool, &gid).await {
            if k.ends_with(&chan_suffix) {
                let _ = crate::db::tbl_del(&self.pool, &gid, &k).await;
            }
        }
        // Live restore (mirrors avoidChannelDelete.ts): punish ran inside
        // the guard, then the snapshot sweep clone-restores the deleted
        // channel/category. No hit means no restore.
        if let Some(hit) = hit.as_ref() {
            self.restore_deleted_channel(&ctx, &channel, Some(hit.executor.get()))
                .await;
        }
    }

    async fn channel_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::GuildChannel>,
        new: serenity::GuildChannel,
    ) {
        use serenity::model::guild::audit_log::{Action, ChannelAction, ChannelOverwriteAction};
        let hit = self
            .protection_guard(
                &ctx,
                new.guild_id,
                Action::Channel(ChannelAction::Update),
                "updatechannel",
                Some(new.id.get()),
            )
            .await;
        // Unauthorized channel-update revert (mirrors
        // avoidChannelUpdate.ts): punish ran inside the guard, then the
        // pre-update snapshot is written back.
        if hit.is_some() {
            if let Some(prev) = old.as_ref() {
                self.revert_channel_edit(&ctx, &new, prev).await;
            }
        }
        // Rich channel-update log (mirrors logs/channelUpdateLogs.ts):
        // latest ChannelUpdate + ChannelOverwriteUpdate audit entries
        // -> #010101 embed with the name/overwrite change list.
        // Silent when no audit entry, both executors are the bot, or
        // the diff is empty, like TS.
        let Some(old) = old else {
            return;
        };
        let gid = new.guild_id.get().to_string();
        let logs_ch: Option<u64> =
            crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                &self.pool, &gid, "channel",
            )
            .await
            .and_then(|s| s.parse().ok());
        let Some(logs_ch) = logs_ch else {
            return;
        };
        let self_id = ctx.cache.current_user().id;
        let rel = new
            .guild_id
            .audit_logs(
                &ctx.http,
                Some(Action::Channel(ChannelAction::Update)),
                None,
                None,
                Some(1),
            )
            .await
            .ok();
        let rel2 = new
            .guild_id
            .audit_logs(
                &ctx.http,
                Some(Action::ChannelOverwrite(ChannelOverwriteAction::Update)),
                None,
                None,
                Some(1),
            )
            .await
            .ok();
        let (Some(rel), Some(rel2)) = (rel.as_ref(), rel2.as_ref()) else {
            return;
        };
        let (Some(e1), Some(e2)) = (rel.entries.first(), rel2.entries.first()) else {
            return;
        };
        if e1.user_id == self_id && e2.user_id == self_id {
            return;
        }
        let lang_code = crate::db::guild_lang(&self.pool, Some(new.guild_id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let map_ow = |c: &serenity::GuildChannel| {
            c.permission_overwrites
                .iter()
                .map(|o| crate::events::PermOverwriteDiff {
                    id: match o.kind {
                        serenity::PermissionOverwriteType::Role(id) => id.get(),
                        serenity::PermissionOverwriteType::Member(id) => id.get(),
                        _ => 0,
                    },
                    is_role: matches!(o.kind, serenity::PermissionOverwriteType::Role(_)),
                    allow: o
                        .allow
                        .get_permission_names()
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                    deny: o
                        .deny
                        .get_permission_names()
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                })
                .collect::<Vec<_>>()
        };
        let old_ow = map_ow(&old);
        let new_ow = map_ow(&new);
        let mut changes =
            crate::events::channel_perm_diff(&old.name, &new.name, &old_ow, &new_ow, &text);
        if changes.is_empty() {
            return;
        }
        // TS `changes.substring(0, 1021) + "..."` counts UTF-16 code
        // units: cut on a char boundary at most 1021 units in (never a
        // byte slice, which panics on multibyte text and over-truncates
        // BMP-multibyte runs).
        if changes.encode_utf16().count() > 1024 {
            let mut units = 0;
            let mut end = 0;
            for (i, c) in changes.char_indices() {
                let u = c.len_utf16();
                if units + u > 1021 {
                    break;
                }
                units += u;
                end = i + c.len_utf8();
            }
            changes = format!("{}...", &changes[..end]);
        }
        let executor_name = e1
            .user_id
            .to_user(&ctx.http)
            .await
            .map(|u| u.name.clone())
            .unwrap_or_else(|_| text("var_unknown"));
        let desc = text("event_srvLogs_channelUpdate_embed_desc")
            .replace("${newChannel.toString()}", &format!("<#{}>", new.id.get()));
        let embed = serenity::CreateEmbed::default()
            .colour(0x010101_u32)
            .author(serenity::CreateEmbedAuthor::new(executor_name))
            .description(desc)
            .field(text("event_srvLogs_messageUpdate_footer_2"), changes, false)
            .timestamp(serenity::Timestamp::now());
        let _ = serenity::ChannelId::new(logs_ch)
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }

    async fn guild_ban_addition(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        banned_user: serenity::User,
    ) {
        use serenity::model::guild::audit_log::{Action, MemberAction};
        let _ = self
            .protection_guard(
                &ctx,
                guild_id,
                Action::Member(MemberAction::BanAdd),
                "banmembers",
                Some(banned_user.id.get()),
            )
            .await;
        // Unauthorized-ban reversal (mirrors avoidBanMember.ts) runs
        // inside the guard: the victim's ban is lifted BEFORE the
        // executor is punished (unban-first-then-punish).
        // Rich audit embed (mirrors logs/addBanLogs.ts).
        self.mod_audit_log(
            &ctx,
            guild_id,
            Action::Member(MemberAction::BanAdd),
            "event_srvLogs_banAdd_description",
            banned_user.id.get(),
            None,
        )
        .await;
    }

    async fn guild_ban_removal(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        unbanned_user: serenity::User,
    ) {
        use serenity::model::guild::audit_log::{Action, MemberAction};
        let hit = self
            .protection_guard(
                &ctx,
                guild_id,
                Action::Member(MemberAction::BanRemove),
                "unbanmembers",
                Some(unbanned_user.id.get()),
            )
            .await;
        // Unauthorized-unban reversal (mirrors avoidUnbanMember.ts):
        // punish ran inside the guard, then the user is re-banned.
        if hit.is_some() {
            let _ = guild_id.ban(&ctx.http, unbanned_user.id, 0).await;
        }
        // Rich audit embed (mirrors logs/removeBanLogs.ts).
        self.mod_audit_log(
            &ctx,
            guild_id,
            Action::Member(MemberAction::BanRemove),
            "event_srvLogs_banRemove_description",
            unbanned_user.id.get(),
            Some(&unbanned_user.name),
        )
        .await;
    }

    async fn guild_update(
        &self,
        ctx: serenity::Context,
        old_data_if_available: Option<serenity::Guild>,
        new_data: serenity::PartialGuild,
    ) {
        use serenity::model::guild::audit_log::Action;
        let hit = self
            .protection_guard(
                &ctx,
                new_data.id,
                Action::GuildUpdate,
                "updateguild",
                Some(new_data.id.get()),
            )
            .await;
        // Guild-field revert (mirrors avoidGuildEdit.ts): restore each
        // drifted field from the pre-update snapshot.
        if hit.is_some() {
            if let Some(old) = old_data_if_available.as_ref() {
                self.revert_guild_edit(&ctx, new_data.id, old, &new_data)
                    .await;
            }
        }
    }

    async fn webhook_update(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        belongs_to_channel_id: serenity::ChannelId,
    ) {
        use serenity::model::guild::audit_log::{Action, WebhookAction};
        let hit = self
            .protection_guard(
                &ctx,
                guild_id,
                Action::Webhook(WebhookAction::Create),
                "webhook",
                // TS passes the channel id as the audit target
                // (avoidWebhookModifying.ts), kept verbatim.
                Some(belongs_to_channel_id.get()),
            )
            .await;
        // Webhook-create revert (mirrors avoidWebhookModifying.ts):
        // punish ran inside the guard, then the created webhook is
        // deleted by audit-target id. Verdict (kept verbatim): the guard
        // target is the channel id and the delete filters on
        // `webhook.id === relevantLog.targetId`, exactly like TS —
        // only the attributed webhook is removed, never the channel's
        // other webhooks.
        if let Some(hit) = hit {
            if let Ok(hooks) = guild_id.webhooks(&ctx.http).await {
                for hook in hooks
                    .iter()
                    .filter(|h| Some(h.id.get()) == hit.entry_target)
                {
                    let _ = hook.delete(&ctx.http).await;
                }
            }
        }
    }

    async fn guild_member_update(
        &self,
        ctx: serenity::Context,
        old_if_available: Option<serenity::Member>,
        new: Option<serenity::Member>,
        _event: serenity::GuildMemberUpdateEvent,
    ) {
        // Role limits (mirrors Events/utils/roleLimit.ts): the latest
        // MemberRoleUpdate audit entry for the target decides which
        // roles changed ($add/$remove); every affected limited role is
        // counter-renamed (`base [members/limit]`), and only newly
        // added roles past their limit are removed from the member.
        if let Some(ref updated) = new {
            // TS early-out (`oldMember.roles.cache.equals(...)`): no
            // role delta means no audit entry to attribute.
            let roles_changed = old_if_available
                .as_ref()
                .map(|o| o.roles != updated.roles)
                .unwrap_or(true);
            if roles_changed {
                use serenity::model::guild::audit_log::{Action, Change, MemberAction};
                let mut added: Vec<u64> = vec![];
                let mut removed: Vec<u64> = vec![];
                if let Ok(logs) = updated
                    .guild_id
                    .audit_logs(
                        &ctx.http,
                        Some(Action::Member(MemberAction::RoleUpdate)),
                        None,
                        None,
                        Some(AUDIT_LOG_FETCH_LIMIT),
                    )
                    .await
                {
                    let bot_id = ctx.cache.current_user().id.get();
                    let now_ms = chrono::Local::now().timestamp_millis();
                    if let Some(entry) = logs.entries.iter().find(|e| {
                        audit_entry_relevant(
                            e.target_id.map(|t| t.get()),
                            e.user_id.get(),
                            bot_id,
                            e.id.created_at().unix_timestamp() * 1000,
                            now_ms,
                            Some(updated.user.id.get()),
                        )
                    }) {
                        for change in entry.changes.clone().unwrap_or_default() {
                            match change {
                                Change::RolesAdded { new, .. } => {
                                    added
                                        .extend(new.unwrap_or_default().iter().map(|r| r.id.get()));
                                }
                                Change::RolesRemove { new, .. } => {
                                    removed
                                        .extend(new.unwrap_or_default().iter().map(|r| r.id.get()));
                                }
                                _ => {}
                            }
                        }
                    }
                }
                // TS `if (!relevantLog) return` + empty-affected stop.
                let mut affected = added.clone();
                affected.extend(removed.iter().copied());
                affected.sort_unstable();
                affected.dedup();
                if !affected.is_empty() {
                    let gid = updated.guild_id.get().to_string();
                    // Role objects: cache first, guild fetch fallback
                    // (mirrors `roles.cache.get(roleId) || roles.fetch`).
                    let guild_roles = updated.guild_id.roles(&ctx.http).await.unwrap_or_default();
                    let role_of = |rid: u64| {
                        ctx.cache
                            .guild(updated.guild_id)
                            .and_then(|g| g.roles.get(&serenity::RoleId::new(rid)).cloned())
                            .or_else(|| guild_roles.get(&serenity::RoleId::new(rid)).cloned())
                    };
                    let holders = |rid: &serenity::RoleId| {
                        ctx.cache
                            .guild(updated.guild_id)
                            .map(|g| g.members.values().filter(|m| m.roles.contains(rid)).count())
                            .unwrap_or(0)
                    };
                    for rid in &affected {
                        if let Some(limit) = role_limit_routed(&self.pool, &gid, *rid).await {
                            if let Some(mut role) = role_of(*rid) {
                                let count = holders(&role.id);
                                let next = role_limit_counter_name(&role.name, count, limit.max(1));
                                if next != role.name {
                                    let _ = role
                                        .edit(
                                            &ctx.http,
                                            serenity::EditRole::new().name(next).audit_log_reason(
                                                "[RoleLimit] - Updating role counter",
                                            ),
                                        )
                                        .await;
                                }
                            }
                        }
                    }
                    // Only newly added roles are ever removed (a removed
                    // role or an untouched over-cap role is left alone).
                    // REMOVAL-REASON VERDICT: TS passes "[RoleLimit] - The
                    // limit of users is reached!"; serenity 0.12
                    // Member::remove_role carries no reason slot.
                    for rid in &added {
                        if let Some(limit) = role_limit_routed(&self.pool, &gid, *rid).await {
                            let role_id = serenity::RoleId::new(*rid);
                            if holders(&role_id) > limit.max(1) {
                                if let Ok(member) =
                                    updated.guild_id.member(&ctx.http, updated.user.id).await
                                {
                                    let _ = member.remove_role(&ctx.http, role_id).await;
                                }
                            }
                        }
                    }
                }
            }
        }
        // Mirrors avoidAdminRankWithoutConsent.ts: punish fresh admin grants.
        let (Some(old), Some(new)) = (old_if_available, new) else {
            return;
        };
        let admin_roles = |member: &serenity::Member| -> Vec<u64> {
            member
                .roles
                .iter()
                .filter(|r| {
                    ctx.cache
                        .guild(new.guild_id)
                        .and_then(|g| g.roles.get(r).cloned())
                        .map(|role| role.permissions.administrator())
                        .unwrap_or(false)
                })
                .map(|r| r.get())
                .collect()
        };
        let before = admin_roles(&old);
        if admin_roles(&new).iter().any(|r| !before.contains(r)) {
            use serenity::model::guild::audit_log::{Action, MemberAction};
            if self
                .protection_guard(
                    &ctx,
                    new.guild_id,
                    Action::Member(MemberAction::RoleUpdate),
                    "add_admin_roles",
                    Some(new.user.id.get()),
                )
                .await
                .is_some()
            {
                // Victim role-restore (mirrors avoidAdminRankWithoutConsent.ts:
                // after punish(), the victim's roles are set back, with the
                // verbatim TS audit reason).
                if let Ok(mut member) = new.guild_id.member(&ctx.http, new.user.id).await {
                    let _ = member
                        .edit(
                            &ctx.http,
                            serenity::EditMember::new()
                                .roles(old.roles.clone())
                                .audit_log_reason("[Protection] AntiRaid (try to gave admin role)"),
                        )
                        .await;
                }
            }
        }
        // Any role add/remove (mirrors avoidMemberUpdate.ts).
        if old.roles != new.roles {
            use serenity::model::guild::audit_log::{Action, MemberAction};
            if self
                .protection_guard(
                    &ctx,
                    new.guild_id,
                    Action::Member(MemberAction::RoleUpdate),
                    "updatemember",
                    Some(new.user.id.get()),
                )
                .await
                .is_some()
            {
                // Victim role-restore (mirrors avoidMemberUpdate.ts, with the
                // verbatim TS audit reason).
                if let Ok(mut member) = new.guild_id.member(&ctx.http, new.user.id).await {
                    let _ = member
                        .edit(
                            &ctx.http,
                            serenity::EditMember::new()
                                .roles(old.roles.clone())
                                .audit_log_reason("[Protection] AntiRaid"),
                        )
                        .await;
                }
            }
        }
        // Rich role log (mirrors logs/rolesLogs.ts): latest
        // MemberRoleUpdate audit entry for the target -> #010101
        // embed with removed/added role mentions. Silent when roles
        // are unchanged, no log channel, no audit entry, the
        // executor is the bot, or the entry targets someone else.
        if old.roles != new.roles {
            let gid = new.guild_id.get().to_string();
            let logs_ch: Option<u64> =
                crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                    &self.pool, &gid, "roles",
                )
                .await
                .and_then(|s| s.parse().ok());
            if let Some(logs_ch) = logs_ch {
                use serenity::model::guild::audit_log::{Action, Change, MemberAction};
                let self_id = ctx.cache.current_user().id;
                if let Ok(logs) = new
                    .guild_id
                    .audit_logs(
                        &ctx.http,
                        Some(Action::Member(MemberAction::RoleUpdate)),
                        None,
                        None,
                        Some(1),
                    )
                    .await
                {
                    if let Some(entry) = logs.entries.first() {
                        let target_ok = entry
                            .target_id
                            .map(|t| t.get() == new.user.id.get())
                            .unwrap_or(false);
                        if entry.user_id != self_id && target_ok {
                            let mut added: Vec<u64> = vec![];
                            let mut removed: Vec<u64> = vec![];
                            for change in entry.changes.clone().unwrap_or_default() {
                                match change {
                                    Change::RolesAdded { new, .. } => {
                                        added.extend(
                                            new.unwrap_or_default().iter().map(|r| r.id.get()),
                                        );
                                    }
                                    Change::RolesRemove { new, .. } => {
                                        removed.extend(
                                            new.unwrap_or_default().iter().map(|r| r.id.get()),
                                        );
                                    }
                                    _ => {}
                                }
                            }
                            if !added.is_empty() || !removed.is_empty() {
                                let lang_code =
                                    crate::db::guild_lang(&self.pool, Some(new.guild_id.get()))
                                        .await;
                                let text =
                                    |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                                let username = new
                                    .user
                                    .id
                                    .to_user(&ctx.http)
                                    .await
                                    .map(|u| u.name.clone())
                                    .unwrap_or_else(|_| new.user.name.clone());
                                let avatar = new.user.avatar_url().unwrap_or_default();
                                let mut desc = " ".to_string();
                                if !removed.is_empty() {
                                    desc += &(text("event_srvLogs_guildMemberUpdate_description")
                                        .replace(
                                            "${firstEntry.executor.id}",
                                            &entry.user_id.get().to_string(),
                                        )
                                        .replace(
                                            "${removedRoles}",
                                            &removed
                                                .iter()
                                                .map(|id| format!("<@&{id}>"))
                                                .collect::<Vec<_>>()
                                                .join(","),
                                        )
                                        .replace("${oldMember.user.username}", &username)
                                        + "\n");
                                }
                                if !added.is_empty() {
                                    desc += &text("event_srvLogs_guildMemberUpdate_2_description")
                                        .replace(
                                            "${firstEntry.executor.id}",
                                            &entry.user_id.get().to_string(),
                                        )
                                        .replace(
                                            "${addedRoles}",
                                            &added
                                                .iter()
                                                .map(|id| format!("<@&{id}>"))
                                                .collect::<Vec<_>>()
                                                .join(","),
                                        )
                                        .replace("${oldMember.user.username}", &username);
                                }
                                let embed = serenity::CreateEmbed::default()
                                    .colour(0x010101_u32)
                                    .author(
                                        serenity::CreateEmbedAuthor::new(username).icon_url(avatar),
                                    )
                                    .description(desc)
                                    .timestamp(serenity::Timestamp::now());
                                let _ = serenity::ChannelId::new(logs_ch)
                                    .send_message(
                                        &ctx.http,
                                        serenity::CreateMessage::new().embed(embed),
                                    )
                                    .await;
                            }
                        }
                    }
                }
            }
        }
        // Boost detection (mirrors logs/boostLogs.ts): #a27cec
        // embed with author avatar, add + sub cases, 10-minute
        // recency guard on fresh boosts.
        let (old_premium, new_premium) = (old.premium_since, new.premium_since);
        if old_premium != new_premium {
            let gid = new.guild_id.get().to_string();
            let logs_ch: Option<u64> =
                crate::commands::guildconfig::setlogschannel::load_log_channel_routed(
                    &self.pool, &gid, "boosts",
                )
                .await
                .and_then(|s| s.parse().ok());
            if let Some(logs_ch) = logs_ch {
                let now_ms = crate::commands::context::now_ms();
                let recent = new_premium
                    .map(|t| now_ms - t.unix_timestamp() * 1000 <= 10 * 60 * 1000)
                    .unwrap_or(false);
                let lang_code = crate::db::guild_lang(&self.pool, Some(new.guild_id.get())).await;
                let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                let boost_count = new
                    .guild_id
                    .to_partial_guild(&ctx.http)
                    .await
                    .map(|g| g.premium_subscription_count.unwrap_or(0).to_string())
                    .unwrap_or_default();
                let desc = if old_premium.is_none() && new_premium.is_some() && recent {
                    Some(
                        text("event_boostlog_add")
                            .replace("${newMember.user.id}", &new.user.id.get().to_string())
                            .replace("${newMember.guild.premiumSubscriptionCount}", &boost_count),
                    )
                } else if old_premium.is_some() && new_premium.is_none() {
                    Some(
                        text("event_boostlog_sub")
                            .replace("${newMember.user.id}", &new.user.id.get().to_string())
                            .replace("${newMember.guild.premiumSubscriptionCount}", &boost_count),
                    )
                } else {
                    None
                };
                if let Some(desc) = desc {
                    let mut avatar = new.user.avatar_url().unwrap_or_default();
                    if avatar.is_empty() {
                        if let Ok(full) = new.user.id.to_user(&ctx.http).await {
                            avatar = full.avatar_url().unwrap_or_default();
                        }
                    }
                    let embed = serenity::CreateEmbed::default()
                        .colour(0xA27CEC_u32)
                        .author(
                            serenity::CreateEmbedAuthor::new(new.user.name.clone())
                                .icon_url(avatar),
                        )
                        .description(desc)
                        .timestamp(serenity::Timestamp::now());
                    let _ = serenity::ChannelId::new(logs_ch)
                        .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                        .await;
                }
            }
        }
        // Nickname history (mirrors prevnamesModuleGuild.ts): when the
        // nickname changes, record the previous one with a date stamp.
        // The previous nick resolves cache-first like TS
        // (`cachedGuildNicks?.get(guildId) ?? oldMember.nickname`) via
        // the retained `self.nicks` map (usersNicknamesMap-style), which
        // is then refreshed with the new nick like the TS trailing set.
        // A missing `old` returns earlier (TS oldMember is non-optional),
        // so with neither source known nothing is stored — never the new
        // nick itself.
        let previous: Option<String> = self
            .nicks
            .lock()
            .await
            .get(&new.user.id.get())
            .and_then(|guilds| guilds.get(&new.guild_id.get()).cloned())
            .unwrap_or_else(|| old.nick.clone());
        if previous != new.nick {
            // Refresh the retained map (mirrors the trailing
            // `guildNicknames.set(guildId, newNickname)`).
            self.nicks
                .lock()
                .await
                .entry(new.user.id.get())
                .or_default()
                .insert(new.guild_id.get(), new.nick.clone());
            if let Some(previous) = previous {
                if !previous.is_empty() {
                    let guild_name = new
                        .guild_id
                        .to_partial_guild(&ctx.http)
                        .await
                        .map(|g| g.name)
                        .unwrap_or_default();
                    let entry = format!(
                        "<t:{}:d> - [nickname:{}] {}",
                        crate::commands::context::now_ms() / 1000,
                        guild_name,
                        previous
                    );
                    let key = crate::events::prevnames_key(new.user.id.get());
                    let history: Vec<String> =
                        prevnames_routed(&self.pool, new.user.id.get()).await;
                    let next =
                        crate::events::push_prevname(history, &entry, crate::events::PREVNAMES_CAP);
                    let _ = crate::db::tbl_set(
                        &self.pool,
                        "0",
                        &key,
                        &serde_json::to_string(&next).unwrap_or_default(),
                    )
                    .await;
                }
            }
        }
        // Nickname-role rules (mirrors !setmentionrole.ts enforcement).
        let nick = new
            .nick
            .clone()
            .unwrap_or_else(|| new.user.name.clone())
            .to_ascii_lowercase();
        if let Some(raw) = rank_nicknames_routed(&self.pool, &new.guild_id.get().to_string()).await
        {
            if let Ok(map) = serde_json::from_str::<std::collections::HashMap<String, String>>(&raw)
            {
                for (part, role_id) in map {
                    if nick.contains(&part.to_ascii_lowercase()) {
                        if let Ok(rid) = role_id.parse::<u64>() {
                            if let Ok(member) = new.guild_id.member(&ctx.http, new.user.id).await {
                                let _ =
                                    member.add_role(&ctx.http, serenity::RoleId::new(rid)).await;
                            }
                        }
                    }
                }
            }
        }
    }

    async fn invite_create(&self, _ctx: serenity::Context, creation: serenity::InviteCreateEvent) {
        // Mirrors invitemanager/onInviteCreate.ts: cache uses by code.
        let Some(guild_id) = creation.guild_id else {
            return;
        };
        let gid = guild_id.get().to_string();
        let inviter_id = creation.inviter.as_ref().map(|u| u.id.get()).unwrap_or(0);
        {
            let mut cache = self.invites.lock().await;
            cache
                .entry(gid.clone())
                .or_default()
                .insert(creation.code.clone(), (creation.uses, inviter_id));
        }
        // Zero-row seed (mirrors the `if (!check)` leg in
        // onInviteCreate.ts: a fresh `USER.<inviter>.INVITES`
        // {regular: 0, bonus: 0, leaves: 0, invites: 0} row so later
        // increments read zeros, not missing). Existing rows are never
        // touched; skipped with no inviter.
        if inviter_id != 0 {
            let key = crate::commands::invitesmanager::inv::invites_key(inviter_id);
            if leaf_routed(&self.pool, &gid, &key).await.is_none() {
                let _ = crate::commands::invitesmanager::inv::save_invites(
                    &self.pool,
                    &gid,
                    inviter_id,
                    &crate::commands::invitesmanager::inv::InviteStats::default(),
                )
                .await;
            }
        }
    }

    async fn invite_delete(&self, _ctx: serenity::Context, deletion: serenity::InviteDeleteEvent) {
        // Mirrors invitemanager/onInviteDelete.ts: purge cache entry.
        let Some(guild_id) = deletion.guild_id else {
            return;
        };
        let mut cache = self.invites.lock().await;
        if let Some(guild) = cache.get_mut(&guild_id.get().to_string()) {
            guild.remove(&deletion.code);
        }
    }

    /// Support role sync (mirrors utils/supportModule.ts): grant or
    /// remove the configured role based on the user's bio/vanity
    /// (type "bio") or server tag (type "tag").
    /// TYPE VERDICT: TS `if (!someinfo.type) someinfo.type === "bio"`
    /// is a comparison, not an assignment — a missing or unknown type
    /// stays unmatched, so nothing is granted and an existing role is
    /// removed. The empty-kind fallthrough below mirrors that exactly.
    async fn presence_update(&self, ctx: serenity::Context, new_data: serenity::Presence) {
        let Some(guild_id) = new_data.guild_id else {
            return;
        };
        use serenity::model::user::OnlineStatus;
        // ManageRoles gate (mirrors the `members.me` permissions check
        // at the top of supportModule.ts).
        if !self.bot_can_manage_roles(&ctx, guild_id).await {
            return;
        }
        if matches!(
            new_data.status,
            OnlineStatus::Offline | OnlineStatus::Invisible
        ) {
            return;
        }
        let gid = guild_id.get().to_string();
        let Some(raw) = support_cfg_routed(&self.pool, &gid).await else {
            return;
        };
        let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) else {
            return;
        };
        let Some(role_str) = cfg.get("rolesId").and_then(|r| r.as_str()) else {
            return;
        };
        let Ok(role_id) = role_str.parse::<u64>() else {
            return;
        };
        let role_id = serenity::RoleId::new(role_id);
        // Hierarchy gate (mirrors `members.me.roles.highest.position <
        // fetchedRoles.rawPosition` → return): the bot cannot manage a
        // role at or above its own highest role. Cache snapshot, like
        // the TS `roles.cache` / `members.cache` reads; an unresolvable
        // target role or bot row fails closed.
        let dominated: bool = ctx
            .cache
            .guild(guild_id)
            .map(|g| {
                let bot_id = ctx.cache.current_user().id;
                let top: Option<u16> = g.members.get(&bot_id).map(|m| {
                    m.roles
                        .iter()
                        .filter_map(|r| g.roles.get(r))
                        .map(|r| r.position)
                        .max()
                        .unwrap_or(0)
                });
                let want: Option<u16> = g.roles.get(&role_id).map(|r| r.position);
                match (top, want) {
                    (Some(t), Some(w)) => t < w,
                    _ => true,
                }
            })
            .unwrap_or(true);
        if dominated {
            return;
        }
        let Ok(member) = guild_id.member(&ctx.http, new_data.user.id).await else {
            return;
        };
        let kind = cfg.get("type").and_then(|t| t.as_str()).unwrap_or("");
        let has = member.roles.contains(&role_id);
        // Early-out removals mirroring the TS guards.
        if kind == "bio"
            && new_data
                .activities
                .first()
                .and_then(|a| a.state.as_ref())
                .is_none()
        {
            if has {
                let _ = member.remove_role(&ctx.http, role_id).await;
            }
            return;
        }
        if kind == "tag" {
            let tagged = new_data
                .user
                .id
                .to_user(&ctx.http)
                .await
                .ok()
                .and_then(|u| u.primary_guild)
                .and_then(|p| p.identity_guild_id)
                == Some(guild_id);
            if !tagged {
                if has {
                    let _ = member.remove_role(&ctx.http, role_id).await;
                }
                return;
            }
        }
        let matched = if kind == "bio" {
            let state = new_data
                .activities
                .first()
                .and_then(|a| a.state.as_ref())
                .map(|s| s.to_lowercase())
                .unwrap_or_default();
            let input = cfg
                .get("input")
                .and_then(|i| i.as_str())
                .unwrap_or_default()
                .to_lowercase();
            let vanity = guild_id
                .to_partial_guild(&ctx.http)
                .await
                .ok()
                .and_then(|g| g.vanity_url_code)
                .unwrap_or_default()
                .to_lowercase();
            state.contains(&input) || (!vanity.is_empty() && state.contains(&vanity))
        } else if kind == "tag" {
            new_data
                .user
                .id
                .to_user(&ctx.http)
                .await
                .ok()
                .and_then(|u| u.primary_guild)
                .and_then(|p| p.identity_guild_id)
                == Some(guild_id)
        } else {
            false
        };
        if matched {
            if !has {
                let _ = member.add_role(&ctx.http, role_id).await;
            }
        } else if has {
            let _ = member.remove_role(&ctx.http, role_id).await;
        }
    }

    async fn ratelimit(&self, data: serenity::RatelimitInfo) {
        // Mirrors client/onRateLimit.ts `rateLimited` rich log.
        // Serenity's RatelimitInfo only carries path / method / limit /
        // timeout / global — the TS URL, scope, hash, major-parameter
        // and sublimit-timeout fields have no equivalent and are
        // omitted, never fabricated.
        tracing::error!(
            "Rate limit detected\nRoute: {}\nMethod: {:?}\nGlobal: {}\nLimit: {}\nTimeout: {}ms",
            data.path,
            data.method,
            data.global,
            data.limit,
            data.timeout.as_millis(),
        );
    }

    async fn interaction_create(&self, ctx: serenity::Context, interaction: serenity::Interaction) {
        // Autocomplete routing (mirrors slashCommandHandler.ts
        // isAutocomplete leg: the owning command answers). `commandlimit`
        // owns a poise autocomplete fn now, so the raw arm skips it
        // (poise answers; answering here too would double-ack). Other
        // commands get an empty choice list so the interaction is still
        // acknowledged.
        if let serenity::Interaction::Autocomplete(auto) = &interaction {
            if auto.data.name == "commandlimit" {
                return;
            }
            let focused = auto
                .data
                .options
                .iter()
                .find_map(|o| match &o.value {
                    serenity::CommandDataOptionValue::Autocomplete { value, .. }
                        if o.name == "command" =>
                    {
                        Some(value.clone())
                    }
                    _ => None,
                })
                .unwrap_or_default();
            let paths: Vec<String> = if auto.data.name == "commandlimit" {
                crate::commands::guildconfig::registered_paths()
            } else {
                Vec::new()
            };
            let choices = autocomplete_command_choices(&paths, &focused);
            let response = serenity::CreateAutocompleteResponse::new().set_choices(
                choices
                    .into_iter()
                    .map(|c| {
                        let choice: serenity::AutocompleteChoice = c.into();
                        choice
                    })
                    .collect(),
            );
            let _ = auto
                .create_response(
                    &ctx.http,
                    serenity::CreateInteractionResponse::Autocomplete(response),
                )
                .await;
            return;
        }
        // Mirrors Events/logs/slashCommandLogger.ts interactionCreate
        // (command rows go to src/files/slash.log.json).
        if let serenity::Interaction::Command(cmd) = &interaction {
            self.log_slash_command(&ctx, cmd).await;
            return;
        }
        // Global ModalSubmit arm: per-command modals are consumed by
        // their ModalInteractionCollectors on the shard (see
        // crate::commands::await_modal_submit), so the handler only
        // routes the variant here and never into the component arms
        // below. Existing arms above stay first.
        if let serenity::Interaction::Modal(_) = &interaction {
            return;
        }
        // Mirrors buttonHandler.ts routing for component custom_ids.
        let serenity::Interaction::Component(comp) = interaction else {
            return;
        };
        // Global ?dm-strip (mirrors buttonHandler.ts:30-37): DM-variant
        // buttons carry a `?dm` suffix; per-id arms below match the
        // clean id.
        let id = strip_dm_suffix(comp.data.custom_id.as_str());
        if id == "new-confession-button" {
            // Mirrors confession panel submit entry: modal -> cooldown gate
            // -> anonymous post (see handle_confess_button).
            let _ =
                crate::commands::confession::main::handle_confess_button(&ctx, &comp, &self.pool)
                    .await;
        } else if id.starts_with(crate::commands::confession::main::CONFESSIONRES_PREFIX) {
            let _ = crate::commands::confession::main::handle_confession_response(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id.starts_with("confession-author%") {
            let _ = crate::commands::confession::main::handle_confession_author(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id.starts_with(crate::commands::legacy::NEWSLETTER_TOGGLE_PREFIX) {
            let _ =
                crate::commands::legacy::handle_newsletter_toggle(&ctx, &comp, &self.pool).await;
        } else if id == crate::commands::giveaway::main::GW_ENTRY_ID {
            crate::commands::giveaway::main::handle_giveaway_entry(&ctx.http, &self.pool, &comp)
                .await;
        } else if id == crate::commands::giveaway::main::GW_LIST_ID {
            crate::commands::giveaway::main::handle_giveaway_list(&ctx.http, &self.pool, &comp)
                .await;
        } else if let Some(rest) = id.strip_prefix(crate::commands::giveaway::main::GW_LEAVE_ID) {
            // `giveaway-leave:<mid>` (stateless 60s-collector equivalent).
            if let Some(mid) = rest.strip_prefix(':').and_then(|s| s.parse::<u64>().ok()) {
                crate::commands::giveaway::main::handle_giveaway_leave(
                    &ctx.http, &self.pool, &comp, mid,
                )
                .await;
            }
        } else if let Some(rest) =
            id.strip_prefix(crate::commands::giveaway::main::GW_ENTRIES_PAGE_PREFIX)
        {
            // `gw-entries:<mid>:<page>`.
            let mut parts = rest.split(':');
            if let (Some(mid), Some(page)) = (parts.next(), parts.next()) {
                if let (Ok(mid), Ok(page)) = (mid.parse::<u64>(), page.parse::<usize>()) {
                    crate::commands::giveaway::main::handle_giveaway_entries_page(
                        &ctx.http, &self.pool, &comp, mid, page,
                    )
                    .await;
                }
            }
        } else if id == crate::commands::rolereactions::rolereaction::ROLESELECT_MAIN_ID {
            let _ = crate::commands::rolereactions::rolereaction::handle_roleselect_main(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if let Some(rest) = id
            .strip_prefix(crate::commands::rolereactions::rolereaction::ROLESELECT_ROLE_PICK_PREFIX)
        {
            let config_msg = rest.parse::<u64>().unwrap_or(0);
            let _ = crate::commands::rolereactions::rolereaction::handle_roleselect_role_pick(
                &ctx, &comp, &self.pool, config_msg,
            )
            .await;
        } else if id
            .starts_with(crate::commands::rolereactions::rolereaction::ROLESELECT_ROLES_PREFIX)
        {
            // Saved-select presses, like
            // SelectMenu/roleselect_roles.ts.
            let _ = crate::commands::rolereactions::rolereaction::handle_roleselect_grant(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id.starts_with("rolepanel:") {
            let _ = crate::commands::moderation::main::handle_rolepanel_button(&ctx, &comp).await;
        } else if let Some(role) =
            id.strip_prefix(crate::commands::rolereactions::rolereaction::BUTTON_REACTION_PREFIX)
        {
            // TS-verbatim role button presses (button_reaction%<role>).
            if let Ok(role_id) = role.parse::<u64>() {
                let _ = crate::commands::rolereactions::rolereaction::handle_button_reaction(
                    &ctx, &comp, &self.pool, role_id,
                )
                .await;
            }
        } else if id == crate::commands::honeypot::main::HONEYPOT_CUSTOM_ID {
            let _ = crate::commands::honeypot::main::handle_honeypot_claim(&ctx, &comp, &self.pool)
                .await;
        } else if id == crate::commands::honeypot::main::HONEYPOT_TRAP_SELECT_ID
            || id == crate::commands::honeypot::main::HONEYPOT_LOGS_SELECT_ID
            || id == crate::commands::honeypot::main::HONEYPOT_ACTION_SELECT_ID
            || id == crate::commands::honeypot::main::HONEYPOT_SEND_BUTTON_ID
            || id == crate::commands::honeypot::main::HONEYPOT_PREVIEW_BUTTON_ID
            || id == crate::commands::honeypot::main::HONEYPOT_TOGGLE_BUTTON_ID
        {
            // Honeypot config panel (stateless 240s-collector equivalent).
            crate::commands::honeypot::main::handle_panel_press(&ctx, &comp, &self.pool).await;
        } else if id == crate::commands::ticket::main::TICKET_EMBED_DELETE {
            let _ =
                crate::commands::ticket::main::handle_ticket_embed_delete(&ctx, &comp, &self.pool)
                    .await;
        } else if id == crate::commands::ticket::main::TICKET_EMBED_TRANSCRIPT {
            let _ = crate::commands::ticket::main::handle_ticket_embed_transcript(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id == crate::commands::ticket::main::TICKET_EMBED_SELECT_USER {
            let _ =
                crate::commands::ticket::main::handle_ticket_select_user(&ctx, &comp, &self.pool)
                    .await;
        } else if id.starts_with(crate::commands::ticket::main::TICKET_OPEN_CUSTOM_ID_PREFIX) {
            let _ =
                crate::commands::ticket::main::handle_ticket_open_button(&ctx, &comp, &self.pool)
                    .await;
        } else if id == crate::commands::ticket::main::LEGACY_OPEN_BUTTON_ID {
            // TS-verbatim panel button (CreateTicketChannel v1).
            let _ = crate::commands::ticket::main::handle_legacy_ticket_open(
                &ctx, &comp, &self.pool, None,
            )
            .await;
        } else if id == crate::commands::ticket::main::LEGACY_SELECT_ID {
            // TS-verbatim panel select (CreateTicketChannel v1).
            let selected = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned()
                }
                _ => None,
            };
            let _ = crate::commands::ticket::main::handle_legacy_ticket_open(
                &ctx, &comp, &self.pool, selected,
            )
            .await;
        } else if id == crate::commands::ticket::main::V2_SELECT_ID {
            // TS-verbatim V2 panel select (CreateTicketChannelV2).
            if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind
            {
                if let Some(selected) = values.first() {
                    let _ = crate::commands::ticket::main::handle_v2_ticket_open(
                        &ctx, &comp, &self.pool, selected,
                    )
                    .await;
                }
            }
        } else if id.starts_with(crate::commands::voicedashboard::main::TEMPVOICE_PREFIX) {
            let _ = crate::commands::voicedashboard::main::handle_tempvoice_button(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if let Some(action) = legacy_tempvoice_action(id) {
            // Legacy dashboard buttons (temporary_voice_*_button, from panels
            // posted by !set-text-channel.ts) predate the tempvoice: ids.
            // Rewrite onto the new handler so old panels keep working.
            let mut legacy = comp.clone();
            legacy.data.custom_id = format!(
                "{}{action}",
                crate::commands::voicedashboard::main::TEMPVOICE_PREFIX
            );
            let _ = crate::commands::voicedashboard::main::handle_tempvoice_button(
                &ctx, &legacy, &self.pool,
            )
            .await;
        } else if id == crate::commands::welcomer_panel::main::WELCOMER_SECTION_ID
            || id.starts_with(crate::commands::welcomer_panel::main::WELCOMER_PREFIX)
        {
            let _ = crate::commands::welcomer_panel::main::handle_welcomer_component(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id == crate::commands::embed::embed_builder::EMBED_SELECT_ID
            || id == crate::commands::embed::embed_builder::EMBED_SAVE_CHANNEL_ID
            || id.starts_with(crate::commands::embed::embed_builder::EMBED_BTN_PREFIX)
        {
            crate::commands::embed::embed_builder::handle_embed_component(
                &ctx.http, &self.pool, &comp,
            )
            .await;
        } else if id.starts_with(crate::commands::utils::ADMIN_ROLES_PREFIX) {
            crate::commands::utils::handle_admin_roles_component(&ctx.http, &self.pool, &comp)
                .await;
        } else if id == crate::commands::legacy::HELPALL_SELECT_ID {
            crate::commands::legacy::handle_helpall_select(&ctx.http, &self.pool, &comp).await;
        } else if id.starts_with(crate::commands::legacy::HELP_SELECT_PREFIX)
            || id.starts_with(crate::commands::legacy::HELP_PREV_ID)
            || id.starts_with(crate::commands::legacy::HELP_NEXT_ID)
        {
            crate::commands::legacy::handle_help_component(&ctx.http, &self.pool, &comp).await;
        } else {
            // Generic %-split fallback (mirrors buttonHandler.ts:38 /
            // selectMenuHandler.ts:35): unknown button/select ids
            // resolve by their prefix segment. Every TS component file
            // already has a dedicated arm above (including the verbatim
            // button_reaction% role buttons), so a miss here is a
            // no-op like the TS registry miss (`if (get)` guard).
            let prefix = component_prefix(id);
            tracing::debug!("ignoring unknown component id (prefix: {prefix})");
        }
    }
}

#[cfg(test)]
mod restore_tests {
    use super::*;
    use crate::commands::protection::backup::{build_backup, BackupRole, RawChannel};
    use poise::serenity_prelude::ChannelType;

    fn raw(
        id: &str,
        name: &str,
        kind: ChannelType,
        position: u16,
        parent: Option<&str>,
    ) -> RawChannel {
        RawChannel {
            id: id.to_string(),
            name: name.to_string(),
            kind,
            position,
            permissions: Vec::new(),
            parent: parent.map(str::to_string),
        }
    }

    fn sample() -> crate::commands::protection::backup::GuildBackup {
        build_backup(
            &[
                raw("cat1", "lobby", ChannelType::Category, 0, None),
                raw("ch1", "general", ChannelType::Text, 1, Some("cat1")),
                raw("ch2", "top", ChannelType::Text, 0, None),
            ],
            vec![BackupRole {
                id: "r1".to_string(),
                members: vec!["u1".to_string(), "u2".to_string()],
            }],
        )
    }

    #[test]
    fn restore_slot_dedups_concurrent_claims() {
        let mut running = HashSet::new();
        assert!(restore_slot_claim(&mut running, "g1"));
        // Second claim while running is rejected.
        assert!(!restore_slot_claim(&mut running, "g1"));
        // Other guilds are unaffected.
        assert!(restore_slot_claim(&mut running, "g2"));
        restore_slot_release(&mut running, "g1");
        assert!(restore_slot_claim(&mut running, "g1"));
        // Releasing an absent guild is a no-op.
        restore_slot_release(&mut running, "missing");
        assert!(!restore_slot_claim(&mut running, "g1"));
    }

    #[test]
    fn channel_lookup_finds_top_level_and_nested() {
        let b = sample();
        let top = backup_channel_for(&b, "ch2").expect("top-level channel");
        assert_eq!(top.name, "top");
        assert_eq!(top.parent, None);
        let nested = backup_channel_for(&b, "ch1").expect("nested channel");
        assert_eq!(nested.name, "general");
        assert_eq!(nested.parent.as_deref(), Some("cat1"));
        assert_eq!(nested.position, 1);
    }

    #[test]
    fn category_lookup_finds_snapshot_entry() {
        let b = sample();
        let cat = backup_category_for(&b, "cat1").expect("category");
        assert_eq!(cat.name, "lobby");
        assert_eq!(cat.channels.len(), 1);
        assert_eq!(cat.channels[0].id, "ch1");
    }

    #[test]
    fn unknown_ids_yield_no_restore() {
        let b = sample();
        assert!(backup_channel_for(&b, "nope").is_none());
        assert!(backup_category_for(&b, "nope").is_none());
        // A category id is not a channel entry and vice versa.
        assert!(backup_channel_for(&b, "cat1").is_none());
        assert!(backup_category_for(&b, "ch1").is_none());
    }

    #[test]
    fn role_revert_gate_fires_on_snapshot_drift() {
        let mut old: serenity::Role = Default::default();
        old.name = "mods".to_string();
        let same = old.clone();
        assert!(!role_revert_needed(&old, &same));
        // Each TS {...oldRole} field trips the gate.
        let mut renamed = old.clone();
        renamed.name = "hacked".to_string();
        assert!(role_revert_needed(&old, &renamed));
        let mut permed = old.clone();
        permed.permissions = serenity::Permissions::ADMINISTRATOR;
        assert!(role_revert_needed(&old, &permed));
        let mut hoisted = old.clone();
        hoisted.hoist = !old.hoist;
        assert!(role_revert_needed(&old, &hoisted));
        let mut mention = old.clone();
        mention.mentionable = !old.mentionable;
        assert!(role_revert_needed(&old, &mention));
        let mut emoji = old.clone();
        emoji.unicode_emoji = Some("🔥".to_string());
        assert!(role_revert_needed(&old, &emoji));
    }

    #[test]
    fn channel_revert_gate_covers_ts_edit_options() {
        let mut old: serenity::GuildChannel = Default::default();
        old.name = "general".to_string();
        let same = old.clone();
        assert!(!channel_revert_needed(&old, &same));
        // Every TS editOptions field trips the gate.
        let mut renamed = old.clone();
        renamed.name = "hacked".to_string();
        assert!(channel_revert_needed(&old, &renamed));
        let mut moved_parent = old.clone();
        moved_parent.parent_id = Some(serenity::ChannelId::new(9));
        assert!(channel_revert_needed(&old, &moved_parent));
        let mut moved_pos = old.clone();
        moved_pos.position += 1;
        assert!(channel_revert_needed(&old, &moved_pos));
        let mut topic = old.clone();
        topic.topic = Some("new topic".to_string());
        assert!(channel_revert_needed(&old, &topic));
        let mut nsfw = old.clone();
        nsfw.nsfw = !old.nsfw;
        assert!(channel_revert_needed(&old, &nsfw));
        let mut slowmode = old.clone();
        slowmode.rate_limit_per_user = Some(10);
        assert!(channel_revert_needed(&old, &slowmode));
        let mut bitrate = old.clone();
        bitrate.bitrate = Some(64000);
        assert!(channel_revert_needed(&old, &bitrate));
        let mut limit = old.clone();
        limit.user_limit = Some(5);
        assert!(channel_revert_needed(&old, &limit));
        let mut region = old.clone();
        region.rtc_region = Some("rotterdam".to_string());
        assert!(channel_revert_needed(&old, &region));
    }

    #[test]
    fn guild_icon_url_picks_ext_from_animation() {
        use std::str::FromStr;
        let still = serenity::ImageHash::from_str("abc123def456abc123def456abc12345").unwrap();
        assert!(!still.is_animated());
        assert_eq!(
            guild_icon_cdn_url(7, &still),
            "https://cdn.discordapp.com/icons/7/abc123def456abc123def456abc12345.png"
        );
        let animated = serenity::ImageHash::from_str("a_abc123def456abc123def456abc12345").unwrap();
        assert!(animated.is_animated());
        assert_eq!(
            guild_icon_cdn_url(7, &animated),
            "https://cdn.discordapp.com/icons/7/a_abc123def456abc123def456abc12345.gif"
        );
    }

    #[test]
    fn role_member_source_pins_readd_list() {
        let b = sample();
        assert_eq!(
            crate::commands::protection::backup::role_members(&b, "r1"),
            &["u1".to_string(), "u2".to_string()]
        );
        assert!(crate::commands::protection::backup::role_members(&b, "unknown").is_empty());
    }

    #[test]
    fn wipe_queue_enqueue_sets_ten_hour_deadline() {
        let mut q = HashMap::new();
        let delete_at = wipe_queue_enqueue(&mut q, "g1", "Guild", "o1", 1_000);
        assert_eq!(delete_at, 1_000 + GUILD_WIPE_DELAY_MS);
        assert_eq!(q["g1"].delete_at, delete_at);
        assert_eq!(q["g1"].guild_name, "Guild");
        // A second leave refreshes the deadline instead of duplicating.
        let later = wipe_queue_enqueue(&mut q, "g1", "Guild", "o1", 2_000);
        assert_eq!(later, 2_000 + GUILD_WIPE_DELAY_MS);
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn wipe_queue_cancel_removes_pending_only() {
        let mut q = HashMap::new();
        wipe_queue_enqueue(&mut q, "g1", "Guild", "o1", 0);
        wipe_queue_enqueue(&mut q, "g2", "Other", "o2", 0);
        assert!(wipe_queue_cancel(&mut q, "g1"));
        // Cancelling twice reports nothing left to cancel.
        assert!(!wipe_queue_cancel(&mut q, "g1"));
        // Other guilds are unaffected.
        assert!(q.contains_key("g2"));
        assert!(!wipe_queue_cancel(&mut q, "missing"));
    }

    #[test]
    fn wipe_queue_due_fires_only_when_expired_and_absent() {
        let mut q = HashMap::new();
        wipe_queue_enqueue(&mut q, "gone", "Gone", "o1", 0);
        wipe_queue_enqueue(&mut q, "fresh", "Fresh", "o2", 0);
        wipe_queue_enqueue(&mut q, "back", "Back", "o3", 0);
        let deadline = GUILD_WIPE_DELAY_MS;
        // Before the deadline nothing is due (ready recovery keeps all).
        let empty = HashSet::new();
        assert!(wipe_queue_due(&q, deadline - 1, &empty).is_empty());
        // At the deadline the absent guild is due...
        let mut due = wipe_queue_due(&q, deadline, &HashSet::from(["back".to_string()]));
        due.sort();
        assert_eq!(due, vec!["fresh".to_string(), "gone".to_string()]);
        // ...but a rejoined guild present in cache is spared.
        let present: HashSet<String> =
            HashSet::from(["back".to_string(), "fresh".to_string(), "gone".to_string()]);
        assert!(wipe_queue_due(&q, deadline, &present).is_empty());
    }

    #[test]
    fn leash_expiry_prunes_at_thirty_minutes() {
        assert!(leash_valid(1_000, 1_000 + LEASH_EXPIRY_MS));
        assert!(!leash_valid(1_000, 1_000 + LEASH_EXPIRY_MS + 1));
        assert_eq!(LEASH_EXPIRY_MS, 30 * 60 * 1000);
    }

    #[test]
    fn leash_sub_csv_splits_and_matches() {
        assert_eq!(leash_sub_ids("1, 2,,3 "), vec!["1", "2", "3"]);
        assert!(leash_sub_ids("").is_empty());
        let entry = LeashEntry {
            dom: "9".to_string(),
            sub: "1,2".to_string(),
            timestamp: 0,
        };
        // Whole-string filter like TS (`x.sub === id || x.dom === id`):
        // the dom matches, a multi-id CSV sub does NOT match any single
        // part, outsiders do not match.
        assert!(leash_entry_matches(&entry, "9"));
        assert!(!leash_entry_matches(&entry, "1"));
        assert!(!leash_entry_matches(&entry, "2"));
        assert!(!leash_entry_matches(&entry, "12"));
        assert!(!leash_entry_matches(&entry, "7"));
        let single = LeashEntry {
            dom: "9".to_string(),
            sub: "1".to_string(),
            timestamp: 0,
        };
        assert!(leash_entry_matches(&single, "1"));
        // Direction: dom move drags subs, sub move pulls back.
        assert!(leash_is_dom(&entry, "9"));
        assert!(!leash_is_dom(&entry, "1"));
    }

    #[test]
    fn leash_entries_round_trip_ts_shape() {
        // Mirrors DatabaseStructure.LeashData ({dom, sub, timestamp}).
        let entry = LeashEntry {
            dom: "9".to_string(),
            sub: "1".to_string(),
            timestamp: 42,
        };
        let raw = serde_json::to_string(&vec![entry.clone()]).unwrap();
        let back: Vec<LeashEntry> = serde_json::from_str(&raw).unwrap();
        assert_eq!(back, vec![entry]);
    }

    #[test]
    fn temp_creation_key_and_lock_dedup() {
        assert_eq!(temp_creation_key("g", "u"), "g.u");
        // The pending set reuses the restore slot claim/release.
        let mut pending = HashSet::new();
        let key = temp_creation_key("g", "u");
        assert!(restore_slot_claim(&mut pending, &key));
        assert!(!restore_slot_claim(&mut pending, &key));
        restore_slot_release(&mut pending, &key);
        assert!(restore_slot_claim(&mut pending, &key));
    }

    #[test]
    fn bot_ping_gate_is_exact_mention_only() {
        assert!(is_bot_ping("<@123>", 123));
        assert!(!is_bot_ping("<@123> ", 123));
        assert!(!is_bot_ping("<@!123>", 123));
        assert!(!is_bot_ping("<@124>", 123));
        assert!(!is_bot_ping("hello <@123>", 123));
        assert!(!is_bot_ping("", 123));
    }

    #[test]
    fn ping_bot_info_cooldown_is_7s_per_user() {
        // First sight sends (window recorded), immediate re-ping skips,
        // post-window sends again; other users are unaffected.
        assert!(ping_bot_cooldown_ok(424_242, 1_000_000));
        assert!(!ping_bot_cooldown_ok(424_242, 1_000_001));
        assert!(!ping_bot_cooldown_ok(424_242, 1_006_999));
        assert!(ping_bot_cooldown_ok(424_242, 1_007_000));
        assert!(ping_bot_cooldown_ok(777, 1_000_001));
    }

    #[test]
    fn leave_vanity_formats_like_ts() {
        assert_eq!(leave_embed_vanity(Some("abc")), "discord.gg/abc");
        assert_eq!(leave_embed_vanity(None), "None");
        assert_eq!(leave_embed_vanity(Some("")), "None");
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn emitter_leaf_loaders_route_table_first() {
        let pool = memory_pool().await;
        // GUILD_CONFIG leaf + blob.
        crate::db::tbl_set(&pool, "g1", "GUILD.GUILD_CONFIG.antipub", "off")
            .await
            .unwrap();
        assert_eq!(
            guild_config_field_routed(&pool, "g1", "antipub")
                .await
                .as_deref(),
            Some("off")
        );
        crate::commands::guildconfig::welcomer::save_guild_config_routed(
            &pool,
            "g1",
            &serde_json::json!({"join": "7"}),
        )
        .await
        .unwrap();
        assert_eq!(
            guild_config_routed(&pool, "g1")
                .await
                .get("join")
                .and_then(|v| v.as_str()),
            Some("7")
        );
        // Legacy-only rows still read through the leaf.
        crate::db::kv_set(&pool, "g1", "GUILD.GUILD_CONFIG.hey_reaction", "false")
            .await
            .unwrap();
        assert_eq!(
            guild_config_field_routed(&pool, "g1", "hey_reaction")
                .await
                .as_deref(),
            Some("false")
        );
        // RANK_ROLES single + nicknames.
        crate::db::tbl_set(&pool, "g1", "GUILD.RANK_ROLES.roles", "99")
            .await
            .unwrap();
        crate::db::tbl_set(&pool, "g1", "GUILD.RANK_ROLES.nicknames", "vip")
            .await
            .unwrap();
        assert_eq!(
            rank_role_single_routed(&pool, "g1").await.as_deref(),
            Some("99")
        );
        assert_eq!(
            rank_nicknames_routed(&pool, "g1").await.as_deref(),
            Some("vip")
        );
        // RANKS xp channels + message.
        crate::db::tbl_set(&pool, "g1", "GUILD.RANKS.xpChannels", "[\"5\"]")
            .await
            .unwrap();
        crate::db::tbl_set(&pool, "g1", "GUILD.RANKS.message", "gg {user}")
            .await
            .unwrap();
        assert_eq!(
            ranks_xp_channels_routed(&pool, "g1").await,
            vec!["5".to_string()]
        );
        assert_eq!(
            ranks_message_routed(&pool, "g1").await.as_deref(),
            Some("gg {user}")
        );
        assert!(ranks_xp_channels_routed(&pool, "g9").await.is_empty());
        // COUNTER leaves.
        crate::db::tbl_set(&pool, "g1", "COUNTER.channel", "11")
            .await
            .unwrap();
        crate::db::tbl_set(&pool, "g1", "COUNTER.config", "off")
            .await
            .unwrap();
        crate::db::tbl_set(&pool, "g1", "COUNTER_DATA", "{\"amount\":3}")
            .await
            .unwrap();
        assert_eq!(
            counter_channel_routed(&pool, "g1").await.as_deref(),
            Some("11")
        );
        assert_eq!(
            counter_config_routed(&pool, "g1").await.as_deref(),
            Some("off")
        );
        assert!(counter_data_routed(&pool, "g1").await.is_some());
        // SUGGEST leaves.
        crate::commands::suggestion::save_suggest_string(&pool, "g1", "SUGGEST.channel", "12")
            .await
            .unwrap();
        crate::commands::suggestion::save_suggest_string(&pool, "g1", "SUGGEST.disable", "1")
            .await
            .unwrap();
        assert_eq!(
            suggest_channel_routed(&pool, "g1").await.as_deref(),
            Some("12")
        );
        assert!(suggest_disabled_routed(&pool, "g1").await);
        assert!(!suggest_disabled_routed(&pool, "g9").await);
        // VOICE_INTERFACE leaves.
        crate::db::tbl_set(&pool, "g1", "GUILD.VOICE_INTERFACE.voice_channel", "13")
            .await
            .unwrap();
        crate::db::tbl_set(
            &pool,
            "g1",
            "VOICE_INTERFACE.voice_channel_name",
            "{user} room",
        )
        .await
        .unwrap();
        assert_eq!(voice_lobby_routed(&pool, "g1").await.as_deref(), Some("13"));
        assert_eq!(
            voice_name_tpl_routed(&pool, "g1").await.as_deref(),
            Some("{user} room")
        );
        assert!(voice_name_tpl_routed(&pool, "g9").await.is_none());
        // CUSTOM_VOICE rows (table + legacy merge, dotted only).
        crate::db::tbl_set(&pool, "g1", "CUSTOM_VOICE.g1.5", "111")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g1", "CUSTOM_VOICE.g1.7", "222")
            .await
            .unwrap();
        let rows = custom_voice_rows_routed(&pool, "g1").await;
        let keys: Vec<&str> = rows.iter().map(|(k, _)| k.as_str()).collect();
        assert!(keys.contains(&"CUSTOM_VOICE.g1.5"));
        assert!(keys.contains(&"CUSTOM_VOICE.g1.7"));
        // Protection / owner / allowlist leaves.
        // Legacy {allow:false} rows are open (member), mirroring the TS === mode gate.
        crate::db::tbl_set(&pool, "g1", "PROTECTION.createrole", "{\"allow\":false}")
            .await
            .unwrap();
        assert!(protection_rule_routed(&pool, "g1", "createrole")
            .await
            .map(|r| r.effective_mode() == "member")
            .unwrap_or(false));
        assert!(protection_rule_routed(&pool, "g1", "nope").await.is_none());
        crate::db::tbl_set(&pool, "g1", "PROTECTION.SANCTION", "kick")
            .await
            .unwrap();
        assert_eq!(
            protection_sanction_routed(&pool, "g1").await.as_deref(),
            Some("kick")
        );
        crate::db::tbl_set(&pool, "g1", "GUILD.OWNER.8", "1")
            .await
            .unwrap();
        assert_eq!(
            owner_entry_routed(&pool, "g1", 8).await.as_deref(),
            Some("1")
        );
        assert!(owner_entry_routed(&pool, "g1", 9).await.is_none());
        crate::db::tbl_set(&pool, "g1", "ALLOWLIST.list.8", "{\"allowed\":true}")
            .await
            .unwrap();
        assert!(allowlist_entry_routed(&pool, "g1", 8).await.is_some());
        assert!(allowlist_seeded_routed(&pool, "g1").await);
        assert!(!allowlist_seeded_routed(&pool, "g9").await);
        // Derogation leaf.
        crate::db::tbl_set(&pool, "g1", "GUILD.UTILS.DEROGATION", "[\"8\"]")
            .await
            .unwrap();
        assert!(derogated_routed(&pool, "g1", 8).await);
        assert!(!derogated_routed(&pool, "g1", 9).await);
        // Punish leaves.
        crate::db::tbl_set(
            &pool,
            "g1",
            "GUILD.PUNISH.PUNISH_PUB",
            "{\"state\":\"true\"}",
        )
        .await
        .unwrap();
        assert!(punish_pub_routed(&pool, "g1").await.is_some());
        assert!(punish_pub_routed(&pool, "g9").await.is_none());
        crate::db::tbl_set(&pool, "g1", "PUNISH_DATA.g1.8", "{\"flags\":2}")
            .await
            .unwrap();
        assert_eq!(
            punish_data_routed(&pool, "g1", 8).await.as_deref(),
            Some("{\"flags\":2}")
        );
        assert!(punish_data_routed(&pool, "g1", 9).await.is_none());
        // Automod + lang leaves (legacy-only rows read through).
        crate::db::kv_set(&pool, "g1", "GUILD.AUTOMOD.spam", "1")
            .await
            .unwrap();
        assert!(automod_flag_routed(&pool, "g1", "spam").await);
        assert!(!automod_flag_routed(&pool, "g1", "links").await);
        crate::db::kv_set(&pool, "g1", "GUILD.LANG", "fr-FR")
            .await
            .unwrap();
        assert_eq!(
            guild_lang_routed(&pool, "g1").await.as_deref(),
            Some("fr-FR")
        );
        // Block gates.
        crate::db::tbl_set(&pool, "g1", "GUILD.BLOCK_BOT", "1")
            .await
            .unwrap();
        assert!(block_bot_routed(&pool, "g1").await);
        assert!(!block_bot_routed(&pool, "g9").await);
        crate::db::tbl_set(&pool, "g1", "GUILD.BLOCK_NEW_ACCOUNT", "{\"req\":7}")
            .await
            .unwrap();
        assert!(block_new_account_routed(&pool, "g1").await.is_some());
        // Nick kicker + vanity + rolesaver + security.
        crate::db::tbl_set(&pool, "g1", "UTILS.NICK_KICKER", "{\"enabled\":true}")
            .await
            .unwrap();
        assert!(nick_kicker_routed(&pool, "g1").await.is_some());
        crate::db::kv_set(&pool, "0", "api.VANITY", "{\"g1\":\"abc\"}")
            .await
            .unwrap();
        assert_eq!(
            vanity_table_routed(&pool)
                .await
                .and_then(|v| v.get("g1").cloned()),
            Some(serde_json::Value::String("abc".to_string()))
        );
        crate::db::tbl_set(&pool, "g1", "ROLE_SAVER.8", "[\"1\",\"2\"]")
            .await
            .unwrap();
        assert_eq!(
            rolesaver_row_routed(&pool, "g1", 8).await.as_deref(),
            Some("[\"1\",\"2\"]")
        );
        assert!(rolesaver_row_routed(&pool, "g1", 9).await.is_none());
        crate::db::tbl_set(&pool, "g1", "SECURITY", "{\"disable\":false}")
            .await
            .unwrap();
        assert!(security_cfg_routed(&pool, "g1").await.is_some());
        // Invites BY + tickets.
        crate::db::tbl_set(&pool, "g1", "USER.5.INVITES.BY", "8")
            .await
            .unwrap();
        assert_eq!(
            invites_by_routed(&pool, "g1", 5).await.as_deref(),
            Some("8")
        );
        crate::db::tbl_set(&pool, "g1", "TICKET_ALL.5.77", "open")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g1", "TICKET_ALL.5.78", "open")
            .await
            .unwrap();
        let urows = ticket_user_rows_routed(&pool, "g1", 5).await;
        assert!(urows.contains(&"TICKET_ALL.5.77".to_string()));
        assert!(urows.contains(&"TICKET_ALL.5.78".to_string()));
        assert!(!ticket_rows_routed(&pool, "g1").await.is_empty());
        // Utils leaves.
        crate::db::tbl_set(&pool, "g1", "UTILS.picOnly", "[\"11\"]")
            .await
            .unwrap();
        assert!(pic_only_routed(&pool, "g1").await.is_some());
        crate::db::tbl_set(&pool, "g1", "UTILS.autoFeur", "1")
            .await
            .unwrap();
        assert_eq!(autofeur_routed(&pool, "g1").await.as_deref(), Some("1"));
        crate::db::tbl_set(&pool, "g1", "UTILS.antiExe", "1")
            .await
            .unwrap();
        assert_eq!(antiexe_routed(&pool, "g1").await.as_deref(), Some("1"));
        crate::db::tbl_set(&pool, "g1", "GUILD.REACT_MSG.hello", "wave")
            .await
            .unwrap();
        assert!(react_msg_keys_routed(&pool, "g1")
            .await
            .contains(&"GUILD.REACT_MSG.hello".to_string()));
        assert!(react_msg_emoji_routed(&pool, "g1", "GUILD.REACT_MSG.hello")
            .await
            .is_some());
        crate::db::tbl_set(&pool, "g1", "UTILS.git_lines", "1")
            .await
            .unwrap();
        assert_eq!(git_lines_routed(&pool, "g1").await.as_deref(), Some("1"));
        // Antispam leaves.
        crate::db::tbl_set(&pool, "g1", "GUILD.ANTISPAM.BYPASS_ROLES", "[\"3\"]")
            .await
            .unwrap();
        assert_eq!(
            antispam_bypass_roles_routed(&pool, "g1").await,
            vec!["3".to_string()]
        );
        assert!(antispam_bypass_channels_routed(&pool, "g1")
            .await
            .is_empty());
        crate::db::tbl_set(&pool, "g1", "GUILD.ANTISPAM", "{\"enabled\":true}")
            .await
            .unwrap();
        assert!(antispam_cfg_routed(&pool, "g1")
            .await
            .map(|c| c.enabled)
            .unwrap_or(false));
        assert!(antispam_cfg_routed(&pool, "g9").await.is_none());
        // Voice / economy leaves.
        crate::db::tbl_set(&pool, "g1", "GUILD.H247", "99")
            .await
            .unwrap();
        assert_eq!(h247_routed(&pool, "g1").await.as_deref(), Some("99"));
        crate::db::tbl_set(&pool, "g1", "ECONOMY.buyableRoles", "[]")
            .await
            .unwrap();
        assert_eq!(buyable_roles_routed(&pool, "g1").await, "[]");
        assert!(buyable_roles_routed(&pool, "g9").await.is_empty());
        crate::db::tbl_set(&pool, "g1", "UTILS.LEASH", "[]")
            .await
            .unwrap();
        assert!(leash_routed(&pool, "g1").await.is_some());
        crate::db::tbl_set(&pool, "g1", "UTILS.VOICE_FREEZE", "[]")
            .await
            .unwrap();
        assert!(voice_freeze_routed(&pool, "g1").await.is_some());
        crate::db::tbl_set(&pool, "g1", "GUILD.TTS", "{\"voiceChannelId\":\"4\"}")
            .await
            .unwrap();
        assert!(tts_raw_routed(&pool, "g1").await.is_some());
        // Reaction roles + prevnames + role limit + support + bot profile.
        crate::db::tbl_set(&pool, "g1", "GUILD.REACTION_ROLES.10.thumbsup", "42")
            .await
            .unwrap();
        assert_eq!(
            reaction_role_routed(&pool, "g1", 10, "thumbsup").await,
            Some(42)
        );
        assert!(reaction_role_routed(&pool, "g1", 10, "nope")
            .await
            .is_none());
        crate::db::tbl_set(&pool, "0", "PREVNAMES.8", "[\"old\"]")
            .await
            .unwrap();
        assert_eq!(prevnames_routed(&pool, 8).await, vec!["old".to_string()]);
        assert!(prevnames_routed(&pool, 9).await.is_empty());
        crate::db::tbl_set(&pool, "g1", "GUILD.UTILS.ROLE_LIMIT.6", "3")
            .await
            .unwrap();
        assert_eq!(role_limit_routed(&pool, "g1", 6).await, Some(3));
        assert!(role_limit_routed(&pool, "g1", 7).await.is_none());
        crate::db::tbl_set(&pool, "g1", "GUILD.SUPPORT", "{\"rolesId\":\"5\"}")
            .await
            .unwrap();
        assert!(support_cfg_routed(&pool, "g1").await.is_some());
        crate::db::tbl_set(&pool, "g1", "BOT.botName", "TestBot")
            .await
            .unwrap();
        assert_eq!(
            bot_name_routed(&pool, "g1").await.as_deref(),
            Some("TestBot")
        );
        assert!(bot_pfp_routed(&pool, "g1").await.is_none());
    }

    #[test]
    fn events_fix4_pure_decisions() {
        // tooNewAccount counter (mirrors `|| 0` + maxJoin ban leg).
        assert_eq!(too_new_join_count(None), 0);
        assert_eq!(too_new_join_count(Some("3")), 3);
        assert_eq!(too_new_join_count(Some("nope")), 0);
        assert!(too_new_should_ban(4, Some(3)));
        assert!(!too_new_should_ban(3, Some(3)));
        assert!(!too_new_should_ban(99, None));
        assert!(!too_new_should_ban(99, Some(0)));
        // Pic-only allowlist (mirrors validMediaTypes, case-insensitive).
        assert!(pic_only_has_media(&[Some("image/png".to_string())]));
        assert!(pic_only_has_media(&[Some("IMAGE/JPEG".to_string())]));
        assert!(pic_only_has_media(&[Some("video/mp4".to_string())]));
        assert!(!pic_only_has_media(&[Some("text/plain".to_string())]));
        assert!(!pic_only_has_media(&[None]));
        assert!(!pic_only_has_media(&[]));
        assert!(!pic_only_has_media(&[Some(String::new())]));
        // Pic-only warn window (mirrors cleanOldWarnings, 10 minutes).
        assert_eq!(pic_only_recent_warns(&[1000, 2000], 2000).len(), 2);
        assert_eq!(
            pic_only_recent_warns(&[1], PICONLY_WARN_WINDOW_MS + 2),
            Vec::<i64>::new()
        );
        assert_eq!(
            pic_only_recent_warns(&[PICONLY_WARN_WINDOW_MS - 1, 0], PICONLY_WARN_WINDOW_MS),
            vec![PICONLY_WARN_WINDOW_MS - 1]
        );
        // Role-limit counter rename (mirrors `/\s*\[\d+\/\d+\]\s*$/`).
        assert_eq!(role_limit_counter_name("VIP", 3, 10), "VIP [3/10]");
        assert_eq!(role_limit_counter_name("VIP [1/10]", 3, 10), "VIP [3/10]");
        assert_eq!(role_limit_counter_name("VIP  [12/5]  ", 2, 5), "VIP [2/5]");
        assert_eq!(
            role_limit_counter_name("Best [EST] Team", 4, 9),
            "Best [EST] Team [4/9]"
        );
        // Voice talk/freeze bypass (bot/Admin/ManageChannels).
        assert!(voice_talk_bypass(true, false, false));
        assert!(voice_talk_bypass(false, true, false));
        assert!(voice_talk_bypass(false, false, true));
        assert!(!voice_talk_bypass(false, false, false));
        // Autocomplete filter (mirrors commandlimit.ts: includes ||
        // startsWith, first 25).
        let paths = vec![
            "commandlimit".to_string(),
            "play".to_string(),
            "player stop".to_string(),
        ];
        assert_eq!(autocomplete_command_choices(&paths, "").len(), 3);
        assert_eq!(
            autocomplete_command_choices(&paths, "play"),
            vec!["play".to_string(), "player stop".to_string()]
        );
        assert!(autocomplete_command_choices(&paths, "zzz").is_empty());
        let many: Vec<String> = (0..40).map(|i| format!("cmd{i}")).collect();
        assert_eq!(autocomplete_command_choices(&many, "cmd").len(), 25);
        // LastFM tracked-channel classification (attach/detach/no-op).
        assert_eq!(lastfm_tracked_change(Some(1), Some(7), 7), Some(true));
        assert_eq!(lastfm_tracked_change(Some(7), Some(1), 7), Some(false));
        assert_eq!(lastfm_tracked_change(Some(7), Some(7), 7), None);
        assert_eq!(lastfm_tracked_change(None, None, 7), None);
        assert_eq!(lastfm_tracked_change(Some(1), Some(2), 7), None);
    }

    #[test]
    fn ts_snipe_json_matches_ts_writer_shape() {
        // Plain content passes through; keys mirror snipeModule.ts.
        let raw = ts_snipe_json("hello", "bob", 123, "https://cdn/a.png", 1728500000000);
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(v.get("snipe").and_then(|s| s.as_str()), Some("hello"));
        assert_eq!(
            v.get("snipeUserInfoTag").and_then(|s| s.as_str()),
            Some("bob (123)")
        );
        assert_eq!(
            v.get("snipeUserInfoPp").and_then(|s| s.as_str()),
            Some("https://cdn/a.png")
        );
        assert_eq!(
            v.get("snipeTimestamp").and_then(|n| n.as_i64()),
            Some(1728500000000)
        );
        // maskLink behavior: any URL-ish input becomes `Hidden Link`.
        let masked = ts_snipe_json("see https://x.y", "bob", 123, "https://cdn/a.png", 1);
        let v: serde_json::Value = serde_json::from_str(&masked).unwrap();
        assert_eq!(v.get("snipe").and_then(|s| s.as_str()), Some("Hidden Link"));
    }

    #[tokio::test]
    async fn ts_snipe_writer_roundtrips_through_reader() {
        // E7 writer shape at GUILD.SNIPE.<channel> resolves first via the
        // snipe command reader (parse_ts_snipe).
        let pool = memory_pool().await;
        let raw = ts_snipe_json("hello", "bob", 123, "https://cdn/a.png", 1728500000000);
        save_snipe_routed(&pool, "g1", "GUILD.SNIPE.11", &raw)
            .await
            .unwrap();
        let stored = leaf_routed(&pool, "g1", "GUILD.SNIPE.11")
            .await
            .expect("TS snipe row must read back");
        let v: serde_json::Value = serde_json::from_str(&stored).unwrap();
        let snap = crate::commands::utils::info::snipe::parse_ts_snipe(&v)
            .expect("writer output must parse via the reader");
        assert_eq!(snap.content, "hello");
        assert_eq!(snap.author_tag, "bob (123)");
        assert_eq!(snap.avatar_url, "https://cdn/a.png");
        assert_eq!(snap.timestamp_ms, 1728500000000);
    }

    #[tokio::test]
    async fn emitter_blacklist_await_snipe_routed() {
        let pool = memory_pool().await;
        // Global blacklist via the named table (dual-write, keys unchanged).
        crate::commands::owner::main::bl_set(&pool, 8, "spam")
            .await
            .unwrap();
        assert_eq!(
            blacklist_reason_routed(&pool, 8).await.as_deref(),
            Some("spam")
        );
        assert!(blacklist_reason_routed(&pool, 9).await.is_none());
        // Legacy-only global row reads through and promotes.
        crate::db::kv_set(&pool, "0", "BLACKLIST.9", "legacy")
            .await
            .unwrap();
        assert_eq!(
            blacklist_reason_routed(&pool, 9).await.as_deref(),
            Some("legacy")
        );
        // Per-guild blacklist marker leaf.
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", "BLACKLIST.8", "1")
            .await
            .unwrap();
        assert_eq!(
            guild_blacklist_routed(&pool, "g1", 8).await.as_deref(),
            Some("1")
        );
        assert!(guild_blacklist_routed(&pool, "g1", 9).await.is_none());
        // Embed-builder await marker leaf (same key helper as the emitter).
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            &crate::commands::embed::embed_builder::await_key(8),
            "title",
        )
        .await
        .unwrap();
        assert_eq!(
            embed_await_routed(&pool, "g1", 8).await.as_deref(),
            Some("title")
        );
        assert!(embed_await_routed(&pool, "g1", 9).await.is_none());
        // SNIPE write path lands in both stores; the snipe command read
        // path (routed_get) and the emitter leaves agree.
        save_snipe_routed(&pool, "g1", "SNIPE.11", "{\"content\":\"hi\"}")
            .await
            .unwrap();
        save_snipe_routed(&pool, "g1", "SNIPE.last_deleted_id", "77")
            .await
            .unwrap();
        assert_eq!(
            snipe_snapshot_routed(&pool, "g1", 11).await.as_deref(),
            Some("{\"content\":\"hi\"}")
        );
        assert!(snipe_snapshot_routed(&pool, "g1", 12).await.is_none());
        assert_eq!(
            snipe_last_id_routed(&pool, "g1").await.as_deref(),
            Some("77")
        );
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "SNIPE.11").await;
        assert_eq!(legacy, Some("{\"content\":\"hi\"}".to_string()));
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        // Writes land in the guild table AND the legacy row (dual-store:
        // handler keys are co-owned with command modules).
        crate::db::tbl_set(&pool, "g1", "GUILD.SUPPORT", "on")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", "GUILD.SUPPORT")
                .await
                .as_deref(),
            Some("on")
        );
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "GUILD.SUPPORT").await;
        assert_eq!(legacy, Some("on".to_string()));
        // Legacy rows still read, table wins on conflicts.
        crate::db::kv_set(&pool, "g2", "GUILD.SUPPORT", "off")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g2", "GUILD.SUPPORT")
                .await
                .as_deref(),
            Some("off")
        );
        crate::db::tbl_set(&pool, "g2", "GUILD.SUPPORT", "on")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g2", "GUILD.SUPPORT")
                .await
                .as_deref(),
            Some("on")
        );
        // Dotted-leaf reads walk table blobs.
        crate::db::tbl_set(&pool, "g1", "GUILD.GUILD_CONFIG", "{\"antipub\":true}")
            .await
            .unwrap();
        assert_eq!(
            crate::db::tbl_get(&pool, "g1", "GUILD.GUILD_CONFIG.antipub")
                .await
                .as_deref(),
            Some("true")
        );
        // Prefix scans merge table rows with legacy rows.
        crate::db::kv_set(&pool, "g1", "CUSTOM_VOICE.1.2", "42")
            .await
            .unwrap();
        crate::db::tbl_set(&pool, "g1", "CUSTOM_VOICE.1.3", "43")
            .await
            .unwrap();
        let scan = crate::db::tbl_scan_prefix(&pool, "g1", "CUSTOM_VOICE.").await;
        let keys: Vec<&str> = scan.iter().map(|(k, _)| k.as_str()).collect();
        assert!(keys.contains(&"CUSTOM_VOICE.1.2"));
        assert!(keys.contains(&"CUSTOM_VOICE.1.3"));
        // Prefix deletes clear both stores.
        crate::db::tbl_del_prefix(&pool, "g1", "CUSTOM_VOICE.")
            .await
            .unwrap();
        assert!(crate::db::tbl_scan_prefix(&pool, "g1", "CUSTOM_VOICE.")
            .await
            .is_empty());
        // Single deletes clear both stores.
        crate::db::tbl_del(&pool, "g2", "GUILD.SUPPORT")
            .await
            .unwrap();
        assert!(crate::db::tbl_get(&pool, "g2", "GUILD.SUPPORT")
            .await
            .is_none());
    }
}

#[cfg(test)]
mod protection_audit_tests {
    use super::*;

    #[test]
    fn relevant_when_target_matches_and_fresh() {
        assert!(audit_entry_relevant(
            Some(10),
            7,
            99,
            1_000,
            1_000 + 5_000,
            Some(10)
        ));
    }

    #[test]
    fn irrelevant_on_target_mismatch_or_missing() {
        assert!(!audit_entry_relevant(
            Some(11),
            7,
            99,
            1_000,
            6_000,
            Some(10)
        ));
        assert!(!audit_entry_relevant(Some(10), 7, 99, 1_000, 6_000, None));
        assert!(!audit_entry_relevant(None, 7, 99, 1_000, 6_000, Some(10)));
    }

    #[test]
    fn irrelevant_when_executor_is_bot_or_missing() {
        assert!(!audit_entry_relevant(
            Some(10),
            99,
            99,
            1_000,
            6_000,
            Some(10)
        ));
        assert!(!audit_entry_relevant(
            Some(10),
            0,
            99,
            1_000,
            6_000,
            Some(10)
        ));
    }

    #[test]
    fn irrelevant_when_stale() {
        assert!(!audit_entry_relevant(
            Some(10),
            7,
            99,
            1_000,
            1_000 + AUDIT_LOG_WINDOW_MS + 1,
            Some(10)
        ));
        // Exactly at the window edge still counts.
        assert!(audit_entry_relevant(
            Some(10),
            7,
            99,
            1_000,
            1_000 + AUDIT_LOG_WINDOW_MS,
            Some(10)
        ));
    }
}

#[cfg(test)]
mod welcomer_tests {
    use super::*;

    #[test]
    fn welcomer_avatar_url_downscales_static_png() {
        // Custom avatar: size=256 static png even for animated hashes
        // (forceStatic), never the full-size webp/gif face() URL.
        let mut user = serenity::User::default();
        user.id = serenity::UserId::new(123);
        user.avatar = Some(
            "a_b2c3d4e5f60718293a4b5c6d7e8f9012"
                .parse()
                .expect("avatar hash"),
        );
        assert_eq!(
            welcomer_avatar_url(&user),
            "https://cdn.discordapp.com/avatars/123/a_b2c3d4e5f60718293a4b5c6d7e8f9012.png?size=256"
        );
        user.avatar = Some("b2c3d4e5f60718293a4b5c6d7e8f9012".parse().expect("hash"));
        assert_eq!(
            welcomer_avatar_url(&user),
            "https://cdn.discordapp.com/avatars/123/b2c3d4e5f60718293a4b5c6d7e8f9012.png?size=256"
        );
        // No avatar: default avatar URL, like displayAvatarURL.
        user.avatar = None;
        assert_eq!(welcomer_avatar_url(&user), user.default_avatar_url());
    }

    #[test]
    fn welcomer_accents_match_ts_constants() {
        assert_eq!(WELCOME_ACCENT, 0x57_F287);
        assert_eq!(GOODBYE_ACCENT, 0xED_4245);
        assert_eq!(WELCOME_AVATAR_NAME, "welcomer-avatar.png");
        assert_eq!(GOODBYE_AVATAR_NAME, "goodbye-avatar.png");
    }

    #[test]
    fn welcomer_render_with_snapshot_attaches_thumbnail_file() {
        let render = welcomer_render(
            "Welcome <@1>!",
            WELCOME_ACCENT,
            Some(vec![1, 2, 3]),
            WELCOME_AVATAR_NAME,
        );
        assert_eq!(render.files.len(), 1);
        let debug = format!("{:?}", render.embed);
        assert!(debug.contains("Welcome <@1>!"), "{debug}");
        assert!(
            debug.contains("attachment://welcomer-avatar.png"),
            "{debug}"
        );
    }

    #[test]
    fn welcomer_render_without_snapshot_sends_text_only() {
        let render = welcomer_render("Bye.", GOODBYE_ACCENT, None, GOODBYE_AVATAR_NAME);
        assert!(render.files.is_empty());
        let debug = format!("{:?}", render.embed);
        assert!(debug.contains("Bye."), "{debug}");
        assert!(!debug.contains("attachment://"), "{debug}");
    }
}

#[cfg(test)]
mod security_tests {
    use super::*;

    #[test]
    fn security_code_is_csprng_shaped_like_ts() {
        for _ in 0..16 {
            let c = security_code();
            assert_eq!(c.len(), 7);
            assert!(c.chars().all(|x| SECURITY_CODE_ALPHABET.contains(x)));
            assert!(!c.contains('J'));
        }
        let batch: std::collections::HashSet<String> = (0..16).map(|_| security_code()).collect();
        assert!(batch.len() > 1);
    }

    #[test]
    fn captcha_png_is_real_png() {
        let png = crate::cards::captcha_png("ABC123K");
        assert_eq!(&png[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]);
        assert!(!png.is_empty());
    }
}

#[cfg(test)]
mod antispam_tests {
    use super::*;

    fn cached(author: u64, sent_at: i64, spam: bool) -> CachedSpamMessage {
        CachedSpamMessage {
            message_id: 1,
            channel_id: 2,
            author_id: author,
            sent_at,
            is_spam: spam,
        }
    }

    fn open_gate() -> AntispamGate {
        AntispamGate {
            bot_admin: true,
            enabled: true,
            webhook: false,
            self_msg: false,
            owner: false,
            admin: false,
            bot_ignored: false,
            bypass: false,
        }
    }

    #[test]
    fn gate_passes_only_when_fully_clear() {
        assert!(!antispam_skipped(&open_gate()));
        for gate in [
            AntispamGate {
                bot_admin: false,
                ..open_gate()
            },
            AntispamGate {
                enabled: false,
                ..open_gate()
            },
            AntispamGate {
                webhook: true,
                ..open_gate()
            },
            AntispamGate {
                self_msg: true,
                ..open_gate()
            },
            AntispamGate {
                owner: true,
                ..open_gate()
            },
            AntispamGate {
                admin: true,
                ..open_gate()
            },
            AntispamGate {
                bot_ignored: true,
                ..open_gate()
            },
            AntispamGate {
                bypass: true,
                ..open_gate()
            },
        ] {
            assert!(antispam_skipped(&gate), "{gate:?}");
        }
    }

    #[test]
    fn purge_drops_only_expired_messages() {
        let now = 1_000_000;
        let mut msgs = vec![
            cached(1, now - ANTISPAM_TTL_MS, false),
            cached(2, now - ANTISPAM_TTL_MS - 1, false),
            cached(3, now, false),
        ];
        antispam_purge_old(&mut msgs, now);
        let authors: Vec<u64> = msgs.iter().map(|m| m.author_id).collect();
        assert_eq!(authors, vec![1, 3]);
    }

    #[test]
    fn prune_flags_keeps_only_active_authors() {
        let mut flags: HashMap<String, u32> = [
            ("7".to_string(), 2),
            ("8".to_string(), 1),
            ("bogus".to_string(), 9),
        ]
        .into_iter()
        .collect();
        antispam_prune_flags(&mut flags, &[cached(7, 0, false)]);
        assert_eq!(flags.len(), 1);
        assert_eq!(flags.get("7"), Some(&2));
    }

    #[test]
    fn elapsed_first_sight_never_trips_gap() {
        // No prior message: elapsed is maxInterval + 1, like TS.
        let elapsed = antispam_elapsed(&[], 9, 5000, 1900);
        assert_eq!(elapsed, Some(1901));
        assert!(!antispam_gap_tripped(elapsed, 1900));
        // Tight gap trips, wide gap does not.
        let msgs = vec![cached(9, 4000, false)];
        assert!(antispam_gap_tripped(
            antispam_elapsed(&msgs, 9, 5000, 1900),
            1900
        ));
        assert!(!antispam_gap_tripped(
            antispam_elapsed(&msgs, 9, 7000, 1900),
            1900
        ));
        assert!(!antispam_gap_tripped(None, 1900));
    }

    #[test]
    fn threshold_needs_positive_config_and_enough_flags() {
        assert!(antispam_threshold_tripped(3, 3));
        assert!(!antispam_threshold_tripped(2, 3));
        assert!(!antispam_threshold_tripped(99, 0));
    }

    #[test]
    fn chunks_match_bulk_delete_slices() {
        let ids: Vec<u64> = (0..32).collect();
        let parts = antispam_chunks(&ids, ANTISPAM_BULK_CHUNK);
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0].len(), 15);
        assert_eq!(parts[1].len(), 15);
        assert_eq!(parts[2].len(), 2);
        assert!(antispam_chunks::<u64>(&ids, 0).is_empty());
    }

    #[test]
    fn warn_text_fills_mentions_and_suffix() {
        let out = antispam_warn_text(
            "Warning ${mentionedMembers}, stop.",
            "You will be muted.",
            "<@1>, <@2>",
        );
        assert_eq!(out, "Warning <@1>, <@2>, stop.You will be muted.");
    }

    #[test]
    fn pipeline_constants_mirror_ts() {
        assert_eq!(ANTISPAM_DEBOUNCE_MS, 5000);
        assert_eq!(ANTISPAM_TTL_MS, 8 * 60 * 60 * 1000);
        assert_eq!(ANTISPAM_BULK_CHUNK, 15);
        assert_eq!(ANTISPAM_CHANNEL_BATCH, 3);
        assert_eq!(ANTISPAM_CHANNEL_BATCH_DELAY_MS, 100);
        assert_eq!(ANTISPAM_WARN_DELETE_SECS, 4);
    }
}

#[cfg(test)]
mod legacy_voice_tests {
    use super::*;

    #[test]
    fn legacy_buttons_map_to_tempvoice_actions() {
        let cases = [
            ("temporary_voice_limit_button", "limit"),
            ("temporary_voice_name_button", "name"),
            ("temporary_voice_claim_button", "claim"),
            ("temporary_voice_privacy_button", "privacy"),
            ("temporary_voice_region_button", "region"),
            ("temporary_voice_trust_button", "trust"),
            ("temporary_voice_block_button", "block"),
            ("temporary_voice_transfer_button", "transfer"),
            ("temporary_voice_unblock_button", "unblock"),
            ("temporary_voice_untrust_button", "untrust"),
            ("temporary_voice_delete_button", "delete"),
        ];
        assert_eq!(cases.len(), 11);
        for (legacy, action) in cases {
            assert_eq!(legacy_tempvoice_action(legacy), Some(action), "{legacy}");
            // Rewritten id lands on the tempvoice handler prefix.
            let rewritten = format!(
                "{}{action}",
                crate::commands::voicedashboard::main::TEMPVOICE_PREFIX
            );
            assert!(rewritten.starts_with(crate::commands::voicedashboard::main::TEMPVOICE_PREFIX));
        }
    }

    #[test]
    fn legacy_spacers_and_unknown_ids_map_to_none() {
        for id in [
            "temporary_voice_disable1_button",
            "temporary_voice_disable2_button",
            "temporary_voice_disable3_button",
            "temporary_voice_disable4_button",
            "tempvoice:limit",
            "",
        ] {
            assert_eq!(legacy_tempvoice_action(id), None, "{id}");
        }
    }

    #[test]
    fn staff_allow_covers_join_and_moderate_bits() {
        use poise::serenity_prelude::Permissions as P;
        let allow = staff_voice_allow();
        for p in [
            P::VIEW_CHANNEL,
            P::CONNECT,
            P::STREAM,
            P::SPEAK,
            P::SEND_MESSAGES,
            P::USE_APPLICATION_COMMANDS,
            P::ATTACH_FILES,
            P::ADD_REACTIONS,
            P::MUTE_MEMBERS,
            P::DEAFEN_MEMBERS,
            P::PRIORITY_SPEAKER,
            P::KICK_MEMBERS,
        ] {
            assert!(allow.contains(p), "{p:?}");
        }
        // Staff get rights, not an empty allow set.
        assert!(!allow.is_empty());
    }
}

#[cfg(test)]
mod component_registry_tests {
    use super::*;

    #[test]
    fn dm_suffix_strips_only_trailing_marker() {
        // Mirrors buttonHandler.ts:30-37 (slice(0, -3) on ?dm end).
        assert_eq!(
            strip_dm_suffix("newsletter-toggle%123?dm"),
            "newsletter-toggle%123"
        );
        assert_eq!(
            strip_dm_suffix("new-confession-button"),
            "new-confession-button"
        );
        assert_eq!(strip_dm_suffix(""), "");
        // A mid-string ?dm is not a DM variant marker.
        assert_eq!(strip_dm_suffix("?dmfoo"), "?dmfoo");
        assert_eq!(strip_dm_suffix("a?dmb"), "a?dmb");
    }

    #[test]
    fn prefix_segment_splits_on_first_percent() {
        // Mirrors buttonHandler.ts:38 / selectMenuHandler.ts:35.
        assert_eq!(
            component_prefix("newsletter-toggle%123"),
            "newsletter-toggle"
        );
        assert_eq!(component_prefix("button_reaction%456"), "button_reaction");
        assert_eq!(component_prefix("plain-id"), "plain-id");
        assert_eq!(component_prefix(""), "");
        // Registry key is the first segment even with several parts.
        assert_eq!(component_prefix("a%b%c"), "a");
    }

    #[test]
    fn dm_stripped_ids_still_hit_percent_arms() {
        // The global ?dm-strip runs before the per-id arms, so a DM
        // newsletter press keeps its % suffix for the prefix arm.
        let id = strip_dm_suffix("newsletter-toggle%123?dm");
        assert!(id.starts_with(crate::commands::legacy::NEWSLETTER_TOGGLE_PREFIX));
        assert_eq!(component_prefix(id), "newsletter-toggle");
    }

    #[test]
    fn discord_timestamp_mentions_use_style() {
        assert_eq!(discord_timestamp(1_700_000_000, 'F'), "<t:1700000000:F>");
        assert_eq!(discord_timestamp(1_700_000_000, 'R'), "<t:1700000000:R>");
        assert_eq!(discord_timestamp(0, 'F'), "<t:0:F>");
    }

    #[test]
    fn leave_notice_templates_fill_both_placeholders() {
        // Mirrors the TS replace chain: ${guild.name} everywhere,
        // ${deleteAt} as <t:F> in the embed, <t:R> in the DM content.
        let desc = render_leave_notice_text(
            "kicked from `${guild.name}`, cleared ${deleteAt}",
            "Test Guild",
            1_700_000_000,
            'F',
        );
        assert_eq!(desc, "kicked from `Test Guild`, cleared <t:1700000000:F>");
        let msg = render_leave_notice_text(
            "kicked from `${guild.name}`, cleared ${deleteAt}",
            "Test Guild",
            1_700_000_000,
            'R',
        );
        assert_eq!(msg, "kicked from `Test Guild`, cleared <t:1700000000:R>");
        // Title template carries no ${deleteAt}; only the name fills.
        let title = render_leave_notice_text("left ${guild.name}", "G", 0, 'F');
        assert_eq!(title, "left G");
    }

    #[test]
    fn cancel_templates_fill_guild_name_only() {
        assert_eq!(
            render_guild_name_text("back on ${guild.name}!", "Test Guild"),
            "back on Test Guild!"
        );
        assert_eq!(
            render_guild_name_text("no placeholders", "G"),
            "no placeholders"
        );
    }

    #[test]
    fn shard_label_matches_ts_shard_tag() {
        assert_eq!(shard_label(0), "#0");
        assert_eq!(shard_label(7), "#7");
    }

    #[test]
    fn invite_seed_gate_needs_both_bits() {
        // Ready-burst parity: ManageGuild + ViewAuditLog (discord.js
        // .has([A, B]) is an AND); owners bypass; a missing bit denies.
        assert!(invite_seed_allowed(true, false, false));
        assert!(invite_seed_allowed(false, true, true));
        assert!(!invite_seed_allowed(false, true, false));
        assert!(!invite_seed_allowed(false, false, true));
        assert!(!invite_seed_allowed(false, false, false));
    }
}
