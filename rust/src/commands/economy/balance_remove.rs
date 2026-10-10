use super::*;

/// Mirrors `!balance-remove.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "balance-remove",
    aliases("removemoney"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_balance_remove(
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
    let mut a = balance::load_econ_routed(&ctx.data().pool, &gid, uid).await;
    // No clamp: TS `db.sub` is raw arithmetic (balance may go negative).
    add_money(&mut a, -amount);
    balance::save_econ_routed(&ctx.data().pool, &gid, uid, &a).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS posts the ihorizon log BEFORE replying with the embed, and the
    // economy log after.
    let invoker_id = ctx.author().id.get().to_string();
    let title =
        crate::commands::lang_for(&ctx, "removemoney_logs_embed_title", "Money removal").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "removemoney_logs_embed_description",
        "${interaction.user.id} removed ${amount} from ${user.user.id}",
    )
    .await
    .replace("${interaction.user.id}", &invoker_id)
    .replace("${amount}", &fmt_num(amount))
    .replace("${user.user.id}", &uid.to_string());
    post_ihorizon_log(&ctx, &title, &desc).await;
    // Mirrors the !balance-remove.ts embed (title + Amount / Balance
    // Updated fields, #bc0116).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::lang::get(&code, "removemoney_embed_title")
                    .unwrap_or_else(|| "Removed Money!".to_string()),
            )
            .icon_url(ctx.author().face()),
        )
        .field(
            crate::lang::get(&code, "removemoney_embed_fields")
                .unwrap_or_else(|| "Amount".to_string()),
            format!("{}$", fmt_num(amount)),
            false,
        )
        .field(
            crate::lang::get(&code, "removemoney_embed_second_fields")
                .unwrap_or_else(|| "Balance Updated".to_string()),
            format!("{}$", a.money),
            false,
        )
        .colour(0xBC0116)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    let author = user_mention(ctx.author().id.get());
    let target = user_mention(uid);
    let amt = fmt_num(amount);
    post_economy_log(
        &ctx,
        "economy_logs_remove_money_title",
        "economy_logs_remove_money_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}
