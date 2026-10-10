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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !crate::funcs::is_single_emoji(&emoji) && !crate::funcs::is_discord_emoji(&emoji) {
        ctx.say(
            crate::lang::get(&code, "autoreact_invalid_emoji")
                .unwrap_or_else(|| "Invalid emoji. Please enter a valid emoji.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut map = load_autoreact_map_routed(&ctx.data().pool, &gid).await;
    // Mirrors the TS 25-channel cap on add.
    if map.len() >= 25 && !map.contains_key(&channel.id.get().to_string()) {
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

#[poise::command(
    slash_command,
    prefix_command,
    rename = "autoreact-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_autoreact_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let map = load_autoreact_map_routed(&ctx.data().pool, &gid).await;
    ctx.say(if map.is_empty() {
        crate::lang::get(&code, "autoreact_remove_not_found")
            .unwrap_or_else(|| "No autoreact configurations set.".to_string())
    } else {
        sorted_channel_ids(&map)
            .iter()
            .map(|id| {
                format!(
                    "<#{}> {}",
                    id,
                    map.get(id).map(|e| e.join(" ")).unwrap_or_default()
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

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
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut map = load_autoreact_map_routed(&ctx.data().pool, &gid).await;
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
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
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
