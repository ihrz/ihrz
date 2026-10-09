// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/moderation/* (mod.ts + 23 subs).
//
// TS keys: <guild>.USER.<uid>.WARNS [{id, reason, at}]. The rest (ban, kick,
// timeout, channel lock) is native Discord API. rolepanel (collectors) stays
// pending; see PORT_INVENTORY.md.

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

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ban",
    aliases("addban", "createban"),
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_ban(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let reason = reason.unwrap_or_else(|| {
        crate::lang::get(&code, "guildprofil_not_set_punishPub")
            .unwrap_or_else(|| "No reason".to_string())
    });
    guild_id.ban(&ctx.http(), user.id, 0).await?;
    let author_id = ctx.author().id.get().to_string();
    ctx.say(
        crate::lang::get(&code, "ban_command_work")
            .map(|s| {
                s.replace("${member.user.id}", &user.id.get().to_string())
                    .replace("${interaction.member.id}", &author_id)
            })
            .unwrap_or_else(|| format!("Banned {} ({reason})", user.tag())),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "kick",
    default_member_permissions = "KICK_MEMBERS"
)]
pub async fn mod_kick(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let reason = reason.unwrap_or_default();
    guild_id
        .kick_with_reason(&ctx.http(), user.id, &reason)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "kick_command_work")
            .map(|s| {
                s.replace("${member.user}", &user.to_string())
                    .replace("${interaction.user}", &ctx.author().to_string())
            })
            .unwrap_or_else(|| format!("Kicked {}", user.tag())),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "tempmute",
    aliases("timeout", "mute"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_timeout(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Seconds"] seconds: i64,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let secs = seconds.clamp(1, 2419200);
    let until = serenity::Timestamp::from_unix_timestamp(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0)
            + secs,
    )?;
    let mut member = guild_id.member(&ctx.http(), user.id).await?;
    member
        .disable_communication_until_datetime(&ctx.http(), until)
        .await?;
    // Mute warn (mirrors !tempmute.ts warnMember call with the mute
    // description as reason).
    if let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) {
        let pool = &ctx.data().pool;
        let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let reason_text = text("tempmute_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string())
            .replace(
                "${ms(ms(mutetime))}",
                &crate::funcs::beautiful_ms(secs as f64 * 1000.0),
            )
            .replace(
                "${reason}",
                &reason.clone().unwrap_or_else(|| text("var_no_set")),
            );
        let author_top = ctx.author_member().await.map(|m| m.roles.clone());
        let (guild_name, guild_roles) = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                (
                    Some(g.name.clone()),
                    Some(
                        g.roles
                            .iter()
                            .map(|(id, r)| (*id, (r.name.clone(), r.position)))
                            .collect(),
                    ),
                )
            })
            .unwrap_or((None, None));
        let _ = warn_member(&WarnContext {
            http: ctx.http(),
            guild_name,
            author_top_roles: author_top,
            guild_roles,
            pool,
            gid: &gid,
            guild_id,
            author_name: &ctx.author().name,
            target: &user,
            reason: &reason_text,
            lang_code: &lang_code,
        })
        .await;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let ms = crate::funcs::beautiful_ms(secs as f64 * 1000.0);
    ctx.say(
        crate::lang::get(&code, "tempmute_command_work")
            .map(|s| {
                s.replace("${tomute.id}", &user.id.get().to_string())
                    .replace("${ms(ms(mutetime))}", &ms)
                    .replace("${reason}", &reason.clone().unwrap_or_default())
            })
            .unwrap_or_else(|| {
                format!(
                    "Timed out {} for {secs}s {}",
                    user.tag(),
                    reason.clone().unwrap_or_default()
                )
            }),
    )
    .await?;
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

