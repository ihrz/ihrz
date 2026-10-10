use super::*;

/// Mirrors `!pay.ts`.
#[poise::command(slash_command, prefix_command, rename = "pay")]
pub async fn eco_pay(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: f64,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS: `amount.toString().includes("-")` — only negatives are rejected.
    if amount.to_string().contains('-') {
        ctx.say(
            crate::lang::get(&code, "pay_negative_number_error")
                .unwrap_or_else(|| "Amount must be positive.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let from = ctx.author().id.get();
    let to = user.id.get();
    let a = balance::load_econ_routed(&ctx.data().pool, &gid, from).await;
    // TS: `if (amount && member < amount)` — falsy amounts (0) skip the
    // check and flow through to a no-op add/sub + success reply.
    if amount != 0.0 && (a.money as f64) < amount {
        ctx.say(
            crate::lang::get(&code, "pay_dont_have_enought_to_give")
                .unwrap_or_else(|| "Not enough money.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS replies BEFORE mutating (interactionSend, then db.add/sub).
    // DELIBERATE KEEP on the display name (`!pay.ts:94-102` uses
    // `user.globalName || user.displayName`): a serenity `User` carries
    // no guild display name (no nickname), so the username is the
    // closest available fallback — never a raw CDN-style guess.
    let payer = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    ctx.say(
        crate::lang::get(&code, "pay_command_work")
            .map(|s| {
                s.replace("${interaction.user.username}", &payer)
                    .replace(
                        "${user.user.username}",
                        &user
                            .global_name
                            .clone()
                            .unwrap_or_else(|| user.name.clone()),
                    )
                    .replace("${amount}", &fmt_num(amount))
            })
            .unwrap_or_else(|| format!("Paid {}.", fmt_num(amount))),
    )
    .await?;
    let mut a = a;
    let mut b = balance::load_econ_routed(&ctx.data().pool, &gid, to).await;
    add_money(&mut b, amount);
    add_money(&mut a, -amount);
    balance::save_econ_routed(&ctx.data().pool, &gid, from, &a).await?;
    balance::save_econ_routed(&ctx.data().pool, &gid, to, &b).await?;
    let author = user_mention(from);
    let target = user_mention(to);
    let amt = fmt_num(amount);
    post_economy_log(
        &ctx,
        "economy_logs_pay_title",
        "economy_logs_pay_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}
