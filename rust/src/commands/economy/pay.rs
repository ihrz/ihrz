use super::*;

/// Pay coins to another member!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "pay",
    description_localized("fr", "Payer à un utilisateur un certain montant"),
    description_localized("ja", "ユーザーに特定の金額を支払う！"),
    description_localized("ru", "Заплатить пользователю определенную сумму!"),
    description_localized("es-ES", "Pagar a un usuario una cierta cantidad!")
)]
// Mirrors `!pay.ts`.
pub async fn eco_pay(
    ctx: Ctx<'_>,
    // Amount-first like the TS option order (`amount`, then `member` in
    // economy.ts): poise parses prefix args positionally, so this keeps
    // `!pay <amount> <member>` aligned on both paths.
    // ORDER NOTE (checked sane): on the TS prefix path both `amount`
    // (`method.number(args, 0)`) and `member` (`method.member(..., args,
    // 0)`) parse at index 0 (`!pay.ts:53-58`) — the member resolver
    // scans the whole arg string for a mention/id, so the index is not
    // load-bearing. Keeping the slash order positionally is the sane
    // mapping, not a divergence.
    #[description_localized("fr", "Le montant d’argent que vous souhaitez lui donner")]
    #[description_localized("ja", "寄付したい金額")]
    #[description_localized("ru", "Сумма денег, которую вы хотите пожертвовать")]
    #[description_localized("es-ES", "La cantidad de dinero que quieres donarles")]
    #[description = "Amount"]
    amount: f64,
    #[description_localized("fr", "Le membre à qui vous souhaitez donner de l'argent")]
    #[description_localized("ja", "お金を寄付したいメンバー")]
    #[description_localized("ru", "Участник, которому пожертвовать деньги")]
    #[description_localized("es-ES", "El miembro al que quieres donar el dinero")]
    #[description = "Member"]
    #[rename = "member"]
    user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS: `amount.toString().includes("-")` on the JS number rendering —
    // JS prints `-0` as `"0"` (no dash, so it flows through) and positive
    // sub-1e-6 values in exponential form (`"1e-7"`, dash present, so they
    // are rejected). Rust's `to_string` renders both cases the other way
    // round (`"-0"`, `"0.0000001"`), so compare numerically instead of
    // scanning the Rust string.
    if amount < 0.0 || (amount > 0.0 && amount < 1e-6) {
        ctx.say(
            crate::lang::get(&code, "pay_negative_number_error")
                .unwrap_or_else(|| "Negative money cannot be paid.".to_string()),
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
    // Serialize the transfer (see tx_lock): the two loads + two saves
    // below must not interleave with another transfer touching either
    // account. Lock order is by id, so opposite-direction transfers
    // cannot deadlock; a self-transfer reuses one guard.
    let (first, second) = super::tx_lock::ordered_pair(from, to);
    let _g1 = super::tx_lock::guard_user(first).await;
    let _g2 = if second != first {
        Some(super::tx_lock::guard_user(second).await)
    } else {
        None
    };
    let a = balance::load_econ_routed(&ctx.data().pool, &gid, from).await;
    // TS: `if (amount && member < amount)` — falsy amounts (0) skip the
    // check and flow through to a no-op add/sub + success reply.
    if amount != 0.0 && a.money < amount {
        ctx.say(
            crate::lang::get(&code, "pay_dont_have_enought_to_give").unwrap_or_else(|| {
                "That's more money than you've got in your balance. Try again.".to_string()
            }),
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