#[poise::command(
    slash_command,
    prefix_command,
    rename = "warn",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_warn(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Reason"] reason: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let (id, total) = if let Some(guild_id) = ctx.guild_id() {
        let pool = &ctx.data().pool;
        let lang_code = code.clone();
        let author_top = ctx.author_member().await.map(|m| m.roles.clone());
        let (guild_name, guild_roles) = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                (
                    Some(g.name.clone()),
                    Some(
                        g.roles
                            .iter()
                            .map(|(id, r)| (*id, (r.name.clone(), r.position)))
                            .collect(),
                    ),
                )
            })
            .unwrap_or((None, None));
        warn_member(&WarnContext {
            http: ctx.http(),
            guild_name,
            author_top_roles: author_top,
            guild_roles,
            pool,
            gid: &gid,
            guild_id,
            author_name: &ctx.author().name,
            target: &user,
            reason: &reason,
            lang_code: &lang_code,
        })
        .await
    } else {
        // DM context: record without the guild DM flourish.
        let pool = &ctx.data().pool;
        let mut warns = load_warns(pool, &gid, uid).await;
        let id = format!("{uid}-{at}", at = 0);
        warns = push_warn(
            warns,
            Warn {
                id: id.clone(),
                reason: reason.clone(),
                at: 0,
            },
        );
        let total = warns.len();
        save_warns(pool, &gid, uid, &warns).await?;
        (id, total)
    };
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "warn_command_work")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${member?.toString()}", &user.to_string())
                    .replace("${reason}", &reason)
                    .replace("${warnId}", &id)
            })
            .unwrap_or_else(|| format!("Warned {} (id {id}, total {total})", user.tag())),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "unwarn",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_unwarn(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Warn id"] warn_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let (next, removed) = remove_warn(load_warns(&ctx.data().pool, &gid, uid).await, &warn_id);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if removed {
        save_warns(&ctx.data().pool, &gid, uid, &next).await?;
        let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        ctx.say(
            crate::lang::get(&code, "unwarn_command_ok")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                        .replace("${member?.toString()}", &user.to_string())
                })
                .unwrap_or_else(|| "Warn removed.".to_string()),
        )
        .await?;
    } else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "unwarn_cannot_found_id")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        .replace("${member?.toString()}", &user.to_string())
                })
                .unwrap_or_else(|| "Warn not found.".to_string()),
        )
        .await?;
    }
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "warnlist",
    aliases("warns", "listwarns", "listwarn", "warnslist", "sanctions"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_warnlist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let warns = load_warns(&ctx.data().pool, &gid, user.id.get()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if warns.is_empty() {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        crate::lang::get(&code, "warnlist_no_data")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.No}", &no)
                    .replace("${member?.toString()}", &user.to_string())
            })
            .unwrap_or_else(|| "No warns.".to_string())
    } else {
        warns
            .iter()
            .map(|w| {
                format!(
                    "{}: {} ({})",
                    w.id,
                    w.reason,
                    crate::funcs::format_date(w.at / 1000, "YYYY-MM-DD")
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear",
    aliases("cls"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn mod_clear(
    ctx: Ctx<'_>,
    #[description = "Amount (1-100)"] amount: u64,
) -> Result<(), anyhow::Error> {
    let n = amount.clamp(1, 100) as u8;
    let channel_id = ctx.channel_id();
    let msgs = channel_id
        .messages(&ctx.http(), serenity::GetMessages::new().limit(n))
        .await?;
    let ids: Vec<serenity::MessageId> = msgs.iter().map(|m| m.id).collect();
    channel_id.delete_messages(&ctx.http(), &ids).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "clear_confirmation_message")
            .map(|s| s.replace("${messages.size}", &ids.len().to_string()))
            .unwrap_or_else(|| format!("Cleared {}.", ids.len())),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "temprole",
    aliases("addtemprole", "temporaryrole", "temproles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_temprole(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Role"] role: serenity::Role,
    #[description = "Duration (e.g. 10m, 1h, 7d)"] duration: String,
) -> Result<(), anyhow::Error> {
    let Some(delta) = crate::commands::schedule::parse_duration_ms(&duration) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let member = guild_id.member(&ctx.http(), user.id).await?;
    member.add_role(&ctx.http(), role.id).await?;
    let exp = crate::commands::schedule::now_ms() + delta;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &temprole_key(user.id.get(), role.id.get()),
        &serde_json::json!({"expires_at_ms": exp}).to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let ms = crate::funcs::beautiful_ms(delta as f64);
    let no_reason = crate::lang::get(&code, "var_no_set").unwrap_or_default();
    ctx.say(
        crate::lang::get(&code, "temprole_command_work")
            .map(|s| {
                s.replace("${tomute.id}", &user.id.get().to_string())
                    .replace("${ms(ms(mutetime))}", &ms)
                    .replace("${reason}", &no_reason)
            })
            .unwrap_or_else(|| {
                format!(
                    "{} got {} until <t:{}:F>.",
                    user.tag(),
                    role.name,
                    exp / 1000
                )
            }),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "tempban",
    aliases("tban", "temporaryban"),
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_tempban(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Duration (e.g. 10m, 1h, 7d)"] duration: String,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(delta) = crate::commands::schedule::parse_duration_ms(&duration) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    guild_id.ban(&ctx.http(), user.id, 0).await?;
    let exp = crate::commands::schedule::now_ms() + delta;
    let reason_s = reason.clone().unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &tempban_key(user.id.get()),
        &serde_json::json!({"expires_at_ms": exp, "reason": reason_s}).to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "tempban_command_work")
            .map(|s| {
                s.replace("${user.id}", &user.id.get().to_string())
                    .replace("${duration}", duration.trim())
                    .replace("${reason}", &reason_s)
            })
            .unwrap_or_else(|| format!("{} tempbanned until <t:{}:F>.", user.tag(), exp / 1000)),
    )
    .await?;
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

/// Lock a text channel (deny SendMessages for @everyone).
/// Mirrors moderation !lock.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lock",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_lock(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let ch_id = match channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .create_permission(
            &ctx.http(),
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::empty(),
                deny: serenity::Permissions::SEND_MESSAGES,
                kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(
                    ctx.guild_id().map(|g| g.get()).unwrap_or(0),
                )),
            },
        )
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    ctx.say(
        crate::lang::get(&code, "lock_embed_message_description")
            .map(|s| s.replace("${interaction.user.id}", &author_id))
            .unwrap_or_else(|| "Channel locked.".to_string()),
    )
    .await?;
    Ok(())
}

/// Unlock a text channel. Mirrors moderation !unlock.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_unlock(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let ch_id = match channel {
        Some(c) => c.id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .delete_permission(
            &ctx.http(),
            serenity::PermissionOverwriteType::Role(serenity::RoleId::new(
                ctx.guild_id().map(|g| g.get()).unwrap_or(0),
            )),
        )
        .await?;
    ctx.say(
        crate::lang::get(
            &crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await,
            "unlock_embed_message_description",
        )
        .unwrap_or_else(|| "Channel unlocked.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "moderation",
    rename = "rolepanel",
    default_member_permissions = "MANAGE_ROLES"
)]
pub async fn mod_rolepanel(
    ctx: Ctx<'_>,
    #[description = "Channel to post in"] channel: serenity::Channel,
    #[description = "Role 1"] role1: serenity::Role,
    #[description = "Role 2"] role2: Option<serenity::Role>,
    #[description = "Role 3"] role3: Option<serenity::Role>,
    #[description = "Role 4"] role4: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let roles: Vec<serenity::Role> = [Some(role1), role2, role3, role4]
        .into_iter()
        .flatten()
        .collect();
    if roles.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "rolepanel_setup_no_roles")
                .unwrap_or_else(|| "Give at least one role.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let buttons: Vec<serenity::CreateButton> = roles
        .iter()
        .map(|r| {
            serenity::CreateButton::new(rolepanel_custom_id(r.id))
                .label(r.name.clone())
                .style(serenity::ButtonStyle::Secondary)
        })
        .collect();
    // Discord allows max 5 buttons per row.
    let rows: Vec<serenity::CreateActionRow> = buttons
        .chunks(5)
        .map(|c| serenity::CreateActionRow::Buttons(c.to_vec()))
        .collect();

    let guild_channel = channel.id().to_channel(&ctx.http()).await?;
    let target = guild_channel.guild().expect("guild channel only");
    target
        .send_message(
            &ctx.http(),
            serenity::CreateMessage::new()
                .content("Click to toggle your role.")
                .components(rows),
        )
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "rolepanel_setup_saved")
            .unwrap_or_else(|| "Role panel posted.".to_string()),
    )
    .await?;
    Ok(())
}

