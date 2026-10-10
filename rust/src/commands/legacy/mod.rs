// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Legacy MessageCommands surface (prefix heritage, exposed as hybrid).
// Bridges (@prefix/autologs/unslowmode/welcomer) already exist as native
// commands; only unique logic lives here. Meme mergers (meme1/2/3) need
// image/video processing — pending.
//
// TS keys: UTILS.autoFeur, UTILS.antiExe, GUILD.REACT_MSG.<trigger>,
// GUILD.WELCOME {channel, message}.

use crate::bot::Ctx;

use poise::serenity_prelude as serenity;

/// Message-command arg at index (mirrors method.string: missing -> None).
pub fn str_arg(args: &[String], n: usize) -> Option<&str> {
    args.get(n).map(|s| s.as_str())
}

/// Message-command args joined from index (mirrors method.longString:
/// empty join -> None).
pub fn long_str_arg(args: &[String], n: usize) -> Option<String> {
    let joined = args.get(n..).unwrap_or(&[]).join(" ");
    if joined.is_empty() {
        None
    } else {
        Some(joined)
    }
}

/// Leading-integer parse with 0 fallback (mirrors method.number over
/// parseInt: parses an optional sign + digit prefix, else 0).
pub fn int_arg(args: &[String], n: usize) -> i64 {
    let s = args.get(n).map(|v| v.as_str()).unwrap_or("");
    let s = s.strip_prefix('+').unwrap_or(s);
    let (neg, digits) = match s.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, s),
    };
    let len = digits.bytes().take_while(|b| b.is_ascii_digit()).count();
    if len == 0 {
        return 0;
    }
    let v: i64 = digits[..len].parse().unwrap_or(0);
    if neg {
        -v
    } else {
        v
    }
}

/// Number check (mirrors method.isNumber: non-blank + numeric).
/// JS Number() edge cases (hex, Infinity) are not replicated; plain
/// decimal/float/exponent forms match.
pub fn is_number_str(s: &str) -> bool {
    let t = s.trim();
    !t.is_empty() && t.parse::<f64>().is_ok()
}

/// Greeting first-words that earn a wave. Mirrors recognizeItems in
/// guildconfig/reactToMessage.ts.
pub const REACT_GREETINGS: &[&str] = &[
    "hey",
    "salut",
    "coucou",
    "bonjour",
    "salem",
    "wesh",
    "hello",
    "bienvenue",
    "welcome",
    "hi",
    "hola",
];

/// First-word greeting hit (case-insensitive, mirrors TS).
pub fn is_greeting_word(text: &str) -> bool {
    let first = text.split(' ').next().unwrap_or("").to_ascii_lowercase();
    !first.is_empty() && REACT_GREETINGS.contains(&first.as_str())
}

/// Parse a stored react emoji into a ReactionType (id, custom
/// markup, or unicode). Mirrors the emoji values accepted by
/// @add-react.ts (isSingleEmoji / isDiscordEmoji).
pub fn parse_react_emoji(raw: &str) -> serenity::ReactionType {
    let s = raw.trim();
    if let Ok(id) = s.parse::<u64>() {
        return serenity::ReactionType::Custom {
            animated: false,
            id: serenity::EmojiId::new(id),
            name: None,
        };
    }
    if let Some(id_part) = s.strip_prefix("<a:").or_else(|| s.strip_prefix("<:")) {
        if let Some(id_str) = id_part.strip_suffix('>').and_then(|p| p.rsplit(':').next()) {
            if let Ok(id) = id_str.parse::<u64>() {
                return serenity::ReactionType::Custom {
                    animated: s.starts_with("<a:"),
                    id: serenity::EmojiId::new(id),
                    name: None,
                };
            }
        }
    }
    serenity::ReactionType::Unicode(s.to_string())
}

/// "quoi" tail detector. Mirrors autoFeur.ts trigger.
pub fn is_quoi_bait(text: &str) -> bool {
    let t = text
        .trim()
        .trim_end_matches(['?', '!', '.'])
        .trim()
        .to_ascii_lowercase();
    t == "quoi" || t.ends_with(" quoi")
}

/// Full fr-ME joke table. Mirrors auto_respond in autoFeur.ts.
pub const AUTOFEUR_TABLE: &[(&str, &str)] = &[
    ("aïe", "aïe aïe aïe"),
    ("ah", "b"),
    ("hein", "deux"),
    ("ok", "oklm"),
    ("non", "si"),
    ("si", "non"),
    ("oui", "bah non en fait"),
    ("bof", "comme ta daronne"),
    ("mdr", "rigole pas trop stp"),
    ("lol", "t'as 40 ans ?"),
    ("ptdr", "tu t'es pissé dessus ?"),
    ("bruh", "bruh toi-même"),
    ("nique", "ta race"),
    ("zebi", "ta grand-mère la zébrée"),
    ("putain", "encore ?"),
    ("jsuis mort", "meurs pas stp"),
    ("t'es sérieux", "non j'fais semblant"),
    ("tg", "tgl"),
    ("quoi ?", "feur"),
    ("hein ?", "deux"),
    ("koé", "feur 2.0"),
    ("ouais", "non"),
    ("je sais", "ta gueule hermione"),
    (
        "trans",
        "euh ouais par contre parle mieux stp, on as pas élever les cochons ensemble la conne de ta soeur",
    ),
    ("fdp", "bha nan la mienne ce fait pas payer frr"),
    ("connard", "retourne chez ta mère fdp"),
    ("ntm", "j'nique déjà la tienne connard"),
    ("baise moi", "allé baisse la culotte"),
    ("bstmr", "non"),
    ("suce moi", "baisse ton pantalon"),
    (
        "viens on baise",
        "Vien par la petit coquinou je vais te defourailler sauvagement",
    ),
    ("toute façon je prefere mee6", ":monkey:"),
    ("un humain c'est plus utile", "Montre moi tes couilles alors"),
    ("aya", "ya quoi ?"),
    (
        "67",
        "Six Seven dans la ch*tt€ à ta mère Mastu (faut avoir la référence...)",
    ),
];

/// Exact-or-tail match. Mirrors the TS loop over auto_respond
/// (exact hit, else `(\s|^)key([\s?!.,;]*)$` on trimmed lowercase).
pub fn autofeur_match(content: &str) -> Option<&'static str> {
    let t = content.to_lowercase();
    let t = t.trim();
    // Trailing-punctuation-tolerant form for keys without their own
    // punctuation (TS allows [\s?!.,;]* after the key).
    let core = t.trim_end_matches(|c: char| c.is_whitespace() || "?!.,;".contains(c));
    for (key, reply) in AUTOFEUR_TABLE {
        if t == *key || tail_hit(t, key) || (core != t && tail_hit(core, key)) {
            return Some(reply);
        }
    }
    None
}

/// `s` ends with `key`, preceded by start or whitespace.
fn tail_hit(s: &str, key: &str) -> bool {
    if s.len() < key.len() || !s.ends_with(key) {
        return false;
    }
    let rest = &s[..s.len() - key.len()];
    rest.is_empty() || rest.ends_with(|c: char| c.is_whitespace())
}

