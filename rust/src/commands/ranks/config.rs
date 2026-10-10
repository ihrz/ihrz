use super::*;

/// Third disable state. Mirrors `ranks/!config.ts:50,69,88`: the prefix
/// path compares with case-sensitive `==`, so only the exact inputs
/// `on` / `off` / `disable` act — `ON` or `OFF` do nothing in TS.
/// `on` stores the native boolean `true`, `off` the native boolean
/// `false` (TS `client.db.set` writes real booleans, and the announce
/// gate compares `xpTurn === false`), `disable` stores the string
/// `"disable"` (nothing is gained — see `xp_gain_blocked`).
/// Unknown input does nothing, like TS.
pub fn config_value(action: &str) -> Option<serde_json::Value> {
    match action.trim() {
        "on" => Some(serde_json::Value::Bool(true)),
        "off" => Some(serde_json::Value::Bool(false)),
        "disable" => Some(serde_json::Value::String("disable".to_string())),
        _ => None,
    }
}

/// Storage encoding of a [`config_value`]: native JSON booleans stay
/// bare (`true` / `false`, never quoted), strings stay raw so the read
/// side (and the TS runtime) sees the same JSON value either way.
pub fn config_stored_value(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

/// Enable, soften or fully disable the XP module.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("rconfig"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_config(
    ctx: Ctx<'_>,
    #[description = "on, off or disable"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let Some(value) = config_value(&action) else {
        return Ok(());
    };
    super::migrated_set(
        &ctx.data().pool,
        &gid,
        super::GUILD_DISABLE_NEW,
        &[super::GUILD_DISABLE_OLD],
        &config_stored_value(&value),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    // `off` and `disable` share the disable log embed in TS; only the
    // reply key differs (`disablexp_command_work_disable_entierly`).
    let (title_key, desc_key, reply_key, reply_fb) = match &value {
        serde_json::Value::Bool(true) => (
            "disablexp_logs_embed_title_enable",
            "disablexp_logs_embed_description_enable",
            "disablexp_command_work_enable",
            "You have successfully enabled XP.",
        ),
        serde_json::Value::String(_) => (
            "disablexp_logs_embed_title_disable",
            "disablexp_logs_embed_description_disable",
            "disablexp_command_work_disable_entierly",
            "You have successfully disabled the ranks module! (No more messages, and users will not earn levels)",
        ),
        _ => (
            "disablexp_logs_embed_title_disable",
            "disablexp_logs_embed_description_disable",
            "disablexp_command_work_disable",
            "You have successfully disabled XP.",
        ),
    };
    let title = crate::lang::get(&code, title_key).unwrap_or_else(|| "XP config.".to_string());
    let desc = crate::lang::get(&code, desc_key)
        .map(|s| s.replace("${interaction.user.id}", &author_id))
        .unwrap_or_else(|| "XP config updated.".to_string());
    crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
    ctx.say(crate::lang::get(&code, reply_key).unwrap_or_else(|| reply_fb.to_string()))
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{config_stored_value, config_value};

    #[test]
    fn config_writes_native_json_booleans() {
        // `on` / `off` store native JSON booleans (TS `client.db.set`
        // writes real booleans), `disable` the raw string.
        assert_eq!(config_value("on"), Some(serde_json::Value::Bool(true)));
        assert_eq!(config_value("off"), Some(serde_json::Value::Bool(false)));
        assert_eq!(
            config_value("disable"),
            Some(serde_json::Value::String("disable".to_string()))
        );
        assert_eq!(config_value("ON"), None);
        assert_eq!(config_value("bogus"), None);
        // Storage encoding: booleans stay bare (never quoted), the
        // string stays raw — the same JSON value on both runtimes.
        assert_eq!(config_stored_value(&config_value("on").unwrap()), "true");
        assert_eq!(config_stored_value(&config_value("off").unwrap()), "false");
        assert_eq!(
            config_stored_value(&config_value("disable").unwrap()),
            "disable"
        );
    }
}
