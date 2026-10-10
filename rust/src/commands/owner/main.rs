use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub fn blacklist_key(user_id: u64) -> String {
    format!("BLACKLIST.{user_id}")
}

// ---- U-D3-NAMEDTABLES: table-handle routing core ----
// Mirrors the TS `db.table(name)` handles from Events/client/ready.ts
// via `crate::backends::Backend` — the D1 pattern the sibling units
// already use (`Backend::sqlite(pool).table(scope)`, keys unchanged,
// table-first read with legacy kv fallback).
//
// Writes go to BOTH the table handle and legacy kv (dual-write). The
// siblings write table-only, but these tables still have readers in
// files this unit cannot touch (scheduler sweeps, button handlers and
// loaders in locked mod.rs files, db.rs gates, the member-join guard):
// dual-write keeps those readers correct while the table handle
// becomes the primary store. Reads prefer the table and fall back to
// legacy kv, promoting hits so rows migrate lazily. Deletes clear
// both stores.

/// Bot-global legacy scope, mirrors the kv `guild_id = "0"` rows.
pub const GLOBAL_SCOPE: &str = "0";

/// Table-handle backend over the sqlite kv store. Mirrors the
/// `guild_backend` helper in the sibling units.
pub fn table_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-handle read as plain text. Values written via `tbl_set` keep
/// their JSON shape in store, so this returns the canonical text form:
/// JSON docs/numbers/bools re-serialized, pre-encoded JSON strings
/// decoded once (`"\"PANEL\""` reads back as `PANEL`). Callers that need
/// the exact stored bytes (pre-encoded markers) must go through
/// `decode_stored_string`, which accepts both the decoded and the
/// legacy quoted form.
pub async fn tbl_get(pool: &crate::db::Pool, table: &str, key: &str) -> Option<String> {
    let backend = table_backend(pool);
    let v: serde_json::Value = backend.table(table).get(key).await.ok()??;
    match v {
        serde_json::Value::String(s) => Some(s),
        other => serde_json::to_string(&other).ok(),
    }
}

/// Decode a stored string that may be a pre-encoded JSON string
/// (`marker_value` output): the table store decodes once on write while
/// legacy kv keeps the quoted bytes, so accept both forms.
pub fn decode_stored_string(raw: &str) -> String {
    serde_json::from_str::<String>(raw).unwrap_or_else(|_| raw.to_string())
}

/// Table-handle read as a JSON doc, for walking nested dotted-key
/// roots (`SCHEDULE`, `GIVEAWAY`, `BACKUP`).
pub async fn tbl_get_value(
    pool: &crate::db::Pool,
    table: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = table_backend(pool);
    backend
        .table(table)
        .get::<serde_json::Value>(key)
        .await
        .ok()
        .flatten()
}

/// All rows of one table handle. Used for cross-scope bulk loops
/// (the authrestore secret scan over the global table).
pub async fn tbl_all(pool: &crate::db::Pool, table: &str) -> Vec<(String, serde_json::Value)> {
    let backend = table_backend(pool);
    backend
        .table(table)
        .all()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| (row.id, row.value))
        .collect()
}

/// Table-handle write of plain text (dual of `tbl_get`).
pub async fn tbl_set(
    pool: &crate::db::Pool,
    table: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    let backend = table_backend(pool);
    // Store JSON documents as values (TS object semantics); plain strings
    // that are not valid JSON stay strings (legacy kv parity).
    let v: serde_json::Value =
        serde_json::from_str(value).unwrap_or(serde_json::Value::String(value.to_string()));
    backend.table(table).set(key, v).await
}

/// Table-handle delete. Pre-checks existence first: a dotted delete on
/// a missing root would otherwise persist an empty doc. Returns true
/// when the table held the row.
pub async fn tbl_del(pool: &crate::db::Pool, table: &str, key: &str) -> anyhow::Result<bool> {
    if tbl_get_value(pool, table, key).await.is_none() {
        return Ok(false);
    }
    let backend = table_backend(pool);
    let removed = backend.table(table).delete(key).await?;
    Ok(removed > 0)
}

/// Walk a nested table doc by path segments. Backend tables store
/// dotted keys (`SCHEDULE.1.A`) as nested objects under the root
/// (`SCHEDULE`), so bulk loops walk instead of prefix-scanning.
pub fn walk_path<'v>(v: &'v serde_json::Value, path: &[&str]) -> Option<&'v serde_json::Value> {
    let mut cur = v;
    for part in path {
        cur = cur.get(*part)?;
    }
    Some(cur)
}

/// Routed read: table handle first, legacy kv fallback with lazy
/// promotion into the table.
pub async fn routed_get(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
) -> Option<String> {
    if let Some(v) = tbl_get(pool, table, key).await {
        return Some(v);
    }
    let legacy = crate::db::kv_get(pool, legacy_scope, key).await?;
    let _ = tbl_set(pool, table, key, &legacy).await;
    Some(legacy)
}

/// Routed write: legacy kv first (unmigrated kv readers stay fresh),
/// then the table handle.
pub async fn routed_set(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, legacy_scope, key, value).await?;
    tbl_set(pool, table, key, value).await?;
    Ok(())
}

/// Routed delete: clears both stores. Returns true when a row existed
/// in either store.
pub async fn routed_del(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
) -> anyhow::Result<bool> {
    let had_legacy = crate::db::kv_get(pool, legacy_scope, key).await.is_some();
    crate::db::kv_del(pool, legacy_scope, key).await?;
    let had_table = tbl_del(pool, table, key).await.unwrap_or(false);
    Ok(had_legacy || had_table)
}

/// Legacy kv prefix rows for one scope (the fallback half of table
/// bulk loops; the Backend surface has no prefix scan).
pub async fn legacy_scan(
    pool: &crate::db::Pool,
    scope: &str,
    prefix: &str,
) -> Vec<(String, String)> {
    let like = format!("{prefix}%");
    sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE ?",
    )
    .bind(scope)
    .bind(like)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
}

/// Legacy kv prefix delete for one scope.
pub async fn legacy_del_prefix(
    pool: &crate::db::Pool,
    scope: &str,
    prefix: &str,
) -> anyhow::Result<()> {
    let like = format!("{prefix}%");
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE ?")
        .bind(scope)
        .bind(like)
        .execute(pool)
        .await?;
    Ok(())
}

