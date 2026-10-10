use super::*;
use poise::serenity_prelude as serenity;

/// Single-set log types. Mirrors the TS slash `type` choices
/// (`boost` / `message` singular); plural spellings from the old
/// `LOG_TYPES` copy and the TS `auto` ids (`boosts`, `ticket-log-channel`)
/// are folded by `normalize_log_type` below.
pub const SINGLE_LOG_TYPES: [&str; 10] = [
    "antispam",
    "boost",
    "channel",
    "message",
    "moderation",
    "roles",
    "ticket",
    "voice",
    "confession",
    "economy",
];

/// Bulk `auto` ids in TS `allLogsPossible` order. Note the TS quirk:
/// auto writes `SERVER_LOGS.boosts` (plural, matching the boost reader)
/// while single-set writes `boost` (singular, matching the slash
/// choice); both spellings are kept and cross-read.
pub const AUTO_LOG_IDS: [&str; 10] = [
    "voice",
    "moderation",
    "message",
    "boosts",
    "roles",
    "ticket-log-channel",
    "antispam",
    "channel",
    "confession",
    "economy",
];

/// Canonicalize a log-type token: trim + lowercase, fold the known
/// aliases (`boosts` -> `boost`, `messages` -> `message`,
/// `ticket-log-channel` -> `ticket`).
pub fn normalize_log_type(t: &str) -> String {
    match t.trim().to_ascii_lowercase().as_str() {
        "boosts" => "boost".to_string(),
        "messages" => "message".to_string(),
        "ticket-log-channel" => "ticket".to_string(),
        other => other.to_string(),
    }
}

pub fn is_log_mode(t: &str) -> bool {
    t == "auto" || t == "off"
}

pub fn is_single_log_type(t: &str) -> bool {
    SINGLE_LOG_TYPES.contains(&normalize_log_type(t).as_str())
}

/// Lang key for an auto id's display name (`setlogschannel_var_*`).
pub fn auto_display_key(auto_id: &str) -> &'static str {
    match auto_id {
        "voice" => "setlogschannel_var_voice",
        "moderation" => "setlogschannel_var_mods",
        "message" | "messages" => "setlogschannel_var_msg",
        "boost" | "boosts" => "setlogschannel_var_boost",
        "roles" => "setlogschannel_var_roles",
        "ticket" | "ticket-log-channel" => "setlogschannel_var_tickets",
        "antispam" => "setlogschannel_var_antispam",
        "channel" => "setlogschannel_var_channel",
        "confession" => "setlogschannel_var_confession",
        "economy" => "setlogschannel_var_economy",
        _ => "setlogschannel_var_channel",
    }
}

/// en-US fallback for an auto id's display name. Never touch YAML;
/// these are exact copies of the en-US values.
pub fn auto_display_fallback(auto_id: &str) -> &'static str {
    match auto_id {
        "voice" => "Voice Logs",
        "moderation" => "Moderation Logs",
        "message" | "messages" => "Messages Logs",
        "boost" | "boosts" => "Boost Logs",
        "roles" => "Roles Logs",
        "ticket" | "ticket-log-channel" => "Ticket Logs",
        "antispam" => "AntiSpam Logs",
        "channel" => "Channel Logs",
        "confession" => "Confession Logs",
        "economy" => "Economy Logs",
        _ => "Channel Logs",
    }
}

pub fn display_name(code: &str, auto_id: &str) -> String {
    crate::lang::get(code, auto_display_key(auto_id))
        .unwrap_or_else(|| auto_display_fallback(auto_id).to_string())
}

