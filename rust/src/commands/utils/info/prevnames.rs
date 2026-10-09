use super::*;

/// Previous names. Mirrors utils !prevnames.ts (tracked in user_update).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "prevnames",
    aliases("pvnames", "pvname", "prevname")
)]
pub async fn prevnames(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let target = user.unwrap_or_else(|| ctx.author().clone());
    let raw = crate::db::kv_get(
        &ctx.data().pool,
        "0",
        &crate::events::prevnames_key(target.id.get()),
    )
    .await;
    let history: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if history.is_empty() {
        ctx.say(
            crate::lang::get(&code, "prevnames_undetected")
                .unwrap_or_else(|| "No data found!".to_string()),
        )
        .await?;
        return Ok(());
    }
    // Mirrors the paged embed title in !prevnames.ts:78
    // (first page; full pagination is a later pass).
    let display = target
        .global_name
        .clone()
        .unwrap_or_else(|| target.name.clone());
    let title = crate::lang::get(&code, "prevnames_embed_title")
        .map(|s| s.replace("${user.username}", &display))
        .unwrap_or_else(|| format!("List of all {display}'s nicknames"));
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(format!("{title} | Page 1"))
        .description(history.join("\n"));
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
