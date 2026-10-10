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
    ),
    subcommand_required
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
/// in !show.ts: TS never wrote a `PROFIL.<uid>` blob — the setters store
/// `<uid>.desc` / `.age` / `.gender` / `.pronoun` /
/// `.birthday.(day|month|year)` leaves in the same `user_profil` table.
/// The blob (written by this port) wins; TS leaves fill only the gaps.
pub async fn load_profil_routed(pool: &crate::db::Pool, user_id: u64) -> Profil {
    let key = format!("PROFIL.{user_id}");
    let mut p: Profil = match routed_get(pool, PROFIL_TABLE, GLOBAL_SCOPE, &key).await {
        Some(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        None => Profil::default(),
    };
    merge_profil_leaves(pool, user_id, &mut p).await;
    p
}

/// Flexible leaf number: JSON numbers or numeric strings (TS birthday
/// modal values arrive as strings; age arrives via `getNumber`).
fn leaf_num(raw: &str) -> Option<f64> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    if let Ok(v) = serde_json::from_str::<f64>(t) {
        return Some(v);
    }
    t.trim_matches('"').trim().parse::<f64>().ok()
}

/// Overlay TS per-field leaves under the blob (keys unchanged).
fn leaf_int(node: &serde_json::Value, key: &str) -> Option<i64> {
    let v = node.get(key)?;
    v.as_i64()
        .or_else(|| v.as_u64().and_then(|n| i64::try_from(n).ok()))
        .or_else(|| v.as_str().and_then(|s| s.trim().parse::<i64>().ok()))
        .or_else(|| v.as_f64().map(|f| f as i64))
}

async fn merge_profil_leaves(pool: &crate::db::Pool, user_id: u64, p: &mut Profil) {
    use crate::commands::owner::main::decode_stored_string;
    let field = |name: &str| format!("{user_id}.{name}");
    if p.description.is_empty() {
        if let Some(raw) = routed_get(pool, PROFIL_TABLE, GLOBAL_SCOPE, &field("desc")).await {
            let desc = decode_stored_string(&raw);
            if !desc.is_empty() {
                p.description = desc;
            }
        }
    }
    if p.age.is_none() {
        if let Some(raw) = routed_get(pool, PROFIL_TABLE, GLOBAL_SCOPE, &field("age")).await {
            if let Some(v) = leaf_num(&raw) {
                p.age = Some(v);
            }
        }
    }
    if p.gender.is_none() {
        if let Some(raw) = routed_get(pool, PROFIL_TABLE, GLOBAL_SCOPE, &field("gender")).await {
            let gender = decode_stored_string(&raw);
            if !gender.is_empty() {
                p.gender = Some(gender);
            }
        }
    }
    if p.pronoun.is_none() {
        if let Some(raw) = routed_get(pool, PROFIL_TABLE, GLOBAL_SCOPE, &field("pronoun")).await {
            let pronoun = decode_stored_string(&raw);
            if !pronoun.is_empty() {
                p.pronoun = Some(pronoun);
            }
        }
    }
    if p.bday_day.is_none() || p.bday_month.is_none() || p.bday_year.is_none() {
        if let Some(raw) = routed_get(pool, PROFIL_TABLE, GLOBAL_SCOPE, &field("birthday")).await {
            if let Ok(node) = serde_json::from_str::<serde_json::Value>(&raw) {
                if p.bday_day.is_none() {
                    if let Some(d) = leaf_int(&node, "day").and_then(|d| u8::try_from(d).ok()) {
                        p.bday_day = Some(d);
                    }
                }
                if p.bday_month.is_none() {
                    if let Some(m) = leaf_int(&node, "month").and_then(|m| u8::try_from(m).ok()) {
                        p.bday_month = Some(m);
                    }
                }
                if p.bday_year.is_none() {
                    if let Some(y) = leaf_int(&node, "year").and_then(|y| i32::try_from(y).ok()) {
                        p.bday_year = Some(y);
                    }
                }
            }
        }
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
    use super::{leaf_int, leaf_num};

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn leaf_numbers_parse_json_and_modal_strings() {
        assert_eq!(leaf_num("30"), Some(30.0));
        assert_eq!(leaf_num("\"30\""), Some(30.0));
        assert_eq!(leaf_num(""), None);
        let node: serde_json::Value = serde_json::from_str(r#"{"day":"15","month":6}"#).unwrap();
        assert_eq!(leaf_int(&node, "day"), Some(15));
        assert_eq!(leaf_int(&node, "month"), Some(6));
        assert_eq!(leaf_int(&node, "year"), None);
    }

    #[tokio::test]
    async fn routed_profil_roundtrip_dual_writes() {
        let pool = mem_pool().await;
        assert!(load_profil_routed(&pool, 11).await.description.is_empty());
        let p = Profil {
            description: "hi".to_string(),
            age: Some(21.0),
            ..Default::default()
        };
        save_profil_routed(&pool, 11, &p).await.unwrap();
        let back = load_profil_routed(&pool, 11).await;
        assert_eq!(back.description, "hi");
        assert_eq!(back.age, Some(21.0));
        // Legacy kv reader sees the unchanged key.
        assert!(crate::db::kv_get(&pool, "0", "PROFIL.11").await.is_some());
    }

    #[tokio::test]
    async fn per_field_leaves_merge_under_blob() {
        use crate::commands::owner::main::routed_set;
        let pool = mem_pool().await;
        // Blob covers description + birth year only; the rest merges in
        // from TS per-field rows (keys unchanged: `<uid>.desc`, ...).
        let p = Profil {
            description: "blob".to_string(),
            bday_year: Some(2000),
            ..Default::default()
        };
        save_profil_routed(&pool, 31, &p).await.unwrap();
        routed_set(&pool, PROFIL_TABLE, GLOBAL_SCOPE, "31.desc", "leaf")
            .await
            .unwrap();
        routed_set(&pool, PROFIL_TABLE, GLOBAL_SCOPE, "31.age", "30")
            .await
            .unwrap();
        routed_set(&pool, PROFIL_TABLE, GLOBAL_SCOPE, "31.gender", "♀ Female")
            .await
            .unwrap();
        routed_set(&pool, PROFIL_TABLE, GLOBAL_SCOPE, "31.pronoun", "she-her")
            .await
            .unwrap();
        routed_set(
            &pool,
            PROFIL_TABLE,
            GLOBAL_SCOPE,
            "31.birthday",
            r#"{"day":"15","month":"6","year":"1999"}"#,
        )
        .await
        .unwrap();
        let back = load_profil_routed(&pool, 31).await;
        // Blob wins where set ...
        assert_eq!(back.description, "blob");
        assert_eq!(back.bday_year, Some(2000));
        // ... leaves fill the gaps (string-shaped birthday modal values too).
        assert_eq!(back.age, Some(30.0));
        assert_eq!(back.gender.as_deref(), Some("♀ Female"));
        assert_eq!(back.pronoun.as_deref(), Some("she-her"));
        assert_eq!((back.bday_day, back.bday_month), (Some(15), Some(6)));
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
