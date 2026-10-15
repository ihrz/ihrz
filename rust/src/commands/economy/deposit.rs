use super::*;

/// Deposit coin in your bank!
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "deposit",
    aliases("dep"),
    description_localized("fr", "Déposez des pièces dans votre banque"),
    description_localized("ja", "銀行にコインを預ける！"),
    description_localized("ru", "Положить монеты в банк!"),
    description_localized("es-ES", "Depositar monedas en tu banco!")
)]
// Mirrors `!deposit.ts`.
pub async fn eco_deposit(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Combien de pièces vous souhaitez déposer dans votre banque")]
    #[description_localized("ja", "銀行にいくら預けますか？")]
    #[description_localized("ru", "Сколько монет вы хотите положить в банк?")]
    #[description_localized("es-ES", "Cuántas monedas quieres depositar en tu banco?")]
    #[description = "How much coin you want to deposit in your bank?"]
    #[rename = "how-much"]
    amount: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = ctx.author().id.get();
    // Serialize the read-modify-write (see tx_lock).
    let _tx = super::tx_lock::guard_user(uid).await;
    // Account and guild lang are independent keys; load concurrently.
    let pool = &ctx.data().pool;
    let (mut a, code) = tokio::join!(
        balance::load_econ_routed(pool, &gid, uid),
        crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get()))
    );
    // Mirrors !deposit.ts: `toDeposit === "all"` takes the wallet, then
    // `isNaN(Number(...))` / `Number(...) <= 0` gate on the not-integer
    // key, and only `toDeposit > balance` (Number comparison, untruncated)
    // gates on cannot-abuse. The stored move uses parseInt truncation.
    let raw = amount.trim();
    let num: f64 = if raw == "all" {
        a.money
    } else {
        match ts_number(raw) {
            Some(v) => v,
            None => {
                not_integer_reply(&ctx, &code).await?;
                return Ok(());
            }
        }
    };
    // TS gates are `isNaN(Number(...))` then `Number(...) <= 0`, so only
    // NaN and non-positive values take the not-integer key: `Infinity`
    // passes both (`Infinity <= 0` is false) and falls into the
    // cannot-abuse branch below (`"Infinity" > balance` is true).
    if num.is_nan() || num <= 0.0 {
        not_integer_reply(&ctx, &code).await?;
        return Ok(());
    }
    // The stored move is `parseInt` (`!deposit.ts:87-92`): "all" first
    // resolves to the raw wallet, so a fractional balance moves truncated
    // and leaves dust — mirrored here with `trunc`.
    let n: f64 = if raw == "all" {
        a.money.trunc()
    } else {
        parse_ts_int(raw).unwrap_or(0) as f64
    };
    if num > a.money {
        let no = no_markup(&ctx).await;
        ctx.say(
            crate::lang::get(&code, "deposit_cannot_abuse")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Invalid amount.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS mutates first, then replies with the embed (fresh bank value),
    // then posts the economy log.
    a.money -= n;
    a.bank += n;
    balance::save_econ_routed(&ctx.data().pool, &gid, uid, &a).await?;
    let author = user_mention(uid);
    // TS logs `Number(toDeposit)` (!deposit.ts economyLogs.deposit): the
    // untruncated Number value, even though the stored move uses parseInt.
    let money = fmt_num(num);
    let coin = coin_markup(&ctx).await;
    // "all" echoes the raw pre-move wallet (`toDeposit.toString()` where
    // `toDeposit` is the balance number); otherwise the raw input.
    let display = if raw == "all" {
        fmt_num(num)
    } else {
        raw.to_string()
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::lang::get(&code, "daily_embed_title").unwrap_or_else(|| "Daily".to_string()),
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xA4CB80)
        .title(
            crate::lang::get(&code, "deposit_embed_title")
                .unwrap_or_else(|| "Deposit into your bank".to_string()),
        )
        .description(
            crate::lang::get(&code, "deposit_embed_desc")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Coin}", &coin)
                        .replace("${interaction.user}", &author)
                        .replace("${toDeposit}", &display)
                })
                .unwrap_or_else(|| format!("Deposited {}.", fmt_num(n))),
        )
        .field(
            crate::lang::get(&code, "deposit_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", fmt_num(a.bank)),
            false,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    send_with_footer(&ctx, embed).await?;
    post_economy_log(
        &ctx,
        "economy_logs_deposit_title",
        "economy_logs_deposit_desc",
        &[("author", &author), ("money", &money)],
    )
    .await?;
    Ok(())
}
