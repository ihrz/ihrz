use super::*;

/// Named table mirroring TS `prevnamesTable`. Scope "0" and
/// `PREVNAMES.<uid>` keys are unchanged from the legacy kv layout.
pub const PREVNAMES_TABLE: &str = "prevnames";

/// Previous names. Mirrors utils !prevnames.ts (tracked in user_update).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "prevnames",
    aliases("pvnames", "pvname", "prevname")
)]
pub async fn prevnames(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let target = user.unwrap_or_else(|| ctx.author().clone());
    // Named `prevnames` table first, legacy kv fallback (the writer in
    // events.rs still targets kv): scope "0", `PREVNAMES.<uid>` keys
    // unchanged, fallback hits promoted lazily.
    let raw = crate::commands::owner::main::routed_get(
        &ctx.data().pool,
        PREVNAMES_TABLE,
        crate::commands::owner::main::GLOBAL_SCOPE,
        &crate::events::prevnames_key(target.id.get()),
    )
    .await;
    let history: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if history.is_empty() {
        ctx.say(
            crate::lang::get(&code, "prevnames_undetected")
                .unwrap_or_else(|| "No data found!".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Mirrors the paged embed title in !prevnames.ts:78
    // (first page; full pagination is a later pass).
    let display = target
        .global_name
        .clone()
        .unwrap_or_else(|| target.name.clone());
    let title = crate::lang::get(&code, "prevnames_embed_title")
        .map(|s| s.replace("${user.username}", &display))
        .unwrap_or_else(|| format!("List of all {display}'s nicknames"));
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(format!("{title} | Page 1"))
        .description(history.join("\n"));
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::PREVNAMES_TABLE;
    use crate::commands::owner::main::{routed_get, GLOBAL_SCOPE};

    async fn mem_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:")
            .unwrap()
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[test]
    fn table_and_key_layout() {
        assert_eq!(PREVNAMES_TABLE, "prevnames");
        assert_eq!(crate::events::prevnames_key(5), "PREVNAMES.5");
    }

    #[tokio::test]
    async fn routed_read_falls_back_to_kv_writer_and_promotes() {
        let pool = mem_pool().await;
        // events.rs writer shape: kv only, scope "0".
        crate::db::kv_set(&pool, "0", "PREVNAMES.5", "[\"old\"]")
            .await
            .unwrap();
        let raw = routed_get(&pool, PREVNAMES_TABLE, GLOBAL_SCOPE, "PREVNAMES.5").await;
        assert_eq!(raw.as_deref(), Some("[\"old\"]"));
        // Promoted: survives the legacy row's removal.
        crate::db::kv_del(&pool, "0", "PREVNAMES.5").await.unwrap();
        let raw = routed_get(&pool, PREVNAMES_TABLE, GLOBAL_SCOPE, "PREVNAMES.5").await;
        assert_eq!(raw.as_deref(), Some("[\"old\"]"));
    }
}
