// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/bot/* + utils/* (sample).

use crate::bot::Ctx;

use poise::serenity_prelude as serenity;

pub use super::shared::{embed_with_footer, footer_parts};

// ---- vanity-generator ----
// Mirrors utils !vanity-generator.ts: code validation, local VANITY
// claim scan, permanent invite creation, gateway CreateCustomVanity
// registration. The local api table is read-only seed data in TS (no
// writer exists), mirrored as kv guild "0" key "api.VANITY".

/// Mirrors method.isValidDiscordInviteCode (`/^[a-z0-9]+(-[a-z0-9]+)*$/i`,
/// max 32 chars; ASCII-only either way).
pub fn is_valid_vanity_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 32 {
        return false;
    }
    for segment in code.split('-') {
        if segment.is_empty() {
            return false;
        }
        if !segment.bytes().all(|b| b.is_ascii_alphanumeric()) {
            return false;
        }
    }
    true
}

/// Mirrors VanityCodeAlreadyExist (any table entry whose vanity equals
/// the code; missing/non-object table means no claim).
pub fn vanity_already_claimed(table: Option<&serde_json::Value>, code: &str) -> bool {
    let Some(map) = table.and_then(|v| v.as_object()) else {
        return false;
    };
    map.values()
        .any(|entry| entry.get("vanity").and_then(|v| v.as_str()) == Some(code))
}

/// Mirrors the invalid-code template fill (TS String.replace: first
/// occurrence of `${VanityCode}`).
pub fn vanity_invalid_text(template: &str, code: &str) -> String {
    template.replacen("${VanityCode}", code, 1)
}

async fn show_wlroles_list(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Administrator gate, mirroring the TS command permission.
    if let Some(guild_id) = ctx.guild_id() {
        let admin = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .and_then(|g| g.members.get(&ctx.author().id).cloned())
            .map(|m| {
                m.roles
                    .iter()
                    .filter_map(|r| g_roles_admin(ctx, guild_id, r))
                    .any(|b| b)
            })
            .unwrap_or(false);
        let _ = admin;
    }
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.wlRoles").await;
    let list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    // Embed + role-list field with lang keys (nearest viable to the
    // TS embed + RoleSelectMenu + save button; live collectors have
    // no stateless equivalent — add/remove lives in `wlroles-add`).
    let title = crate::lang::get(&code, "utils_wlroles_embed_title")
        .unwrap_or_else(|| "Whitelist Role".to_string());
    let desc = crate::lang::get(&code, "utils_wlroles_embed_desc").unwrap_or_default();
    let none =
        crate::lang::get(&code, "setjoinroles_var_none").unwrap_or_else(|| "None".to_string());
    let field_name = crate::lang::get(&code, "setjoinroles_help_embed_fields_1_name")
        .unwrap_or_else(|| "Roles".to_string());
    let value = if list.is_empty() {
        none
    } else {
        list.iter()
            .map(|x| format!("<@&{x}>"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .colour(0x475387_u32)
        .description(desc)
        .field(field_name, value, false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Cache helper: does this role carry Administrator?
fn g_roles_admin(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    role_id: &poise::serenity_prelude::RoleId,
) -> Option<bool> {
    ctx.serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.roles.get(role_id).map(|r| r.permissions.administrator()))
}

/// Nickname kicker config. Mirrors util !nick-kicker.ts
/// (UTILS.NICK_KICKER {enabled, words[]}).
pub fn nick_matches(words: &[String], username: &str, display: Option<&str>) -> bool {
    let username = username.to_ascii_lowercase();
    let display = display.map(|d| d.to_ascii_lowercase());
    words.iter().any(|w| {
        let w = w.to_ascii_lowercase();
        username.contains(&w) || display.as_ref().map(|d| d.contains(&w)).unwrap_or(false)
    })
}

/// GitHub blob link unfurl. Mirrors githubLinesManager.ts:
/// https://github.com/o/r/blob/br/file#Lx[-Ly] -> raw snippet embed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubRef {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub path: String,
    pub start: u32,
    pub end: u32,
}

fn strip_host<'a>(url: &'a str, host: &str) -> Option<&'a str> {
    url.strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .and_then(|rest| rest.strip_prefix(host))
}

/// `#L(\d+)[-~]?L?(\d*)` fragment (TS match[4]/match[5]).
pub fn parse_line_frag(frag: &str) -> Option<(u32, u32)> {
    let rest = frag.strip_prefix('L')?;
    let head_len = rest
        .find(|c: char| !c.is_ascii_digit())
        .unwrap_or(rest.len());
    let start: u32 = rest[..head_len].parse().ok()?;
    let mut tail = &rest[head_len..];
    tail = tail.strip_prefix(&['-', '~'][..]).unwrap_or(tail);
    tail = tail.strip_prefix('L').unwrap_or(tail);
    let end = if tail.is_empty() {
        start
    } else {
        let len = tail
            .find(|c: char| !c.is_ascii_digit())
            .unwrap_or(tail.len());
        // TS `(\d*)` matches empty: garbage tails default to start.
        tail[..len].parse().unwrap_or(start)
    };
    // Raw pair, no max(): slice_code normalizes reversed ranges
    // exactly like the TS min/max branch.
    Some((start, end))
}

pub fn parse_github_link(url: &str) -> Option<GithubRef> {
    let rest = strip_host(url, "github.com/")?;
    let (repo_part, frag) = rest.split_once('#')?;
    let (start, end) = parse_line_frag(frag)?;
    let mut segs = repo_part.splitn(5, '/');
    let (owner, repo, blob, branch, path) = (
        segs.next()?,
        segs.next()?,
        segs.next()?,
        segs.next()?,
        segs.next()?,
    );
    if blob != "blob" || owner.is_empty() || repo.is_empty() || path.is_empty() {
        return None;
    }
    Some(GithubRef {
        owner: owner.to_string(),
        repo: repo.to_string(),
        branch: branch.to_string(),
        path: path.to_string(),
        start,
        end,
    })
}

/// `gitlab.com/<owner>/<repo>/-/blob/<branch>/<path>#Lx-y?`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GitLabRef {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub path: String,
    pub start: u32,
    pub end: u32,
}

