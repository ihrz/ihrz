use super::*;

/// Mirrors `!greset.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // NOTE: !greset.ts has no disabled gate — none here either.
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_geconomy_are_you_sure",
        "Delete all economy data for ALL members? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.ECONOMY%'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "All economy reset.".to_string()),
    )
    .await?;
    let title = crate::commands::lang_for(
        &ctx,
        "reset_geconomy_logs_embed_title",
        "Economy Module Logs (VERY DANGEROUS ACTION)",
    )
    .await;
    let desc = crate::commands::lang_for(
        &ctx,
        "reset_geconomy_logs_embed_desc",
        "${interaction.member.user.toString()} has deleted all economy module data for **EVERYONE**!",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &user_mention(ctx.author().id.get()),
    );
    post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}
