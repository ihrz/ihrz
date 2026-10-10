// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/Mailer.ts (nodemailer -> lettre).

use lettre::message::{header::ContentType, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{Message, SmtpTransport, Transport};

/// SMTP settings. Mirrors the TS `MailerConfig` built in
/// `Mailer.init(useEnv=true)` from `SMTP_*` / `OWNER_MAIL` /
/// `EMAIL_WHEN_CHANGE_GUILD`.
#[derive(Debug, Clone, Default)]
pub struct MailerConfig {
    pub host: String,
    pub port: u16,
    pub secure: bool,
    pub user: String,
    pub pass: String,
    pub from_name: String,
    pub owner: String,
    pub notify_new_guild: bool,
}

impl MailerConfig {
    /// Build from the process env, like TS `init(true)`.
    /// Missing/invalid values leave the mailer unconfigured
    /// (mirrors the TS early return before `createTransport`).
    pub fn from_env(bot_name: &str) -> Self {
        Self {
            host: std::env::var("SMTP_HOST").unwrap_or_default(),
            port: std::env::var("SMTP_PORT")
                .ok()
                .and_then(|v| v.parse::<u16>().ok())
                .unwrap_or(0),
            secure: std::env::var("SMTP_SECURE")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),
            user: std::env::var("SMTP_USER").unwrap_or_default(),
            pass: std::env::var("SMTP_PASS").unwrap_or_default(),
            from_name: bot_name.to_string(),
            owner: std::env::var("OWNER_MAIL").unwrap_or_default(),
            notify_new_guild: std::env::var("EMAIL_WHEN_CHANGE_GUILD")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),
        }
    }

    /// Mirrors the TS guard before `createTransport`: user, pass,
    /// host, numeric port and owner must all be present.
    pub fn is_configured(&self) -> bool {
        !self.user.is_empty()
            && !self.pass.is_empty()
            && !self.host.is_empty()
            && self.port != 0
            && !self.owner.is_empty()
    }
}

/// Owner-mail signature, text + html legs. Mirrors `initSignature()`.
#[derive(Debug, Clone, Default)]
pub struct MailSignature {
    pub text: String,
    pub html: String,
}

/// Pure signature builder (mockable, no network).
pub fn build_signature(from_name: &str) -> MailSignature {
    MailSignature {
        text: format!("\r\n\r\n---\r\n{from_name}\r\niHorizon Discord Bot\r\nhttps://ihorizon.org"),
        html: format!(
            "<br><br>\
            <table style=\"font-family: Arial, sans-serif; color: #333; border-top: 2px solid #5865F2; padding-top: 15px; margin-top: 20px;\">\
            <tr><td style=\"padding-right: 15px;\">\
            <img src=\"https://www.ihorizon.org/assets/img/ihorizon.png\" alt=\"iHorizon\" width=\"50\" height=\"50\" style=\"border-radius: 8px;\">\
            </td><td>\
            <strong style=\"color: #5865F2; font-size: 16px;\">{from_name}</strong><br>\
            <span style=\"color: #666; font-size: 14px;\">iHorizon Discord Bot</span><br>\
            <a href=\"https://ihorizon.org\" style=\"color: #5865F2; text-decoration: none;\">ihorizon.org</a> | \
            <a href=\"https://discord.gg/ihorizon\" style=\"color: #5865F2; text-decoration: none;\">Discord</a>\
            </td></tr></table>"
        ),
    }
}

/// Normalize `\n` to `\r\n`. Mirrors the TS `send()` normalization.
pub fn normalize_newlines(text: &str) -> String {
    // Collapse any existing `\r\n` first so we never double up.
    text.replace("\r\n", "\n").replace('\n', "\r\n")
}

/// Ready-mail body. Mirrors the `Bot Is Ready` send in ready.ts.
pub fn ready_body(bot_tag: &str, date: &str, shard: &str) -> String {
    format!(
        "\n=== AUTO-GENERATED MESSAGE ===\n\niHorizon ({bot_tag}) is online\n\nsince {date}\n\non shard #{shard}\n\n=== AUTO-GENERATED MESSAGE ===\n"
    )
}

/// Join-mail body. Mirrors the `New Guild` send in guildCreate.ts:441.
#[allow(clippy::too_many_arguments)]
pub fn join_body(
    name: &str,
    id: u64,
    joined_at: &str,
    shard: &str,
    members: u64,
    invite: &str,
    vanity: &str,
    region: &str,
    owner: &str,
) -> String {
    format!(
        "\n=== AUTO-GENERATED MESSAGE ===\n\niHorizon have been added into {name} (ID: {id})\n\nsince {joined_at}\n\non shard #{shard}\n\nGuild Info:\n\n- Name: {name}\n- Id: {id}\n- Members: {members}\n- Invite Link: {invite}\n- Guild Vanity: {vanity}\n- Server Region: {region}\n- Server Owner: {owner}\n\n=== AUTO-GENERATED MESSAGE ===\n"
    )
}

