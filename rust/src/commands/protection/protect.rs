use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

/// Rule values from authorization.ts (cls/all are pseudo-commands).
pub const RULES: [&str; 13] = [
    "webhook",
    "updateguild",
    "createchannel",
    "updatechannel",
    "deletechannel",
    "createrole",
    "deleterole",
    "updaterole",
    "updatemember",
    "banmembers",
    "kickmember",
    "unbanmembers",
    "add_admin_roles",
];

pub fn valid_rule(rule: &str) -> bool {
    RULES.contains(&rule) || rule == "all" || rule == "cls"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleState {
    /// TS `{mode}` vocabulary (`allowlist` | `member` | `nobody`).
    /// Empty on legacy `{allow: bool}` rows (see `effective_mode`).
    #[serde(default)]
    pub mode: String,
    /// Legacy Rust-port shape, kept readable, never written anymore.
    #[serde(default, skip_serializing)]
    pub allow: Option<bool>,
}

impl RuleState {
    /// Effective TS mode. Legacy `{allow: true}` rows read as `member`
    /// (open) and `{allow: false}` as `nobody` (deny-all).
    pub fn effective_mode(&self) -> &str {
        if !self.mode.is_empty() {
            &self.mode
        } else if self.allow == Some(false) {
            "nobody"
        } else {
            "member"
        }
    }
}

/// Rule mode vocabulary from authorization.ts (`!actions.ts` choices).
pub const MODES: [&str; 3] = ["allowlist", "member", "nobody"];

pub fn valid_mode(mode: &str) -> bool {
    MODES.contains(&mode.trim().to_ascii_lowercase().as_str())
}

/// Accept the TS mode values plus the previous on/off switch
/// (`on` -> `member`, `off` -> `nobody`). None on unknown input.
pub fn normalize_mode(raw: &str) -> Option<String> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "allowlist" | "member" | "nobody" => Some(raw.trim().to_ascii_lowercase()),
        "on" | "allow" => Some("member".to_string()),
        "off" | "deny" => Some("nobody".to_string()),
        _ => None,
    }
}

