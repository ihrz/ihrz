// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/moderation/* (mod.ts + 22 commands).
//
// Group root + shared state live here (warn store, temp-sanction keys,
// guard snapshots, warnMember helper, rolepanel id codec, lock-all driver).
// One file per TS command: ban (!ban.ts), kick (!kick.ts),
// tempmute (!tempmute.ts), tempban, temprole, clear, rolepanel, warnlist,
// baninfo, banlist, unmute, unmuteall, lock, unlock, lock-all, unlock-all,
// mutelist, unwarn, unban, warn, clearwarn, clear-all-warns.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Warn {
    pub id: String,
    pub reason: String,
    /// Warn creation time in ms. Serializes as `timestamp` like the TS
    /// `warnMember` row (`method.ts:1260-1275`); `at` stays a read alias
    /// for rows written by older Rust builds.
    #[serde(default, rename = "timestamp", alias = "at")]
    pub at: i64,
    /// Warning author (moderator) id. `None` for legacy rows written
    /// before the field existed. Serializes as `authorID` like TS;
    /// `author_id` stays a read alias for older Rust rows.
    #[serde(default, rename = "authorID", alias = "author_id")]
    pub author_id: Option<String>,
}

pub fn warns_key(user_id: u64) -> String {
    format!("USER.{user_id}.WARNS")
}

/// Temporary sanction entry. Mirrors tempRoleManager/tempbanManager rows
/// ({guild}.GUILD.TEMPROLE / GUILD.TEMPBAN with expiry timestamps).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TempEntry {
    pub expires_at_ms: i64,
}

pub fn temp_expired(entry: &TempEntry, now_ms: i64) -> bool {
    now_ms >= entry.expires_at_ms
}

/// Whether a member's timeout is currently active. Mirrors discord.js
/// `isCommunicationDisabled()` used in !mutelist.ts:55, !unmuteall.ts:62,
/// !tempmute.ts:162 and !unmute.ts:88: the expiry must lie in the future,
/// a merely present (already lapsed) `communicationDisabledUntil` does
/// not count. Pure for tests.
pub(crate) fn timeout_active(until: Option<serenity::Timestamp>, now_ms: i64) -> bool {
    until
        .map(|t| t.unix_timestamp() * 1000 > now_ms)
        .unwrap_or(false)
}

pub fn temprole_key(user_id: u64, role_id: u64) -> String {
    format!("GUILD.TEMPROLE.{user_id}.{role_id}")
}

pub fn tempban_key(user_id: u64) -> String {
    format!("GUILD.TEMPBAN.{user_id}")
}

pub fn push_warn(mut warns: Vec<Warn>, warn: Warn) -> Vec<Warn> {
    warns.push(warn);
    warns
}

pub fn remove_warn(mut warns: Vec<Warn>, id: &str) -> (Vec<Warn>, bool) {
    let before = warns.len();
    warns.retain(|w| w.id != id);
    let removed = warns.len() != before;
    (warns, removed)
}

