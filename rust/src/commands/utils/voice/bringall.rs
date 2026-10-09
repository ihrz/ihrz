use super::*;

/// Bring everyone to your voice channel. Mirrors !bringall.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "bringall",
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn bringall(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let Some(target) = target else {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "renewvc_not_in_voice")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let members: Vec<poise::serenity_prelude::UserId> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.voice_states
                .iter()
                .filter(|(_, v)| v.channel_id.is_some() && v.channel_id != Some(target))
                .map(|(uid, _)| *uid)
                .collect()
        })
        .unwrap_or_default();
    let mut n = 0;
    for uid in members {
        if guild_id.move_member(ctx.http(), uid, target).await.is_ok() {
            n += 1;
        }
    }
    ctx.say(format!("Brought {n}.")).await?;
    Ok(())
}
