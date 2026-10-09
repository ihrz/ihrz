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
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS defaults to the guild punishPub text, never empty.
    let reason = reason.unwrap_or_else(|| t("guildprofil_not_set_punishPub"));
    let no = emoji(&ctx, "No", "❌").await;
    let stop = emoji(&ctx, "Stop", "⛔").await;
    let guards = guard_data(&ctx, guild_id).await;
    // Bot needs BanMembers. Mirrors ban_dont_have_perm_myself.
    if let Some(g) = &guards {
        if !g.bot_perms.ban_members() {
            ctx.say(t("ban_dont_have_perm_myself").replace("${client.iHorizon_Emojis.No}", &no))
                .await?;
            return Ok(());
        }
    }
    if user.id == ctx.author().id {
        ctx.say(t("ban_try_to_ban_yourself").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    if let Some(target_pos) = target_top(&ctx, guild_id, user.id).await {
        let guards = guards.as_ref();
        let author_top = guards.map(|g| g.author_top).unwrap_or(u16::MAX);
        let author_id = ctx.author().id.get();
        let owner = guards.map(|g| g.owner_id).unwrap_or(author_id);
        // TS ban uses `<=` (stricter than kick).
        if author_top <= target_pos && owner != author_id {
            ctx.say(
                t("ban_attempt_ban_higter_member").replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
        // `bannable`: the bot's top role must outrank the target.
        if guards.map(|g| g.bot_top <= target_pos).unwrap_or(false) {
            ctx.say(t("ban_cant_ban_member").replace("${client.iHorizon_Emojis.No}", &no))
                .await?;
            return Ok(());
        }
    }
    let guild_name = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.name.clone())
        .unwrap_or_default();
    dm_best_effort(
        ctx.http(),
        &user,
        t("ban_message_to_the_banned_member")
            .replace("${interaction.guild.name}", &guild_name)
            .replace("${reason}", &reason),
    )
    .await;
    // Audit reason. Mirrors `Banned by: ... | Reason: ...`.
    let by = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    let audit = format!("Banned by: {by} | Reason: {reason}");
    if guild_id
        .ban_with_reason(ctx.http(), user.id, 0, &audit)
        .await
        .is_err()
    {
        ctx.say(t("setrankroles_command_error").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
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
    post_mod_log(
        ctx.http(),
        guild_id,
        t("ban_logs_embed_title"),
        t("ban_logs_embed_description")
            .replace("${member.user.id}", &user.id.get().to_string())
            .replace("${interaction.member.id}", &author_id),
    )
    .await;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS defaults to the guild punishPub text, never empty.
    let reason = reason.unwrap_or_else(|| t("guildprofil_not_set_punishPub"));
    let no = emoji(&ctx, "No", "❌").await;
    let stop = emoji(&ctx, "Stop", "⛔").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.kick_members() {
            ctx.say(t("kick_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
                .await?;
            return Ok(());
        }
    }
    if user.id == ctx.author().id {
        ctx.say(t("kick_attempt_kick_your_self").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(member) = member else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    if let Some(target_pos) = target_top(&ctx, guild_id, user.id).await {
        let author_top = guards.as_ref().map(|g| g.author_top).unwrap_or(u16::MAX);
        let author_id = ctx.author().id.get();
        let owner = guards.as_ref().map(|g| g.owner_id).unwrap_or(author_id);
        // TS kick uses strict `<`.
        if author_top < target_pos && owner != author_id {
            ctx.say(
                t("kick_attempt_kick_higter_member")
                    .replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
    }
    let guild_name = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.name.clone())
        .unwrap_or_default();
    let _ = member
        .user
        .clone()
        .direct_message(
            ctx.http(),
            serenity::CreateMessage::new().content(
                t("kick_message_to_the_banned_member")
                    .replace("${interaction.guild.name}", &guild_name)
                    .replace("${interaction.member.user.username}", &ctx.author().name),
            ),
        )
        .await;
    let audit = format!("Kicked by: {} | Reason: {reason}", ctx.author().name);
    if guild_id
        .kick_with_reason(ctx.http(), user.id, &audit)
        .await
        .is_err()
    {
        ctx.say(t("setrankroles_command_error").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    ctx.say(
        crate::lang::get(&code, "kick_command_work")
            .map(|s| {
                s.replace("${member.user}", &user.to_string())
                    .replace("${interaction.user}", &ctx.author().to_string())
            })
            .unwrap_or_else(|| format!("Kicked {}", user.tag())),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("kick_logs_embed_title"),
        t("kick_logs_embed_description")
            .replace("${member.user}", &user.to_string())
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
    )
    .await;
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
    #[description = "Duration (e.g. 10m, 1h, 7d)"] duration: String,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Human durations like TS timeCalculator; invalid -> invalid-time text.
    let mut ms = crate::funcs::time_ms(&duration) as i64;
    if ms <= 0 {
        ctx.say(t("too_new_account_invalid_time_on_enable")).await?;
        return Ok(());
    }
    // 28-day clamp with the TS overflow note.
    let mut overflow = false;
    if ms > TIMEOUT_MAX_MS {
        ms = TIMEOUT_MAX_MS;
        overflow = true;
    }
    let pretty = crate::funcs::beautiful_ms(ms as f64);
    let reason_s = reason.clone().unwrap_or_else(|| t("var_no_set"));
    let no = emoji(&ctx, "No", "❌").await;
    let vc = emoji(&ctx, "VC_OpenChat", "💬").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.moderate_members() {
            ctx.say(
                t("tempmute_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(mut member) = member else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    if member_is_admin(&ctx, guild_id, &member) {
        ctx.say(t("tempmute_tomute_is_admin").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    if let Some(target_pos) = target_top(&ctx, guild_id, user.id).await {
        let author_id = ctx.author().id.get();
        let (bot_top, author_top, owner) = guards
            .as_ref()
            .map(|g| (g.bot_top, g.author_top, g.owner_id))
            .unwrap_or((u16::MAX, u16::MAX, author_id));
        if target_pos >= bot_top && owner != author_id {
            ctx.say(
                t("tempmute_tomute_highest_role_or_same")
                    .replace("${client.iHorizon_Emojis.No}", &no)
                    .replace("${tomute.toString()}", &user.to_string()),
            )
            .await?;
            return Ok(());
        }
        if owner != author_id && target_pos >= author_top {
            ctx.say(
                t("tempmute_cannot_mute_higher_role")
                    .replace("${client.iHorizon_Emojis.No}", &no)
                    .replace("${tomute.toString()}", &user.to_string()),
            )
            .await?;
            return Ok(());
        }
    }
    if user.id == ctx.author().id {
        ctx.say(t("tempmute_cannot_mute_yourself").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    if member.communication_disabled_until.is_some() {
        ctx.say(t("tempmute_already_muted")).await?;
        return Ok(());
    }
    let until = serenity::Timestamp::from_unix_timestamp(crate::bot::now_ms() / 1000 + ms / 1000)?;
    // Audit reason carried on the edit; silent catch like TS.
    let _ = guild_id
        .edit_member(
            ctx.http(),
            user.id,
            serenity::builder::EditMember::new()
                .disable_communication_until_datetime(until)
                .audit_log_reason(&t("tempmute_logs_embed_title")),
        )
        .await;
    member.communication_disabled_until = Some(until);
    let mut content = t("tempmute_command_work")
        .replace("${tomute.id}", &user.id.get().to_string())
        .replace("${ms(ms(mutetime))}", &pretty)
        .replace("${reason}", &reason_s);
    if overflow {
        content += &t("tempmute_tomute_max_time_passed")
            .replace("${client.iHorizon_Emojis.VC_OpenChat}", &vc);
    }
    ctx.say(content).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("tempmute_logs_embed_title"),
        t("tempmute_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string())
            .replace("${ms(ms(mutetime))}", &pretty)
            .replace("${reason}", &reason_s),
    )
    .await;
    // Mute warn (mirrors !tempmute.ts warnMember call with the mute
    // description as reason).
    if let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) {
        let pool = &ctx.data().pool;
        let lang_code = code.clone();
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let reason_text = text("tempmute_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string())
            .replace("${ms(ms(mutetime))}", &pretty)
            .replace("${reason}", &reason_s);
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
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
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
    if let Some(guild_id) = ctx.guild_id() {
        post_mod_log(
            ctx.http(),
            guild_id,
            t("warn_logEmbed_title"),
            t("warn_logEmbed_desc")
                .replace(
                    "${interaction.member.toString()}",
                    &ctx.author().to_string(),
                )
                .replace("${member?.toString()}", &user.to_string())
                .replace("${reason}", &reason),
        )
        .await;
    }
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
    let warns = load_warns(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    // TS splits empty-list vs bad-id into two messages; mirror exactly.
    if warns.is_empty() {
        ctx.say(
            t("unwarn_cannot_found")
                .replace("${client.iHorizon_Emojis.No}", &no)
                .replace("${member?.toString()}", &user.to_string()),
        )
        .await?;
        return Ok(());
    }
    let (next, removed) = remove_warn(warns, &warn_id);
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
        if let Some(guild_id) = ctx.guild_id() {
            post_mod_log(
                ctx.http(),
                guild_id,
                t("unwarn_logEmbed_title"),
                t("unwarn_logEmbed_desc")
                    .replace(
                        "${interaction.member.toString()}",
                        &ctx.author().to_string(),
                    )
                    .replace("${member?.toString()}", &user.to_string()),
            )
            .await;
        }
    } else {
        ctx.say(
            crate::lang::get(&code, "unwarn_cannot_found_id")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        // TS interpolates the invoker here, not the target.
                        .replace("${member?.toString()}", &ctx.author().to_string())
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
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let warns = load_warns(&ctx.data().pool, &gid, user.id.get()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if warns.is_empty() {
        let no = emoji(&ctx, "No", "❌").await;
        ctx.say(
            crate::lang::get(&code, "warnlist_no_data")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        .replace("${member?.toString()}", &user.to_string())
                })
                .unwrap_or_else(|| "No warns.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Plain-text pages (5 per page like TS); page state only, no collectors.
    let (start, end, pages) = paginate(warns.len(), LIST_PAGE_SIZE, page.unwrap_or(1));
    let cur = start / LIST_PAGE_SIZE + 1;
    let name = user
        .global_name
        .clone()
        .unwrap_or_else(|| user.name.clone());
    let title = t("warnlist_embed_title")
        .replace("${member?.user.globalName}", &name)
        .replace(
            "${i / usersPerPage + 1}",
            &((start / LIST_PAGE_SIZE) + 1).to_string(),
        );
    let unknown = t("var_unknown");
    let body = warns[start..end]
        .iter()
        .map(|w| {
            t("warnlist_embed_desc")
                .replace("${x.id}", &w.id)
                .replace(
                    "${format(x.timestamp, 'DD/MM/YYYY')}",
                    &crate::funcs::format_date(w.at / 1000, "DD/MM/YYYY"),
                )
                .replace("${x.authorID}", &unknown)
                .replace("${x.reason}", &w.reason)
        })
        .collect::<Vec<_>>()
        .join("\n");
    ctx.say(format!("{title} ({cur}/{pages})\n{body}")).await?;
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
    #[description = "Only this member's messages"] member: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let channel_id = ctx.channel_id();
    // TS adds +1 to cover the invoking message, capped at 100.
    let want = amount.saturating_add(1).clamp(1, 100) as usize;
    let cutoff = crate::bot::now_ms() - BULK_DELETE_MAX_AGE_MS;
    let mut collected: Vec<serenity::Message> = vec![];
    // Member filter scans back through history like findMessagesByAuthor.
    let mut before: Option<serenity::MessageId> = None;
    for _ in 0..10 {
        let mut q = serenity::GetMessages::new().limit(100);
        if let Some(b) = before {
            q = q.before(b);
        }
        let batch = channel_id.messages(ctx.http(), q).await?;
        if batch.is_empty() {
            break;
        }
        before = batch.last().map(|m| m.id);
        for m in batch {
            if let Some(u) = &member {
                if m.author.id != u.id {
                    continue;
                }
            }
            // 14-day bulk-delete filter.
            if m.timestamp.unix_timestamp() * 1000 <= cutoff {
                continue;
            }
            collected.push(m);
            if collected.len() >= want {
                break;
            }
        }
        if collected.len() >= want {
            break;
        }
        if member.is_none() {
            break;
        }
    }
    if collected.is_empty() {
        ctx.say(t("clear_command_no_message")).await?;
        return Ok(());
    }
    let ids: Vec<serenity::MessageId> = collected.iter().map(|m| m.id).collect();
    // TS surfaces the raw error text on failure.
    if let Err(e) = if ids.len() == 1 {
        channel_id
            .delete_message(ctx.http(), ids[0])
            .await
            .map(|_| ())
    } else {
        channel_id.delete_messages(ctx.http(), &ids).await
    } {
        ctx.say(e.to_string()).await?;
        return Ok(());
    }
    let n = ids.len();
    let handle = ctx
        .say(t("clear_confirmation_message").replace("${messages.size}", &n.to_string()))
        .await?;
    // Auto-delete the confirmation after 5s like afterSent.
    if let Ok(sent) = handle.into_message().await {
        let http = ctx.serenity_context().http.clone();
        let invoker = match ctx {
            poise::Context::Prefix(p) => Some(p.msg.id),
            _ => None,
        };
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            let _ = channel_id.delete_message(&*http, sent.id).await;
            if let Some(inv) = invoker {
                let _ = channel_id.delete_message(&*http, inv).await;
            }
        });
    }
    if let Some(guild_id) = ctx.guild_id() {
        post_mod_log(
            ctx.http(),
            guild_id,
            t("clear_logs_embed_title"),
            t("clear_logs_embed_description")
                .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
                .replace("${messages.size}", &n.to_string())
                .replace("${interaction.channel.id}", &channel_id.get().to_string()),
        )
        .await;
    }
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
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mut ms = crate::funcs::time_ms(&duration) as i64;
    if ms <= 0 {
        ctx.say(t("too_new_account_invalid_time_on_enable")).await?;
        return Ok(());
    }
    // 1-year clamp with the TS overflow note.
    let mut overflow = false;
    if ms > YEAR_MAX_MS {
        ms = YEAR_MAX_MS;
        overflow = true;
    }
    let pretty = crate::funcs::beautiful_ms(ms as f64);
    let reason_s = reason.clone().unwrap_or_else(|| t("var_no_set"));
    let no = emoji(&ctx, "No", "❌").await;
    let vc = emoji(&ctx, "VC_OpenChat", "💬").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.manage_roles() {
            ctx.say(
                t("temprole_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(member) = member else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    let author_id = ctx.author().id.get();
    let (bot_top, owner) = guards
        .as_ref()
        .map(|g| (g.bot_top, g.owner_id))
        .unwrap_or((u16::MAX, author_id));
    if let Some(target_pos) = target_top(&ctx, guild_id, user.id).await {
        if target_pos >= bot_top && owner != author_id {
            ctx.say(
                t("temprole_tomute_highest_role_or_same")
                    .replace("${client.iHorizon_Emojis.No}", &no)
                    .replace("${tomute.toString()}", &user.to_string()),
            )
            .await?;
            return Ok(());
        }
    }
    // The role itself must sit below the bot's top role.
    if role.position >= bot_top && owner != author_id {
        ctx.say(t("temprole_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let gid = guild_id.get().to_string();
    let already = member.roles.contains(&role.id)
        || crate::db::kv_get(
            &ctx.data().pool,
            &gid,
            &temprole_key(user.id.get(), role.id.get()),
        )
        .await
        .is_some();
    if already {
        ctx.say(t("temprole_already_has_role")).await?;
        return Ok(());
    }
    member.add_role(ctx.http(), role.id).await?;
    let exp = crate::commands::shared::now_ms() + ms;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &temprole_key(user.id.get(), role.id.get()),
        &serde_json::json!({"expires_at_ms": exp}).to_string(),
    )
    .await?;
    let mut content = t("temprole_command_work")
        .replace("${tomute.id}", &user.id.get().to_string())
        .replace("${ms(ms(mutetime))}", &pretty)
        .replace("${reason}", &reason_s);
    if overflow {
        content += &t("temprole_tomute_max_time_passed")
            .replace("${client.iHorizon_Emojis.VC_OpenChat}", &vc);
    }
    ctx.say(content).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("temprole_logs_embed_title"),
        t("temprole_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string())
            .replace("${ms(ms(mutetime))}", &pretty)
            .replace("${reason}", &reason_s),
    )
    .await;
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
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mut ms = crate::funcs::time_ms(&duration) as i64;
    if ms <= 0 {
        ctx.say(t("too_new_account_invalid_time_on_enable")).await?;
        return Ok(());
    }
    // 1-year clamp with the TS overflow note.
    let mut overflow = false;
    if ms > YEAR_MAX_MS {
        ms = YEAR_MAX_MS;
        overflow = true;
    }
    let pretty = crate::funcs::beautiful_ms(ms as f64);
    let reason_s = reason.clone().unwrap_or_else(|| t("var_no_set"));
    let no = emoji(&ctx, "No", "❌").await;
    let vc = emoji(&ctx, "VC_OpenChat", "💬").await;
    let guards = guard_data(&ctx, guild_id).await;
    if let Some(g) = &guards {
        if !g.bot_perms.ban_members() {
            ctx.say(
                t("tempban_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    // In-guild hierarchy + admin guards (skipped for non-members like TS).
    if let Ok(in_guild) = guild_id.member(ctx.http(), user.id).await {
        let author_id = ctx.author().id.get();
        let (bot_top, owner) = guards
            .as_ref()
            .map(|g| (g.bot_top, g.owner_id))
            .unwrap_or((u16::MAX, author_id));
        if let Some(target_pos) = target_top(&ctx, guild_id, user.id).await {
            if target_pos >= bot_top && owner != author_id {
                ctx.say(
                    t("tempban_user_highest_role_or_same")
                        .replace("${client.iHorizon_Emojis.No}", &no)
                        .replace("${user.toString()}", &user.to_string()),
                )
                .await?;
                return Ok(());
            }
        }
        if member_is_admin(&ctx, guild_id, &in_guild) {
            ctx.say(t("tempban_user_is_admin").replace("${client.iHorizon_Emojis.No}", &no))
                .await?;
            return Ok(());
        }
    }
    let gid = guild_id.get().to_string();
    // Mirrors tempbanManager.isAlreadyBanned.
    if crate::db::kv_get(&ctx.data().pool, &gid, &tempban_key(user.id.get()))
        .await
        .is_some()
    {
        ctx.say(t("tempban_already_banned")).await?;
        return Ok(());
    }
    let by = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    if guild_id
        .ban_with_reason(
            ctx.http(),
            user.id,
            0,
            &format!("Tempbanned by: {by} | Reason: {reason_s}"),
        )
        .await
        .is_err()
    {
        ctx.say(t("tempban_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let exp = crate::commands::shared::now_ms() + ms;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &tempban_key(user.id.get()),
        &serde_json::json!({"expires_at_ms": exp, "reason": reason_s}).to_string(),
    )
    .await?;
    // Beautified duration in the reply, like TS to_beautiful_string.
    let mut content = t("tempban_command_work")
        .replace("${user.id}", &user.id.get().to_string())
        .replace("${duration}", &pretty)
        .replace("${reason}", &reason_s);
    if overflow {
        content +=
            &t("tempban_max_time_passed").replace("${client.iHorizon_Emojis.VC_OpenChat}", &vc);
    }
    ctx.say(content).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("tempban_logs_embed_title"),
        t("tempban_logs_embed_description")
            .replace("${executor.id}", &ctx.author().id.get().to_string())
            .replace("${user.id}", &user.id.get().to_string())
            .replace("${duration}", &pretty)
            .replace("${reason}", &reason_s),
    )
    .await;
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

/// Lock a channel (deny SendMessages + Connect). Mirrors !lock.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lock",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_lock(
    ctx: Ctx<'_>,
    #[description = "Role to lock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some(current) = ctx.guild_channel().await else {
        return Ok(());
    };
    let target = role
        .map(|r| r.id)
        .unwrap_or_else(|| serenity::RoleId::new(guild_id.get()));
    // TS denies both SendMessages and Connect.
    let _ = current
        .id
        .create_permission(
            ctx.http(),
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::empty(),
                deny: serenity::Permissions::SEND_MESSAGES | serenity::Permissions::CONNECT,
                kind: serenity::PermissionOverwriteType::Role(target),
            },
        )
        .await;
    let author_id = ctx.author().id.get().to_string();
    ctx.say(
        crate::lang::get(&code, "lock_embed_message_description")
            .map(|s| s.replace("${interaction.user.id}", &author_id))
            .unwrap_or_else(|| "Channel locked.".to_string()),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("lock_logs_embed_title"),
        t("lock_logs_embed_description")
            .replace("${interaction.user.id}", &author_id)
            .replace("${interaction.channel.id}", &current.id.get().to_string()),
    )
    .await;
    Ok(())
}

/// Unlock a channel. Mirrors !unlock.ts: neutral overwrite, not delete.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_unlock(
    ctx: Ctx<'_>,
    #[description = "Role to unlock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some(current) = ctx.guild_channel().await else {
        return Ok(());
    };
    let target = role
        .map(|r| r.id)
        .unwrap_or_else(|| serenity::RoleId::new(guild_id.get()));
    // TS writes {SendMessages: null, Connect: null}; an empty PUT
    // overwrite is the equivalent neutral state.
    let _ = current
        .id
        .create_permission(
            ctx.http(),
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::empty(),
                deny: serenity::Permissions::empty(),
                kind: serenity::PermissionOverwriteType::Role(target),
            },
        )
        .await;
    ctx.say(
        crate::lang::get(&code, "unlock_embed_message_description")
            .unwrap_or_else(|| "Channel unlocked.".to_string()),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unlock_logs_embed_title"),
        t("unlock_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${interaction.channel.id}", &current.id.get().to_string()),
    )
    .await;
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
    #[description = "Member the panel is for (default yourself)"] member: Option<serenity::User>,
    #[description = "Role 1"] role1: serenity::Role,
    #[description = "Role 2"] role2: Option<serenity::Role>,
    #[description = "Role 3"] role3: Option<serenity::Role>,
    #[description = "Role 4"] role4: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Member targeting: TS defaults the panel target to the author.
    let target = member.unwrap_or_else(|| ctx.author().clone());
    let all: Vec<serenity::Role> = [Some(role1), role2, role3, role4]
        .into_iter()
        .flatten()
        .collect();
    // Role validation with a refused list. Mirrors getRefusedRoleReason.
    let guards = guard_data(&ctx, guild_id).await;
    let author_id = ctx.author().id.get();
    let (bot_top, author_top, owner) = guards
        .as_ref()
        .map(|g| (g.bot_top, g.author_top, g.owner_id))
        .unwrap_or((u16::MAX, u16::MAX, author_id));
    let mut valid: Vec<serenity::Role> = vec![];
    let mut refused: Vec<String> = vec![];
    for r in all {
        match rolepanel_refused_reason(&r, guild_id, bot_top, author_top, author_id, owner, &t) {
            Some(why) => refused.push(format!("<@&{}>: {why}", r.id.get())),
            None => valid.push(r),
        }
    }
    if valid.is_empty() {
        ctx.say(t("rolepanel_setup_no_roles")).await?;
        return Ok(());
    }
    let buttons: Vec<serenity::CreateButton> = valid
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

    let guild_channel = channel.id().to_channel(ctx.http()).await?;
    let target_ch = guild_channel.guild().expect("guild channel only");
    let posted = target_ch
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new()
                .content(format!("{}\n{}", t("rolepanel_panel_embed_desc"), target))
                .components(rows),
        )
        .await?;
    let mut confirm = t("rolepanel_setup_saved");
    if !refused.is_empty() {
        confirm += &format!(
            "\n{}",
            t("rolepanel_apply_refused").replace("${roles}", &refused.join(", "))
        );
    }
    ctx.say(confirm).await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("rolepanel_logs_embed_title_create"),
        t("rolepanel_logs_embed_desc_create")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${message.id}", &posted.id.get().to_string())
            .replace(
                "${roles}",
                &valid
                    .iter()
                    .map(|r| format!("<@&{}>", r.id.get()))
                    .collect::<Vec<_>>()
                    .join(", "),
            ),
    )
    .await;
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
    // Validate the role before toggling (managed/everyone + bot hierarchy).
    let roles = guild_id.roles(&ctx.http).await.unwrap_or_default();
    let Some(role) = roles.get(&role_id) else {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content("Role not found.")
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    };
    let bot_id = ctx.cache.current_user().id;
    let bot_top = guild_id
        .member(&ctx.http, bot_id)
        .await
        .ok()
        .map(|m| top_of(&roles, &m.roles))
        .unwrap_or(u16::MAX);
    if role.id.get() == guild_id.get() || role.managed || bot_top <= role.position {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(format!("<@&{}>: refused.", role.id.get()))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
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
                .content(if has {
                    format!("Roles removed: <@&{}>", role_id.get())
                } else {
                    format!("Roles added: <@&{}>", role_id.get())
                })
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

/// Unban a user by id.
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
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    if let Some(g) = guard_data(&ctx, guild_id).await {
        if !g.bot_perms.ban_members() {
            ctx.say(
                t("unban_bot_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    let reason_s = reason.unwrap_or_else(|| t("unban_reason"));
    let Ok(uid) = user_id.trim().parse::<u64>() else {
        ctx.say(t("msg_bad_user_id")).await?;
        return Ok(());
    };
    // Fetch-first flow: nobody-banned branch, then not-banned branch.
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    if bans.is_empty() {
        ctx.say(t("unban_there_is_nobody_banned").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    if !bans.iter().any(|b| b.user.id.get() == uid) {
        ctx.say(t("unban_the_member_is_not_banned").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    // Audit reason carried on the unban, best-effort like TS.
    let _ = ctx
        .http()
        .remove_ban(guild_id, serenity::UserId::new(uid), Some(&reason_s))
        .await;
    // Clear any tempban row for the user.
    let gid = guild_id.get().to_string();
    let _ = crate::db::kv_del(&ctx.data().pool, &gid, &tempban_key(uid)).await;
    ctx.say(t("unban_is_now_unbanned").replace("${userID}", &uid.to_string()))
        .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unban_logs_embed_title"),
        t("unban_logs_embed_description")
            .replace("${userID}", &uid.to_string())
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
    )
    .await;
    Ok(())
}

/// Show ban info for a user.
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
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Ok(uid) = user_id.trim().parse::<u64>() else {
        ctx.say(t("baninfo_user_not_found")).await?;
        return Ok(());
    };
    let ban = guild_id
        .get_ban(ctx.http(), serenity::UserId::new(uid))
        .await
        .unwrap_or(None);
    let Some(ban) = ban else {
        ctx.say(t("baninfo_not_banned")).await?;
        return Ok(());
    };
    // Executor + date from the MemberBanAdd audit log entry.
    let mut executor = t("var_unknown");
    let mut when = crate::bot::now_ms() / 1000;
    if let Ok(logs) = guild_id
        .audit_logs(
            ctx.http(),
            Some(serenity::model::guild::audit_log::Action::Member(
                serenity::model::guild::audit_log::MemberAction::BanAdd,
            )),
            None,
            None,
            Some(100),
        )
        .await
    {
        if let Some(entry) = logs
            .entries
            .iter()
            .find(|e| e.target_id.map(|g| g.get()) == Some(uid))
        {
            when = entry.id.created_at().unix_timestamp();
            executor = logs
                .users
                .get(&entry.user_id)
                .map(|u| u.tag())
                .unwrap_or_else(|| t("var_unknown"));
        }
    }
    let name = ban
        .user
        .global_name
        .clone()
        .unwrap_or_else(|| ban.user.name.clone());
    let avatar = ban.user.avatar_url().unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("{}: {name}", t("baninfo_ban_info")))
        .colour(serenity::Colour::from_rgb(79, 219, 18))
        .description(format!(
            "> **{}:** <t:{when}:F>\n> **{}:** {executor}\n> **{}:** {}",
            t("var_ban_date"),
            t("var_banned_by"),
            t("var_reason"),
            ban.reason.unwrap_or_else(|| t("blacklist_var_no_reason")),
        ));
    if !avatar.is_empty() {
        embed = embed.thumbnail(avatar);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// List banned members.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "banlist",
    aliases("bans", "listban", "listbans", "banlists"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn mod_banlist(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if bans.is_empty() {
        ctx.say(t("var_no_one_banned")).await?;
        return Ok(());
    }
    let (start, end, pages) = paginate(bans.len(), LIST_PAGE_SIZE, page.unwrap_or(1));
    let cur = start / LIST_PAGE_SIZE + 1;
    let body = bans[start..end]
        .iter()
        .map(|b| {
            format!(
                "[{}](https://discord.com/users/{}) ({})",
                b.user.id.get(),
                b.user.id.get(),
                b.user
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    ctx.say(format!(
        "{title} ({cur}/{pages})\n{body}",
        title = t("var_banned_user")
    ))
    .await?;
    Ok(())
}

/// List muted members.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "mutelist",
    aliases("allmute", "allmutes", "alltimeout", "alltimeouts"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_mutelist(
    ctx: Ctx<'_>,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let muted: Vec<(String, i64)> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.communication_disabled_until.is_some())
                .map(|m| {
                    let remaining = m
                        .communication_disabled_until
                        .map(|until| (until.unix_timestamp() * 1000 - crate::bot::now_ms()).max(0))
                        .unwrap_or(0);
                    (m.user.to_string(), remaining)
                })
                .collect()
        })
        .unwrap_or_default();
    if muted.is_empty() {
        ctx.say(t("prevnames_undetected")).await?;
        return Ok(());
    }
    let (start, end, pages) = paginate(muted.len(), LIST_PAGE_SIZE, page.unwrap_or(1));
    let cur = start / LIST_PAGE_SIZE + 1;
    let body = muted[start..end]
        .iter()
        .map(|(mention, remaining)| {
            format!(
                "{mention} - `{}`",
                crate::funcs::beautiful_ms(*remaining as f64)
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    ctx.say(format!("({cur}/{pages})\n{body}")).await?;
    Ok(())
}

/// Unmute a member.
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    // TS checks ManageRoles on the bot here.
    if let Some(g) = guard_data(&ctx, guild_id).await {
        if !g.bot_perms.manage_roles() {
            ctx.say(
                t("unmute_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
    if user.id == ctx.author().id {
        ctx.say(t("unmute_attempt_mute_your_self").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let member = guild_id.member(ctx.http(), user.id).await.ok();
    let Some(mut member) = member else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    if member.communication_disabled_until.is_none() {
        ctx.say(t("unmute_not_muted")).await?;
        return Ok(());
    }
    // Fire-and-forget like the TS un-awaited disableCommunicationUntil.
    let _ = member.enable_communication(ctx.http()).await;
    ctx.say(t("unmute_command_work").replace("${tomute.id}", &user.id.get().to_string()))
        .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unmute_logs_embed_title"),
        t("unmute_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${tomute.id}", &user.id.get().to_string()),
    )
    .await;
    Ok(())
}

/// Unmute all timed-out members.
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = emoji(&ctx, "No", "❌").await;
    if let Some(g) = guard_data(&ctx, guild_id).await {
        if !g.bot_perms.manage_roles() {
            ctx.say(
                t("unmute_i_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    }
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
    if ids.is_empty() {
        ctx.say(t("unmuteall_no_muted_members")).await?;
        return Ok(());
    }
    let total = ids.len();
    let audit = t("unmuteall_audit_reason");
    let mut unmuted = 0;
    for uid in ids {
        if guild_id
            .edit_member(
                ctx.http(),
                uid,
                serenity::builder::EditMember::new()
                    .enable_communication()
                    .audit_log_reason(&audit),
            )
            .await
            .is_ok()
        {
            unmuted += 1;
        }
    }
    ctx.say(
        t("unmuteall_command_work")
            .replace("${unmuted}", &unmuted.to_string())
            .replace("${total}", &total.to_string()),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unmuteall_logs_embed_title"),
        t("unmuteall_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${unmuted}", &unmuted.to_string())
            .replace("${total}", &total.to_string()),
    )
    .await;
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

/// Lock or unlock all text channels.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lock-all",
    aliases("lockall"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_lock_all(
    ctx: Ctx<'_>,
    #[description = "Role to lock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, false, role).await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock-all",
    aliases("unlockall"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_unlock_all(
    ctx: Ctx<'_>,
    #[description = "Role to unlock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, true, role).await
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
