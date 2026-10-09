use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "hack")]
pub async fn hack(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let header = crate::lang::get(&code, "hack_embed_description")
        .unwrap_or_else(|| "<@${victim.id}> hacked by <@${interaction.user.id}>!".to_string())
        .replace("${victim.id}", &user.id.get().to_string())
        .replace("${interaction.user.id}", &ctx.author().id.get().to_string());
    let mut lines = vec![header];
    lines.extend(hack_lines(&user.tag()));
    ctx.say(lines.join("\n")).await?;
    Ok(())
}
