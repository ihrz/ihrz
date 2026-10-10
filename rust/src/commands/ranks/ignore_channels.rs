use super::*;
use poise::serenity_prelude as serenity;

/// Table-first ignore-list load with legacy key fallback
/// (`GUILD.XP_LEVELING.bypassChannels`, legacy `GUILD.RANKS.ignoreChannels`).
/// A legacy hit promotes into the new key so rows migrate lazily; pair
/// with `save_ignore_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_ignore_routed(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    super::migrated_get(
        pool,
        guild_id,
        super::GUILD_BYPASS_NEW,
        &[super::GUILD_BYPASS_OLD],
    )
    .await
    .and_then(|s| serde_json::from_str(&s).ok())
    .unwrap_or_default()
}

/// Ignore-list store on the new key with legacy dual-write (keys migrated).
pub async fn save_ignore_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    list: &[String],
) -> anyhow::Result<()> {
    super::migrated_set(
        pool,
        guild_id,
        super::GUILD_BYPASS_NEW,
        &[super::GUILD_BYPASS_OLD],
        &serde_json::to_string(list)?,
    )
    .await
}

/// Parse one channel token: a `<#id>` mention or a raw channel id.
/// Returns the id on success.
pub fn parse_ignore_channel_token(token: &str) -> Option<String> {
    let t = token.trim().trim_start_matches("<#").trim_end_matches('>');
    let t = t.trim();
    if t.is_empty() || !t.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let id: u64 = t.parse().ok()?;
    if id == 0 {
        return None;
    }
    Some(id.to_string())
}

/// Split a comma-separated channel list (`<#id>`, raw ids, commas
/// and/or whitespace separated) into channel ids, deduplicated in
/// first-seen order. Mirrors the TS multi channel-select panel
/// (`!ignore-channels.ts`, `setMaxValues(25)`).
pub fn parse_ignore_channel_list(raw: &str) -> Vec<String> {
    let mut out = Vec::new();
    for token in raw.split([',', ' ', '\t', '\n']) {
        if let Some(id) = parse_ignore_channel_token(token) {
            if !out.contains(&id) {
                out.push(id);
            }
        }
    }
    out
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-add",
    default_member_permissions = "ADMINISTRATOR"
)]
// One channel per call (toggle), plus an optional comma-separated
// channel list (toggle each, in order). Mirrors the TS multi
// channel-select panel (`!ignore-channels.ts:78-87,125-145`,
// `setMaxValues(25)`); poise 0.6 registers `Vec<T>` slash params as
// a single optional option (0-or-1 values, no multi-select parity),
// so extra channels ride a comma-separated string — repeat per
// channel or pass several at once.
pub async fn ranks_ignore_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "More channels, comma-separated"] more: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut ids = vec![channel.id.get().to_string()];
    if let Some(raw) = more.as_deref() {
        for id in parse_ignore_channel_list(raw) {
            if !ids.contains(&id) {
                ids.push(id);
            }
        }
    }
    let mut list = load_ignore_routed(&ctx.data().pool, &gid).await;
    let mut outcomes: Vec<(String, bool)> = Vec::new();
    for id in &ids {
        let (next, added) = toggle_ignore(list, id);
        list = next;
        outcomes.push((id.clone(), added));
    }
    save_ignore_routed(&ctx.data().pool, &gid, &list).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if outcomes.len() == 1 {
        let added = outcomes[0].1;
        ctx.say(if added {
            crate::lang::get(&code, "msg_ignore_channel_added")
                .unwrap_or_else(|| "Ignore channel added.".to_string())
        } else {
            crate::lang::get(&code, "msg_ignore_channel_removed")
                .unwrap_or_else(|| "Ignore channel removed.".to_string())
        })
        .await?;
        return Ok(());
    }
    let lines = outcomes
        .iter()
        .map(|(id, added)| {
            let word = if *added {
                crate::lang::get(&code, "msg_ignore_channel_added")
                    .unwrap_or_else(|| "Ignore channel added.".to_string())
            } else {
                crate::lang::get(&code, "msg_ignore_channel_removed")
                    .unwrap_or_else(|| "Ignore channel removed.".to_string())
            };
            format!("<#{id}>: {word}")
        })
        .collect::<Vec<_>>()
        .join("\n");
    ctx.say(lines).await?;
    Ok(())
}

/// List ignored channels.
// The TS `ignore-channels` panel (`ranks.ts:333-348`) requires
// Administrator for the whole panel (view included), so this leaf
// carries the same gate.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-list",
    aliases("ignore", "ranks-ignore-channels"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_ignore_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let list = load_ignore_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "msg_ignore_channels_empty")
            .unwrap_or_else(|| "No ignored channels.".to_string())
    } else {
        let channels = list
            .iter()
            .map(|id| format!("<#{id}>"))
            .collect::<Vec<_>>()
            .join(", ");
        crate::lang::get(&code, "msg_ignore_channels_list")
            .map(|s| s.replace("${channels}", &channels))
            .unwrap_or_else(|| format!("Ignored channels: {channels}."))
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{load_ignore_routed, parse_ignore_channel_list, save_ignore_routed};

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn comma_separated_channel_list_parses_mentions_and_ids() {
        assert_eq!(
            parse_ignore_channel_list("<#123>,456"),
            vec!["123".to_string(), "456".to_string()]
        );
        assert_eq!(
            parse_ignore_channel_list("  <#7> , 8 ,bogus, ,0"),
            vec!["7".to_string(), "8".to_string()]
        );
        // Duplicates collapse, first-seen order kept.
        assert_eq!(parse_ignore_channel_list("9,9,<#9>"), vec!["9".to_string()]);
        assert!(parse_ignore_channel_list("").is_empty());
        assert!(parse_ignore_channel_list("abc").is_empty());
    }

    #[tokio::test]
    async fn legacy_key_reads_and_promotes_to_new_key() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.ignoreChannels", r#"["7"]"#)
            .await
            .unwrap();
        assert_eq!(load_ignore_routed(&pool, "g").await, vec!["7".to_string()]);
        assert!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.bypassChannels")
                .await
                .is_some()
        );
        assert!(load_ignore_routed(&pool, "g9").await.is_empty());
    }

    #[tokio::test]
    async fn new_key_wins_over_legacy_on_conflict() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.ignoreChannels", r#"["7"]"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.bypassChannels", r#"["8"]"#)
            .await
            .unwrap();
        assert_eq!(load_ignore_routed(&pool, "g").await, vec!["8".to_string()]);
    }

    #[tokio::test]
    async fn save_dual_writes_new_and_legacy_keys() {
        let pool = mem_pool().await;
        save_ignore_routed(&pool, "g", &["7".to_string()])
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.bypassChannels")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.ignoreChannels")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
    }
}
