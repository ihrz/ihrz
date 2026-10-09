use super::*;

/// Shop display + buy flow. Mirrors `shop.ts`.
#[poise::command(slash_command, prefix_command, rename = "shop")]
pub async fn eco_shop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let shop = load_shop(pool, &gid).await;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let uid = ctx.author().id.get();
    let base = load_econ(pool, &gid, uid).await;
    // Restore sweep: re-grant owned roles the member is missing, like
    // the !shop.ts owned-roles loop ("[Economy Shop] Role was not given
    // to the user."). Purchases themselves go through /economy buy.
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            for role_id in &base.owned_roles {
                if let Ok(rid) = role_id.parse::<u64>() {
                    let role = poise::serenity_prelude::RoleId::new(rid);
                    if !member.roles.contains(&role) {
                        let _ = member.add_role(ctx.http(), role).await;
                    }
                }
            }
        }
    }
    if shop.is_empty() {
        ctx.say(
            crate::lang::get(&code, "economy_shop_not_set")
                .unwrap_or_else(|| "Shop is empty.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let shop_json = crate::db::kv_get(pool, &gid, shop_key())
        .await
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let coin = coin_markup(&ctx).await;
    // Mirrors the !shop.ts embed (title with guild name, #45f712,
    // desc, bank / money / boost fields, footer).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(
            crate::lang::get(&code, "economy_shop_embed_title")
                .map(|s| s.replace("${interaction.guild.name}", &guild_name(&ctx)))
                .unwrap_or_else(|| "Shop".to_string()),
        )
        .colour(0x45F712)
        .description(
            crate::lang::get(&code, "economy_shop_embed_desc")
                .unwrap_or_else(|| "Buy roles with your money.".to_string()),
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", base.bank),
            true,
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields2_name")
                .unwrap_or_else(|| "Wallet".to_string()),
            format!("{}{coin}", base.money),
            true,
        )
        .field(
            crate::lang::get(&code, "var_boost").unwrap_or_else(|| "Boost".to_string()),
            format!("{boost}x"),
            true,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    send_with_footer(&ctx, embed).await?;
    Ok(())
}

/// Shared purchase core for /economy buy (and the shop flow): returns
/// the reply text after performing the TS collector steps
/// (already-owned restore, funds check, money + ownedRoles writes,
/// role grant). Replies are ephemeral, like the TS collector replies.
async fn do_buy(
    ctx: &Ctx<'_>,
    role_id: u64,
    role_name: &str,
) -> Result<Option<String>, anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let text = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let shop = load_shop(pool, &gid).await;
    let Some(item) = shop.get(&role_id.to_string()) else {
        return Ok(Some(text(
            "economy_shop_not_available",
            "Role not in shop.",
        )));
    };
    let price = item.price;
    let uid = ctx.author().id.get();
    let mut a = load_econ(pool, &gid, uid).await;
    // Owned-role path (!shop.ts collector): already-owned roles are
    // re-granted if missing and never charged.
    if a.owned_roles.iter().any(|r| r == &role_id.to_string()) {
        if let Some(guild_id) = ctx.guild_id() {
            if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
                let role = poise::serenity_prelude::RoleId::new(role_id);
                if !member.roles.contains(&role) {
                    let _ = member.add_role(ctx.http(), role).await;
                }
            }
        }
        return Ok(Some(text(
            "economy_shop_already_own_role",
            "You already own this role.",
        )));
    }
    if (a.money as f64) < price {
        return Ok(Some(text(
            "economy_shop_not_enough_money",
            "Not enough money.",
        )));
    }
    a.money = (a.money as f64 - price) as i64;
    a.owned_roles.push(role_id.to_string());
    save_econ(pool, &gid, uid, &a).await?;
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            let _ = member
                .add_role(ctx.http(), poise::serenity_prelude::RoleId::new(role_id))
                .await;
        }
    }
    Ok(Some(
        text(
            "economy_shop_role_purchased",
            "Bought {roleName} for ${role.price}.",
        )
        .replace("{roleName}", role_name)
        .replace("${role.price}", &fmt_num(price)),
    ))
}

#[poise::command(slash_command, prefix_command, rename = "buy")]
pub async fn eco_buy(
    ctx: Ctx<'_>,
    #[description = "Role to buy"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    if let Some(reply) = do_buy(&ctx, role.id.get(), &role.name).await? {
        ctx.send(poise::CreateReply::default().content(reply).ephemeral(true))
            .await?;
    }
    Ok(())
}