/// Named `blacklist` table handle. Legacy scope "0" and
/// `BLACKLIST.<uid>` keys are unchanged.
pub const BLACKLIST_TABLE: &str = "blacklist";

/// Routed blacklist reason lookup. Returns the `reason` leaf of the
/// `{blacklisted,reason,owner,createdAt}` entry, falling back to the raw
/// value for legacy plain-string rows. Mirrors `blacklistTable.get()`.
pub async fn bl_get(pool: &crate::db::Pool, user_id: u64) -> Option<String> {
    bl_raw(pool, user_id)
        .await
        .map(|raw| parse_bl_entry(&raw).reason.unwrap_or(raw))
}

/// Raw blacklist row (entry JSON or legacy string).
pub async fn bl_raw(pool: &crate::db::Pool, user_id: u64) -> Option<String> {
    routed_get(pool, BLACKLIST_TABLE, GLOBAL_SCOPE, &blacklist_key(user_id)).await
}

/// Routed blacklist write (dual-write, mirrors `blacklistTable.set`).
pub async fn bl_set(pool: &crate::db::Pool, user_id: u64, value: &str) -> anyhow::Result<()> {
    routed_set(
        pool,
        BLACKLIST_TABLE,
        GLOBAL_SCOPE,
        &blacklist_key(user_id),
        value,
    )
    .await
}

/// Routed blacklist delete (both stores).
pub async fn bl_del(pool: &crate::db::Pool, user_id: u64) -> anyhow::Result<()> {
    let _ = routed_del(pool, BLACKLIST_TABLE, GLOBAL_SCOPE, &blacklist_key(user_id)).await;
    Ok(())
}

// ---- U-OWNER-DUAL: dual-scope owner/blacklist pure core ----
// Every TS owner file branches `run_for_bot_owner` / `run_for_guild_owner`.
// Bot scope = merged config + persisted bot owners (getBotOwner).
// Guild scope = Discord `ownerId` + stored `OWNER.<uid>` rows (getGuildOwner).
// Blacklist rows are `{blacklisted,reason,owner,createdAt}` with a
// legacy plain-string fallback on read.

/// Blacklist pager size (TS `usersPerPage = 5`).
pub const BL_PAGE_SIZE: usize = 5;

/// Blacklist pager collector lifetime (TS `60_000 * 16`, 16 minutes).
pub const BL_COLLECTOR_SECS: u64 = 60 * 16;

/// Cross-guild sweep batching (TS `batchSize = 10`, `delay = 100`).
pub const SWEEP_BATCH: usize = 10;
pub const SWEEP_DELAY_MS: u64 = 100;

/// Cross-guild sweep guild filter (TS `memberCount <= 500`).
pub const SWEEP_MAX_MEMBERS: u64 = 500;

/// Transphobia unblacklist refusal. Hardcoded in TS `unblacklist.ts`
/// (no YAML key); mirrored verbatim.
pub const TRANSPHOBIA_REFUSAL: &str = " | **Transphobia is a dangerous behavior, and in this case, it was even directed towards project staff. I will not remove him from the blacklist.**";

/// Owner scope for one invocation. Mirrors the TS `run` dispatch.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum OwnerScope {
    Bot,
    Guild,
}

/// Mirrors `ownerHelper.isBotDev` (`client.owners` config list).
pub fn is_bot_dev(config_owners: &[String], user_id: u64) -> bool {
    config_owners.iter().any(|o| o == &user_id.to_string())
}

/// Resolve the caller's scope: merged bot owners first, then merged guild
/// owners (Discord `ownerId` + stored rows). Neither -> `None` (TS `run`
/// then does nothing).
pub async fn owner_scope(ctx: &Ctx<'_>) -> Option<OwnerScope> {
    let author = ctx.author().id.get().to_string();
    if crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners)
        .await
        .iter()
        .any(|o| o == &author)
    {
        return Some(OwnerScope::Bot);
    }
    if let Some(gid) = ctx.guild_id() {
        let discord_owner = discord_owner_id(ctx, gid);
        let owners =
            crate::db::guild_owner_ids(&ctx.data().pool, &gid.get().to_string(), discord_owner)
                .await;
        if owners.iter().any(|o| o == &author) {
            return Some(OwnerScope::Guild);
        }
    }
    None
}

/// Discord-side guild owner id from cache. Mirrors the `guild.ownerId`
/// half of `getGuildOwner()`.
pub fn discord_owner_id(ctx: &Ctx<'_>, guild_id: serenity::GuildId) -> Option<u64> {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.owner_id.get())
}

/// One blacklist row. Mirrors the TS entry shape.
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct BlEntry {
    pub reason: Option<String>,
    pub owner: Option<String>,
    pub created_at_ms: Option<i64>,
}

/// Encode a blacklist entry. Mirrors the TS `blacklistTable.set(id, {...})`.
pub fn bl_entry_json(reason: &str, owner_id: u64, created_at_ms: i64) -> String {
    serde_json::json!({
        "blacklisted": true,
        "reason": reason,
        "owner": owner_id.to_string(),
        "createdAt": created_at_ms,
    })
    .to_string()
}

/// Decode a blacklist row, accepting the legacy plain-string shape.
/// A JSON doc yields its leaves; anything else is the reason itself.
pub fn parse_bl_entry(raw: &str) -> BlEntry {
    let Ok(serde_json::Value::Object(map)) = serde_json::from_str::<serde_json::Value>(raw) else {
        return BlEntry {
            reason: Some(raw.to_string()),
            ..Default::default()
        };
    };
    let owner = map.get("owner").and_then(|v| {
        v.as_str()
            .map(|s| s.to_string())
            .or_else(|| v.as_u64().map(|n| n.to_string()))
    });
    BlEntry {
        reason: map
            .get("reason")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        owner,
        created_at_ms: map
            .get("createdAt")
            .and_then(|v| v.as_i64().or_else(|| v.as_u64().map(|n| n as i64))),
    }
}

