// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Shared cross-command helpers (U-LAYOUT-TS-PARITY Phase 1).
// Canonical home for helpers previously defined in one command module
// but used across several: clock, duration parsing, bot footer/profile
// store, permission loaders, guild config blob. The original modules
// re-export these names so existing `crate::commands::<module>::<helper>`
// paths keep resolving.
//
// Storage (U-D1-SHARED): guild-scoped dotted keys on the default db, like
// TS `client.db.get(`${guildId}.BOT.botName`)`. Every helper below routes
// through a per-guild `Table` handle (`table(guild_id)`) with the suffix
// keys unchanged (`BOT.botName`, `UTILS.PERMS.<cmd>`, ...). Signatures are
// unchanged so all existing callers keep compiling.

use crate::bot::Ctx;
use poise::serenity_prelude::{CreateActionRow, CreateButton, CreateEmbed, CreateEmbedFooter};

/// Owned backend over the shared pool for guild-table routing.
/// Every DB helper below clones the pool into one of these and reads /
/// writes through `backend.table(guild_id)` with the suffix keys
/// unchanged, mirroring the TS default-db dotted key
/// `${guildId}.<suffix>`.
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Read one key from the guild table, falling back to the legacy flat kv
/// row. Cutover helper: writers migrate to tables in D-batches (see
/// roadmap D1-D9); until then legacy rows are still the live store for
/// most commands, so table-only reads would silently miss them.
/// Legacy rows hold plain strings: valid JSON decodes, anything else
/// becomes `Value::String` (matches the old kv_get call sites).
async fn table_value_or_legacy(
    table: &crate::backends::Table<'_>,
    pool: &crate::db::Pool,
    gid: &str,
    key: &str,
) -> Option<serde_json::Value> {
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, gid, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

/// Current time in unix milliseconds. Mirrors TS Date.now().
/// Canonical copy; schedule/context/economy previously each defined this.
pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Parse a duration ("10s", "1h30m", "3h 30m", "1.5h", "1,5h", "2w", "1mo", "1y")
/// into milliseconds. Mirrors TS `client.timeCalculator.to_ms` (ms.ts):
/// `<number><unit>` pairs are summed, units cover ms/s/m/h/d/w/mo/y plus
/// the EN/FR long names, and comma decimals are accepted (the antispam
/// modal does `.replace(",", ".")` before calling `to_ms`).
/// Unlike TS (which ignores unmatched text and returns 0 for garbage),
/// this rejects: the whole input must be consumed and the total must be
/// positive, so "", "abc", "0s", "-5m", "10x" and bare "10" stay `None`.
pub fn parse_duration_ms(raw: &str) -> Option<i64> {
    let s = raw.trim().to_ascii_lowercase().replace(',', ".");
    if s.is_empty() {
        return None;
    }
    let b = s.as_bytes();
    let mut i = 0;
    let mut total = 0.0_f64;
    let mut pairs = 0_u32;
    while i < b.len() {
        while i < b.len() && b[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= b.len() {
            break;
        }
        // Number: -? (digits (. digits)? | . digits), mirroring
        // the TS `(-?\d*\.?\d+)` head of each pair.
        let start = i;
        if b[i] == b'-' {
            i += 1;
        }
        let int_start = i;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
        }
        let int_len = i - int_start;
        if i < b.len() && b[i] == b'.' {
            i += 1;
            let frac_start = i;
            while i < b.len() && b[i].is_ascii_digit() {
                i += 1;
            }
            if i - frac_start == 0 {
                return None;
            }
        } else if int_len == 0 {
            return None;
        }
        let value: f64 = s[start..i].parse().ok()?;
        while i < b.len() && b[i].is_ascii_whitespace() {
            i += 1;
        }
        let u_start = i;
        while i < b.len() && b[i].is_ascii_alphabetic() {
            i += 1;
        }
        if u_start == i {
            return None;
        }
        let mult = duration_unit_ms(&s[u_start..i])?;
        total += value * (mult as f64);
        pairs += 1;
    }
    if pairs == 0 {
        return None;
    }
    if total <= 0.0 || total.is_nan() {
        return None;
    }
    if total > i64::MAX as f64 {
        return None;
    }
    Some(total.round() as i64)
}

/// Millisecond multiplier per `to_ms` unit (ms.ts `multipliers` table).
fn duration_unit_ms(unit: &str) -> Option<i64> {
    Some(match unit {
        "ms" | "msec" | "millisecond" | "milliseconds" | "milliseconde" | "millisecondes" => 1,
        "s" | "sec" | "secs" | "second" | "seconds" | "seconde" | "secondes" => 1_000,
        "m" | "min" | "mins" | "minute" | "minutes" => 60_000,
        "h" | "hr" | "hrs" | "hour" | "hours" | "heure" | "heures" => 3_600_000,
        "d" | "day" | "days" | "j" | "jour" | "jours" => 86_400_000,
        "w" | "sm" | "week" | "weeks" | "semaine" | "semaines" => 604_800_000,
        "mo" | "mois" | "month" | "months" => 2_592_000_000,
        "y" | "yr" | "yrs" | "year" | "years" | "an" | "ans" => 31_557_600_000,
        _ => return None,
    })
}

/// Per-guild bot profile store keys. Mirrors `${guildId}.BOT.botName`
/// / `BOT.botPFP` in bot/custom/!name.ts and !avatar.ts.
pub const BOT_NAME_KEY: &str = "BOT.botName";
pub const BOT_PFP_KEY: &str = "BOT.botPFP";

/// Resolve the embed footer text. Mirrors displayBotName.footerBuilder:
/// TS falls back to "iHorizon" only on JS-falsy `!botName`, i.e. for a
/// stored string exactly `""` (missing row is undefined). Whitespace-only
/// (`"  "`) and padded (`" MyBot "`) names are truthy and render VERBATIM
/// (node ground truth; the `!name.ts` setter stores any truthy name
/// untrimmed, so both shapes are reachable rows). No trim here.
pub fn bot_footer_name(stored: Option<&str>) -> String {
    match stored {
        Some(s) if !s.is_empty() => s.to_string(),
        _ => "iHorizon".to_string(),
    }
}

/// Resolve the footer icon attachment bytes. Mirrors
/// displayBotName.footerAttachmentBuilder + displayBotPP: a stored
/// BOT.botPFP base64 blob becomes footer_icon.png bytes; otherwise the
/// caller falls back to the live bot avatar URL (type 1 branch).
pub fn footer_icon_bytes(stored: Option<&str>) -> Option<Vec<u8>> {
    stored.and_then(crate::emojis::base64_decode)
}

/// Paginated footer text. Mirrors footerPaginationBuilder.
pub fn footer_page_text(name: &str, page_word: &str, page: u64, max: u64) -> String {
    format!("{name} • {page_word} {page}/{max}")
}

/// Download raw bytes (avatar attachments, current bot avatar).
/// One process-wide client: connection reuse instead of a fresh TLS
/// handshake per download (user-visible behavior unchanged).
static HTTP: once_cell::sync::Lazy<reqwest::Client> =
    once_cell::sync::Lazy::new(reqwest::Client::new);

pub async fn download_bytes(url: &str) -> Option<Vec<u8>> {
    HTTP.get(url)
        .send()
        .await
        .ok()?
        .bytes()
        .await
        .ok()
        .map(|b| b.to_vec())
}

/// Footer text plus optional footer_icon.png bytes, pool-only variant
/// for non-Ctx paths (component handlers). Same table-first read as
/// `footer_parts` via `table_value_or_legacy` (stored BOT.botPFP
/// base64 wins); no bot-avatar network fallback (no cache access, so
/// a missing stored icon resolves to `None` like the legacy
/// component path).
pub async fn footer_parts_pool(
    pool: &crate::db::Pool,
    guild_id: &str,
) -> (String, Option<Vec<u8>>) {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    let name = bot_footer_name(
        table_value_or_legacy(&table, pool, guild_id, BOT_NAME_KEY)
            .await
            .as_ref()
            .and_then(|v| v.as_str()),
    );
    let stored: Option<String> = table_value_or_legacy(&table, pool, guild_id, BOT_PFP_KEY)
        .await
        .as_ref()
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    (name, footer_icon_bytes(stored.as_deref()))
}

/// Footer text plus optional footer_icon.png bytes.
/// Mirrors displayBotName footerBuilder/footerAttachmentBuilder
/// (stored BOT.botPFP base64 wins, else a bot avatar snapshot;
// TS attaches the avatar URL, we attach its bytes so the icon renders).
pub async fn footer_parts(ctx: &Ctx<'_>, guild_id: &str) -> (String, Option<Vec<u8>>) {
    let (name, stored_bytes) = footer_parts_pool(&ctx.data().pool, guild_id).await;
    if stored_bytes.is_some() {
        return (name, stored_bytes);
    }
    let face = ctx.serenity_context().cache.current_user().face();
    let bytes = download_bytes(&face).await;
    (name, bytes)
}

/// Apply the shared footer (text + optional icon attachment) to an embed.
/// No icon means no `icon_url` at all: an empty-string URL is invalid
/// and an unreferenced attachment renders as an orphan file, so the
/// footer stays text-only in that case. Callers must attach a file
/// named `footer_icon.png` to the same message exactly when
/// `with_icon` is true.
pub fn embed_with_footer(
    embed: poise::serenity_prelude::CreateEmbed,
    name: &str,
    with_icon: bool,
) -> poise::serenity_prelude::CreateEmbed {
    let footer = if with_icon {
        poise::serenity_prelude::CreateEmbedFooter::new(name.to_string())
            .icon_url("attachment://footer_icon.png")
    } else {
        poise::serenity_prelude::CreateEmbedFooter::new(name.to_string())
    };
    embed.footer(footer)
}

/// Prefix-leg reply shaping for `reply_callback` (set once in `bot.rs`).
/// Mirrors the Message leg of `interactionSend` in method.ts:761-829 —
/// prefix answers go out as `message.reply()` (never a bare channel send)
/// with `allowedMentions: { repliedUser: false, roles: [], users: [] }`
/// (no reply ping, no user/role mention parsing; @everyone default kept).
/// The slash leg passes through untouched (TS interaction replies keep
/// default mentions, so role/user mentions in embeds keep parsing there).
/// Commands whose TS main response is a plain channel send (not a reply)
/// are excluded here: `utils vc` (!vc.ts `channel.send`), `utils top`
/// (MessageCommands top.ts `channelSend`, which also keeps default
/// mentions), legacy `h` (MessageCommands/bot @h.ts `channel.send`).
/// Paths are poise qualified names (`utils` owns both
/// leaves, so bare `top` never matches).
pub fn shape_prefix_reply(ctx: Ctx<'_>, reply: poise::CreateReply) -> poise::CreateReply {
    if !matches!(ctx, poise::Context::Prefix(_)) {
        return reply;
    }
    const PLAIN_SEND_PATHS: &[&str] = &["utils vc", "utils top", "h"];
    if PLAIN_SEND_PATHS.contains(&ctx.command().qualified_name.as_str()) {
        return reply;
    }
    reply.reply(true).allowed_mentions(
        poise::serenity_prelude::CreateAllowedMentions::new()
            .replied_user(false)
            .all_users(false)
            .all_roles(false),
    )
}

/// Prefix-display name lookup. Mirrors the `prefixName || name` display
/// picks in TS `createAwesomeEmbed` (method.ts:327,354) and
/// `sendErrorMessage` (method.ts:666,686): `prefixName` is display-only
/// there (prefix dispatch matches `name`/aliases), so this table exists
/// only for usage/help lines. Keyed by the Rust slash qualified path
/// (`parent leaf`, e.g. `ranks show`); an entry exists only where the
/// matching TS top-level hybrid option defines a `prefixName` that
/// differs from its slash name. No entry (None) means "show the slash
/// name", which covers top-level commands (no real top-level hybrid
/// command defines `prefixName`), identity pairs (`talk`, `shop`,
/// `addrole`), and port-restructured leaves with no TS counterpart
/// (`unban-all`, `custom`/`starboard` rows).
pub fn prefix_name_for(qualified: &str) -> Option<&'static str> {
    match qualified {
        "antispam manage" => Some("antispam-manage"),
        "antispam bypass-roles" => Some("antispam-bypass-roles"),
        "antispam ignore-channels" => Some("antispam-ignore-channels"),
        "backup create" => Some("backup-create"),
        "backup list" => Some("backup-list"),
        "backup load" => Some("backup-load"),
        "backup delete" => Some("backup-delete"),
        "backup manage" => Some("backup-manager"),
        "confession channel" => Some("confess-channel"),
        "confession config" => Some("confess-config"),
        "confession cooldown" => Some("confess-cooldown"),
        "confession thread" => Some("confthread"),
        "counter channel" => Some("counter-channel"),
        "counter config" => Some("counter-config"),
        "economy balance-add" => Some("addmoney"),
        "economy balance-remove" => Some("removemoney"),
        "economy boost-set" => Some("economy-boost-set"),
        "economy config" => Some("ecconfig"),
        "economy greset" => Some("economy-greset"),
        "economy leaderboard" => Some("economy-leaderboard"),
        "economy role" => Some("ecrole"),
        "economy role add" => Some("economy-role-add"),
        "economy role delete" => Some("economy-role-delete"),
        "economy role list" => Some("economy-role-list"),
        "economy ureset" => Some("economy-ureset"),
        "fun config" => Some("fconfig"),
        "gw create" => Some("gw-create"),
        "gw end" => Some("gw-end"),
        "h247 info" => Some("h247info"),
        "inv leaderboard" => Some("invites-leaderboard"),
        "inv reset" => Some("invites-reset"),
        "pfps channel" => Some("pfps-channel"),
        "pfps config" => Some("pfps-config"),
        "ranks channel" => Some("ranks-channel"),
        "ranks config" => Some("rconfig"),
        "ranks greset" => Some("ranks-greset"),
        "ranks ignore-channels" => Some("ranks-ignore-channels"),
        "ranks leaderboard" => Some("ranks-leaderboard"),
        "ranks message" => Some("ranks-message"),
        "ranks roles" => Some("ranks-roles"),
        "ranks show" => Some("ranks-show"),
        "ranks ureset" => Some("ranks-ureset"),
        "security channel" => Some("security-channel"),
        "security config" => Some("security-config"),
        "sticky disable" => Some("sticky-disable"),
        "sticky embed" => Some("sticky-embed"),
        "sticky list" => Some("sticky-list"),
        "sticky refresh" => Some("sticky-refresh"),
        "sticky show" => Some("sticky-show"),
        "sticky text" => Some("sticky-text"),
        "tag create" => Some("tag-create"),
        "tag delete" => Some("tag-delete"),
        "tag info" => Some("tag-info"),
        "tag list" => Some("tag-list"),
        "tag use" => Some("tag-use"),
        "tag wlroles-create" => Some("tag-wlcreate"),
        "tag wlroles-use" => Some("tag-wluse"),
        "ticket config" => Some("ticket-config"),
        "ticket delete" => Some("ticket-delete"),
        "tts info" => Some("ttsinfo"),
        "tts join" => Some("ttsjoin"),
        "tts lang" => Some("ttslang"),
        "tts leave" => Some("ttsleave"),
        "utils banner server" => Some("banner-server"),
        "utils banner user" => Some("banner-user"),
        _ => None,
    }
}