/// Human label for a rule mode, mirroring the `!actions.ts` reply mapping.
pub fn mode_display(lang_code: &str, mode: &str) -> String {
    let (key, fallback) = match mode {
        "member" => ("authorization_actions_everyone", "everyone"),
        "allowlist" => ("authorization_actions_allowlist", "allowlist"),
        _ => ("authorization_actions_nobody", "nobody"),
    };
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// Sanction vocabulary from authorization.ts (`!sanction.ts` choices).
/// Mirrors `punish()` in src/core/functions/method.ts.
pub const SANCTIONS: [&str; 3] = ["simply", "simply+derank", "simply+ban"];

pub fn valid_sanction(sanction: &str) -> bool {
    SANCTIONS.contains(&sanction.trim())
}

/// Human label for a sanction, mirroring the `!sanction.ts` reply mapping.
pub fn sanction_display(lang_code: &str, sanction: &str) -> String {
    let (key, fallback) = match sanction.trim() {
        "simply" => ("authorization_sanction_simply", "simply"),
        "simply+derank" => ("authorization_sanction_simply_unrank", "simply+derank"),
        _ => ("authorization_sanction_simply_ban", "simply+ban"),
    };
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// Guild-owner gate. Mirrors the `interaction.user.id !== guild.ownerId`
/// checks in `!actions.ts:45`, `!show.ts:45`, `!sanction.ts:44`,
/// `allowlist/!add.ts:50` and `allowlist/!remove.ts:50` (all five are
/// owner-only in TS; the second add/remove guard is dead code since the
/// owner check above it always returns first).
pub fn is_guild_owner(author_id: u64, owner_id: u64) -> bool {
    author_id == owner_id
}

/// Resolve the guild owner id: cached guild first, partial-guild fetch
/// as fallback (covers uncached guilds in slash commands).
pub async fn guild_owner_id(ctx: &Ctx<'_>) -> Option<u64> {
    if let Some(g) = ctx.guild() {
        return Some(g.owner_id.get());
    }
    let gid = ctx.guild_id()?;
    gid.to_partial_guild(ctx.http())
        .await
        .ok()
        .map(|g| g.owner_id.get())
}

/// Deny unless the invoker owns the guild, replying with the TS lang key.
/// Returns true when the command must stop (denied or guild unknown).
pub async fn deny_unless_owner(ctx: &Ctx<'_>, key: &str, fallback: &str) -> bool {
    let author = ctx.author().id.get();
    let owner = guild_owner_id(ctx).await.unwrap_or(0);
    if is_guild_owner(author, owner) {
        return false;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string());
    let _ = ctx.say(msg).await;
    true
}

/// Display value for the `${rule.toUpperCase()}` slot of
/// `authorization_actions_rule_set`. TS `!actions.ts:77` replaces it with
/// `allRules.join(",")` for `rule == "all"` (raw values, comma-joined);
/// single rules render uppercased.
pub fn rule_display(rule: &str) -> String {
    if rule == "all" {
        RULES.join(",")
    } else {
        rule.to_uppercase()
    }
}

/// Rule rows for the show panel. Mirrors `!show.ts:79-84`: every
/// PROTECTION.* row except SANCTION as `**RULE** -> `mode`` lines.
pub fn protection_rules_text(rows: &[(String, String)]) -> String {
    let mut text = String::new();
    for (k, v) in rows {
        let Some(name) = k.strip_prefix("PROTECTION.") else {
            continue;
        };
        if name == "SANCTION" {
            continue;
        }
        let mode = serde_json::from_str::<RuleState>(v)
            .map(|r| r.effective_mode().to_string())
            .unwrap_or_else(|_| v.clone());
        text.push_str(&format!("**{}** -> `{mode}`\n", name.to_uppercase()));
    }
    text
}

/// Sanction label for the show panel. Mirrors `!show.ts:87-93`.
pub fn show_sanction_label(lang_code: &str, sanction: Option<&str>) -> String {
    let (key, fallback) = match sanction.unwrap_or("").trim() {
        "simply+ban" => (
            "authorization_configshow_simply_ban",
            "Simply Cancel Action & Ban",
        ),
        "simply+derank" => (
            "authorization_configshow_simply_unrank",
            "Simply Cancel Action & Unrank",
        ),
        _ => ("authorization_configshow_simply", "Simply Cancel Action"),
    };
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// True when the allowlist key rows contain the user. Rows look like
/// `ALLOWLIST.list.<uid>`. Exact-match on purpose (audit P14 kept):
/// TS `allowlist/!show.ts` gates with `!text.includes(user.id)`, where
/// id "12" substring-matches "<@123>"; the exact key comparison here
/// is the intended hardening, not a divergence.
pub fn allowlist_contains(rows: &[String], user_id: u64) -> bool {
    rows.iter()
        .any(|k| k == &format!("ALLOWLIST.list.{user_id}"))
}

/// Mention list for the allowlist panels. Mirrors `!show.ts:61-63` and
/// `allowlist/!show.ts:61-63` (`<@uid>` per line).
pub fn allowlist_mentions(rows: &[String]) -> String {
    let mut ids: Vec<&str> = rows
        .iter()
        .filter_map(|k| k.strip_prefix("ALLOWLIST.list."))
        .collect();
    ids.sort();
    ids.iter().map(|id| format!("<@{id}>\n")).collect()
}

/// Audit action -> protection rule name. Mirrors avoid*.ts mapping.
pub fn rule_for_event(event: &str) -> Option<&'static str> {
    match event {
        "roleCreate" => Some("createrole"),
        "roleDelete" => Some("deleterole"),
        "roleUpdate" => Some("updaterole"),
        "channelCreate" => Some("createchannel"),
        "channelUpdate" => Some("updatechannel"),
        "channelDelete" => Some("deletechannel"),
        "guildBanAdd" => Some("banmembers"),
        "guildBanRemove" => Some("unbanmembers"),
        "guildMemberRemove-kick" => Some("kickmember"),
        "guildUpdate" => Some("updateguild"),
        "webhooksUpdate" => Some("webhook"),
        _ => None,
    }
}

/// Subcommand for protect category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "protection",
    rename = "protect",
    subcommands(
        "protect_rule",
        "protect_sanction",
        "protect_show",
        "protect_allow_add",
        "protect_allow_remove",
        "protect_allow_show"
    ),
    subcommand_required
)]
pub async fn protect(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Whats is the rule to configure?
#[poise::command(slash_command, prefix_command, rename = "rule")]
pub async fn protect_rule(
    ctx: Ctx<'_>,
    #[description = "Rule (or all/cls)"] rule: String,
    #[description = "allowlist, member or nobody (not needed for cls)"] allow: Option<String>,
) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "authorization_actions_not_permited",
        "Only the Owner of the server can edit the authorization rule about the protection module!",
    )
    .await
    {
        return Ok(());
    }
    let rule = rule.trim().to_ascii_lowercase();
    if !valid_rule(&rule) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "msg_bad_rule").unwrap_or_else(|| "Bad rule.".to_string()))
            .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS `allow` is optional (`required: false` in authorization.ts) and
    // `cls` never needs it: only the set legs require a mode, otherwise
    // the TS fallthrough replies `close_error_command`.
    if rule == "cls" {
        // Table-routed clear: legacy prefix rows plus the guild-table subtree.
        crate::commands::owner::main::legacy_del_prefix(&ctx.data().pool, &gid, "PROTECTION.")
            .await?;
        let _ = crate::commands::owner::main::tbl_del(&ctx.data().pool, &gid, "PROTECTION").await;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
        ctx.say(
            crate::lang::get(&code, "authorization_actions_rule_clear")
                .map(|s| {
                    s.replace(
                        "${interaction.user}",
                        &format!("<@{}>", ctx.author().id.get()),
                    )
                    .replace("${interaction.guild.name}", &guild_name)
                })
                .unwrap_or_else(|| "${interaction.user}, all of the rules for `${interaction.guild.name}` have been deleted. Protection module is now disabled!".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Set legs (`all` / single rule) require a mode; without `allow` the
    // TS fallthrough replies `close_error_command`.
    let Some(mode) = allow.as_deref().and_then(normalize_mode) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "close_error_command")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let targets: Vec<String> = if rule == "all" {
        RULES.iter().map(|r| r.to_string()).collect()
    } else {
        vec![rule.clone()]
    };
    for r in targets {
        crate::commands::owner::main::routed_set(
            &ctx.data().pool,
            &gid,
            &gid,
            &format!("PROTECTION.{r}"),
            &serde_json::to_string(&RuleState {
                mode: mode.clone(),
                allow: None,
            })?,
        )
        .await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "authorization_actions_rule_set")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
                .replace("${rule.toUpperCase()}", &rule_display(&rule))
                .replace("${allow}", &mode_display(&code, &mode))
            })
            .unwrap_or_else(|| format!("Rule {rule} set.")),
    )
    .await?;
    Ok(())
}

