// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/backup/* via src/core/backup/*.
//
// TS stores full guild snapshots (roles/channels/messages/threads/emojis)
// in metasTable BACKUPS.<user>.<id> + files. The Rust port snapshots the
// bot-side kv state per guild (config backup) with the same command shape:
// create/list/load/delete. Full Discord-object restore is pending.

use crate::bot::Ctx;

pub fn backup_key(backup_id: &str) -> String {
    format!("BACKUP.{backup_id}")
}

pub fn gen_backup_id() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    format!("{nanos:016x}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "backup",
    rename = "backup",
    subcommands(
        "backup_create",
        "backup_list",
        "backup_load",
        "backup_delete",
        "backup_manage"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn backup(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "create", aliases("save"))]
pub async fn backup_create(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> =
        sqlx::query_as::<_, (String, String)>("SELECT key_name, value FROM kv WHERE guild_id = ?")
            .bind(&gid)
            .fetch_all(&ctx.data().pool)
            .await
            .unwrap_or_default();
    let id = gen_backup_id();
    let snap = serde_json::json!({
        "guild": gid,
        "at": crate::commands::schedule::now_ms(),
        "entries": rows.iter().map(|(k, v)| serde_json::json!({"k": k, "v": v})).collect::<Vec<_>>(),
    })
    .to_string();
    crate::db::kv_set(
        &ctx.data().pool,
        &format!("{gid}-backups"),
        &backup_key(&id),
        &snap,
    )
    .await?;
    ctx.say(format!("Backup `{id}` created ({} keys).", rows.len()))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn backup_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'BACKUP.%'",
    )
    .bind(format!("{gid}-backups"))
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No backups.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "load", aliases("restore"))]
pub async fn backup_load(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(
        &ctx.data().pool,
        &format!("{gid}-backups"),
        &backup_key(backup_id.trim()),
    )
    .await;
    let Some(raw) = raw else {
        ctx.say("Backup not found.").await?;
        return Ok(());
    };
    let snap: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
    let entries = snap
        .get("entries")
        .and_then(|e| e.as_array())
        .cloned()
        .unwrap_or_default();
    let mut restored = 0;
    for e in entries {
        if let (Some(k), Some(v)) = (
            e.get("k").and_then(|x| x.as_str()),
            e.get("v").and_then(|x| x.as_str()),
        ) {
            crate::db::kv_set(&ctx.data().pool, &gid, k, v).await?;
            restored += 1;
        }
    }
    ctx.say(format!("Restored {restored} keys.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn backup_delete(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(format!("{gid}-backups"))
        .bind(backup_key(backup_id.trim()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Backup deleted.").await?;
    Ok(())
}

/// Restrict backups to guild owner. Mirrors !manage.ts (onlyOwner).
#[poise::command(slash_command, prefix_command, rename = "manage")]
pub async fn backup_manage(
    ctx: Ctx<'_>,
    #[description = "owner or admin"] scope: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let owner_only = matches!(scope.to_ascii_lowercase().as_str(), "owner");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.BACKUP.onlyOwner",
        if owner_only { "1" } else { "0" },
    )
    .await?;
    ctx.say(if owner_only {
        "Backups restricted to guild owner."
    } else {
        "Backups open to admins."
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn id_is_hex_16() {
        let id = gen_backup_id();
        assert_eq!(id.len(), 16);
        assert!(id.chars().all(|c| c.is_ascii_hexdigit()));
        assert_eq!(backup_key("abc"), "BACKUP.abc");
    }
}
