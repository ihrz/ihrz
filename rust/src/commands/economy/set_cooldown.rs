use super::*;

/// Table-first tuning-leaf read with legacy kv fallback (keys unchanged).
/// Mirrors the mod.rs `leaf_num` owner over the routed store: a legacy hit
/// promotes into the table so rows migrate lazily.
pub async fn leaf_num_routed(pool: &crate::db::Pool, guild_id: &str, key: &str) -> Option<f64> {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, key)
        .await
        .and_then(|s| parse_leaf_num(&s))
}

/// Table-first claim-tuning load (leaf-first, then legacy blob, then
/// default), mirroring the mod.rs `load_tuning` owner over the routed
/// store. A stored 0 stays 0, mirroring the TS `??` fallback which only
/// applies to null.
pub async fn load_tuning_routed(pool: &crate::db::Pool, guild_id: &str, kind: &str) -> ClaimTuning {
    let def = default_tuning(kind);
    let legacy = crate::commands::owner::main::routed_get(
        pool,
        guild_id,
        guild_id,
        &format!("ECONOMY.settings.{kind}"),
    )
    .await
    .and_then(|s| blob_tuning(&s, kind));
    let amount = leaf_num_routed(pool, guild_id, &format!("ECONOMY.settings.{kind}.amount"))
        .await
        .or_else(|| legacy.as_ref().map(|t| t.amount))
        .unwrap_or(def.amount);
    let cooldown_ms = leaf_num_routed(pool, guild_id, &format!("ECONOMY.settings.{kind}.cooldown"))
        .await
        .map(|f| f as i64)
        .or_else(|| legacy.map(|t| t.cooldown_ms))
        .unwrap_or(def.cooldown_ms);
    ClaimTuning {
        amount,
        cooldown_ms,
    }
}

/// Cooldown duration parse. Mirrors `client.timeCalculator.to_ms` in
/// `!set-cooldown.ts` via the shared [`crate::funcs::time_ms`]: compound
/// (`1h30m`), decimal (`1.5h`), week/month/year (`2w`, `1mo`, `1y`) and
/// French (`1heure`, `2jours`) units all parse. Garbage yields 0.0 and is
/// rejected like the TS `if (!time)` invalid-time reply.
/// KEPT STRICT (negative): TS would accept a negative total (truthy), but
/// a negative cooldown is never useful, so negatives stay on the invalid
/// reply path.
pub fn parse_cooldown_ms(raw: &str) -> Option<i64> {
    let ms = crate::funcs::time_ms(raw);
    if !ms.is_finite() || ms <= 0.0 {
        return None;
    }
    let v = ms as i64;
    if v <= 0 {
        return None;
    }
    Some(v)
}

/// Set-cooldown action-kind choice. Mirrors the `type` option
/// `choices` in economy.ts:810-829: slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SetCooldownKind {
    #[name = "rob"]
    #[name_localized("en-US", "Rob")]
    #[name_localized("en-GB", "Rob")]
    #[name_localized("fr", "Voler")]
    #[name_localized("ja", "rob")]
    #[name_localized("ru", "rob")]
    #[name_localized("es-ES", "rob")]
    Rob,
    #[name = "work"]
    #[name_localized("en-US", "Work")]
    #[name_localized("en-GB", "Work")]
    #[name_localized("fr", "Travailler")]
    #[name_localized("ja", "work")]
    #[name_localized("ru", "work")]
    #[name_localized("es-ES", "work")]
    Work,
}

impl SetCooldownKind {
    /// TS `value` used in `ECONOMY.settings.{kind}.cooldown`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Rob => "rob",
            Self::Work => "work",
        }
    }
}

/// Tunable cooldown kinds. Mirrors the `!set-cooldown.ts` slash
/// `choices` (`rob` | `work`) in `economy.ts`.
pub const SET_COOLDOWN_KINDS: &[&str] = &["rob", "work"];

/// True when the kind is one of the TS slash choice values
/// (case-sensitive, no trim).
pub fn validate_set_cooldown_kind(kind: &str) -> bool {
    SET_COOLDOWN_KINDS.contains(&kind)
}

