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
    category = "guildconfig",
    rename = "autoreact",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Envoyer un emoji spécifié lorsqu'un nouveau message est envoyé dans un canal spécifié"
    ),
    description_localized("ja", "指定チャンネルの新規メッセージに指定絵文字を送信"),
    description_localized("ru", "Отправить эмодзи при новом сообщении в канале"),
    description_localized(
        "es-ES",
        "Enviar emoji especificado cuando haya nuevo mensaje en el canal especificado"
    )
)]
pub async fn gc_autoreact(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    // TS declares zero slash options: channel/emoji are picked via
    // channel-select + modal collectors, so this command only renders
    // the dashboard (first page of the desc-sorted channel list, like
    // `createRankRolesEmbed(currentPage = 0)`).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let map = load_autoreact_map_routed(pool, &gid).await;
    let ids = sorted_channel_ids(&map);
    let page = autoreact_list_page(&ids, 1);
    let title =
        crate::lang::get(&code, "autoreact_embed_title").unwrap_or_else(|| "Autoreact".to_string());
    let desc = crate::lang::get(&code, "autoreact_embed_desc").unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::BLURPLE)
        .title(title)
        .description(desc);
    if page.is_empty() {
        let name = crate::lang::get(&code, "var_no_set").unwrap_or_else(|| "Not set".to_string());
        let value =
            crate::lang::get(&code, "autoreact_embed_autofields_none_value").unwrap_or_default();
        embed = embed.field(name, value, false);
    } else {
        for id in page {
            let reactions = map.get(id).cloned().unwrap_or_default().join(" ");
            let value = crate::lang::get(&code, "autoreact_embed_autofields_value")
                .map(|t| t.replace("${reaction}", &reactions))
                .unwrap_or(reactions);
            embed = embed.field(format!("<#{id}>"), value, false);
        }
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Pure toggle for the greeting-reaction switch. Mirrors
/// `@toggle-react.ts` (`set(hey_reaction, !state)`): a missing key
/// reads as disabled, so the first toggle writes `true`.
pub fn toggle_hey_reaction_value(raw: Option<&str>) -> bool {
    !matches!(raw.map(|s| s.trim()), Some("true"))
}

/// Enable / Disable the reaction when user greets someone
#[poise::command(
    prefix_command,
    category = "guildconfig",
    rename = "toggle-react",
    aliases("react-toggle", "togglereact", "reacttoggle"),
    description_localized(
        "fr",
        "Activer/Désactiver la réaction lorsque l'utilisateur salue quelqu'un"
    ),
    description_localized("ja", "ユーザーが挨拶した時のリアクションを有効/無効"),
    description_localized("ru", "Включить/выключить реакцию при приветствии"),
    description_localized(
        "es-ES",
        "Habilitar / Deshabilitar la reacción cuando un usuario saluda a alguien"
    ),
    // @toggle-react.ts: permission ManageGuildExpressions.
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS"
)]
pub async fn gc_toggle_react(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let raw = crate::commands::owner::main::routed_get(
        pool,
        &gid,
        &gid,
        "GUILD.GUILD_CONFIG.hey_reaction",
    )
    .await;
    let next = toggle_hey_reaction_value(raw.as_deref());
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "GUILD.GUILD_CONFIG.hey_reaction",
        &next.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let active_msg = if next {
        crate::lang::get(&code, "toggle_react_react").unwrap_or_else(|| "react".to_string())
    } else {
        crate::lang::get(&code, "toggle_react_doesnt_react")
            .unwrap_or_else(|| "no longer react".to_string())
    };
    ctx.say(
        crate::lang::get(&code, "toggle_react_command_work")
            .map(|s| {
                s.replace("{activeMsg}", &active_msg).replace(
                    "${interaction.member?.id}",
                    &ctx.author().id.get().to_string(),
                )
            })
            .unwrap_or_else(|| {
                format!(
                    "<@{}>, now when a member sends a welcome message, the bot will **{active_msg}**",
                    ctx.author().id.get()
                )
            }),
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

    #[test]
    fn hey_reaction_toggle_mirrors_ts_negation() {
        // TS `!state`: missing/false -> true, true -> false.
        assert!(toggle_hey_reaction_value(None));
        assert!(toggle_hey_reaction_value(Some("false")));
        assert!(!toggle_hey_reaction_value(Some("true")));
        assert!(!toggle_hey_reaction_value(Some(" true ")));
    }

    #[tokio::test]
    async fn toggle_react_round_trips_through_routed_store() {
        let pool = memory_pool().await;
        let key = "GUILD.GUILD_CONFIG.hey_reaction";
        // Missing key enables first (TS `!undefined === true`)...
        let raw = crate::commands::owner::main::routed_get(&pool, "g1", "g1", key).await;
        assert!(raw.is_none());
        let next = toggle_hey_reaction_value(raw.as_deref());
        assert!(next);
        crate::commands::owner::main::routed_set(&pool, "g1", "g1", key, &next.to_string())
            .await
            .unwrap();
        // ...then disables (TS `!true === false`).
        let raw2 = crate::commands::owner::main::routed_get(&pool, "g1", "g1", key).await;
        assert_eq!(raw2.as_deref(), Some("true"));
        assert!(!toggle_hey_reaction_value(raw2.as_deref()));
    }
}
