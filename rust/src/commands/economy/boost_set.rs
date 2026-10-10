use super::*;

/// Boost multiplier gate. Mirrors the `!boost-set.ts` slash `choices`
/// (`Default`/`x2`…`x5` over values `"1"`…`"5"`) in `economy.ts`:
/// `parseInt` semantics on the raw text, accepted only inside 1-5.
pub fn validate_boost(raw: &str) -> Option<f64> {
    let n = parse_ts_int(raw)?;
    (1..=5).contains(&n).then_some(n as f64)
}

/// Mirrors `!boost-set.ts`.
///
/// CONSTRAINED (deliberate divergence): TS stores the parsed boost raw
/// with no 1-5 clamp on either path. Here an out-of-range boost writes
/// nothing and replies with the invalid-boost error.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "boost-set",
    aliases("economy-boost-set"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn eco_boost_set(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
    #[description = "Boost (e.g. 2)"] boost: String,
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
    let Some(amount) = validate_boost(&boost) else {
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