/// Table-first warns load with legacy kv fallback (keys unchanged). A
/// legacy hit promotes into the table so rows migrate lazily; pair with
/// `save_warns` (dual-write) so kv-only readers stay fresh.
pub async fn load_warns(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Vec<Warn> {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, &warns_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first warns store with legacy kv dual-write (keys unchanged).
pub async fn save_warns(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    warns: &[Warn],
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        &warns_key(user_id),
        &serde_json::to_string(warns)?,
    )
    .await
}

/// Discord timeout cap: 28 days in ms. Mirrors !tempmute.ts `4weeks`.
pub const TIMEOUT_MAX_MS: i64 = 28 * 24 * 60 * 60 * 1000;
/// Temp sanction cap: 1 year in ms. Mirrors `to_ms("1year")`.
pub const YEAR_MAX_MS: i64 = 31_557_600_000;
/// Bulk delete age limit: 14 days in ms. Mirrors !clear.ts.
pub const BULK_DELETE_MAX_AGE_MS: i64 = 14 * 24 * 60 * 60 * 1000;
/// Plain-text list page size. Mirrors the TS `usersPerPage = 5`.
pub const LIST_PAGE_SIZE: usize = 5;

/// Clamp a (start, end, total_pages) window for plain-text pagination.
pub fn paginate(total: usize, per_page: usize, page: i64) -> (usize, usize, usize) {
    let pages = (total + per_page.saturating_sub(1)) / per_page.max(1);
    let pages = pages.max(1);
    let p = page.clamp(1, pages as i64) as usize;
    let start = (p - 1) * per_page;
    (start, start.saturating_add(per_page).min(total), pages)
}

/// App-emoji lookup with a plain fallback. Mirrors the TS
/// `${client.iHorizon_Emojis.X}` interpolations.
async fn emoji(ctx: &Ctx<'_>, name: &str, fallback: &str) -> String {
    crate::emojis::app_emoji_markup(&ctx.serenity_context().http, name)
        .await
        .unwrap_or_else(|| fallback.to_string())
}

/// Post a moderation audit embed to the `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs` via `crate::funcs::logs_channel_id`
/// (same helper the ticket module uses); silent when absent.
async fn post_mod_log(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    title: String,
    description: String,
) {
    let Ok(channels) = guild_id.channels(http).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(description);
    let _ = serenity::ChannelId::new(log_id)
        .send_message(http, serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Cached bot/author hierarchy snapshot for guard checks.
/// `None` when the guild is not cached (guards are skipped, never blocking).
struct Guard {
    bot_perms: serenity::Permissions,
    bot_top: u16,
    author_top: u16,
    owner_id: u64,
}

fn top_of(
    roles: &std::collections::HashMap<serenity::RoleId, serenity::Role>,
    ids: &[serenity::RoleId],
) -> u16 {
    ids.iter()
        .filter_map(|r| roles.get(r))
        .map(|r| r.position)
        .max()
        .unwrap_or(0)
}

async fn guard_data(ctx: &Ctx<'_>, guild_id: serenity::GuildId) -> Option<Guard> {
    // Clone out of the cache guard first: holding it across an await
    // would make the future !Send.
    let (bot_roles, roles, owner_id) = {
        let cache = &ctx.serenity_context().cache;
        let guild = cache.guild(guild_id)?;
        let bot = guild.members.get(&cache.current_user().id)?.clone();
        (bot.roles, guild.roles.clone(), guild.owner_id)
    };
    let author_roles = ctx
        .author_member()
        .await
        .map(|m| m.roles.clone())
        .unwrap_or_default();
    let everyone = serenity::RoleId::new(guild_id.get());
    let mut perms = serenity::Permissions::empty();
    for r in &bot_roles {
        if let Some(role) = roles.get(r) {
            perms |= role.permissions;
        }
    }
    if let Some(everyone_role) = roles.get(&everyone) {
        perms |= everyone_role.permissions;
    }
    if perms.administrator() {
        perms = serenity::Permissions::all();
    }
    Some(Guard {
        bot_perms: perms,
        bot_top: top_of(&roles, &bot_roles),
        author_top: top_of(&roles, &author_roles),
        owner_id: owner_id.get(),
    })
}

/// Target member's top role position, or `None` when not in the guild
/// (TS skips hierarchy checks for non-members too).
async fn target_top(
    ctx: &Ctx<'_>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
) -> Option<u16> {
    let roles = guild_id.member(ctx.http(), user_id).await.ok()?.roles;
    let guild = ctx.serenity_context().cache.guild(guild_id)?;
    Some(top_of(&guild.roles, &roles))
}

/// Administrator check from cached role flags (avoids the deprecated
/// `Member::permissions`, which ignores overwrites).
fn member_is_admin(ctx: &Ctx<'_>, guild_id: serenity::GuildId, member: &serenity::Member) -> bool {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            member.roles.iter().any(|r| {
                g.roles
                    .get(r)
                    .map(|role| role.permissions.administrator())
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

/// Best-effort DM. Mirrors the TS `.catch(() => ...)` sends.
async fn dm_best_effort(http: &serenity::Http, user: &serenity::User, content: String) {
    let _ = user
        .direct_message(http, serenity::CreateMessage::new().content(content))
        .await;
}

/// Run-less group root for the moderation category (TS `mod.ts`).
// 22 leaf commands live below. A bare invocation raises
// SubcommandRequired (mapped to help in `bot.rs`) before this body
// runs, on both paths.
// Prefix entity limitation (accepted): `serenity::User` / `Role` leaf
// params resolve mentions and raw IDs only on the prefix path. TS
// `method.member`/`method.role` additionally fall back to an exact
// username / role-name cache lookup (`method.ts:118-160,229-241`),
// so `!mod ban SomeName` worked in TS but fails argument parsing here.
// Slash is unaffected (Discord resolves entities server-side).
#[poise::command(
    slash_command,
    prefix_command,
    category = "moderation",
    rename = "mod",
    subcommands(
        "mod_ban",
        "mod_kick",
        "mod_timeout",
        "mod_warn",
        "mod_unwarn",
        "mod_warnlist",
        "mod_clear",
        "mod_temprole",
        "mod_tempban",
        "mod_rolepanel",
        "mod_lock",
        "mod_unlock",
        "mod_lock_all",
        "mod_unlock_all",
        "mod_unban",
        "mod_unmute",
        "mod_unmuteall",
        "mod_baninfo",
        "mod_banlist",
        "mod_mutelist",
        "mod_clearwarn",
        "mod_clear_all_warns"
    ),
    subcommand_required
)]
pub async fn moderation(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Highest author role name for the warn DM. Mirrors
/// `author.roles.highest.name` in method.warnMember: the raw role name
/// with no `@` prefix (`everyone` when unknown).
pub fn warn_top_role_name(
    author_top_roles: &Option<Vec<serenity::RoleId>>,
    guild_roles: &Option<std::collections::HashMap<serenity::RoleId, (String, u16)>>,
) -> String {
    author_top_roles
        .as_ref()
        .and_then(|roles| {
            guild_roles.as_ref().and_then(|map| {
                roles
                    .iter()
                    .filter_map(|r| map.get(r))
                    .max_by_key(|(_, pos)| *pos)
                    .map(|(name, _)| name.clone())
            })
        })
        .unwrap_or_else(|| "everyone".to_string())
}

/// Localized short duration like TS `to_beautiful_string(ms, lang)`:
/// localized unit names concatenated without separator, zero falls
/// back to `0` + the minute name. `units` is [year, month, week, day,
/// hour, minute, second] (`var_year`, `var_mo`, `var_w`, `var_d`,
/// `var_h`, `var_m`, `var_s`); the ms unit name stays `ms` like TS.
pub fn beautiful_ms_lang(ms: f64, units: &[String; 7]) -> String {
    if !ms.is_finite() || ms < 0.0 {
        return format!("0{}", units[5]);
    }
    let mut rest = ms.max(0.0) as u64;
    let factors = [
        31_557_600_000u64,
        2_592_000_000,
        604_800_000,
        86_400_000,
        3_600_000,
        60_000,
        1_000,
    ];
    let mut out = String::new();
    for (unit, factor) in units.iter().zip(factors) {
        if rest >= factor {
            out.push_str(&format!("{}{}", rest / factor, unit));
            rest %= factor;
        }
    }
    if rest > 0 {
        out.push_str(&format!("{rest}ms"));
    }
    if out.is_empty() {
        format!("0{}", units[5])
    } else {
        out
    }
}

/// Inputs for [`warn_member`]. Struct keeps clippy arg-count clean.
pub struct WarnContext<'a> {
    pub http: &'a serenity::Http,
    pub guild_name: Option<String>,
    pub author_top_roles: Option<Vec<serenity::RoleId>>,
    pub guild_roles: Option<std::collections::HashMap<serenity::RoleId, (String, u16)>>,
    pub pool: &'a crate::db::Pool,
    pub gid: &'a str,
    pub guild_id: serenity::GuildId,
    pub author_name: &'a str,
    pub target: &'a serenity::User,
    pub reason: &'a str,
    pub lang_code: &'a str,
}

/// Record a warn + DM the member. Mirrors method.warnMember
/// (generatePassword id, USER.<uid>.WARNS push, Red DM embed with the
/// disabled guild button; send is best-effort like TS .catch).
/// Returns (warn id, total warns).
///
/// `WarnContext` carries no author id (kept stable for the anti-spam
/// caller in events_handler.rs), so this wrapper records no author.
/// Prefer [`warn_member_with_author`] when the moderator id is known.
pub async fn warn_member(w: &WarnContext<'_>) -> (String, usize) {
    warn_member_with_author(w, None).await
}

/// [`warn_member`] with the warning author's id persisted on the row.
pub async fn warn_member_with_author(
    w: &WarnContext<'_>,
    author_id: Option<u64>,
) -> (String, usize) {
    let text = |k: &str| crate::lang::get(w.lang_code, k).unwrap_or_default();
    let uid = w.target.id.get();
    let mut warns = load_warns(w.pool, w.gid, uid).await;
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    let id = crate::funcs::generate_password(
        &crate::funcs::PasswordOptions {
            length: 8,
            numbers: true,
            symbols: false,
            lowercase: false,
            uppercase: true,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        },
        nanos,
    )
    .unwrap_or_else(|_| format!("{nanos:08}"));
    let at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    warns = push_warn(
        warns,
        Warn {
            id: id.clone(),
            reason: w.reason.to_string(),
            at,
            author_id: author_id.map(|a| a.to_string()),
        },
    );
    let total = warns.len();
    let _ = save_warns(w.pool, w.gid, uid, &warns).await;
    // Highest-role name goes into the DM raw (no `@` prefix), like TS
    // `author.roles.highest.name`.
    let top_role = warn_top_role_name(&w.author_top_roles, &w.guild_roles);
    let guild_name = w
        .guild_name
        .clone()
        .unwrap_or_else(|| "this server".to_string());
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::RED)
        .title(text("global_warn_embed_title").replace("${warnObject.id}", &id))
        .description(
            text("global_warn_embed_desc")
                .replace("${warnObject.reason}", w.reason)
                .replace("${author.user.username}", w.author_name)
                .replace("${author.roles.highest.name}", &top_role)
                .replace("${time}", &format!("<t:{}>", at / 1000)),
        );
    let row = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(format!(
        "guild-id-{}",
        w.guild_id.get()
    ))
    .label(text("global_warn_component_button_label").replace("${author.guild.name}", &guild_name))
    .style(serenity::ButtonStyle::Secondary)
    .disabled(true)]);
    let _ = w
        .target
        .direct_message(
            w.http,
            serenity::CreateMessage::new()
                .embed(embed)
                .components(vec![row]),
        )
        .await;
    (id, total)
}