/// Rebuild an entry with a new reason, preserving owner/createdAt.
/// Mirrors the TS `blacklistTable.set(`${id}.reason`, ...)` leaf write.
pub fn bl_entry_with_reason(raw: &str, new_reason: &str) -> String {
    let old = parse_bl_entry(raw);
    let mut map = serde_json::Map::new();
    map.insert("blacklisted".to_string(), serde_json::Value::Bool(true));
    map.insert(
        "reason".to_string(),
        serde_json::Value::String(new_reason.to_string()),
    );
    if let Some(owner) = old.owner {
        map.insert("owner".to_string(), serde_json::Value::String(owner));
    }
    if let Some(created) = old.created_at_ms {
        map.insert(
            "createdAt".to_string(),
            serde_json::Value::Number(serde_json::Number::from(created)),
        );
    }
    serde_json::Value::Object(map).to_string()
}

/// Transphobia guard from TS `run_for_bot_owner` (unblacklist).
pub fn is_transphobia_reason(reason: &str) -> bool {
    reason.to_lowercase().contains("transphobia")
}

/// Format one blacklist line. Mirrors the TS page-content map.
pub fn format_bl_line(user_id: u64, entry: &BlEntry, unknown: &str, no_reason: &str) -> String {
    let date = entry
        .created_at_ms
        .map(format_bl_date)
        .unwrap_or_else(|| unknown.to_string());
    format!(
        "<@{user_id}>\n├─ {date}\n├─ `{}`\n├─ By {}",
        entry.reason.as_deref().unwrap_or(no_reason),
        entry.owner.as_deref().unwrap_or(unknown)
    )
}

/// Build 5-per-page pager pages. The title template's
/// `${i / usersPerPage + 1}` placeholder becomes the 1-based page no.
pub fn bl_pages(
    entries: &[(u64, BlEntry)],
    title_tpl: &str,
    unknown: &str,
    no_reason: &str,
) -> Vec<(String, String)> {
    entries
        .chunks(BL_PAGE_SIZE)
        .enumerate()
        .map(|(i, chunk)| {
            let title = title_tpl.replace("${i / usersPerPage + 1}", &(i + 1).to_string());
            let desc = chunk
                .iter()
                .map(|(uid, e)| format_bl_line(*uid, e, unknown, no_reason))
                .collect::<Vec<_>>()
                .join("\n");
            (title, desc)
        })
        .collect()
}

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/// `MMM DD YYYY` for unix millis. Mirrors `format(date, "MMM DD YYYY")`.
pub fn format_bl_date(ms: i64) -> String {
    let days = ms.div_euclid(86_400_000);
    // Civil-from-days (Howard Hinnant's algorithm).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    format!("{} {:02} {}", MONTHS[(m - 1) as usize], d, year)
}

/// Guild-scoped raw blacklist row. Mirrors
/// `client.db.get(`${guildId}.BLACKLIST.${userId}`)`.
pub async fn gbl_raw(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Option<String> {
    routed_get(pool, guild_id, guild_id, &blacklist_key(user_id)).await
}

/// Guild-scoped reason lookup (entry shape + legacy fallback).
pub async fn gbl_get(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Option<String> {
    gbl_raw(pool, guild_id, user_id)
        .await
        .map(|raw| parse_bl_entry(&raw).reason.unwrap_or(raw))
}

/// Guild-scoped blacklist write (dual-write, keys unchanged).
pub async fn gbl_set(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    value: &str,
) -> anyhow::Result<()> {
    routed_set(pool, guild_id, guild_id, &blacklist_key(user_id), value).await
}

/// Guild-scoped blacklist delete (both stores).
pub async fn gbl_del(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> anyhow::Result<()> {
    let _ = routed_del(pool, guild_id, guild_id, &blacklist_key(user_id)).await;
    Ok(())
}

/// Merge table-handle rows with legacy kv rows for one blacklist scope.
/// Table wins on conflict; sorted by numeric uid for stable pages.
fn merge_bl_rows(
    table_rows: Vec<(String, String)>,
    legacy_rows: Vec<(String, String)>,
) -> Vec<(u64, BlEntry)> {
    use std::collections::HashMap;
    let mut raws: HashMap<u64, String> = HashMap::new();
    for (key, value) in legacy_rows {
        if let Some(uid) = key
            .strip_prefix("BLACKLIST.")
            .and_then(|s| s.parse::<u64>().ok())
        {
            raws.entry(uid).or_insert(value);
        }
    }
    for (key, value) in table_rows {
        if let Some(uid) = key
            .strip_prefix("BLACKLIST.")
            .and_then(|s| s.parse::<u64>().ok())
        {
            raws.insert(uid, value);
        }
    }
    let mut out: Vec<(u64, BlEntry)> = raws
        .into_iter()
        .map(|(uid, raw)| (uid, parse_bl_entry(&raw)))
        .collect();
    out.sort_by_key(|(uid, _)| *uid);
    out
}

/// Raw leaf text of a nested table doc child: JSON docs re-serialized,
/// pre-encoded strings decoded once.
fn leaf_raw(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        other => serde_json::to_string(other).unwrap_or_default(),
    }
}

/// All global blacklist entries (named table + legacy scope "0").
pub async fn bl_list(pool: &crate::db::Pool) -> Vec<(u64, BlEntry)> {
    let mut table_rows: Vec<(String, String)> = vec![];
    if let Some(root) = tbl_get_value(pool, BLACKLIST_TABLE, "BLACKLIST").await {
        if let Some(map) = root.as_object() {
            for (uid, v) in map {
                table_rows.push((format!("BLACKLIST.{uid}"), leaf_raw(v)));
            }
        }
    }
    merge_bl_rows(
        table_rows,
        legacy_scan(pool, GLOBAL_SCOPE, "BLACKLIST.").await,
    )
}

/// All guild-scoped blacklist entries (table `gid` + legacy scope `gid`).
pub async fn gbl_list(pool: &crate::db::Pool, guild_id: &str) -> Vec<(u64, BlEntry)> {
    let mut table_rows: Vec<(String, String)> = vec![];
    if let Some(root) = tbl_get_value(pool, guild_id, "BLACKLIST").await {
        if let Some(map) = root.as_object() {
            for (uid, v) in map {
                table_rows.push((format!("BLACKLIST.{uid}"), leaf_raw(v)));
            }
        }
    }
    merge_bl_rows(table_rows, legacy_scan(pool, guild_id, "BLACKLIST.").await)
}

/// Per-guild language code (en-US fallback for guild lookup only).
async fn lang_code(ctx: &Ctx<'_>) -> String {
    crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await
}

/// Lang lookup with the exact en-US fallback (YAML untouched).
fn lt(code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
}

/// `${client.iHorizon_Emojis.No}` markup for templates.
async fn no_emoji(ctx: &Ctx<'_>) -> String {
    crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_default()
}

/// Display name. Mirrors `member.globalName || member.displayName`.
fn display_name(user: &serenity::User) -> String {
    user.global_name
        .clone()
        .unwrap_or_else(|| user.name.clone())
}

/// Owners embed for the no-arg add path. Mirrors the TS
/// `Owners [Bot]` / `Owners [Guild]` embeds.
fn owners_embed(title: &str, owners: &[String]) -> serenity::CreateEmbed {
    let desc = owners
        .iter()
        .map(|id| format!("<@{id}>"))
        .collect::<Vec<_>>()
        .join("\n");
    serenity::CreateEmbed::default()
        .colour(0x2E2EFE_u32)
        .title(title)
        .description(desc)
        .timestamp(serenity::Timestamp::now())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "owner",
    aliases("addowner", "owneradd", "owners", "ownerlist"),
    subcommands(
        "owner_list",
        "owner_add",
        "owner_remove",
        "owner_blacklist",
        "owner_unblacklist",
        "owner_blinfo",
        "owner_bledit"
    )
)]
pub async fn owner(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn owner_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Merged view: config owners + persisted owner table.
    // Mirrors getBotOwner() in ownerHelper.ts.
    let owners = crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if owners.is_empty() {
        crate::lang::get(&code, "owner_list_empty").unwrap_or_else(|| "No bot owners.".to_string())
    } else {
        owners.join(", ")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "add")]
pub async fn owner_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    match scope {
        OwnerScope::Bot => {
            let owners =
                crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
            let Some(target) = user else {
                ctx.send(
                    poise::CreateReply::default().embed(owners_embed("Owners [Bot]", &owners)),
                )
                .await?;
                return Ok(());
            };
            if owners.iter().any(|o| o == &target.id.get().to_string()) {
                ctx.say(lt(
                    &code,
                    "owner_already_owner",
                    "This user is already an owner!",
                ))
                .await?;
                return Ok(());
            }
            crate::db::add_bot_owner(&ctx.data().pool, target.id.get()).await?;
            ctx.say(
                lt(
                    &code,
                    "owner_is_now_owner",
                    "${member.user.username} is now an owner of the iHorizon Project!",
                )
                .replace("${member.user.username}", &display_name(&target)),
            )
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            let owners =
                crate::db::guild_owner_ids(&ctx.data().pool, &gid_s, discord_owner_id(&ctx, gid))
                    .await;
            let Some(target) = user else {
                ctx.send(
                    poise::CreateReply::default().embed(owners_embed("Owners [Guild]", &owners)),
                )
                .await?;
                return Ok(());
            };
            if owners.iter().any(|o| o == &target.id.get().to_string()) {
                ctx.say(lt(
                    &code,
                    "owner_already_owner",
                    "This user is already an owner!",
                ))
                .await?;
                return Ok(());
            }
            crate::db::add_guild_owner(&ctx.data().pool, &gid_s, target.id.get()).await?;
            ctx.say(
                lt(
                    &code,
                    "owner_is_now_owner",
                    "${member.user.username} is now an owner of the iHorizon Project!",
                )
                .replace("${member.user.username}", &display_name(&target)),
            )
            .await?;
            Ok(())
        }
    }
}

