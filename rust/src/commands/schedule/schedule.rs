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
        title: title.clone(),
        description: description.clone(),
        expires_at_ms: expiry_at_ms(now_ms(), delta_ms),
    };
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    save_entry_routed(&ctx.data().pool, &gid, &entry, user_id).await?;
    // TS parity (`executeAfterModal` / `__0`): preview description
    // (```name``` ```desc```), confirm title
    // (`schedule_create_embed_title_confirm`), one inline field named
    // `schedule_create_embed_fields_name_confirm` with the formatted
    // expiry, content from `schedule_create_confirm_msg`,
    // color #00549F + timestamp + footer.
    let preview = render_create_preview_description(&entry.title, &entry.description);
    let confirm_title = render_create_confirm_title(
        &crate::lang::get(&lang_code, "schedule_create_embed_title_confirm")
            .unwrap_or_else(|| "#${scheduleCode} Schedule Created!".to_string()),
        &code,
    );
    let field_name = crate::lang::get(&lang_code, "schedule_create_embed_fields_name_confirm")
        .unwrap_or_else(|| "Notified Date".to_string());
    let content = render_create_confirm_msg(
        &crate::lang::get(&lang_code, "schedule_create_confirm_msg").unwrap_or_else(|| {
            "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`"
                .to_string()
        }),
        &ctx.author().to_string(),
        &code,
    );
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(confirm_title)
        .description(preview)
        .field(field_name, format_expiry_local(entry.expires_at_ms), true)
        .color(0x00549F)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().content(content).embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
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
pub async fn schedule_delete_all(
    ctx: Ctx<'_>,
    #[description = "Type y/yes to confirm"] confirm: Option<String>,
) -> Result<(), anyhow::Error> {
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS parity: delete-all asks `schedule_deleteall_question` (Y/n) and
    // only deletes on `y`/`yes` (case-insensitive); anything else sends
    // `schedule_deleteall_cancel` instead of deleting.
    let Some(given) = confirm.as_deref() else {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_deleteall_question").unwrap_or_else(|| {
                "Are you sure to delete all of your schedules? (Y/n)".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    if !is_delete_all_confirmed(given) {
        ctx.say(
            crate::lang::get(&lang_code, "schedule_deleteall_cancel")
                .unwrap_or_else(|| "The `DELETE_ALL` action has been cancelled!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = scope_guild(&ctx);
    let user_id = ctx.author().id.get();
    let n = delete_all_entries_routed(&ctx.data().pool, &gid, user_id).await?;
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
    // TS parity: field bodies render through `schedule_list_fields_embed`
    // (`${date...}` / `${fetched[i]?.title}` / `${fetched[i]?.description}`).
    let field_template = crate::lang::get(&lang_code, "schedule_list_fields_embed")
        .unwrap_or_else(|| "**Ends at**: ${date}```${title}``````${description}```\n".to_string());
    // SCOPE + CAP DECISION (recorded): TS reads the global `schedule`
    // table keyed `${userId}.${code}` (see ready.ts `scheduleTable`), so a
    // schedule created in one guild is visible/deletable from any other.
    // The Rust port deliberately scopes rows per guild table
    // (`scope_guild`, DMs fall back to "global") so guild data stays
    // isolated like every other routed category. Sort-by-expiry is also
    // deliberate (TS iterates insertion order). The 25-field cap is a
    // Discord limit (embeds hold at most 25 fields); TS has no cap and
    // would fail to send once a user owns 26+ schedules.
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(list_title)
        .color(0x60BEE0);
    for e in entries.iter().take(SCHEDULE_LIST_CAP) {
        embed = embed.field(
            format!("#{}", e.code),
            render_schedule_field(
                &field_template,
                &e.title,
                &e.description,
                &format_expiry_local(e.expires_at_ms),
            ),
            false,
        );
    }
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let content = crate::lang::get(&lang_code, "schedule_list_content_message")
        .unwrap_or_else(|| "Here's your schedule list!".to_string());
    let mut reply = poise::CreateReply::default().content(content).embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Delete-all confirmation gate. Mirrors the TS `(Y/n)` collector which
/// deletes only when the reply lowercases to `y` or `yes`.
pub fn is_delete_all_confirmed(s: &str) -> bool {
    matches!(s.trim().to_lowercase().as_str(), "y" | "yes")
}

/// Discord embeds hold at most 25 fields; the list is truncated there.
pub const SCHEDULE_LIST_CAP: usize = 25;

/// Format an expiry timestamp like TS `format(date, "YYYY/MM/DD HH:mm:ss")`
/// (server-local time). Out-of-range values degrade to the raw millis.
pub fn format_expiry_local(expires_at_ms: i64) -> String {
    let secs = expires_at_ms.div_euclid(1000);
    let nanos = (expires_at_ms.rem_euclid(1000) as u32) * 1_000_000;
    chrono::DateTime::from_timestamp(secs, nanos)
        .map(|dt| {
            let local: chrono::DateTime<chrono::Local> = chrono::DateTime::from(dt);
            local.format("%Y/%m/%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|| expires_at_ms.to_string())
}

/// Render one list field through the `schedule_list_fields_embed`
/// template. The canonical en-US template interpolates a pre-formatted
/// date (`${date.format(new Date(fetched[i]?.expired), ...)}`), so the
/// caller passes the already formatted expiry; the raw-placeholder shape
/// is accepted too for forward compatibility.
pub fn render_schedule_field(
    template: &str,
    title: &str,
    description: &str,
    expires_display: &str,
) -> String {
    const DATE_PH: &str = "${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}";
    let out = template.replace(DATE_PH, expires_display);
    // Accept a hypothetical `${date}`-style template as well.
    let out = out.replace("${date}", expires_display);
    let out = out.replace("${fetched[i]?.title}", title);
    out.replace("${fetched[i]?.description}", description)
}

/// Create-flow confirm helpers (TS `executeAfterModal` / `__0`).
/// Preview embed description: ` ```name``` ```desc``` `.
pub fn render_create_preview_description(name: &str, desc: &str) -> String {
    format!("```{name}``````{desc}```")
}

/// Confirm title from `schedule_create_embed_title_confirm`
/// (`#${scheduleCode} Schedule Created!` in en-US).
pub fn render_create_confirm_title(template: &str, code: &str) -> String {
    template.replace("${scheduleCode}", code)
}

/// Confirm message from `schedule_create_confirm_msg`
/// (`${interaction.user}` + `${scheduleCode}` in en-US).
pub fn render_create_confirm_msg(template: &str, user_mention: &str, code: &str) -> String {
    template
        .replace("${interaction.user}", user_mention)
        .replace("${scheduleCode}", code)
}

/// Expiry instant like TS `Date.now() + date0` (saturating).
pub fn expiry_at_ms(now_ms: i64, delta_ms: i64) -> i64 {
    now_ms.saturating_add(delta_ms)
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

    #[test]
    fn delete_all_gate_matches_ts_collector() {
        assert!(is_delete_all_confirmed("y"));
        assert!(is_delete_all_confirmed("Y"));
        assert!(is_delete_all_confirmed("yes"));
        assert!(is_delete_all_confirmed("YES"));
        assert!(is_delete_all_confirmed("  Yes  "));
        assert!(!is_delete_all_confirmed("n"));
        assert!(!is_delete_all_confirmed("no"));
        assert!(!is_delete_all_confirmed(""));
        assert!(!is_delete_all_confirmed("yep"));
        assert!(!is_delete_all_confirmed("cancel"));
    }

    #[test]
    fn list_field_renders_through_template() {
        let template = "**Ends at**: ${date.format(new Date(fetched[i]?.expired), 'YYYY/MM/DD HH:mm:ss')}```${fetched[i]?.title}``````${fetched[i]?.description}```\n";
        assert_eq!(
            render_schedule_field(template, "Party", "at home", "2026/01/02 03:04:05"),
            "**Ends at**: 2026/01/02 03:04:05```Party``````at home```\n"
        );
    }

    #[test]
    fn expiry_format_shape_matches_ts_pattern() {
        // Server-local time, so only the shape is asserted (TZ-dependent).
        let s = format_expiry_local(1_700_000_000_000);
        assert_eq!(s.len(), 19);
        let b = s.as_bytes();
        assert_eq!(
            (b[4], b[7], b[10], b[13], b[16]),
            (b'/', b'/', b' ', b':', b':')
        );
        assert!(s
            .chars()
            .all(|c| c.is_ascii_digit() || matches!(c, '/' | ' ' | ':')));
    }

    #[test]
    fn list_cap_is_discord_field_limit() {
        assert_eq!(SCHEDULE_LIST_CAP, 25);
    }

    #[test]
    fn create_preview_matches_ts_modal_embed() {
        // TS: .setDescription(` ```${name}``` ```${desc}``` `)
        assert_eq!(
            render_create_preview_description("Party", "at home"),
            "```Party``````at home```"
        );
    }

    #[test]
    fn create_confirm_title_interpolates_code() {
        assert_eq!(
            render_create_confirm_title("#${scheduleCode} Schedule Created!", "ABC123"),
            "#ABC123 Schedule Created!"
        );
    }

    #[test]
    fn create_confirm_msg_interpolates_user_and_code() {
        assert_eq!(
            render_create_confirm_msg(
                "${interaction.user}, your schedule has been created!\nCode: `${scheduleCode}`",
                "<@123>",
                "ABC123"
            ),
            "<@123>, your schedule has been created!\nCode: `ABC123`"
        );
    }

    #[test]
    fn create_expiry_adds_delta_like_ts() {
        // TS: expired: Date.now() + date0
        assert_eq!(expiry_at_ms(1_000, 60_000), 61_000);
        assert_eq!(expiry_at_ms(i64::MAX, 1), i64::MAX);
    }

    #[test]
    fn create_confirm_field_value_is_formatted_expiry() {
        // Field value renders through the same local-time formatter
        // as the list fields (`YYYY/MM/DD HH:mm:ss` shape).
        let s = format_expiry_local(expiry_at_ms(1_700_000_000_000, 60_000));
        assert_eq!(s.len(), 19);
    }
}
