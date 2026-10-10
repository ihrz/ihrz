// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/bot.ts (intents/partials/cache) + src/index.ts (sharding)
// + src/core/commandsSync.ts (slash registration via poise).

use crate::{commands, config::Config, db::Pool};
use poise::serenity_prelude as serenity;
use std::sync::Arc;

/// Prefix arg UX (required-count, longString tail merge,
/// attachment-required gate, caret usage-error embed). Declared here via
/// path attribute so the port stays within this file's scope: pure
/// policy in prefix_args.rs, Discord hooks below.
#[path = "prefix_args.rs"]
pub mod prefix_args;

pub struct Data {
    pub pool: Pool,
    pub config: Arc<Config>,
    /// Command file log. Mirrors the SafeJSONLogger shared by the TS
    /// message + slash handlers; the prefix leg logs here (pre-command
    /// hook), the slash leg in events_handler::log_slash_command.
    pub slashlog: Arc<crate::slashlog::SlashLog>,
}

/// Current unix millis. Mirrors Date.now() in the executor guards.
pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub type Ctx<'a> = poise::Context<'a, Data, anyhow::Error>;

/// Shared cooldown/rate-limit store. Mirrors the TS `temp` table
/// (tempTable in Events/client/ready.ts): the 1s debounce
/// (`COOLDOWN.<uid>` slash, `COOLDOWN.msg_commands.<uid>` prefix via
/// helper.cooldown), per-command cooldowns
/// (`COOLDOWN.<commandPath>.<uid>` via helper.cooldown, see
/// checkGlobalCooldown), and the COMMAND_LIMITS sliding windows
/// (`COMMAND_LIMITS.<gid>.<path>.<uid>`). Backed by the shared sqlite
/// kv store under the `temp` scope so every shard/process observes the
/// same timestamps; replaces the former process-local
/// `Mutex<Cooldowns>` / `Mutex<RateLimits>`.
const TEMP_SCOPE: &str = "temp";

/// Anti-spam debounce. Mirrors RATE_LIMIT_DEBOUNCE_MS.
const DEBOUNCE_MS: i64 = 1000;

/// Slash debounce key. Mirrors interactionCooldown
/// (`COOLDOWN.${interaction.user.id}`).
pub fn debounce_key(user_id: u64) -> String {
    format!("COOLDOWN.{user_id}")
}

/// helper.cooldown key. Mirrors `COOLDOWN.${method}.${authorId}`: the
/// prefix debounce uses method `msg_commands`, per-command cooldowns
/// use the command path as method (see checkGlobalCooldown).
pub fn helper_cooldown_key(method: &str, author_id: &str) -> String {
    format!("COOLDOWN.{method}.{author_id}")
}

/// Sliding-window key. Mirrors
/// `COMMAND_LIMITS.${gid}.${commandPath}.${uid}`.
pub fn rate_limit_key(guild_id: u64, path: &str, user_id: u64) -> String {
    format!("COMMAND_LIMITS.{guild_id}.{path}.{user_id}")
}

/// Remaining ms of a fixed cooldown window; 0 = allowed. Mirrors the
/// `ms - (now - last) > 0` guard shared by interactionCooldown and
/// helper.cooldown.
pub fn cooldown_remaining(last: Option<i64>, window_ms: i64, now_ms: i64) -> i64 {
    match last {
        Some(stamp) if window_ms - (now_ms - stamp) > 0 => window_ms - (now_ms - stamp),
        _ => 0,
    }
}

/// Slide a COMMAND_LIMITS window to now. Mirrors checkCommandRateLimit
/// exactly: entries with `now - t < windowMs` stay active (insertion
/// order, so index 0 is the oldest); at `count` active attempts the
/// caller is denied with `windowMs - (now - oldest)` left and nothing
/// is stored, otherwise now is pushed and the window stored. Returns
/// (attempts to store, remaining ms; 0 = allowed).
pub fn rate_limit_step(
    attempts: &[i64],
    count: u32,
    window_ms: i64,
    now_ms: i64,
) -> (Vec<i64>, i64) {
    if count == 0 || window_ms <= 0 {
        return (attempts.to_vec(), 0);
    }
    let mut active: Vec<i64> = attempts
        .iter()
        .copied()
        .filter(|t| now_ms - *t < window_ms)
        .collect();
    if active.len() >= count as usize {
        let remaining = (window_ms - (now_ms - active[0])).max(0);
        return (active, remaining);
    }
    active.push(now_ms);
    (active, 0)
}

/// Raw temp-scope timestamp. A missing entry — or a falsy stored zero —
/// yields None, mirroring `tempTable.get(...) || null`.
async fn temp_get_i64(pool: &Pool, key: &str) -> Option<i64> {
    crate::db::kv_get(pool, TEMP_SCOPE, key)
        .await
        .and_then(|s| s.parse::<i64>().ok())
        .filter(|&v| v != 0)
}

async fn temp_set(pool: &Pool, key: &str, value: &str) {
    let _ = crate::db::kv_set(pool, TEMP_SCOPE, key, value).await;
}

/// Slash 1s debounce remaining; 0 = allowed and recorded. Mirrors
/// interactionCooldown (denied runs store nothing).
pub async fn debounce_check(pool: &Pool, user_id: u64, now_ms: i64) -> i64 {
    let key = debounce_key(user_id);
    let left = cooldown_remaining(temp_get_i64(pool, &key).await, DEBOUNCE_MS, now_ms);
    if left == 0 {
        temp_set(pool, &key, &now_ms.to_string()).await;
    }
    left
}

/// helper.cooldown mirror: the prefix `msg_commands` debounce and the
/// per-command cooldowns (command path as method). Returns remaining
/// ms; 0 = allowed and recorded.
pub async fn helper_cooldown_check(
    pool: &Pool,
    author_id: &str,
    method: &str,
    ms: i64,
    now_ms: i64,
) -> i64 {
    let key = helper_cooldown_key(method, author_id);
    let left = cooldown_remaining(temp_get_i64(pool, &key).await, ms, now_ms);
    if left == 0 {
        temp_set(pool, &key, &now_ms.to_string()).await;
    }
    left
}

/// COMMAND_LIMITS sliding-window remaining; 0 = allowed and recorded.
/// Denied runs store nothing, mirroring checkCommandRateLimit.
pub async fn command_rate_limit_check(
    pool: &Pool,
    guild_id: u64,
    path: &str,
    user_id: u64,
    count: u32,
    window_ms: i64,
    now_ms: i64,
) -> i64 {
    if count == 0 || window_ms <= 0 {
        return 0;
    }
    let key = rate_limit_key(guild_id, path, user_id);
    let stored: Vec<i64> = crate::db::kv_get(pool, TEMP_SCOPE, &key)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let (active, left) = rate_limit_step(&stored, count, window_ms, now_ms);
    if left == 0 {
        temp_set(
            pool,
            &key,
            &serde_json::to_string(&active).unwrap_or_default(),
        )
        .await;
    }
    left
}