/// Leave-mail body. Mirrors the `Removed Guild` send in removeGuildLog.ts:95.
pub fn leave_body(
    name: &str,
    id: u64,
    date: &str,
    shard: &str,
    members: u64,
    vanity: &str,
    region: &str,
) -> String {
    format!(
        "\n=== AUTO-GENERATED MESSAGE ===\n\niHorizon have been removed from {name} (ID: {id})\n\nsince {date}\n\non shard #{shard}\n\nGuild Info:\n\n- Name: {name}\n- Id: {id}\n- Members: {members}\n- Guild Vanity: {vanity}\n- Server Region: {region}\n\n=== AUTO-GENERATED MESSAGE ===\n"
    )
}

/// Ready send gate. Mirrors `client.email.connected && client.isMainShard()`.
pub fn should_send_ready(connected: bool, is_main_shard: bool) -> bool {
    connected && is_main_shard
}

/// Join/leave send gate. Mirrors
/// `client.email.connected && client.email.notifyNewGuild`.
pub fn should_send_guild_change(connected: bool, notify_new_guild: bool) -> bool {
    connected && notify_new_guild
}

/// SMTP mailer. Mirrors the TS `Mailer` class (nodemailer -> lettre
/// sync `SmtpTransport`; call from async code via `spawn_blocking`).
/// `from_name` + `signature` sit behind locks so ready() can refresh
/// the From display name from the live bot username (mirrors
/// `fromName: client.user?.username` in `Mailer.init`, which runs
/// after login) while sends keep taking `&self`.
pub struct Mailer {
    config: MailerConfig,
    transport: Option<SmtpTransport>,
    pub connected: bool,
    pub owner_mail: String,
    pub notify_new_guild: bool,
    from_name: std::sync::RwLock<String>,
    signature: std::sync::RwLock<MailSignature>,
}

impl Mailer {
    /// Build without connecting (transport created only when configured).
    pub fn new(config: MailerConfig) -> Self {
        let transport = if config.is_configured() {
            build_transport(&config).ok()
        } else {
            None
        };
        let signature = build_signature(&config.from_name);
        Self {
            owner_mail: config.owner.clone(),
            notify_new_guild: config.notify_new_guild,
            from_name: std::sync::RwLock::new(config.from_name.clone()),
            signature: std::sync::RwLock::new(signature),
            config,
            transport,
            connected: false,
        }
    }

    /// Boot path: build from env and verify the connection, mirroring
    /// `new Mailer()` + `init(true)` + `verifyConnection()` in core.ts.
    pub fn init_from_env(bot_name: &str) -> Self {
        let mut mailer = Self::new(MailerConfig::from_env(bot_name));
        mailer.verify_on_boot();
        mailer
    }

    /// Verify the SMTP connection on boot. Mirrors `verifyConnection()`:
    /// sets `connected` and logs the outcome.
    pub fn verify_on_boot(&mut self) -> bool {
        match &self.transport {
            Some(t) => match t.test_connection() {
                Ok(true) => {
                    self.connected = true;
                    tracing::info!("SMTP Connection success");
                    true
                }
                _ => {
                    self.connected = false;
                    tracing::error!("SMTP Connection Error: verify failed");
                    false
                }
            },
            None => {
                self.connected = false;
                false
            }
        }
    }

    /// Refresh the From display name from the live bot username.
    /// Mirrors `fromName: client.user?.username` in `Mailer.init`
    /// (ready.ts runs init after login, so the name is live there;
    /// the construction-time fallback stays until this runs). No-op on
    /// blank input or when unchanged, so per-shard ready() calls are
    /// cheap; the owner signature is rebuilt with the new name.
    pub fn set_from_name(&self, name: &str) {
        let name = name.trim();
        if name.is_empty() {
            return;
        }
        let mut guard = self.from_name.write().unwrap_or_else(|e| e.into_inner());
        if *guard == name {
            return;
        }
        *guard = name.to_string();
        *self.signature.write().unwrap_or_else(|e| e.into_inner()) = build_signature(name);
    }

