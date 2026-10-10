use super::*;

/// Mirrors `!rob.ts`.
#[poise::command(slash_command, prefix_command, rename = "rob")]
pub async fn eco_rob(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    use rand::Rng;
    // Disabled guard first, like !rob.ts.
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS default `?? 3000000` for ECONOMY.settings.rob.cooldown.
    let tune = set_cooldown::load_tuning_routed(&ctx.data().pool, &gid, "rob").await;
    let from = ctx.author().id.get();
    let mut a = balance::load_econ_routed(&ctx.data().pool, &gid, from).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let now = now_ms();
    if a.rob != 0 && tune.cooldown_ms - (now - a.rob) > 0 {
        let units = time_units(&ctx).await;
        let time = beautiful_ms_lang((tune.cooldown_ms - (now - a.rob)) as f64, &units);
        let text = crate::lang::get(&code, "work_cooldown_error")
            .map(|s| {
                s.replace("${interaction.user.id}", &from.to_string())
                    .replace("${time}", &time)
            })
            .unwrap_or_else(|| "Rob on cooldown.".to_string());
        // TS replies with flags [1 << 6] (ephemeral).
        ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
            .await?;
        return Ok(());
    }
    let mut b = balance::load_econ_routed(&ctx.data().pool, &gid, user.id.get()).await;
    // Both sides need 250+ (`author < 250`, `targetuser < 250`); unset
    // balances read as 0 (never the string "null" — kept correct).
    if a.money < 250 {
        ctx.say(
            crate::lang::get(&code, "rob_dont_enought_error")
                .unwrap_or_else(|| "Rob failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if b.money < 250 {
        let target_name = user
            .global_name
            .clone()
            .unwrap_or_else(|| user.name.clone());
        ctx.say(
            crate::lang::get(&code, "rob_him_dont_enought_error")
                .map(|s| s.replace("${user.user.username}", &target_name))
                .unwrap_or_else(|| "Rob failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // `Math.floor(Math.random() * 200) + 1` (1..=200).
    let loot: i64 = rand::thread_rng().gen_range(1..=200i64);
    // TS replies with the embed BEFORE mutating (interactionSend,
    // then db.sub/add/set).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xA4CB80)
        .description(
            crate::lang::get(&code, "rob_embed_description")
                .map(|s| {
                    s.replace("${interaction.user.id}", &from.to_string())
                        .replace("${user.id}", &user.id.get().to_string())
                        .replace("${random}", &loot.to_string())
                })
                .unwrap_or_else(|| format!("Robbed {loot}.")),
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    b.money -= loot;
    a.money += loot;
    a.rob = now;
    balance::save_econ_routed(&ctx.data().pool, &gid, from, &a).await?;
    balance::save_econ_routed(&ctx.data().pool, &gid, user.id.get(), &b).await?;
    let author = user_mention(from);
    let target = user_mention(user.id.get());
    let amt = loot.to_string();
    post_economy_log(
        &ctx,
        "economy_logs_rob_title",
        "economy_logs_rob_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}