/// Set a logs channel for Audits Logs!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "setlogs",
    aliases("logs", "setlog"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_setlogs(
    ctx: Ctx<'_>,
    #[description = "Log type"] log_type: String,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    if ctx.guild_id().is_none() {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = log_type.trim().to_ascii_lowercase();
    if is_log_mode(&t) {
        if t == "auto" {
            handle_auto(&ctx, &code, channel).await?;
        } else {
            handle_off(&ctx, &code).await?;
        }
        return Ok(());
    }
    // TS stays silent when `type` matches neither `auto`/`off` nor the
    // map (falls off the end despite `thinking: true`); replying
    // `msg_bad_log_type` is intentional — silence leaves the invoker
    // hanging on a deferred interaction.
    if !is_single_log_type(&t) {
        ctx.say(
            crate::lang::get(&code, "msg_bad_log_type")
                .unwrap_or_else(|| "Bad log type.".to_string()),
        )
        .await?;
        return Ok(());
    }
    handle_single(&ctx, &code, &t, channel).await?;
    Ok(())
}

/// Single log type set. Mirrors TS `createLogsChannel`: no-channel ->
/// `guildprofil_not_logs_set`, already-set guard, confirmation posted
/// into the target channel, `setlogschannel_command_work` reply, and a
/// mod-log audit embed.
async fn handle_single(
    ctx: &Ctx<'_>,
    code: &str,
    raw_type: &str,
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let Some(ch) = channel else {
        ctx.say(
            crate::lang::get(code, "guildprofil_not_logs_set")
                .unwrap_or_else(|| "No Channel Logs Set".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = log_channel_key(raw_type);
    let current =
        crate::commands::owner::main::routed_get(&ctx.data().pool, &gid, &gid, &key).await;
    let cid = ch.id.get().to_string();
    if current.as_deref() == Some(cid.as_str()) {
        ctx.say(render_already_set(
            &crate::lang::get(code, "joinghostping_add_already_set")
                .unwrap_or_else(|| "The channel ${channel} is already set!".to_string()),
            &format!("<#{cid}>"),
        ))
        .await?;
        return Ok(());
    }
    let label = display_name(code, raw_type);
    let user_id = ctx.author().id.get();
    // Resolve the Yes app emoji like TS (`client.iHorizon_Emojis.Yes`);
    // plain check-mark fallback when the emoji cache is cold (no YAML).
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let confirmation = render_confirmation(
        &crate::lang::get(code, "setlogschannel_confirmation_message").unwrap_or_else(|| {
            "${client.iHorizon_Emojis.Yes} | Here is now for the `${typeOfLogs}`, setup by <@${interaction.user.id}>!".to_string()
        }),
        &yes,
        user_id,
        &label,
    );
    let _ = ch
        .id
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new().content(confirmation),
        )
        .await;
    crate::commands::owner::main::routed_set(&ctx.data().pool, &gid, &gid, &key, &cid).await?;
    ctx.say(render_work(
        &crate::lang::get(code, "setlogschannel_command_work").unwrap_or_else(|| {
            "You have successfully set up the `${typeOfLogs}` in <#${argsid.id}>!".to_string()
        }),
        &cid,
        &label,
    ))
    .await?;
    let title = crate::lang::get(code, "setlogschannel_logs_embed_title")
        .unwrap_or_else(|| "Set ServerLogs".to_string());
    let desc = render_enable_log(
        &crate::lang::get(code, "setlogschannel_logs_embed_description_on_enable").unwrap_or_else(
            || "<@${interaction.user.id}> set `${typeOfLogs}` to <#${argsid.id}>".to_string(),
        ),
        user_id,
        &cid,
        &label,
    );
    post_mod_log(ctx, &title, &desc).await;
    Ok(())
}

/// `auto` mode. With a channel: point every log at it (TS fast path).
/// Without: bulk-create the missing log channels under a `LOGS`
/// category (TS slow path), skipping channels that already exist.
/// Shared with the prefix-only `autologs` preset (`autologs.rs`),
/// which delegates here with no channel like TS.
pub(crate) async fn handle_auto(
    ctx: &Ctx<'_>,
    code: &str,
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    if let Some(ch) = channel {
        let cid = ch.id.get().to_string();
        for id in AUTO_LOG_IDS {
            let _ =
                crate::commands::owner::main::routed_set(pool, &gid, &gid, &auto_db_key(id), &cid)
                    .await;
        }
        let labels = AUTO_LOG_IDS
            .iter()
            .map(|id| display_name(code, id))
            .collect::<Vec<_>>();
        let user_id = ctx.author().id.get();
        let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        let confirmation = render_confirmation(
            &crate::lang::get(code, "setlogschannel_confirmation_message").unwrap_or_else(|| {
                "${client.iHorizon_Emojis.Yes} | Here is now for the `${typeOfLogs}`, setup by <@${interaction.user.id}>!".to_string()
            }),
            &yes,
            user_id,
            &labels.join(","),
        );
        let _ = ch
            .id
            .send_message(
                ctx.http(),
                serenity::CreateMessage::new().content(confirmation),
            )
            .await;
        ctx.say(render_utils_work(
            &crate::lang::get(code, "setlogschannel_utils_command_work").unwrap_or_else(|| {
                "You have successfully set up the `${typeOfLogs}` in ${argsid.id}!".to_string()
            }),
            &format!("<#{cid}>"),
            &labels.join(", "),
        ))
        .await?;
        return Ok(());
    }
    let existing = guild_channels(ctx.http(), guild_id).await;
    let mut missing: Vec<&str> = Vec::new();
    let mut category: Option<serenity::ChannelId> = None;
    for id in AUTO_LOG_IDS {
        let stored =
            crate::commands::owner::main::routed_get(pool, &gid, &gid, &auto_db_key(id)).await;
        match stored.and_then(|s| s.parse::<u64>().ok()) {
            Some(num) if existing.iter().any(|c| c.id.get() == num) => {
                if category.is_none() {
                    category = existing
                        .iter()
                        .find(|c| c.id.get() == num)
                        .and_then(|c| c.parent_id);
                }
            }
            _ => missing.push(id),
        }
    }
    if missing.is_empty() {
        ctx.say(
            crate::lang::get(code, "setlogschannel_all_already_exist")
                .unwrap_or_else(|| "All the log channels are already configured!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let category_id = match category {
        Some(id) => id,
        None => match create_logs_category(ctx.http(), guild_id).await {
            Some(id) => id,
            None => {
                ctx.say(
                    crate::lang::get(code, "setlogschannel_command_error")
                        .unwrap_or_else(|| "An error occurred. Please try again.".to_string()),
                )
                .await?;
                return Ok(());
            }
        },
    };
    let user_id = ctx.author().id.get();
    let mut created: Vec<String> = Vec::new();
    let mut created_labels: Vec<String> = Vec::new();
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    for id in &missing {
        let label = display_name(code, id);
        let builder = serenity::CreateChannel::new(slug_channel_name(&label))
            .kind(serenity::ChannelType::Text)
            .category(category_id);
        let Ok(new_ch) = guild_id.create_channel(ctx.http(), builder).await else {
            continue;
        };
        let new_id = new_ch.id.get().to_string();
        let _ =
            crate::commands::owner::main::routed_set(pool, &gid, &gid, &auto_db_key(id), &new_id)
                .await;
        let confirmation = render_confirmation(
            &crate::lang::get(code, "setlogschannel_confirmation_message").unwrap_or_else(|| {
                "${client.iHorizon_Emojis.Yes} | Here is now for the `${typeOfLogs}`, setup by <@${interaction.user.id}>!".to_string()
            }),
            &yes,
            user_id,
            &label,
        );
        let _ = new_ch
            .id
            .send_message(
                ctx.http(),
                serenity::CreateMessage::new().content(confirmation),
            )
            .await;
        created.push(format!("<#{new_id}>"));
        created_labels.push(label);
    }
    if !created.is_empty() {
        ctx.say(render_utils_work(
            &crate::lang::get(code, "setlogschannel_utils_command_work").unwrap_or_else(|| {
                "You have successfully set up the `${typeOfLogs}` in ${argsid.id}!".to_string()
            }),
            &created.join(","),
            &created_labels.join(", "),
        ))
        .await?;
    }
    Ok(())
}

/// `off` mode. Mirrors TS: audit first, `already_deleted` when no
/// `SERVER_LOGS` row exists, otherwise bulk-delete the subtree.
async fn handle_off(ctx: &Ctx<'_>, code: &str) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let user_id = ctx.author().id.get();
    let title = crate::lang::get(code, "setlogschannel_logs_embed_title")
        .unwrap_or_else(|| "Set ServerLogs".to_string());
    let desc = render_disable_log(
        &crate::lang::get(code, "setlogschannel_logs_embed_description_on_off").unwrap_or_else(
            || "<@${interaction.user.id}> deleted all `SERVER_LOGS` in the guild!".to_string(),
        ),
        user_id,
    );
    post_mod_log(ctx, &title, &desc).await;
    if !any_server_logs_set(pool, &gid).await {
        ctx.say(
            crate::lang::get(code, "setlogschannel_already_deleted")
                .unwrap_or_else(|| "This server doesn't have `SERVER_LOGS` set!".to_string()),
        )
        .await?;
        return Ok(());
    }
    clear_server_logs(pool, &gid).await;
    let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
    ctx.say(render_delete_ok(
        &crate::lang::get(code, "setlogschannel_command_work_on_delete").unwrap_or_else(|| {
            "You have successfully deleted all of `SERVER_LOGS` in **${interaction.guild.name}**"
                .to_string()
        }),
        &guild_name,
    ))
    .await?;
    Ok(())
}

async fn guild_channels(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
) -> Vec<serenity::GuildChannel> {
    http.get_channels(guild_id).await.unwrap_or_default()
}

async fn create_logs_category(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
) -> Option<serenity::ChannelId> {
    use serenity::{PermissionOverwrite, PermissionOverwriteType, Permissions, RoleId};
    let everyone = RoleId::new(guild_id.get());
    let builder = serenity::CreateChannel::new("LOGS")
        .kind(serenity::ChannelType::Category)
        .permissions(vec![PermissionOverwrite {
            allow: Permissions::empty(),
            deny: Permissions::VIEW_CHANNEL
                | Permissions::SEND_MESSAGES
                | Permissions::READ_MESSAGE_HISTORY,
            kind: PermissionOverwriteType::Role(everyone),
        }]);
    guild_id
        .create_channel(http, builder)
        .await
        .ok()
        .map(|c| c.id)
}

/// Post a mod-log embed. Mirrors `ihorizon_logs.ts` (best-effort, silent
/// when missing): the configured moderation log channel wins when set,
/// otherwise the name-contains `ihorizon-logs` channel.
async fn post_mod_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    let embed = || {
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(0xbf0bb9))
            .title(title.to_string())
            .description(description.to_string())
    };
    if let Some(guild_id) = ctx.guild_id() {
        let gid = guild_id.get().to_string();
        if let Some(target) = load_log_channel_routed(&ctx.data().pool, &gid, "moderation").await {
            if let Ok(num) = target.parse::<u64>() {
                let _ = serenity::ChannelId::new(num)
                    .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed()))
                    .await;
                return;
            }
        }
    }
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let _ = ch
        .id
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed()))
        .await;
}