/// autoFeur runs unless explicitly off. Mirrors the `!== false` gate
/// (never-configured counts as enabled; the toggle stores "1"/"0").
pub fn autofeur_on(raw: Option<String>) -> bool {
    !matches!(
        raw.as_deref().map(str::trim),
        Some("0") | Some("false") | Some("off")
    )
}

/// 3s per-user autoFeur cooldown. Mirrors helper.cooldown(..., 3000).
pub fn autofeur_cooldown_ok(now_ms: i64, user_id: u64) -> bool {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static MAP: OnceLock<Mutex<HashMap<u64, i64>>> = OnceLock::new();
    let map = MAP.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
    let next = guard.get(&user_id).copied().unwrap_or(0);
    if now_ms < next {
        return false;
    }
    guard.insert(user_id, now_ms + 3_000);
    true
}

/// Promo suffix appended 1/8 of the time when UTILS.autoFeur was never
/// configured. Mirrors the TS suffix (emoji + prefix + autorespond).
pub fn autofeur_promo(emoji_markup: &str, prefix: &str) -> String {
    format!(
        "\n-# {emoji_markup} Jte pète les couilles ? fait `{prefix}autorespond` pour me faire fermer ma gueule pétasse!"
    )
}

/// Binary attachment blocklist. Mirrors antiExe.ts `binaryExtensions`
/// (`.ext` substring match, not ends-with). Lowercased here for the
/// contains check, so `A.EXE` is caught too (TS is case-sensitive).
pub const BLOCKED_EXE_EXTS: &[&str] = &[
    "exe",
    "msi",
    "dmg",
    "apk",
    "ipa",
    "bat",
    "vbs",
    "ps1",
    "cmd",
    "sh",
    "bin",
    "appimage",
    "deb",
    "pacman",
    "flatpakref",
    "zip",
    "7z",
    "gz",
    "tar",
    "rar",
    "asar",
];

/// Single-filename check. Mirrors antiExe.ts `ilegalFile`.
pub fn is_blocked_exe_name(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    BLOCKED_EXE_EXTS
        .iter()
        .any(|ext| lower.contains(&format!(".{ext}")))
}

/// Attachment guard over all filenames. Mirrors the
/// `[...message.attachments.values()].some(ilegalFile)` check.
pub fn has_blocked_exe(names: &[String]) -> bool {
    names.iter().any(|n| is_blocked_exe_name(n))
}

/// antiExe bypass. Mirrors the messageCreate early return in
/// antiExe.ts: bots, webhooks, DMs, the bot itself, and members
/// holding Administrator or ModerateMembers.
pub fn antiexe_bypassed(
    is_bot: bool,
    is_webhook: bool,
    is_dm: bool,
    is_self: bool,
    staff_perms: bool,
) -> bool {
    is_bot || is_webhook || is_dm || is_self || staff_perms
}

/// 15-minute antiExe timeout in seconds. Mirrors
/// `client.timeCalculator.to_ms("15m")`.
pub const ANTIEXE_TIMEOUT_SECS: i64 = 15 * 60;

pub fn flag_on(raw: Option<String>) -> bool {
    matches!(
        raw.as_deref().map(str::trim),
        Some("1") | Some("true") | Some("on")
    )
}

/// Partner ad copy. fr-gated content like the autofeur joke table:
/// shown as-is only on fr-locale guilds, so it lives here, not in YAML.
pub const FEXINI_AD: &str = ":pushpin:  **Regardez des films, séries et animés gratuitement, sans pub, en streaming. Catalogue mis à jour quotidiennement.**\n:point_right: https://fexini.tv/";

/// fr-only gate. Mirrors the TS `preferredLocale !== "fr"` early return
/// (strict equality, no case folding — Discord sends lowercase codes).
pub fn fexini_ad_for_locale(locale: &str) -> Option<&'static str> {
    (locale == "fr").then_some(FEXINI_AD)
}

// ---- kdenlive meme mergers (meme1/2/3) ----
// Mirrors MessageCommands/misc/@rap-vs-reality.ts (meme1),
// @two-sides.ts (meme2), @kawaeine.ts (meme3): fr-only, 90s per-user
// media_manipulation cooldown, URL-or-attachment inputs, Jimp-equivalent
// prep via funcs media ops, kdenlive template render under melt/xvfb,
// mp4 reply + temp cleanup. Missing render binaries surface through the
// same "An error occurred" reply as the TS catch path.

/// 90s per-user meme cooldown. Mirrors helper.cooldown(user,
/// "media_manipulation", 1m30s).
pub fn meme_cooldown_ok(now_ms: i64, user_id: u64) -> bool {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static MAP: OnceLock<Mutex<HashMap<u64, i64>>> = OnceLock::new();
    let map = MAP.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
    let next = guard.get(&user_id).copied().unwrap_or(0);
    if now_ms < next {
        return false;
    }
    guard.insert(user_id, now_ms + 90_000);
    true
}

/// fr-only gate shared by the meme commands. Mirrors the TS
/// `preferredLocale !== "fr"` early return.
pub fn meme_fr_ok(locale: &str) -> bool {
    locale == "fr"
}

/// Kdenlive template substitution: the `{var}` token replaces the FIRST
/// occurrence only (TS .replace), every other token replaces ALL
/// occurrences (TS .replaceAll).
pub fn kdenlive_substitute(template: &str, first: (&str, &str), rest: &[(&str, &str)]) -> String {
    let mut out = template.replacen(first.0, first.1, 1);
    for (from, to) in rest {
        out = out.replace(from, to);
    }
    out
}

/// Resident meme asset dir. Mirrors `path.join(process.cwd(), "src",
/// "assets", name)` in the meme commands.
pub fn meme_assets_dir(name: &str) -> std::path::PathBuf {
    std::env::current_dir()
        .unwrap_or_default()
        .join("src")
        .join("assets")
        .join(name)
}

/// Fetch, decode, fit and letterbox one input image into the media temp
/// dir. Returns the file path plus the ORIGINAL dims (the TS resizeImage
/// metadata, substituted into the two-sides template).
async fn prep_meme_image(
    url: &str,
    file_stem: &str,
    msg_id: u64,
    dims: Option<(u32, u32)>,
) -> anyhow::Result<(std::path::PathBuf, (u32, u32))> {
    let bytes = crate::commands::botcat::download_bytes(url)
        .await
        .ok_or_else(|| anyhow::anyhow!("download failed"))?;
    let png = crate::funcs::convert_to_png(&bytes)?;
    let dir = crate::funcs::media_temp_dir();
    std::fs::create_dir_all(&dir)?;
    let path = dir.join(format!("{file_stem}-{msg_id}.png"));
    let meta = crate::funcs::resize_image_file(&png, &path, dims)?;
    Ok((path, meta))
}

/// Prefix attachment URLs (first/last) for hybrid meme commands.
/// Mirrors `interaction.attachments.first()/.last()` fallbacks.
fn prefix_attachment_urls(ctx: &Ctx<'_>) -> (Option<String>, Option<String>) {
    match ctx {
        Ctx::Prefix(p) => (
            p.msg.attachments.first().map(|a| a.url.clone()),
            p.msg.attachments.last().map(|a| a.url.clone()),
        ),
        _ => (None, None),
    }
}