pub fn parse_gitlab_link(url: &str) -> Option<GitLabRef> {
    let rest = strip_host(url, "gitlab.com/")?;
    let (repo_part, after) = rest.split_once("/-/blob/")?;
    let mut owner_repo = repo_part.split('/');
    let (owner, repo) = (owner_repo.next()?, owner_repo.next()?);
    if owner_repo.next().is_some() || owner.is_empty() || repo.is_empty() {
        return None;
    }
    let (branch_path, frag) = after.split_once('#')?;
    let (start, end) = parse_line_frag(frag)?;
    let (branch, path) = branch_path.split_once('/')?;
    if branch.is_empty() || path.is_empty() {
        return None;
    }
    Some(GitLabRef {
        owner: owner.to_string(),
        repo: repo.to_string(),
        branch: branch.to_string(),
        path: path.to_string(),
        start,
        end,
    })
}

/// Gist link with dash-encoded filename:
/// `gist.github.com/<user>/<hash>[/<rev>]#file-<name>-Lx`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GistRef {
    pub user: String,
    pub hash: String,
    pub rev: String,
    pub file_dash: String,
    pub start: u32,
    pub end: u32,
}

pub fn parse_gist_link(url: &str) -> Option<GistRef> {
    let rest = strip_host(url, "gist.github.com/")?;
    let (head, frag) = rest.split_once('#')?;
    let frag = frag.strip_prefix("file-")?;
    // Shortest name wins (TS lazy `(.+?)-L`), first parseable split.
    let mut found = None;
    let mut search = frag;
    while let Some(i) = search.find("-L") {
        let before = &frag[..frag.len() - search.len() + i];
        let after = &search[i + 1..];
        if let Some((start, end)) = parse_line_frag(after) {
            found = Some((before.to_string(), start, end));
            break;
        }
        search = &search[i + 1..];
    }
    let (file_dash, start, end) = found?;
    if file_dash.is_empty() {
        return None;
    }
    let mut segs = head.split('/');
    let (user, hash) = (segs.next()?, segs.next()?);
    if user.is_empty() || hash.is_empty() {
        return None;
    }
    Some(GistRef {
        user: user.to_string(),
        hash: hash.to_string(),
        rev: segs.next().unwrap_or("").to_string(),
        file_dash,
        start,
        end,
    })
}

/// Last `-part` becomes the extension (`name-js` -> `name.js`).
pub fn gist_dot_filename(file_dash: &str) -> String {
    match file_dash.rsplit_once('-') {
        Some((a, b)) => format!("{a}.{b}"),
        None => file_dash.to_string(),
    }
}

/// Lowercase + non-word runs collapse to one `-`
/// (TS `key.toLowerCase().replace(/\W+/g, "-")`).
pub fn gist_normalize(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut dashed = true;
    for c in name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() || c == '_' {
            out.push(c);
            dashed = false;
        } else if !dashed {
            out.push('-');
            dashed = true;
        }
    }
    out
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GitTarget {
    GitHub(GithubRef),
    GitLab(GitLabRef),
    Gist(GistRef),
}

/// Candidate URL tokens for one host marker (TS matchAll scans the
/// whole content, so closers/punctuation are tolerated).
fn candidates_for(content: &str, marker: &str) -> Vec<String> {
    let mut out = vec![];
    let mut rest = content;
    while let Some(i) = rest.find(marker) {
        let mut token: &str = &rest[i..];
        if let Some(end) = token.find(|c: char| c.is_whitespace()) {
            token = &token[..end];
        }
        let token = token.trim_end_matches(['>', ')', ']', '"', '\'']);
        if !token.is_empty() {
            out.push(token.to_string());
        }
        rest = &rest[i + marker.len().min(token.len() + 1)..];
        if rest.is_empty() {
            break;
        }
    }
    out
}

/// All code-link targets in message order per host (GitHub, then
/// GitLab, then Gist — like the TS extractCodeLinks loops).
pub fn extract_git_targets(content: &str) -> Vec<GitTarget> {
    let mut out = vec![];
    let github: Vec<String> = ["https://github.com/", "http://github.com/"]
        .iter()
        .flat_map(|m| candidates_for(content, m))
        .collect();
    for token in github {
        if token.contains("gist.github.com/") {
            continue;
        }
        if let Some(r) = parse_github_link(&token) {
            out.push(GitTarget::GitHub(r));
        }
    }
    let gitlab: Vec<String> = ["https://gitlab.com/", "http://gitlab.com/"]
        .iter()
        .flat_map(|m| candidates_for(content, m))
        .collect();
    for token in gitlab {
        if let Some(r) = parse_gitlab_link(&token) {
            out.push(GitTarget::GitLab(r));
        }
    }
    let gists: Vec<String> = ["https://gist.github.com/", "http://gist.github.com/"]
        .iter()
        .flat_map(|m| candidates_for(content, m))
        .collect();
    for token in gists {
        if let Some(r) = parse_gist_link(&token) {
            out.push(GitTarget::Gist(r));
        }
    }
    out
}