/// Sanction command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "sanction",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn protect_sanction(
    ctx: Ctx<'_>,
    #[description = "simply, simply+derank or simply+ban"] sanction: String,
) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "authorization_sanction_not_permited",
        "Only the owner of the server can edit the authorization rule about the protection module!",
    )
    .await
    {
        return Ok(());
    }
    let sanction = sanction.trim().to_string();
    if !valid_sanction(&sanction) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "msg_bad_rule").unwrap_or_else(|| "Bad rule.".to_string()))
            .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "PROTECTION.SANCTION",
        &sanction,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "authorization_sanction_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
                .replace("${choose}", &sanction_display(&code, &sanction))
            })
            .unwrap_or_else(|| "${interaction.user}, rule sanction has been set. When the user breaks the rule, it's **${choose}**, and the bot cancels its action.".to_string()),
    )
    .await?;
    Ok(())
}

/// Strip a member of all removable roles. Mirrors `derank()` in
/// src/core/functions/method.ts: a managed app-role keeps its slot
/// with ViewChannel-only permissions; every other role below the
/// bot's highest role (minus @everyone) is removed, per-role
/// failures ignored like the TS `.catch(() => {})`.
pub async fn derank_member(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
    reason: &str,
) -> anyhow::Result<()> {
    let roles = guild_id.roles(http).await?;
    // Fail-closed on unknown bot top role (audit P4): TS reads
    // `me.roles.highest.position`, which throws when the bot member is
    // unresolvable (nothing is removed then). Mirrored here by removing
    // nothing instead of falling back to u16::MAX (fail-open, which
    // would strip every role).
    let bot_id = http.get_current_user().await.map(|u| u.id).ok();
    let Some(bot_id) = bot_id else {
        return Ok(());
    };
    let Ok(bot_member) = guild_id.member(http, bot_id).await else {
        return Ok(());
    };
    // A role-less bot sits at @everyone (position 0) like the TS
    // `highest` fallback; only a truly unknown member (above) aborts.
    let bot_top: u16 = roles
        .values()
        .filter(|r| bot_member.roles.contains(&r.id))
        .map(|r| r.position)
        .max()
        .unwrap_or(0);
    if let Some(app) = roles.values().find(|r| r.managed) {
        let _ = guild_id
            .edit_role(
                http,
                app.id,
                serenity::EditRole::new()
                    .permissions(serenity::Permissions::VIEW_CHANNEL)
                    .audit_log_reason(reason),
            )
            .await;
    }
    let Ok(member) = guild_id.member(http, user_id).await else {
        return Ok(());
    };
    // Audit reason mirrors the TS derank `remove(role.id, reason ||
    // "Protection")` call; Member::remove_role carries no reason, so the
    // HTTP call is made directly.
    let audit_reason = if reason.trim().is_empty() {
        "Protection"
    } else {
        reason
    };
    let everyone = serenity::RoleId::new(guild_id.get());
    for role_id in &member.roles {
        if *role_id == everyone {
            continue;
        }
        let Some(role) = roles.get(role_id) else {
            continue;
        };
        if role.managed || role.position >= bot_top {
            continue;
        }
        let _ = http
            .remove_member_role(guild_id, member.user.id, *role_id, Some(audit_reason))
            .await;
    }
    Ok(())
}

