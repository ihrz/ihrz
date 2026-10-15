use super::*;

/// Set-money reward-kind choice. Mirrors the `type` option `choices`
/// in economy.ts:734-769: slash shows the localized display names,
/// the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SetMoneyKind {
    #[name = "daily"]
    #[name_localized("en-US", "Daily")]
    #[name_localized("en-GB", "Daily")]
    #[name_localized("fr", "Quotidien")]
    #[name_localized("ja", "daily")]
    #[name_localized("ru", "daily")]
    #[name_localized("es-ES", "daily")]
    Daily,
    #[name = "weekly"]
    #[name_localized("en-US", "Weekly")]
    #[name_localized("en-GB", "Weekly")]
    #[name_localized("fr", "Hebdomadaire")]
    #[name_localized("ja", "weekly")]
    #[name_localized("ru", "weekly")]
    #[name_localized("es-ES", "weekly")]
    Weekly,
    #[name = "monthly"]
    #[name_localized("en-US", "Monthly")]
    #[name_localized("en-GB", "Monthly")]
    #[name_localized("fr", "Mensuel")]
    #[name_localized("ja", "monthly")]
    #[name_localized("ru", "monthly")]
    #[name_localized("es-ES", "monthly")]
    Monthly,
}

impl SetMoneyKind {
    /// TS `value` used in `ECONOMY.settings.{kind}.amount`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Daily => "daily",
            Self::Weekly => "weekly",
            Self::Monthly => "monthly",
        }
    }
}

/// Tunable reward kinds. Mirrors the `!set-money.ts` slash `choices`
/// (`daily` | `weekly` | `monthly`) in `economy.ts`.
pub const SET_MONEY_KINDS: &[&str] = &["daily", "weekly", "monthly"];

/// True when the kind is one of the TS slash choice values
/// (case-sensitive, no trim).
pub fn validate_set_money_kind(kind: &str) -> bool {
    SET_MONEY_KINDS.contains(&kind)
}

/// Manage how much money you can get from daily, weekly and monthly!
// Mirrors `!set-money.ts`.
//
// CONSTRAINED (deliberate divergence): TS stores
// `ECONOMY.settings.${type}.amount` for any verbatim `type` with no
// registry check. Here only the three slash choice values tune a leaf;
// an unknown type writes nothing and replies with the invalid-type
// error.
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "set-money",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement"),
    description_localized("ja", "デイリー、ウィークリー、マンスリーで獲得できる金額を管理！"),
    description_localized("ru", "Управлять количеством денег, получаемых ежедневно, еженедельно и ежемесячно!"),
    description_localized("es-ES", "Gestionar cuánto dinero puedes obtener de diario, semanal y mensual!"),
)]
pub async fn eco_set_money(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le type de récompense que vous souhaitez définir")]
    #[description_localized("ja", "設定したい報酬の種類")]
    #[description_localized("ru", "Тип награды, которую вы хотите установить")]
    #[description_localized("es-ES", "El tipo de recompensa que quieres establecer")]
    #[description = "The type of reward you want to set"]
    #[rename = "type"]
    kind: SetMoneyKind,
    #[description_localized("fr", "Combien d'argent vous souhaitez définir")]
    #[description_localized("ja", "設定したい金額")]
    #[description_localized("ru", "Сколько денег вы хотите установить")]
    #[description_localized("es-ES", "Cuánto dinero quieres establecer")]
    #[description = "How much money you want to set"]
    #[rename = "how-much"]
    amount: f64,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let kind = kind.as_str();
    if !validate_set_money_kind(kind) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_economy_set_money_invalid_type").unwrap_or_else(|| {
                "Invalid reward type: choose daily, weekly or monthly.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS `db.set` on the leaf key stores the raw amount.
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ECONOMY.settings.{kind}.amount"),
        &serde_json::to_string(&num_json(amount))?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "economy_manage_rewards_set_money")
            .map(|s| {
                s.replace("${type}", kind)
                    .replace("${money}", &fmt_num(amount))
            })
            .unwrap_or_else(|| "Tuning updated.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    let money = fmt_num(amount);
    // TS logs the type uppercased.
    let kind_s = kind.to_uppercase();
    post_economy_log(
        &ctx,
        "economy_logs_set_money_title",
        "economy_logs_set_money_desc",
        &[("author", &author), ("money", &money), ("type", &kind_s)],
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_set_money_kind;
    use super::SetMoneyKind;

    #[test]
    fn set_money_kind_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = SetMoneyKind::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["daily", "weekly", "monthly"]);
        assert_eq!(SetMoneyKind::Daily.as_str(), "daily");
        assert_eq!(SetMoneyKind::Monthly.as_str(), "monthly");
        assert_eq!(
            SetMoneyKind::from_name("weekly"),
            Some(SetMoneyKind::Weekly)
        );
        assert_eq!(
            SetMoneyKind::from_name("monthly"),
            Some(SetMoneyKind::Monthly)
        );
        assert_eq!(SetMoneyKind::from_name("yearly"), None);
        assert_eq!(SetMoneyKind::from_index(2), Some(SetMoneyKind::Monthly));
        let list = SetMoneyKind::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Quotidien")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Hebdomadaire")
        );
        assert_eq!(
            list[2].localizations.get("fr").map(String::as_str),
            Some("Mensuel")
        );
    }

    #[test]
    fn set_money_accepts_only_slash_choice_kinds() {
        assert!(validate_set_money_kind("daily"));
        assert!(validate_set_money_kind("weekly"));
        assert!(validate_set_money_kind("monthly"));
        assert!(!validate_set_money_kind("work"));
        assert!(!validate_set_money_kind("rob"));
        assert!(!validate_set_money_kind("Daily"));
        assert!(!validate_set_money_kind(" daily"));
        assert!(!validate_set_money_kind(""));
    }
}
