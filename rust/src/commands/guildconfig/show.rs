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
pub fn show_field_name(key: &str) -> &str {
    match key {
        "GUILD.GUILD_CONFIG.joinmessage" => "Join message",
        "GUILD.GUILD_CONFIG.leavemessage" => "Leave message",
        "GUILD.GUILD_CONFIG.join" => "Join channel",
        "GUILD.GUILD_CONFIG.leave" => "Leave channel",
        "GUILD.GUILD_CONFIG.joinroles" => "Join roles",
        "GUILD.GUILD_CONFIG.joindm" => "Join DM",
        _ => key,
    }
}

/// Format one stored value. Page-1 keys mirror the TS field bodies;
/// anything else renders truncated raw JSON (or "Not set").
pub fn show_format_value(key: &str, raw: Option<&str>) -> String {
    const NOT_SET: &str = "Not set";
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
            None => NOT_SET.to_string(),
        },
        "GUILD.GUILD_CONFIG.join" | "GUILD.GUILD_CONFIG.leave" => match raw
            .map(|s| s.trim().trim_matches('"').to_string())
            .filter(|s| !s.is_empty())
        {
            Some(id) => format!("<#{id}>"),
            None => NOT_SET.to_string(),
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
                NOT_SET.to_string()
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
                "Blocked".to_string()
            } else {
                "Allowed".to_string()
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
            _ => NOT_SET.to_string(),
        },
    }
}

/// Build the embed fields for one page (1-based, clamped) from the
/// full kv map. Pure for testability.
pub fn show_page_fields(
    page: usize,
    doc: &serde_json::Map<String, serde_json::Value>,
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
                show_field_name(key).to_string(),
                show_format_value(key, raw_text.as_deref()),
                false,
            )
        })
        .collect()
}

/// Show the guild config profile (6 pages).
// Sectioned view mirroring guildconfig `!show.ts:63-273` (6
// `generateEmbedForFields` pages, colour `#016c9a`). The `page`
// option replaces the TS `<<<` / `>>>` collector.
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
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND (key_name LIKE 'GUILD.%' OR key_name LIKE 'UTILS.%' OR key_name LIKE 'COUNTER.%' OR key_name LIKE 'PFPS%' OR key_name LIKE 'SECURITY%' OR key_name LIKE 'VOICE%')",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if rows.is_empty() {
        ctx.say(
            crate::lang::get(&code, "msg_guildconfig_show_empty")
                .unwrap_or_else(|| "No config stored.".to_string()),
        )
        .await?;
        return Ok(());
    }
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
    for (name, value, inline) in show_page_fields(page, &doc) {
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
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.join", Some("123")),
            "<#123>"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.join", Some("\"123\"")),
            "<#123>"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.join", None),
            "Not set"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.joinroles", Some("[\"1\",\"2\"]")),
            "<@&1>, <@&2>"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.joinroles", Some("[]")),
            "Not set"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.joinmessage", Some("hi")),
            "```hi```"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.antipub", Some("on")),
            "Blocked"
        );
        assert_eq!(
            show_format_value("GUILD.GUILD_CONFIG.antipub", Some("off")),
            "Allowed"
        );
    }

    #[test]
    fn page_fields_clamp_and_read_doc() {
        let mut doc = serde_json::Map::new();
        doc.insert(
            "GUILD.GUILD_CONFIG.join".to_string(),
            serde_json::Value::String("42".to_string()),
        );
        let fields = show_page_fields(99, &doc);
        // Clamped to page 6 (5 fields).
        assert_eq!(fields.len(), 5);
        let fields = show_page_fields(1, &doc);
        assert_eq!(fields.len(), 6);
        let join = fields.iter().find(|(n, _, _)| n == "Join channel").unwrap();
        assert_eq!(join.1, "<#42>");
    }
}