/// Discord channel names: lowercase, separator runs collapsed to one
/// dash. Mirrors the TS intent (auto-created channels from localized
/// labels must be Discord-safe): spaces/underscores/dots/dashes fold
/// to a single `-`, other punctuation is dropped, and non-ASCII
/// letters are kept (Discord allows unicode channel names).
pub fn slug_channel_name(label: &str) -> String {
    let mut out = String::with_capacity(label.len());
    for ch in label.to_lowercase().chars() {
        if ch.is_alphanumeric() {
            out.push(ch);
        } else if ch == ' ' || ch == '_' || ch == '.' || ch == '-' || ch.is_whitespace() {
            if !out.is_empty() && !out.ends_with('-') {
                out.push('-');
            }
        }
    }
    let slug = out.trim_matches('-').to_string();
    if slug.is_empty() {
        "logs".to_string()
    } else {
        slug
    }
}

/// Key for one log type. Mirrors the TS single-set write
/// (`setlogschannel.ts:264-272,317-327`): only the exact
/// `ticket-log-channel` id uses the special `GUILD.TICKET.logs` key;
/// the slash `ticket` choice writes `GUILD.SERVER_LOGS.ticket` like
/// every other type. Other spellings still normalize (`boosts` folds
/// to `boost`, `messages` to `message`).
pub fn log_channel_key(log_type: &str) -> String {
    if log_type.trim().to_ascii_lowercase() == "ticket-log-channel" {
        return "GUILD.TICKET.logs".to_string();
    }
    let norm = normalize_log_type(log_type);
    if norm == "ticket" {
        return "GUILD.SERVER_LOGS.ticket".to_string();
    }
    format!("GUILD.SERVER_LOGS.{norm}")
}