/// Render one meme: substitute the template, save, export under melt,
/// reply the mp4, clean temp files. Errors become the TS-style
/// "An error occurred" reply (same catch path as TS).
async fn run_meme(
    ctx: &Ctx<'_>,
    template: String,
    resized: &[std::path::PathBuf],
) -> Result<(), anyhow::Error> {
    let now_ms = crate::commands::context::now_ms();
    let project = crate::funcs::kdenlive_temp_save(&template, now_ms as u64)?;
    let outcome = crate::funcs::kdenlive_export(&project, now_ms as u64).await;
    match outcome {
        Ok(exported) => {
            let bytes = std::fs::read(&exported).unwrap_or_default();
            ctx.send(poise::CreateReply::default().attachment(
                poise::serenity_prelude::CreateAttachment::bytes(bytes, "merged_video.mp4"),
            ))
            .await?;
            let _ = std::fs::remove_file(&exported);
            for path in resized {
                let _ = std::fs::remove_file(path);
            }
            Ok(())
        }
        Err(e) => {
            for path in resized {
                let _ = std::fs::remove_file(path);
            }
            ctx.say(format!("An error occurred: {e}")).await?;
            Ok(())
        }
    }
}

/// Shared gate: fr locale, required urls, 90s cooldown. Returns the
/// reply text when the command must stop early (TS reply-and-return).
async fn meme_gate(ctx: &Ctx<'_>, urls: &[Option<String>]) -> Option<String> {
    let locale = ctx
        .guild()
        .map(|g| g.preferred_locale.clone())
        .unwrap_or_default();
    if !meme_fr_ok(&locale) {
        return Some(String::new());
    }
    if urls.iter().any(|u| u.is_none()) {
        return Some(
            crate::commands::lang_for(
                ctx,
                "media_gen_error_args",
                "Please provide two valid image URLs.",
            )
            .await,
        );
    }
    if !meme_cooldown_ok(crate::commands::context::now_ms(), ctx.author().id.get()) {
        return Some(
            crate::commands::lang_for(
                ctx,
                "media_gen_cooldown",
                "You need to wait `1 minute & 30 seconds` between media generations!",
            )
            .await,
        );
    }
    None
}

/// Custom-id prefix of the newsletter opt-out button.
/// Mirrors @updates.ts + releaseNotifier.ts:
/// `newsletter-toggle%<guildId>` (DM variant appends `?dm`).
pub const NEWSLETTER_TOGGLE_PREFIX: &str = "newsletter-toggle%";

/// Global kv slot holding the newsletter blacklist.
/// Mirrors metasTable key `newsletter_bl` (owner_id -> true).
pub const NEWSLETTER_BL_KEY: &str = "newsletter_bl";

/// Parse the guild id out of a newsletter-toggle custom id.
/// Mirrors `interaction.customId.split("%")[1]?.split("?")[0]`.
pub fn newsletter_toggle_guild(custom_id: &str) -> Option<u64> {
    let rest = custom_id.strip_prefix(NEWSLETTER_TOGGLE_PREFIX)?;
    let gid = rest.split('?').next().unwrap_or("");
    if gid.is_empty() {
        return None;
    }
    gid.parse::<u64>().ok()
}

/// Pure toggle over the serialized `newsletter_bl` map.
/// Returns (new_json, was_disabled): when the owner was listed, the
/// entry is removed (re-subscribe); otherwise it is added (opt out).
/// Mirrors newsletter-toggle.ts delete/set branch.
pub fn toggle_newsletter_bl(raw: Option<&str>, owner_id: &str) -> (String, bool) {
    let mut map: serde_json::Map<String, serde_json::Value> = raw
        .and_then(|r| serde_json::from_str(r).ok())
        .unwrap_or_default();
    let was_disabled = map.get(owner_id).and_then(|v| v.as_bool()).unwrap_or(false);
    if was_disabled {
        map.remove(owner_id);
    } else {
        map.insert(owner_id.to_string(), serde_json::Value::Bool(true));
    }
    (serde_json::Value::Object(map).to_string(), was_disabled)
}

/// Newsletter opt-out toggle button. Mirrors
/// Interaction/Components/Buttons/newsletter-toggle.ts: non-owners get
/// the not-owner notice, owners flip their `newsletter_bl` entry.
pub async fn handle_newsletter_toggle(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let owner_id = comp.user.id.get().to_string();
    if let Some(gid) = newsletter_toggle_guild(&comp.data.custom_id) {
        let owner_match = serenity::GuildId::new(gid)
            .to_partial_guild(&ctx.http)
            .await
            .map(|g| g.owner_id.get().to_string() == owner_id)
            .unwrap_or(true);
        if !owner_match {
            let code = crate::db::guild_lang(pool, comp.guild_id.map(|g| g.get())).await;
            let bot_id = ctx.cache.current_user().id.get().to_string();
            let msg = crate::lang::get(&code, "newsletter_not_owner")
                .unwrap_or_default()
                .replace("${clientId}", &bot_id);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(msg)
                        .ephemeral(true),
                ),
            )
            .await?;
            return Ok(());
        }
    }
    let raw = crate::db::kv_get(pool, "0", NEWSLETTER_BL_KEY).await;
    let (updated, was_disabled) = toggle_newsletter_bl(raw.as_deref(), &owner_id);
    crate::db::kv_set(pool, "0", NEWSLETTER_BL_KEY, &updated).await?;
    let code = crate::db::guild_lang(pool, comp.guild_id.map(|g| g.get())).await;
    let key = if was_disabled {
        "newsletter_toggle_enabled"
    } else {
        "newsletter_toggle_disabled"
    };
    let msg = crate::lang::get(&code, key).unwrap_or_default();
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(msg)
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

/// Category select id for helpall (TS-verbatim).
pub const HELPALL_SELECT_ID: &str = "helpall_category_select";

pub fn helpall_key(msg_id: u64) -> String {
    format!("HELPALL.{msg_id}")
}

/// Perm-gate suffix for a help field name. Mirrors formatPermGate
/// (crown level, role mentions, user mentions; lock/crown fall back
/// to emoji when the app emojis are missing).
pub fn perm_gate_suffix(
    perms: &crate::executor::CmdPerms,
    role_names: &std::collections::HashMap<String, String>,
    lock: &str,
    crown: &str,
) -> String {
    let mut bits = Vec::new();
    if perms.level.unwrap_or(0) > 0 {
        bits.push(format!("{crown} Lv.{}", perms.level.unwrap_or(0)));
    }
    for role_id in &perms.roles {
        let name = role_names
            .get(role_id)
            .map(|n| format!("@{n}"))
            .unwrap_or_else(|| role_id.clone());
        bits.push(format!("{lock} {name}"));
    }
    for user_id in &perms.users {
        bits.push(format!("{lock} <@{user_id}>"));
    }
    if bits.is_empty() {
        String::new()
    } else {
        format!(" {}", bits.join(" "))
    }
}

/// One helpall field: `prefix+name` + gate suffix (256 chars max),
/// description value. Mirrors the field build in @helpall.ts.
pub fn helpall_field(prefix: &str, name: &str, desc: &str, gate: &str) -> (String, String) {
    let full = format!("`{prefix}{name}`{gate}");
    let title: String = full.chars().take(256).collect();
    (title, desc.to_string())
}

