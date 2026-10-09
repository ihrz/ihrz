use super::*;

/// Move a member to your voice channel. Mirrors !wakeup.ts.
// Reply-before-move like TS; the 2-minute random-channel loop is skipped.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wakeup",
    aliases("wake"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn wakeup(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    if user.id == ctx.author().id {
        ctx.say(
            crate::lang::get(&code, "util_wakeup_yourself")
                .unwrap_or_else(|| "Not yourself.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let display = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| {
            g.members
                .get(&user.id)
                .map(|m| m.display_name().to_string())
        })
        .or_else(|| user.global_name.clone())
        .unwrap_or_else(|| user.name.clone());
    let victim_in_vc = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&user.id).and_then(|v| v.channel_id))
        .is_some();
    if !victim_in_vc {
        ctx.say(
            crate::lang::get(&code, "util_wakeup_not_in_vc")
                .map(|s| s.replace("${user.displayName}", &display))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let target = ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
        g.voice_states
            .get(&ctx.author().id)
            .and_then(|v| v.channel_id)
    });
    let Some(target) = target else {
        ctx.say(
            crate::lang::get(&code, "util_wakeup_not_in_vc")
                .map(|s| s.replace("${user.displayName}", &display))
                .unwrap_or_else(|| "Join a voice channel first.".to_string()),
        )
        .await?;
        return Ok(());
    };
    // Reply BEFORE moving, like TS (which announces then moves).
    ctx.say(
        crate::lang::get(&code, "util_wakeup_command_work")
            .map(|s| s.replace("${user.toString()}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "Moved.".to_string()),
    )
    .await?;
    let _ = guild_id.move_member(ctx.http(), user.id, target).await;
    Ok(())
}