/// Global command gate. Mirrors commandExecutor.ts guards +
/// blacklistTable + UTILS.PERMS custom levels.
fn global_check(
    ctx: poise::Context<'_, Data, anyhow::Error>,
) -> poise::BoxFuture<'_, Result<bool, anyhow::Error>> {
    Box::pin(async move {
        let pool = &ctx.data().pool;
        if crate::db::is_blacklisted(pool, ctx.author().id.get()).await {
            return Ok(false);
        }
        let name = ctx.command().name.clone();
        // Slash-command usage log (mirrors slashCommandLogger.ts).
        if let Some(gid) = ctx.guild_id() {
            let gid = gid.get().to_string();
            if let Some(ch) = crate::db::kv_get(pool, &gid, "GUILD.SERVER_LOGS.command").await {
                if let Ok(ch_id) = ch.parse::<u64>() {
                    let _ = poise::serenity_prelude::ChannelId::new(ch_id)
                        .say(
                            &ctx.serenity_context().http,
                            format!("/{} by {}.", name, ctx.author().tag()),
                        )
                        .await;
                }
            }
        }
        // Fun kill-switch (mirrors GUILD.FUN.states check in commandExecutor).
        // The config command itself stays available.
        if ctx.command().category.as_deref() == Some("fun")
            && name != "config"
            && !crate::commands::fun::fun_enabled(pool, ctx.guild_id().map(|g| g.get())).await
        {
            return Ok(false);
        }
        if let Some(perms) = crate::commands::guildconfig::load_cmd_perms(
            pool,
            &ctx.guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default(),
            &name,
        )
        .await
        {
            let member_roles: Vec<u64> = ctx
                .author_member()
                .await
                .map(|m| m.roles.iter().map(|r| r.get()).collect())
                .unwrap_or_default();
            let gid = ctx
                .guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let user_level: u8 = crate::db::kv_get(
                pool,
                &gid,
                &format!("UTILS.USER_PERMS.{}", ctx.author().id.get()),
            )
            .await
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
            // Role-hierarchy level (Perm 1-9 roles). Mirrors
            // checkRoleHierarchy: the effective level is the max.
            let roles_map: std::collections::HashMap<String, String> =
                crate::db::kv_get(pool, &gid, "UTILS.roles")
                    .await
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            let user_level = user_level.max(crate::executor::role_level(&member_roles, &roles_map));
            if !crate::executor::check_cmd_access(
                ctx.author().id.get(),
                &member_roles,
                user_level,
                &perms,
            ) {
                return Ok(false);
            }
        }
        // Global 1s debounce. Mirrors preExecutionCooldown (slash
        // COOLDOWN.<uid> + message "msg_commands" helper cooldown):
        // denied runs get lang.Msg_cooldown and never execute.
        let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
        let uid = ctx.author().id.get();
        let now = now_ms();
        // Slash uses COOLDOWN.<uid> (interactionCooldown), prefix uses
        // COOLDOWN.msg_commands.<uid> (helper.cooldown), exactly like TS.
        let left = if matches!(ctx, poise::Context::Prefix(_)) {
            helper_cooldown_check(pool, &uid.to_string(), "msg_commands", DEBOUNCE_MS, now).await
        } else {
            debounce_check(pool, uid, now).await
        };
        if left > 0 {
            let msg = crate::lang::get(&code, "Msg_cooldown").unwrap_or_default();
            let _ = ctx
                .send(poise::CreateReply::default().content(msg).ephemeral(true))
                .await;
            return Ok(false);
        }
        // Per-command rate limits. Mirrors checkCommandRateLimit:
        // UTILS.COMMAND_LIMITS.<path> then <category> fallback, guild
        // owners bypass, denied runs get commandlimit_rate_limited.
        let path = ctx.command().qualified_name.clone();
        let raw = crate::db::kv_get(
            pool,
            &ctx.guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default(),
            "UTILS.COMMAND_LIMITS",
        )
        .await;
        let map: std::collections::HashMap<String, crate::commands::guildconfig::CommandLimit> =
            raw.and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
        let category = path.split(' ').next().unwrap_or(&path).to_string();
        let limit = map.get(&path).or_else(|| map.get(&category)).cloned();
        if let Some(limit) = limit {
            if limit.count > 0 && limit.window_ms > 0 {
                let bypass = match ctx.guild_id() {
                    Some(gid) => {
                        let owner = gid
                            .to_partial_guild(ctx.http())
                            .await
                            .map(|g| g.owner_id)
                            .unwrap_or_else(|_| ctx.author().id);
                        owner == ctx.author().id
                            || crate::db::kv_get(
                                pool,
                                &gid.get().to_string(),
                                &format!("GUILD.OWNER.{}", ctx.author().id.get()),
                            )
                            .await
                            .is_some()
                    }
                    None => false,
                };
                if !bypass {
                    let left = command_rate_limit_check(
                        pool,
                        ctx.guild_id().map(|g| g.get()).unwrap_or(0),
                        &path,
                        ctx.author().id.get(),
                        limit.count,
                        limit.window_ms,
                        now_ms(),
                    )
                    .await;
                    if left > 0 {
                        let msg = crate::lang::get(&code, "commandlimit_rate_limited")
                            .unwrap_or_default()
                            .replace("${time}", &crate::funcs::beautiful_ms(left as f64));
                        let _ = ctx
                            .send(poise::CreateReply::default().content(msg).ephemeral(true))
                            .await;
                        return Ok(false);
                    }
                }
            }
        }
        Ok(true)
    })
}
/// Pure crash-report helpers (unit-tested below). Mirror the TS
/// handleExecutionError admin flags (`yes`/`no`, missing -> `no`).
fn admin_flag(admin: bool) -> &'static str {
    if admin {
        "yes"
    } else {
        "no"
    }
}

/// Full slash invocation. Mirrors TS `/${commandPath}\n\n`.
fn slash_invocation(path: &str) -> String {
    format!("/{path}\n\n")
}

/// Guild-wide Administrator check (owner counts, like TS
/// `permissions.has(Administrator)`). Missing guild/member/cache data
/// falls back to false, mirroring the TS optional chaining.
#[allow(deprecated)]
async fn is_guild_admin(ctx: Ctx<'_>, user_id: serenity::UserId) -> bool {
    let Some(gid) = ctx.guild_id() else {
        return false;
    };
    let http = &ctx.serenity_context().http;
    let Ok(member) = gid.member(http, user_id).await else {
        return false;
    };
    member
        .permissions(&ctx.serenity_context().cache)
        .map(|p| p.administrator())
        .unwrap_or(false)
}

/// Crash reporter. Mirrors handleExecutionError in commandExecutor.ts:
/// only the slash leg gets a user-facing reply (plain, non-ephemeral),
/// and a report embed (timestamp + Bot/User-Admin + full invocation)
/// goes to config.core.reportChannelID.
async fn crash_block(ctx: Ctx<'_>, error_text: String) {
    let is_prefix = matches!(ctx, poise::Context::Prefix(_));
    let target_name = ctx.command().name.clone();
    let error_block = format!(
        "```TS\nMessage: The command ran into a problem!\nCommand Name: {target_name}\nError: {error_text}```\n"
    );
    if !is_prefix {
        let _ = ctx
            .send(poise::CreateReply::default().content(format!(
                "{error_block}**Let me suggest you to report this issue with `/report`.**"
            )))
            .await;
    }
    let channel_id: u64 = ctx.data().config.report_channel_id.parse().unwrap_or(0);
    if channel_id == 0 {
        return;
    }
    let bot_id = ctx.serenity_context().cache.current_user().id;
    let invocation = match ctx {
        poise::Context::Prefix(p) => p.msg.content.clone(),
        _ => slash_invocation(&ctx.command().qualified_name),
    };
    let embed = serenity::CreateEmbed::default()
        .title(if is_prefix {
            "MSG_CMD_CRASH_NOT_HANDLE"
        } else {
            "SLASH_CMD_CRASH_NOT_HANDLE"
        })
        .description(error_block)
        .timestamp(serenity::Timestamp::now())
        .field(
            "Bot Admin",
            admin_flag(is_guild_admin(ctx, bot_id).await),
            false,
        )
        .field(
            "User Admin",
            admin_flag(is_guild_admin(ctx, ctx.author().id).await),
            false,
        )
        .field("** **", invocation, false);
    let _ = serenity::ChannelId::new(channel_id)
        .send_message(
            ctx.serenity_context().http.clone(),
            serenity::CreateMessage::new().embed(embed),
        )
        .await;
}

/// Localized user-facing reply for framework-level denials.
/// Mirrors commandExecutor.ts `replyDenied` (plain channel reply,
/// never ephemeral) + the TS lang keys used on each denial path.
/// `fallback` is the exact en-US string: YAML is never touched, so the
/// denial still renders when the guild lang table misses the key.
async fn denial_reply(ctx: Ctx<'_>, key: &str, sub: Option<(&str, String)>, fallback: &str) {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut msg = crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string());
    if msg.is_empty() {
        msg = fallback.to_string();
    }
    if msg.is_empty() {
        return;
    }
    if let Some((pat, val)) = sub {
        msg = msg.replace(pat, &val);
    }
    let _ = ctx.send(poise::CreateReply::default().content(msg)).await;
}

/// Route a prefix parse failure to its TS lang key. Mirrors the
/// per-command null keys (method.member/role null -> key): poise parses
/// typed prefix params before run(), so unresolvable member/user/role/
/// channel input surfaces as ArgumentParse here instead of inside run.
/// Anything else (counts, bool, choices, numbers, attachments) returns
/// None and falls through to the checkCommandArgs caret embed.
fn argument_parse_key(error_text: &str) -> Option<(&'static str, &'static str)> {
    if error_text.contains("Member") {
        Some(("ban_dont_found_member", "🔍 | Cannot find this member"))
    } else if error_text.contains("User") {
        Some(("baninfo_user_not_found", "User not found"))
    } else if error_text.contains("Role") {
        Some(("addrolereact_role_not_found", "Role not found."))
    } else if error_text.contains("Channel") {
        Some(("stats_channel_invalid", "Invalid channel specified."))
    } else {
        None
    }
}