/// DB key for one bulk-`auto` id. Keeps the exact TS `allLogsPossible`
/// spelling (`boosts` plural, `ticket-log-channel` -> `TICKET.logs`)
/// so auto-created rows match TS.
pub fn auto_db_key(auto_id: &str) -> String {
    if auto_id == "ticket-log-channel" {
        return "GUILD.TICKET.logs".to_string();
    }
    format!("GUILD.SERVER_LOGS.{auto_id}")
}

/// Table-first log-channel read with legacy fallback. Both ticket rows
/// cross-read: `GUILD.SERVER_LOGS.ticket` (slash single-set) and the
/// special `GUILD.TICKET.logs` (`ticket-log-channel` id);
/// `boost`/`message` also cross-read their plural spellings.
pub async fn load_log_channel_routed(
    pool: &crate::db::Pool,
    gid: &str,
    log_type: &str,
) -> Option<String> {
    let norm = normalize_log_type(log_type);
    let mut keys = vec![log_channel_key(&norm)];
    match norm.as_str() {
        "boost" => keys.push("GUILD.SERVER_LOGS.boosts".to_string()),
        "boosts" => keys.push("GUILD.SERVER_LOGS.boost".to_string()),
        "message" => keys.push("GUILD.SERVER_LOGS.messages".to_string()),
        "messages" => keys.push("GUILD.SERVER_LOGS.message".to_string()),
        "ticket" => keys.push("GUILD.TICKET.logs".to_string()),
        _ => {}
    }
    for key in &keys {
        if let Some(v) = crate::commands::owner::main::routed_get(pool, gid, gid, key).await {
            return Some(v);
        }
    }
    None
}