/// Apply a PROTECTION.SANCTION value. Mirrors `punish()` in
/// src/core/functions/method.ts: `simply` only cancels the action
/// (done by the caller's restore leg), `simply+derank` deranks,
/// `simply+ban` bans with a derank fallback when the ban fails.
/// Unknown values no-op like the TS `default` branch.
/// Audit reasons mirror TS exactly (audit P5/P6): the derank legs log
/// "Protection" (`remove(role.id, reason || "Protection")` with the
/// avoid*.ts flows passing no reason); the ban leg logs
/// `reason || "Protect!"`.
pub async fn apply_sanction(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
    sanction: &str,
    reason: &str,
) {
    match sanction.trim() {
        "simply+derank" => {
            let _ = derank_member(http, guild_id, user_id, "Protection").await;
        }
        "simply+ban" => {
            let ban_reason = if reason.trim().is_empty() {
                "Protect!"
            } else {
                reason
            };
            if guild_id
                .ban_with_reason(http, user_id, 0, ban_reason)
                .await
                .is_err()
            {
                let _ = derank_member(http, guild_id, user_id, "Protection").await;
            }
        }
        _ => {}
    }
}

/// All PROTECTION.* rows: guild-table subtree first, legacy kv rows
/// filling gaps (table wins). Mirrors the sticky load_all_stickies
/// union scan; keys unchanged.
pub async fn load_protection_rows(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    use crate::commands::owner::main as routed;
    let mut map = std::collections::HashMap::new();
    if let Some(root) = routed::tbl_get_value(pool, gid, "PROTECTION").await {
        if let Some(obj) = root.as_object() {
            for (k, v) in obj {
                let val = match v {
                    serde_json::Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                map.insert(format!("PROTECTION.{k}"), val);
            }
        }
    }
    for (k, v) in routed::legacy_scan(pool, gid, "PROTECTION.").await {
        map.entry(k).or_insert(v);
    }
    let mut rows: Vec<(String, String)> = map.into_iter().collect();
    rows.sort_by(|a, b| a.0.cmp(&b.0));
    rows
}

/// All ALLOWLIST.list.* key names: guild-table subtree first, legacy
/// kv rows filling gaps. Mirrors the ticket TICKET_ALL prefix scan.
pub async fn load_allowlist(pool: &crate::db::Pool, gid: &str) -> Vec<String> {
    use crate::commands::owner::main as routed;
    let mut ids = std::collections::HashSet::new();
    if let Some(root) = routed::tbl_get_value(pool, gid, "ALLOWLIST").await {
        if let Some(list) = routed::walk_path(&root, &["list"]).and_then(|v| v.as_object()) {
            for k in list.keys() {
                ids.insert(format!("ALLOWLIST.list.{k}"));
            }
        }
    }
    for (k, _) in routed::legacy_scan(pool, gid, "ALLOWLIST.list.").await {
        ids.insert(k);
    }
    let mut rows: Vec<String> = ids.into_iter().collect();
    rows.sort();
    rows
}

/// Show the sticky configuration of one channel
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn protect_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "authorization_configshow_not_permited",
        "Only the owner of the server can edit the authorization rule about the protection module!",
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let rows = load_protection_rows(&ctx.data().pool, &gid).await;
    let allow = load_allowlist(&ctx.data().pool, &gid).await;
    // TS !show.ts:63-73: empty when no allowlist entries or no rules.
    if protection_rules_text(&rows).trim().is_empty() || allow.is_empty() {
        let msg = crate::lang::get(&code, "authorization_configshow_not_anything_setup")
            .unwrap_or_else(|| {
                "You have not set up anything in the Protection Module!".to_string()
            });
        ctx.say(msg).await?;
        return Ok(());
    }
    let mut rules_text = protection_rules_text(&rows);
    let sanction = rows
        .iter()
        .find(|(k, _)| k == "PROTECTION.SANCTION")
        .map(|(_, v)| v.trim().trim_matches('"').to_string());
    let okay = show_sanction_label(&code, sanction.as_deref());
    let punish = crate::lang::get(&code, "authorization_configshow_punishement")
        .map(|s| s.replace("${okay}", &okay))
        .unwrap_or_else(|| format!("```Punishment: {okay}```"));
    rules_text.push_str(&punish);
    let author1 = crate::lang::get(&code, "authorization_configshow_embed1_author")
        .unwrap_or_else(|| "Rule List".to_string());
    let author2 = crate::lang::get(&code, "authorization_configshow_embed2_author")
        .unwrap_or_else(|| "Allowlist".to_string());
    let embed1 = serenity::CreateEmbed::default()
        .colour(0x010101)
        .author(serenity::CreateEmbedAuthor::new(author1))
        .description(rules_text)
        .timestamp(serenity::Timestamp::now());
    let embed2 = serenity::CreateEmbed::default()
        .colour(0x010101)
        .author(serenity::CreateEmbedAuthor::new(author2))
        .description(allowlist_mentions(&allow))
        .timestamp(serenity::Timestamp::now());
    let mut reply = poise::CreateReply::default();
    reply.embeds.push(embed1);
    reply.embeds.push(embed2);
    ctx.send(reply).await?;
    Ok(())
}

