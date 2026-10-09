use super::*;
use super::{
    set_age::profil_age, set_birthday::profil_birthday, set_description::profil_description,
    set_gender::profil_gender, set_pronoun::profil_pronoun, show::profil_show,
};

/// Parent group. Mirrors the TS `profil` HybridCommand definition.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "profil",
    category = "profil",
    subcommands(
        "profil_show",
        "profil_age",
        "profil_description",
        "profil_gender",
        "profil_pronoun",
        "profil_birthday"
    )
)]
pub async fn profil(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let msg = crate::commands::lang_for(
        &ctx,
        "msg_profil_use_subcommand",
        "Use a subcommand: show, set-age, set-description, set-gender, set-pronoun, set-birthday.",
    )
    .await;
    ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await?;
    Ok(())
}

// ---- U-D3-NAMEDTABLES: named `user_profil` table handle ----
// Scope "0" and `PROFIL.<uid>` keys are unchanged from the legacy kv
// layout. (The locked `load_profil`/`save_profil` in mod.rs stay on kv;
// the subcommands below use the routed pair instead.)
use crate::commands::owner::main::{routed_get, routed_set, GLOBAL_SCOPE};

/// Named table mirroring TS `profilTable` (`user_profil`).
pub const PROFIL_TABLE: &str = "user_profil";

/// Routed profil load. Mirrors the per-field `profilTable.get` reads
/// in !show.ts (one JSON blob per user here, like the legacy kv row).
pub async fn load_profil_routed(pool: &crate::db::Pool, user_id: u64) -> Profil {
    let key = format!("PROFIL.{user_id}");
    match routed_get(pool, PROFIL_TABLE, GLOBAL_SCOPE, &key).await {
        Some(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        None => Profil::default(),
    }
}

/// Routed profil save (dual-write, mirrors `profilTable.set`).
pub async fn save_profil_routed(
    pool: &crate::db::Pool,
    user_id: u64,
    profil: &Profil,
) -> anyhow::Result<()> {
    let key = format!("PROFIL.{user_id}");
    let raw = serde_json::to_string(profil)?;
    routed_set(pool, PROFIL_TABLE, GLOBAL_SCOPE, &key, &raw).await
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[tokio::test]
    async fn routed_profil_roundtrip_dual_writes() {
        let pool = mem_pool().await;
        assert!(load_profil_routed(&pool, 11).await.description.is_empty());
        let mut p = Profil::default();
        p.description = "hi".to_string();
        p.age = Some(21);
        save_profil_routed(&pool, 11, &p).await.unwrap();
        let back = load_profil_routed(&pool, 11).await;
        assert_eq!(back.description, "hi");
        assert_eq!(back.age, Some(21));
        // Legacy kv reader sees the unchanged key.
        assert!(crate::db::kv_get(&pool, "0", "PROFIL.11").await.is_some());
    }

    #[tokio::test]
    async fn routed_profil_falls_back_to_legacy() {
        let pool = mem_pool().await;
        let p = Profil {
            description: "old".to_string(),
            ..Profil::default()
        };
        crate::db::kv_set(&pool, "0", "PROFIL.12", &serde_json::to_string(&p).unwrap())
            .await
            .unwrap();
        assert_eq!(load_profil_routed(&pool, 12).await.description, "old");
    }
}
