// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/core.ts main() init + src/core/modules/releaseNotifier.ts.

pub mod release {
    /// Mirrors writeVersionFile(): compares Cargo version against v.txt so
    /// shard 0 can run checkAndNotifyRelease() once per release.
    pub fn write_version_file(version: &str) -> anyhow::Result<()> {
        write_version_file_to(version, &repo_root())
    }

    pub fn write_version_file_to(version: &str, root: &std::path::Path) -> anyhow::Result<()> {
        let v = root.join("v.txt");
        let v_old = root.join("v.old.txt");
        let current = std::fs::read_to_string(&v).unwrap_or_default();
        if current.trim() != version.trim() {
            if !current.trim().is_empty() {
                let _ = std::fs::write(&v_old, current);
            }
            std::fs::write(&v, version)?;
            tracing::info!("version bumped to {version}");
        }
        Ok(())
    }

    fn repo_root() -> std::path::PathBuf {
        let mut p = std::env::current_dir().unwrap_or_else(|_| ".".into());
        if p.ends_with("rust") {
            p.pop();
        }
        p
    }

    /// One-shot release gate. Mirrors checkAndNotifyRelease() claim-before-send:
    /// returns the version to announce when v.txt advanced past v.old.txt,
    /// rotating v.old.txt forward so shard 0 announces exactly once.
    pub fn consume_release_note(root: &std::path::Path) -> Option<String> {
        let v = root.join("v.txt");
        let v_old = root.join("v.old.txt");
        let current = std::fs::read_to_string(&v).unwrap_or_default();
        let current = current.trim();
        if current.is_empty() {
            return None;
        }
        let previous = std::fs::read_to_string(&v_old).unwrap_or_default();
        if previous.trim() == current {
            return None;
        }
        let _ = std::fs::write(&v_old, current);
        Some(current.to_string())
    }

    /// Distributed-lock + claim state for one owner-DM fan-out run.
    /// Pure state machine (no Discord I/O): the async driver in
    /// check_and_notify_release() persists each transition to the
    /// bot-scope kv store, but all guard decisions live here so they
    /// are unit-testable. Mirrors checkAndNotifyRelease() in
    /// src/core/modules/releaseNotifier.ts.
    use std::collections::{HashMap, HashSet};

    // Pacing + anti-spam guards. Exact TS values from releaseNotifier.ts:
    // never burst, never double-send, abort on rate-limit.
    pub const DM_STAGGER_MS: u64 = 10_000;
    pub const DM_BATCH_SIZE: usize = 1;
    pub const DM_BATCH_DELAY_MS: u64 = 15_000;
    pub const LOCK_TTL_MS: i64 = 5 * 60 * 1000;
    pub const LOCK_HEARTBEAT_MS: u64 = 60_000;
    pub const MAX_CONSECUTIVE_TRANSIENT_ERRORS: u32 = 5;
    pub const TRANSIENT_BACKOFF_MS: u64 = 60_000;

    /// Bot-scope kv guild. Mirrors metasTable (db.table("metas")): the
    /// Rust kv store is guild-scoped, so bot-global newsletter keys
    /// live under guild "0", same as the blacklist scope.
    pub const META_SCOPE: &str = "0";
    pub const NEWSLETTER_BL_KEY: &str = "newsletter_bl";

    #[derive(Debug, Clone, PartialEq)]
    pub struct GuildOwner {
        pub guild_id: String,
        pub owner_id: String,
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum DmOutcome {
        Sent,
        Blocked,
        Transient,
    }

    #[derive(Debug, Clone, PartialEq)]
    pub struct DmResult {
        pub outcome: DmOutcome,
        pub code: Option<String>,
        pub retry_after_ms: u64,
    }

    #[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
    pub struct NewsletterLock {
        #[serde(default)]
        pub owner: Option<String>,
        #[serde(default)]
        pub version: Option<String>,
        #[serde(default)]
        pub started_at: Option<i64>,
        #[serde(default)]
        pub updated_at: Option<i64>,
        #[serde(default)]
        pub finished: bool,
        #[serde(default)]
        pub sent: u64,
        #[serde(default)]
        pub failed: u64,
        #[serde(default)]
        pub skipped: u64,
        #[serde(default)]
        pub transient: u64,
        #[serde(default)]
        pub total_owners: u64,
        #[serde(default)]
        pub remaining_at_end: Option<u64>,
    }

    #[derive(Debug, Clone, Default)]
    pub struct PdfFile {
        pub name: String,
        pub data: Vec<u8>,
    }