/// Render the per-command cooldown denial. Mirrors checkGlobalCooldown
/// (global_command_cooldown_msg with ${emoji}/${time}/${ctx.commandPath}).
/// Pure so the template wiring is unit-testable; `remaining_ms` comes from
/// poise's CooldownHit (target.cooldown), formatted with beautiful_ms like
/// the rate-limit arm below.
fn cooldown_denial_message(
    template: &str,
    warn_markup: &str,
    remaining_ms: u128,
    command_path: &str,
) -> String {
    template
        .replace("${emoji}", warn_markup)
        .replace("${time}", &crate::funcs::beautiful_ms(remaining_ms as f64))
        .replace("${ctx.commandPath}", command_path)
}

/// Caret position for the usage-error embed. Mirrors checkCommandArgs:
/// the failing input's position, or args length (missingIndex) when the
/// input is absent or unknown. The caller clamps to the token line.
fn caret_error_index(args: &[String], input: Option<&str>) -> usize {
    match input {
        Some(want) => args.iter().position(|a| a == want).unwrap_or(args.len()),
        None => args.len(),
    }
}

/// Per-command cooldown denial (target.cooldown). Mirrors
/// checkGlobalCooldown: remaining-time reply via
/// global_command_cooldown_msg, never silent (exact en-US fallback).
async fn cooldown_denial(ctx: Ctx<'_>, remaining: std::time::Duration) {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let template = crate::lang::get(&code, "global_command_cooldown_msg").unwrap_or_else(|| {
        "${emoji} You need to wait **${time}** between each **`${ctx.commandPath}`**".to_string()
    });
    let warn = crate::emojis::app_emoji_markup(ctx.http(), "Warn")
        .await
        .unwrap_or_else(|| "⚠️".to_string());
    let msg = cooldown_denial_message(
        &template,
        &warn,
        remaining.as_millis(),
        &ctx.command().qualified_name,
    );
    if msg.is_empty() {
        return;
    }
    let _ = ctx.send(poise::CreateReply::default().content(msg)).await;
}

/// Prefix usage-error embed. checkCommandArgs equivalent for the
/// ArgumentParse cases without an entity key (counts, bool, choices,
/// numbers, attachments): the caret description from prefix_args (same
/// hybridcommands_args_error_embed_desc template), red like
/// sendErrorMessage, shared bot footer with icon when available.
async fn prefix_usage_denial(ctx: Ctx<'_>, input: Option<String>) {
    if !matches!(ctx, poise::Context::Prefix(_)) {
        // Slash args are Discord-validated; keep the legacy member key.
        denial_reply(
            ctx,
            "ban_dont_found_member",
            None,
            "🔍 | Cannot find this member",
        )
        .await;
        return;
    }
    // Poise erases param types (name/required/choices only); the label
    // mirrors getArgumentOptionTypeWithOptions (choices joined with `/`).
    let specs: Vec<prefix_args::ArgSpec> = ctx
        .command()
        .parameters
        .iter()
        .map(|pm| {
            let label = if pm.choices.is_empty() {
                pm.name.clone()
            } else {
                pm.choices
                    .iter()
                    .map(|c| c.name.clone())
                    .collect::<Vec<_>>()
                    .join("/")
            };
            prefix_args::ArgSpec::text(&pm.name, &label, pm.required, false)
        })
        .collect();
    if specs.is_empty() {
        return;
    }
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let code = crate::db::guild_lang(pool, gid).await;
    let template = crate::lang::get(&code, "hybridcommands_args_error_embed_desc")
        .unwrap_or_else(|| {
            "```ts\nCommand Name: ${currentCommand.name}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nError when sending \"${wrongArgumentName}\" argument.\n```"
                .to_string()
        });
    let bot_prefix = crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await;
    let display = ctx.command().qualified_name.clone();
    let args = match ctx {
        poise::Context::Prefix(p) => prefix_args::split_args(p.args),
        _ => vec![String::new()],
    };
    let tokens = prefix_args::usage_tokens(&specs, false);
    let idx = caret_error_index(&args, input.as_deref()).min(tokens.len().saturating_sub(1));
    let desc =
        prefix_args::usage_error_description(&template, &bot_prefix, &display, &specs, false, idx);
    let footer = crate::lang::get(&code, "hybridcommands_embed_footer_text")
        .unwrap_or_else(|| {
            "Options within [...] are required, while those within <...> are optional.\nUse the command: ${botPrefix}help [command] for more information."
                .to_string()
        })
        .replace("${botPrefix}", &bot_prefix);
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let (_, icon) = crate::commands::shared::footer_parts(&ctx, &gid_str).await;
    let embed = crate::commands::shared::embed_with_footer(
        serenity::CreateEmbed::default()
            .description(desc)
            .colour(0xED_4245_u32),
        &footer,
        icon.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = ctx.send(reply).await;
}

/// Option docs for the no-run help embed (parameters only; poise erases
/// the TS display types, so the name carries the token like the usage
/// line in prefix_usage_denial).
fn help_options(
    cmd: &poise::Command<Data, anyhow::Error>,
) -> Vec<crate::commands::shared::HelpOptionDoc> {
    cmd.parameters
        .iter()
        .map(|pm| crate::commands::shared::HelpOptionDoc {
            name: pm.name.clone(),
            choices: pm.choices.iter().map(|c| c.name.clone()).collect(),
            required: pm.required,
        })
        .collect()
}

/// No-run help fallback. Mirrors runCommand's `!(target as Command)?.run`
/// branch (prefix only): the per-command awesomeEmbed help instead of
/// silence. Poise surfaces run-less parent commands as SubcommandRequired.
/// (TS deletes both messages after 60s; this port leaves cleanup to the
/// user like every other denial reply.)
async fn no_run_help(ctx: Ctx<'_>) {
    if !matches!(ctx, poise::Context::Prefix(_)) {
        return;
    }
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let code = crate::db::guild_lang(pool, gid).await;
    let t = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let cmd = ctx.command();
    // TS picks the `fr` description when the guild lang starts with `fr-`.
    let description = if code.starts_with("fr-") {
        cmd.description_localizations
            .get("fr")
            .cloned()
            .unwrap_or_else(|| cmd.description.clone().unwrap_or_default())
    } else {
        cmd.description.clone().unwrap_or_default()
    };
    let base_permission =
        crate::lang::permission_names(&code, cmd.default_member_permissions.bits())
            .unwrap_or_default();
    let custom_perms =
        crate::commands::guildconfig::load_cmd_perms(pool, &gid_str, &cmd.name).await;
    let (footer_name, icon) = crate::commands::shared::footer_parts(&ctx, &gid_str).await;
    let input = crate::commands::shared::AwesomeHelpInput {
        command_name: cmd.name.clone(),
        prefix_name: None,
        description,
        aliases: cmd.aliases.clone(),
        base_permission,
        custom_perms: custom_perms.as_ref(),
        options: help_options(cmd),
        subcommands: cmd
            .subcommands
            .iter()
            .map(|s| crate::commands::shared::HelpSubcommandDoc {
                name: s.name.clone(),
                prefix_name: None,
                aliases: s.aliases.clone(),
                options: help_options(s),
            })
            .collect(),
        prefix: crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await,
        title_template: t(
            "hybridcommands_embed_help_title",
            "${commandName} Help Embed",
        ),
        fields_value_template: t(
            "hybridcommands_embed_help_fields_value",
            "**Aliases:** ${aliases}\n**Use:** ${use}",
        ),
        usage_label: t("var_usage", "Usage"),
        permission_label: t("var_permission", "Permission"),
        aliases_label: t("var_aliases", "Aliases"),
        none_label: t("setjoinroles_var_none", "None"),
        footer_text: footer_name.clone(),
    };
    let embed = crate::commands::shared::embed_with_footer(
        crate::commands::shared::build_awesome_embed(&input),
        &footer_name,
        icon.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = ctx.send(reply).await;
}

/// Prefix parse denial router: entity failures keep their TS keys,
/// everything else gets the checkCommandArgs caret embed.
async fn argument_parse_denial(ctx: Ctx<'_>, error_text: String, input: Option<String>) {
    if let Some((key, fallback)) = argument_parse_key(&error_text) {
        denial_reply(ctx, key, None, fallback).await;
        return;
    }
    prefix_usage_denial(ctx, input).await;
}

/// Framework error router. Command/CommandPanic keep the crash block;
/// parse + permission + cooldown denials get TS-keyed replies instead
/// of silence. CommandCheckFailed without an error stays silent: the
/// global check already replied (cooldown / rate-limit) or denied
/// quietly (blacklist, fun switch, custom perms), mirroring TS.
pub async fn report_command_error(err: poise::FrameworkError<'_, Data, anyhow::Error>) {
    match &err {
        poise::FrameworkError::Command { ctx, error, .. } => {
            crash_block(*ctx, error.to_string()).await;
        }
        poise::FrameworkError::CommandPanic { ctx, payload, .. } => {
            crash_block(*ctx, format!("{payload:?}")).await;
        }
        // Prefix args poise could not parse. Entity failures
        // (member/user/role/channel) keep their TS per-command keys;
        // counts/bool/choices/numbers fall through to the checkCommandArgs
        // caret usage-error embed.
        poise::FrameworkError::ArgumentParse {
            ctx, error, input, ..
        } => {
            argument_parse_denial(*ctx, error.to_string(), input.clone()).await;
        }
        // Per-command cooldown (target.cooldown). Mirrors
        // checkGlobalCooldown (global_command_cooldown_msg + remaining).
        poise::FrameworkError::CooldownHit {
            ctx,
            remaining_cooldown,
            ..
        } => {
            cooldown_denial(*ctx, *remaining_cooldown).await;
        }
        // Run-less parent invoked without a subcommand (prefix only).
        // Mirrors runCommand's no-run awesomeEmbed help fallback.
        poise::FrameworkError::SubcommandRequired { ctx, .. } => {
            no_run_help(*ctx).await;
        }
        // Mirrors the bot-permission denial (!addrole.ts,
        // !delrole.ts use backup_i_dont_have_permission).
        poise::FrameworkError::MissingBotPermissions { ctx, .. } => {
            denial_reply(
                *ctx,
                "backup_i_dont_have_permission",
                None,
                "I don't have permission `ADMINISTRATOR`",
            )
            .await;
        }
        // Mirrors checkNativePermission (var_dont_have_perm + perm name).
        poise::FrameworkError::MissingUserPermissions {
            ctx,
            missing_permissions,
            ..
        } => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            let perm = missing_permissions
                .and_then(|p| crate::lang::permission_names(&code, p.bits()))
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "permission".to_string());
            denial_reply(
                *ctx,
                "var_dont_have_perm",
                Some(("{perm}", perm)),
                "You aren't allowed to do this, you are missing the {perm} permission!",
            )
            .await;
        }
        poise::FrameworkError::CommandCheckFailed {
            ctx,
            error: Some(error),
            ..
        } => {
            crash_block(*ctx, error.to_string()).await;
        }
        _ => {}
    }
}
/// Pre-command hook: prefix file-log gate. Mirrors loggerX.addCommand
/// in messageCommandHandler.ts (channel, full content, executor,
/// guild, timestamp, channel id). Slash invocations are already logged
/// by the interactionCreate leg (events_handler::log_slash_command),
/// so only the prefix path logs here; logging both would double-log
/// slash. Gate verdicts need no hook: poise runs command_check
/// (global_check: blacklist, 1s debounce, rate limits) on both the
/// prefix and slash dispatch paths, and per-command cooldowns via
/// check_permissions_and_cooldown on both as well.
fn pre_command_hook(ctx: poise::Context<'_, Data, anyhow::Error>) -> poise::BoxFuture<'_, ()> {
    Box::pin(async move {
        // Global slash defer. Mirrors deferIfNeeded in
        // commandExecutor.ts: interaction sources defer when the
        // per-command thinking/ephemeral flags say so; other sources
        // (prefix) never defer and keep the file-log leg below.
        // poise's defer_response no-ops when the initial response was
        // already sent (ApplicationContext::has_sent_initial_response),
        // which is the skip-already-deferred/replied branch; later
        // ctx.send() calls then edit that deferred reply (the
        // deferred/editReply branching), like TS editReply-after-defer.
        if let poise::Context::Application(_) = ctx {
            let policy = crate::commands::defer_policy(&ctx.command().qualified_name);
            if policy.defer {
                let res = if policy.ephemeral {
                    ctx.defer_ephemeral().await
                } else {
                    ctx.defer().await
                };
                if let Err(e) = res {
                    tracing::warn!("pre-command defer failed: {e}");
                }
            }
            return;
        }
        let poise::Context::Prefix(p) = ctx else {
            return;
        };
        let Some(guild_id) = p.msg.guild_id else {
            return;
        };
        let cache = &p.serenity_context.cache;
        let guild_name = cache
            .guild(guild_id)
            .map(|g| g.name.clone())
            .unwrap_or_else(|| guild_id.get().to_string());
        let channel_name = cache
            .guild(guild_id)
            .and_then(|g| g.channels.get(&p.msg.channel_id).map(|c| c.name.clone()))
            .unwrap_or_else(|| "unknown".to_string());
        p.data
            .slashlog
            .log(crate::slashlog::ParsedSavedCommand {
                guild_name,
                guild_id: Some(guild_id.get().to_string()),
                executor_username: p.msg.author.name.clone(),
                timestamp: now_ms(),
                channel_name,
                channel_id: p.msg.channel_id.get().to_string(),
                command: p.msg.content.trim().to_string(),
            })
            .await;
    })
}

/// Per-guild prefix with global default. Mirrors TS
/// defaultMessageCommandsPrefix + GUILD.PREFIX override.
fn dynamic_prefix(
    ctx: poise::PartialContext<'_, Data, anyhow::Error>,
) -> poise::BoxFuture<'_, Result<Option<String>, anyhow::Error>> {
    Box::pin(async move {
        let prefix = crate::db::guild_prefix(
            &ctx.data.pool,
            ctx.guild_id.map(|g| g.get()),
            &ctx.data.config.prefix,
        )
        .await;
        Ok(Some(prefix))
    })
}