/// True when any `SERVER_LOGS` leaf (canonical or alias spelling) is
/// set. Mirrors the TS `off` guard (`checkData` on the subtree).
pub async fn any_server_logs_set(pool: &crate::db::Pool, gid: &str) -> bool {
    for id in AUTO_LOG_IDS {
        if id == "ticket-log-channel" {
            continue;
        }
        if crate::commands::owner::main::routed_get(pool, gid, gid, &auto_db_key(id))
            .await
            .is_some()
        {
            return true;
        }
    }
    for t in ["boost", "message"] {
        if crate::commands::owner::main::routed_get(pool, gid, gid, &log_channel_key(t))
            .await
            .is_some()
        {
            return true;
        }
    }
    false
}

/// Bulk-delete every `SERVER_LOGS` leaf (both spellings), the subtree
/// root in both stores, and any legacy prefix rows. `TICKET.logs` is
/// left alone, like TS `off` (which deletes only the subtree).
pub async fn clear_server_logs(pool: &crate::db::Pool, gid: &str) -> bool {
    let mut removed = false;
    for id in AUTO_LOG_IDS {
        if id == "ticket-log-channel" {
            continue;
        }
        if let Ok(true) =
            crate::commands::owner::main::routed_del(pool, gid, gid, &auto_db_key(id)).await
        {
            removed = true;
        }
    }
    for key in [
        log_channel_key("boost"),
        log_channel_key("message"),
        "GUILD.SERVER_LOGS.ticket".to_string(),
    ] {
        if let Ok(true) = crate::commands::owner::main::routed_del(pool, gid, gid, &key).await {
            removed = true;
        }
    }
    if let Ok(true) = crate::commands::owner::main::tbl_del(pool, gid, "GUILD.SERVER_LOGS").await {
        removed = true;
    }
    if crate::commands::owner::main::legacy_del_prefix(pool, gid, "GUILD.SERVER_LOGS")
        .await
        .is_ok()
    {
        removed = true;
    }
    removed
}

pub fn render_confirmation(
    template: &str,
    yes_markup: &str,
    user_id: u64,
    type_label: &str,
) -> String {
    template
        .replace("${client.iHorizon_Emojis.Yes}", yes_markup)
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${typeOfLogs}", type_label)
}

pub fn render_work(template: &str, channel_id: &str, type_label: &str) -> String {
    template
        .replace("${argsid.id}", channel_id)
        .replace("${typeOfLogs}", type_label)
}

pub fn render_utils_work(template: &str, mentions: &str, types: &str) -> String {
    template
        .replace("${argsid.id}", mentions)
        .replace("${typeOfLogs}", types)
}

