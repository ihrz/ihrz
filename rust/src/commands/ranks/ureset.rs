use super::*;
use poise::serenity_prelude as serenity;

/// Reset one user's ranks.
// Mirrors `!ureset.ts` (`ranks.ts:190-205`): the slash `user` option
// is `required: true`, so a missing target on slash errors out; the
// prefix path falls back to the invoker
// (`client.func.method.member(...) || interaction.member`), so a
// bare prefix call resets self.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ureset",
    aliases("ranks-ureset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_ureset(
    ctx: Ctx<'_>,
    #[description = "Member to reset (defaults to self on prefix)"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let target_id = match user {
        Some(u) => u.id.get(),
        // Prefix-only self default, like TS `|| interaction.member`.
        None if matches!(ctx, poise::Context::Prefix(_)) => ctx.author().id.get(),
        // Slash without a target cannot fall back (TS declares the
        // option `required: true`): answer the usage reply. The text
        // lives behind `ranks_ureset_missing_user` (new lang key,
        // YAML pending) — never a hardcoded string.
        None => {
            if let Some(usage) =
                crate::lang::get(&code, "ranks_ureset_missing_user").filter(|s| !s.is_empty())
            {
                ctx.say(usage).await?;
            }
            return Ok(());
        }
    };
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_uranks_are_you_sure",
        "**Are you really sure you want to delete all rank data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let _ = super::migrated_del(
        &ctx.data().pool,
        &gid,
        &super::user_key_new(target_id),
        &[&super::user_key_old(target_id)],
    )
    .await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Successfully deleted!".to_string()),
    )
    .await?;
    // Audit log (mirrors `!ureset.ts:81-89`).
    let author_id = ctx.author().id.get();
    let title = crate::lang::get(&code, "resetallinvites_logs_embed_title")
        .unwrap_or_else(|| "Reset Logs".to_string());
    let desc = crate::lang::get(&code, "reset_uranks_logs_embed_desc")
        .map(|s| {
            s.replace(
                "${interaction.member.user.toString()}",
                &format!("<@{author_id}>"),
            )
            .replace("${user.toString()}", &format!("<@{target_id}>"))
        })
        .unwrap_or_else(|| format!("Ranks of <@{target_id}> reset by <@{author_id}>."));
    crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}