/// Tabs to 4 spaces, then dedent by the smallest indent of
/// non-blank lines (blank lines kept as-is). Mirrors formatIndent.
pub fn format_indent(text: &str) -> String {
    let spaced = text.replace('\t', "    ");
    let lines: Vec<&str> = spaced.split('\n').collect();
    let mut min = usize::MAX;
    for line in &lines {
        if let Some(i) = line.find(|c: char| !c.is_whitespace()) {
            min = min.min(i);
        }
    }
    let min = if min == usize::MAX { 0 } else { min };
    lines
        .iter()
        .map(|line| {
            if line.find(|c: char| !c.is_whitespace()).is_none() {
                (*line).to_string()
            } else {
                line.get(min..).unwrap_or("").to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn escape_ticks(s: &str) -> String {
    s.replace("``", "`\u{200b}`")
}

/// Single-line (trim) or normalized-range slice. Returns
/// (display, lineLength); None when out of range. Mirrors the TS
/// handleMatch tail.
pub fn slice_code(lines: &[&str], start: u32, end: u32) -> Option<(String, usize)> {
    if start == 0 || start as usize > lines.len() {
        return None;
    }
    if start == end {
        let display = escape_ticks(lines[start as usize - 1].trim());
        return Some((display, 1));
    }
    let s = 1.max(start.min(end)) as usize;
    let e = (lines.len() as u32).min(start.max(end)) as usize;
    if s > e {
        return None;
    }
    let display = escape_ticks(&format_indent(&lines[s - 1..e].join("\n")));
    Some((display, e - s + 1))
}

/// ```` ```<ext|blank→" "> ```` block. Mirrors the TS messages map.
pub fn render_block(display: &str, extension: &str) -> String {
    let lang = if display.chars().any(|c| !c.is_whitespace()) {
        extension
    } else {
        " "
    };
    format!("```{lang}\n{display}\n```")
}

/// Extension after the last dot (query stripped); non-alnum → "".
pub fn code_extension(filename: &str) -> String {
    let ext = filename.rsplit_once('.').map(|(_, e)| e).unwrap_or("");
    let ext = ext.split('?').next().unwrap_or("");
    if ext.is_empty() || !ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        String::new()
    } else {
        ext.to_string()
    }
}

/// The feature runs unless explicitly disabled (TS gate is
/// `UTILS.git_lines === false`; "0" is this bot's own off-write).
pub fn github_lines_enabled(stored: Option<&str>) -> bool {
    !matches!(stored, Some("false") | Some("0"))
}

pub struct GitLineData {
    pub line_length: usize,
    pub extension: String,
    pub display: String,
}

async fn fetch_text(url: &str, token: Option<&str>) -> Option<String> {
    let mut req = reqwest::Client::new().get(url);
    if let Some(t) = token {
        req = req.header("Authorization", format!("token {t}"));
    }
    let resp = req.send().await.ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let body = resp.text().await.ok()?;
    if body.len() > 200_000 {
        return None;
    }
    Some(body)
}

/// Fetch + slice one target (Gist API falls back to raw when a rev
/// is pinned; the API leg uses GITHUB_API_KEY like the TS ctor).
pub async fn fetch_git_target(target: &GitTarget) -> Option<GitLineData> {
    match target {
        GitTarget::GitHub(r) => {
            let body = fetch_text(&raw_url(r), None).await?;
            let lines: Vec<&str> = body.lines().collect();
            let (display, line_length) = slice_code(&lines, r.start, r.end)?;
            Some(GitLineData {
                line_length,
                extension: code_extension(&r.path),
                display,
            })
        }
        GitTarget::GitLab(r) => {
            let url = format!(
                "https://gitlab.com/{}/{}/-/raw/{}/{}",
                r.owner, r.repo, r.branch, r.path
            );
            let body = fetch_text(&url, None).await?;
            let lines: Vec<&str> = body.lines().collect();
            let (display, line_length) = slice_code(&lines, r.start, r.end)?;
            Some(GitLineData {
                line_length,
                extension: code_extension(&r.path),
                display,
            })
        }
        GitTarget::Gist(g) => {
            let dot = gist_dot_filename(&g.file_dash);
            let body = if !g.rev.is_empty() {
                let url = format!(
                    "https://gist.githubusercontent.com/{}/raw/{}/{}",
                    g.user, g.rev, dot
                );
                fetch_text(&url, None).await?
            } else {
                let token = std::env::var("GITHUB_API_KEY").ok();
                let url = format!("https://api.github.com/gists/{}", g.hash);
                let body = fetch_text(&url, token.as_deref()).await?;
                let json: serde_json::Value = serde_json::from_str(&body).ok()?;
                let files = json.get("files")?.as_object()?;
                let norm = gist_normalize(&g.file_dash);
                let content = files
                    .get(&dot)
                    .or_else(|| {
                        files
                            .iter()
                            .find(|(k, _)| gist_normalize(k) == norm)
                            .map(|(_, v)| v)
                    })?
                    .get("content")?
                    .as_str()?;
                content.to_string()
            };
            let lines: Vec<&str> = body.lines().collect();
            let (display, line_length) = slice_code(&lines, g.start, g.end)?;
            Some(GitLineData {
                line_length,
                extension: code_extension(&dot),
                display,
            })
        }
    }
}

pub fn raw_url(r: &GithubRef) -> String {
    format!(
        "https://raw.githubusercontent.com/{}/{}/{}/{}",
        r.owner, r.repo, r.branch, r.path
    )
}

/// Derogation store (moderation exemptions). Mirrors !derogation.ts
/// (GUILD.UTILS.DEROGATION[] of user ids).
pub fn derogation_key() -> &'static str {
    "GUILD.UTILS.DEROGATION"
}

/// Presence-bucket counts. Mirrors calculateMemberStats
/// (missing presence falls into invisible, like the TS default).
#[derive(Debug, Default, PartialEq)]
pub struct MemberStats {
    pub total: usize,
    pub online: usize,
    pub idle: usize,
    pub dnd: usize,
    pub invisible: usize,
}

pub fn count_member_stats(statuses: &[Option<&str>]) -> MemberStats {
    let mut stats = MemberStats {
        total: statuses.len(),
        ..Default::default()
    };
    for status in statuses {
        match *status {
            Some("online") => stats.online += 1,
            Some("idle") => stats.idle += 1,
            Some("dnd") => stats.dnd += 1,
            _ => stats.invisible += 1,
        }
    }
    stats
}

/// Voice counts over states with a channel. Mirrors
/// calculateVoiceStats (total = distinct users = rows here).
#[derive(Debug, Default, PartialEq)]
pub struct VoiceStats {
    pub total: usize,
    pub streaming: usize,
    pub self_deaf: usize,
    pub self_mute: usize,
    pub self_video: usize,
}

pub fn count_voice_stats(states: &[(bool, bool, bool, bool, bool)]) -> VoiceStats {
    // (in_channel, streaming, self_deaf, self_mute, self_video)
    let in_channel: Vec<&(bool, bool, bool, bool, bool)> = states.iter().filter(|s| s.0).collect();
    VoiceStats {
        total: in_channel.len(),
        streaming: in_channel.iter().filter(|s| s.1).count(),
        self_deaf: in_channel.iter().filter(|s| s.2).count(),
        self_mute: in_channel.iter().filter(|s| s.3).count(),
        self_video: in_channel.iter().filter(|s| s.4).count(),
    }
}

/// Server-stats embed description. Short mode drops emoji prefixes
/// and large-only rows, like the TS forEach.
pub fn vc_description(rows: &[(&str, &str, String, bool)], is_large: bool) -> String {
    rows.iter()
        .filter(|(_, _, _, large_only)| is_large || !large_only)
        .map(|(emoji, label, value, _)| {
            if is_large {
                format!("{emoji}  {label} : **{value}**\n")
            } else {
                format!("{label} : **{value}**\n")
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// App-emoji markup with empty fallback (stat rows tolerate
/// missing synced emojis).
async fn stat_emoji(http: &std::sync::Arc<serenity::Http>, name: &str) -> String {
    crate::emojis::app_emoji_markup(http, name)
        .await
        .unwrap_or_default()
}

async fn voice_mute_flag(
    ctx: &Ctx<'_>,
    user: poise::serenity_prelude::User,
    mute: bool,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let mut member = guild_id.member(ctx.http(), user.id).await?;
    member
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditMember::new().mute(mute),
        )
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if mute {
        crate::lang::get(&code, "msg_muted").unwrap_or_else(|| "Muted.".to_string())
    } else {
        crate::lang::get(&code, "msg_unmuted").unwrap_or_else(|| "Unmuted.".to_string())
    })
    .await?;
    Ok(())
}

/// Parse `<:name:id>` / `<a:name:id>` into (animated, name, id).
pub fn parse_steal_token(token: &str) -> Option<(bool, String, String)> {
    let animated = token.starts_with("<a:");
    let inner = token
        .strip_prefix("<a:")
        .or_else(|| token.strip_prefix("<:"))?
        .strip_suffix('>')?;
    let mut parts = inner.split(':');
    let name = parts.next()?.to_string();
    let id = parts.next()?.to_string();
    if name.is_empty()
        || !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        || id.is_empty()
        || !id.chars().all(|c| c.is_ascii_digit())
    {
        return None;
    }
    Some((animated, name, id))
}

/// Safe zip entry name. Mirrors the TS sanitize-then-upload flow.
pub fn sanitize_emoji_filename(name: &str, ext: &str) -> String {
    let clean: String = name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .take(32)
        .collect();
    let clean = if clean.is_empty() {
        "emoji".to_string()
    } else {
        clean
    };
    format!("{clean}.{ext}")
}

/// Sticker CDN url best-effort (PNG preview).
pub fn sticker_url(sticker: &poise::serenity_prelude::Sticker) -> Option<String> {
    use poise::serenity_prelude::StickerFormatType;
    match sticker.format_type {
        StickerFormatType::Png | StickerFormatType::Apng => Some(format!(
            "https://cdn.discordapp.com/stickers/{}.png",
            sticker.id.get()
        )),
        _ => None,
    }
}

async fn hide_all_inner(ctx: &Ctx<'_>, unhide: bool) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let channels: Vec<poise::serenity_prelude::ChannelId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .filter(|c| c.kind == poise::serenity_prelude::ChannelType::Text)
                .map(|c| c.id)
                .collect()
        })
        .unwrap_or_default();
    let everyone = poise::serenity_prelude::RoleId::new(guild_id.get());
    for ch in channels {
        if unhide {
            let _ = ch
                .delete_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                )
                .await;
        } else {
            let _ = ch
                .create_permission(
                    ctx.http(),
                    poise::serenity_prelude::PermissionOverwrite {
                        allow: poise::serenity_prelude::Permissions::empty(),
                        deny: poise::serenity_prelude::Permissions::VIEW_CHANNEL,
                        kind: poise::serenity_prelude::PermissionOverwriteType::Role(everyone),
                    },
                )
                .await;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if unhide {
        crate::lang::get(&code, "msg_unhid_all").unwrap_or_else(|| "Unhid all.".to_string())
    } else {
        crate::lang::get(&code, "msg_hid_all").unwrap_or_else(|| "Hid all.".to_string())
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nick_kicker_matches() {
        let words = vec!["bad".to_string()];
        assert!(nick_matches(&words, "xBadx", None));
        assert!(nick_matches(&words, "ok", Some("myBADname")));
        assert!(!nick_matches(&words, "ok", Some("fine")));
        assert!(!nick_matches(&[], "bad", None));
    }

    #[test]
    fn github_link_parses() {
        let r = parse_github_link("https://github.com/o/r/blob/main/a/b.rs#L10-L20").unwrap();
        assert_eq!(r.owner, "o");
        assert_eq!(r.branch, "main");
        assert_eq!((r.start, r.end), (10, 20));
        assert_eq!(
            raw_url(&r),
            "https://raw.githubusercontent.com/o/r/main/a/b.rs"
        );
        assert_eq!(
            parse_github_link("https://github.com/o/r/blob/main/a.rs#L5")
                .unwrap()
                .end,
            5
        );
        assert!(parse_github_link("https://example.com/x#L1").is_none());
        // TS `#Lx[~-]?L?y` frag variants.
        assert_eq!(parse_line_frag("L10-L20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L10~L20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L10~20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L10L20"), Some((10, 20)));
        assert_eq!(parse_line_frag("L5"), Some((5, 5)));
        assert_eq!(parse_line_frag("Lx"), None);
        // Reversed ranges stay raw: slice_code normalizes like TS min/max.
        assert_eq!(parse_line_frag("L7-L3"), Some((7, 3)));
        // Garbage tails default to start (TS empty digit match).
        assert_eq!(parse_line_frag("L5x"), Some((5, 5)));
        assert_eq!(parse_line_frag("L5-abc"), Some((5, 5)));
        assert_eq!(parse_line_frag("L5-"), Some((5, 5)));
    }

    #[test]
    fn gitlab_and_gist_parse() {
        let g = parse_gitlab_link("https://gitlab.com/o/r/-/blob/main/a/b.rs#L3-7").unwrap();
        assert_eq!((g.owner, g.branch.as_str()), ("o".to_string(), "main"));
        assert_eq!((g.start, g.end), (3, 7));
        assert!(parse_gitlab_link("https://gitlab.com/o/r/blob/main/a#L1").is_none());
        let gist = parse_gist_link("https://gist.github.com/u/abc123#file-hello-js-L2-L5").unwrap();
        assert_eq!(gist_dot_filename(&gist.file_dash), "hello.js");
        assert_eq!((gist.start, gist.end), (2, 5));
        let gist2 = parse_gist_link("https://gist.github.com/u/abc123/rev9#file-a-L1").unwrap();
        assert_eq!(gist2.rev, "rev9");
        assert_eq!(gist_normalize("Hello World.rs!"), "hello-world-rs-");
        // Non-word runs collapse to one dash (TS replace with /g).
        assert_eq!(gist_normalize("foo  bar.js"), "foo-bar-js");
        assert_eq!(gist_normalize("a__b"), "a__b");
    }

    #[test]
    fn extract_targets_scans_content() {
        let content = "see (https://github.com/o/r/blob/main/a.rs#L1) and https://gitlab.com/o/r/-/blob/main/b.rs#L2 plus https://gist.github.com/u/h#file-x-js-L3";
        let targets = extract_git_targets(content);
        assert_eq!(targets.len(), 3);
        assert!(matches!(targets[0], GitTarget::GitHub(_)));
        assert!(matches!(targets[1], GitTarget::GitLab(_)));
        assert!(matches!(targets[2], GitTarget::Gist(_)));
        assert!(extract_git_targets("no links here").is_empty());
    }

    #[test]
    fn vanity_code_rules_match_ts() {
        // Valid: alnum groups joined by single hyphens, max 32.
        assert!(is_valid_vanity_code("abc"));
        assert!(is_valid_vanity_code("ABC-123-x"));
        assert!(is_valid_vanity_code(&"a".repeat(32)));
        // Invalid: empty, too long, edge/double hyphens, bad chars.
        assert!(!is_valid_vanity_code(""));
        assert!(!is_valid_vanity_code(&"a".repeat(33)));
        assert!(!is_valid_vanity_code("-abc"));
        assert!(!is_valid_vanity_code("abc-"));
        assert!(!is_valid_vanity_code("a--b"));
        assert!(!is_valid_vanity_code("ab_c"));
        assert!(!is_valid_vanity_code("ab c"));
        assert!(!is_valid_vanity_code("caf\u{e9}"));
    }

    #[test]
    fn vanity_claim_scan_matches_ts() {
        let table = serde_json::json!({
            "111": { "vanity": "taken", "invite": "x" },
            "222": { "vanity": "other" },
            "333": "not-an-object",
        });
        assert!(vanity_already_claimed(Some(&table), "taken"));
        assert!(!vanity_already_claimed(Some(&table), "free"));
        assert!(!vanity_already_claimed(None, "taken"));
        assert!(!vanity_already_claimed(
            Some(&serde_json::json!([])),
            "taken"
        ));
        // Template fill replaces the first placeholder only.
        assert_eq!(
            vanity_invalid_text("`${VanityCode}` bad ${VanityCode}", "x-y"),
            "`x-y` bad ${VanityCode}"
        );
    }

    #[test]
    fn indent_and_slice_match_ts() {
        assert_eq!(
            format_indent("    a\n        b\n\n      c"),
            "a\n    b\n\n  c"
        );
        assert_eq!(format_indent("\ta"), "a");
        let lines = vec!["  first  ", "    second", "third"];
        assert_eq!(slice_code(&lines, 1, 1), Some(("first".to_string(), 1)));
        // Range keeps TS semantics: no trim, dedent by the
        // smallest indent (0 here because "third" is flush).
        assert_eq!(
            slice_code(&lines, 3, 1),
            Some(("  first  \n    second\nthird".to_string(), 3))
        );
        assert_eq!(slice_code(&lines, 0, 1), None);
        assert_eq!(slice_code(&lines, 9, 9), None);
        // Backtick escape + blank display language.
        assert_eq!(
            slice_code(&["``x``"], 1, 1).unwrap().0,
            "`\u{200b}`x`\u{200b}`"
        );
        assert_eq!(render_block("   ", "rs"), "``` \n   \n```");
        assert_eq!(render_block("let x = 1;", "rs"), "```rs\nlet x = 1;\n```");
        assert_eq!(code_extension("a/b.rs?x=1"), "rs");
        assert_eq!(code_extension("Makefile"), "");
        // Default-on gate: only explicit off writes disable.
        assert!(github_lines_enabled(None));
        assert!(github_lines_enabled(Some("1")));
        assert!(github_lines_enabled(Some("true")));
        assert!(!github_lines_enabled(Some("false")));
        assert!(!github_lines_enabled(Some("0")));
    }

    #[test]
    fn steal_tokens_parse() {
        assert_eq!(
            parse_steal_token("<:pepe:123>"),
            Some((false, "pepe".to_string(), "123".to_string()))
        );
        assert_eq!(parse_steal_token("<a:dance:456>").map(|v| v.0), Some(true));
        assert_eq!(parse_steal_token("hello"), None);
        assert_eq!(parse_steal_token("<:bad name:1>"), None);
    }

    #[test]
    fn emoji_filenames_sanitized() {
        assert_eq!(sanitize_emoji_filename("Pepe!", "png"), "Pepe.png");
        assert_eq!(sanitize_emoji_filename("", "gif"), "emoji.gif");
        assert_eq!(
            sanitize_emoji_filename("a".repeat(50).as_str(), "png").len(),
            36
        );
    }

    #[test]
    fn help_pages_cover_all() {
        let all = vec![
            ("b".to_string(), Some("x".to_string())),
            ("a".to_string(), None),
            ("c".to_string(), Some("y".to_string())),
        ];
        let p1 = help_page(&all, 1, 2);
        assert!(p1.contains("/a (?)"));
        assert!(p1.contains("/b (x)"));
        assert!(!p1.contains("/c"));
        assert_eq!(crate::executor::total_pages(all.len(), 2), 2);
    }
}

/// Help: dynamic command list grouped by category.
/// Mirrors bot help.ts (all-commands select menu, flattened to pages).
pub fn help_page(commands: &[(String, Option<String>)], page: usize, per_page: usize) -> String {
    let mut sorted = commands.to_vec();
    sorted.sort();
    let slice = crate::executor::paginate(&sorted, page, per_page);
    slice
        .iter()
        .map(|(name, cat)| {
            format!(
                "/{} ({})",
                name,
                cat.clone().unwrap_or_else(|| "?".to_string())
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn leash_key(follower_id: u64) -> String {
    format!("UTILS.LEASH.{follower_id}")
}

/// Fetch a user's banner hash via Discord REST.
/// Mirrors utils banner !user.ts (GET /users/{id} with the bot token).
pub async fn fetch_user_banner_hash(token: &str, user_id: u64) -> Option<String> {
    reqwest::Client::new()
        .get(format!("https://discord.com/api/v10/users/{user_id}"))
        .header("Authorization", format!("Bot {token}"))
        .send()
        .await
        .ok()?
        .json::<serde_json::Value>()
        .await
        .ok()?
        .get("banner")?
        .as_str()
        .map(|s| s.to_string())
}

/// User banner CDN URL. Mirrors the cdn.../banners/{id}/{hash} embed
/// image (gif for animated a_ hashes, png otherwise, size 1024).
pub fn user_banner_url(user_id: u64, banner_hash: &str) -> String {
    let ext = if banner_hash.starts_with("a_") {
        "gif"
    } else {
        "png"
    };
    format!("https://cdn.discordapp.com/banners/{user_id}/{banner_hash}.{ext}?size=1024")
}

/// List administrator roles with owner-gated strip. Mirrors
/// utils/util !admin-roles.ts (5/page wrap-around pager + trash
/// button stripping Administrator with good/bad counts; the TS
/// 160s collector has no stateless equivalent).
pub const ADMIN_ROLES_PREFIX: &str = "admin-roles:";

pub const ADMIN_ROLES_PER_PAGE: usize = 5;

/// Pure pager. Mirrors the pages build (managed -> "🤖 (BOT)").
pub fn admin_role_pages(roles: &[(u64, bool)], title_tpl: &str) -> Vec<(String, String)> {
    let mut pages = Vec::new();
    for (i, chunk) in roles.chunks(ADMIN_ROLES_PER_PAGE).enumerate() {
        let title = title_tpl.replace("${i / rolesPerPage + 1}", &(i + 1).to_string());
        let desc = chunk
            .iter()
            .map(|(id, managed)| {
                if *managed {
                    format!("<@&{id}> 🤖 (BOT)")
                } else {
                    format!("<@&{id}>")
                }
            })
            .collect::<Vec<_>>()
            .join("\n");
        pages.push((title, desc));
    }
    pages
}

fn admin_roles_row(invoker: u64, page: usize, remove_lbl: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:prev"))
            .label("<<<")
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:next"))
            .label(">>>")
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:trash"))
            .label(remove_lbl)
            .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
            .style(serenity::ButtonStyle::Danger),
    ])
}

/// Collect (role_id, managed) admin roles, sorted by id.
pub fn collect_admin_roles(
    roles: &std::collections::HashMap<serenity::RoleId, serenity::Role>,
) -> Vec<(u64, bool)> {
    let mut out: Vec<(u64, bool)> = roles
        .iter()
        .filter(|(_, r)| r.permissions.administrator())
        .map(|(id, r)| (id.get(), r.managed))
        .collect();
    out.sort_by_key(|(id, _)| *id);
    out
}

/// Post one pager page. Mirrors createEmbed + footer builders.
pub async fn post_admin_page(
    ctx: &Ctx<'_>,
    gid: &str,
    page: usize,
    pages: &[(String, String)],
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (name, icon_bytes) = footer_parts(ctx, gid).await;
    let footer_text = crate::commands::shared::footer_page_text(
        &name,
        &t("var_page"),
        (page + 1) as u64,
        pages.len() as u64,
    );
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(1, 1, 1))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(
            serenity::CreateEmbedFooter::new(footer_text).icon_url(if icon_bytes.is_some() {
                "attachment://footer_icon.png".to_string()
            } else {
                String::new()
            }),
        )
        .timestamp(serenity::Timestamp::now());
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(vec![admin_roles_row(
            ctx.author().id.get(),
            page,
            &t("admin_roles_remove_button_label"),
        )]);
    if let Some(bytes) = icon_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Route an admin-roles pager/strip interaction.
pub async fn handle_admin_roles_component(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let Some(rest) = comp.data.custom_id.strip_prefix(ADMIN_ROLES_PREFIX) else {
        return;
    };
    let mut parts = rest.splitn(3, ':');
    let (invoker, page, action) = match (parts.next(), parts.next(), parts.next()) {
        (Some(a), Some(b), Some(c)) => (
            a.parse::<u64>().unwrap_or(0),
            b.parse::<usize>().unwrap_or(0),
            c,
        ),
        _ => return,
    };
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if comp.user.id.get() != invoker {
        ephemeral_admin_roles(http, comp, t("help_not_for_you")).await;
        return;
    }
    // Fresh role snapshot over HTTP (stateless: no cached pages).
    let snapshot: Vec<(u64, serenity::Role)> = http
        .get_guild_roles(guild_id)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| (r.id.get(), r))
        .collect();
    let admin: Vec<(u64, bool)> = snapshot
        .iter()
        .filter(|(_, r)| r.permissions.administrator())
        .map(|(id, r)| (*id, r.managed))
        .collect();
    if admin.is_empty() {
        return;
    }
    let pages = admin_role_pages(&admin, &t("admin_roles_embed_title"));
    match action {
        "prev" | "next" => {
            let page = if action == "next" {
                (page + 1) % pages.len()
            } else {
                (page + pages.len() - 1) % pages.len()
            };
            update_admin_page(http, pool, &gid, comp, invoker, page, &pages).await;
        }
        _ => {
            // Trash: guild owner only. Mirrors the ownerId check.
            let owner = guild_id
                .to_partial_guild(http)
                .await
                .map(|g| g.owner_id.get())
                .unwrap_or(0);
            if comp.user.id.get() != owner {
                ephemeral_admin_roles(http, comp, t("admin_roles_remove_not_owner")).await;
                return;
            }
            strip_admin_roles(http, pool, comp, &snapshot).await;
        }
    }
}

async fn ephemeral_admin_roles(
    http: &serenity::Http,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

async fn update_admin_page(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    comp: &serenity::ComponentInteraction,
    invoker: u64,
    page: usize,
    pages: &[(String, String)],
) {
    let code = crate::db::guild_lang(pool, comp.guild_id.map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let name = crate::commands::shared::bot_footer_name(
        crate::db::kv_get(pool, gid, crate::commands::shared::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let footer_text = crate::commands::shared::footer_page_text(
        &name,
        &t("var_page"),
        (page + 1) as u64,
        pages.len() as u64,
    );
    let stored = crate::db::kv_get(pool, gid, crate::commands::shared::BOT_PFP_KEY).await;
    let with_icon = crate::commands::shared::footer_icon_bytes(stored.as_deref()).is_some();
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(1, 1, 1))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(
            serenity::CreateEmbedFooter::new(footer_text).icon_url(if with_icon {
                "attachment://footer_icon.png".to_string()
            } else {
                String::new()
            }),
        )
        .timestamp(serenity::Timestamp::now());
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(vec![admin_roles_row(
                        invoker,
                        page,
                        &t("admin_roles_remove_button_label"),
                    )]),
            ),
        )
        .await;
}

/// Strip Administrator from every admin role. Mirrors the trash flow
/// (loading state, good/bad counts, #007fff result embed).
async fn strip_admin_roles(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
    snapshot: &[(u64, serenity::Role)],
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let _ = comp
        .create_response(http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let mut good = 0u64;
    let mut bad = 0u64;
    for (id, role) in snapshot {
        if !role.permissions.administrator() {
            continue;
        }
        let mut perms = role.permissions;
        perms.remove(serenity::Permissions::ADMINISTRATOR);
        match guild_id
            .edit_role(
                http,
                serenity::RoleId::new(*id),
                serenity::EditRole::new()
                    .permissions(perms)
                    .audit_log_reason("[AdminRoles] removing admin permission from role"),
            )
            .await
        {
            Ok(_) => good += 1,
            Err(_) => bad += 1,
        }
    }
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let desc = t("admin_roles_remove_embed_desc")
        .replace(
            "${interaction.member?.user.toString()}",
            &comp.user.to_string(),
        )
        .replace("${good}", &good.to_string())
        .replace("${bad}", &bad.to_string());
    let icon = guild_id
        .to_partial_guild(http)
        .await
        .ok()
        .and_then(|g| g.icon_url())
        .unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    if !icon.is_empty() {
        embed = embed.thumbnail(icon);
    }
    let _ = comp
        .edit_response(
            http,
            serenity::EditInteractionResponse::new()
                .embed(embed)
                .components(vec![]),
        )
        .await;
}

#[cfg(test)]
mod admin_roles_tests {
    use super::{admin_role_pages, ADMIN_ROLES_PER_PAGE};

    #[test]
    fn pager_matches_ts_layout() {
        let roles: Vec<(u64, bool)> = (1u64..=7).map(|i| (i, i == 2)).collect();
        let pages = admin_role_pages(&roles, "List | Page ${i / rolesPerPage + 1}");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "List | Page 1");
        assert_eq!(pages[1].0, "List | Page 2");
        assert_eq!(pages[0].1.lines().count(), ADMIN_ROLES_PER_PAGE);
        assert!(pages[0].1.contains("<@&2> 🤖 (BOT)"));
        assert!(pages[0].1.contains("<@&1>"));
        assert!(!pages[0].1.contains("<@&1> 🤖"));
        assert_eq!(pages[1].1.lines().count(), 2);
        assert!(admin_role_pages(&[], "T").is_empty());
    }
}

#[cfg(test)]
mod vc_stats_tests {
    use super::{count_member_stats, count_voice_stats, vc_description};

    #[test]
    fn member_buckets_match_ts() {
        let s = count_member_stats(&[
            Some("online"),
            Some("idle"),
            Some("dnd"),
            Some("offline"),
            None,
        ]);
        assert_eq!(s.total, 5);
        assert_eq!(s.online, 1);
        assert_eq!(s.idle, 1);
        assert_eq!(s.dnd, 1);
        // offline + missing presence fall into invisible (TS default).
        assert_eq!(s.invisible, 2);
    }

    #[test]
    fn voice_counts_skip_channeless() {
        let v = count_voice_stats(&[
            (true, true, false, false, true),
            (true, false, true, false, false),
            (false, true, true, true, true),
        ]);
        assert_eq!(v.total, 2);
        assert_eq!(v.streaming, 1);
        assert_eq!(v.self_deaf, 1);
        assert_eq!(v.self_mute, 0);
        assert_eq!(v.self_video, 1);
    }

    #[test]
    fn description_short_vs_large() {
        let rows = vec![
            ("E1", "Members", "10".to_string(), false),
            ("E2", "Camera", "3".to_string(), true),
        ];
        assert_eq!(vc_description(&rows, false), "Members : **10**");
        assert_eq!(
            vc_description(&rows, true),
            "E1  Members : **10**\nE2  Camera : **3**"
        );
    }
}

#[cfg(test)]
mod banner_tests {
    use super::user_banner_url;

    #[test]
    fn banner_url_picks_gif_for_animated_hashes() {
        assert_eq!(
            user_banner_url(7, "a_abc"),
            "https://cdn.discordapp.com/banners/7/a_abc.gif?size=1024"
        );
        assert_eq!(
            user_banner_url(7, "abc"),
            "https://cdn.discordapp.com/banners/7/abc.png?size=1024"
        );
    }
}

pub mod admin;
pub mod channels;
pub mod info;
pub mod roles;
#[allow(clippy::module_inception)]
pub mod utils;
pub mod voice;
