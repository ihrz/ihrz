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
    pub at: i64,
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

pub async fn load_warns(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Vec<Warn> {
    crate::db::kv_get(pool, guild_id, &warns_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_warns(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    warns: &[Warn],
) -> anyhow::Result<()> {
    crate::db::kv_set(
        pool,
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
    )
)]
pub async fn moderation(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
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
pub async fn warn_member(w: &WarnContext<'_>) -> (String, usize) {
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
        },
    );
    let total = warns.len();
    let _ = save_warns(w.pool, w.gid, uid, &warns).await;
    let top_role = w
        .author_top_roles
        .as_ref()
        .and_then(|roles| {
            w.guild_roles.as_ref().and_then(|map| {
                roles
                    .iter()
                    .filter_map(|r| map.get(r))
                    .max_by_key(|(_, pos)| *pos)
                    .map(|(name, _)| format!("@{name}"))
            })
        })
        .unwrap_or_else(|| "@everyone".to_string());
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
                .replace("${time}", &format!("<t:{}:R>", at / 1000)),
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

/// Refused-role reason. Mirrors getRefusedRoleReason in !rolepanel.ts.
fn rolepanel_refused_reason(
    role: &serenity::Role,
    guild_id: serenity::GuildId,
    bot_top: u16,
    author_top: u16,
    author_id: u64,
    owner_id: u64,
    t: &impl Fn(&str) -> String,
) -> Option<String> {
    if role.id.get() == guild_id.get() || role.managed {
        return Some(t("rolepanel_role_managed_or_everyone"));
    }
    if bot_top <= role.position {
        return Some(t("rolepanel_role_too_high_bot"));
    }
    if owner_id != author_id && author_top <= role.position {
        return Some(t("rolepanel_role_too_high_user"));
    }
    None
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
    let channels: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Text)
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    // TS fires one overwrite per text channel without awaiting each.
    for ch in channels {
        let overwrite = if unlock {
            // TS unlock-all writes {SendMessages: true}.
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::SEND_MESSAGES,
                deny: serenity::Permissions::empty(),
                kind: serenity::PermissionOverwriteType::Role(target),
            }
        } else {
            // TS lock-all writes {SendMessages: false}.
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::empty(),
                deny: serenity::Permissions::SEND_MESSAGES,
                kind: serenity::PermissionOverwriteType::Role(target),
            }
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
    fn warn_push_remove() {
        let w = Warn {
            id: "a".into(),
            reason: "r".into(),
            at: 1,
        };
        let v = push_warn(vec![], w);
        assert_eq!(v.len(), 1);
        let (v, removed) = remove_warn(v, "a");
        assert!(removed && v.is_empty());
        let (_, removed) = remove_warn(v, "missing");
        assert!(!removed);
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
}