/// Partials / enforceNonce parity notes (src/core/bot.ts lines 86-99).
/// serenity 0.12 exposes no Partials client option: gateway dispatches
/// always carry their full payload, and cache misses surface as `None`
/// at the lookup site rather than as partial objects. Mapping of the 10
/// TS partials: Channel, Message, User, Reaction, GuildMember,
/// GuildScheduledEvent, ThreadMember, Poll, PollAnswer, SoundboardSound
/// all arrive complete in serenity events; where this file needs data
/// that may not be cached it fetches over HTTP instead (the guild-owner
/// lookup in global_check uses `to_partial_guild`, i.e. a fetch-missing
/// fallback). Uncached-event handling inside the event dispatcher is
/// owned by events_handler, out of scope for this file.
/// enforceNonce likewise has no global flag in serenity: it is a
/// per-message builder option
/// (`CreateMessage::enforce_nonce`, only effective with an explicit
/// `.nonce(...)`). Command replies here go through poise's reply path,
/// which manages its own idempotency, so no per-send nonce is set.
fn intents() -> serenity::GatewayIntents {
    // Mirrors the explicit GatewayIntentBits list in src/core/bot.ts.
    serenity::GatewayIntents::GUILDS
        | serenity::GatewayIntents::GUILD_MEMBERS
        | serenity::GatewayIntents::GUILD_MODERATION
        | serenity::GatewayIntents::GUILD_EMOJIS_AND_STICKERS
        | serenity::GatewayIntents::GUILD_INTEGRATIONS
        | serenity::GatewayIntents::GUILD_WEBHOOKS
        | serenity::GatewayIntents::GUILD_INVITES
        | serenity::GatewayIntents::GUILD_VOICE_STATES
        | serenity::GatewayIntents::GUILD_PRESENCES
        | serenity::GatewayIntents::GUILD_MESSAGES
        | serenity::GatewayIntents::GUILD_MESSAGE_REACTIONS
        | serenity::GatewayIntents::GUILD_MESSAGE_TYPING
        | serenity::GatewayIntents::DIRECT_MESSAGES
        | serenity::GatewayIntents::DIRECT_MESSAGE_REACTIONS
        | serenity::GatewayIntents::DIRECT_MESSAGE_TYPING
        | serenity::GatewayIntents::MESSAGE_CONTENT
        | serenity::GatewayIntents::GUILD_SCHEDULED_EVENTS
        | serenity::GatewayIntents::AUTO_MODERATION_CONFIGURATION
        | serenity::GatewayIntents::AUTO_MODERATION_EXECUTION
        | serenity::GatewayIntents::GUILD_MESSAGE_POLLS
        | serenity::GatewayIntents::DIRECT_MESSAGE_POLLS
}

/// Parse `git remote get-url origin` into an https base URL. Mirrors
/// parseGitRemote in src/version.ts (`git@host:path` -> `https://host/path`,
/// trailing `.git` stripped).
pub fn parse_git_remote(raw: &str) -> String {
    let mut s = raw.trim().to_string();
    if let Some(rest) = s.strip_prefix("git@") {
        if let Some(i) = rest.find(':') {
            s = format!("https://{}/{}", &rest[..i], &rest[i + 1..]);
        }
    }
    if let Some(stripped) = s.strip_suffix(".git") {
        s = stripped.to_string();
    }
    s
}