pub fn render_already_set(template: &str, channel_mention: &str) -> String {
    template.replace("${channel}", channel_mention)
}

pub fn render_delete_ok(template: &str, guild_name: &str) -> String {
    template.replace("${interaction.guild.name}", guild_name)
}

pub fn render_enable_log(
    template: &str,
    user_id: u64,
    channel_id: &str,
    type_label: &str,
) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${argsid.id}", channel_id)
        .replace("${typeOfLogs}", type_label)
}

pub fn render_disable_log(template: &str, user_id: u64) -> String {
    template.replace("${interaction.user.id}", &user_id.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn log_key_unchanged() {
        assert_eq!(
            log_channel_key("moderation"),
            "GUILD.SERVER_LOGS.moderation"
        );
        // No `all` type in TS (modes are `auto`/`off`); it normalizes
        // through untouched and matches no single type.
        assert!(!is_single_log_type("all"));
    }

    #[test]
    fn single_keys_use_singular_boost_message() {
        assert_eq!(log_channel_key("boost"), "GUILD.SERVER_LOGS.boost");
        assert_eq!(log_channel_key("boosts"), "GUILD.SERVER_LOGS.boost");
        assert_eq!(log_channel_key("message"), "GUILD.SERVER_LOGS.message");
        assert_eq!(log_channel_key("messages"), "GUILD.SERVER_LOGS.message");
    }

    #[test]
    fn ticket_uses_special_key() {
        // Single-set `ticket` (slash choice) writes SERVER_LOGS.ticket
        // like every other type; only the exact `ticket-log-channel`
        // id uses the special TICKET.logs key.
        assert_eq!(log_channel_key("ticket"), "GUILD.SERVER_LOGS.ticket");
        assert_eq!(log_channel_key("ticket-log-channel"), "GUILD.TICKET.logs");
        assert_eq!(auto_db_key("ticket-log-channel"), "GUILD.TICKET.logs");
    }

    #[test]
    fn auto_keeps_ts_boosts_spelling() {
        assert_eq!(auto_db_key("boosts"), "GUILD.SERVER_LOGS.boosts");
        assert_eq!(auto_db_key("message"), "GUILD.SERVER_LOGS.message");
    }

    #[test]
    fn normalize_folds_aliases() {
        assert_eq!(normalize_log_type("Boosts"), "boost");
        assert_eq!(normalize_log_type(" messages "), "message");
        assert_eq!(normalize_log_type("ticket-log-channel"), "ticket");
        assert_eq!(normalize_log_type("voice"), "voice");
    }

    #[test]
    fn mode_and_single_guards() {
        assert!(is_log_mode("auto"));
        assert!(is_log_mode("off"));
        assert!(!is_log_mode("voice"));
        assert!(is_single_log_type("boost"));
        assert!(is_single_log_type("boosts"));
        assert!(is_single_log_type("message"));
        assert!(is_single_log_type("ticket"));
        assert!(!is_single_log_type("auto"));
        assert!(!is_single_log_type("bogus"));
    }

    #[test]
    fn renders_mirror_ts_templates() {
        assert_eq!(
            render_confirmation(
                "${client.iHorizon_Emojis.Yes} | Here is now for the `${typeOfLogs}`, setup by <@${interaction.user.id}>!",
                "<:Yes:123>",
                42,
                "Voice Logs"
            ),
            "<:Yes:123> | Here is now for the `Voice Logs`, setup by <@42>!"
        );
        assert_eq!(
            render_work(
                "You have successfully set up the `${typeOfLogs}` in <#${argsid.id}>!",
                "7",
                "Voice Logs"
            ),
            "You have successfully set up the `Voice Logs` in <#7>!"
        );
        assert_eq!(
            render_already_set("The channel ${channel} is already set!", "<#7>"),
            "The channel <#7> is already set!"
        );
        assert_eq!(
            render_delete_ok(
                "You have successfully deleted all of `SERVER_LOGS` in **${interaction.guild.name}**",
                "Acme"
            ),
            "You have successfully deleted all of `SERVER_LOGS` in **Acme**"
        );
        assert_eq!(
            render_enable_log(
                "<@${interaction.user.id}> set `${typeOfLogs}` to <#${argsid.id}>",
                42,
                "7",
                "Voice Logs"
            ),
            "<@42> set `Voice Logs` to <#7>"
        );
        assert_eq!(
            render_disable_log(
                "<@${interaction.user.id}> deleted all `SERVER_LOGS` in the guild!",
                42
            ),
            "<@42> deleted all `SERVER_LOGS` in the guild!"
        );
    }

    #[test]
    fn slug_channel_name_sanitizes() {
        assert_eq!(slug_channel_name("Voice Logs"), "voice-logs");
        assert_eq!(slug_channel_name("AntiSpam Logs"), "antispam-logs");
        assert_eq!(slug_channel_name("!!!"), "logs");
        // Separator runs collapse to one dash (the old `&&`/`||`
        // precedence bug produced doubles for spaces).
        assert_eq!(slug_channel_name("a  b..c--d"), "a-b-c-d");
        // Non-ASCII letters are kept (Discord allows unicode names).
        assert_eq!(slug_channel_name("Économie Logs"), "économie-logs");
    }

    #[tokio::test]
    async fn log_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            &log_channel_key("moderation"),
            "123",
        )
        .await
        .unwrap();
        let routed = crate::commands::owner::main::routed_get(
            &pool,
            "g1",
            "g1",
            &log_channel_key("moderation"),
        )
        .await
        .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&routed).unwrap(),
            serde_json::json!(123)
        );
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "moderation")
                .await
                .as_deref(),
            Some("123")
        );
        assert_eq!(load_log_channel_routed(&pool, "g1", "voice").await, None);
        assert_eq!(
            load_log_channel_routed(&pool, "g2", "moderation").await,
            None
        );
    }

    #[tokio::test]
    async fn log_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(&pool, "g1", &log_channel_key("voice"), "456")
            .await
            .unwrap();
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "voice")
                .await
                .as_deref(),
            Some("456")
        );
    }

    #[tokio::test]
    async fn log_clear_removes_both_stores() {
        let pool = memory_pool().await;
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            &log_channel_key("ticket"),
            "789",
        )
        .await
        .unwrap();
        let removed =
            crate::commands::owner::main::routed_del(&pool, "g1", "g1", &log_channel_key("ticket"))
                .await
                .unwrap();
        assert!(removed);
        assert_eq!(load_log_channel_routed(&pool, "g1", "ticket").await, None);
    }

    #[tokio::test]
    async fn boost_cross_reads_plural_rows() {
        let pool = memory_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", &auto_db_key("boosts"), "111")
            .await
            .unwrap();
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "boost")
                .await
                .as_deref(),
            Some("111")
        );
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "boosts")
                .await
                .as_deref(),
            Some("111")
        );
    }

    #[tokio::test]
    async fn ticket_single_set_reads_legacy_server_logs_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(&pool, "g1", "GUILD.SERVER_LOGS.ticket", "222")
            .await
            .unwrap();
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "ticket")
                .await
                .as_deref(),
            Some("222")
        );
    }

    #[tokio::test]
    async fn off_guard_and_bulk_delete() {
        let pool = memory_pool().await;
        assert!(!any_server_logs_set(&pool, "g1").await);
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", &auto_db_key("boosts"), "111")
            .await
            .unwrap();
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            &log_channel_key("message"),
            "333",
        )
        .await
        .unwrap();
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            &log_channel_key("ticket-log-channel"),
            "444",
        )
        .await
        .unwrap();
        assert!(any_server_logs_set(&pool, "g1").await);
        assert!(clear_server_logs(&pool, "g1").await);
        assert!(!any_server_logs_set(&pool, "g1").await);
        assert_eq!(load_log_channel_routed(&pool, "g1", "boost").await, None);
        assert_eq!(load_log_channel_routed(&pool, "g1", "message").await, None);
        // TS `off` deletes only the SERVER_LOGS subtree: the
        // `ticket-log-channel` row (GUILD.TICKET.logs) survives, while
        // a slash single-set `ticket` row (SERVER_LOGS.ticket) does not.
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "ticket")
                .await
                .as_deref(),
            Some("444")
        );
    }
}
