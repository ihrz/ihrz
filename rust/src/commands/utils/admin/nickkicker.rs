use super::*;

/// Nickname kicker config. Mirrors util !nick-kicker.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nick-kicker",
    aliases("nickkick", "nk"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nickkicker(
    ctx: Ctx<'_>,
    #[description = "Word to ban, or enable/disable (omit to list)"] word: Option<String>,
    #[description = "Word to remove"] remove: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.NICK_KICKER").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({"enabled": true, "words": []}));
    let words_of = |cfg: &serde_json::Value| -> Vec<String> {
        cfg.get("words")
            .and_then(|x| serde_json::from_value(x.clone()).ok())
            .unwrap_or_default()
    };
    // Status embed mirroring the TS panel (title, desc, enabled, words).
    let status_embed = |cfg: &serde_json::Value| {
        let words = words_of(cfg);
        let enabled = cfg.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
        poise::serenity_prelude::CreateEmbed::default()
            .title(t("util_nick_kicker_embed_title"))
            .description(t("util_nick_kicker_embed_desc"))
            .field(t("var_enabled"), if enabled { "✅" } else { "❌" }, true)
            .field(
                t("util_nick_kicker_words"),
                format!(
                    "```{}```",
                    if words.is_empty() {
                        t("var_none")
                    } else {
                        words.join(", ")
                    }
                ),
                true,
            )
    };
    if let Some(r) = remove
        .map(|w| w.trim().to_string())
        .filter(|w| !w.is_empty())
    {
        let mut words = words_of(&cfg);
        if !words.iter().any(|w| w == &r) {
            ctx.say(t("util_nick_kicker_no_word_to_remove")).await?;
            return Ok(());
        }
        words.retain(|w| w != &r);
        cfg["words"] = serde_json::Value::from(words);
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            "UTILS.NICK_KICKER",
            &cfg.to_string(),
        )
        .await?;
        ctx.send(poise::CreateReply::default().embed(status_embed(&cfg)))
            .await?;
        return Ok(());
    }
    match word.map(|w| w.trim().to_string()).filter(|w| !w.is_empty()) {
        Some(w) => match w.to_ascii_lowercase().as_str() {
            "enable" | "on" => {
                cfg["enabled"] = serde_json::Value::Bool(true);
                crate::db::kv_set(
                    &ctx.data().pool,
                    &gid,
                    "UTILS.NICK_KICKER",
                    &cfg.to_string(),
                )
                .await?;
                ctx.send(poise::CreateReply::default().embed(status_embed(&cfg)))
                    .await?;
            }
            "disable" | "off" => {
                cfg["enabled"] = serde_json::Value::Bool(false);
                crate::db::kv_set(
                    &ctx.data().pool,
                    &gid,
                    "UTILS.NICK_KICKER",
                    &cfg.to_string(),
                )
                .await?;
                ctx.send(poise::CreateReply::default().embed(status_embed(&cfg)))
                    .await?;
            }
            _ => {
                let words = words_of(&cfg);
                if words.len() >= 15 {
                    ctx.say(t("util_nick_kicker_words_max_15")).await?;
                    return Ok(());
                }
                let mut words = words;
                words.push(w.to_lowercase().chars().take(20).collect::<String>());
                cfg["words"] = serde_json::Value::from(words);
                crate::db::kv_set(
                    &ctx.data().pool,
                    &gid,
                    "UTILS.NICK_KICKER",
                    &cfg.to_string(),
                )
                .await?;
                ctx.say(
                    crate::lang::get(&code, "msg_word_added")
                        .unwrap_or_else(|| "Word added.".to_string()),
                )
                .await?;
            }
        },
        None => {
            ctx.send(poise::CreateReply::default().embed(status_embed(&cfg)))
                .await?;
        }
    }
    Ok(())
}
