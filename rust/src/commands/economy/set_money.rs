use super::*;

/// Mirrors `!set-money.ts`.
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
    // The kind travels verbatim on both paths (TS `!set-money.ts` stores
    // under `ECONOMY.settings.${type}.amount` with no registry check),
    // so an off-list kind tunes that leaf too. See the free-text note
    // in mod.rs for why this is a plain String (no slash dropdown).
    let kind = kind.as_str();
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