    /// Current From display name (live username after ready(), else the
    /// construction-time fallback).
    // Named `from_name` to match the TS `fromName` mailer field and its
    // call sites (`send()`, ready leg); renaming would churn callers for
    // no behavior gain, so the `from_*` self-convention lint is allowed.
    #[allow(clippy::wrong_self_convention)]
    pub fn from_name(&self) -> String {
        self.from_name
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    /// Send a mail with the owner signature appended (both legs).
    /// Mirrors `Mailer.send()`; returns false when disconnected.
    /// Blocking: call via `tokio::task::spawn_blocking`.
    pub fn send(&self, to: &str, subject: &str, text: &str, with_signature: bool) -> bool {
        let transport = match &self.transport {
            Some(t) if self.connected => t,
            _ => return false,
        };
        let normalized = normalize_newlines(text);
        let signature = self
            .signature
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone();
        let from_name = self.from_name();
        let final_text = if with_signature {
            format!("{}{}", normalized, signature.text)
        } else {
            normalized.clone()
        };
        let final_html = if with_signature {
            format!("{}{}", normalized.replace("\r\n", "<br>"), signature.html)
        } else {
            normalized.replace("\r\n", "<br>")
        };
        let from_addr = format!("\"{from_name}\" <{}>", self.config.user);
        let email = match Message::builder()
            .from(from_addr.parse().unwrap_or_else(|_| {
                format!("\"{}\" <{}>", "iHorizon", self.config.user)
                    .parse()
                    .expect("fallback from address parses")
            }))
            .to(to.parse().unwrap_or_else(|_| {
                self.owner_mail
                    .parse()
                    .expect("owner mail parses when configured")
            }))
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(final_text),
                    )
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(final_html),
                    ),
            ) {
            Ok(m) => m,
            Err(e) => {
                tracing::error!("Email build error: {e}");
                return false;
            }
        };
        match transport.send(&email) {
            Ok(_) => {
                tracing::info!("Email sent: {subject} -> {to}");
                true
            }
            Err(e) => {
                tracing::error!("Email Sending Error: {e}");
                false
            }
        }
    }

    /// Ready notification. Gate mirrors ready.ts (`connected && main shard`).
    pub fn send_ready(&self, bot_tag: &str, date: &str, shard: &str, is_main_shard: bool) -> bool {
        if !should_send_ready(self.connected, is_main_shard) {
            return false;
        }
        self.send(
            &self.owner_mail.clone(),
            "Bot Is Ready",
            &ready_body(bot_tag, date, shard),
            true,
        )
    }

    /// Join notification. Gate mirrors guildCreate.ts:441.
    #[allow(clippy::too_many_arguments)]
    pub fn send_join(
        &self,
        name: &str,
        id: u64,
        joined_at: &str,
        shard: &str,
        members: u64,
        invite: &str,
        vanity: &str,
        region: &str,
        owner: &str,
    ) -> bool {
        if !should_send_guild_change(self.connected, self.notify_new_guild) {
            return false;
        }
        self.send(
            &self.owner_mail.clone(),
            "New Guild",
            &join_body(
                name, id, joined_at, shard, members, invite, vanity, region, owner,
            ),
            true,
        )
    }

    /// Leave notification. Gate mirrors removeGuildLog.ts:95.
    #[allow(clippy::too_many_arguments)]
    pub fn send_leave(
        &self,
        name: &str,
        id: u64,
        date: &str,
        shard: &str,
        members: u64,
        vanity: &str,
        region: &str,
    ) -> bool {
        if !should_send_guild_change(self.connected, self.notify_new_guild) {
            return false;
        }
        self.send(
            &self.owner_mail.clone(),
            "Removed Guild",
            &leave_body(name, id, date, shard, members, vanity, region),
            true,
        )
    }
}

