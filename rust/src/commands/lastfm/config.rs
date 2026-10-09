use super::*;

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn lastfm_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.LASTFM",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Last.fm on."
    } else {
        "Last.fm off."
    })
    .await?;
    Ok(())
}