/// Prefix member-not-found reply shared by ban/warn/baninfo/rolepanel.
/// Mirrors the TS `if (!member)` / `if (!user)` guards (!ban.ts,
/// !warn.ts, !baninfo.ts, !rolepanel.ts `resolveTargetMember` null):
/// poise yields `None` for a missing prefix entity arg, so the command
/// replies with the same TS lang key instead of running. Slash options
/// stay required in Discord, so `None` on slash means the same lookup
/// failed and gets the same reply.
pub async fn reply_member_not_found(
    ctx: &Ctx<'_>,
    lang_code: &str,
    key: &str,
    fallback: &str,
) -> anyhow::Result<()> {
    let text = crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string());
    if !text.is_empty() {
        ctx.say(text).await?;
    }
    Ok(())
}

/// Pure helper: parse "rolepanel:<role_id>".
pub fn parse_rolepanel_custom_id(custom_id: &str) -> Option<serenity::RoleId> {
    custom_id
        .strip_prefix("rolepanel:")?
        .trim()
        .parse::<u64>()
        .ok()
        .filter(|n| *n != 0)
        .map(serenity::RoleId::new)
}

pub fn rolepanel_custom_id(role_id: serenity::RoleId) -> String {
    format!("rolepanel:{}", role_id.get())
}