fn build_transport(config: &MailerConfig) -> anyhow::Result<SmtpTransport> {
    let creds = Credentials::new(config.user.clone(), config.pass.clone());
    if config.secure {
        // Implicit TLS (nodemailer `secure: true`), rustls like the rest
        // of the crate (serenity/reqwest already use rustls_backend).
        let tls = TlsParameters::new(config.host.clone())?;
        Ok(SmtpTransport::builder_dangerous(&config.host)
            .port(config.port)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build())
    } else {
        // STARTTLS upgrade (nodemailer `secure: false`).
        Ok(SmtpTransport::relay(&config.host)?
            .port(config.port)
            .credentials(creds)
            .build())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn configured() -> MailerConfig {
        MailerConfig {
            host: "smtp.example.com".to_string(),
            port: 587,
            secure: false,
            user: "bot@example.com".to_string(),
            pass: "secret".to_string(),
            from_name: "iHorizon".to_string(),
            owner: "owner@example.com".to_string(),
            notify_new_guild: true,
        }
    }

    #[test]
    fn configured_guard_mirrors_ts_early_return() {
        assert!(configured().is_configured());
        let mut c = configured();
        c.user.clear();
        assert!(!c.is_configured());
        let mut c = configured();
        c.pass.clear();
        assert!(!c.is_configured());
        let mut c = configured();
        c.host.clear();
        assert!(!c.is_configured());
        let mut c = configured();
        c.port = 0;
        assert!(!c.is_configured());
        let mut c = configured();
        c.owner.clear();
        assert!(!c.is_configured());
    }

    #[test]
    fn signature_carries_name_and_brand() {
        let sig = build_signature("iHorizon");
        assert!(sig.text.contains("iHorizon"));
        assert!(sig.text.contains("https://ihorizon.org"));
        assert!(sig.html.contains("iHorizon"));
        assert!(sig
            .html
            .contains("https://www.ihorizon.org/assets/img/ihorizon.png"));
        assert!(sig.html.contains("https://discord.gg/ihorizon"));
    }

    #[test]
    fn normalize_newlines_collapses_then_crlf() {
        assert_eq!(normalize_newlines("a\nb"), "a\r\nb");
        assert_eq!(normalize_newlines("a\r\nb"), "a\r\nb");
        assert_eq!(normalize_newlines("a"), "a");
    }

    #[test]
    fn bodies_mirror_ts_markers() {
        let ready = ready_body("iHorizon#1234", "somedate", "0");
        assert!(ready.contains("=== AUTO-GENERATED MESSAGE ==="));
        assert!(ready.contains("iHorizon (iHorizon#1234) is online"));
        assert!(ready.contains("on shard #0"));

        let join = join_body("G", 1, "t", "0", 10, "inv", "None", "en-US", "O");
        assert!(join.contains("have been added into G (ID: 1)"));
        assert!(join.contains("- Invite Link: inv"));

        let leave = leave_body("G", 1, "t", "0", 10, "None", "en-US");
        assert!(leave.contains("have been removed from G (ID: 1)"));
        assert!(!leave.contains("Invite Link"));
    }

    #[test]
    fn gates_mirror_ts_conditions() {
        assert!(should_send_ready(true, true));
        assert!(!should_send_ready(true, false));
        assert!(!should_send_ready(false, true));
        assert!(should_send_guild_change(true, true));
        assert!(!should_send_guild_change(true, false));
        assert!(!should_send_guild_change(false, true));
    }

    #[test]
    fn unconfigured_mailer_never_sends() {
        let mailer = Mailer::new(MailerConfig::default());
        assert!(!mailer.connected);
        assert!(!mailer.send("a@b.c", "s", "t", true));
        assert!(!mailer.send_ready("tag", "d", "0", true));
        assert!(!mailer.send_join("G", 1, "t", "0", 1, "i", "v", "r", "o"));
        assert!(!mailer.send_leave("G", 1, "t", "0", 1, "v", "r"));
    }

    #[test]
    fn notify_off_blocks_guild_mails_only() {
        // Offline: transport exists (built, not connected) but the gates
        // short-circuit before any network use.
        let mut cfg = configured();
        cfg.notify_new_guild = false;
        let mailer = Mailer::new(cfg);
        assert!(!mailer.send_join("G", 1, "t", "0", 1, "i", "v", "r", "o"));
        assert!(!mailer.send_leave("G", 1, "t", "0", 1, "v", "r"));
    }

    #[test]
    fn env_parses_booleans_like_ts() {
        // from_env with no vars set: unconfigured, notify off.
        for v in [
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_SECURE",
            "SMTP_USER",
            "SMTP_PASS",
            "OWNER_MAIL",
            "EMAIL_WHEN_CHANGE_GUILD",
        ] {
            std::env::remove_var(v);
        }
        let c = MailerConfig::from_env("iHorizon");
        assert!(!c.is_configured());
        assert!(!c.notify_new_guild);
        assert_eq!(c.from_name, "iHorizon");
    }

    #[test]
    fn from_name_refreshes_from_live_username() {
        // Mirrors fromName: client.user?.username at init-after-login.
        let mailer = Mailer::new(configured());
        assert_eq!(mailer.from_name(), "iHorizon");
        mailer.set_from_name("  ");
        assert_eq!(mailer.from_name(), "iHorizon");
        mailer.set_from_name("iHorizonLive");
        assert_eq!(mailer.from_name(), "iHorizonLive");
        // Idempotent: per-shard ready() calls are cheap no-ops.
        mailer.set_from_name("iHorizonLive");
        assert_eq!(mailer.from_name(), "iHorizonLive");
    }
}