#[poise::command(slash_command, prefix_command, rename = "remove", aliases("unowner"))]
pub async fn owner_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let done = lt(
        &code,
        "unowner_command_work",
        "${member.username} is no longer an owner",
    )
    .replace("${member.username}", &user.name);
    match scope {
        OwnerScope::Bot => {
            // Mirrors the `isBotDev` guard in TS `run_for_bot_owner`.
            if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            crate::db::remove_bot_owner(&ctx.data().pool, user.id.get()).await?;
            ctx.say(done).await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            // Mirrors the `guild.ownerId` guard in TS `run_for_guild_owner`.
            if discord_owner_id(&ctx, gid) == Some(user.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            crate::db::remove_guild_owner(&ctx.data().pool, &gid.get().to_string(), user.id.get())
                .await?;
            ctx.say(done).await?;
            Ok(())
        }
    }
}

/// Guilds eligible for a cross-guild sweep. Mirrors the TS
/// `memberCount <= 500` shard filter (single-process: local cache).
fn sweep_targets(ctx: &Ctx<'_>) -> Vec<serenity::GuildId> {
    let cache = &ctx.serenity_context().cache;
    cache
        .guilds()
        .into_iter()
        .filter(|gid| {
            cache
                .guild(*gid)
                .map(|g| g.member_count <= SWEEP_MAX_MEMBERS)
                .unwrap_or(false)
        })
        .collect()
}

/// Ban one user across cached guilds in batches of 10 with a 100ms pause.
/// Mirrors `broadcastBanAcrossShards`. Returns (banned, total).
async fn sweep_ban(ctx: &Ctx<'_>, user_id: u64, reason: &str) -> (usize, usize) {
    let targets = sweep_targets(ctx);
    let total = targets.len();
    let mut ok = 0usize;
    let chunks = targets.chunks(SWEEP_BATCH).len();
    for (i, chunk) in targets.chunks(SWEEP_BATCH).enumerate() {
        for gid in chunk {
            if gid
                .ban_with_reason(ctx.http(), serenity::UserId::new(user_id), 0, reason)
                .await
                .is_ok()
            {
                ok += 1;
            }
        }
        if i + 1 < chunks {
            tokio::time::sleep(std::time::Duration::from_millis(SWEEP_DELAY_MS)).await;
        }
    }
    (ok, total)
}

