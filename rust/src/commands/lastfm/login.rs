use super::*;

#[poise::command(slash_command, prefix_command, rename = "login")]
pub async fn lastfm_login(
    ctx: Ctx<'_>,
    #[description = "Last.fm username"] username: String,
) -> Result<(), anyhow::Error> {
    crate::db::kv_set(
        &ctx.data().pool,
        "0",
        &lastfm_key(ctx.author().id.get()),
        username.trim(),
    )
    .await?;
    ctx.say("Last.fm username saved (API auth pending keys).")
        .await?;
    Ok(())
}