fn chrono_year() -> i32 {
    // Year for the © footer without a date dependency.
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    // Days since epoch -> civil year (Howard Hinnant algorithm).
    let days = secs.div_euclid(86_400) + 719_468;
    let era = days.div_euclid(146_097);
    let doe = days.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    (yoe + era * 400) as i32
}

/// One helpall row: (category, command, description, gate suffix).
pub type HelpallItem = (String, String, String, String);

/// Paginate one category into embeds (25 fields each).
/// Mirrors the page build in @helpall.ts (#1519f0).
pub fn helpall_pages(
    cat: &str,
    items: &[HelpallItem],
    prefix: &str,
    desc_tpl: &str,
    footer: &str,
) -> Vec<serenity::CreateEmbed> {
    let mut out = Vec::new();
    for (pi, chunk) in items.chunks(25).enumerate() {
        let title = if pi == 0 {
            cat.to_string()
        } else {
            format!("{cat} ({})", pi + 1)
        };
        let mut e = serenity::CreateEmbed::default()
            .title(title)
            .description(desc_tpl)
            .colour(serenity::Colour::from_rgb(0x15, 0x19, 0xf0))
            .footer(serenity::CreateEmbedFooter::new(footer.to_string()));
        for (_, name, desc, gate) in chunk {
            let (fname, fvalue) = helpall_field(prefix, name, desc, gate);
            e = e.field(fname, fvalue, false);
        }
        out.push(e);
    }
    out
}

/// Route the helpall category select (stateless: recompute).
pub async fn handle_helpall_select(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let invoker: u64 = crate::db::kv_get(pool, &gid, &helpall_key(comp.message.id.get()))
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if comp.user.id.get() != invoker {
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("help_not_for_you"))
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }
    let value = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => return,
    };
    // Recompute the category embeds (same code path as the entry).
    let prefix = crate::db::guild_prefix(pool, Some(guild_id.get()), ".").await;
    let entries = crate::commands::guildconfig::load_all_cmd_perms(pool, &gid).await;
    let uid = comp.user.id.get();
    let roles_map: std::collections::HashMap<String, String> =
        crate::db::kv_get(pool, &gid, "UTILS.roles")
            .await
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
    // Member roles over HTTP (no Context here).
    let member_roles: Vec<u64> = guild_id
        .member(http, comp.user.id)
        .await
        .map(|m| m.roles.iter().map(|r| r.get()).collect())
        .unwrap_or_default();
    let user_level: u8 = crate::db::kv_get(pool, &gid, &format!("UTILS.USER_PERMS.{uid}"))
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
        .max(crate::executor::role_level(&member_roles, &roles_map));
    let is_owner = crate::db::kv_get(pool, &gid, &format!("GUILD.OWNER.{uid}"))
        .await
        .is_some();
    let role_names: std::collections::HashMap<String, String> = http
        .get_guild_roles(guild_id)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| (r.id.get().to_string(), r.name))
        .collect();
    let registry = crate::commands::all();
    let mut cats: Vec<(String, Vec<HelpallItem>)> = Vec::new();
    for (cmd_name, perms) in entries
        .iter()
        .filter(|(_, p)| crate::commands::guildconfig::has_perm_requirements(p))
    {
        if !(is_owner || crate::executor::check_cmd_access(uid, &member_roles, user_level, perms)) {
            continue;
        }
        let (cat, desc) = registry
            .iter()
            .find(|c| &c.name == cmd_name)
            .map(|c| {
                (
                    c.category.clone().unwrap_or_else(|| "other".to_string()),
                    c.description.clone().unwrap_or_default(),
                )
            })
            .unwrap_or_else(|| ("other".to_string(), String::new()));
        let gate = perm_gate_suffix(perms, &role_names, "🔐", "👑");
        match cats.last_mut() {
            Some((name, list)) if *name == cat => {
                list.push((cat.clone(), cmd_name.clone(), desc, gate));
            }
            _ => cats.push((
                cat.clone(),
                vec![(cat.clone(), cmd_name.clone(), desc, gate)],
            )),
        }
    }
    cats.sort_by(|a, b| a.0.cmp(&b.0));
    let found = cats
        .iter()
        .find(|(cat, _)| cat.to_lowercase().replace(char::is_whitespace, "_") == value);
    let Some((_, items)) = found else {
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("var_unreachable_command")),
                ),
            )
            .await;
        return;
    };
    // Rebuild the select row (options need the counts).
    let mut options = Vec::new();
    for (cat, list) in &cats {
        options.push(
            serenity::CreateSelectMenuOption::new(
                cat.clone(),
                cat.to_lowercase().replace(char::is_whitespace, "_"),
            )
            .description(help::help_option_desc(&code, list.len())),
        );
    }
    let select = serenity::CreateSelectMenu::new(
        HELPALL_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("help_select_menu"));
    let year = chrono_year();
    let desc_tpl = t("hybridcommands_embed_footer_text").replace("${botPrefix}", &prefix);
    // Category title for the pages: find the display name.
    let embeds = helpall_pages(
        &found.map(|(c, _)| c.clone()).unwrap_or_default(),
        items,
        &prefix,
        &desc_tpl,
        &format!("© iHorizon {year}"),
    );
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embeds(embeds)
                    .components(vec![serenity::CreateActionRow::SelectMenu(select)]),
            ),
        )
        .await;
}

/// Category browser entry (the `h` help menu).
/// Mirrors MessageCommands/bot @h.ts (per-category embeds, 25/select
/// page, prev/next buttons, author gate; the 30-min collector has no
/// stateless equivalent — state recomputes per interaction).
pub const HELP_SELECT_PREFIX: &str = "help_category_select_";

pub const HELP_PREV_ID: &str = "help_prev_page";

pub const HELP_NEXT_ID: &str = "help_next_page";

pub fn helpmsg_key(msg_id: u64) -> String {
    format!("HELPMSG.{msg_id}")
}