/// Merge the lock-all deny flag into an existing overwrite. Mirrors the
/// TS `permissionOverwrites.create(role, {SendMessages: false})` in
/// `!lock-all.ts`, which merges: only SendMessages moves to deny (out of
/// allow), every other flag is preserved across the PUT. Pure for tests.
/// (Unlike the single `!lock.ts`, lock-all touches SendMessages only —
/// Connect is left alone.)
pub fn merge_lock_all_overwrite(
    allow: serenity::Permissions,
    deny: serenity::Permissions,
) -> (serenity::Permissions, serenity::Permissions) {
    let bit = serenity::Permissions::SEND_MESSAGES;
    (allow & !bit, deny | bit)
}

/// Merge the unlock-all allow flag into an existing overwrite. Mirrors
/// the TS `permissionOverwrites.create(role, {SendMessages: true})` in
/// `!unlock-all.ts`: only SendMessages moves to allow (out of deny),
/// every other flag is preserved. Pure for tests.
pub fn merge_unlock_all_overwrite(
    allow: serenity::Permissions,
    deny: serenity::Permissions,
) -> (serenity::Permissions, serenity::Permissions) {
    let bit = serenity::Permissions::SEND_MESSAGES;
    (allow | bit, deny & !bit)
}

async fn lock_all_inner(
    ctx: &Ctx<'_>,
    unlock: bool,
    role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = role
        .map(|r| r.id)
        .unwrap_or_else(|| serenity::RoleId::new(guild_id.get()));
    // Same read-merge pattern as the single lock/unlock: serenity's
    // `create_permission` is a full-overwrite PUT, while the TS
    // `permissionOverwrites.create` merges. Snapshot each channel's
    // existing overwrite for the target role so unrelated flags survive.
    let channels: Vec<(
        poise::serenity_prelude::ChannelId,
        serenity::Permissions,
        serenity::Permissions,
    )> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Text)
                .map(|c| {
                    let (allow, deny) = c
                        .permission_overwrites
                        .iter()
                        .find(|o| o.kind == serenity::PermissionOverwriteType::Role(target))
                        .map(|o| (o.allow, o.deny))
                        .unwrap_or((
                            serenity::Permissions::empty(),
                            serenity::Permissions::empty(),
                        ));
                    (c.id, allow, deny)
                })
                .collect()
        })
        .unwrap_or_default();
    // Deliberate pacing choice (kept): !lock-all.ts / !unlock-all.ts
    // fire `permissionOverwrites.create` per text channel without
    // awaiting and reply immediately; here each overwrite is awaited
    // sequentially so per-channel failures are absorbed and the reply
    // only goes out once the sweep is done. Same end state, different
    // backpressure — sequential avoids a burst of parallel writes on
    // large guilds.
    for (ch, allow, deny) in channels {
        let (allow, deny) = if unlock {
            // TS unlock-all writes {SendMessages: true} (merged).
            merge_unlock_all_overwrite(allow, deny)
        } else {
            // TS lock-all writes {SendMessages: false} (merged).
            merge_lock_all_overwrite(allow, deny)
        };
        let overwrite = serenity::PermissionOverwrite {
            allow,
            deny,
            kind: serenity::PermissionOverwriteType::Role(target),
        };
        let _ = ch.create_permission(ctx.http(), overwrite).await;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let author_id = ctx.author().id.get().to_string();
    ctx.say(if unlock {
        t("unlockall_embed_message_description").replace("${interaction.user.id}", &author_id)
    } else {
        t("lockall_embed_message_description").replace("${interaction.user.id}", &author_id)
    })
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t(if unlock {
            "unlockall_logs_embed_title"
        } else {
            "lockall_logs_embed_title"
        }),
        t(if unlock {
            "unlockall_logs_embed_description"
        } else {
            "lockall_logs_embed_description"
        })
        .replace("${interaction.user.id}", &author_id),
    )
    .await;
    Ok(())
}

