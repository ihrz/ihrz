use super::*;

/// Mirrors `!work.ts`.
/// Work for a random payout.
// Mirrors economy !work.ts (1..=1024 times boost, ephemeral
// cooldown reply, gold embed, reply BEFORE the money add).
#[poise::command(slash_command, prefix_command, category = "economy", rename = "work")]
pub async fn eco_work(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use rand::Rng;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    if economy_disabled(pool, &gid).await {
        ctx.say(
            crate::commands::lang_for(&ctx, "economy_disable_msg", "Economy is disabled.")
                .await
                .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
        )
        .await?;
        return Ok(());
    }
    let tune = load_tuning(pool, &gid, "work").await;
    let uid = ctx.author().id.get();
    let mut account = load_econ(pool, &gid, uid).await;
    let now = now_ms();
    if account.work != 0 && tune.cooldown_ms - (now - account.work) > 0 {
        let units = time_units(&ctx).await;
        let time = beautiful_ms_lang((tune.cooldown_ms - (now - account.work)) as f64, &units);
        let text = crate::commands::lang_for(
            &ctx,
            "economy_cooldown_error",
            "Wait ${time} before you can execute this command again!",
        )
        .await
        .replace("${time}", &time);
        ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
            .await?;
        return Ok(());
    }
    let shop_json = crate::db::kv_get(pool, &gid, shop_key())
        .await
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let amount = rand::thread_rng().gen_range(1..=1024) * boost;
    let display = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    // TS replies with the embed BEFORE adding the money.
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::commands::lang_for(&ctx, "work_embed_author", "It paid off!")
                    .await
                    .replace("${interaction.user.username}", &display),
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xF1D488)
        .description(
            crate::commands::lang_for(&ctx, "work_embed_description", "Earned ${amount}$!")
                .await
                .replace("${interaction.user.username}", &display)
                .replace("${amount}", &amount.to_string()),
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    account.money += amount;
    account.work = now;
    save_econ(pool, &gid, uid, &account).await?;
    Ok(())
}