/// Manage the cooldown of the actions!
// Mirrors `!set-cooldown.ts`.
//
// CONSTRAINED (deliberate divergence): TS stores
// `ECONOMY.settings.${type}.cooldown` for any verbatim `type` with no
// registry check. Here only the two slash choice values tune a leaf;
// an unknown type writes nothing and replies with the invalid-type
// error.
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "set-cooldown",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Gérer le temps de recharge des actions"),
    description_localized("ja", "アクションのクールダウンを管理！"),
    description_localized("ru", "Управление задержкой действий!"),
    description_localized("es-ES", "Gestionar el enfriamiento de las acciones!")
)]
pub async fn eco_set_cooldown(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Les actions que vous souhaitez définir")]
    #[description_localized("ja", "設定したいアクション")]
    #[description_localized("ru", "Действия, которые вы хотите определить")]
    #[description_localized("es-ES", "Las acciones que deseas definir")]
    #[description = "Les actions que vous souhaitez définir"]
    #[rename = "type"]
    kind: SetCooldownKind,
    #[description_localized("fr", "Le temps que vous souhaitez définir")]
    #[description_localized("ja", "設定したい時間")]
    #[description_localized("ru", "Время, которое вы хотите установить")]
    #[description_localized("es-ES", "El tiempo que quieres establecer")]
    #[description = "The time you want to set"]
    #[rename = "time"]
    cooldown: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    // The kind is constrained to the slash choice values (see above);
    // only the duration still travels verbatim. Plain String (no slash
    // dropdown) per the free-text note in mod.rs.
    let kind = kind.as_str();
    if !validate_set_cooldown_kind(kind) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_economy_set_cooldown_invalid_type")
                .unwrap_or_else(|| "Invalid reward type: choose rob or work.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(ms) = parse_cooldown_ms(&cooldown) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "economy_manage_rewards_cooldown_invalid_time").unwrap_or_else(
                || "Invalid time format. Please use a valid time format.".to_string(),
            ),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ECONOMY.settings.{kind}.cooldown"),
        &serde_json::to_string(&ms)?,
    )
    .await?;
    // TS replies (and logs) with `stime = to_beautiful_string(time)`,
    // not the raw input.
    let units = time_units(&ctx).await;
    let stime = beautiful_ms_lang(ms as f64, &units);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "economy_manage_rewards_cooldown_command_ok")
            .map(|s| s.replace("${type}", kind).replace("${stime}", &stime))
            .unwrap_or_else(|| "Cooldown updated.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    // TS logs the type uppercased.
    let kind_s = kind.to_uppercase();
    let time_s = stime;
    post_economy_log(
        &ctx,
        "economy_logs_set_cooldown_title",
        "economy_logs_set_cooldown_desc",
        &[("author", &author), ("type", &kind_s), ("time", &time_s)],
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        leaf_num_routed, load_tuning_routed, parse_cooldown_ms, validate_set_cooldown_kind,
        SetCooldownKind,
    };

    #[test]
    fn set_cooldown_kind_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = SetCooldownKind::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["rob", "work"]);
        assert_eq!(SetCooldownKind::Rob.as_str(), "rob");
        assert_eq!(SetCooldownKind::Work.as_str(), "work");
        assert_eq!(
            SetCooldownKind::from_name("rob"),
            Some(SetCooldownKind::Rob)
        );
        assert_eq!(
            SetCooldownKind::from_name("work"),
            Some(SetCooldownKind::Work)
        );
        assert_eq!(SetCooldownKind::from_name("daily"), None);
        assert_eq!(SetCooldownKind::from_index(0), Some(SetCooldownKind::Rob));
        assert_eq!(SetCooldownKind::from_index(1), Some(SetCooldownKind::Work));
        let list = SetCooldownKind::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Voler")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Travailler")
        );
        assert_eq!(SetCooldownKind::Rob.localized_name("fr"), Some("Voler"));
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn cooldown_durations_match_time_calculator() {
        // Single units (the old narrow parser's range).
        assert_eq!(parse_cooldown_ms("10s"), Some(10_000));
        assert_eq!(parse_cooldown_ms("5m"), Some(300_000));
        assert_eq!(parse_cooldown_ms("2h"), Some(7_200_000));
        assert_eq!(parse_cooldown_ms("7d"), Some(604_800_000));
        // Widened: compounds, decimals, weeks/months/years, French units.
        assert_eq!(parse_cooldown_ms("1h30m"), Some(5_400_000));
        assert_eq!(parse_cooldown_ms("1.5h"), Some(5_400_000));
        assert_eq!(parse_cooldown_ms("2w"), Some(1_209_600_000));
        assert_eq!(parse_cooldown_ms("1week"), Some(604_800_000));
        assert_eq!(parse_cooldown_ms("1mo"), Some(2_592_000_000));
        assert_eq!(parse_cooldown_ms("1y"), Some(31_557_600_000));
        assert_eq!(parse_cooldown_ms("1heure"), Some(3_600_000));
        assert_eq!(parse_cooldown_ms("2jours"), Some(172_800_000));
        // Invalid stays on the invalid-time reply path, like TS `!time`.
        assert_eq!(parse_cooldown_ms(""), None);
        assert_eq!(parse_cooldown_ms("abc"), None);
        assert_eq!(parse_cooldown_ms("0s"), None);
        // KEPT STRICT: TS would accept these (truthy), we reject.
        assert_eq!(parse_cooldown_ms("-5m"), None);
    }

    #[test]
    fn set_cooldown_accepts_only_slash_choice_kinds() {
        assert!(validate_set_cooldown_kind("rob"));
        assert!(validate_set_cooldown_kind("work"));
        assert!(!validate_set_cooldown_kind("daily"));
        assert!(!validate_set_cooldown_kind("Rob"));
        assert!(!validate_set_cooldown_kind(" rob"));
        assert!(!validate_set_cooldown_kind(""));
    }

    #[tokio::test]
    async fn defaults_apply_without_rows() {
        let pool = mem_pool().await;
        let t = load_tuning_routed(&pool, "g", "daily").await;
        assert_eq!((t.amount, t.cooldown_ms), (500.0, 86_400_000));
        assert!(leaf_num_routed(&pool, "g", "ECONOMY.settings.daily.amount")
            .await
            .is_none());
    }

    #[tokio::test]
    async fn leaf_rows_win_and_promote_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "ECONOMY.settings.work.amount", "75")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "ECONOMY.settings.work.cooldown", "60000")
            .await
            .unwrap();
        let t = load_tuning_routed(&pool, "g", "work").await;
        assert_eq!((t.amount, t.cooldown_ms), (75.0, 60_000));
        assert!(tbl_get_value(&pool, "g", "ECONOMY.settings.work.amount")
            .await
            .is_some());
    }

    #[tokio::test]
    async fn legacy_blob_falls_back_and_zero_stays_zero() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "ECONOMY.settings.rob",
            r#"{"amount":10,"cooldown":3000000}"#,
        )
        .await
        .unwrap();
        let t = load_tuning_routed(&pool, "g", "rob").await;
        assert_eq!((t.amount, t.cooldown_ms), (10.0, 3_000_000));
        crate::db::kv_set(&pool, "h", "ECONOMY.settings.daily.amount", "0")
            .await
            .unwrap();
        let z = load_tuning_routed(&pool, "h", "daily").await;
        assert_eq!(z.amount, 0.0);
    }
}