/// Static category table from HybridCommands/*/init.json:
/// (categoryName, description key, placeholder key, emoji name, color).
pub const HELP_CATEGORIES: &[(&str, &str, &str, &str, u32)] = &[
    (
        "antispam",
        "help_antispam_dsc",
        "help_antispam_fields",
        "Moderator_Alumni_Badge",
        0x6666ff,
    ),
    (
        "backup",
        "help_backup_dsc",
        "help_backup_fields",
        "Save_Clip",
        0x11304c,
    ),
    (
        "bot",
        "help_bot_dsc",
        "help_bot_fields",
        "ECBDD_Badge",
        0x6a52fb,
    ),
    (
        "confession",
        "help_confession_dsc",
        "help_confession_fields",
        "Guilty",
        0xd193a7,
    ),
    (
        "economy",
        "help_economy_dsc",
        "help_economy_fields",
        "Coin",
        0xf7c93f,
    ),
    (
        "fun",
        "help_fun_dsc",
        "help_fun_fields",
        "Goma_Yoyoyo",
        0xe69138,
    ),
    (
        "giveaway",
        "help_giveaway_dsc",
        "help_giveaway_fields",
        "Rainbow_Tada",
        0x2986cc,
    ),
    (
        "h247",
        "help_h247_dsc",
        "help_h247_fields",
        "Timer",
        0x11304c,
    ),
    (
        "invitemanager",
        "help_invitem_dsc",
        "help_invitem_fields",
        "Link_Icon",
        0xce7e00,
    ),
    (
        "membercount",
        "help_memberc_dsc",
        "help_memberc_fields",
        "Stats",
        0x56d91e,
    ),
    (
        "moderation",
        "help_mod_dsc",
        "help_mod_fields",
        "Ban_Hammer",
        0xcc0000,
    ),
    (
        "music",
        "help_music_dsc",
        "help_music_fields",
        "Headphone",
        0xc90076,
    ),
    (
        "owner",
        "help_owner_dsc",
        "help_owner_fields",
        "Crown",
        0x660000,
    ),
    (
        "pfps",
        "help_pfps_dsc",
        "help_pfps_fields",
        "Inspecting",
        0x25cf93,
    ),
    (
        "profil",
        "help_prof_dsc",
        "help_prof_fields",
        "Sparkles",
        0x158ce6,
    ),
    (
        "ranks",
        "help_ranks_dsc",
        "help_ranks_fields",
        "Level_Up",
        0xfccc39,
    ),
    (
        "rolereactions",
        "help_roler_dsc",
        "help_roler_fields",
        "Zap",
        0xd9d2e9,
    ),
    (
        "schedule",
        "help_schedule_dsc",
        "help_schedule_fields",
        "Schedule",
        0x744700,
    ),
    (
        "security",
        "help_security_dsc",
        "help_security_fields",
        "Captcha",
        0x27d9ff,
    ),
    (
        "starboard",
        "help_starboard_dsc",
        "help_starboard_fields",
        "Starboard",
        0x258bd9,
    ),
    (
        "stats",
        "help_stats_dsc",
        "help_stats_fields",
        "Server_Stats",
        0x258bd9,
    ),
    (
        "sticky",
        "help_sticky_dsc",
        "help_sticky_fields",
        "Pin",
        0x11304c,
    ),
    (
        "tags",
        "help_tags_dsc",
        "help_tags_fields",
        "Nametag",
        0xfccc39,
    ),
    (
        "ticket",
        "help_ticket_dsc",
        "help_ticket_fields",
        "Ticket",
        0x397c16,
    ),
    (
        "tts",
        "help_tts_dsc",
        "help_tts_fields",
        "VC_OpenChat",
        0x5865F2,
    ),
    (
        "utils",
        "help_utils_dsc",
        "help_utils_fields",
        "Utils",
        0x000000,
    ),
];

/// Categories that have at least one registered command, in table
/// order. Pure for testability.
pub fn help_active_categories(registry_cats: &[&str]) -> Vec<usize> {
    HELP_CATEGORIES
        .iter()
        .enumerate()
        .filter(|(_, (name, _, _, _, _))| registry_cats.contains(name))
        .map(|(i, _)| i)
        .collect()
}

/// Split active categories into 25-per-page chunks. Mirrors
/// chunkCategories.
pub fn help_page_chunks(active: &[usize]) -> Vec<Vec<usize>> {
    active.chunks(25).map(|c| c.to_vec()).collect()
}

/// Category key for select values. Mirrors the TS lowercase/_ mapping.
pub fn help_cat_key(name: &str) -> String {
    name.to_lowercase().replace(char::is_whitespace, "_")
}

/// One rendered help-browser embed page.
pub struct HelpPage {
    pub title: String,
    pub description: String,
    pub color: u32,
    pub footer: String,
    pub fields: Vec<(String, String)>,
}

/// Paginate one category's commands into embeds (24 fields each,
/// suite continuations after). Mirrors the @h.ts page build.
pub fn help_category_pages(
    title: &str,
    desc_tpl: &str,
    footer: &str,
    color: u32,
    fields: &[(String, String)],
    suite_tpl: &str,
    suite_desc: &str,
) -> Vec<HelpPage> {
    let mut out = Vec::new();
    let mut current: Vec<(String, String)> = Vec::new();
    let mut suite = 0usize;
    for (i, f) in fields.iter().enumerate() {
        if current.len() >= 24 {
            out.push(HelpPage {
                title: current_title(&mut suite, title, suite_tpl),
                description: desc_tpl.to_string(),
                color,
                footer: footer.to_string(),
                fields: std::mem::take(&mut current),
            });
        }
        current.push(f.clone());
        if i == fields.len() - 1 {
            let desc = if suite > 0 { suite_desc } else { desc_tpl };
            out.push(HelpPage {
                title: current_title(&mut suite, title, suite_tpl),
                description: desc.to_string(),
                color,
                footer: footer.to_string(),
                fields: std::mem::take(&mut current),
            });
        }
    }
    out
}

fn current_title(suite: &mut usize, title: &str, suite_tpl: &str) -> String {
    if *suite == 0 {
        *suite += 1;
        title.to_string()
    } else {
        *suite += 1;
        format!("{title} {suite_tpl} {}", *suite - 1)
    }
}

/// One browser category with its command fields.
pub struct HelpBrowserCat {
    pub name: String,
    pub title: String,
    pub desc: String,
    pub color: u32,
    pub emoji_name: String,
    pub fields: Vec<(String, String)>,
}

/// Collect browser categories from the registry. Mirrors the
/// client.category/client.content loop in @h.ts (registry commands
/// stand in for content entries; descriptions come from poise).
pub fn collect_help_cats(
    registry: &[(&str, &str, &str)],
    table: &[(&str, &str, &str, &str, u32)],
    title_of: &dyn Fn(&str) -> String,
    prefix: &str,
) -> Vec<HelpBrowserCat> {
    let mut out = Vec::new();
    for (name, desc_key, placeholder_key, emoji_name, color) in table {
        let mut fields: Vec<(String, String)> = registry
            .iter()
            .filter(|(cat, _, _)| cat == name)
            .map(|(_, cmd, desc)| (format!("`{prefix}{cmd}`"), desc.to_string()))
            .collect();
        if fields.is_empty() {
            continue;
        }
        fields.sort();
        out.push(HelpBrowserCat {
            name: name.to_string(),
            title: title_of(placeholder_key),
            desc: title_of(desc_key),
            color: *color,
            emoji_name: emoji_name.to_string(),
            fields,
        });
    }
    out
}