/// Unban one user across cached guilds, batched like `sweep_ban`.
/// Mirrors `broadcastUnbanAcrossShards`. Returns (unbanned, total).
async fn sweep_unban(ctx: &Ctx<'_>, user_id: u64) -> (usize, usize) {
    let targets = sweep_targets(ctx);
    let total = targets.len();
    let mut ok = 0usize;
    let chunks = targets.chunks(SWEEP_BATCH).len();
    for (i, chunk) in targets.chunks(SWEEP_BATCH).enumerate() {
        for gid in chunk {
            if gid
                .unban(ctx.http(), serenity::UserId::new(user_id))
                .await
                .is_ok()
            {
                ok += 1;
            }
        }
        if i + 1 < chunks {
            tokio::time::sleep(std::time::Duration::from_millis(SWEEP_DELAY_MS)).await;
        }
    }
    (ok, total)
}

/// No-arg blacklist pager: 5-per-page embed with prev/next buttons and a
/// 16-minute collector gated on the invoker. Mirrors the TS collector
/// (wrap-around paging, buttons disabled at the end).
async fn send_bl_pager(
    ctx: &Ctx<'_>,
    code: &str,
    entries: &[(u64, BlEntry)],
) -> Result<(), anyhow::Error> {
    let unknown = lt(code, "profil_unknown", "Unknown");
    let no_reason = lt(code, "blacklist_var_no_reason", "No reason found");
    let title_tpl = lt(
        code,
        "blacklist_embed_title",
        "Blacklist - Page ${i / usersPerPage + 1}",
    );
    let pages = bl_pages(entries, &title_tpl, &unknown, &no_reason);
    let mk_embed = |page: usize| {
        serenity::CreateEmbed::default()
            .colour(0x2E2EFE_u32)
            .title(pages[page].0.clone())
            .description(pages[page].1.clone())
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = |disabled: bool| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("bl-prev")
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(disabled),
            serenity::CreateButton::new("bl-next")
                .style(serenity::ButtonStyle::Secondary)
                .label(">>>")
                .disabled(disabled),
        ])
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(0))
                .components(vec![mk_row(false)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    let author_id = ctx.author().id;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(BL_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author_id {
            continue;
        }
        match press.data.custom_id.as_str() {
            "bl-prev" => page = (page + pages.len() - 1) % pages.len(),
            "bl-next" => page = (page + 1) % pages.len(),
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(page))
                        .components(vec![mk_row(false)]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![mk_row(true)]),
        )
        .await;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "blacklist", aliases("bl"))]
pub async fn owner_blacklist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<serenity::User>,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let no = no_emoji(&ctx).await;
    match scope {
        OwnerScope::Bot => {
            let entries = bl_list(&ctx.data().pool).await;
            let Some(target) = user else {
                if entries.is_empty() {
                    ctx.say(
                        lt(
                            &code,
                            "blacklist_no_one_blacklist",
                            "${client.iHorizon_Emojis.No} No blacklisted users found!",
                        )
                        .replace("${client.iHorizon_Emojis.No}", &no),
                    )
                    .await?;
                    return Ok(());
                }
                return send_bl_pager(&ctx, &code, &entries).await;
            };
            // Mirrors the `isBotDev` guard in TS `run_for_bot_owner`.
            if is_bot_dev(&ctx.data().config.owners, target.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            let self_id = ctx.serenity_context().cache.current_user().id;
            if target.id == self_id {
                ctx.say(lt(&code, "blacklist_bot_lol", "Can't blacklist myself x)"))
                    .await?;
                return Ok(());
            }
            if bl_get(&ctx.data().pool, target.id.get()).await.is_some() {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_already_blacklisted",
                        "${member.user.username} is already blacklisted!",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
                return Ok(());
            }
            let full_reason = format!(
                "iHorizon Project Blacklist - {}",
                reason.unwrap_or_else(|| lt(&code, "blacklist_var_no_reason", "No reason found"))
            );
            // TS stores `{blacklisted,reason,owner,createdAt}`.
            bl_set(
                &ctx.data().pool,
                target.id.get(),
                &bl_entry_json(&full_reason, ctx.author().id.get(), crate::bot::now_ms()),
            )
            .await?;
            if let Some(gid) = ctx.guild_id() {
                if gid
                    .ban_with_reason(ctx.http(), target.id, 0, &full_reason)
                    .await
                    .is_ok()
                {
                    ctx.say(
                        lt(
                            &code,
                            "blacklist_command_work",
                            "${member.user.username} is now blacklisted",
                        )
                        .replace("${member.user.username}", &display_name(&target)),
                    )
                    .await?;
                } else {
                    ctx.say(
                        lt(
                            &code,
                            "blacklist_blacklisted_but_can_ban_him",
                            "${client.iHorizon_Emojis.No} is now blacklisted. I can't ban this member here, missing permission?",
                        )
                        .replace("${client.iHorizon_Emojis.No}", &no),
                    )
                    .await?;
                }
            } else {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_command_work",
                        "${member.user.username} is now blacklisted",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
            }
            // Cross-guild sweep with progress + final shard report.
            ctx.say(
                lt(
                    &code,
                    "batch_ban_process",
                    "🔄 Banning ${member.user.username} in progress on ${guilds.length} servers...",
                )
                .replace("${member.user.username}", &display_name(&target))
                .replace("${guilds.length}", "all shards"),
            )
            .await?;
            let (total_success, total_guilds) =
                sweep_ban(&ctx, target.id.get(), &full_reason).await;
            let score = format!("{total_success}/{total_guilds}");
            ctx.say(
                lt(
                    &code,
                    "blacklist_command_work_shard",
                    "✅ ${username} banned on **${totalSuccess}** server(s) across all shards (`{score}`)",
                )
                .replace("{score}", &score)
                .replace("{username}", &display_name(&target))
                .replace("${totalSuccess}", &total_success.to_string()),
            )
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            let entries = gbl_list(&ctx.data().pool, &gid_s).await;
            let Some(target) = user else {
                if entries.is_empty() {
                    ctx.say(
                        lt(
                            &code,
                            "blacklist_no_one_blacklist",
                            "${client.iHorizon_Emojis.No} No blacklisted users found!",
                        )
                        .replace("${client.iHorizon_Emojis.No}", &no),
                    )
                    .await?;
                    return Ok(());
                }
                return send_bl_pager(&ctx, &code, &entries).await;
            };
            // Mirrors the `guild.ownerId` guard in TS `run_for_guild_owner`.
            if discord_owner_id(&ctx, gid) == Some(target.id.get()) {
                ctx.say(lt(
                    &code,
                    "unowner_cant_unowner_creator",
                    "It is not possible to remove this user; they are the creator of the iHorizon Project.",
                ))
                .await?;
                return Ok(());
            }
            let self_id = ctx.serenity_context().cache.current_user().id;
            if target.id == self_id {
                ctx.say(lt(&code, "blacklist_bot_lol", "Can't blacklist myself x)"))
                    .await?;
                return Ok(());
            }
            if gbl_get(&ctx.data().pool, &gid_s, target.id.get())
                .await
                .is_some()
            {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_already_blacklisted",
                        "${member.user.username} is already blacklisted!",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
                return Ok(());
            }
            let full_reason = format!(
                "Blacklist - {}",
                reason.unwrap_or_else(|| lt(&code, "blacklist_var_no_reason", "No reason found"))
            );
            gbl_set(
                &ctx.data().pool,
                &gid_s,
                target.id.get(),
                &bl_entry_json(&full_reason, ctx.author().id.get(), crate::bot::now_ms()),
            )
            .await?;
            if gid
                .ban_with_reason(ctx.http(), target.id, 0, &full_reason)
                .await
                .is_ok()
            {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_command_work",
                        "${member.user.username} is now blacklisted",
                    )
                    .replace("${member.user.username}", &display_name(&target)),
                )
                .await?;
            } else {
                ctx.say(
                    lt(
                        &code,
                        "blacklist_blacklisted_but_can_ban_him",
                        "${client.iHorizon_Emojis.No} is now blacklisted. I can't ban this member here, missing permission?",
                    )
                    .replace("${client.iHorizon_Emojis.No}", &no),
                )
                .await?;
            }
            Ok(())
        }
    }
}

