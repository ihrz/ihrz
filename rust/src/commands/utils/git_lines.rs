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

/// `#L(\\d+)[-~]?L?(\\d*)` fragment (TS match[4]/match[5]).
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
        // TS `(\\d*)` matches empty: garbage tails default to start.
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
/// (TS `key.toLowerCase().replace(/\\W+/g, "-")`).
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
/// `UTILS.git_lines === false`: only boolean `false` skips).
/// Legacy boolean rows render through `table_string`, so TS-era
/// `false` arrives as `"false"` and stays disabled here.
/// DELTAS (manual-DB rows only, both writers emit just bool / "1" /
/// "0"): a string `"0"` or `"false"` row reads ENABLED in TS
/// (`!== false`) but disabled here (`"0"` is this bot's own
/// off-write, so narrowing to boolean-false would re-enable
/// Rust-disabled guilds); a numeric `0` row reads ENABLED in TS
/// but renders `"0"` (disabled) here.
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

#[cfg(test)]
mod tests {
    use super::*;

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
    fn github_lines_event_gate_matches_ts_strict_false_legs() {
        // Battery `slice-w7s4-gitlines.js`: TS `get(...) === false`
        // skips on boolean false ONLY (12/12 legs).
        // `table_string` renders legacy TS rows, so the convergent
        // legs read: bool false -> "false" (disabled, both sides),
        // everything else enabled on both sides.
        assert!(github_lines_enabled(None)); // missing key: enabled
        assert!(github_lines_enabled(Some("true"))); // bool true row
        assert!(github_lines_enabled(Some("1"))); // Rust on-write
        assert!(!github_lines_enabled(Some("false"))); // bool false row
        assert!(github_lines_enabled(Some(""))); // empty string row
                                                 // Promo upsell gate `!has(key) && floor(rand*8)===0`: the
                                                 // `stored.is_none()` half is this None leg; the dice half is
                                                 // distribution-equal (battery 0.1252 vs u8%8==0 exactly 1/8).
                                                 // Promo fill is single-occurrence (battery token_count=1),
                                                 // so Rust `.replace` == TS first-only `.replace`.
                                                 // Threshold legs (handleMessage verbatim): `totalLines > 50`
                                                 // and `botMsg.length >= 2000` map to `total > 50` and
                                                 // `joined.len() >= 2000` at the event site. DELTA (doc-noted
                                                 // on the callers): Rust counts bytes, TS counts UTF-16 units
                                                 // (battery: 660 e-acutes read 669 vs 1329) -- identical for
                                                 // ASCII snippets, bytes trip sooner on non-ASCII.
    }
}