#[allow(clippy::too_many_arguments)]
async fn render_help_page(
    ctx: &Ctx<'_>,
    pool: &crate::db::Pool,
    gid: &str,
    cats: &[HelpBrowserCat],
    page: usize,
    selected: Option<&str>,
    prefix: &str,
    desc_tpl: &str,
    footer: &str,
    suite_tpl: &str,
    suite_desc: &str,
) -> Result<(), anyhow::Error> {
    let chunks = help_page_chunks(&(0..cats.len()).collect::<Vec<_>>());
    let total = chunks.len().max(1);
    let page = page.min(total - 1);
    let chunk = &chunks[page];
    // Embed: selected category's first page, else chunk's first.
    let show_idx = selected
        .and_then(|s| cats.iter().position(|c| help_cat_key(&c.title) == s))
        .or_else(|| chunk.first().copied())
        .unwrap_or(0);
    let show = &cats[show_idx];
    let pages = help_category_pages(
        &show.title,
        desc_tpl,
        footer,
        show.color,
        &show.fields,
        suite_tpl,
        suite_desc,
    );
    let page_data = pages.into_iter().next().unwrap_or_else(|| HelpPage {
        title: show.title.clone(),
        description: desc_tpl.to_string(),
        color: show.color,
        footer: footer.to_string(),
        fields: vec![],
    });
    let mut embed = serenity::CreateEmbed::default()
        .title(page_data.title)
        .description(page_data.description)
        .colour(serenity::Colour::new(page_data.color))
        .footer(serenity::CreateEmbedFooter::new(page_data.footer));
    for (n, v) in page_data.fields {
        embed = embed.field(n, v, false);
    }
    // App emojis for the select options (boot-warmed cache, like tag info).
    let mut options = Vec::new();
    for idx in chunk {
        let c = &cats[*idx];
        let mut opt =
            serenity::CreateSelectMenuOption::new(c.title.clone(), help_cat_key(&c.title));
        if let Some((id, name, _animated)) =
            crate::emojis::cached_emoji_entry(ctx.http(), &c.emoji_name).await
        {
            opt = opt.emoji(serenity::ReactionType::Custom {
                animated: false,
                id: serenity::EmojiId::new(id),
                name: Some(name),
            });
        }
        options.push(opt);
    }
    let placeholder = if total > 1 {
        format!(
            "{} (Page {}/{total})",
            ctx_data_help_select(ctx).await,
            page + 1
        )
    } else {
        ctx_data_help_select(ctx).await
    };
    let select = serenity::CreateSelectMenu::new(
        format!("{HELP_SELECT_PREFIX}{page}"),
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder);
    let mut components = vec![serenity::CreateActionRow::SelectMenu(select)];
    if total > 1 {
        let prev = serenity::CreateButton::new(format!("{HELP_PREV_ID}:{page}"))
            .label("◀ Previous")
            .style(serenity::ButtonStyle::Primary)
            .disabled(page == 0);
        let ind = serenity::CreateButton::new("help_page_indicator")
            .label(format!("{}/{}", page + 1, total))
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true);
        let next = serenity::CreateButton::new(format!("{HELP_NEXT_ID}:{page}"))
            .label("Next ▶")
            .style(serenity::ButtonStyle::Primary)
            .disabled(page + 1 >= total);
        components.push(serenity::CreateActionRow::Buttons(vec![prev, ind, next]));
    }
    let reply = ctx
        .send(
            poise::CreateReply::default()
                .embed(embed)
                .components(components),
        )
        .await?;
    let mid = reply.message().await?.id.get();
    let _ = crate::db::kv_set(
        pool,
        gid,
        &helpmsg_key(mid),
        &ctx.author().id.get().to_string(),
    )
    .await;
    let _ = prefix;
    Ok(())
}

async fn ctx_data_help_select(ctx: &Ctx<'_>) -> String {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    crate::lang::get(&code, "help_select_menu").unwrap_or_default()
}

/// Route help browser selects + pager buttons (stateless recompute).
pub async fn handle_help_component(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let invoker: u64 = crate::db::kv_get(pool, &gid, &helpmsg_key(comp.message.id.get()))
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if comp.user.id.get() != invoker {
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("help_not_for_you"))
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }
    let id = comp.data.custom_id.as_str();
    // Current page rides in the select/button ids (stateless).
    let page: usize;
    let mut selected: Option<String> = None;
    if let Some(p) = id.strip_prefix(HELP_SELECT_PREFIX) {
        page = p.parse().unwrap_or(0);
        selected = match &comp.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned()
            }
            _ => None,
        };
    } else if let Some(p) = id.strip_prefix(&format!("{HELP_NEXT_ID}:")) {
        page = p.parse::<usize>().unwrap_or(0) + 1;
    } else if let Some(p) = id.strip_prefix(&format!("{HELP_PREV_ID}:")) {
        page = p.parse::<usize>().unwrap_or(0).saturating_sub(1);
    } else {
        return;
    }
    update_help_message(http, pool, comp, page, selected.as_deref()).await;
}