/// Allow add command.
#[poise::command(slash_command, prefix_command, rename = "allow-add")]
pub async fn protect_allow_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "allowlist_add_not_owner",
        "Only the owner of the server can add/remove users in the allowlist!",
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS !add.ts:67-72: getMember resolves to null when the user is not in
    // the guild (unreachable member guard).
    if let Some(guild_id) = ctx.guild_id() {
        if guild_id.member(ctx.http(), user.id).await.is_err() {
            let msg =
                crate::lang::get(&code, "allowlist_add_member_unreachable").unwrap_or_else(|| {
                    "The member you wanted to add to the allowlist is unreachable!".to_string()
                });
            ctx.say(msg).await?;
            return Ok(());
        }
    }
    // TS !add.ts:74-79: already allowlisted guard.
    let existing = load_allowlist(&ctx.data().pool, &gid).await;
    if allowlist_contains(&existing, user.id.get()) {
        let msg = crate::lang::get(&code, "allowlist_add_already_in").unwrap_or_else(|| {
            "The member you want to add to the allowlist is already in it!".to_string()
        });
        ctx.say(msg).await?;
        return Ok(());
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ALLOWLIST.list.{}", user.id.get()),
        r#"{"allowed":true}"#,
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "allowlist_add_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "${member.user} has been added to the allowlist!".to_string()),
    )
    .await?;
    Ok(())
}

/// Allow remove command.
#[poise::command(slash_command, prefix_command, rename = "allow-remove")]
pub async fn protect_allow_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if deny_unless_owner(
        &ctx,
        "allowlist_delete_not_owner",
        "Only the owner of the server can add/remove users in the allowlist!",
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS !remove.ts:74-79: the owner can never leave the allowlist.
    let owner = guild_owner_id(&ctx).await.unwrap_or(0);
    if user.id.get() == owner {
        let msg =
            crate::lang::get(&code, "allowlist_delete_cant_remove_owner").unwrap_or_else(|| {
                "It is not possible to remove the server owner from the allowlist!".to_string()
            });
        ctx.say(msg).await?;
        return Ok(());
    }
    // TS !remove.ts:81-86 (`!list[id].allowed == true`): not-in guard.
    let existing = load_allowlist(&ctx.data().pool, &gid).await;
    if !allowlist_contains(&existing, user.id.get()) {
        let msg = crate::lang::get(&code, "allowlist_delete_isnt_in").unwrap_or_else(|| {
            "The member you want to remove from the allowlist isn't in it!".to_string()
        });
        ctx.say(msg).await?;
        return Ok(());
    }
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ALLOWLIST.list.{}", user.id.get()),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "allowlist_delete_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "${member.user} has been removed from the allowlist!".to_string()),
    )
    .await?;
    Ok(())
}

