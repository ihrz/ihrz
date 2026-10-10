use super::*;
use poise::serenity_prelude as serenity;
use std::collections::BTreeMap;

/// Canonical TS shape (`DbGuildAutoReact`): `{channelId: emoji | emoji[]}`.
/// Single strings normalize to one-element arrays on read, exactly like the
/// TS hybrid command does.
pub type AutoreactMap = BTreeMap<String, Vec<String>>;

fn normalize_value(v: &serde_json::Value) -> Option<Vec<String>> {
    match v {
        serde_json::Value::String(s) => Some(vec![s.clone()]),
        serde_json::Value::Array(arr) => {
            let out: Vec<String> = arr
                .iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect();
            Some(out)
        }
        _ => None,
    }
}

fn fold_list_shape(list: &[serde_json::Value]) -> AutoreactMap {
    let mut map: AutoreactMap = BTreeMap::new();
    for entry in list {
        let (Some(channel), Some(emoji)) = (
            entry.get("channelId").and_then(|c| c.as_str()),
            entry.get("emoji").and_then(|e| e.as_str()),
        ) else {
            continue;
        };
        let reactions = map.entry(channel.to_string()).or_default();
        if !reactions.iter().any(|e| e == emoji) {
            reactions.push(emoji.to_string());
        }
    }
    map
}

/// Parse any known stored shape into the canonical map: the TS nested map,
/// single-string values, or pre-recode list rows (`[{channelId, emoji}]`).
fn parse_autoreact_map(raw: &str) -> AutoreactMap {
    if let Ok(mixed) = serde_json::from_str::<BTreeMap<String, serde_json::Value>>(raw) {
        return mixed
            .into_iter()
            .filter_map(|(k, v)| normalize_value(&v).map(|emojis| (k, emojis)))
            .collect();
    }
    if let Ok(list) = serde_json::from_str::<Vec<serde_json::Value>>(raw) {
        return fold_list_shape(&list);
    }
    BTreeMap::new()
}

pub async fn save_autoreact_map_routed(
    pool: &crate::db::Pool,
    gid: &str,
    map: &AutoreactMap,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        gid,
        gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(map)?,
    )
    .await
}

/// Table-first read of the TS nested map with legacy fallback. List-shaped
/// rows are migrated to the map shape and persisted back.
pub async fn load_autoreact_map_routed(pool: &crate::db::Pool, gid: &str) -> AutoreactMap {
    let Some(raw) =
        crate::commands::owner::main::routed_get(pool, gid, gid, "GUILD.AUTOREACT").await
    else {
        return BTreeMap::new();
    };
    let map = parse_autoreact_map(&raw);
    if serde_json::from_str::<Vec<serde_json::Value>>(&raw).is_ok() {
        let _ = save_autoreact_map_routed(pool, gid, &map).await;
    }
    map
}

/// Reactions for one channel. Mirrors `Events/guildconfig/autoreact.ts`
/// (`GUILD.AUTOREACT.{channelId}`, string or array).
pub async fn reactions_for_channel_routed(
    pool: &crate::db::Pool,
    gid: &str,
    channel_id: &str,
) -> Vec<String> {
    load_autoreact_map_routed(pool, gid)
        .await
        .get(channel_id)
        .cloned()
        .unwrap_or_default()
}

/// Channel ids, numeric-descending like the TS config embed.
pub fn sorted_channel_ids(map: &AutoreactMap) -> Vec<String> {
    let mut ids: Vec<String> = map.keys().cloned().collect();
    ids.sort_by(
        |a, b| match (a.parse::<i64>().ok(), b.parse::<i64>().ok()) {
            (Some(x), Some(y)) => y.cmp(&x),
            _ => b.cmp(a),
        },
    );
    ids
}

