use super::*;

/// Shop role delete. Mirrors `!delete.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-delete",
    aliases("economy-role-delete"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn eco_role_delete(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
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
    if roles.is_empty() {
        ctx.say(
            crate::lang::get(&code, "economy_role_add_no_role")
                .unwrap_or_else(|| "Role not in shop.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS deletes unconditionally (missing ids included), then saves,
    // replies with the buyable-roles embed, and logs.
    roles.remove(&id);
    shop::save_shop_routed(&ctx.data().pool, &gid, &roles).await?;
    send_with_footer(&ctx, buyable_roles_embed(&ctx, &roles).await).await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    post_economy_log(
        &ctx,
        "economy_logs_role_remove_title",
        "economy_logs_role_remove_desc",
        &[("author", &author), ("role", &role_m)],
    )
    .await?;
    Ok(())
}
