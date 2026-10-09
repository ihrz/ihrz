use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "schedule",
    category = "schedule",
    subcommands(
        "schedule_create",
        "schedule_delete",
        "schedule_delete_all",
        "schedule_list"
    )
)]
pub async fn schedule(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let msg = crate::commands::lang_for(
        &ctx,
        "schedule_menu_placeholder",
        "Use a subcommand: create, delete, delete-all, list.",
    )
    .await;
    ctx.say(msg).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "create")]
pub async fn schedule_create(
    ctx: Ctx<'_>,
    #[description = "Title (5-30 chars)"] title: String,
    #[description = "Description (10-400 chars)"] description: String,
    #[description = "When (e.g. 10s, 5m, 2h, 7d)"] when: String,
) -> Result<(), anyhow::Error> {
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !validate_title(&title) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_title_must_be_5_30_characters")
                .unwrap_or_else(|| "Title must be 5-30 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if !validate_description(&description) {
        ctx.say(
            crate::lang::get(&lang_code, "msg_description_must_be_10_400_characters")
                .unwrap_or_else(|| "Description must be 10-400 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(delta_ms) = parse_duration_ms(&when) else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_create_not_number_time")
                .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
                .unwrap_or_else(|| "${interaction.user}, your response (the time you want to be notified about this schedule) is not a number!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let code = gen_code();
    let entry = ScheduleEntry {
        code: code.clone(),
        title,
        description,
        expires_at_ms: now_ms().saturating_add(delta_ms),
    };
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    save_entry_routed(&ctx.data().pool, &gid, &entry, user_id).await?;
    ctx.say(
        crate::lang::get(&lang_code, "schedule_create_confirm_msg")
            .map(|s| {
                s.replace("${interaction.user}", &ctx.author().to_string())
                    .replace("${scheduleCode}", &code)
            })
            .unwrap_or_else(|| {
                format!(
                    "Scheduled `{code}` (expires <t:{}:F>).",
                    entry.expires_at_ms / 1000
                )
            }),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn schedule_delete(
    ctx: Ctx<'_>,
    #[description = "Schedule code"] code: String,
) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if delete_entry_routed(&ctx.data().pool, &gid, user_id, code.trim()).await? {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_confirm")
                .unwrap_or_else(|| "Schedule deleted!".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_delete_not_found")
                .map(|s| s.replace("${arg0}", code.trim()))
                .unwrap_or_else(|| "There are no SCHEDULES (${arg0}) for this member!".to_string()),
        )
        .await?;
    }
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "delete-all")]
pub async fn schedule_delete_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let n = delete_all_entries_routed(&ctx.data().pool, &gid, user_id).await?;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&lang_code, "schedule_deleteall_confirm")
            .unwrap_or_else(|| format!("Deleted {n} schedule(s).")),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn schedule_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let entries = list_entries_routed(&ctx.data().pool, &gid, user_id).await;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if entries.is_empty() {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_list_not_schedule")
                .unwrap_or_else(|| "There are no SCHEDULES for this member!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let list_title = crate::lang::get(&lang_code, "schedule_list_title_embed")
        .unwrap_or_else(|| "Listing all Schedules".to_string());
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(list_title)
        .color(0x60BEE0);
    for e in entries.iter().take(25) {
        embed = embed.field(
            format!("#{}", e.code),
            format!(
                "{}\n{}\n<t:{}:F>",
                e.title,
                e.description,
                e.expires_at_ms / 1000
            ),
            false,
        );
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

// ---- U-D3-NAMEDTABLES: schedule table handle ----
// Guild-scoped table (sibling convention: `table(gid)`), keys
// `SCHEDULE.<uid>.<code>` unchanged. Dotted keys nest under the
// `SCHEDULE` root (`{uid: {code: json}}`), so per-user loops walk the
// root and merge legacy kv rows. The expiry sweeper in scheduler.rs
// still reads kv directly (locked file): dual-write keeps it fresh.
use crate::commands::owner::main::{
    legacy_del_prefix, legacy_scan, routed_del, routed_get, routed_set, table_backend,
    tbl_get_value, walk_path,
};
use std::collections::HashSet;

/// Nested root holding every schedule of one guild table.
pub const SCHEDULE_ROOT: &str = "SCHEDULE";

pub async fn load_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> Option<ScheduleEntry> {
    let raw = routed_get(pool, guild_id, guild_id, &schedule_key(user_id, code)).await?;
    serde_json::from_str(&raw).ok()
}

pub async fn save_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    entry: &ScheduleEntry,
    user_id: u64,
) -> anyhow::Result<()> {
    let s = serde_json::to_string(entry)?;
    routed_set(
        pool,
        guild_id,
        guild_id,
        &schedule_key(user_id, &entry.code),
        &s,
    )
    .await
}

pub async fn delete_entry_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> anyhow::Result<bool> {
    routed_del(pool, guild_id, guild_id, &schedule_key(user_id, code)).await
}

/// Merged entry texts for one user: table root walked first, then
/// legacy-only rows. Table values win on code conflicts.
async fn user_entry_texts(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Vec<String> {
    let uid = user_id.to_string();
    let mut out: Vec<String> = vec![];
    let mut seen: HashSet<String> = HashSet::new();
    if let Some(root) = tbl_get_value(pool, guild_id, SCHEDULE_ROOT).await {
        if let Some(user) = walk_path(&root, &[uid.as_str()]) {
            if let Some(obj) = user.as_object() {
                for (code, v) in obj {
                    if let Some(s) = v.as_str() {
                        seen.insert(code.clone());
                        out.push(s.to_string());
                    }
                }
            }
        }
    }
    for (k, v) in legacy_scan(pool, guild_id, &schedule_prefix(user_id)).await {
        let code = k.strip_prefix(&schedule_prefix(user_id)).unwrap_or(&k);
        if seen.insert(code.to_string()) {
            out.push(v);
        }
    }
    out
}

pub async fn list_entries_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> Vec<ScheduleEntry> {
    let mut out: Vec<ScheduleEntry> = vec![];
    for raw in user_entry_texts(pool, guild_id, user_id).await {
        if let Ok(e) = serde_json::from_str(&raw) {
            out.push(e);
        }
    }
    out.sort_by_key(|e| e.expires_at_ms);
    out
}

pub async fn delete_all_entries_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> anyhow::Result<u64> {
    // Count logical rows first: dual-written rows exist twice.
    let mut codes: HashSet<String> = HashSet::new();
    let uid = user_id.to_string();
    let root = tbl_get_value(pool, guild_id, SCHEDULE_ROOT).await;
    let has_user = walk_path(
        root.as_ref().unwrap_or(&serde_json::Value::Null),
        &[uid.as_str()],
    )
    .and_then(|u| u.as_object())
    .map(|obj| {
        codes.extend(obj.keys().cloned());
        true
    })
    .unwrap_or(false);
    for (k, _) in legacy_scan(pool, guild_id, &schedule_prefix(user_id)).await {
        codes.insert(
            k.strip_prefix(&schedule_prefix(user_id))
                .unwrap_or(&k)
                .to_string(),
        );
    }
    let n = codes.len() as u64;
    if has_user {
        let backend = table_backend(pool);
        let _ = backend
            .table(guild_id.to_string())
            .delete(&format!("{SCHEDULE_ROOT}.{user_id}"))
            .await;
    }
    legacy_del_prefix(pool, guild_id, &schedule_prefix(user_id)).await?;
    Ok(n)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn mem_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:")
            .unwrap()
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    fn sample(code: &str, expires: i64) -> ScheduleEntry {
        ScheduleEntry {
            code: code.to_string(),
            title: "title".to_string(),
            description: "a description here".to_string(),
            expires_at_ms: expires,
        }
    }

    #[tokio::test]
    async fn routed_crud_dual_writes() {
        let pool = mem_pool().await;
        assert_eq!(load_entry_routed(&pool, "g", 1, "A").await, None);
        save_entry_routed(&pool, "g", &sample("A", 200), 1)
            .await
            .unwrap();
        save_entry_routed(&pool, "g", &sample("B", 100), 1)
            .await
            .unwrap();
        assert_eq!(
            load_entry_routed(&pool, "g", 1, "A")
                .await
                .unwrap()
                .expires_at_ms,
            200
        );
        // Legacy kv reader (scheduler sweep) sees the unchanged key.
        assert!(crate::db::kv_get(&pool, "g", "SCHEDULE.1.A")
            .await
            .is_some());
        // List merges + sorts like the locked helper.
        let list = list_entries_routed(&pool, "g", 1).await;
        assert_eq!(
            list.iter().map(|e| e.code.as_str()).collect::<Vec<_>>(),
            vec!["B", "A"]
        );
        assert!(delete_entry_routed(&pool, "g", 1, "A").await.unwrap());
        assert!(!delete_entry_routed(&pool, "g", 1, "A").await.unwrap());
        assert_eq!(delete_all_entries_routed(&pool, "g", 1).await.unwrap(), 1);
        assert!(list_entries_routed(&pool, "g", 1).await.is_empty());
    }

    #[tokio::test]
    async fn routed_falls_back_to_legacy_rows() {
        let pool = mem_pool().await;
        // Legacy-only row (scheduler-written shape, kv only).
        crate::db::kv_set(
            &pool,
            "g",
            "SCHEDULE.2.Z",
            &serde_json::to_string(&sample("Z", 50)).unwrap(),
        )
        .await
        .unwrap();
        assert_eq!(
            load_entry_routed(&pool, "g", 2, "Z").await.unwrap().code,
            "Z"
        );
        assert_eq!(list_entries_routed(&pool, "g", 2).await.len(), 1);
        assert_eq!(delete_all_entries_routed(&pool, "g", 2).await.unwrap(), 1);
    }
}
