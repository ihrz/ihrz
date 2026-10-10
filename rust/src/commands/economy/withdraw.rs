use super::*;

/// Withdraw coins from your bank!
#[poise::command(slash_command, prefix_command, rename = "withdraw")]
// Mirrors `!withdraw.ts`.
pub async fn eco_withdraw(
    ctx: Ctx<'_>,
    #[description = "Amount or all"]
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
    let mut a = balance::load_econ_routed(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !withdraw.ts: `toWithdraw === "all"` takes the bank, then
    // `isNaN(Number(...))` gates on not-integer, `parseInt(...) <= 0`
    // gates on not-integer, and only `parseInt(...) > bank` gates on
    // cannot-abuse. The stored move uses parseInt truncation.
    let raw = amount.trim();
    if raw != "all" && ts_number(raw).is_none() {
        not_integer_reply(&ctx, &code).await?;
        return Ok(());
    }
    let n: f64 = if raw == "all" {
        // "all" resolves to the raw bank first, then the stored move is
        // `parseInt` (`!withdraw.ts:92-97`): a fractional bank leaves dust.
        a.bank.trunc()
    } else {
        parse_ts_int(raw).unwrap_or(0) as f64
    };
    if n <= 0.0 {
        not_integer_reply(&ctx, &code).await?;
        return Ok(());
    }
    if n > a.bank {
        let no = no_markup(&ctx).await;
        ctx.say(
            crate::lang::get(&code, "withdraw_cannot_abuse")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Invalid amount.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS mutates first, then replies with the embed (fresh bank value),
    // then posts the economy log.
    // "all" echoes the pre-move bank (`toWithdraw` is the bank string);
    // otherwise the raw input.
    let display = if raw == "all" {
        fmt_num(a.bank)
    } else {
        raw.to_string()
    };
    a.bank -= n;
    a.money += n;
    balance::save_econ_routed(&ctx.data().pool, &gid, uid, &a).await?;
    let author = user_mention(uid);
    // TS logs `Number(clean_to_withdraw)` (`!withdraw.ts:157-162`): the
    // parseInt value as a number.
    let money = fmt_num(n);
    let coin = coin_markup(&ctx).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::lang::get(&code, "daily_embed_title").unwrap_or_else(|| "Daily".to_string()),
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xA4CB80)
        .title(
            crate::lang::get(&code, "withdraw_embed_title")
                .unwrap_or_else(|| "Withdraw from your bank".to_string()),
        )
        .description(
            crate::lang::get(&code, "withdraw_embed_desc")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Coin}", &coin)
                        .replace("${interaction.user}", &author)
                        .replace("${toWithdraw}", &display)
                })
                .unwrap_or_else(|| format!("Withdrew {}.", fmt_num(n))),
        )
        .field(
            crate::lang::get(&code, "withdraw_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", fmt_num(a.bank)),
            false,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    send_with_footer(&ctx, embed).await?;
    post_economy_log(
        &ctx,
        "economy_logs_withdraw_title",
        "economy_logs_withdraw_desc",
        &[("author", &author), ("money", &money)],
    )
    .await?;
    Ok(())
}