#[poise::command(slash_command, prefix_command, rename = "unblacklist", aliases("unbl"))]
pub async fn owner_unblacklist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let no = no_emoji(&ctx).await;
    let not_listed = lt(
        &code,
        "unblacklist_not_blacklisted",
        "<@${member.id}> was not blacklisted",
    )
    .replace("${member.id}", &user.id.get().to_string());
    match scope {
        OwnerScope::Bot => {
            let Some(raw) = bl_raw(&ctx.data().pool, user.id.get()).await else {
                ctx.say(not_listed).await?;
                return Ok(());
            };
            let entry = parse_bl_entry(&raw);
            // Transphobia refusal (hardcoded in TS, no YAML key).
            if entry
                .reason
                .as_deref()
                .map(is_transphobia_reason)
                .unwrap_or(false)
            {
                ctx.say(format!("{no}{TRANSPHOBIA_REFUSAL}")).await?;
                return Ok(());
            }
            let fetched = match serenity::UserId::new(user.id.get())
                .to_user(ctx.http())
                .await
            {
                Ok(u) => u,
                Err(_) => {
                    ctx.say(lt(
                        &code,
                        "unblacklist_user_is_not_exist",
                        "I couldn't find the user.",
                    ))
                    .await?;
                    return Ok(());
                }
            };
            bl_del(&ctx.data().pool, user.id.get()).await?;
            let unbanned_here = match ctx.guild_id() {
                Some(gid) => gid.unban(ctx.http(), user.id).await.is_ok(),
                None => true,
            };
            if unbanned_here {
                ctx.say(
                    lt(
                        &code,
                        "unblacklist_command_work",
                        "<@${member.id}> is no longer blacklisted",
                    )
                    .replace("${member.id}", &user.id.get().to_string()),
                )
                .await?;
            } else {
                ctx.say(
                    lt(
                        &code,
                        "unblacklist_unblacklisted_but_can_unban_him",
                        "${client.iHorizon_Emojis.No} has been removed from the blacklist, but I can't unban this member here; missing permission or already unbanned?",
                    )
                    .replace("${client.iHorizon_Emojis.No}", &no),
                )
                .await?;
            }
            // Cross-guild sweep with progress + final shard report.
            ctx.say(
                lt(
                    &code,
                    "batch_unblacklist_process",
                    "🔄 Unblacklisting ${bannedMember.username} from ${guildObjects.length} servers in progress...",
                )
                .replace("${bannedMember.username}", &fetched.name)
                .replace("${guildObjects.length}", "all shards"),
            )
            .await?;
            let (total_success, total_guilds) = sweep_unban(&ctx, user.id.get()).await;
            let score = format!("{total_success}/{total_guilds}");
            ctx.say(
                lt(
                    &code,
                    "unblacklist_command_work_across_all_shard",
                    "✅ ${bannedMember.username} is now unbanned on **${totalSuccess}** server(s) across all shards (`${score}`)",
                )
                .replace("${bannedMember.username}", &fetched.name)
                .replace("${totalSuccess}", &total_success.to_string())
                .replace("${score}", &score),
            )
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            if gbl_raw(&ctx.data().pool, &gid_s, user.id.get())
                .await
                .is_none()
            {
                ctx.say(not_listed).await?;
                return Ok(());
            }
            if serenity::UserId::new(user.id.get())
                .to_user(ctx.http())
                .await
                .is_err()
            {
                ctx.say(lt(
                    &code,
                    "unblacklist_user_is_not_exist",
                    "I couldn't find the user.",
                ))
                .await?;
                return Ok(());
            }
            gbl_del(&ctx.data().pool, &gid_s, user.id.get()).await?;
            if gid.unban(ctx.http(), user.id).await.is_ok() {
                ctx.say(
                    lt(
                        &code,
                        "unblacklist_command_work",
                        "<@${member.id}> is no longer blacklisted",
                    )
                    .replace("${member.id}", &user.id.get().to_string()),
                )
                .await?;
            } else {
                ctx.say(
                    lt(
                        &code,
                        "unblacklist_unblacklisted_but_can_unban_him",
                        "${client.iHorizon_Emojis.No} has been removed from the blacklist, but I can't unban this member here; missing permission or already unbanned?",
                    )
                    .replace("${client.iHorizon_Emojis.No}", &no),
                )
                .await?;
            }
            Ok(())
        }
    }
}