    pub fn is_valid_version(version: &str) -> bool {
        let parts: Vec<&str> = version.split('.').collect();
        parts.len() >= 2
            && parts
                .iter()
                .all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()))
    }

    /// Dots become dashes in kv keys. Mirrors
    /// `currentVersion.replace(/\./g, "-")`.
    pub fn version_key(version: &str) -> String {
        version.replace('.', "-")
    }

    pub fn lock_key(version: &str) -> String {
        format!("newsletter_lock_{}", version_key(version))
    }

    pub fn legacy_sent_key(version: &str) -> String {
        format!("newsletter_sent_{}", version_key(version))
    }

    pub fn claim_key(version: &str, owner_id: &str) -> String {
        format!("newsletter_claim_{}.{}", version_key(version), owner_id)
    }

    pub fn fail_key(version: &str, owner_id: &str) -> String {
        format!("newsletter_fail_{}.{}", version_key(version), owner_id)
    }

    /// Exact TS layout: changelogs/<lang>/<version>/CHANGELOG_<LANG>_<version>.pdf
    pub fn get_pdf_path(root: &std::path::Path, version: &str, lang: &str) -> std::path::PathBuf {
        root.join("changelogs")
            .join(lang)
            .join(version)
            .join(format!("CHANGELOG_{}_{}.pdf", lang.to_uppercase(), version))
    }

    /// fr* guilds get the French PDF, everything else English.
    /// Mirrors `(lang as any)?._code?.startsWith("fr") ? "fr" : "en"`.
    pub fn pdf_locale(lang_code: &str) -> &str {
        if lang_code.starts_with("fr") {
            "fr"
        } else {
            "en"
        }
    }

    pub fn release_url(git_remote: &str, version: &str) -> String {
        format!(
            "{}/-/releases/{}",
            git_remote.trim_end_matches('/'),
            version
        )
    }

    /// Replace the TS template placeholders. Reuses the existing
    /// newsletter_dm_body YAML key value (passed in, never hardcoded).
    pub fn build_dm_body(template: &str, owner: &str, version: &str, url: &str) -> String {
        template
            .replace("{owner}", owner)
            .replace("{version}", version)
            .replace("{releaseUrl}", &format!("<{url}>"))
    }

    /// Per-owner locale DM body. Mirrors sendDm() resolving
    /// `lang.newsletter_dm_body` via getOwnerLang(client, guildId): the
    /// template comes from the owner's guild locale (existing YAML key,
    /// never hardcoded), then placeholders are replaced.
    pub fn dm_body_for_owner(
        template_for: &(dyn Fn(&str) -> String + Send + Sync),
        lang_code: &str,
        owner: &str,
        version: &str,
        url: &str,
    ) -> String {
        build_dm_body(&template_for(lang_code), owner, version, url)
    }

    /// Clamp a Discord retry_after (seconds) to [30s, 10min].
    /// Mirrors classifyDmError().
    pub fn transient_backoff_ms(retry_after_secs: Option<f64>) -> u64 {
        match retry_after_secs {
            Some(s) if s.is_finite() && s > 0.0 => ((s * 1000.0) as u64).clamp(30_000, 10 * 60_000),
            _ => TRANSIENT_BACKOFF_MS,
        }
    }

    /// Permanent (DMs closed 50007, blocked 50013, unknown user 10013,
    /// 403/404) vs transient (429, 5xx, network). Never retry blocked
    /// for this version; release the claim on transient so a later
    /// boot retries. Mirrors classifyDmError().
    pub fn classify_dm_error(
        code: Option<i64>,
        status: Option<u16>,
        retry_after_secs: Option<f64>,
    ) -> DmResult {
        let blocked = matches!(code, Some(50007) | Some(50013) | Some(10013))
            || matches!(status, Some(403) | Some(404));
        if blocked {
            let c = code
                .map(|c| c.to_string())
                .or_else(|| status.map(|s| s.to_string()));
            return DmResult {
                outcome: DmOutcome::Blocked,
                code: c,
                retry_after_ms: 0,
            };
        }
        let c = code
            .map(|c| c.to_string())
            .or_else(|| status.map(|s| s.to_string()));
        DmResult {
            outcome: DmOutcome::Transient,
            code: c,
            retry_after_ms: transient_backoff_ms(retry_after_secs),
        }
    }

    /// Extract code/status from a serenity error for classification.
    /// Retry-after is not exposed on the error type, so transient
    /// backoff falls back to TRANSIENT_BACKOFF_MS (same as TS when
    /// retryAfter is absent).
    pub fn classify_serenity_error(err: &serenity::Error) -> DmResult {
        use serenity::{http::HttpError, Error as SerenityError};
        match err {
            SerenityError::Http(HttpError::UnsuccessfulRequest(resp)) => classify_dm_error(
                Some(resp.error.code as i64),
                Some(resp.status_code.as_u16()),
                None,
            ),
            _ => classify_dm_error(None, None, None),
        }
    }

    /// A lock holder is active when its heartbeat is within TTL.
    /// A stale lock means the holder died: take over.
    pub fn lock_holder_active(updated_at: Option<i64>, now_ms: i64) -> bool {
        match updated_at {
            Some(t) => now_ms - t < LOCK_TTL_MS,
            None => false,
        }
    }

    /// Distributed lock: only one shard-0 process may run a version.
    /// Mirrors the acquire block in checkAndNotifyRelease().
    pub fn can_acquire_lock(
        existing: Option<&NewsletterLock>,
        now_ms: i64,
        process_id: &str,
    ) -> bool {
        match existing {
            None => true,
            Some(l) if l.finished => true,
            Some(l) if l.owner.as_deref() == Some(process_id) => true,
            Some(l) => !lock_holder_active(l.updated_at, now_ms),
        }
    }

    /// Same-version boot with a finished, fully-drained lock means the
    /// newsletter already went out: skip. Otherwise resume.
    /// Mirrors the v.old.txt comparison branch.
    pub fn already_completed(lock: Option<&NewsletterLock>) -> bool {
        matches!(lock, Some(l) if l.finished && l.remaining_at_end == Some(0))
    }

    /// Dedupe guild->owner rows to one DM per owner, deterministic
    /// sorted order for stable resume across reboots. First guild wins
    /// for the unsubscribe-button payload. Mirrors the ownerIds /
    /// guildIdByOwner pass.
    pub fn dedupe_owners(entries: &[GuildOwner]) -> (Vec<String>, HashMap<String, String>) {
        let mut guild_by_owner: HashMap<String, String> = HashMap::new();
        for e in entries {
            if e.owner_id.is_empty() {
                continue;
            }
            guild_by_owner
                .entry(e.owner_id.clone())
                .or_insert_with(|| e.guild_id.clone());
        }
        let mut owners: Vec<String> = guild_by_owner.keys().cloned().collect();
        owners.sort();
        (owners, guild_by_owner)
    }

    #[derive(Debug, Default)]
    pub struct ClaimSnapshot {
        pub claimed: HashSet<String>,
        pub failed: HashSet<String>,
        pub legacy_sent: HashSet<String>,
        pub blacklisted: HashSet<String>,
    }

    /// Filter owners already handled (per-owner claim, permanent
    /// failure, legacy sent-map, newsletter blacklist). Returns the
    /// pending list plus the skipped count. Mirrors the ownerArray
    /// filter pass (legacy compat + claim/fail checks).
    pub fn plan_pending(owners: &[String], snap: &ClaimSnapshot) -> (Vec<String>, u64) {
        let mut pending = Vec::new();
        let mut skipped = 0u64;
        for id in owners {
            if snap.legacy_sent.contains(id)
                || snap.claimed.contains(id)
                || snap.failed.contains(id)
                || snap.blacklisted.contains(id)
            {
                skipped += 1;
                continue;
            }
            pending.push(id.clone());
        }
        (pending, skipped)
    }

    /// Abort the run after too many consecutive transient errors
    /// (Discord struggling / rate-limited). Mirrors the circuit-breaker.
    pub fn should_abort(consecutive_transient: u32) -> bool {
        consecutive_transient >= MAX_CONSECUTIVE_TRANSIENT_ERRORS
    }

    /// Pacing estimate. Mirrors estimateRemainingMs().
    pub fn estimate_remaining_ms(remaining_owners: u64) -> u64 {
        if remaining_owners == 0 {
            return 0;
        }
        let batches = remaining_owners.div_ceil(DM_BATCH_SIZE as u64);
        remaining_owners * DM_STAGGER_MS + batches.saturating_sub(1) * DM_BATCH_DELAY_MS
    }

    pub fn format_eta(ms: u64) -> String {
        if ms == 0 {
            return "0s".to_string();
        }
        let total = ms.div_ceil(1000);
        let (h, m, s) = (total / 3600, (total % 3600) / 60, total % 60);
        if h > 0 {
            format!("{h}h{m:02}m{s:02}s")
        } else if m > 0 {
            format!("{m}m{s:02}s")
        } else {
            format!("{s}s")
        }
    }

    /// In-memory claim-before-send run. Claim BEFORE sending: a crash
    /// skips one owner instead of double-sending on reboot. Transient
    /// releases the claim for a later boot; blocked records a
    /// permanent failure. No Discord I/O: the sender is injected, so
    /// tests run offline. Mirrors the per-owner loop body.
    pub struct FanoutRun {
        pub queue: std::collections::VecDeque<String>,
        pub claimed: HashSet<String>,
        pub failed: HashSet<String>,
        pub sent: u64,
        pub blocked: u64,
        pub transient: u64,
        pub consecutive_transient: u32,
        pub aborted: bool,
        pub processed: u64,
    }

    impl FanoutRun {
        pub fn new(
            pending: Vec<String>,
            claimed: HashSet<String>,
            failed: HashSet<String>,
        ) -> Self {
            Self {
                queue: pending.into(),
                claimed,
                failed,
                sent: 0,
                blocked: 0,
                transient: 0,
                consecutive_transient: 0,
                aborted: false,
                processed: 0,
            }
        }

        pub fn remaining(&self) -> u64 {
            self.queue.len() as u64 + self.transient
        }

        /// Process one owner: re-check claim/fail (a concurrent run
        /// may have claimed it), claim-before-send, send, apply the
        /// outcome. Returns false when the queue is drained or the
        /// circuit-breaker tripped.
        pub async fn step<F, Fut>(&mut self, owner: &str, send: F) -> bool
        where
            F: FnOnce() -> Fut,
            Fut: std::future::Future<Output = DmResult>,
        {
            if self.aborted {
                return false;
            }
            self.processed += 1;
            if self.claimed.contains(owner) || self.failed.contains(owner) {
                return !self.queue.is_empty();
            }
            self.claimed.insert(owner.to_string());
            let result = send().await;
            match result.outcome {
                DmOutcome::Sent => {
                    self.sent += 1;
                    self.consecutive_transient = 0;
                }
                DmOutcome::Blocked => {
                    self.blocked += 1;
                    self.consecutive_transient = 0;
                    self.failed.insert(owner.to_string());
                }
                DmOutcome::Transient => {
                    self.transient += 1;
                    self.consecutive_transient += 1;
                    self.claimed.remove(owner);
                    if should_abort(self.consecutive_transient) {
                        self.aborted = true;
                        return false;
                    }
                }
            }
            !self.queue.is_empty()
        }

        /// Drain the whole queue through the injected sender.
        pub async fn drain<F, Fut>(&mut self, mut send: F)
        where
            F: FnMut(&str) -> Fut,
            Fut: std::future::Future<Output = DmResult>,
        {
            while let Some(owner) = self.queue.pop_front() {
                if !self.step(&owner, || send(&owner)).await {
                    break;
                }
            }
        }
    }

    /// Bot-scope kv helpers (metasTable equivalent, guild "0").
    async fn meta_get(pool: &crate::db::Pool, key: &str) -> Option<String> {
        crate::db::kv_get(pool, META_SCOPE, key).await
    }

    async fn meta_set(pool: &crate::db::Pool, key: &str, value: &str) -> anyhow::Result<()> {
        crate::db::kv_set(pool, META_SCOPE, key, value).await
    }

    async fn meta_has(pool: &crate::db::Pool, key: &str) -> bool {
        meta_get(pool, key).await.is_some()
    }

    async fn meta_del(pool: &crate::db::Pool, key: &str) -> anyhow::Result<()> {
        crate::db::kv_del(pool, META_SCOPE, key).await
    }

    fn now_ms() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    }

    fn process_id() -> String {
        format!("{}-{}", now_ms(), std::process::id())
    }

    fn load_lock(raw: Option<String>) -> Option<NewsletterLock> {
        raw.and_then(|s| serde_json::from_str(&s).ok())
    }

    /// Load changelog PDFs once instead of reading disk per DM.
    /// Missing files are skipped: the DM goes out without attachment
    /// (graceful fallback, mirrors TS pdfCache). Attachment name keeps
    /// the TS shape CHANGELOG_<version>.pdf.
    pub async fn load_pdf_cache(root: &std::path::Path, version: &str) -> HashMap<String, PdfFile> {
        let mut cache = HashMap::new();
        for lang in ["fr", "en"] {
            let path = get_pdf_path(root, version, lang);
            if let Ok(data) = tokio::fs::read(&path).await {
                cache.insert(
                    lang.to_string(),
                    PdfFile {
                        name: format!("CHANGELOG_{version}.pdf"),
                        data,
                    },
                );
            }
        }
        cache
    }

    /// Pick the PDF for an owner, falling back to the other language.
    /// Mirrors `pdfCache.get(pdfLang) ?? pdfCache.get(other) ?? null`.
    pub fn pick_pdf<'a>(
        cache: &'a HashMap<String, PdfFile>,
        lang_code: &str,
    ) -> Option<&'a PdfFile> {
        let first = pdf_locale(lang_code);
        let second = if first == "fr" { "en" } else { "fr" };
        cache.get(first).or_else(|| cache.get(second))
    }

    /// Snapshot the per-owner claim/fail/legacy/blacklist state for a
    /// version from the bot-scope store.
    pub async fn load_snapshot(
        pool: &crate::db::Pool,
        version: &str,
        owners: &[String],
    ) -> ClaimSnapshot {
        let mut snap = ClaimSnapshot::default();
        if let Some(raw) = meta_get(pool, &legacy_sent_key(version)).await {
            if let Ok(map) = serde_json::from_str::<HashMap<String, bool>>(&raw) {
                snap.legacy_sent = map
                    .into_iter()
                    .filter(|(_, v)| *v)
                    .map(|(k, _)| k)
                    .collect();
            }
        }
        if let Some(raw) = meta_get(pool, NEWSLETTER_BL_KEY).await {
            if let Ok(map) = serde_json::from_str::<HashMap<String, bool>>(&raw) {
                snap.blacklisted = map
                    .into_iter()
                    .filter(|(_, v)| *v)
                    .map(|(k, _)| k)
                    .collect();
            }
        }
        for id in owners {
            if meta_has(pool, &claim_key(version, id)).await {
                snap.claimed.insert(id.clone());
            }
            if meta_has(pool, &fail_key(version, id)).await {
                snap.failed.insert(id.clone());
            }
        }
        snap
    }

    /// Send one owner DM with optional PDF attachment. Missing PDF =
    /// text-only DM (graceful fallback). Errors are classified, never
    /// raised. Mirrors sendDm().
    pub async fn send_owner_dm(
        http: &std::sync::Arc<poise::serenity_prelude::Http>,
        owner_id: u64,
        body: &str,
        pdf: Option<&PdfFile>,
    ) -> DmResult {
        use poise::serenity_prelude::{CreateAttachment, CreateMessage, UserId};
        let dm = match UserId::new(owner_id).create_dm_channel(http).await {
            Ok(c) => c,
            Err(e) => return classify_serenity_error(&e),
        };
        let mut msg = CreateMessage::new().content(body);
        if let Some(pdf) = pdf {
            msg = msg.add_file(CreateAttachment::bytes(pdf.data.clone(), pdf.name.clone()));
        }
        match dm.send_message(http, msg).await {
            Ok(_) => DmResult {
                outcome: DmOutcome::Sent,
                code: None,
                retry_after_ms: 0,
            },
            Err(e) => classify_serenity_error(&e),
        }
    }

    #[derive(Debug, Default)]
    pub struct FanoutSummary {
        pub version: Option<String>,
        pub sent: u64,
        pub blocked: u64,
        pub transient: u64,
        pub skipped: u64,
        pub aborted: bool,
        pub ran: bool,
    }

    /// Owner-DM release fan-out. Main-shard only: any other shard id
    /// returns immediately. Caller supplies the guild->owner rows (all
    /// shards in TS via broadcastEval; single-process autoshard here),
    /// the git remote for the release URL, and a per-locale
    /// newsletter_dm_body template resolver (existing YAML key, never
    /// hardcoded; mirrors sendDm reading lang.newsletter_dm_body via
    /// getOwnerLang per owner). Preserves every TS anti-spam guard: main-shard
    /// gate, in-process re-entrance guard, claim-before-send,
    /// distributed lock + heartbeat, blacklist, circuit-breaker,
    /// stagger + batch pacing.
    pub async fn check_and_notify_release(
        pool: &crate::db::Pool,
        http: &std::sync::Arc<poise::serenity_prelude::Http>,
        shard_id: u64,
        root: &std::path::Path,
        entries: &[GuildOwner],
        git_remote: &str,
        dm_body_template_for: &(dyn Fn(&str) -> String + Send + Sync),
    ) -> FanoutSummary {
        // Guard 1: main shard only. Mirrors client.isMainShard().
        if !crate::funcs::is_main_shard(shard_id) {
            return FanoutSummary::default();
        }
        // Guard 2: in-process re-entrance (double ready must not
        // start two loops). Mirrors `isRunning`.
        static RUNNING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
        if RUNNING.swap(true, std::sync::atomic::Ordering::SeqCst) {
            tracing::info!("release notifier: already running, skipping duplicate trigger");
            return FanoutSummary::default();
        }
        struct Reset;
        impl Drop for Reset {
            fn drop(&mut self) {
                RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
            }
        }
        let _reset = Reset;

        let current = std::fs::read_to_string(root.join("v.txt"))
            .unwrap_or_default()
            .trim()
            .to_string();
        if current.is_empty() {
            tracing::info!("release notifier: no v.txt found, skipping");
            return FanoutSummary::default();
        }
        if !is_valid_version(&current) {
            tracing::info!("release notifier: skipping, invalid version {current}");
            return FanoutSummary::default();
        }

        let pid = process_id();
        let started = now_ms();
        let lkey = lock_key(&current);
        let existing = load_lock(meta_get(pool, &lkey).await);

        let previous = std::fs::read_to_string(root.join("v.old.txt"))
            .unwrap_or_default()
            .trim()
            .to_string();
        if !previous.is_empty() && previous == current && already_completed(existing.as_ref()) {
            tracing::info!("release notifier: same version {current}, already completed, skipping");
            return FanoutSummary::default();
        }
        tracing::info!(
            "release notifier: processing release {current} (was {})",
            if previous.is_empty() {
                "none"
            } else {
                &previous
            }
        );

        let (owners, guild_by_owner) = dedupe_owners(entries);
        let snap = load_snapshot(pool, &current, &owners).await;
        let (pending, skipped) = plan_pending(&owners, &snap);

        // Guard 3: distributed lock, stale-holder takeover.
        if !can_acquire_lock(existing.as_ref(), started, &pid) {
            tracing::info!("release notifier: another runner is active for {current}, skipping");
            return FanoutSummary::default();
        }
        let lock = NewsletterLock {
            owner: Some(pid.clone()),
            version: Some(current.clone()),
            started_at: existing
                .as_ref()
                .and_then(|l| l.started_at)
                .or(Some(started)),
            updated_at: Some(started),
            finished: false,
            ..Default::default()
        };
        if meta_set(
            pool,
            &lkey,
            &serde_json::to_string(&lock).unwrap_or_default(),
        )
        .await
        .is_err()
        {
            return FanoutSummary::default();
        }
        // Heartbeat: hold the lock while sending.
        let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let hb = {
            let pool = pool.clone();
            let lkey = lkey.clone();
            let pid = pid.clone();
            let stop = stop.clone();
            tokio::spawn(async move {
                let mut iv =
                    tokio::time::interval(std::time::Duration::from_millis(LOCK_HEARTBEAT_MS));
                loop {
                    iv.tick().await;
                    if stop.load(std::sync::atomic::Ordering::SeqCst) {
                        break;
                    }
                    let raw = crate::db::kv_get(&pool, META_SCOPE, &lkey).await;
                    if let Some(mut l) = load_lock(raw) {
                        if l.owner.as_deref() == Some(&pid) && !l.finished {
                            l.updated_at = Some(now_ms());
                            let _ = crate::db::kv_set(
                                &pool,
                                META_SCOPE,
                                &lkey,
                                &serde_json::to_string(&l).unwrap_or_default(),
                            )
                            .await;
                        }
                    }
                }
            })
        };

        let pdfs = load_pdf_cache(root, &current).await;
        let url = release_url(git_remote, &current);
        let mut run = FanoutRun::new(pending.clone(), snap.claimed.clone(), snap.failed.clone());
        let total = pending.len() as u64;
        let mut sent = 0u64;
        let mut blocked = 0u64;
        let mut transient = 0u64;

        let mut idx = 0usize;
        while idx < pending.len() {
            let end = (idx + DM_BATCH_SIZE).min(pending.len());
            for owner in &pending[idx..end] {
                if run.aborted {
                    break;
                }
                // Fresh blacklist read: mid-run unsubscribes apply immediately.
                let unsub = meta_get(pool, NEWSLETTER_BL_KEY)
                    .await
                    .and_then(|raw| serde_json::from_str::<HashMap<String, bool>>(&raw).ok())
                    .is_some_and(|m| m.get(owner).copied().unwrap_or(false));
                if unsub {
                    continue;
                }
                // Re-check claim/fail right before claiming (resume race).
                if meta_has(pool, &claim_key(&current, owner)).await
                    || meta_has(pool, &fail_key(&current, owner)).await
                {
                    continue;
                }
                // Claim BEFORE sending.
                if meta_set(pool, &claim_key(&current, owner), "true")
                    .await
                    .is_err()
                {
                    continue;
                }
                let owner_id: u64 = match owner.parse() {
                    Ok(id) => id,
                    Err(_) => {
                        let _ = meta_del(pool, &claim_key(&current, owner)).await;
                        continue;
                    }
                };
                let guild_id = guild_by_owner.get(owner).cloned().unwrap_or_default();
                let lang_code = crate::db::guild_lang(pool, guild_id.parse().ok()).await;
                let pdf = pick_pdf(&pdfs, &lang_code);
                let body =
                    dm_body_for_owner(dm_body_template_for, &lang_code, owner, &current, &url);
                let result = send_owner_dm(http, owner_id, &body, pdf).await;
                match result.outcome {
                    DmOutcome::Sent => {
                        sent += 1;
                        run.consecutive_transient = 0;
                    }
                    DmOutcome::Blocked => {
                        blocked += 1;
                        run.consecutive_transient = 0;
                        let _ = meta_set(
                            pool,
                            &fail_key(&current, owner),
                            &serde_json::json!({"code": result.code, "at": now_ms()}).to_string(),
                        )
                        .await;
                    }
                    DmOutcome::Transient => {
                        transient += 1;
                        run.consecutive_transient += 1;
                        let _ = meta_del(pool, &claim_key(&current, owner)).await;
                        tracing::warn!(
                            "release notifier: transient error for {owner} ({:?}), backing off",
                            result.code
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(result.retry_after_ms))
                            .await;
                        if should_abort(run.consecutive_transient) {
                            tracing::error!(
                                "release notifier: too many consecutive transient errors, aborting run"
                            );
                            run.aborted = true;
                            break;
                        }
                        continue;
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(DM_STAGGER_MS)).await;
            }
            if run.aborted {
                break;
            }
            idx = end;
            if idx < pending.len() {
                tokio::time::sleep(std::time::Duration::from_millis(DM_BATCH_DELAY_MS)).await;
            }
        }

        stop.store(true, std::sync::atomic::Ordering::SeqCst);
        hb.abort();
        let remaining = total.saturating_sub(sent + blocked) + transient;
        let done = NewsletterLock {
            owner: Some(pid),
            version: Some(current.clone()),
            started_at: Some(started),
            updated_at: Some(now_ms()),
            finished: true,
            sent,
            failed: blocked,
            skipped,
            transient,
            total_owners: owners.len() as u64,
            remaining_at_end: Some(remaining),
        };
        let _ = meta_set(
            pool,
            &lkey,
            &serde_json::to_string(&done).unwrap_or_default(),
        )
        .await;
        tracing::info!(
            "release notifier: sent {sent} DMs, {blocked} blocked, {transient} transient, {skipped} skipped (total owners: {}){}",
            owners.len(),
            if run.aborted { " [ABORTED]" } else { "" }
        );
        FanoutSummary {
            version: Some(current),
            sent,
            blocked,
            transient,
            skipped,
            aborted: run.aborted,
            ran: true,
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn tmpdir(name: &str) -> std::path::PathBuf {
            let p = std::path::PathBuf::from("/tmp/opencode/ihrz-test").join(name);
            let _ = std::fs::remove_dir_all(&p);
            std::fs::create_dir_all(&p).unwrap();
            p
        }

        #[test]
        fn writes_version_on_first_run() {
            let dir = tmpdir("release-first");
            write_version_file_to("2026.10.1", &dir).unwrap();
            assert_eq!(
                std::fs::read_to_string(dir.join("v.txt")).unwrap(),
                "2026.10.1"
            );
            assert!(!dir.join("v.old.txt").exists());
        }

        #[test]
        fn is_idempotent_for_same_version() {
            let dir = tmpdir("release-idem");
            write_version_file_to("1.0", &dir).unwrap();
            write_version_file_to("1.0", &dir).unwrap();
            assert!(!dir.join("v.old.txt").exists());
        }

        #[test]
        fn archives_previous_version_on_bump() {
            let dir = tmpdir("release-bump");
            write_version_file_to("1.0", &dir).unwrap();
            write_version_file_to("2.0", &dir).unwrap();
            assert_eq!(std::fs::read_to_string(dir.join("v.txt")).unwrap(), "2.0");
            assert_eq!(
                std::fs::read_to_string(dir.join("v.old.txt")).unwrap(),
                "1.0"
            );
        }

        #[test]
        fn consume_announces_once_per_bump() {
            let dir = tmpdir("release-consume");
            write_version_file_to("1.0", &dir).unwrap();
            // Fresh bump without old marker: announces, then silent.
            assert_eq!(consume_release_note(&dir).as_deref(), Some("1.0"));
            assert_eq!(consume_release_note(&dir), None);
            // Next bump announces again exactly once.
            write_version_file_to("2.0", &dir).unwrap();
            assert_eq!(consume_release_note(&dir).as_deref(), Some("2.0"));
            assert_eq!(consume_release_note(&dir), None);
        }

        // --- Owner-DM fan-out guard logic (no live Discord) ---

        #[test]
        fn main_shard_gate() {
            assert!(crate::funcs::is_main_shard(0));
            assert!(!crate::funcs::is_main_shard(1));
            assert!(!crate::funcs::is_main_shard(7));
        }

        #[test]
        fn version_validation() {
            assert!(is_valid_version("2026.10.1"));
            assert!(is_valid_version("2.0"));
            assert!(!is_valid_version(""));
            assert!(!is_valid_version("v2"));
            assert!(!is_valid_version("2"));
            assert!(!is_valid_version("2.x"));
            assert!(!is_valid_version("2..1"));
        }

        #[test]
        fn key_building() {
            assert_eq!(version_key("2026.10.1"), "2026-10-1");
            assert_eq!(lock_key("2026.10.1"), "newsletter_lock_2026-10-1");
            assert_eq!(legacy_sent_key("2026.10.1"), "newsletter_sent_2026-10-1");
            assert_eq!(
                claim_key("2026.10.1", "123"),
                "newsletter_claim_2026-10-1.123"
            );
            assert_eq!(
                fail_key("2026.10.1", "123"),
                "newsletter_fail_2026-10-1.123"
            );
        }

        #[test]
        fn pdf_paths_mirror_ts_layout() {
            let root = std::path::Path::new("/repo");
            assert_eq!(
                get_pdf_path(root, "2026.10.1", "en"),
                root.join("changelogs/en/2026.10.1/CHANGELOG_EN_2026.10.1.pdf")
            );
            assert_eq!(
                get_pdf_path(root, "2026.10.1", "fr"),
                root.join("changelogs/fr/2026.10.1/CHANGELOG_FR_2026.10.1.pdf")
            );
        }

        #[test]
        fn pdf_locale_and_fallback_pick() {
            assert_eq!(pdf_locale("fr-FR"), "fr");
            assert_eq!(pdf_locale("fr-ME"), "fr");
            assert_eq!(pdf_locale("en-US"), "en");
            assert_eq!(pdf_locale("de-DE"), "en");
            let mut cache = HashMap::new();
            cache.insert(
                "en".to_string(),
                PdfFile {
                    name: "CHANGELOG_1.pdf".into(),
                    data: vec![1],
                },
            );
            // fr owner falls back to en when fr PDF is missing.
            assert_eq!(pick_pdf(&cache, "fr-FR").unwrap().name, "CHANGELOG_1.pdf");
            assert!(pick_pdf(&cache, "en-US").is_some());
            assert!(pick_pdf(&HashMap::new(), "en-US").is_none());
        }

        #[test]
        fn classify_permanent_vs_transient() {
            // TS: 50007 DMs closed, 50013 blocked, 10013 unknown user, 403/404.
            for code in [50007, 50013, 10013] {
                let r = classify_dm_error(Some(code), None, None);
                assert_eq!(r.outcome, DmOutcome::Blocked, "code {code}");
            }
            for status in [403u16, 404] {
                let r = classify_dm_error(None, Some(status), None);
                assert_eq!(r.outcome, DmOutcome::Blocked, "status {status}");
            }
            // TS: 429/5xx/network are transient with clamped backoff.
            let r = classify_dm_error(Some(0), Some(429), Some(60.0));
            assert_eq!(r.outcome, DmOutcome::Transient);
            assert_eq!(r.retry_after_ms, 60_000);
            let r = classify_dm_error(None, Some(500), None);
            assert_eq!(r.outcome, DmOutcome::Transient);
            assert_eq!(r.retry_after_ms, TRANSIENT_BACKOFF_MS);
            let r = classify_dm_error(None, None, None);
            assert_eq!(r.outcome, DmOutcome::Transient);
            // Clamp [30s, 10min] like TS Math.min(Math.max(...)).
            assert_eq!(transient_backoff_ms(Some(5.0)), 30_000);
            assert_eq!(transient_backoff_ms(Some(1200.0)), 600_000);
            assert_eq!(transient_backoff_ms(Some(90.0)), 90_000);
        }

        #[test]
        fn distributed_lock_takeover_rules() {
            let now = 1_000_000i64;
            assert!(can_acquire_lock(None, now, "p1"));
            let finished = NewsletterLock {
                finished: true,
                ..Default::default()
            };
            assert!(can_acquire_lock(Some(&finished), now, "p2"));
            let active = NewsletterLock {
                owner: Some("other".into()),
                updated_at: Some(now - 60_000),
                ..Default::default()
            };
            assert!(!can_acquire_lock(Some(&active), now, "p1"));
            let stale = NewsletterLock {
                owner: Some("dead".into()),
                updated_at: Some(now - LOCK_TTL_MS - 1),
                ..Default::default()
            };
            assert!(can_acquire_lock(Some(&stale), now, "p1"));
            let mine = NewsletterLock {
                owner: Some("p1".into()),
                updated_at: Some(now - 1_000),
                ..Default::default()
            };
            assert!(can_acquire_lock(Some(&mine), now, "p1"));
        }

        #[test]
        fn same_version_completed_skips_unfinished_resumes() {
            assert!(already_completed(Some(&NewsletterLock {
                finished: true,
                remaining_at_end: Some(0),
                ..Default::default()
            })));
            assert!(!already_completed(Some(&NewsletterLock {
                finished: true,
                remaining_at_end: Some(3),
                ..Default::default()
            })));
            assert!(!already_completed(Some(&NewsletterLock::default())));
            assert!(!already_completed(None));
        }

        #[test]
        fn dedupe_one_dm_per_owner_sorted() {
            let entries = vec![
                GuildOwner {
                    guild_id: "g2".into(),
                    owner_id: "b".into(),
                },
                GuildOwner {
                    guild_id: "g1".into(),
                    owner_id: "a".into(),
                },
                GuildOwner {
                    guild_id: "g3".into(),
                    owner_id: "a".into(),
                },
                GuildOwner {
                    guild_id: "g4".into(),
                    owner_id: "".into(),
                },
            ];
            let (owners, by_guild) = dedupe_owners(&entries);
            assert_eq!(owners, vec!["a".to_string(), "b".to_string()]);
            assert_eq!(by_guild["a"], "g1");
        }

        #[test]
        fn pending_skips_claimed_failed_legacy_blacklisted() {
            let owners = vec!["a".into(), "b".into(), "c".into(), "d".into(), "e".into()];
            let snap = ClaimSnapshot {
                claimed: ["a".to_string()].into(),
                failed: ["b".to_string()].into(),
                legacy_sent: ["c".to_string()].into(),
                blacklisted: ["d".to_string()].into(),
            };
            let (pending, skipped) = plan_pending(&owners, &snap);
            assert_eq!(pending, vec!["e".to_string()]);
            assert_eq!(skipped, 4);
        }

        #[test]
        fn pacing_math_and_eta() {
            assert_eq!(estimate_remaining_ms(0), 0);
            assert_eq!(estimate_remaining_ms(1), 10_000);
            assert_eq!(estimate_remaining_ms(2), 2 * 10_000 + 15_000);
            assert_eq!(format_eta(0), "0s");
            assert_eq!(format_eta(10_000), "10s");
            assert_eq!(format_eta(90_000), "1m30s");
            assert_eq!(format_eta(3_661_000), "1h01m01s");
        }

        #[test]
        fn dm_body_placeholders() {
            let out = build_dm_body(
                "Hello {owner}, v{version} {releaseUrl}",
                "Ann",
                "2.0",
                "https://x/-/releases/2.0",
            );
            assert_eq!(out, "Hello Ann, v2.0 <https://x/-/releases/2.0>");
            assert_eq!(
                release_url("https://gitlab.com/ihrz/ihrz/", "2.0"),
                "https://gitlab.com/ihrz/ihrz/-/releases/2.0"
            );
        }

        #[test]
        fn dm_body_uses_per_owner_locale_template() {
            // Mirrors sendDm() via getOwnerLang: each owner gets the
            // newsletter_dm_body template of their own guild locale.
            let template_for = |code: &str| match code {
                c if c.starts_with("fr") => "Bonjour {owner}, v{version} {releaseUrl}".to_string(),
                _ => "Hello {owner}, v{version} {releaseUrl}".to_string(),
            };
            let url = "https://x/-/releases/2.0";
            assert_eq!(
                dm_body_for_owner(&template_for, "fr-FR", "Ann", "2.0", url),
                "Bonjour Ann, v2.0 <https://x/-/releases/2.0>"
            );
            assert_eq!(
                dm_body_for_owner(&template_for, "en-US", "Ann", "2.0", url),
                "Hello Ann, v2.0 <https://x/-/releases/2.0>"
            );
        }

        #[test]
        fn circuit_breaker_trips_at_five() {
            assert!(!should_abort(4));
            assert!(should_abort(5));
            assert!(should_abort(6));
        }

        fn sent() -> DmResult {
            DmResult {
                outcome: DmOutcome::Sent,
                code: None,
                retry_after_ms: 0,
            }
        }

        fn blocked() -> DmResult {
            DmResult {
                outcome: DmOutcome::Blocked,
                code: Some("50007".into()),
                retry_after_ms: 0,
            }
        }

        fn transient() -> DmResult {
            DmResult {
                outcome: DmOutcome::Transient,
                code: Some("500".into()),
                retry_after_ms: 60_000,
            }
        }

        #[tokio::test]
        async fn claim_before_send_never_double_sends() {
            let mut run = FanoutRun::new(vec!["o1".into()], HashSet::new(), HashSet::new());
            run.drain(|_| async { sent() }).await;
            assert_eq!(run.sent, 1);
            assert!(run.claimed.contains("o1"));
            // Reboot with the claim persisted: the owner is skipped.
            let pending = vec!["o1".to_string()];
            let snap = ClaimSnapshot {
                claimed: run.claimed.clone(),
                ..Default::default()
            };
            let (pending, skipped) = plan_pending(&pending, &snap);
            assert!(pending.is_empty());
            assert_eq!(skipped, 1);
        }

        #[tokio::test]
        async fn transient_releases_claim_and_aborts_at_five() {
            let owners: Vec<String> = (0..6).map(|i| format!("o{i}")).collect();
            let mut run = FanoutRun::new(owners, HashSet::new(), HashSet::new());
            run.drain(|_| async { transient() }).await;
            assert!(run.aborted);
            assert_eq!(run.transient, 5);
            // Every transient released its claim for a later boot.
            assert!(run.claimed.is_empty());
        }

        #[tokio::test]
        async fn blocked_is_permanent_and_transient_resets_breaker() {
            let mut run = FanoutRun::new(
                vec!["a".into(), "b".into(), "c".into()],
                HashSet::new(),
                HashSet::new(),
            );
            run.drain(|o| {
                let o = o.to_owned();
                async move {
                    match o.as_str() {
                        "a" => transient(),
                        "b" => sent(),
                        _ => blocked(),
                    }
                }
            })
            .await;
            assert_eq!(run.transient, 1);
            assert_eq!(run.sent, 1);
            assert_eq!(run.blocked, 1);
            assert_eq!(run.consecutive_transient, 0);
            assert!(!run.aborted);
            assert!(run.failed.contains("c"));
            assert!(run.claimed.contains("b"));
            assert!(run.claimed.contains("c"));
            assert!(!run.claimed.contains("a"));
        }
    }
}
