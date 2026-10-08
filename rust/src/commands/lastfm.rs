// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/lastfm/* (login/config surface).
//
// Real auth + scrobbling need LASTFM_API_KEY / shared secret
// (lastFMScrobblerManager, live-only). Stored here: per-user username
// (LASTFM.<uid>) + guild switch (GUILD.LASTFM).

use crate::bot::Ctx;

pub fn lastfm_key(user_id: u64) -> String {
    format!("LASTFM.{user_id}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "lastfm",
    rename = "lastfm",
    subcommands("lastfm_login", "lastfm_config", "lastfm_status"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn lastfm(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

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

#[poise::command(slash_command, prefix_command, rename = "status")]
pub async fn lastfm_status(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let saved = crate::db::kv_get(&ctx.data().pool, "0", &lastfm_key(ctx.author().id.get())).await;
    ctx.say(match saved {
        Some(u) => format!("Linked as {u} (scrobble pending keys)."),
        None => "Not linked.".to_string(),
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_shape() {
        assert_eq!(lastfm_key(5), "LASTFM.5");
    }
}
