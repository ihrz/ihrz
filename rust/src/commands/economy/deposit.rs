use super::*;

/// Mirrors `!deposit.ts`.
#[poise::command(slash_command, prefix_command, rename = "deposit", aliases("dep"))]
pub async fn eco_deposit(
    ctx: Ctx<'_>,
    #[description = "Amount or all"] amount: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = ctx.author().id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !deposit.ts: `toDeposit === "all"` takes the wallet, then
    // `isNaN(Number(...))` / `Number(...) <= 0` gate on the not-integer
    // key, and only `toDeposit > balance` (Number comparison, untruncated)
    // gates on cannot-abuse. The stored move uses parseInt truncation.
    let raw = amount.trim();
    let num: f64 = if raw == "all" {
        a.money as f64
    } else {
        match ts_number(raw) {
            Some(v) => v,
            None => {
                not_integer_reply(&ctx, &code).await?;
                return Ok(());
            }
        }
    };
    if num <= 0.0 || !num.is_finite() {
        not_integer_reply(&ctx, &code).await?;
        return Ok(());
    }
    let n: i64 = if raw == "all" {
        a.money
    } else {
        parse_ts_int(raw).unwrap_or(0)
    };
    if num > a.money as f64 {
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
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    let author = user_mention(uid);
    let money = n.to_string();
    let coin = coin_markup(&ctx).await;
    let display = if raw == "all" {
        n.to_string()
    } else {
        raw.to_string()
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::lang::get(&code, "daily_embed_title")
                    .unwrap_or_else(|| "Deposit".to_string()),
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xA4CB80)
        .title(
            crate::lang::get(&code, "deposit_embed_title").unwrap_or_else(|| "Deposit".to_string()),
        )
        .description(
            crate::lang::get(&code, "deposit_embed_desc")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Coin}", &coin)
                        .replace("${interaction.user}", &author)
                        .replace("${toDeposit}", &display)
                })
                .unwrap_or_else(|| format!("Deposited {n}.")),
        )
        .field(
            crate::lang::get(&code, "deposit_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", a.bank),
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
