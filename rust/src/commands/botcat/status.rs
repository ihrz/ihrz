use super::*;

/// Linux clock ticks per second (user HZ is 100 on Linux).
const CLK_TCK: f64 = 100.0;

/// Bot process start as a unix epoch. Combines `/proc/stat` boot time
/// with the `/proc/self/stat` starttime field (22nd, index 19 after
/// the comm field), like `process.uptime()` in status.ts.
fn parse_proc_start_epoch(stat: &str, proc_stat: &str, hz: f64) -> Option<u64> {
    let end = stat.rfind(')')?;
    let after: Vec<&str> = stat[end + 1..].split_whitespace().collect();
    let starttime: f64 = after.get(19)?.parse().ok()?;
    let btime: f64 = proc_stat
        .lines()
        .find(|l| l.starts_with("btime "))?
        .split_whitespace()
        .nth(1)?
        .parse()
        .ok()?;
    Some((btime + starttime / hz) as u64)
}

fn proc_start_epoch_secs() -> Option<u64> {
    let stat = std::fs::read_to_string("/proc/self/stat").ok()?;
    let proc_stat = std::fs::read_to_string("/proc/stat").ok()?;
    parse_proc_start_epoch(&stat, &proc_stat, CLK_TCK)
}

/// Seconds since the bot process started (`None` off-Linux).
pub fn process_uptime_secs() -> Option<u64> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    now.checked_sub(proc_start_epoch_secs()?)
}

/// `Bot Uptime` field value. Mirrors the `process.uptime()` block.
pub fn process_uptime() -> String {
    process_uptime_secs()
        .map(uptime_str)
        .unwrap_or_else(|| "0s".to_string())
}

/// `PRETTY_NAME=` from `/etc/os-release` content.
fn parse_os_pretty(content: &str) -> Option<String> {
    content
        .lines()
        .find(|l| l.starts_with("PRETTY_NAME="))
        .map(|l| {
            l.trim_start_matches("PRETTY_NAME=")
                .trim_matches('"')
                .trim()
                .to_string()
        })
        .filter(|s| !s.is_empty())
}

/// Kernel release (`os.release()` in status.ts).
fn kernel_release() -> String {
    let release = std::fs::read_to_string("/proc/sys/kernel/osrelease")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    if release.is_empty() {
        std::env::consts::ARCH.to_string()
    } else {
        release
    }
}

/// `OS` field value. Mirrors `${name} ${platform} ${release}`.
pub fn os_info_value() -> String {
    let pretty = std::fs::read_to_string("/etc/os-release")
        .ok()
        .and_then(|c| parse_os_pretty(&c))
        .unwrap_or_else(|| std::env::consts::OS.to_string());
    format!("{pretty} {} {}", std::env::consts::OS, kernel_release())
}

/// Discord timestamp. Mirrors `time(date, "d")` in status.ts
/// (`<t:epoch:d>`, short date).
pub fn discord_ts(epoch_secs: u64) -> String {
    format!("<t:{epoch_secs}:d>")
}

/// Machine boot time as a unix epoch. Mirrors
/// `new Date(Date.now() - os.uptime() * 1000)` in status.ts
/// (`None` off-Linux / unreadable uptime).
pub fn machine_boot_epoch() -> Option<u64> {
    let secs: u64 = std::fs::read_to_string("/proc/uptime")
        .ok()?
        .split_whitespace()
        .next()?
        .parse::<f64>()
        .ok()? as u64;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    now.checked_sub(secs)
}

/// `Machine Uptime` field value. Mirrors the `os.uptime()` block
/// (Discord timestamp of the boot date, like `time(..., "d")`).
pub fn machine_uptime_ts() -> String {
    machine_boot_epoch()
        .map(discord_ts)
        .unwrap_or_else(machine_uptime)
}

/// `Bot Uptime` field value. Mirrors the `process.uptime()` block
/// (Discord timestamp of the process start date).
pub fn bot_uptime_ts() -> String {
    proc_start_epoch_secs()
        .map(discord_ts)
        .unwrap_or_else(process_uptime)
}