pub mod ban;
pub mod baninfo;
pub mod banlist;
pub mod clear;
pub mod clear_all_warns;
pub mod clearwarn;
pub mod kick;
pub mod lock;
pub mod lock_all;
pub mod mutelist;
pub mod rolepanel;
pub mod tempban;
pub mod tempmute;
pub mod temprole;
pub mod unban;
pub mod unlock;
pub mod unlock_all;
pub mod unmute;
pub mod unmuteall;
pub mod unwarn;
pub mod warn;
pub mod warnlist;

use ban::mod_ban;
use baninfo::mod_baninfo;
use banlist::mod_banlist;
use clear::mod_clear;
use clear_all_warns::mod_clear_all_warns;
use clearwarn::mod_clearwarn;
use kick::mod_kick;
use lock::mod_lock;
use lock_all::mod_lock_all;
use mutelist::mod_mutelist;
use rolepanel::mod_rolepanel;
use tempban::mod_tempban;
use tempmute::mod_timeout;
use temprole::mod_temprole;
use unban::mod_unban;
use unlock::mod_unlock;
use unlock_all::mod_unlock_all;
use unmute::mod_unmute;
use unmuteall::mod_unmuteall;
use unwarn::mod_unwarn;
use warn::mod_warn;
use warnlist::mod_warnlist;