/// Component handler: toggle the role encoded in the button custom_id.
/// Called from events_handler.rs `interaction_create` when
/// `custom_id.starts_with("rolepanel:")`.
pub async fn handle_rolepanel_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let Some(role_id) = parse_rolepanel_custom_id(&comp.data.custom_id) else {
        return Ok(());
    };
    let member = guild_id.member(&ctx.http, comp.user.id).await?;
    let has = member.roles.contains(&role_id);
    if has {
        member.remove_role(&ctx.http, role_id).await?;
    } else {
        member.add_role(&ctx.http, role_id).await?;
    }
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(if has { "Role removed." } else { "Role added." })
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

/// Unban by user id. Mirrors !unban.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unban",
    aliases("delban", "removeban", "deban", "pardon"),
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_unban(
    ctx: Ctx<'_>,
    #[description = "User id"] user_id: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Ok(uid) = user_id.trim().parse::<u64>() else {
        ctx.say(
            crate::lang::get(&code, "msg_bad_user_id")
                .unwrap_or_else(|| "Bad user id.".to_string()),
        )
        .await?;
        return Ok(());
    };
    match guild_id
        .unban(&ctx.http(), poise::serenity_prelude::UserId::new(uid))
        .await
    {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "unban_is_now_unbanned")
                    .map(|s| s.replace("${userID}", &uid.to_string()))
                    .unwrap_or_else(|| "Unbanned.".to_string()),
            )
            .await?
        }
        Err(_) => {
            let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "unban_the_member_is_not_banned")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "Unban failed.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