/// Resolve the git remote base URL for release links. `GIT_REMOTE` env
/// wins (offline/test override); otherwise `git remote get-url origin`
/// like src/version.ts. Empty when unresolvable (offline checkout).
pub fn resolve_git_remote() -> String {
    if let Ok(v) = std::env::var("GIT_REMOTE") {
        if !v.trim().is_empty() {
            return parse_git_remote(&v);
        }
    }
    match std::process::Command::new("git")
        .args(["remote", "get-url", "origin"])
        .output()
    {
        Ok(out) if out.status.success() => parse_git_remote(&String::from_utf8_lossy(&out.stdout)),
        _ => String::new(),
    }
}

/// Resolve the newsletter DM template for one owner locale. Reuses the
/// existing `newsletter_dm_body` YAML key (never hardcoded); the lang
/// table falls back to en-US for the lookup only. Mirrors sendDm()
/// reading `lang.newsletter_dm_body` via getOwnerLang(client, guildId).
pub fn resolve_dm_body_template_for(lang_code: &str) -> String {
    crate::lang::get(lang_code, "newsletter_dm_body").unwrap_or_default()
}

/// Collect guild->owner rows from the gateway cache for the release
/// notifier. Mirrors getAllGuildOwnerData in releaseNotifier.ts
/// (no-shard path): one row per cached guild with its owner_id;
/// unavailable guilds (no cached Guild yet) are skipped. The
/// first-guild-wins per-owner dedupe lives in the release module
/// (`dedupe_owners`), so duplicate owners across guilds stay here.
pub fn collect_guild_owners(cache: &serenity::Cache) -> Vec<crate::core::release::GuildOwner> {
    let mut rows = Vec::new();
    for gid in cache.guilds() {
        if let Some(g) = cache.guild(gid) {
            rows.push(crate::core::release::GuildOwner {
                guild_id: gid.get().to_string(),
                owner_id: g.owner_id.get().to_string(),
            });
        }
    }
    rows
}

/// Strip custom `perm`/`permission` props from a command payload.
/// Mirrors removePermissionProperties in src/core/commandsSync.ts (used
/// for the REST PUT body and the dev commands.json dump): arrays are
/// mapped, non-objects pass through, nested objects are cleaned
/// recursively. Poise serializes slash options from function
/// parameters (no custom fields to carry), so this applies to JSON
/// payload snapshots, not the poise registration call itself.
pub fn strip_perm_props(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Array(items) => {
            for item in items {
                strip_perm_props(item);
            }
        }
        serde_json::Value::Object(map) => {
            map.remove("perm");
            map.remove("permission");
            for (_, v) in map.iter_mut() {
                strip_perm_props(v);
            }
        }
        _ => {}
    }
}

/// Shard presence activity name. Mirrors the (currently disabled)
/// quotesPresence body in ready.ts:
/// `Shards #<id> | <guilds> Servers | www.ihorizon.org`
/// (ActivityType.Playing, per-shard id). Pure so the template is
/// testable offline; the live setPresence call stays caller-side.
pub fn shard_presence_name(shard_id: u64, guilds: u64) -> String {
    format!("Shards #{shard_id} | {guilds} Servers | www.ihorizon.org")
}

/// Warm rows for the username cache. Mirrors the ready.ts loop filling
/// usersNamesMap from the guild member cache:
/// `usersNamesMap.set(id, { username, globalName })`. Takes plain
/// rows so it stays offline-testable; the live caller feeds it from
/// the gateway cache. Later rows win on duplicate ids.
pub fn collect_users_names(
    entries: impl IntoIterator<Item = (u64, String, Option<String>)>,
) -> std::collections::HashMap<u64, (String, Option<String>)> {
    let mut map = std::collections::HashMap::new();
    for (id, username, global_name) in entries {
        map.insert(id, (username, global_name));
    }
    map
}

/// Prefix dispatch options. Mirrors the TS prefix path
/// (messageCommandHandler.ts): per-guild dynamic prefix, bot mention
/// as prefix, and case-insensitive command lookup (TS
/// `args.shift()?.toLowerCase()`; poise `case_insensitive_commands`,
/// pinned true so a default flip can never break parity). Extracted
/// so the flag is offline-verifiable in tests.
fn prefix_options(mention_as_prefix: bool) -> poise::PrefixFrameworkOptions<Data, anyhow::Error> {
    poise::PrefixFrameworkOptions {
        dynamic_prefix: Some(dynamic_prefix),
        mention_as_prefix,
        case_insensitive_commands: true,
        ..Default::default()
    }
}

/// First configured owner id for the lavalink error ping (TS owners[0]).
/// Blank entries count as unconfigured (no ping).
pub fn track_error_owner(owners: &[String]) -> Option<&str> {
    owners.first().map(|s| s.trim()).filter(|s| !s.is_empty())
}

/// Guild-visible branch of a trackError recovery: the requeued fallback
/// title on the fallback re-search hit, None for the skip legs (the
/// caller announces those via announce_track_error instead).
pub fn requeued_title(recovery: &crate::lavalink::ErrorRecovery) -> Option<&str> {
    match recovery {
        crate::lavalink::ErrorRecovery::Requeued { title } => Some(title.as_str()),
        _ => None,
    }
}

/// Track-exception event wiring: run the recovery, then post the full
/// diagnostics report + owners[0] ping to lavalink_logs_channel_id,
/// then branch the guild-visible leg (Requeued -> announce_requeued,
/// else announce_track_error with the exception detail). Exactly one
/// handle_track_exception call: the report is built before the state
/// advances (the failed track's requester is lost after). Never run
/// this as a dispatcher subscriber: handle dispatches, so subscribing
/// it would recurse.
pub async fn handle_track_exception_event(
    http: &serenity::Http,
    logs_channel_id: &str,
    owners: &[String],
    ev: lava_rs::events::TrackExceptionEvent,
    now_ms: i64,
) -> crate::lavalink::ErrorRecovery {
    let mgr = crate::lavalink::manager();
    let guild_id = ev.guild_id.parse::<u64>().unwrap_or(0);
    let detail = ev.exception.message.clone();
    let report = match guild_id {
        0 => crate::lavalink::LavalinkManager::track_error_report(&ev, None, None),
        gid => {
            let requester = mgr
                .snapshot(gid)
                .await
                .and_then(|s| s.current.map(|t| t.requester));
            crate::lavalink::LavalinkManager::track_error_report(&ev, requester, None)
        }
    };
    let recovery = mgr.handle_track_exception(ev, now_ms).await;
    let _ = crate::lavalink::LavalinkManager::post_track_error_report(
        http,
        logs_channel_id,
        track_error_owner(owners),
        &report,
        now_ms,
    )
    .await;
    match &recovery {
        crate::lavalink::ErrorRecovery::Requeued { title } => {
            mgr.announce_requeued(http, guild_id, title).await;
        }
        _ => {
            mgr.announce_track_error(http, guild_id, &detail).await;
        }
    }
    recovery
}

/// True when gateway session starts are nearly exhausted. Mirrors the
/// `remaining < 10` IDENTIFY-token guard in getOptimalShardCount
/// (src/index.ts). Pure so the threshold is offline-testable; the live
/// warn log stays caller-side in run().
pub fn session_starts_low(remaining: u64) -> bool {
    remaining < 10
}

/// Whole seconds until the session-start window resets. Mirrors
/// `Math.round(reset_after / 1000)` in getOptimalShardCount
/// (src/index.ts; reset_after arrives in ms). Pure for tests.
pub fn session_reset_secs(reset_after_ms: u64) -> u64 {
    reset_after_ms.saturating_add(500) / 1000
}

/// Explicit TOTAL_SHARDS override validation at boot. Mirrors the TS
/// `Number(process.env.TOTAL_SHARDS)` + `!isNaN` gate: NaN/negative
/// never survive the u32 parse in config::load (None), and an explicit
/// 0 is rejected here (None) instead of silently falling through to
/// the tuned count, so the caller can warn. Pure for tests.
pub fn valid_shard_override(total_shards_override: Option<u32>) -> Option<u32> {
    match total_shards_override {
        Some(n) if n > 0 => Some(n),
        _ => None,
    }
}

