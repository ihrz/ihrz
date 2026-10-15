use super::*;

/// Boost choice. Mirrors the `boost` option `choices` in
/// economy.ts:637-693: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum EcoBoostChoice {
    #[name = "1"]
    #[name_localized("en-US", "Default")]
    #[name_localized("en-GB", "Default")]
    #[name_localized("fr", "Défaut")]
    #[name_localized("ja", "default")]
    #[name_localized("ru", "default")]
    #[name_localized("es-ES", "default")]
    Default,
    #[name = "2"]
    #[name_localized("en-US", "x2")]
    #[name_localized("en-GB", "x2")]
    #[name_localized("fr", "x2")]
    #[name_localized("ja", "x2")]
    #[name_localized("ru", "x2")]
    #[name_localized("es-ES", "x2")]
    X2,
    #[name = "3"]
    #[name_localized("en-US", "x3")]
    #[name_localized("en-GB", "x3")]
    #[name_localized("fr", "x3")]
    #[name_localized("ja", "x3")]
    #[name_localized("ru", "x3")]
    #[name_localized("es-ES", "x3")]
    X3,
    #[name = "4"]
    #[name_localized("en-US", "x4")]
    #[name_localized("en-GB", "x4")]
    #[name_localized("fr", "x4")]
    #[name_localized("ja", "x4")]
    #[name_localized("ru", "x4")]
    #[name_localized("es-ES", "x4")]
    X4,
    #[name = "5"]
    #[name_localized("en-US", "x5")]
    #[name_localized("en-GB", "x5")]
    #[name_localized("fr", "x5")]
    #[name_localized("ja", "x5")]
    #[name_localized("ru", "x5")]
    #[name_localized("es-ES", "x5")]
    X5,
}

impl EcoBoostChoice {
    /// TS `value` parsed by `validate_boost` (`parseInt` semantics).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Default => "1",
            Self::X2 => "2",
            Self::X3 => "3",
            Self::X4 => "4",
            Self::X5 => "5",
        }
    }
}

/// Boost multiplier gate. Mirrors the `!boost-set.ts` slash `choices`
/// (`Default`/`x2`…`x5` over values `"1"`…`"5"`) in `economy.ts`:
/// `parseInt` semantics on the raw text, accepted only inside 1-5.
pub fn validate_boost(raw: &str) -> Option<f64> {
    let n = parse_ts_int(raw)?;
    (1..=5).contains(&n).then_some(n as f64)
}

/// Set a money boost for a certain role!
// Mirrors `!boost-set.ts`.
//
// CONSTRAINED (deliberate divergence): TS stores the parsed boost raw
// with no 1-5 clamp on either path. Here an out-of-range boost writes
// nothing and replies with the invalid-boost error.
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "boost-set",
    aliases("economy-boost-set"),
    default_member_permissions = "MANAGE_GUILD",
    description_localized("fr", "Définir un boost d'argent pour un certain rôle"),
    description_localized("ja", "特定のロールにマネーブーストを設定！"),
    description_localized("ru", "Установить денежный бонус для роли!"),
    description_localized("es-ES", "Establecer un impulso de dinero para un cierto rol!")
)]
pub async fn eco_boost_set(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le rôle que vous souhaitez modifier le boost")]
    #[description_localized("ja", "ブーストを変更したいロール")]
    #[description_localized("ru", "Роль, для которой изменить бонус")]
    #[description_localized("es-ES", "El rol para el que quieres modificar el impulso")]
    #[description = "The role you want to modify the boost"]
    role: poise::serenity_prelude::Role,
    #[description_localized("fr", "Le boost que vous souhaitez ajouter")]
    #[description_localized("ja", "追加したいブースト")]
    #[description_localized("ru", "Бонус, который вы хотите добавить")]
    #[description_localized("es-ES", "El impulso que quieres añadir")]
    #[description = "The boost you want to add"]
    boost: EcoBoostChoice,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = shop::load_shop_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let id = role.id.get().to_string();
    if !roles.contains_key(&id) {
        ctx.say(
            crate::lang::get(&code, "economy_boost_role_not_found").unwrap_or_else(|| {
                "Role not found. You must set a price for the role.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    // The boost parses like TS on both paths (`parseInt` on the slash
    // choice value, `method.number` on prefix) but is constrained to the
    // 1-5 slash choice range (see above): anything else replies with the
    // invalid-boost error and writes nothing.
    let Some(amount) = validate_boost(boost.as_str()) else {
        ctx.say(
            crate::lang::get(&code, "msg_economy_boost_invalid")
                .unwrap_or_else(|| "Invalid boost: choose a value between 1 and 5.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let keep_price = roles.get(&id).map(|e| e.price).unwrap_or(0.0);
    roles.insert(
        id,
        ShopEntry {
            price: keep_price,
            boost: Some(amount),
        },
    );
    shop::save_shop_routed(&ctx.data().pool, &gid, &roles).await?;
    // TS replies with the buyable-roles embed, then logs boostModifying.
    send_with_footer(&ctx, buyable_roles_embed(&ctx, &roles).await).await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    let amt = fmt_num(amount);
    post_economy_log(
        &ctx,
        "economy_logs_boost_role_title",
        "economy_logs_boost_role_desc",
        &[("author", &author), ("role", &role_m), ("amount", &amt)],
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::EcoBoostChoice;

    #[test]
    fn boost_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = EcoBoostChoice::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["1", "2", "3", "4", "5"]);
        assert_eq!(EcoBoostChoice::Default.as_str(), "1");
        assert_eq!(EcoBoostChoice::X5.as_str(), "5");
        assert_eq!(EcoBoostChoice::from_name("3"), Some(EcoBoostChoice::X3));
        assert_eq!(
            EcoBoostChoice::from_name("1"),
            Some(EcoBoostChoice::Default)
        );
        assert_eq!(
            EcoBoostChoice::from_name("1"),
            Some(EcoBoostChoice::Default)
        );
        assert_eq!(EcoBoostChoice::from_name("x9"), None);
        assert_eq!(EcoBoostChoice::from_index(0), Some(EcoBoostChoice::Default));
        assert_eq!(EcoBoostChoice::from_index(4), Some(EcoBoostChoice::X5));
        assert_eq!(EcoBoostChoice::from_index(5), None);
        let list = EcoBoostChoice::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Défaut")
        );
        assert_eq!(
            list[2].localizations.get("ru").map(String::as_str),
            Some("x3")
        );
    }
    use super::validate_boost;

    #[test]
    fn boost_accepts_only_1_to_5_like_slash_choices() {
        for valid in ["1", "2", "3", "4", "5"] {
            assert_eq!(validate_boost(valid), Some(valid.parse::<f64>().unwrap()));
        }
        // parseInt semantics on the edges (leading digits win).
        assert_eq!(validate_boost("3abc"), Some(3.0));
        // Out of range, zero, negative and non-numeric are rejected.
        assert_eq!(validate_boost("0"), None);
        assert_eq!(validate_boost("6"), None);
        assert_eq!(validate_boost("-1"), None);
        assert_eq!(validate_boost("abc"), None);
        assert_eq!(validate_boost(""), None);
        assert_eq!(validate_boost("x2"), None);
    }
}