/// Custom per-command permissions. Mirrors perm/!command.ts
/// (UTILS.PERMS.<command> {users, roles, level}).
pub fn perm_key(command: &str) -> String {
    format!("UTILS.PERMS.{command}")
}

/// Legacy UTILS.PERMS alias for a renamed command. The Rust port
/// renamed the TS `prefix` command to `setprefix`
/// (MessageCommands/bot/@prefix.ts `name: "prefix"`, aliases
/// `setprefix`/`changeprefix`); rows stored under the old key must keep
/// resolving, mirroring the TS `UTILS.PERMS.prefix` lookup.
pub fn perm_fallback_key(command: &str) -> Option<&'static str> {
    match command {
        "setprefix" => Some("prefix"),
        _ => None,
    }
}

pub async fn load_cmd_perms(
    pool: &crate::db::Pool,
    guild_id: &str,
    command: &str,
) -> Option<crate::executor::CmdPerms> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Some(raw) = table_value_or_legacy(&table, pool, guild_id, &perm_key(command)).await {
        return parse_cmd_perms_value(&raw);
    }
    // Renamed-command compat: rows stored under the pre-rename key
    // (e.g. UTILS.PERMS.prefix for `setprefix`) keep resolving. The
    // primary key wins when both exist.
    if let Some(legacy) = perm_fallback_key(command) {
        if let Some(raw) = table_value_or_legacy(&table, pool, guild_id, &perm_key(legacy)).await {
            return parse_cmd_perms_value(&raw);
        }
    }
    None
}

