use super::*;

/// Mirrors `!boost-set.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "boost-set",
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
            crate::lang::get(&code, "economy_boost_role_not_found")
                .unwrap_or_else(|| "Role not in shop.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS `parseInt(...)` on the boost string; the stored shape is a
    // number (unparseable input lands on 0, like NaN would).
    let amount = parse_ts_int(boost.trim()).unwrap_or(0) as f64;
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