/// Old registry path (`moderation::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::ban::*;
    pub use super::baninfo::*;
    pub use super::banlist::*;
    pub use super::clear::*;
    pub use super::clear_all_warns::*;
    pub use super::clearwarn::*;
    pub use super::kick::*;
    pub use super::lock::*;
    pub use super::lock_all::*;
    pub use super::mutelist::*;
    pub use super::rolepanel::*;
    pub use super::tempban::*;
    pub use super::tempmute::*;
    pub use super::temprole::*;
    pub use super::unban::*;
    pub use super::unlock::*;
    pub use super::unlock_all::*;
    pub use super::unmute::*;
    pub use super::unmuteall::*;
    pub use super::unwarn::*;
    pub use super::warn::*;
    pub use super::warnlist::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timeout_active_needs_future_expiry() {
        // Mirrors discord.js `isCommunicationDisabled()`: a present but
        // lapsed `communicationDisabledUntil` does not count.
        let now_ms = 1_700_000_000_000;
        let future = serenity::Timestamp::from_unix_timestamp(now_ms / 1000 + 60).unwrap();
        let past = serenity::Timestamp::from_unix_timestamp(now_ms / 1000 - 60).unwrap();
        assert!(timeout_active(Some(future), now_ms));
        assert!(!timeout_active(Some(past), now_ms));
        assert!(!timeout_active(None, now_ms));
    }

    #[test]
    fn warn_push_remove() {
        let w = Warn {
            id: "a".into(),
            reason: "r".into(),
            at: 1,
            author_id: Some("7".into()),
        };
        let v = push_warn(vec![], w);
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].author_id.as_deref(), Some("7"));
        let (v, removed) = remove_warn(v, "a");
        assert!(removed && v.is_empty());
        let (_, removed) = remove_warn(v, "missing");
        assert!(!removed);
    }

    #[test]
    fn warn_author_id_legacy_and_ts_rows() {
        // Legacy Rust row without the field.
        let legacy: Vec<Warn> =
            serde_json::from_str(r#"[{"id":"a","reason":"r","at":1}]"#).unwrap();
        assert_eq!(legacy[0].author_id, None);
        // Row written by the TS bot (timestamp / authorID keys).
        let ts: Vec<Warn> = serde_json::from_str(
            r#"[{"id":"b","reason":"s","timestamp":1720000000000,"authorID":"123"}]"#,
        )
        .unwrap();
        assert_eq!(ts[0].at, 1720000000000);
        assert_eq!(ts[0].author_id.as_deref(), Some("123"));
        // Round-trip keeps the author.
        let back: Vec<Warn> = serde_json::from_str(&serde_json::to_string(&ts).unwrap()).unwrap();
        assert_eq!(back, ts);
        // Writes use the TS key shape (timestamp / authorID), so the TS
        // bot reads Rust rows verbatim.
        let raw = serde_json::to_string(&ts).unwrap();
        assert!(raw.contains("\"timestamp\"") && raw.contains("\"authorID\""));
        assert!(!raw.contains("\"at\"") && !raw.contains("author_id"));
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn warns_routed_legacy_reads_and_promotes_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        // TS row shape (timestamp / authorID keys) reads through the
        // routed loader and promotes into the table.
        crate::db::kv_set(
            &pool,
            "g",
            &warns_key(1),
            r#"[{"id":"b","reason":"s","timestamp":1720000000000,"authorID":"123"}]"#,
        )
        .await
        .unwrap();
        let warns = load_warns(&pool, "g", 1).await;
        assert_eq!(warns.len(), 1);
        assert_eq!(warns[0].author_id.as_deref(), Some("123"));
        assert!(tbl_get_value(&pool, "g", &warns_key(1)).await.is_some());
        // Unknown users still default.
        assert!(load_warns(&pool, "g", 9).await.is_empty());
    }

    #[tokio::test]
    async fn warns_routed_table_wins_over_legacy_on_conflict() {
        use crate::commands::owner::main::table_backend;
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            &warns_key(1),
            r#"[{"id":"old","reason":"x","at":1}]"#,
        )
        .await
        .unwrap();
        table_backend(&pool)
            .table("g")
            .set(
                &warns_key(1),
                serde_json::json!([{"id": "new", "reason": "y", "timestamp": 2}]),
            )
            .await
            .unwrap();
        let warns = load_warns(&pool, "g", 1).await;
        assert_eq!(warns.len(), 1);
        assert_eq!(warns[0].id, "new");
    }

    #[tokio::test]
    async fn warns_routed_save_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        let warns = vec![Warn {
            id: "a".into(),
            reason: "r".into(),
            at: 1,
            author_id: Some("7".into()),
        }];
        save_warns(&pool, "g", 4, &warns).await.unwrap();
        // Legacy kv readers stay fresh.
        let legacy = crate::db::kv_get(&pool, "g", &warns_key(4)).await.unwrap();
        let back: Vec<Warn> = serde_json::from_str(&legacy).unwrap();
        assert_eq!(back, warns);
        assert!(tbl_get_value(&pool, "g", &warns_key(4)).await.is_some());
        // Round-trip through the routed loader.
        assert_eq!(load_warns(&pool, "g", 4).await, warns);
    }

    #[test]
    fn lock_all_merge_preserves_other_flags() {
        use poise::serenity_prelude::Permissions;
        // Lock: only SendMessages moves to deny; Connect and the rest
        // survive (single-lock pattern, SendMessages-only like TS).
        let (allow, deny) =
            merge_lock_all_overwrite(Permissions::VIEW_CHANNEL, Permissions::CONNECT);
        assert!(allow.view_channel() && !allow.send_messages());
        assert!(deny.send_messages() && deny.connect());
        // Unlock: only SendMessages moves to allow.
        let (allow, deny) = merge_unlock_all_overwrite(
            Permissions::empty(),
            Permissions::SEND_MESSAGES | Permissions::MANAGE_MESSAGES,
        );
        assert!(allow.send_messages());
        assert!(!deny.send_messages() && deny.manage_messages());
        // Empty overwrite: lock denies SendMessages, unlock allows it.
        let (allow, deny) = merge_lock_all_overwrite(Permissions::empty(), Permissions::empty());
        assert!(allow.is_empty() && deny.send_messages());
        let (allow, deny) = merge_unlock_all_overwrite(Permissions::empty(), Permissions::empty());
        assert!(allow.send_messages() && deny.is_empty());
    }

    #[test]
    fn parses_rolepanel_custom_id() {
        assert_eq!(
            parse_rolepanel_custom_id("rolepanel:123"),
            Some(serenity::RoleId::new(123))
        );
        assert_eq!(parse_rolepanel_custom_id("rolepanel:0"), None);
        assert_eq!(parse_rolepanel_custom_id("rolepanel:abc"), None);
        assert_eq!(parse_rolepanel_custom_id("other:123"), None);
        let id = serenity::RoleId::new(999);
        assert_eq!(
            parse_rolepanel_custom_id(&rolepanel_custom_id(id)),
            Some(id)
        );
    }

    #[test]
    fn temp_expiry() {
        let e = TempEntry { expires_at_ms: 100 };
        assert!(temp_expired(&e, 100));
        assert!(!temp_expired(&e, 99));
    }

    #[test]
    fn paginate_windows() {
        assert_eq!(paginate(12, 5, 1), (0, 5, 3));
        assert_eq!(paginate(12, 5, 3), (10, 12, 3));
        assert_eq!(paginate(12, 5, 99), (10, 12, 3));
        assert_eq!(paginate(0, 5, 1), (0, 0, 1));
    }

    fn test_units() -> [String; 7] {
        [
            "y".to_string(),
            "mo".to_string(),
            "w".to_string(),
            "d".to_string(),
            "h".to_string(),
            "m".to_string(),
            "s".to_string(),
        ]
    }

    #[test]
    fn beautiful_ms_lang_decomposes_like_ts() {
        let u = test_units();
        assert_eq!(beautiful_ms_lang(3_600_000.0, &u), "1h");
        assert_eq!(beautiful_ms_lang(90_000.0, &u), "1m30s");
        assert_eq!(
            beautiful_ms_lang(31_557_600_000.0 + 86_400_000.0, &u),
            "1y1d"
        );
        assert_eq!(beautiful_ms_lang(500.0, &u), "500ms");
    }

    #[test]
    fn beautiful_ms_lang_zero_falls_back_to_minute() {
        let u = test_units();
        assert_eq!(beautiful_ms_lang(0.0, &u), "0m");
        assert_eq!(beautiful_ms_lang(-5.0, &u), "0m");
    }

    #[test]
    fn beautiful_ms_lang_uses_guild_unit_names() {
        let u = [
            "year(s)".to_string(),
            "month(s)".to_string(),
            "week(s)".to_string(),
            "day(s)".to_string(),
            "hour(s)".to_string(),
            "minute(s)".to_string(),
            "second(s)".to_string(),
        ];
        assert_eq!(beautiful_ms_lang(3_600_000.0, &u), "1hour(s)");
        assert_eq!(beautiful_ms_lang(0.0, &u), "0minute(s)");
    }

    #[test]
    fn warn_top_role_name_has_no_at_prefix() {
        let mut map = std::collections::HashMap::new();
        map.insert(serenity::RoleId::new(1), ("Admin".to_string(), 5u16));
        map.insert(serenity::RoleId::new(2), ("Mod".to_string(), 9u16));
        let roles = Some(vec![serenity::RoleId::new(1), serenity::RoleId::new(2)]);
        assert_eq!(warn_top_role_name(&roles, &Some(map)), "Mod".to_string());
    }

    #[test]
    fn warn_top_role_name_falls_back_to_everyone() {
        let none: Option<Vec<serenity::RoleId>> = None;
        let map: Option<std::collections::HashMap<serenity::RoleId, (String, u16)>> = None;
        assert_eq!(warn_top_role_name(&none, &map), "everyone".to_string());
        assert_eq!(
            warn_top_role_name(&Some(vec![]), &map),
            "everyone".to_string()
        );
    }
}
