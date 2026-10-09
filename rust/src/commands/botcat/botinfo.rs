use super::*;

/// Bot info. Mirrors src/Interaction/HybridCommands/bot/botinfo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "bot-info",
    aliases("bi")
)]
pub async fn botinfo_full(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let guilds = ctx.cache().guild_count();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let servers_name = crate::lang::get(&code, "botinfo_embed_fields_myservers")
        .unwrap_or_else(|| "My Servers:".to_string());
    let created_by_name = crate::lang::get(&code, "botinfo_embed_fields_created_by")
        .unwrap_or_else(|| "Created by:".to_string());
    let embed = serenity::CreateEmbed::default()
        .title("iHorizon")
        .field(servers_name, format!("{guilds}"), false)
        .field("Version", env!("CARGO_PKG_VERSION"), false)
        .field(created_by_name, "<@171356978310938624>", false);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
