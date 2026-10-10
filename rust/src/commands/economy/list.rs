use super::*;

/// Shop role list. Mirrors `!list.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-list",
    aliases("economy-role-list"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn eco_role_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = shop::load_shop_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if roles.is_empty() {
        ctx.say(
            crate::lang::get(&code, "economy_role_list_no_buyable_roles")
                .unwrap_or_else(|| "There are no buyable roles to list.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS replies with the role-list embed (title + desc + role fields).
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(
            crate::lang::get(&code, "economy_role_list_embed_title")
                .unwrap_or_else(|| "Economy System - Buyable Roles".to_string()),
        )
        .description(
            crate::lang::get(&code, "economy_role_list_embed_desc")
                .unwrap_or_else(|| "All buyable roles are listed below.".to_string()),
        )
        .colour(0x0097FF)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    for (name, value, inline) in role_fields(&ctx, &roles).await {
        embed = embed.field(name, value, inline);
    }
    send_with_footer(&ctx, embed).await?;
    Ok(())
}
