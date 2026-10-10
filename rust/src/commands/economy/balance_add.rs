use super::*;

/// Mirrors `!balance-add.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "balance-add",
    aliases("addmoney"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_balance_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: f64,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS replies BEFORE mutating (interactionSend, then db.add).
    ctx.say(
        crate::lang::get(&code, "addmoney_command_work")
            .map(|s| {
                s.replace("${user.user.id}", &uid.to_string())
                    .replace("${amount.value}", &fmt_num(amount))
            })
            .unwrap_or_else(|| format!("Added {}.", fmt_num(amount))),
    )
    .await?;
    let mut a = balance::load_econ_routed(&ctx.data().pool, &gid, uid).await;
    // No clamp: TS `db.add` is raw arithmetic (negatives subtract,
    // floats persist).
    add_money(&mut a, amount);
    balance::save_econ_routed(&ctx.data().pool, &gid, uid, &a).await?;
    let invoker_id = ctx.author().id.get().to_string();
    let title =
        crate::commands::lang_for(&ctx, "addmoney_logs_embed_title", "Money addition").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "addmoney_logs_embed_description",
        "${interaction.user.id} added ${amount.value} to ${user.user.id}",
    )
    .await
    .replace("${interaction.user.id}", &invoker_id)
    .replace("${amount.value}", &fmt_num(amount))
    .replace("${user.user.id}", &uid.to_string());
    post_ihorizon_log(&ctx, &title, &desc).await;
    let author = user_mention(ctx.author().id.get());
    let target = user_mention(uid);
    let amt = fmt_num(amount);
    post_economy_log(
        &ctx,
        "economy_logs_add_money_title",
        "economy_logs_add_money_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}
