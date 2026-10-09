use super::*;

/// Server info. Mirrors utils serverinfo.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "serverinfo",
    aliases("si", "gi")
)]
pub async fn serverinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let (name, id, members, channels, roles, boosts) = {
        let Some(guild) = ctx.serenity_context().cache.guild(guild_id) else {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_guild_not_cached")
                    .unwrap_or_else(|| "Guild not cached.".to_string()),
            )
            .await?;
            return Ok(());
        };
        (
            guild.name.clone(),
            guild.id.get().to_string(),
            guild.member_count.to_string(),
            guild.channels.len().to_string(),
            guild.roles.len().to_string(),
            guild.premium_subscription_count.unwrap_or(0).to_string(),
        )
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(name)
        .field(f("serverinfo_embed_fields_id", "ID"), id, true)
        .field(
            f("serverinfo_embed_fields_members", "Members"),
            members,
            true,
        )
        .field(
            f("serverinfo_embed_fields_channels", "Channels"),
            channels,
            true,
        )
        .field(f("serverinfo_embed_fields_roles", "Roles"), roles, true)
        .field(f("var_boosts", "Boosts"), boosts, true);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