/// Decode one `UTILS.PERMS.<command>` value. Mirrors the read branches
/// in !command.ts: a JSON object first, then the legacy bare-number
/// (PermLevel) form.
fn parse_cmd_perms_value(raw: &serde_json::Value) -> Option<crate::executor::CmdPerms> {
    if let serde_json::Value::String(s) = raw {
        if let Ok(p) = serde_json::from_str(s) {
            return Some(p);
        }
        // Legacy bare-number format (PermLevel). Mirrors the
        // `typeof existingPerms === "number"` branch in !command.ts.
        return s
            .trim()
            .parse::<u8>()
            .ok()
            .map(|n| crate::executor::CmdPerms {
                level: Some(n),
                ..Default::default()
            });
    }
    if let Ok(p) = serde_json::from_value(raw.clone()) {
        return Some(p);
    }
    raw.as_u64()
        .and_then(|n| u8::try_from(n).ok())
        .map(|n| crate::executor::CmdPerms {
            level: Some(n),
            ..Default::default()
        })
}

/// True when the entry restricts anything. Mirrors
/// has(Permission|CommandPermission)Requirements.
pub fn has_perm_requirements(perms: &crate::executor::CmdPerms) -> bool {
    !perms.users.is_empty() || !perms.roles.is_empty() || perms.level.unwrap_or(0) > 0
}