/// Sent specified emoji when new message in specified channel
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Emoji"] emoji: String,
) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Empty input is rejected here (TS lets an empty modal string through
    // and stores it; the strict check is intentional — an empty reaction
    // can never fire). Length cap mirrors the TS modal `maxLength: 200`.
    if emoji.is_empty()
        || emoji.chars().count() > 200
        || (!crate::funcs::is_single_emoji(&emoji) && !crate::funcs::is_discord_emoji(&emoji))
    {
        ctx.say(
            crate::lang::get(&code, "autoreact_invalid_emoji")
                .unwrap_or_else(|| "Invalid emoji. Please enter a valid emoji.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut map = load_autoreact_map_routed(&ctx.data().pool, &gid).await;
    // Mirrors the TS 25-channel cap on add (`currentValues.length >= 25`
    // refuses even when the channel already has reactions — no update
    // path exists in TS, so at-cap always denies).
    if map.len() >= 25 {
        ctx.say(
            crate::lang::get(&code, "autoreact_max_25")
                .unwrap_or_else(|| "Maximum of 25 autoreact configurations.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let reactions = map.entry(channel.id.get().to_string()).or_default();
    if !reactions.iter().any(|e| e == &emoji) {
        reactions.push(emoji);
    }
    save_autoreact_map_routed(&ctx.data().pool, &gid, &map).await?;
    ctx.say(
        crate::lang::get(&code, "autoreact_add_command_ok")
            .unwrap_or_else(|| "The autoreact configuration has been set.".to_string()),
    )
    .await?;
    Ok(())
}

/// One 5-per-page slice of the desc-sorted channel list (TS
/// `itemsPerPage = 5`, `parseInt(levelB) - parseInt(levelA)` order).
/// Pure so the paging math is unit-testable; page is 1-based.
pub fn autoreact_list_page(ids: &[String], page: usize) -> &[String] {
    let page = page.max(1);
    let start = (page - 1) * 5;
    if start >= ids.len() {
        return &[];
    }
    let end = (start + 5).min(ids.len());
    &ids[start..end]
}

/// Autoreact list command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact_list(
    ctx: Ctx<'_>,
    #[description = "Page number"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let map = load_autoreact_map_routed(&ctx.data().pool, &gid).await;
    let title = crate::lang::get(&code, "autoreact_embed_title")
        .unwrap_or_else(|| "Autoreact Configuration".to_string());
    if map.is_empty() {
        let desc = crate::lang::get(&code, "autoreact_embed_autofields_none_value")
            .unwrap_or_else(|| "No autoreact configurations set.".to_string());
        let embed = serenity::CreateEmbed::default()
            .colour(serenity::Colour::BLURPLE)
            .title(title)
            .description(desc);
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
        return Ok(());
    }
    // TS paginates 5 per page, numeric-descending, with a footer
    // (`Page x of y`). Poise subcommands have no button collector, so
    // the page arrives as an argument (default 1, clamped).
    let ids = sorted_channel_ids(&map);
    let total_pages = ((ids.len() + 4) / 5).max(1);
    let want = page.unwrap_or(1).max(1) as usize;
    let cur = want.min(total_pages);
    let value_tpl = crate::lang::get(&code, "autoreact_embed_autofields_value")
        .unwrap_or_else(|| "Reaction: ${reaction}".to_string());
    let unknown = crate::lang::get(&code, "var_unknown").unwrap_or_else(|| "Unknown".to_string());
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::BLURPLE)
        .title(title);
    for id in autoreact_list_page(&ids, cur) {
        let name = match ctx.guild() {
            Some(g) => g
                .channels
                .get(&serenity::ChannelId::new(id.parse().unwrap_or(0)))
                .map(|c| format!("<#{}>", c.id.get()))
                .unwrap_or_else(|| unknown.clone()),
            // Uncached guild: fall back to a raw mention (no cache read).
            None => format!("<#{id}>"),
        };
        let value = value_tpl.replace(
            "${reaction}",
            &map.get(id).map(|e| e.join(" ")).unwrap_or_default(),
        );
        embed = embed.field(name, value, false);
    }
    let footer = crate::lang::get(&code, "autoreact_embed_footer")
        .unwrap_or_else(|| {
            "Page ${currentPage} of ${totalPage} • Total Ranks: ${totalReact}".to_string()
        })
        .replace("${currentPage}", &cur.to_string())
        .replace("${totalPage}", &total_pages.to_string())
        .replace("${totalReact}", &ids.len().to_string());
    ctx.send(
        poise::CreateReply::default().embed(embed.footer(serenity::CreateEmbedFooter::new(footer))),
    )
    .await?;
    Ok(())
}

/// Autoreact remove command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact_remove(
    ctx: Ctx<'_>,
    #[description = "Index (from autoreact-list, 1-based)"] index: i64,
) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut map = load_autoreact_map_routed(&ctx.data().pool, &gid).await;
    // Index-based removal is intentional: TS removes via a select menu
    // over the same desc-sorted entries, and poise subcommands have no
    // component collector — the 1-based index addresses the position in
    // the `autoreact-list` page-1 view (`sorted_channel_ids` order).
    let ids = sorted_channel_ids(&map);
    let i = index as usize;
    if i == 0 || i > ids.len() {
        ctx.say(
            crate::lang::get(&code, "msg_bad_index").unwrap_or_else(|| "Bad index.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Mirrors the TS remove flow: the whole channel entry goes.
    map.remove(&ids[i - 1]);
    save_autoreact_map_routed(&ctx.data().pool, &gid, &map).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "autoreact_remove_command_ok").unwrap_or_else(|| {
            "The autoreact configuration for this channel has been removed.".to_string()
        }),
    )
    .await?;
    Ok(())
}

/// Greeting-reaction switch (the real `toggle-react` feature).
// TS stores it at GUILD.GUILD_CONFIG.hey_reaction, never under
// GUILD.AUTOREACT: the old GUILD.AUTOREACT.enabled key was phantom, so it
// is gone and `autoreact_enabled_routed` below is an always-on shim.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-toggle",
    aliases("toggle-react", "react-toggle", "togglereact", "reacttoggle"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn gc_autoreact_toggle(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.GUILD_CONFIG.hey_reaction",
        if enabled { "true" } else { "false" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let active_msg = if enabled {
        crate::lang::get(&code, "toggle_react_react").unwrap_or_else(|| "react".to_string())
    } else {
        crate::lang::get(&code, "toggle_react_doesnt_react")
            .unwrap_or_else(|| "no longer react".to_string())
    };
    let member_id = ctx.author().id.get().to_string();
    ctx.say(
        crate::lang::get(&code, "toggle_react_command_work")
            .map(|s| {
                s.replace("{activeMsg}", &active_msg)
                    .replace("${interaction.member?.id}", &member_id)
            })
            .unwrap_or_else(|| {
                if enabled {
                    "Autoreacts on.".to_string()
                } else {
                    "Autoreacts off.".to_string()
                }
            }),
    )
    .await?;
    Ok(())
}

/// Table-first autoreact list read with legacy fallback, kept for the
/// message-create emitter: same key (`GUILD.AUTOREACT`), derived as a
/// list view over the TS nested map so pre-recode list rows resolve too.
pub async fn load_autoreact_routed(pool: &crate::db::Pool, gid: &str) -> Vec<serde_json::Value> {
    let map = load_autoreact_map_routed(pool, gid).await;
    let mut list = Vec::new();
    for id in sorted_channel_ids(&map) {
        if let Some(emojis) = map.get(&id) {
            for emoji in emojis {
                list.push(serde_json::json!({"channelId": id, "emoji": emoji}));
            }
        }
    }
    list
}

/// Deprecated shim: TS `Events/guildconfig/autoreact.ts` has no master
/// switch (a configured channel always fires), so this is always on.
/// Kept so the emitter gate compiles while the phantom
/// `GUILD.AUTOREACT.enabled` key stays dead.
pub async fn autoreact_enabled_routed(_pool: &crate::db::Pool, _gid: &str) -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn list_page_slices_five_per_desc_page() {
        let ids: Vec<String> = (1..=7).map(|i| i.to_string()).collect();
        assert_eq!(
            autoreact_list_page(&ids, 1),
            &[
                "1".to_string(),
                "2".to_string(),
                "3".to_string(),
                "4".to_string(),
                "5".to_string()
            ]
        );
        assert_eq!(
            autoreact_list_page(&ids, 2),
            &["6".to_string(), "7".to_string()]
        );
        assert!(autoreact_list_page(&ids, 3).is_empty());
        assert_eq!(autoreact_list_page(&ids, 0).len(), 5);
        let empty: Vec<String> = vec![];
        assert!(autoreact_list_page(&empty, 1).is_empty());
    }

    #[test]
    fn parse_covers_map_single_string_and_list_shapes() {
        let map = parse_autoreact_map(r#"{"1": ["a", "c"], "2": "b"}"#);
        assert_eq!(
            map.get("1").unwrap(),
            &vec!["a".to_string(), "c".to_string()]
        );
        assert_eq!(map.get("2").unwrap(), &vec!["b".to_string()]);
        let migrated = parse_autoreact_map(r#"[{"channelId": "1", "emoji": "a"}]"#);
        assert_eq!(migrated.get("1").unwrap(), &vec!["a".to_string()]);
        assert!(parse_autoreact_map("0").is_empty());
    }

    #[tokio::test]
    async fn autoreact_write_routes_nested_map_to_table_and_legacy() {
        let pool = memory_pool().await;
        let mut map: AutoreactMap = BTreeMap::new();
        map.insert("1".to_string(), vec!["a".to_string(), "c".to_string()]);
        save_autoreact_map_routed(&pool, "g1", &map).await.unwrap();
        let routed = crate::commands::owner::main::routed_get(&pool, "g1", "g1", "GUILD.AUTOREACT")
            .await
            .unwrap();
        let doc: serde_json::Value = serde_json::from_str(&routed).unwrap();
        assert_eq!(doc.pointer("/1").unwrap(), &serde_json::json!(["a", "c"]));
        let legacy = crate::db::kv_get(&pool, "g1", "GUILD.AUTOREACT")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            serde_json::json!({"1": ["a", "c"]})
        );
        assert_eq!(
            reactions_for_channel_routed(&pool, "g1", "1").await,
            vec!["a".to_string(), "c".to_string()]
        );
        assert!(reactions_for_channel_routed(&pool, "g1", "9")
            .await
            .is_empty());
        // List view still feeds the emitter helper.
        assert_eq!(
            crate::commands::guildconfig::autoreact_for_channel(
                &load_autoreact_routed(&pool, "g1").await,
                "1"
            ),
            vec!["a".to_string(), "c".to_string()]
        );
        assert!(load_autoreact_routed(&pool, "g2").await.is_empty());
    }

    #[tokio::test]
    async fn autoreact_list_shaped_legacy_row_migrates_to_map() {
        let pool = memory_pool().await;
        crate::db::kv_set(
            &pool,
            "g1",
            "GUILD.AUTOREACT",
            &serde_json::json!([
                {"channelId": "2", "emoji": "b"},
                {"channelId": "2", "emoji": "b"},
                {"channelId": "2", "emoji": "d"},
            ])
            .to_string(),
        )
        .await
        .unwrap();
        assert_eq!(
            reactions_for_channel_routed(&pool, "g1", "2").await,
            vec!["b".to_string(), "d".to_string()]
        );
        // Migration persisted the map shape back over the legacy row.
        let legacy = crate::db::kv_get(&pool, "g1", "GUILD.AUTOREACT")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            serde_json::json!({"2": ["b", "d"]})
        );
    }

    #[tokio::test]
    async fn autoreact_switch_is_gone_and_single_string_normalizes() {
        let pool = memory_pool().await;
        assert!(autoreact_enabled_routed(&pool, "g1").await);
        crate::db::kv_set(&pool, "g1", "GUILD.AUTOREACT", r#"{"3": "z"}"#)
            .await
            .unwrap();
        assert_eq!(
            reactions_for_channel_routed(&pool, "g1", "3").await,
            vec!["z".to_string()]
        );
        // Phantom key is never written anymore.
        let phantom = crate::db::kv_get(&pool, "g1", "GUILD.AUTOREACT.enabled").await;
        assert_eq!(phantom, None);
    }
}
