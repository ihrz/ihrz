use super::*;

/// Mirrors `!ureset.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ureset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_ureset(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // NOTE: !ureset.ts has no disabled gate — none here either.
    // TS defaults to the invoker when no member is given.
    let target = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    // Cancel replies with setjoinroles_action_canceled via
    // prompt_reset_confirm, like the TS else branch.
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_ueconomy_are_you_sure",
        "Delete all economy data for this user? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Delete the blob row plus any leaf rows under it (TS deletes the
    // whole `USER.<id>.ECONOMY` subtree).
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND (key_name = ? OR key_name LIKE ?)")
        .bind(&gid)
        .bind(econ_key(target))
        .bind(format!("{}.%", econ_key(target)))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Economy reset for user.".to_string()),
    )
    .await?;
    let title = crate::commands::lang_for(
        &ctx,
        "reset_ueconomy_logs_embed_title",
        "Economy Module Logs (DANGEROUS ACTION)",
    )
    .await;
    let desc = crate::commands::lang_for(
        &ctx,
        "reset_ueconomy_logs_embed_desc",
        "${interaction.member.user.toString()} has deleted all economy module data for ${user.toString()}!",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &user_mention(ctx.author().id.get()),
    )
    .replace("${user.toString()}", &user_mention(target));
    post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}