pub async fn run(cfg: Config, pool: Pool) -> anyhow::Result<()> {
    let token = crate::config::bot_token().ok_or_else(|| {
        anyhow::anyhow!("missing BOT_TOKEN env (mirrors config.discord.token fallback)")
    })?;

    let cfg = Arc::new(cfg);
    let pool_fw = pool.clone();
    let cfg_fw = cfg.clone();
    // SlashLog shared with the pre-command prefix file-log gate; the
    // event handler keeps its own clone for the slash leg.
    let slashlog = crate::slashlog::SlashLog::new(crate::slashlog::SlashLog::default_path());
    let slashlog_fw = slashlog.clone();

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: commands::all(),
            command_check: Some(global_check),
            pre_command: pre_command_hook,
            on_error: |err| {
                Box::pin(async move {
                    tracing::warn!("command error: {err}");
                    crate::bot::report_command_error(err).await;
                })
            },
            prefix_options: prefix_options(cfg.message_commands_mention),
            // HybridCommands in TS run as both slash + prefix; poise does
            // the same natively.
            ..Default::default()
        })
        .setup(|ctx, ready, framework| {
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                tracing::info!("slash commands synced");
                // Lavalink nodes: sync from config, register this
                // shard's messenger for OP4 leave, and dial each node
                // WS (mirrors playerManager.ts init + nodeManager
                // connect; frames feed feed_node_ws so track-end
                // advance + the nowplaying announce run live).
                {
                    let cfgs: Vec<crate::lavalink::NodeCfg> = cfg_fw
                        .lavalink_nodes
                        .iter()
                        .map(crate::lavalink::NodeCfg::from)
                        .collect();
                    let user_id = ready.user.id.get();
                    let mgr = crate::lavalink::manager();
                    mgr.sync_nodes(&cfgs, user_id).await;
                    let shard_id = ready.shard.as_ref().map(|s| u64::from(s.id.0)).unwrap_or(0);
                    mgr.register_shard(shard_id, ctx.shard.clone()).await;
                    if let Some(total) = ready.shard.as_ref().map(|s| s.total) {
                        mgr.ensure_total_shards(total).await;
                    }
                    // Track-exception diagnostics feed (ERRCHAN-FEED):
                    // snapshot the live Http + lavalink_logs_channel_id +
                    // owners once at ready; the feed TrackException arm
                    // reads this ctx (never a dispatcher subscriber).
                    mgr.register_exception_report(
                        ctx.http.clone(),
                        cfg_fw.lavalink_logs_channel_id.clone(),
                        cfg_fw.owners.clone(),
                    )
                    .await;
                    crate::lavalink::spawn_all_node_ws(cfgs, user_id);
                }
                // Release newsletter fan-out (main shard only). Mirrors
                // checkAndNotifyRelease(client) in ready.ts: owner rows
                // enumerated from the guild cache, git remote for the
                // release URL, resolved newsletter_dm_body template.
                // Spawned so the staggered DM loop never blocks setup;
                // the module's own guards (main-shard gate, re-entrance,
                // claim-before-send, distributed lock) apply inside.
                {
                    let http = ctx.http.clone();
                    let cache = ctx.cache.clone();
                    let pool = pool_fw.clone();
                    let shard_id = ready.shard.as_ref().map(|s| u64::from(s.id.0)).unwrap_or(0);
                    tokio::spawn(async move {
                        let mut root = std::env::current_dir().unwrap_or_else(|_| ".".into());
                        if root.ends_with("rust") {
                            root.pop();
                        }
                        let entries = collect_guild_owners(&cache);
                        let summary = crate::core::release::check_and_notify_release(
                            &pool,
                            &http,
                            shard_id,
                            &root,
                            &entries,
                            &resolve_git_remote(),
                            &|code: &str| resolve_dm_body_template_for(code),
                        )
                        .await;
                        if summary.ran {
                            tracing::info!(
                                "release newsletter done: version {:?}, sent {}, blocked {}, transient {}, skipped {}",
                                summary.version,
                                summary.sent,
                                summary.blocked,
                                summary.transient,
                                summary.skipped
                            );
                        }
                    });
                }
                Ok(Data {
                    pool: pool_fw.clone(),
                    config: cfg_fw.clone(),
                    slashlog: slashlog_fw.clone(),
                })
            })
        })
        .build();

    let mut cache_settings = serenity::Settings::default();
    cache_settings.max_messages = 100;
    // Mirrors the 8h message lifetime in src/core/bot.ts
    // (DISCORD_MESSAGE_SWEEP_LIFETIME_SECONDS = 60*60*8): serenity has no
    // per-category sweepers, so the global TTL for temp-cached data is the
    // closest equivalent. No serenity 0.12 equivalent exists for the
    // users (bot-only, 30min), presences (offline-only, 15min) and
    // threads (1h lifetime, 30min interval) sweepers: serenity exposes no
    // public per-category eviction API, only the max_messages cap above
    // (mirrors MessageManager: 100) plus this TTL. Periodic selective
    // eviction is therefore documented as not portable, not approximated
    // with a no-op ticker.
    cache_settings.time_to_live = std::time::Duration::from_secs(60 * 60 * 8);
    // Slash-command file log (mirrors loggerX in slashCommandLogger.ts).
    // Created at the top of run() and shared with Data for the prefix
    // leg; the shutdown flush below drains both legs' entries.
    // Mirrors the SIGINT/SIGTERM flush in slashCommandLogger.ts.
    {
        let logs = slashlog.clone();
        tokio::spawn(async move {
            #[cfg(unix)]
            {
                let mut term =
                    tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                        .expect("sigterm handler");
                tokio::select! {
                    _ = tokio::signal::ctrl_c() => {},
                    _ = term.recv() => {},
                }
            }
            #[cfg(not(unix))]
            {
                let _ = tokio::signal::ctrl_c().await;
            }
            tracing::info!("flushing command logs before shutdown...");
            logs.force_flush().await;
        });
    }
    let mut client = serenity::ClientBuilder::new(token, intents())
        .cache_settings(cache_settings)
        .framework(framework)
        .event_handler(crate::events_handler::Handler::new(pool.clone(), slashlog))
        .await?;

    crate::scheduler::spawn(pool.clone(), client.http.clone());

    // App emoji sync (best-effort background, mirrors emojisManager).
    {
        let http = client.http.clone();
        tokio::spawn(async move {
            crate::emojis::sync(&http).await;
            crate::emojis::refresh(&http).await;
        });
    }

    // Release version file. Mirrors `await writeVersionFile(pkg.version)`
    // in src/index.ts (boot, before spawning shards).
    if let Err(e) = crate::core::release::write_version_file(env!("CARGO_PKG_VERSION")) {
        tracing::warn!("version file write failed: {e}");
    }

    // Sharding mirrors ShardingManager in src/index.ts. TOTAL_SHARDS env
    // override (cfg.total_shards, parsed in config::load) takes priority,
    // same as TS; otherwise Discord's /gateway/bot recommendation scaled
    // by the tuning multiplier (crate::funcs, mirrors
    // getOptimalShardCount()). Offline (query fails) falls back to
    // start_autosharded, the previous behavior. Documented gaps (no
    // serenity 0.12 equivalent): the spawn pacing (delay 5500, timeout
    // 30000) and the respawn flag — serenity spawns shards sequentially
    // and auto-reconnects/resumes dropped shards via the ShardManager,
    // so respawn:true behaviour is the default, not a flag.
    let gateway = match client.http.get_bot_gateway().await {
        Ok(g) => {
            // Mirrors the three [Gateway] logs in getOptimalShardCount
            // (src/index.ts): recommendation, session-start budget, and
            // max concurrency, plus the remaining < 10 IDENTIFY warning.
            tracing::info!("[Gateway] Discord recommends: {} shards", g.shards);
            tracing::info!(
                "[Gateway] Session starts remaining: {}/{}",
                g.session_start_limit.remaining,
                g.session_start_limit.total
            );
            tracing::info!(
                "[Gateway] Max concurrency: {}",
                g.session_start_limit.max_concurrency
            );
            if session_starts_low(g.session_start_limit.remaining) {
                tracing::warn!(
                    "[Gateway] Only {} IDENTIFY tokens left, resets in {}s",
                    g.session_start_limit.remaining,
                    session_reset_secs(g.session_start_limit.reset_after)
                );
            }
            Some(g)
        }
        Err(e) => {
            tracing::warn!("gateway/bot query failed ({e}), falling back to autoshard");
            None
        }
    };
    let gateway_recommended: Option<u32> = gateway.map(|g| g.shards);
    // Explicit override validation: NaN/negative TOTAL_SHARDS never
    // survive the u32 parse in config::load (None); an explicit 0 is
    // rejected here with a warning instead of silently falling back to
    // the tuned count.
    if cfg.total_shards == Some(0) {
        tracing::warn!("ignoring TOTAL_SHARDS override: must be >= 1, using gateway-tuned count");
    }
    let total_shards = crate::funcs::resolve_shard_count(
        gateway_recommended,
        valid_shard_override(cfg.total_shards),
    );
    if let Some(n) = total_shards {
        crate::lavalink::manager().set_total_shards(n as u64).await;
        if valid_shard_override(cfg.total_shards).is_some() {
            tracing::info!("using TOTAL_SHARDS override: {n}");
        } else if let Some(rec) = gateway_recommended {
            tracing::info!(
                "[Gateway] Tuned shard count: {n} (Discord: {rec} × multiplier: {})",
                crate::funcs::shard_multiplier()
            );
        }
    }
    // Main-shard release gate. Mirrors checkAndNotifyRelease() running on
    // shard 0 only (client.isMainShard): in this single-process autoshard
    // shard 0 is always local, so the gate is evaluated for shard 0 here
    // at boot. The one-shot claim (v.old.txt rotation) lives in
    // consume_release_note; the owner-DM fan-out is deferred to the
    // notifier module, which must call this path only when
    // crate::funcs::is_main_shard holds.
    if crate::funcs::is_main_shard(0) {
        let mut root = std::env::current_dir().unwrap_or_else(|_| ".".into());
        if root.ends_with("rust") {
            root.pop();
        }
        if let Some(version) = crate::core::release::consume_release_note(&root) {
            tracing::info!("release {version} pending announcement (main shard)");
        }
    }

    tracing::info!("connecting gateway (autosharded)");
    let started = match total_shards {
        Some(n) => client.start_shards(n).await,
        None => client.start_autosharded().await,
    };
    match started {
        Ok(()) => Ok(()),
        Err(e) => {
            // Mirrors core.ts login(): self-heal disallowed intents, else exit.
            let msg = e.to_string();
            if msg.contains("disallowed intents") {
                if let Some(token) = crate::config::bot_token() {
                    if crate::funcs::enable_required_intents(&token).await {
                        tracing::info!("intents updated, restart to apply");
                    }
                }
            }
            Err(e.into())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn crash_admin_flag_maps_bool_to_yes_no() {
        assert_eq!(admin_flag(true), "yes");
        assert_eq!(admin_flag(false), "no");
    }

    #[test]
    fn temp_keys_match_ts_layout() {
        // interactionCooldown: `COOLDOWN.${interaction.user.id}`.
        assert_eq!(debounce_key(123), "COOLDOWN.123");
        // helper.cooldown: `COOLDOWN.${method}.${authorId}` (prefix
        // debounce and per-command cooldowns alike).
        assert_eq!(
            helper_cooldown_key("msg_commands", "123"),
            "COOLDOWN.msg_commands.123"
        );
        assert_eq!(helper_cooldown_key("ban", "123"), "COOLDOWN.ban.123");
        // checkCommandRateLimit:
        // `COMMAND_LIMITS.${gid}.${commandPath}.${uid}`.
        assert_eq!(rate_limit_key(7, "ban", 123), "COMMAND_LIMITS.7.ban.123");
        assert_eq!(
            rate_limit_key(7, "config set", 123),
            "COMMAND_LIMITS.7.config set.123"
        );
    }

    #[test]
    fn fixed_cooldown_allows_then_denies_with_exact_remaining() {
        // Missing stamp allows (TS `last !== null` guard).
        assert_eq!(cooldown_remaining(None, 1000, 5000), 0);
        // Exact boundary allows: `ms - (now - last) > 0` is strict.
        assert_eq!(cooldown_remaining(Some(4000), 1000, 5000), 0);
        // Inside the window the exact remainder is reported.
        assert_eq!(cooldown_remaining(Some(4500), 1000, 5000), 500);
        assert_eq!(cooldown_remaining(Some(5000), 1000, 5000), 1000);
        // Stale stamps allow.
        assert_eq!(cooldown_remaining(Some(0), 1000, 5001), 0);
        // Per-command cooldowns reuse the same guard with their own ms.
        assert_eq!(cooldown_remaining(Some(9000), 5000, 10000), 4000);
    }

    #[test]
    fn rate_limit_window_allows_under_count_and_records() {
        let (active, left) = rate_limit_step(&[], 2, 60_000, 1000);
        assert_eq!((active, left), (vec![1000], 0));
        let (active, left) = rate_limit_step(&[1000], 2, 60_000, 2000);
        assert_eq!((active, left), (vec![1000, 2000], 0));
    }

    #[test]
    fn rate_limit_window_denies_at_count_with_oldest_based_remaining() {
        // At count: denied with window - (now - oldest), nothing appended.
        let (active, left) = rate_limit_step(&[1000, 2000], 2, 60_000, 3000);
        assert_eq!(active, vec![1000, 2000]);
        assert_eq!(left, 60_000 - (3000 - 1000));
    }

    #[test]
    fn rate_limit_window_prunes_entries_outside_the_window() {
        // Strict `now - t < windowMs`: an entry exactly window old drops.
        let (active, left) = rate_limit_step(&[1000, 59_000], 2, 60_000, 61_000);
        assert_eq!((active, left), (vec![59_000, 61_000], 0));
        // A fully stale window allows fresh.
        let (active, left) = rate_limit_step(&[1000, 2000], 2, 60_000, 70_000);
        assert_eq!((active, left), (vec![70_000], 0));
    }

    #[test]
    fn rate_limit_window_disabled_config_always_allows() {
        // Mirrors the `count <= 0 || windowMs <= 0` early return.
        assert_eq!(
            rate_limit_step(&[1, 2, 3], 0, 60_000, 4),
            (vec![1, 2, 3], 0)
        );
        assert_eq!(rate_limit_step(&[1, 2, 3], 2, 0, 4), (vec![1, 2, 3], 0));
        assert_eq!(rate_limit_step(&[1, 2, 3], 2, -1, 4), (vec![1, 2, 3], 0));
    }

    async fn temp_pool() -> Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn debounce_blocks_then_releases_in_shared_store() {
        let pool = temp_pool().await;
        assert_eq!(debounce_check(&pool, 9, 1000).await, 0);
        assert_eq!(debounce_check(&pool, 9, 1500).await, 500);
        // Denied runs store nothing, so the window still ends 1s after
        // the first stamp (exact boundary allows).
        assert_eq!(debounce_check(&pool, 9, 2000).await, 0);
        // Prefix helper leg has its own key; slash stays separate.
        assert_eq!(
            helper_cooldown_check(&pool, "9", "msg_commands", 1000, 2000).await,
            0
        );
        assert_eq!(
            helper_cooldown_check(&pool, "9", "msg_commands", 1000, 2500).await,
            500
        );
        // Per-command cooldowns key off the command path as method.
        assert_eq!(
            helper_cooldown_check(&pool, "9", "ban", 5000, 3000).await,
            0
        );
        assert_eq!(
            helper_cooldown_check(&pool, "9", "ban", 5000, 4000).await,
            4000
        );
    }

    #[tokio::test]
    async fn rate_limit_window_blocks_then_releases_in_shared_store() {
        let pool = temp_pool().await;
        assert_eq!(
            command_rate_limit_check(&pool, 7, "ban", 9, 2, 60_000, 1000).await,
            0
        );
        assert_eq!(
            command_rate_limit_check(&pool, 7, "ban", 9, 2, 60_000, 2000).await,
            0
        );
        assert_eq!(
            command_rate_limit_check(&pool, 7, "ban", 9, 2, 60_000, 3000).await,
            60_000 - (3000 - 1000)
        );
        // Other users get their own window.
        assert_eq!(
            command_rate_limit_check(&pool, 7, "ban", 10, 2, 60_000, 3000).await,
            0
        );
        // Past the window the oldest entry drops out and a slot frees up.
        assert_eq!(
            command_rate_limit_check(&pool, 7, "ban", 9, 2, 60_000, 61_000).await,
            0
        );
        // Disabled config never touches the store and always allows.
        assert_eq!(
            command_rate_limit_check(&pool, 7, "ban", 9, 0, 60_000, 61_000).await,
            0
        );
    }

    #[test]
    fn crash_slash_invocation_matches_ts_command_path_field() {
        assert_eq!(slash_invocation("ban"), "/ban\n\n");
        assert_eq!(slash_invocation("config set"), "/config set\n\n");
    }

    #[test]
    fn prefix_dispatch_is_case_insensitive_like_ts() {
        // TS lowercases the invoked name before lookup
        // (messageCommandHandler.ts `args.shift()?.toLowerCase()`).
        // Both mention-prefix settings must keep the pin.
        assert!(prefix_options(true).case_insensitive_commands);
        assert!(prefix_options(false).case_insensitive_commands);
    }

    #[test]
    fn argument_parse_routes_entity_failures_to_ts_keys() {
        // Serenity ArgumentConvert Display strings -> per-command keys.
        assert_eq!(
            argument_parse_key("Member not found or unknown format").map(|(k, _)| k),
            Some("ban_dont_found_member")
        );
        assert_eq!(
            argument_parse_key("User not found or unknown format").map(|(k, _)| k),
            Some("baninfo_user_not_found")
        );
        assert_eq!(
            argument_parse_key("Role not found or unknown format").map(|(k, _)| k),
            Some("addrolereact_role_not_found")
        );
        assert_eq!(
            argument_parse_key("Channel not found or unknown format").map(|(k, _)| k),
            Some("stats_channel_invalid")
        );
        // Counts / bool / choices / numbers fall through to the caret embed.
        for other in [
            "Too few arguments were passed",
            "Too many arguments were passed",
            "A required attachment is missing",
            "You entered a non-existent choice",
            "Expected a string like yes or no for the boolean parameter",
            "invalid digit found in string",
        ] {
            assert_eq!(argument_parse_key(other), None);
        }
    }

    #[test]
    fn cooldown_denial_renders_ts_template() {
        // Real en-US template: fails if the TS key/placeholders move.
        let template = crate::lang::get("en-US", "global_command_cooldown_msg").unwrap_or_default();
        assert!(template.contains("${emoji}"));
        assert!(template.contains("${time}"));
        assert!(template.contains("${ctx.commandPath}"));
        let msg = cooldown_denial_message(&template, "WARN", 2500, "ban");
        assert!(msg.contains("WARN"));
        assert!(msg.contains("ban"));
        assert!(!msg.contains("${"));
    }

    #[test]
    fn caret_index_prefers_failed_input_then_args_len() {
        // Mirrors checkCommandArgs: invalid arg -> its position,
        // missing/unknown input -> args length (missingIndex).
        let args = vec!["@u".to_string(), "bad".to_string()];
        assert_eq!(caret_error_index(&args, Some("bad")), 1);
        assert_eq!(caret_error_index(&args, Some("missing")), 2);
        assert_eq!(caret_error_index(&args, None), 2);
    }

    #[test]
    fn parse_git_remote_mirrors_version_ts() {
        // https passthrough (trailing .git stripped).
        assert_eq!(
            parse_git_remote("https://gitlab.com/ihrz/ihrz.git"),
            "https://gitlab.com/ihrz/ihrz"
        );
        assert_eq!(
            parse_git_remote("https://gitlab.com/ihrz/ihrz"),
            "https://gitlab.com/ihrz/ihrz"
        );
        // scp-like syntax becomes https.
        assert_eq!(
            parse_git_remote("git@gitlab.com:ihrz/ihrz.git"),
            "https://gitlab.com/ihrz/ihrz"
        );
        assert_eq!(parse_git_remote("  "), "");
        assert_eq!(parse_git_remote(""), "");
    }

    #[test]
    fn resolve_git_remote_prefers_env() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("GIT_REMOTE", "git@gitlab.com:ihrz/ihrz.git");
        assert_eq!(resolve_git_remote(), "https://gitlab.com/ihrz/ihrz");
        std::env::remove_var("GIT_REMOTE");
    }

    #[test]
    fn dm_body_templates_come_from_yaml_per_locale() {
        // Reuses the existing newsletter_dm_body key with its
        // placeholders, resolved per owner locale (mirrors sendDm via
        // getOwnerLang); no live Discord needed (YAML tables only).
        for code in ["en-US", "fr-FR"] {
            let template = resolve_dm_body_template_for(code);
            assert!(!template.is_empty(), "empty template for {code}");
            assert!(
                template.contains("{owner}"),
                "missing {{owner}} placeholder for {code}"
            );
            assert!(
                template.contains("{version}"),
                "missing {{version}} placeholder for {code}"
            );
            assert!(
                template.contains("{releaseUrl}"),
                "missing {{releaseUrl}} placeholder for {code}"
            );
        }
    }

    #[test]
    fn empty_cache_yields_no_owner_rows_offline() {
        // No live Discord: a default cache has no guilds to enumerate.
        let cache = serenity::Cache::default();
        assert!(collect_guild_owners(&cache).is_empty());
    }

    #[test]
    fn perm_strip_drops_perm_keys_recursively() {
        let mut v = serde_json::json!({
            "name": "x",
            "perm": "admin",
            "permission": 8,
            "options": [
                {"name": "a", "perm": "x", "nested": {"permission": true, "keep": 1}}
            ],
            "plain": [1, "s", null]
        });
        strip_perm_props(&mut v);
        assert_eq!(
            v,
            serde_json::json!({
                "name": "x",
                "options": [{"name": "a", "nested": {"keep": 1}}],
                "plain": [1, "s", null]
            })
        );
        // Non-objects pass through untouched.
        let mut scalar = serde_json::json!("perm");
        strip_perm_props(&mut scalar);
        assert_eq!(scalar, serde_json::json!("perm"));
    }

    #[test]
    fn shard_presence_template_matches_ts() {
        assert_eq!(
            shard_presence_name(0, 123),
            "Shards #0 | 123 Servers | www.ihorizon.org"
        );
        assert_eq!(
            shard_presence_name(3, 0),
            "Shards #3 | 0 Servers | www.ihorizon.org"
        );
    }

    #[test]
    fn session_start_warning_threshold_matches_ts() {
        // Mirrors `remaining < 10` in getOptimalShardCount: 10 is fine,
        // 9 warns.
        assert!(!session_starts_low(10));
        assert!(!session_starts_low(1000));
        assert!(session_starts_low(9));
        assert!(session_starts_low(0));
    }

    #[test]
    fn session_reset_secs_rounds_like_ts_math_round() {
        // Mirrors `Math.round(reset_after / 1000)` (reset_after in ms).
        assert_eq!(session_reset_secs(0), 0);
        assert_eq!(session_reset_secs(1400), 1);
        assert_eq!(session_reset_secs(1500), 2);
        assert_eq!(session_reset_secs(60_000), 60);
    }

    #[test]
    fn shard_override_rejects_zero_explicitly() {
        // TOTAL_SHARDS=0 is rejected (None) instead of silently falling
        // back; positive overrides pass through, unset stays unset.
        assert_eq!(valid_shard_override(Some(4)), Some(4));
        assert_eq!(valid_shard_override(Some(0)), None);
        assert_eq!(valid_shard_override(None), None);
    }

    #[test]
    fn track_error_owner_uses_first_configured_owner() {
        let owners = vec!["111".to_string(), "222".to_string()];
        assert_eq!(track_error_owner(&owners), Some("111"));
        let blank: Vec<String> = vec!["   ".to_string()];
        assert_eq!(track_error_owner(&blank), None);
        let empty: Vec<String> = vec![];
        assert_eq!(track_error_owner(&empty), None);
    }

    #[test]
    fn requeued_branch_only_matches_requeued_recovery() {
        use crate::lavalink::ErrorRecovery;
        assert_eq!(
            requeued_title(&ErrorRecovery::Requeued {
                title: "hit".to_string()
            }),
            Some("hit")
        );
        for other in [
            ErrorRecovery::Advanced,
            ErrorRecovery::Idle,
            ErrorRecovery::NoPlayer,
        ] {
            assert_eq!(requeued_title(&other), None);
        }
    }

    #[test]
    fn users_names_warm_keeps_username_and_global_name() {
        let rows = collect_users_names(vec![
            (1u64, "alice".to_string(), Some("Alice".to_string())),
            (2u64, "bot".to_string(), None),
            // Later rows win, like Map.set in the TS warm loop.
            (1u64, "alice2".to_string(), None),
        ]);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[&1], ("alice2".to_string(), None));
        assert_eq!(rows[&2], ("bot".to_string(), None));
        assert!(collect_users_names(vec![]).is_empty());
    }

    #[tokio::test]
    async fn ready_registers_exception_report_from_config() {
        // Mirrors the setup-block wiring (ERRCHAN-FEED): live Http +
        // lavalink_logs_channel_id + owners snapshot from Config.
        // Hermetic fresh manager; the stored-ctx roundtrip itself is
        // covered in lavalink.rs.
        let cfg = crate::config::Config::default();
        crate::lavalink::LavalinkManager::new()
            .register_exception_report(
                std::sync::Arc::new(serenity::Http::new("dummy")),
                cfg.lavalink_logs_channel_id.clone(),
                cfg.owners.clone(),
            )
            .await;
    }
}
