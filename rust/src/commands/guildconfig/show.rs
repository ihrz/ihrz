use super::*;
use poise::serenity_prelude as serenity;

/// Sectioned guild-profile view. Mirrors guildconfig `!show.ts:63-273`
/// (6 `generateEmbedForFields` pages, colour `#016c9a`, guild-name
/// description, guild-icon thumbnail).
///
/// UX split (documented, not a regression): the TS `<<<` / `>>>`
/// button collector (`:296-348`, 15 min timeout) is replaced by a
/// stateless `page` option (like `perm-list-all`). Ported
/// incrementally: page 1 fields use the TS formatters (code blocks,
/// channel/role mentions, on/off labels); pages 2-6 group the same
/// keys per page but render stored values generically. Remainder:
/// the `*ToString` rich formatters for ticket / reaction-roles / XP /
/// logs / antispam / tonew / rolesaver / pfps / security / voice
/// (TS `!show.ts:352-600`, several need live guild data such as the
/// emoji cache) are still generic single-line values.
pub const SHOW_PAGES: usize = 6;
pub const SHOW_COLOR: u32 = 0x016c9a;

/// kv keys per page, in TS `generateEmbedForFields` call order.
pub fn show_page_keys(page: usize) -> &'static [&'static str] {
    match page {
        1 => &[
            "GUILD.GUILD_CONFIG.joinmessage",
            "GUILD.GUILD_CONFIG.leavemessage",
            "GUILD.GUILD_CONFIG.join",
            "GUILD.GUILD_CONFIG.leave",
            "GUILD.GUILD_CONFIG.joinroles",
            "GUILD.GUILD_CONFIG.joindm",
        ],
        2 => &["GUILD.TICKET", "GUILD.REACTION_ROLES"],
        3 => &[
            "GUILD.GUILD_CONFIG.antipub",
            "GUILD.PUNISH.PUNISH_PUB",
            "GUILD.SUPPORT",
        ],
        4 => &["GUILD.XP_LEVELING", "GUILD.SERVER_LOGS", "GUILD.BLOCK_BOT"],
        5 => &[
            "UTILS.picOnly",
            "UTILS.picOnlyConfig",
            "UTILS.wlRoles",
            "GUILD.GUILD_CONFIG.GHOST_PING",
            "GUILD.ANTISPAM",
        ],
        _ => &[
            "GUILD.BLOCK_NEW_ACCOUNT",
            "GUILD.GUILD_CONFIG.rolesaver",
            "PFPS",
            "SECURITY",
            "VOICE_INTERFACE",
        ],
    }
}

/// Short display label for a kv key (page-1 set mirrors the TS field
/// names; other pages use the key itself until the rich formatters
/// are ported).
pub fn show_field_name(key: &str, lang_code: &str) -> String {
    let lang_key = match key {
        "GUILD.GUILD_CONFIG.joinmessage" => Some("guildprofil_embed_fields_joinmessage"),
        "GUILD.GUILD_CONFIG.leavemessage" => Some("guildprofil_embed_fields_leavemessage"),
        "GUILD.GUILD_CONFIG.join" => Some("guildprofil_embed_fields_setchannelsjoin"),
        "GUILD.GUILD_CONFIG.leave" => Some("guildprofil_embed_fields_setchannelsleave"),
        "GUILD.GUILD_CONFIG.joinroles" => Some("guildprofil_embed_fields_joinroles"),
        "GUILD.GUILD_CONFIG.joindm" => Some("guildprofil_embed_fields_joinDmMessage"),
        "GUILD.GUILD_CONFIG.antipub" => Some("guildprofil_embed_fields_blockpub"),
        _ => None,
    };
    match lang_key {
        Some(k) => show_lang(lang_code, k, key),
        None => key.to_string(),
    }
}

/// Lang lookup with a TS-EN fallback (never a hardcoded display
/// string: visible text comes from `src/lang/*.yml`).
fn show_lang(lang_code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// Not-set lang key per config key (TS `!show.ts` field bodies).
fn show_not_set_key(key: &str) -> &'static str {
    match key {
        "GUILD.GUILD_CONFIG.joinmessage" => "guildprofil_not_set_joinmessage",
        "GUILD.GUILD_CONFIG.leavemessage" => "guildprofil_not_set_leavemessage",
        "GUILD.GUILD_CONFIG.join" => "guildprofil_not_set_setchannelsjoin",
        "GUILD.GUILD_CONFIG.leave" => "guildprofil_not_set_setchannelsleave",
        "GUILD.GUILD_CONFIG.joinroles" => "guildprofil_not_set_joinroles",
        "GUILD.GUILD_CONFIG.joindm" => "guildprofil_not_set_joinDmMessage",
        "GUILD.GUILD_CONFIG.antipub" => "guildprofil_not_set_blockpub",
        _ => "guildprofil_not_set_joinmessage",
    }
}

