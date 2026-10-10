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
    )
)]
pub async fn protect(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "rule")]
pub async fn protect_rule(
    ctx: Ctx<'_>,
    #[description = "Rule (or all/cls)"] rule: String,
    #[description = "allowlist, member or nobody"] allow: String,
) -> Result<(), anyhow::Error> {
    let rule = rule.trim().to_ascii_lowercase();
    if !valid_rule(&rule) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "msg_bad_rule").unwrap_or_else(|| "Bad rule.".to_string()))
            .await?;
        return Ok(());
    }
    let Some(mode) = normalize_mode(&allow) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(crate::lang::get(&code, "msg_bad_rule").unwrap_or_else(|| "Bad rule.".to_string()))
            .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
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
                .replace("${rule.toUpperCase()}", &rule.to_uppercase())
                .replace("${allow}", &mode_display(&code, &mode))
            })
            .unwrap_or_else(|| format!("Rule {rule} set.")),
    )
    .await?;
    Ok(())
}

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
    let bot_top: u16 = match http.get_current_user().await.ok() {
        Some(bot) => match guild_id.member(http, bot.id).await {
            Ok(m) => roles
                .values()
                .filter(|r| m.roles.contains(&r.id))
                .map(|r| r.position)
                .max()
                .unwrap_or(u16::MAX),
            Err(_) => u16::MAX,
        },
        None => u16::MAX,
    };
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
        let _ = member.remove_role(http, *role_id).await;
    }
    Ok(())
}

/// Apply a PROTECTION.SANCTION value. Mirrors `punish()` in
/// src/core/functions/method.ts: `simply` only cancels the action
/// (done by the caller's restore leg), `simply+derank` deranks,
/// `simply+ban` bans with a derank fallback when the ban fails.
/// Unknown values no-op like the TS `default` branch.
pub async fn apply_sanction(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
    sanction: &str,
    reason: &str,
) {
    match sanction.trim() {
        "simply+derank" => {
            let _ = derank_member(http, guild_id, user_id, reason).await;
        }
        "simply+ban"
            if guild_id
                .ban_with_reason(http, user_id, 0, reason)
                .await
                .is_err() =>
        {
            let _ = derank_member(http, guild_id, user_id, reason).await;
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

#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn protect_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows = load_protection_rows(&ctx.data().pool, &gid).await;
    ctx.say(if rows.is_empty() {
        "No protection rules.".to_string()
    } else {
        rows.iter()
            .map(|(k, v)| format!("{k}: {v}"))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "allow-add")]
pub async fn protect_allow_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ALLOWLIST.list.{}", user.id.get()),
        r#"{"allowed":true}"#,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "allowlist_add_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "${member.user} has been added to the allowlist!".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "allow-remove")]
pub async fn protect_allow_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ALLOWLIST.list.{}", user.id.get()),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "allowlist_delete_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "${member.user} has been removed from the allowlist!".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "allow-show")]
pub async fn protect_allow_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows = load_allowlist(&ctx.data().pool, &gid).await;
    ctx.say(if rows.is_empty() {
        "Allowlist empty.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
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

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
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