async fn update_help_message(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
    page: usize,
    selected: Option<&str>,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let prefix = crate::db::guild_prefix(pool, Some(guild_id.get()), ".").await;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Rebuild from owned data (registry Commands are owned here).
    let all = crate::commands::all();
    let owned: Vec<(String, String, String)> = all
        .iter()
        .map(|c| {
            (
                c.category.clone().unwrap_or_default(),
                c.name.clone(),
                c.description.clone().unwrap_or_default(),
            )
        })
        .collect();
    let reg_refs: Vec<(&str, &str, &str)> = owned
        .iter()
        .map(|(a, b, c)| (a.as_str(), b.as_str(), c.as_str()))
        .collect();
    let table: Vec<(&str, &str, &str, &str, u32)> = HELP_CATEGORIES.to_vec();
    let cats = collect_help_cats(&reg_refs, &table, &|k| t(k), &prefix);
    if cats.is_empty() {
        return;
    }
    let year = chrono_year();
    let footer = format!("© iHorizon {year}");
    let desc_tpl = t("hybridcommands_embed_footer_text").replace("${botPrefix}", &prefix);
    let suite_tpl = t("h_suite");
    let suite_desc = t("h_suite_desc");
    let chunks = help_page_chunks(&(0..cats.len()).collect::<Vec<_>>());
    let total = chunks.len().max(1);
    let page = page.min(total - 1);
    let chunk = &chunks[page];
    let show_idx = selected
        .and_then(|s| cats.iter().position(|c| help_cat_key(&c.title) == s))
        .or_else(|| chunk.first().copied())
        .unwrap_or(0);
    if selected.is_some()
        && cats
            .iter()
            .position(|c| help_cat_key(&c.title) == selected.unwrap_or_default())
            .is_none()
    {
        let _ = comp
            .create_response(
                http,
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("var_unreachable_command")),
                ),
            )
            .await;
        return;
    }
    let show = &cats[show_idx];
    let pages = help_category_pages(
        &show.title,
        &desc_tpl,
        &footer,
        show.color,
        &show.fields,
        &suite_tpl,
        &suite_desc,
    );
    let page_data = pages.into_iter().next().unwrap_or_else(|| HelpPage {
        title: show.title.clone(),
        description: desc_tpl.clone(),
        color: show.color,
        footer: footer.clone(),
        fields: vec![],
    });
    let mut embed = serenity::CreateEmbed::default()
        .title(page_data.title)
        .description(page_data.description)
        .colour(serenity::Colour::new(page_data.color))
        .footer(serenity::CreateEmbedFooter::new(page_data.footer));
    for (n, v) in page_data.fields {
        embed = embed.field(n, v, false);
    }
    let mut options = Vec::new();
    for idx in chunk {
        let c = &cats[*idx];
        let mut opt =
            serenity::CreateSelectMenuOption::new(c.title.clone(), help_cat_key(&c.title));
        if let Some((id, name, _animated)) =
            crate::emojis::cached_emoji_entry(http, &c.emoji_name).await
        {
            opt = opt.emoji(serenity::ReactionType::Custom {
                animated: false,
                id: serenity::EmojiId::new(id),
                name: Some(name),
            });
        }
        if Some(help_cat_key(&c.title).as_str()) == selected {
            opt = opt.default_selection(true);
        }
        options.push(opt);
    }
    let placeholder = if total > 1 {
        format!("{} (Page {}/{total})", t("help_select_menu"), page + 1)
    } else {
        t("help_select_menu")
    };
    let select = serenity::CreateSelectMenu::new(
        format!("{HELP_SELECT_PREFIX}{page}"),
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder);
    let mut components = vec![serenity::CreateActionRow::SelectMenu(select)];
    if total > 1 {
        let prev = serenity::CreateButton::new(format!("{HELP_PREV_ID}:{page}"))
            .label("◀ Previous")
            .style(serenity::ButtonStyle::Primary)
            .disabled(page == 0);
        let ind = serenity::CreateButton::new("help_page_indicator")
            .label(format!("{}/{}", page + 1, total))
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true);
        let next = serenity::CreateButton::new(format!("{HELP_NEXT_ID}:{page}"))
            .label("Next ▶")
            .style(serenity::ButtonStyle::Primary)
            .disabled(page + 1 >= total);
        components.push(serenity::CreateActionRow::Buttons(vec![prev, ind, next]));
    }
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(components),
            ),
        )
        .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fexini_gate_matches_ts() {
        let ad = fexini_ad_for_locale("fr").expect("fr guilds get the ad");
        assert!(ad.contains("https://fexini.tv/"));
        assert!(ad.contains(":pushpin:"));
        // TS early-returns on any non-fr preferredLocale (strict equality).
        assert_eq!(fexini_ad_for_locale("en-US"), None);
        assert_eq!(fexini_ad_for_locale("FR"), None);
        assert_eq!(fexini_ad_for_locale(""), None);
    }

    #[test]
    fn meme_helpers_match_ts() {
        // fr-only gate (strict equality like the TS early return).
        assert!(meme_fr_ok("fr"));
        assert!(!meme_fr_ok("en-US"));
        assert!(!meme_fr_ok(""));
        // Template substitution: {var} first-only, rest replace-all.
        let out = kdenlive_substitute(
            "{v} a {v} b overlay.png overlay.png",
            ("{v}", "DIR"),
            &[("overlay.png", "OUT.png")],
        );
        assert_eq!(out, "DIR a {v} b OUT.png OUT.png");
        // 90s per-user media_manipulation cooldown.
        assert!(meme_cooldown_ok(1_000, 7));
        assert!(!meme_cooldown_ok(2_000, 7));
        assert!(meme_cooldown_ok(91_001, 7));
        assert!(meme_cooldown_ok(1_000, 8));
        // Asset dir mirrors cwd/src/assets/<name>.
        assert!(meme_assets_dir("kawaeine").ends_with("src/assets/kawaeine"));
    }

    #[test]
    fn quoi_trigger() {
        assert!(is_quoi_bait("quoi"));
        assert!(is_quoi_bait("tu dis quoi"));
        assert!(is_quoi_bait("quoi?"));
        assert!(!is_quoi_bait("pourquoi pas"));
        assert!(!is_quoi_bait(""));
    }

    #[test]
    fn greeting_and_emoji_parse_match_ts() {
        assert!(is_greeting_word("hey there"));
        assert!(is_greeting_word("BONJOUR tout le monde"));
        assert!(!is_greeting_word("heyday"));
        assert!(!is_greeting_word(""));
        assert!(matches!(
            parse_react_emoji("👋"),
            serenity::ReactionType::Unicode(_)
        ));
        assert!(matches!(
            parse_react_emoji("<:wave:123>"),
            serenity::ReactionType::Custom { .. }
        ));
    }

    #[test]
    fn method_arg_parsing_matches_ts() {
        let args = vec!["a".to_string(), "12abc".to_string(), "-3".to_string()];
        assert_eq!(str_arg(&args, 0), Some("a"));
        assert_eq!(str_arg(&args, 9), None);
        assert_eq!(long_str_arg(&args, 1).as_deref(), Some("12abc -3"));
        assert_eq!(long_str_arg(&args, 9), None);
        assert_eq!(long_str_arg(&[], 0), None);
        assert_eq!(int_arg(&args, 1), 12);
        assert_eq!(int_arg(&args, 2), -3);
        assert_eq!(int_arg(&args, 0), 0);
        assert_eq!(int_arg(&args, 9), 0);
        assert!(is_number_str("42"));
        assert!(is_number_str("  -1.5e3  "));
        assert!(!is_number_str(""));
        assert!(!is_number_str("   "));
        assert!(!is_number_str("12abc"));
    }

    #[test]
    fn autofeur_table_matches_ts() {
        assert_eq!(autofeur_match("mdr"), Some("rigole pas trop stp"));
        assert_eq!(autofeur_match("  LOL  "), Some("t'as 40 ans ?"));
        assert_eq!(autofeur_match("tu dis quoi ?"), Some("feur"));
        assert_eq!(autofeur_match("hein?!"), Some("deux"));
        assert_eq!(
            autofeur_match("viens on baise."),
            Some("Vien par la petit coquinou je vais te defourailler sauvagement")
        );
        assert_eq!(
            autofeur_match("67"),
            Some("Six Seven dans la ch*tt€ à ta mère Mastu (faut avoir la référence...)")
        );
        assert_eq!(autofeur_match("hello world"), None);
        assert_eq!(autofeur_match("oklm"), None);
    }

    #[test]
    fn autofeur_gate_defaults_on() {
        assert!(autofeur_on(None));
        assert!(autofeur_on(Some("1".to_string())));
        assert!(!autofeur_on(Some("0".to_string())));
        assert!(!autofeur_on(Some("false".to_string())));
        assert!(!autofeur_on(Some("off".to_string())));
        assert!(autofeur_promo("<:VC_OpenChat:1>", "?").contains("`?autorespond`"));
    }

    #[test]
    fn exe_guard() {
        // Full TS blocklist, substring match, case-insensitive.
        for ext in BLOCKED_EXE_EXTS {
            assert!(
                is_blocked_exe_name(&format!("payload.{ext}")),
                "missed .{ext}"
            );
        }
        assert_eq!(BLOCKED_EXE_EXTS.len(), 21);
        assert!(has_blocked_exe(&["a.EXE".to_string()]));
        assert!(has_blocked_exe(&["x.bat".to_string()]));
        assert!(has_blocked_exe(&["archive.tar.gz".to_string()]));
        assert!(has_blocked_exe(&["setup.AppImage".to_string()]));
        assert!(has_blocked_exe(&["a.apk".to_string(), "b.png".to_string()]));
        assert!(!has_blocked_exe(&["a.png".to_string()]));
        assert!(!has_blocked_exe(&["notes.txt".to_string()]));
        assert!(!has_blocked_exe(&[]));
        // Bypass matrix mirrors the TS early return.
        assert!(antiexe_bypassed(true, false, false, false, false));
        assert!(antiexe_bypassed(false, true, false, false, false));
        assert!(antiexe_bypassed(false, false, true, false, false));
        assert!(antiexe_bypassed(false, false, false, true, false));
        assert!(antiexe_bypassed(false, false, false, false, true));
        assert!(!antiexe_bypassed(false, false, false, false, false));
        assert_eq!(ANTIEXE_TIMEOUT_SECS, 900);
        assert!(flag_on(Some("1".to_string())));
        assert!(flag_on(Some("true".to_string())));
        assert!(!flag_on(Some("0".to_string())));
        assert!(!flag_on(None));
    }

    #[test]
    fn newsletter_toggle_guild_parses() {
        assert_eq!(newsletter_toggle_guild("newsletter-toggle%123"), Some(123));
        assert_eq!(
            newsletter_toggle_guild("newsletter-toggle%123?dm"),
            Some(123)
        );
        assert_eq!(newsletter_toggle_guild("newsletter-toggle%"), None);
        assert_eq!(newsletter_toggle_guild("other%123"), None);
    }

    #[test]
    fn newsletter_toggle_roundtrip() {
        let (json, was) = toggle_newsletter_bl(None, "42");
        assert!(!was);
        assert_eq!(json, "{\"42\":true}");
        let (json, was) = toggle_newsletter_bl(Some(&json), "42");
        assert!(was);
        assert_eq!(json, "{}");
        let (json, was) = toggle_newsletter_bl(Some("not json"), "7");
        assert!(!was);
        assert_eq!(json, "{\"7\":true}");
    }

    #[test]
    fn perm_gate_suffix_matches_ts() {
        let perms = crate::executor::CmdPerms {
            users: vec!["9".to_string()],
            roles: vec!["5".to_string()],
            level: Some(3),
        };
        let mut names = std::collections::HashMap::new();
        names.insert("5".to_string(), "Mods".to_string());
        let s = perm_gate_suffix(&perms, &names, "🔐", "👑");
        assert_eq!(s, " 👑 Lv.3 🔐 @Mods 🔐 <@9>");
        let open = crate::executor::CmdPerms::default();
        assert_eq!(perm_gate_suffix(&open, &names, "🔐", "👑"), "");
    }

    #[test]
    fn helpall_key_shape() {
        assert_eq!(helpall_key(42), "HELPALL.42");
    }

    #[test]
    fn collect_help_cats_wires_desc_and_title() {
        let registry = [("bot", "ping", "pong")];
        let table = [(
            "bot",
            "help_bot_dsc",
            "help_bot_fields",
            "ECBDD_Badge",
            1u32,
        )];
        let cats = collect_help_cats(&registry, &table, &|k| format!("T:{k}"), "?");
        assert_eq!(cats.len(), 1);
        assert_eq!(cats[0].name, "bot");
        assert_eq!(cats[0].title, "T:help_bot_fields");
        assert_eq!(cats[0].desc, "T:help_bot_dsc");
        assert_eq!(
            cats[0].fields,
            vec![("`?ping`".to_string(), "pong".to_string())]
        );
    }

    #[test]
    fn help_browser_helpers_match_ts() {
        assert_eq!(HELP_CATEGORIES.len(), 26);
        let active = help_active_categories(&["bot", "utils", "nope"]);
        assert_eq!(active.len(), 2);
        let chunks = help_page_chunks(&(0usize..30).collect::<Vec<_>>());
        assert_eq!(chunks.len(), 2);
        assert_eq!(chunks[0].len(), 25);
        assert_eq!(help_cat_key("My Cats"), "my_cats");
        assert_eq!(helpmsg_key(7), "HELPMSG.7");
        // 24-field first page, suite continuation after.
        let fields: Vec<(String, String)> = (0..30)
            .map(|i| (format!("c{i}"), "d".to_string()))
            .collect();
        let pages = help_category_pages("T", "D", "F", 1, &fields, "(S)", "SD");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].title, "T");
        assert_eq!(pages[0].description, "D");
        assert_eq!(pages[0].color, 1);
        assert_eq!(pages[0].footer, "F");
        assert_eq!(pages[0].fields.len(), 24);
        assert_eq!(pages[1].title, "T (S) 1");
        assert_eq!(pages[1].description, "SD");
        assert_eq!(pages[1].fields.len(), 6);
        let one = help_category_pages("T", "D", "F", 1, &fields[..3], "(S)", "SD");
        assert_eq!(one.len(), 1);
        assert_eq!(one[0].title, "T");
    }

    #[test]
    fn help_categories_match_init_json() {
        // Mirrors HybridCommands/*/init.json (26 files): exact
        // categoryName/description/placeholder keys, incl. quirks
        // (invitesmanager dir -> "invitemanager", tag dir -> "tags").
        // guildconfig/newfeatures have no init.json on either side.
        assert_eq!(HELP_CATEGORIES.len(), 26);
        let by_name = |n: &str| {
            HELP_CATEGORIES
                .iter()
                .find(|(name, _, _, _, _)| *name == n)
                .unwrap_or_else(|| panic!("help row {n} missing"))
        };
        assert_eq!(by_name("invitemanager").1, "help_invitem_dsc");
        assert_eq!(by_name("invitemanager").2, "help_invitem_fields");
        assert_eq!(by_name("tags").1, "help_tags_dsc");
        assert_eq!(by_name("tags").2, "help_tags_fields");
        assert_eq!(by_name("membercount").1, "help_memberc_dsc");
        assert_eq!(by_name("moderation").1, "help_mod_dsc");
        assert_eq!(by_name("profil").1, "help_prof_dsc");
        assert_eq!(by_name("rolereactions").1, "help_roler_dsc");
        assert!(!HELP_CATEGORIES
            .iter()
            .any(|(n, _, _, _, _)| *n == "guildconfig"));
        assert!(!HELP_CATEGORIES
            .iter()
            .any(|(n, _, _, _, _)| *n == "newfeatures"));
    }
}

pub mod add_react;
pub mod antiexe;
pub mod autofeur;
pub mod fexini;
pub mod help;
pub mod help_browser;
pub mod help_main;
pub mod helpall;
pub mod info;
pub mod kawaeine;
pub mod langstats;
pub mod list_react;
pub mod memes;
pub mod nitrofdp;
pub mod rap_vs_reality;
pub mod react;
pub mod remove_react;
pub mod securewebhook;
pub mod shardinfo;
pub mod status_embed;
pub mod two_sides;
pub mod updates;
pub mod welcomer;

/// Old registry path (`legacy::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::add_react::*;
    pub use super::antiexe::*;
    pub use super::autofeur::*;
    pub use super::fexini::*;
    pub use super::help_browser::*;
    pub use super::help_main::*;
    pub use super::helpall::*;
    pub use super::kawaeine::*;
    pub use super::langstats::*;
    pub use super::list_react::*;
    pub use super::nitrofdp::*;
    pub use super::rap_vs_reality::*;
    pub use super::remove_react::*;
    pub use super::securewebhook::*;
    pub use super::shardinfo::*;
    pub use super::status_embed::*;
    pub use super::two_sides::*;
    pub use super::updates::*;
    pub use super::welcomer::*;
    pub use super::*;
}