/// Blacklist info embed. Mirrors the TS embed description.
fn blinfo_embed(
    user: &serenity::User,
    entry: &BlEntry,
    unknown: &str,
    no_reason: &str,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .colour(0x2E2EFE_u32)
        .description(format!(
            "<@{}> ({})\n├─ {}\n├─ `{}`\n├─ By {}",
            user.id.get(),
            user.name,
            entry
                .created_at_ms
                .map(format_bl_date)
                .unwrap_or_else(|| unknown.to_string()),
            entry.reason.as_deref().unwrap_or(no_reason),
            entry.owner.as_deref().unwrap_or(unknown),
        ))
        .timestamp(serenity::Timestamp::now())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "blinfo",
    aliases("blacklistinfo", "lookbl", "blook")
)]
pub async fn owner_blinfo(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let unknown = lt(&code, "profil_unknown", "Unknown");
    let no_reason = lt(&code, "blacklist_var_no_reason", "No reason found");
    let denied = lt(
        &code,
        "unblacklist_not_blacklisted",
        "<@${member.id}> was not blacklisted",
    )
    .replace("${member.id}", &user.id.get().to_string());
    match scope {
        OwnerScope::Bot => {
            // TS answers the not-blacklisted message for devs too.
            if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
                ctx.say(denied).await?;
                return Ok(());
            }
            let Some(raw) = bl_raw(&ctx.data().pool, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            ctx.send(poise::CreateReply::default().embed(blinfo_embed(
                &user,
                &parse_bl_entry(&raw),
                &unknown,
                &no_reason,
            )))
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
                ctx.say(denied).await?;
                return Ok(());
            }
            let gid_s = gid.get().to_string();
            let Some(raw) = gbl_raw(&ctx.data().pool, &gid_s, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            ctx.send(poise::CreateReply::default().embed(blinfo_embed(
                &user,
                &parse_bl_entry(&raw),
                &unknown,
                &no_reason,
            )))
            .await?;
            Ok(())
        }
    }
}