/// Allow show command.
#[poise::command(slash_command, prefix_command, rename = "allow-show")]
pub async fn protect_allow_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS allowlist/!show.ts:48-59: lazy-seed the owner entry on first read.
    let mut rows = load_allowlist(&ctx.data().pool, &gid).await;
    if rows.is_empty() {
        if let Some(owner) = guild_owner_id(&ctx).await {
            // TS seeds the whole ALLOWLIST row
            // (`{enable:false, list:{<owner>:{allowed:true}}}`), not
            // just the list leaf: write the top-level enable:false
            // flag row too (only when absent, never clobbering an
            // existing row).
            if crate::commands::owner::main::tbl_get_value(&ctx.data().pool, &gid, "ALLOWLIST")
                .await
                .is_none()
            {
                let _ = crate::commands::owner::main::routed_set(
                    &ctx.data().pool,
                    &gid,
                    &gid,
                    "ALLOWLIST",
                    &format!("{{\"enable\":false,\"list\":{{\"{owner}\":{{\"allowed\":true}}}}}}"),
                )
                .await;
            }
            let _ = crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                &format!("ALLOWLIST.list.{owner}"),
                r#"{"allowed":true}"#,
            )
            .await;
            rows = load_allowlist(&ctx.data().pool, &gid).await;
        }
    }
    // TS allowlist/!show.ts:65-73: owner or listed members only.
    let author = ctx.author().id.get();
    let owner = guild_owner_id(&ctx).await.unwrap_or(0);
    if !is_guild_owner(author, owner) && !allowlist_contains(&rows, author) {
        let msg = crate::lang::get(&code, "allowlist_show_not_permited").unwrap_or_else(|| {
            "You are not allowed to use this command! You need to be in the allowlist!".to_string()
        });
        ctx.say(msg).await?;
        return Ok(());
    }
    let title = crate::lang::get(&code, "allowlist_show_embed_author")
        .unwrap_or_else(|| "Allowlist".to_string());
    let embed = serenity::CreateEmbed::default()
        .colour(0x010101)
        .author(serenity::CreateEmbedAuthor::new(title))
        .description(allowlist_mentions(&rows))
        .timestamp(serenity::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mode_vocab_matches_ts_actions() {
        assert_eq!(MODES.len(), 3);
        assert!(valid_mode("allowlist") && valid_mode("member") && valid_mode("nobody"));
        assert!(!valid_mode("bogus"));
        assert_eq!(normalize_mode("allowlist").as_deref(), Some("allowlist"));
        assert_eq!(normalize_mode("member").as_deref(), Some("member"));
        assert_eq!(normalize_mode("nobody").as_deref(), Some("nobody"));
        assert_eq!(normalize_mode("on").as_deref(), Some("member"));
        assert_eq!(normalize_mode("off").as_deref(), Some("nobody"));
        assert!(normalize_mode("ban").is_none());
    }

    #[test]
    fn legacy_allow_rows_stay_readable() {
        let open: RuleState = serde_json::from_str(r#"{"allow":true}"#).unwrap();
        assert_eq!(open.effective_mode(), "member");
        let deny: RuleState = serde_json::from_str(r#"{"allow":false}"#).unwrap();
        assert_eq!(deny.effective_mode(), "nobody");
        let mode: RuleState = serde_json::from_str(r#"{"mode":"allowlist"}"#).unwrap();
        assert_eq!(mode.effective_mode(), "allowlist");
        let stored = serde_json::to_string(&RuleState {
            mode: "nobody".to_string(),
            allow: None,
        })
        .unwrap();
        assert_eq!(stored, r#"{"mode":"nobody"}"#);
    }

    #[test]
    fn sanction_vocab_matches_ts_punish() {
        assert_eq!(SANCTIONS.len(), 3);
        assert!(valid_sanction("simply"));
        assert!(valid_sanction("simply+derank"));
        assert!(valid_sanction("simply+ban"));
        assert!(!valid_sanction("ban"));
        assert!(!valid_sanction("kick"));
        assert!(!valid_sanction("timeout"));
    }

    #[test]
    fn event_rule_mapping() {
        assert_eq!(rule_for_event("roleCreate"), Some("createrole"));
        assert_eq!(rule_for_event("channelDelete"), Some("deletechannel"));
        assert_eq!(rule_for_event("guildBanAdd"), Some("banmembers"));
        assert_eq!(rule_for_event("nope"), None);
    }

    #[test]
    fn owner_gate_matches_ts_checks() {
        assert!(is_guild_owner(7, 7));
        assert!(!is_guild_owner(7, 8));
    }

    #[test]
    fn rule_all_reply_joins_every_rule() {
        let all = rule_display("all");
        for r in RULES {
            assert!(all.contains(r), "missing {r} in {all}");
        }
        assert!(!all.contains("cls"));
        assert_eq!(rule_display("webhook"), "WEBHOOK");
    }

    #[test]
    fn show_panel_text_matches_ts_show() {
        let rows = vec![
            (
                "PROTECTION.webhook".to_string(),
                r#"{"mode":"allowlist"}"#.to_string(),
            ),
            ("PROTECTION.SANCTION".to_string(), "simply".to_string()),
        ];
        let text = protection_rules_text(&rows);
        assert!(text.contains("**WEBHOOK** -> `allowlist`"));
        assert!(!text.contains("SANCTION"));
        // Legacy rows render through the effective mode.
        let legacy = vec![(
            "PROTECTION.banmembers".to_string(),
            r#"{"allow":false}"#.to_string(),
        )];
        assert!(protection_rules_text(&legacy).contains("**BANMEMBERS** -> `nobody`"));
        assert!(protection_rules_text(&[]).is_empty());
    }

    #[test]
    fn allowlist_helpers_match_ts_guards() {
        let rows = vec![
            "ALLOWLIST.list.7".to_string(),
            "ALLOWLIST.list.9".to_string(),
        ];
        assert!(allowlist_contains(&rows, 7));
        assert!(!allowlist_contains(&rows, 8));
        assert!(!allowlist_contains(&[], 7));
        let mentions = allowlist_mentions(&rows);
        assert!(mentions.contains("<@7>"));
        assert!(mentions.contains("<@9>"));
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        use crate::commands::owner::main as routed;
        let pool = memory_pool().await;
        // Routed write dual-writes: table handle primary, legacy kv mirror.
        routed::routed_set(&pool, "g", "g", "PROTECTION.webhook", r#"{"allow":true}"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "PROTECTION.webhook")
                .await
                .as_deref(),
            Some(r#"{"allow":true}"#)
        );
        // Legacy-only row still reads (and promotes into the table).
        crate::db::kv_set(&pool, "g", "PROTECTION.banmembers", r#"{"allow":false}"#)
            .await
            .unwrap();
        let rows = load_protection_rows(&pool, "g").await;
        assert_eq!(rows.len(), 2);
        assert!(rows.iter().any(|(k, _)| k == "PROTECTION.webhook"));
        assert!(rows.iter().any(|(k, _)| k == "PROTECTION.banmembers"));
        // Table wins over a stale legacy row for the same key.
        crate::db::kv_set(&pool, "g", "PROTECTION.webhook", r#"{"allow":false}"#)
            .await
            .unwrap();
        let rows = load_protection_rows(&pool, "g").await;
        let webhook = rows
            .iter()
            .find(|(k, _)| k == "PROTECTION.webhook")
            .map(|(_, v)| v.clone())
            .unwrap();
        assert_eq!(webhook, r#"{"allow":true}"#);
        // Allowlist union scan merges both stores.
        routed::routed_set(&pool, "g", "g", "ALLOWLIST.list.7", r#"{"allowed":true}"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "ALLOWLIST.list.9", r#"{"allowed":true}"#)
            .await
            .unwrap();
        let allow = load_allowlist(&pool, "g").await;
        assert!(allow.contains(&"ALLOWLIST.list.7".to_string()));
        assert!(allow.contains(&"ALLOWLIST.list.9".to_string()));
    }
}