/// Load every per-command permission row: (command, perms).
/// Mirrors reading the whole `UTILS.PERMS` subtree in !command.ts.
/// Table-routed: dotted writes merge under the `UTILS` root, so the
/// subtree is read from the decoded object, not a key-prefix scan.
pub async fn load_all_cmd_perms(
    pool: &crate::db::Pool,
    gid: &str,
) -> Vec<(String, crate::executor::CmdPerms)> {
    let backend = guild_backend(pool);
    let table = backend.table(gid);
    let root: Option<serde_json::Value> = table.get("UTILS").await.unwrap_or(None);
    let mut out = vec![];
    let Some(perms) = root
        .as_ref()
        .and_then(|r| r.get("PERMS"))
        .and_then(|p| p.as_object())
    else {
        return out;
    };
    for (cmd, raw) in perms {
        if cmd.is_empty() || cmd.contains('.') {
            continue;
        }
        if let Some(p) = parse_cmd_perms_value(raw) {
            out.push((cmd.to_string(), p));
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

/// Prefix-path native-permission gate (U-MSV-FIX14). Mirrors
/// `checkNativePermission` in src/core/commandExecutor.ts
/// (`member.permissions.has(target.permission)` -> the
/// `var_dont_have_perm` denial), which TS runs on BOTH dispatch paths.
/// Discord enforces `default_member_permissions` on slash server-side,
/// so the slash leg needs nothing here; poise applies
/// `default_member_permissions` only to slash registration, never to
/// prefix dispatch — every gated leaf therefore calls this first and
/// stops when it returns true (denial already sent, same key and
/// `{perm}` shape as the `MissingUserPermissions` router in bot.rs).
/// No YAML changes: the denial reuses the existing `var_dont_have_perm`
/// key with its en-US fallback.
pub async fn deny_without_prefix_perm(
    ctx: &Ctx<'_>,
    want: poise::serenity_prelude::Permissions,
) -> bool {
    if !matches!(ctx, poise::Context::Prefix(_)) {
        return false;
    }
    if prefix_perm_grants(ctx, want).await {
        return false;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let perm = crate::lang::permission_names(&code, want.bits())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "permission".to_string());
    let msg = crate::lang::get(&code, "var_dont_have_perm")
        .unwrap_or_else(|| {
            "You aren't allowed to do this, you are missing the {perm} permission!".to_string()
        })
        .replace("{perm}", &perm);
    if !msg.is_empty() {
        let _ = ctx.send(poise::CreateReply::default().content(msg)).await;
    }
    true
}

/// discord.js `permissions.has()` semantics for the gate above:
/// ADMINISTRATOR implies every permission (serenity bitflags alone do
/// not imply it). Pure seam for the module tests.
pub fn has_native_perm(
    have: poise::serenity_prelude::Permissions,
    want: poise::serenity_prelude::Permissions,
) -> bool {
    have.administrator() || have.contains(want)
}

// Scoped deprecated-use allow: `Member::permissions` keeps the
// channel-overwrite handling that `Guild::user_permissions_in` drops —
// same reason as the allow on `is_guild_admin` in bot.rs. Re-evaluate
// on serenity upgrade; do not broaden to the whole module.
#[allow(deprecated)]
async fn prefix_perm_grants(ctx: &Ctx<'_>, want: poise::serenity_prelude::Permissions) -> bool {
    let Some(gid) = ctx.guild_id() else {
        return false;
    };
    let http = &ctx.serenity_context().http;
    let Ok(member) = gid.member(http, ctx.author().id).await else {
        return false;
    };
    member
        .permissions(&ctx.serenity_context().cache)
        .map(|p| has_native_perm(p, want))
        .unwrap_or(false)
}

/// Load the guild config blob. Mirrors the GUILD.GUILD_CONFIG object
/// read by the welcomer panel and the join/leave emitters.
pub async fn load_guild_config(pool: &crate::db::Pool, gid: &str) -> serde_json::Value {
    let backend = guild_backend(pool);
    let table = backend.table(gid);
    match table_value_or_legacy(&table, pool, gid, "GUILD.GUILD_CONFIG").await {
        Some(v) if v.is_object() => v,
        _ => serde_json::json!({}),
    }
}

pub async fn save_guild_config(
    pool: &crate::db::Pool,
    gid: &str,
    cfg: &serde_json::Value,
) -> anyhow::Result<()> {
    let backend = guild_backend(pool);
    backend.table(gid).set("GUILD.GUILD_CONFIG", cfg).await
}

/// Set or remove a blob field. Mirrors the panel set/delete pairs
/// (message/embed/channel/toggle keys).
pub fn welcomer_set(cfg: &mut serde_json::Value, field: &str, value: Option<serde_json::Value>) {
    match value {
        Some(v) => cfg[field] = v,
        None => {
            if let Some(map) = cfg.as_object_mut() {
                map.remove(field);
            }
        }
    }
}

/// Help embed + Top.gg vote-button helpers (U-AWESOMEEMBED).
/// Mirrors `createAwesomeEmbed` and the TopGG trio
/// (`shouldAdvertiseTheTopggVoteButton`, `generateTopggActionRow`,
/// `addTopggButonToTheActualComponents` — the TS `Buton` typo lives on
/// in that name only) in src/core/functions/method.ts.
///
/// User-visible strings are NOT hardcoded here: every label/template
/// arrives already resolved by the caller (`crate::lang::get` with the
/// exact en-US fallback, the `t(key, fallback)` pattern used across the
/// command modules). YAML is untouched.
///
/// One slash/prefix option rendered into a help usage line. Mirrors the
/// `Option` rows consumed by `boldStringifyOption` / `stringifyOption`
/// (`getArgumentOptionNameWithOptions`: choice values joined with `/`,
/// else the option name).
#[derive(Debug, Clone, Default)]
pub struct HelpOptionDoc {
    pub name: String,
    /// `Some` (even empty) renders the values joined with `/` (TS
    /// `if (o.choices)` is truthy on `[]`); `None` keeps the name.
    pub choices: Option<Vec<String>>,
    pub required: bool,
}

impl HelpOptionDoc {
    pub fn display_name(&self) -> String {
        match &self.choices {
            None => self.name.clone(),
            Some(values) => values.join("/"),
        }
    }
}

/// Mirrors `stringifyOption`: `[name]` when required, `<name>` otherwise.
pub fn stringify_options(options: &[HelpOptionDoc]) -> String {
    options
        .iter()
        .map(|o| {
            if o.required {
                format!("[{}]", o.display_name())
            } else {
                format!("<{}>", o.display_name())
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Mirrors `boldStringifyOption`: `` **[`name`]** `` / `` **`<name>`** ``.
pub fn bold_stringify_options(options: &[HelpOptionDoc]) -> String {
    options
        .iter()
        .map(|o| {
            if o.required {
                format!("**`[{}]`**", o.display_name())
            } else {
                format!("**`<{}>`**", o.display_name())
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Capitalize the command name for the help title. Mirrors
/// `commandName.charAt(0).toUpperCase() + commandName.slice(1)`.
pub fn capitalize_command_name(name: &str) -> String {
    // Same UTF-16-unit quirk as TS `charAt(0).toUpperCase() + slice(1)`
    // (astral-first names pass through unchanged); shares the helper.
    crate::funcs::capitalize_first(name)
}

/// Resolve the permission line for the help embed. Mirrors the `perm`
/// cascade in `createAwesomeEmbed`: the declared permission label
/// first, then the `UTILS.PERMS.<cmd>` override — a nonzero custom
/// level replaces it, custom roles replace it with mentions, custom
/// users are appended with no separator (matching the TS `perm += ...`
/// quirk). Empty means "none"; the caller substitutes its none-label.
pub fn help_permission_text(base: &str, custom: Option<&crate::executor::CmdPerms>) -> String {
    let mut perm = base.to_string();
    if let Some(cp) = custom {
        if let Some(level) = cp.level.filter(|l| *l > 0) {
            perm = level.to_string();
        }
        if !cp.roles.is_empty() {
            perm = cp
                .roles
                .iter()
                .map(|r| format!("<@&{r}>"))
                .collect::<Vec<_>>()
                .join(", ");
        }
        if !cp.users.is_empty() {
            let mentions = cp
                .users
                .iter()
                .map(|u| format!("<@{u}>"))
                .collect::<Vec<_>>()
                .join(", ");
            perm.push_str(&mentions);
        }
    }
    perm
}

/// One subcommand row for the help embed. Mirrors the
/// `hasSubCommand(command.options)` branch of `createAwesomeEmbed`.
#[derive(Debug, Clone, Default)]
pub struct HelpSubcommandDoc {
    pub name: String,
    pub prefix_name: Option<String>,
    pub aliases: Vec<String>,
    pub options: Vec<HelpOptionDoc>,
}

/// Resolved inputs for [`build_awesome_embed`]. Text is already
/// localized by the caller; the template/label fields carry the exact
/// en-US fallbacks (`hybridcommands_embed_help_title`,
/// `hybridcommands_embed_help_fields_value`, `var_usage`,
/// `var_permission`, `var_aliases`, `setjoinroles_var_none`).
/// `description` is the caller-picked locale string (TS picks the `fr`
/// localization when the guild lang starts with `fr-`).
pub struct AwesomeHelpInput<'a> {
    pub command_name: String,
    pub prefix_name: Option<String>,
    pub description: String,
    pub aliases: Vec<String>,
    pub base_permission: String,
    pub custom_perms: Option<&'a crate::executor::CmdPerms>,
    pub options: Vec<HelpOptionDoc>,
    pub subcommands: Vec<HelpSubcommandDoc>,
    pub prefix: String,
    pub title_template: String,
    pub fields_value_template: String,
    pub usage_label: String,
    pub permission_label: String,
    pub aliases_label: String,
    pub none_label: String,
    pub footer_text: String,
}

/// Build the per-command help embed. Mirrors `createAwesomeEmbed`
/// (title, `LightGrey` colour, one field per subcommand or the
/// usage/permission/aliases fields, bot-name footer). When a footer
/// icon attachment is available, pass the result through
/// [`embed_with_footer`] with the same footer text afterwards.
pub fn build_awesome_embed(input: &AwesomeHelpInput<'_>) -> CreateEmbed {
    let raw_name = input.prefix_name.as_deref().unwrap_or(&input.command_name);
    let mut embed = CreateEmbed::default()
        .title(
            input
                .title_template
                .replace("${commandName}", &capitalize_command_name(raw_name)),
        )
        .colour(0xD3_D3D3_u32) // discord.js "LightGrey"
        .footer(CreateEmbedFooter::new(input.footer_text.clone()));
    if !input.subcommands.is_empty() {
        let fields: Vec<(String, String, bool)> = input
            .subcommands
            .iter()
            .map(|sub| {
                let short = sub.prefix_name.as_deref().unwrap_or(&sub.name);
                let path = bold_stringify_options(&sub.options);
                let aliases = if sub.aliases.is_empty() {
                    input.none_label.clone()
                } else {
                    sub.aliases
                        .iter()
                        .map(|a| format!("`{a}`"))
                        .collect::<Vec<_>>()
                        .join(", ")
                };
                let use_line = format!("{}{} {}", input.prefix, short, path);
                let value = input
                    .fields_value_template
                    .replace("${aliases}", &aliases)
                    .replace("${use}", &use_line);
                (format!("{}{}", input.prefix, short), value, false)
            })
            .collect();
        embed = embed.fields(fields);
    } else {
        let path = bold_stringify_options(&input.options);
        let usage = format!("{}{} {}", input.prefix, raw_name, path);
        let perm = help_permission_text(&input.base_permission, input.custom_perms);
        let perm_value = if perm.is_empty() {
            input.none_label.clone()
        } else {
            perm
        };
        let aliases = if input.aliases.is_empty() {
            input.none_label.clone()
        } else {
            input
                .aliases
                .iter()
                .map(|a| format!("`{a}`"))
                .collect::<Vec<_>>()
                .join(", ")
        };
        embed = embed.fields(vec![
            (input.usage_label.clone(), usage, false),
            (
                input.permission_label.clone(),
                format!("{}: {perm_value}", input.permission_label),
                false,
            ),
            (input.aliases_label.clone(), aliases, false),
        ]);
    }
    embed
}

/// Twelve hours in ms. Mirrors the `twelveHours` constant in the
/// commented-out body of `shouldAdvertiseTheTopggVoteButton`.
pub const TOPGG_REVOTE_MS: i64 = 12 * 60 * 60 * 1000;

/// Vote URL. Mirrors the `setURL` in `generateTopggActionRow`
/// (`https://top.gg/bot/<appId>/vote`).
pub fn topgg_vote_url(app_id: u64) -> String {
    format!("https://top.gg/bot/{app_id}/vote")
}

/// Mirrors `shouldAdvertiseTheTopggVoteButton`. The TS body is
/// currently stubbed to `return false` (vote tracking via `apiTable`
/// commented out); this port keeps that behaviour.
pub fn should_advertise_the_topgg_vote_button(_author_id: &str) -> bool {
    false
}

/// The commented-out TS rule as a pure predicate, so the 12h re-vote
/// window stays testable once vote tracking lands: advertise unless
/// already notified; a missing timestamp (never voted) advertises.
pub fn should_advertise_topgg_vote(
    now_ms: i64,
    last_vote_ms: Option<i64>,
    already_notified: bool,
) -> bool {
    if already_notified {
        return false;
    }
    match last_vote_ms {
        None => true,
        Some(t) => now_ms - t >= TOPGG_REVOTE_MS,
    }
}

/// Mirrors `generateTopggActionRow`: a single link-button row, `label`
/// resolved by the caller (en-US fallback `"Vote for iHorizon"`). The
/// TS version also sets the TOPGG app emoji; omitted here because the
/// emoji id is only known after the app-emoji sync — re-add via
/// `.emoji(...)` once it is resolvable.
pub fn generate_topgg_action_row(app_id: u64, label: &str) -> CreateActionRow {
    CreateActionRow::Buttons(vec![
        CreateButton::new_link(topgg_vote_url(app_id)).label(label.to_string())
    ])
}

/// Mirrors `addTopggButonToTheActualComponents`: the vote row is
/// appended, so empty input yields just that row.
pub fn add_topgg_button_to_components(
    mut current: Vec<CreateActionRow>,
    app_id: u64,
    label: &str,
) -> Vec<CreateActionRow> {
    current.push(generate_topgg_action_row(app_id, label));
    current
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn parse_duration_ms_to_ms_parity() {
        // Single units (ms.ts multipliers).
        assert_eq!(parse_duration_ms("10s"), Some(10_000));
        assert_eq!(parse_duration_ms("5m"), Some(300_000));
        assert_eq!(parse_duration_ms("2h"), Some(7_200_000));
        assert_eq!(parse_duration_ms("7d"), Some(604_800_000));
        assert_eq!(parse_duration_ms("500ms"), Some(500));
        assert_eq!(parse_duration_ms("5min"), Some(300_000));
        assert_eq!(parse_duration_ms("2hours"), Some(7_200_000));
        assert_eq!(parse_duration_ms("15M"), Some(900_000));
        // Compound pairs are summed ("3h 30m" task case).
        assert_eq!(parse_duration_ms("3h 30m"), Some(12_600_000));
        assert_eq!(parse_duration_ms("1h30m"), Some(5_400_000));
        assert_eq!(parse_duration_ms("1m30s"), Some(90_000));
        assert_eq!(parse_duration_ms("1d 2h 3m 4s"), Some(93_784_000));
        // Decimals, dot and comma (antispam modal comma case).
        assert_eq!(parse_duration_ms("1.5h"), Some(5_400_000));
        assert_eq!(parse_duration_ms("1,5h"), Some(5_400_000));
        assert_eq!(parse_duration_ms("1.5m"), Some(90_000));
        // Week / month / year units.
        assert_eq!(parse_duration_ms("1w"), Some(604_800_000));
        assert_eq!(parse_duration_ms("2weeks"), Some(1_209_600_000));
        assert_eq!(parse_duration_ms("1mo"), Some(2_592_000_000));
        assert_eq!(parse_duration_ms("1month"), Some(2_592_000_000));
        assert_eq!(parse_duration_ms("1y"), Some(31_557_600_000));
        assert_eq!(parse_duration_ms("1year"), Some(31_557_600_000));
        assert_eq!(parse_duration_ms("1an"), Some(31_557_600_000));
        assert_eq!(parse_duration_ms("2jours"), Some(172_800_000));
        assert_eq!(parse_duration_ms("1semaine"), Some(604_800_000));
        // Garbage stays rejected (TS returns falsy 0 here).
        assert_eq!(parse_duration_ms(""), None);
        assert_eq!(parse_duration_ms("abc"), None);
        assert_eq!(parse_duration_ms("0s"), None);
        assert_eq!(parse_duration_ms("-5m"), None);
        assert_eq!(parse_duration_ms("10x"), None);
        assert_eq!(parse_duration_ms("10"), None);
        assert_eq!(parse_duration_ms("1h30"), None);
    }

    #[test]
    fn keys_match_ts_dotted_suffixes() {
        assert_eq!(BOT_NAME_KEY, "BOT.botName");
        assert_eq!(BOT_PFP_KEY, "BOT.botPFP");
        assert_eq!(perm_key("ban"), "UTILS.PERMS.ban");
    }

    #[test]
    fn native_perm_gate_matches_discord_has_semantics() {
        use poise::serenity_prelude::Permissions as P;
        // ADMINISTRATOR implies everything (discord.js `has()`).
        assert!(has_native_perm(P::ADMINISTRATOR, P::MANAGE_GUILD));
        assert!(has_native_perm(P::ADMINISTRATOR, P::ADMINISTRATOR));
        assert!(has_native_perm(P::MANAGE_GUILD, P::MANAGE_GUILD));
        assert!(!has_native_perm(P::MANAGE_GUILD, P::ADMINISTRATOR));
        assert!(!has_native_perm(P::empty(), P::ADMINISTRATOR));
        assert!(!has_native_perm(P::CONNECT, P::SPEAK));
        assert!(has_native_perm(P::CONNECT | P::SPEAK, P::CONNECT));
    }

    #[tokio::test]
    async fn guild_config_roundtrips_through_guild_table() {
        let pool = memory_pool().await;
        assert_eq!(load_guild_config(&pool, "g1").await, serde_json::json!({}));
        let cfg = serde_json::json!({"joinmessage": "hi", "join": true});
        save_guild_config(&pool, "g1", &cfg).await.unwrap();
        assert_eq!(load_guild_config(&pool, "g1").await, cfg);
        // Other guilds are isolated.
        assert_eq!(load_guild_config(&pool, "g2").await, serde_json::json!({}));
    }

    #[tokio::test]
    async fn guild_table_routing_uses_table_scope_not_legacy_guild_scope() {
        let pool = memory_pool().await;
        let cfg = serde_json::json!({"join": true});
        save_guild_config(&pool, "g1", &cfg).await.unwrap();
        // Table-routed rows live under the `tbl:<guild>` scope with the
        // dotted root as key_name, never as a flat legacy (guild, key) row.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "GUILD.GUILD_CONFIG").await;
        assert_eq!(legacy, None);
        let routed: String = crate::db::kv_get(&pool, "tbl:g1", "GUILD").await.unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&routed).unwrap(),
            serde_json::json!({"GUILD_CONFIG": {"join": true}})
        );
    }

    #[tokio::test]
    async fn cmd_perms_object_and_legacy_number_forms() {
        let pool = memory_pool().await;
        let backend = guild_backend(&pool);
        backend
            .table("g1")
            .set(
                &perm_key("ban"),
                serde_json::json!({"level": 3, "users": ["u1"]}),
            )
            .await
            .unwrap();
        backend
            .table("g1")
            .set(&perm_key("kick"), serde_json::json!(2))
            .await
            .unwrap();
        let ban = load_cmd_perms(&pool, "g1", "ban").await.unwrap();
        assert_eq!(ban.level, Some(3));
        assert_eq!(ban.users, vec!["u1".to_string()]);
        let kick = load_cmd_perms(&pool, "g1", "kick").await.unwrap();
        assert_eq!(kick.level, Some(2));
        assert!(load_cmd_perms(&pool, "g1", "missing").await.is_none());
        assert!(load_cmd_perms(&pool, "g2", "ban").await.is_none());
    }

    #[test]
    fn prefix_name_lookup_matches_ts_prefix_names() {
        // Spot checks against the TS HybridCommands ground truth
        // (`prefixName` on top-level subcommand options).
        assert_eq!(prefix_name_for("ranks show"), Some("ranks-show"));
        assert_eq!(prefix_name_for("ranks config"), Some("rconfig"));
        assert_eq!(prefix_name_for("tts join"), Some("ttsjoin"));
        assert_eq!(prefix_name_for("economy balance-add"), Some("addmoney"));
        assert_eq!(prefix_name_for("utils banner user"), Some("banner-user"));
        assert_eq!(prefix_name_for("backup manage"), Some("backup-manager"));
        assert_eq!(prefix_name_for("tag wlroles-use"), Some("tag-wluse"));
        assert_eq!(prefix_name_for("ranks roles"), Some("ranks-roles"));
        assert_eq!(
            prefix_name_for("ranks ignore-channels"),
            Some("ranks-ignore-channels")
        );
        // No real top-level hybrid command defines prefixName.
        assert_eq!(prefix_name_for("ranks"), None);
        assert_eq!(prefix_name_for("setprefix"), None);
        // Old flat paths are gone (leaves live under their groups).
        assert_eq!(prefix_name_for("ranks role-add"), None);
        assert_eq!(prefix_name_for("ranks ignore-add"), None);
        // Nested economy groups mirror the TS SubcommandGroups
        // (`role` + `manage-rewards` in economy.ts); the leaves keep
        // their TS prefixNames.
        assert_eq!(prefix_name_for("economy role"), Some("ecrole"));
        assert_eq!(
            prefix_name_for("economy role add"),
            Some("economy-role-add")
        );
        assert_eq!(
            prefix_name_for("economy role delete"),
            Some("economy-role-delete")
        );
        assert_eq!(
            prefix_name_for("economy role list"),
            Some("economy-role-list")
        );
        // Old flat path is gone (leaves live under the `role` group).
        assert_eq!(prefix_name_for("economy role-add"), None);
        // Identity pairs (prefixName == slash name) need no entry.
        assert_eq!(prefix_name_for("util talk"), None);
        assert_eq!(prefix_name_for("economy shop"), None);
        assert_eq!(prefix_name_for("utils addrole"), None);
        // Unknown paths stay silent.
        assert_eq!(prefix_name_for("nope missing"), None);
        assert_eq!(prefix_name_for(""), None);
    }

    #[tokio::test]
    async fn setprefix_perms_fall_back_to_legacy_prefix_key() {
        let pool = memory_pool().await;
        let backend = guild_backend(&pool);
        // Stored under the old TS key (`UTILS.PERMS.prefix`), resolved
        // through the Rust rename (`setprefix`).
        backend
            .table("g1")
            .set(&perm_key("prefix"), serde_json::json!({"level": 4}))
            .await
            .unwrap();
        let got = load_cmd_perms(&pool, "g1", "setprefix").await.unwrap();
        assert_eq!(got.level, Some(4));
        // The primary key wins when both rows exist.
        backend
            .table("g1")
            .set(&perm_key("setprefix"), serde_json::json!({"level": 7}))
            .await
            .unwrap();
        let got = load_cmd_perms(&pool, "g1", "setprefix").await.unwrap();
        assert_eq!(got.level, Some(7));
        // Unrelated commands get no fallback.
        assert!(load_cmd_perms(&pool, "g1", "ban").await.is_none());
        assert_eq!(perm_fallback_key("setprefix"), Some("prefix"));
        assert_eq!(perm_fallback_key("ban"), None);
    }

    #[tokio::test]
    async fn all_cmd_perms_lists_sorted_subtree() {
        let pool = memory_pool().await;
        let backend = guild_backend(&pool);
        backend
            .table("g1")
            .set(&perm_key("ban"), serde_json::json!({"level": 3}))
            .await
            .unwrap();
        backend
            .table("g1")
            .set(&perm_key("kick"), serde_json::json!(1))
            .await
            .unwrap();
        let all = load_all_cmd_perms(&pool, "g1").await;
        let names: Vec<&str> = all.iter().map(|(n, _)| n.as_str()).collect();
        assert_eq!(names, vec!["ban", "kick"]);
        assert_eq!(all[1].1.level, Some(1));
        assert!(load_all_cmd_perms(&pool, "g2").await.is_empty());
    }

    #[test]
    fn footer_name_defaults_and_trims() {
        // W6 slice 45: TS `!botName` falls back only on "" (missing row
        // is None); whitespace/padded rows render verbatim, no trim.
        assert_eq!(bot_footer_name(None), "iHorizon");
        assert_eq!(bot_footer_name(Some("")), "iHorizon");
        assert_eq!(bot_footer_name(Some("  ")), "  ");
        assert_eq!(bot_footer_name(Some(" Bob ")), " Bob ");
        assert_eq!(bot_footer_name(Some("Bob")), "Bob");
    }

    #[test]
    fn footer_icon_rejects_non_base64() {
        assert_eq!(footer_icon_bytes(None), None);
        assert_eq!(footer_icon_bytes(Some("!!!not-base64!!!")), None);
        let bytes = vec![1u8, 2, 3, 4];
        let encoded = crate::emojis::base64_encode(&bytes);
        assert_eq!(footer_icon_bytes(Some(&encoded)), Some(bytes));
    }

    #[tokio::test]
    async fn footer_parts_pool_table_wins_over_legacy() {
        let pool = memory_pool().await;
        // Empty store falls back to the default name with no icon.
        assert_eq!(
            footer_parts_pool(&pool, "g0").await,
            ("iHorizon".to_string(), None)
        );
        // Legacy-only rows resolve (kv fallback leg).
        crate::db::kv_set(&pool, "g1", BOT_NAME_KEY, "LegacyName")
            .await
            .unwrap();
        let icon = crate::emojis::base64_encode(&[9u8, 8, 7]);
        crate::db::kv_set(&pool, "g1", BOT_PFP_KEY, &icon)
            .await
            .unwrap();
        assert_eq!(
            footer_parts_pool(&pool, "g1").await,
            ("LegacyName".to_string(), Some(vec![9u8, 8, 7]))
        );
        // Table rows win on conflict (cutover helper semantics).
        let backend = guild_backend(&pool);
        backend
            .table("g1")
            .set(BOT_NAME_KEY, serde_json::json!("TableName"))
            .await
            .unwrap();
        assert_eq!(
            footer_parts_pool(&pool, "g1").await.0,
            "TableName".to_string()
        );
        // Other guilds are isolated.
        assert_eq!(
            footer_parts_pool(&pool, "g2").await,
            ("iHorizon".to_string(), None)
        );
    }

    fn opt(name: &str, required: bool) -> HelpOptionDoc {
        HelpOptionDoc {
            name: name.to_string(),
            choices: None,
            required,
        }
    }

    #[test]
    fn option_display_name_prefers_choices() {
        let o = HelpOptionDoc {
            name: "mode".to_string(),
            choices: Some(vec!["a".to_string(), "b".to_string()]),
            required: true,
        };
        assert_eq!(o.display_name(), "a/b");
        assert_eq!(opt("target", false).display_name(), "target");
    }

    #[test]
    fn option_display_name_empty_choices_matches_ts() {
        // TS `if (o.choices)` is truthy on `[]`, so an explicitly empty
        // choices array renders `""` (join of nothing), not the name.
        let o = HelpOptionDoc {
            name: "x".to_string(),
            choices: Some(vec![]),
            required: true,
        };
        assert_eq!(o.display_name(), "");
        assert_eq!(stringify_options(&[o]), "[]");
    }

    #[test]
    fn stringify_options_brackets() {
        assert_eq!(stringify_options(&[]), "");
        assert_eq!(
            stringify_options(&[opt("user", true), opt("reason", false)]),
            "[user] <reason>"
        );
        let o = HelpOptionDoc {
            name: "x".to_string(),
            choices: Some(vec!["on".to_string(), "off".to_string()]),
            required: false,
        };
        assert_eq!(stringify_options(&[o]), "<on/off>");
    }

    #[test]
    fn bold_stringify_options_matches_ts() {
        // TS: required "**`[n]`**", optional "**`<n>`**", space-joined.
        assert_eq!(
            bold_stringify_options(&[opt("user", true), opt("reason", false)]),
            "**`[user]`** **`<reason>`**"
        );
    }

    #[test]
    fn capitalize_command_name_first_char_only() {
        assert_eq!(capitalize_command_name(""), "");
        assert_eq!(capitalize_command_name("ban"), "Ban");
        assert_eq!(capitalize_command_name("setLang"), "SetLang");
        // UTF-16-unit quirk (W6 slice 41, node ground truth): an astral
        // leader hits a lone surrogate in TS, so the name is unchanged.
        assert_eq!(capitalize_command_name("\u{10428}bc"), "\u{10428}bc");
        assert_eq!(capitalize_command_name("\u{1f600}abc"), "\u{1f600}abc");
        assert_eq!(capitalize_command_name("ßabc"), "SSabc");
        assert_eq!(capitalize_command_name("éclair"), "Éclair");
    }

    #[test]
    fn help_permission_text_cascade() {
        assert_eq!(help_permission_text("Manage Guild", None), "Manage Guild");
        assert_eq!(help_permission_text("", None), "");
        let level = crate::executor::CmdPerms {
            level: Some(3),
            ..Default::default()
        };
        assert_eq!(help_permission_text("Manage Guild", Some(&level)), "3");
        let roles = crate::executor::CmdPerms {
            roles: vec!["11".to_string(), "22".to_string()],
            ..Default::default()
        };
        assert_eq!(help_permission_text("3", Some(&roles)), "<@&11>, <@&22>");
        // TS appends user mentions onto the role string with no separator.
        let both = crate::executor::CmdPerms {
            roles: vec!["11".to_string()],
            users: vec!["99".to_string()],
            ..Default::default()
        };
        assert_eq!(help_permission_text("", Some(&both)), "<@&11><@99>");
        let zero = crate::executor::CmdPerms {
            level: Some(0),
            ..Default::default()
        };
        assert_eq!(help_permission_text("Base", Some(&zero)), "Base");
    }

    #[test]
    fn topgg_vote_url_shape() {
        assert_eq!(topgg_vote_url(123), "https://top.gg/bot/123/vote");
    }

    #[test]
    fn topgg_advertise_stub_is_false() {
        assert!(!should_advertise_the_topgg_vote_button("anyone"));
    }

    #[test]
    fn topgg_revotes_after_twelve_hours() {
        assert_eq!(TOPGG_REVOTE_MS, 12 * 60 * 60 * 1000);
        let now = 1_000_000_000_i64;
        assert!(should_advertise_topgg_vote(now, None, false));
        assert!(!should_advertise_topgg_vote(now, None, true));
        assert!(!should_advertise_topgg_vote(now, Some(now - 1_000), false));
        assert!(should_advertise_topgg_vote(
            now,
            Some(now - TOPGG_REVOTE_MS),
            false
        ));
        assert!(!should_advertise_topgg_vote(
            now,
            Some(now - TOPGG_REVOTE_MS),
            true
        ));
    }

    #[test]
    fn topgg_row_appends_or_seeds() {
        let seeded = add_topgg_button_to_components(vec![], 7, "Vote");
        assert_eq!(seeded.len(), 1);
        let row = CreateActionRow::Buttons(vec![CreateButton::new_link("https://x").label("y")]);
        let grown = add_topgg_button_to_components(vec![row], 7, "Vote");
        assert_eq!(grown.len(), 2);
    }
}