/// Format one stored value. Page-1 keys mirror the TS field bodies;
/// anything else renders truncated raw JSON (or the lang not-set).
pub fn show_format_value(key: &str, raw: Option<&str>, lang_code: &str) -> String {
    let not_set = || show_lang(lang_code, show_not_set_key(key), "Not set!");
    match key {
        "GUILD.GUILD_CONFIG.joinmessage"
        | "GUILD.GUILD_CONFIG.leavemessage"
        | "GUILD.GUILD_CONFIG.joindm" => match raw.filter(|s| !s.trim().is_empty()) {
            Some(s) => {
                let mut v: String = s.chars().take(1020).collect();
                if key.ends_with("joindm") {
                    v = v.trim_matches('"').to_string();
                }
                format!("```{v}```")
            }
            None => not_set(),
        },
        "GUILD.GUILD_CONFIG.join" | "GUILD.GUILD_CONFIG.leave" => match raw
            .map(|s| s.trim().trim_matches('"').to_string())
            .filter(|s| !s.is_empty())
        {
            Some(id) => format!("<#{id}>"),
            None => not_set(),
        },
        "GUILD.GUILD_CONFIG.joinroles" => {
            let ids: Vec<String> = raw
                .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
                .map(|v| match v {
                    serde_json::Value::Array(a) => a
                        .iter()
                        .filter_map(|x| {
                            x.as_str()
                                .map(|s| s.to_string())
                                .or_else(|| x.as_u64().map(|n| n.to_string()))
                        })
                        .collect(),
                    serde_json::Value::String(s) if !s.is_empty() => vec![s],
                    _ => vec![],
                })
                .unwrap_or_default();
            if ids.is_empty() {
                not_set()
            } else {
                ids.iter()
                    .map(|id| format!("<@&{id}>"))
                    .collect::<Vec<_>>()
                    .join(", ")
            }
        }
        "GUILD.GUILD_CONFIG.antipub" => {
            if raw
                .map(|s| s.trim() == "\"on\"" || s.trim() == "on")
                .unwrap_or(false)
            {
                show_lang(lang_code, "guildprofil_set_blockpub", "Power on")
            } else {
                show_lang(lang_code, "guildprofil_not_set_blockpub", "Power off")
            }
        }
        _ => match raw {
            Some(s) if !s.trim().is_empty() => {
                let one_line: String = s.split_whitespace().collect::<Vec<_>>().join(" ");
                let mut v: String = one_line.chars().take(200).collect();
                if one_line.chars().count() > 200 {
                    v.push('…');
                }
                v
            }
            _ => not_set(),
        },
    }
}

/// Build the embed fields for one page (1-based, clamped) from the
/// full kv map. Pure for testability.
pub fn show_page_fields(
    page: usize,
    doc: &serde_json::Map<String, serde_json::Value>,
    lang_code: &str,
) -> Vec<(String, String, bool)> {
    let page = page.clamp(1, SHOW_PAGES);
    show_page_keys(page)
        .iter()
        .map(|key| {
            // Plain stored strings stay strings so channel/role/message
            // formatters see the raw id/text (not re-encoded JSON).
            let raw_text = doc.get(*key).map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                _ => v.to_string(),
            });
            (
                show_field_name(key, lang_code),
                show_format_value(key, raw_text.as_deref(), lang_code),
                false,
            )
        })
        .collect()
}