/// Ban info. Mirrors !baninfo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "baninfo",
    default_member_permissions = "BAN_MEMBERS"
)]
pub async fn mod_baninfo(
    ctx: Ctx<'_>,
    #[description = "User id"] user_id: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Ok(uid) = user_id.trim().parse::<u64>() else {
        ctx.say(
            crate::lang::get(&code, "baninfo_user_not_found")
                .unwrap_or_else(|| "Bad user id.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let bans = guild_id
        .bans(&ctx.http(), None, None)
        .await
        .unwrap_or_default();
    match bans.iter().find(|b| b.user.id.get() == uid) {
        Some(b) => {
            ctx.say(format!(
                "Banned: {} (reason: {}).",
                b.user.tag(),
                b.reason.clone().unwrap_or_default()
            ))
            .await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "baninfo_not_banned")
                    .unwrap_or_else(|| "Not banned.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// Ban list. Mirrors !banlist.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "banlist",
    aliases("bans", "listban", "listbans", "banlists"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn mod_banlist(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bans = guild_id
        .bans(&ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if bans.is_empty() {
        crate::lang::get(&code, "var_no_one_banned").unwrap_or_else(|| "No bans.".to_string())
    } else {
        bans.iter()
            .take(25)
            .map(|b| b.user.tag())
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

/// Mute list (timed-out members from cache). Mirrors !mutelist.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "mutelist",
    aliases("allmute", "allmutes", "alltimeout", "alltimeouts"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_mutelist(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let muted: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.communication_disabled_until.is_some())
                .map(|m| m.user.tag())
                .collect()
        })
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if muted.is_empty() {
        crate::lang::get(&code, "prevnames_undetected")
            .unwrap_or_else(|| "Nobody muted.".to_string())
    } else {
        muted.join(", ")
    })
    .await?;
    Ok(())
}

/// Unmute one member. Mirrors !unmute.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unmute",
    aliases("untempmute", "untimeout", "demute"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_unmute(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let mut member = guild_id.member(&ctx.http(), user.id).await?;
    member.enable_communication(&ctx.http()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "unmute_command_work")
            .map(|s| s.replace("${tomute.id}", &user.id.get().to_string()))
            .unwrap_or_else(|| "Unmuted.".to_string()),
    )
    .await?;
    Ok(())
}

/// Unmute everyone timed out. Mirrors !unmuteall.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unmuteall",
    aliases("unmute-all", "untimeoutall", "untimeout-all", "demuteall"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_unmuteall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let ids: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.communication_disabled_until.is_some())
                .map(|m| m.user.id)
                .collect()
        })
        .unwrap_or_default();
    let mut n = 0;
    for uid in ids {
        if let Ok(member) = guild_id.member(&ctx.http(), uid).await {
            let mut member = member;
            if member.enable_communication(&ctx.http()).await.is_ok() {
                n += 1;
            }
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "unmuteall_command_work")
            .map(|s| {
                s.replace("${unmuted}", &n.to_string())
                    .replace("${total}", &n.to_string())
            })
            .unwrap_or_else(|| format!("Unmuted {n}.")),
    )
    .await?;
    Ok(())
}

/// Clear one user's warns. Mirrors !clearwarn.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clearwarn",
    aliases("clearwarns", "clearsanctions", "clearsanction"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_clearwarn(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let warn_count = load_warns(&ctx.data().pool, &gid, user.id.get())
        .await
        .len();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(warns_key(user.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "clearwarn_command_ok")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${member?.toString()}", &format!("<@{}>", user.id.get()))
                    .replace("${allWarns.length}", &warn_count.to_string())
                    .replace(
                        "${interaction.member.toString()}",
                        &format!("<@{}>", ctx.author().id.get()),
                    )
            })
            .unwrap_or_else(|| "Warns cleared.".to_string()),
    )
    .await?;
    Ok(())
}

/// Clear all warns. Mirrors !clear-all-warns.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear-all-warns",
    aliases(
        "clearallwarns",
        "clearallwarn",
        "clearsanctionsall",
        "clearsanctionall"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_clear_all_warns(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "clear_allwarns_confirmation_message",
        "Delete ALL warns? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.WARNS'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "clear_allwarns_command_ok")
            .unwrap_or_else(|| "All warns cleared.".to_string()),
    )
    .await?;
    Ok(())
}

/// Lock/unlock every text channel. Mirrors !lock-all.ts / !unlock-all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lock-all",
    aliases("lockall"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_lock_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, false).await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock-all",
    aliases("unlockall"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_unlock_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, true).await
}

async fn lock_all_inner(ctx: &Ctx<'_>, unlock: bool) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
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
    let everyone = poise::serenity_prelude::RoleId::new(guild_id.get());
    for ch in channels {
        if unlock {
            let _ = ch
                .delete_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                )
                .await;
        } else {
            let _ = ch
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: poise::serenity_prelude::Permissions::empty(),
                        deny: poise::serenity_prelude::Permissions::SEND_MESSAGES,
                        kind: poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                    },
                )
                .await;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    ctx.say(if unlock {
        crate::lang::get(&code, "unlockall_embed_message_description")
            .map(|s| s.replace("${interaction.user.id}", &author_id))
            .unwrap_or_else(|| "Unlocked all.".to_string())
    } else {
        crate::lang::get(&code, "lockall_embed_message_description")
            .map(|s| s.replace("${interaction.user.id}", &author_id))
            .unwrap_or_else(|| "Locked all.".to_string())
    })
    .await?;
    Ok(())
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
}