fn git_cmd(args: &[&str]) -> Option<String> {
    let out = std::process::Command::new("git").args(args).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8(out.stdout).ok()?.trim().to_string();
    (!s.is_empty()).then_some(s)
}

/// Mirrors `parseGitRemote` in version.ts (`git@host:` -> https, strip .git).
fn parse_git_remote(remote: &str) -> String {
    let remote = remote.trim();
    let remote = match remote.split_once('@') {
        Some((_, rest)) => match rest.split_once(':') {
            Some((host, path)) => format!("https://{host}/{path}"),
            None => rest.to_string(),
        },
        None => remote.to_string(),
    };
    remote.strip_suffix(".git").unwrap_or(&remote).to_string()
}

fn git_info() -> &'static (Option<String>, Option<String>) {
    static CACHE: std::sync::OnceLock<(Option<String>, Option<String>)> =
        std::sync::OnceLock::new();
    CACHE.get_or_init(|| {
        let branch = git_cmd(&["branch", "--show-current"]);
        let hash = git_cmd(&["rev-parse", "HEAD"]);
        let remote = git_cmd(&["remote", "get-url", "origin"]).map(|r| parse_git_remote(&r));
        let url = match (&remote, &hash) {
            (Some(remote), Some(hash)) => Some(format!("{remote}/commit/{hash}")),
            _ => None,
        };
        let short = hash.as_ref().map(|h| h.chars().take(7).collect::<String>());
        let label = match (&branch, &short) {
            (Some(branch), Some(short)) => Some(format!("{branch}:{short}")),
            _ => short,
        };
        (label, url)
    })
}

/// `Bot Version` label. Mirrors `ClientVersion`
/// (`{version} ({branch}:{short}) discord.js@{djs}`, serenity here).
pub fn bot_version_label() -> String {
    let version = env!("CARGO_PKG_VERSION");
    match &git_info().0 {
        Some(build) => format!("{version} ({build}) serenity@{}", botinfo::SERENITY_VERSION),
        None => format!("{version} serenity@{}", botinfo::SERENITY_VERSION),
    }
}

/// Commit URL for the `Bot Version` field (`git_commit_url` in version.ts).
pub fn bot_commit_url() -> Option<String> {
    git_info().1.clone()
}

/// Rust toolchain version. Bun-version equivalent for the Rust port
/// (`${Bun.version}` in status.ts); `None` when no toolchain is around.
pub fn rustc_version() -> Option<String> {
    static CACHE: std::sync::OnceLock<Option<String>> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let out = std::process::Command::new("rustc")
                .arg("--version")
                .output()
                .ok()?;
            if !out.status.success() {
                return None;
            }
            let s = String::from_utf8(out.stdout).ok()?.trim().to_string();
            (!s.is_empty()).then_some(s)
        })
        .clone()
}

