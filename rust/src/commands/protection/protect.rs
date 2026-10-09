use crate::bot::Ctx;
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
    pub allow: bool,
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
    #[description = "on to allow, off to deny"] allow: String,
) -> Result<(), anyhow::Error> {
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
    let allow = matches!(allow.to_ascii_lowercase().as_str(), "on" | "allow");
    if rule == "cls" {
        sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'PROTECTION.%'")
            .bind(&gid)
            .execute(&ctx.data().pool)
            .await?;
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
                .unwrap_or_else(|| "Protection cleared.".to_string()),
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
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            &format!("PROTECTION.{r}"),
            &serde_json::to_string(&RuleState { allow })?,
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
                .replace("${allow}", if allow { "on" } else { "off" })
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
    #[description = "ban, kick or timeout"] sanction: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "PROTECTION.SANCTION",
        sanction.trim(),
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
                .replace("${choose}", sanction.trim())
            })
            .unwrap_or_else(|| "Sanction set.".to_string()),
    )
    .await?;
    Ok(())
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
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'PROTECTION.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
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
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("ALLOWLIST.list.{}", user.id.get()),
        r#"{"allowed":true}"#,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "allowlist_add_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "Allowlisted.".to_string()),
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
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(format!("ALLOWLIST.list.{}", user.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "allowlist_delete_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "Allowlist removed.".to_string()),
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
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'ALLOWLIST.list.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
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
    fn rules_cover_ts_authorization() {
        assert_eq!(RULES.len(), 13);
        assert!(valid_rule("createrole"));
        assert!(valid_rule("all") && valid_rule("cls"));
        assert!(!valid_rule("bogus"));
    }

    #[test]
    fn event_rule_mapping() {
        assert_eq!(rule_for_event("roleCreate"), Some("createrole"));
        assert_eq!(rule_for_event("channelDelete"), Some("deletechannel"));
        assert_eq!(rule_for_event("guildBanAdd"), Some("banmembers"));
        assert_eq!(rule_for_event("nope"), None);
    }
}
