use super::*;

/// Add money to a user!
// Mirrors `!balance-add.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "balance-add",
    aliases("addmoney"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Ajoutez de l'argent à un utilisateur"),
    description_localized("ja", "ユーザーにお金を追加！"),
    description_localized("ru", "Добавить деньги пользователю!"),
    description_localized("es-ES", "Añadir dinero a un usuario!")
)]
pub async fn eco_balance_add(
    ctx: Ctx<'_>,
    // Amount-first like the TS option order (`amount`, then `member` in
    // economy.ts): poise parses prefix args positionally, so this keeps
    // `!balance-add <amount> <member>` aligned on both paths.
    #[description_localized("fr", "Le montant d'argent que vous souhaitez ajouter")]
    #[description_localized("ja", "追加したい金額")]
    #[description_localized("ru", "Сумма денег для добавления")]
    #[description_localized("es-ES", "La cantidad de dinero que quieres añadir")]
    #[description = "The amount of money you want to add"]
    amount: f64,
    #[description_localized("fr", "Le membre à qui vous souhaitez ajouter de l'argent")]
    #[description_localized("ja", "お金を追加したいメンバー")]
    #[description_localized("ru", "Участник, которому добавить деньги")]
    #[description_localized("es-ES", "El miembro al que quieres añadir dinero")]
    #[description = "The member who you want to add money"]
    #[rename = "member"]
    user: poise::serenity_prelude::User,
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
    let title = crate::commands::lang_for(&ctx, "addmoney_logs_embed_title", "Economy Logs").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "addmoney_logs_embed_description",
        "<@${interaction.user.id}> added ${amount.value} coin to <@${user.user.id}>!",
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
