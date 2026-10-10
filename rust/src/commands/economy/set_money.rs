use super::*;

/// Tunable reward kinds. Mirrors the `!set-money.ts` slash `choices`
/// (`daily` | `weekly` | `monthly`) in `economy.ts`.
pub const SET_MONEY_KINDS: &[&str] = &["daily", "weekly", "monthly"];

/// True when the kind is one of the TS slash choice values
/// (case-sensitive, no trim).
pub fn validate_set_money_kind(kind: &str) -> bool {
    SET_MONEY_KINDS.contains(&kind)
}

/// Mirrors `!set-money.ts`.
///
/// CONSTRAINED (deliberate divergence): TS stores
/// `ECONOMY.settings.${type}.amount` for any verbatim `type` with no
/// registry check. Here only the three slash choice values tune a leaf;
/// an unknown type writes nothing and replies with the invalid-type
/// error.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-money",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_set_money(
    ctx: Ctx<'_>,
    #[description = "daily, weekly, monthly"]
    #[rename = "type"]
    kind: String,
    #[description = "Amount"]
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