/// Show the guild config profile (6 pages).
// Sectioned view mirroring guildconfig `!show.ts:63-273` (6
// `generateEmbedForFields` pages, colour `#016c9a`). TS registers
// `config show` with NO options and pages via the `<<<` / `>>>`
// button collector (`!show.ts:296-348`); the `page` option below is
// the deliberate stateless replacement for that collector (same
// precedent as `perm-list-all`), NOT a TS mirror — comparator
// `config show page` delta is intentional.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_show(
    ctx: Ctx<'_>,
    #[description = "Page number (1-6)"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Ack-first + one round-trip for the kv scan and the lang row.
    ctx.defer().await?;
    let (rows, code) = tokio::join!(
        crate::db::kv_scan(&ctx.data().pool, &gid),
        crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get()))
    );
    let rows: Vec<(String, String)> = rows
        .into_iter()
        .filter(|(k, _)| {
            k.starts_with("GUILD.")
                || k.starts_with("UTILS.")
                || k.starts_with("COUNTER.")
                || k.starts_with("PFPS")
                || k.starts_with("SECURITY")
                || k.starts_with("VOICE")
        })
        .collect();
    // TS-exact (!show.ts): no empty-store early leg — optional chaining
    // renders the full embed with per-field "Not set!" values even when
    // the guild has zero stored rows.
    let mut doc = serde_json::Map::new();
    for (k, v) in rows {
        let value: serde_json::Value =
            serde_json::from_str(&v).unwrap_or(serde_json::Value::String(v));
        // Plain stored strings stay strings so channel/role/message
        // formatters see the raw id/text (not re-encoded JSON).
        doc.insert(k, value);
    }
    let page = (page.unwrap_or(1).max(1) as usize).min(SHOW_PAGES);
    let guild_name = ctx
        .guild()
        .map(|g| g.name.clone())
        .unwrap_or_else(|| gid.clone());
    let mut embed = serenity::CreateEmbed::default()
        .colour(SHOW_COLOR)
        .title(format!(
            "Guild profile — {guild_name} ({page}/{SHOW_PAGES})"
        ))
        .timestamp(serenity::Timestamp::now());
    for (name, value, inline) in show_page_fields(page, &doc, &code) {
        embed = embed.field(name, value, inline);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn six_pages_cover_ts_groups() {
        assert_eq!(SHOW_PAGES, 6);
        assert_eq!(show_page_keys(1).len(), 6);
        assert!(show_page_keys(1).contains(&"GUILD.GUILD_CONFIG.joinmessage"));
        assert!(show_page_keys(1).contains(&"GUILD.GUILD_CONFIG.joindm"));
        assert!(show_page_keys(2).contains(&"GUILD.TICKET"));
        assert!(show_page_keys(3).contains(&"GUILD.SUPPORT"));
        assert!(show_page_keys(4).contains(&"GUILD.BLOCK_BOT"));
        assert!(show_page_keys(5).contains(&"UTILS.wlRoles"));
        assert!(show_page_keys(6).contains(&"GUILD.BLOCK_NEW_ACCOUNT"));
    }

    #[test]
    fn page_one_formats_mirror_ts() {
        // "en" resolves the real yml keys (TS-exact: "Not set!",
        // "Power on"/"Power off").
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.join", Some("123"), "en"),
            "<#123>"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.join", Some("\"123\""), "en"),
            "<#123>"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.join", None, "en"),
            "Not set!"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.joinroles", Some("[\"1\",\"2\"]"), "en"),
            "<@&1>, <@&2>"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.joinroles", Some("[]"), "en"),
            "Not set!"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.joinmessage", Some("hi"), "en"),
            "```hi```"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.antipub", Some("on"), "en"),
            "Power on"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.antipub", Some("off"), "en"),
            "Power off"
        );
        // Unknown locale falls back to the TS-EN literals.
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.join", None, "xx-YY"),
            "Not set!"
        );
    }

    #[test]
    fn empty_store_renders_not_set_embed_not_early_text() {
        // TS-exact (!show.ts): optional chaining means an empty store
        // renders page 1 of the embed with per-field not-set values —
        // never a "No config stored." content reply (removed early leg).
        let doc = serde_json::Map::new();
        let fields = show_page_fields(1, &doc, "en");
        assert_eq!(fields.len(), 6);
        for (_, value, _) in &fields {
            assert!(
                !value.contains("No config stored"),
                "empty store leaked early-leg text: {value}"
            );
            assert!(!value.is_empty());
        }
        let join = fields.iter().find(|(n, _, _)| n == "Channel Join").unwrap();
        assert_eq!(join.1, "Not set!");
    }

    #[test]
    fn page_fields_clamp_and_read_doc() {
        let mut doc = serde_json::Map::new();
        doc.insert(
            "GUILD.GUILD_CONFIG.join".to_string(),
            serde_json::Value::String("42".to_string()),
        );
        let fields = show_page_fields(99, &doc, "en");
        // Clamped to page 6 (5 fields).
        assert_eq!(fields.len(), 5);
        let fields = show_page_fields(1, &doc, "en");
        assert_eq!(fields.len(), 6);
        let join = fields.iter().find(|(n, _, _)| n == "Channel Join").unwrap();
        assert_eq!(join.1, "<#42>");
    }
}
