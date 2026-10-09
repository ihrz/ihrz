use super::*;

/// Mirrors `!balance.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "balance",
    aliases("wallet", "coins", "bal")
)]
pub async fn eco_balance(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let a = load_econ(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let coin = coin_markup(&ctx).await;
    let wallet = wallet_markup(&ctx).await;
    let member_name = user.as_ref().map(|u| u.name.clone()).unwrap_or_else(|| {
        ctx.author()
            .global_name
            .clone()
            .unwrap_or_else(|| ctx.author().name.clone())
    });
    let who = user
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_else(|| ctx.author().to_string());
    let shop_json = crate::db::kv_get(&ctx.data().pool, &gid, shop_key())
        .await
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let total = a.money + a.bank;
    // Mirrors !balance.ts: #e3c6ff embed, "`name`'s Wallet" title,
    // wallet desc, bank / money / boost fields with Coin suffix.
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xE3C6FF)
        .title(format!("`{member_name}`'s Wallet"))
        .description(
            crate::lang::get(&code, "balance_he_have_wallet")
                .map(|s| {
                    s.replace("${user}", &who)
                        .replace("${bal}", &total.to_string())
                        .replace("${client.iHorizon_Emojis.Wallet}", &wallet)
                })
                .unwrap_or_else(|| format!("Wallet: {total}")),
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", a.bank),
            true,
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields2_name")
                .unwrap_or_else(|| "Wallet".to_string()),
            format!("{}{coin}", a.money),
            true,
        )
        .field(
            crate::lang::get(&code, "var_boost").unwrap_or_else(|| "Boost".to_string()),
            format!("{boost}x"),
            true,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), uid).await {
            embed = embed.thumbnail(member.avatar_url().unwrap_or_else(|| member.user.face()));
        }
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