/// Edit a blacklist reason. Mirrors !bledit.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "bledit",
    aliases("blacklistedit", "editbl")
)]
pub async fn owner_bledit(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "The new reason"] new_reason: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(scope) = owner_scope(&ctx).await else {
        return Ok(());
    };
    let denied = lt(
        &code,
        "unblacklist_not_blacklisted",
        "<@${member.id}> was not blacklisted",
    )
    .replace("${member.id}", &user.id.get().to_string());
    // TS answers the not-blacklisted message for devs in both scopes.
    if is_bot_dev(&ctx.data().config.owners, user.id.get()) {
        ctx.say(denied).await?;
        return Ok(());
    }
    let full_reason = format!("iHorizon Project Blacklist - {}", new_reason.trim());
    let unknown = lt(&code, "profil_unknown", "Unknown");
    let no_reason = lt(&code, "blacklist_var_no_reason", "No reason found");
    match scope {
        OwnerScope::Bot => {
            let Some(raw) = bl_raw(&ctx.data().pool, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            let updated = bl_entry_with_reason(&raw, &full_reason);
            bl_set(&ctx.data().pool, user.id.get(), &updated).await?;
            ctx.send(poise::CreateReply::default().embed(blinfo_embed(
                &user,
                &parse_bl_entry(&updated),
                &unknown,
                &no_reason,
            )))
            .await?;
            Ok(())
        }
        OwnerScope::Guild => {
            let Some(gid) = ctx.guild_id() else {
                return Ok(());
            };
            let gid_s = gid.get().to_string();
            let Some(raw) = gbl_raw(&ctx.data().pool, &gid_s, user.id.get()).await else {
                ctx.say(denied).await?;
                return Ok(());
            };
            let updated = bl_entry_with_reason(&raw, &full_reason);
            gbl_set(&ctx.data().pool, &gid_s, user.id.get(), &updated).await?;
            ctx.send(poise::CreateReply::default().embed(blinfo_embed(
                &user,
                &parse_bl_entry(&updated),
                &unknown,
                &no_reason,
            )))
            .await?;
            Ok(())
        }
    }
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

    #[test]
    fn key_layout() {
        assert_eq!(blacklist_key(1), "BLACKLIST.1");
        assert_eq!(BLACKLIST_TABLE, "blacklist");
    }

    #[test]
    fn dotted_keys_walk_nested_docs() {
        let v: serde_json::Value = serde_json::json!({"7": "spam"});
        assert_eq!(walk_path(&v, &["7"]).and_then(|x| x.as_str()), Some("spam"));
        assert_eq!(walk_path(&v, &["9"]), None);
    }

    #[tokio::test]
    async fn table_handle_roundtrip_nests_and_deletes_cleanly() {
        let pool = mem_pool().await;
        assert_eq!(tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7").await, None);
        tbl_set(&pool, BLACKLIST_TABLE, "BLACKLIST.7", "spam")
            .await
            .unwrap();
        assert_eq!(
            tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
                .await
                .as_deref(),
            Some("spam")
        );
        // Dotted keys nest under the root instead of flat rows.
        let root = tbl_get_value(&pool, BLACKLIST_TABLE, "BLACKLIST")
            .await
            .unwrap();
        assert_eq!(
            walk_path(&root, &["7"]).and_then(|x| x.as_str()),
            Some("spam")
        );
        assert!(tbl_del(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
            .await
            .unwrap());
        assert!(!tbl_del(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
            .await
            .unwrap());
        assert_eq!(tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7").await, None);
    }

    #[tokio::test]
    async fn blacklist_roundtrip_hits_table_handle() {
        let pool = mem_pool().await;
        assert_eq!(bl_get(&pool, 7).await, None);
        bl_set(&pool, 7, "spam").await.unwrap();
        assert_eq!(bl_get(&pool, 7).await.as_deref(), Some("spam"));
        // Dual-write: legacy kv readers (db.rs gate, member-join guard)
        // still see the row under the unchanged key.
        assert_eq!(
            crate::db::kv_get(&pool, "0", &blacklist_key(7))
                .await
                .as_deref(),
            Some("spam")
        );
        // And the table handle serves the same row.
        assert_eq!(
            tbl_get(&pool, BLACKLIST_TABLE, &blacklist_key(7))
                .await
                .as_deref(),
            Some("spam")
        );
        bl_del(&pool, 7).await.unwrap();
        assert_eq!(bl_get(&pool, 7).await, None);
        assert_eq!(crate::db::kv_get(&pool, "0", &blacklist_key(7)).await, None);
    }

    #[tokio::test]
    async fn blacklist_falls_back_to_legacy_kv_and_promotes() {
        let pool = mem_pool().await;
        // Legacy-only row (written before the migration, no named table).
        crate::db::kv_set(&pool, "0", &blacklist_key(9), "old")
            .await
            .unwrap();
        assert_eq!(bl_get(&pool, 9).await.as_deref(), Some("old"));
        // Promoted: a second read hits the named table even when the
        // legacy row is gone.
        crate::db::kv_del(&pool, "0", &blacklist_key(9))
            .await
            .unwrap();
        assert_eq!(bl_get(&pool, 9).await.as_deref(), Some("old"));
    }

    #[tokio::test]
    async fn routed_del_reports_existence_across_stores() {
        let pool = mem_pool().await;
        assert!(!routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
        crate::db::kv_set(&pool, "0", &blacklist_key(3), "x")
            .await
            .unwrap();
        assert!(routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
        assert!(!routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
    }

    #[test]
    fn bl_entry_roundtrip_and_legacy_fallback() {
        let json = bl_entry_json("spam", 42, 1_700_000_000_000);
        let e = parse_bl_entry(&json);
        assert_eq!(e.reason.as_deref(), Some("spam"));
        assert_eq!(e.owner.as_deref(), Some("42"));
        assert_eq!(e.created_at_ms, Some(1_700_000_000_000));
        // Legacy plain-string row reads as its own reason.
        let legacy = parse_bl_entry("old reason");
        assert_eq!(legacy.reason.as_deref(), Some("old reason"));
        assert_eq!(legacy.owner, None);
        assert_eq!(legacy.created_at_ms, None);
    }

    #[test]
    fn bl_entry_reason_edit_preserves_owner_and_date() {
        let json = bl_entry_json("v1", 7, 1_700_000_000_000);
        let updated = bl_entry_with_reason(&json, "v2");
        let e = parse_bl_entry(&updated);
        assert_eq!(e.reason.as_deref(), Some("v2"));
        assert_eq!(e.owner.as_deref(), Some("7"));
        assert_eq!(e.created_at_ms, Some(1_700_000_000_000));
    }

    #[test]
    fn transphobia_guard_matches_ts_check() {
        assert!(is_transphobia_reason(
            "iHorizon Project Blacklist - Transphobia"
        ));
        assert!(is_transphobia_reason("TRANSPHOBIA toward staff"));
        assert!(!is_transphobia_reason("spam"));
    }

    #[test]
    fn bl_date_formats_mmm_dd_yyyy() {
        assert_eq!(format_bl_date(0), "Jan 01 1970");
        // 2026-10-10 00:00:00 UTC.
        assert_eq!(format_bl_date(1_791_590_400_000), "Oct 10 2026");
    }

    #[test]
    fn bl_pages_chunk_five_and_fill_title() {
        let entries: Vec<(u64, BlEntry)> = (1..=6)
            .map(|i| {
                (
                    i,
                    BlEntry {
                        reason: Some(format!("r{i}")),
                        owner: Some("9".to_string()),
                        created_at_ms: Some(0),
                    },
                )
            })
            .collect();
        let pages = bl_pages(
            &entries,
            "Blacklist - Page ${i / usersPerPage + 1}",
            "Unknown",
            "No reason found",
        );
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "Blacklist - Page 1");
        assert_eq!(pages[1].0, "Blacklist - Page 2");
        assert!(pages[0].1.contains("<@1>"));
        assert!(pages[0].1.contains("Jan 01 1970"));
        assert!(pages[0].1.contains("`r1`"));
        assert!(pages[0].1.contains("By 9"));
        assert!(pages[1].1.contains("<@6>"));
    }

    #[test]
    fn bl_line_falls_back_to_unknown_and_no_reason() {
        let line = format_bl_line(3, &BlEntry::default(), "Unknown", "No reason found");
        assert_eq!(
            line,
            "<@3>\n├─ Unknown\n├─ `No reason found`\n├─ By Unknown"
        );
    }

    #[test]
    fn bot_dev_matches_config_list() {
        let owners = vec!["111".to_string(), "222".to_string()];
        assert!(is_bot_dev(&owners, 111));
        assert!(!is_bot_dev(&owners, 333));
    }

    #[tokio::test]
    async fn entry_store_reads_back_reason_and_lists() {
        let pool = mem_pool().await;
        bl_set(&pool, 7, &bl_entry_json("spam", 9, 1_700_000_000_000))
            .await
            .unwrap();
        // Reason lookup unwraps the entry shape (member-join DM parity).
        assert_eq!(bl_get(&pool, 7).await.as_deref(), Some("spam"));
        let rows = bl_list(&pool).await;
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, 7);
        assert_eq!(rows[0].1.reason.as_deref(), Some("spam"));
        assert_eq!(rows[0].1.owner.as_deref(), Some("9"));
        // Guild scope is disjoint from the global table.
        gbl_set(&pool, "g1", 7, &bl_entry_json("gspam", 9, 0))
            .await
            .unwrap();
        assert_eq!(gbl_get(&pool, "g1", 7).await.as_deref(), Some("gspam"));
        assert_eq!(bl_get(&pool, 7).await.as_deref(), Some("spam"));
        let grows = gbl_list(&pool, "g1").await;
        assert_eq!(grows.len(), 1);
        gbl_del(&pool, "g1", 7).await.unwrap();
        assert_eq!(gbl_get(&pool, "g1", 7).await, None);
        bl_del(&pool, 7).await.unwrap();
    }

    #[tokio::test]
    async fn legacy_scan_lists_scope_prefix() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GIVEAWAY.1", "a")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GIVEAWAY.2", "b")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "OTHER.3", "c").await.unwrap();
        let rows = legacy_scan(&pool, "g", "GIVEAWAY.").await;
        assert_eq!(
            rows,
            vec![
                ("GIVEAWAY.1".to_string(), "a".to_string()),
                ("GIVEAWAY.2".to_string(), "b".to_string()),
            ]
        );
        legacy_del_prefix(&pool, "g", "GIVEAWAY.").await.unwrap();
        assert!(legacy_scan(&pool, "g", "GIVEAWAY.").await.is_empty());
        assert_eq!(
            crate::db::kv_get(&pool, "g", "OTHER.3").await.as_deref(),
            Some("c")
        );
    }
}