/// Status embed. Mirrors bot status.ts (CPU/memory/uptimes/OS/versions).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "status",
    aliases("server")
)]
pub async fn status(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Guard's Typing: status.ts returns silently outside a guild
    // (needs the guild icon for the thumbnail + footer).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let mem = crate::funcs::system_memory_kb();
    // TS bot status.ts reports used as MemTotal - MemAvailable; fall
    // back to MemFree on kernels without MemAvailable (pre-3.14).
    let avail = if mem.available > 0 {
        mem.available
    } else {
        mem.free
    };
    let version_value = match bot_commit_url() {
        Some(url) => format!("[{}]({url})", bot_version_label()),
        None => bot_version_label(),
    };
    // Emoji field names mirror status.ts (`${emojis} OS`,
    // `${Logo} Bot Version`, `${Bun} Bun Version`); the toolchain row
    // reports rustc (documented port mapping on rustc_version()).
    let http = &ctx.serenity_context().http;
    let os_name = super::os_emoji_name();
    let os_emoji = match os_name {
        Some(name) => crate::emojis::app_emoji_markup(http, name).await,
        None => None,
    };
    let logo = crate::emojis::app_emoji_markup(http, "Logo").await;
    let bun = crate::emojis::app_emoji_markup(http, "Bun").await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x82CDA8)
        .field(
            "Cpu",
            format!("{} ({})", cpu_model(), std::env::consts::ARCH),
            false,
        )
        .field(
            "Memory",
            format!(
                "{}/{}",
                crate::funcs::nice_bytes((mem.total - avail.min(mem.total)) as f64),
                crate::funcs::nice_bytes(mem.total as f64)
            ),
            false,
        )
        .field("Machine Uptime", machine_uptime_ts(), false)
        .field("Bot Uptime", bot_uptime_ts(), false)
        .field(
            super::prefixed_field_name(os_emoji.as_deref(), "OS"),
            os_info_value(),
            false,
        )
        .field(
            super::prefixed_field_name(logo.as_deref(), "Bot Version"),
            version_value,
            false,
        );
    if let Some(rustc) = rustc_version() {
        embed = embed.field(
            super::prefixed_field_name(bun.as_deref(), "Rust Version"),
            rustc,
            false,
        );
    }
    if let Some(icon) = ctx.guild().and_then(|g| g.icon_url()) {
        embed = embed.thumbnail(icon);
    }
    let (footer_name, footer_bytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    embed = crate::commands::shared::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn proc_start_epoch_parses_starttime_after_comm() {
        // pid (comm with spaces) state ppid ... starttime=100 at index 19.
        let mut fields = vec!["R", "1"];
        fields.extend(std::iter::repeat_n("0", 17));
        fields.push("100");
        fields.extend(["0", "0"]);
        let stat = format!("1234 (my comm) {}", fields.join(" "));
        let proc_stat = "cpu 0\nbtime 1700000000\n";
        assert_eq!(
            parse_proc_start_epoch(&stat, proc_stat, 100.0),
            Some(1700000001)
        );
    }

    #[test]
    fn proc_start_epoch_rejects_garbage() {
        assert_eq!(parse_proc_start_epoch("", "", 100.0), None);
        assert_eq!(parse_proc_start_epoch("1 (a) R", "no btime\n", 100.0), None);
    }

    #[test]
    fn os_pretty_parses_quoted_name() {
        let content = "NAME=\"Ubuntu\"\nPRETTY_NAME=\"Ubuntu 24.04 LTS\"\n";
        assert_eq!(
            parse_os_pretty(content).as_deref(),
            Some("Ubuntu 24.04 LTS")
        );
        assert_eq!(parse_os_pretty("NAME=x\n"), None);
    }

    #[test]
    fn git_remote_parses_like_ts() {
        assert_eq!(
            parse_git_remote("git@gitlab.com:ihrz/ihrz.git"),
            "https://gitlab.com/ihrz/ihrz"
        );
        assert_eq!(
            parse_git_remote("https://gitlab.com/ihrz/ihrz.git"),
            "https://gitlab.com/ihrz/ihrz"
        );
    }

    #[test]
    fn version_label_starts_with_cargo_version() {
        assert!(bot_version_label().starts_with(env!("CARGO_PKG_VERSION")));
    }

    #[test]
    fn runtime_probes_never_panic() {
        let _ = process_uptime();
        let _ = os_info_value();
        let _ = rustc_version();
        let _ = bot_commit_url();
    }

    #[test]
    fn discord_ts_mirrors_discord_js_time_d() {
        assert_eq!(discord_ts(1700000000), "<t:1700000000:d>");
        assert_eq!(discord_ts(0), "<t:0:d>");
    }

    #[test]
    fn uptime_ts_values_are_discord_timestamps() {
        for value in [machine_uptime_ts(), bot_uptime_ts()] {
            assert!(
                value.starts_with("<t:") && value.ends_with(":d>"),
                "should be a Discord timestamp, got {value:?}"
            );
        }
    }

    #[test]
    fn machine_boot_epoch_never_in_future() {
        if let Some(boot) = machine_boot_epoch() {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            assert!(boot <= now);
        }
    }
}
