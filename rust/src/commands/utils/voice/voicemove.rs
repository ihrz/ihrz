use super::*;

/// Move one member between voice channels. Mirrors utils move.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "move",
    aliases("déplacer", "deplacer", "switch"),
    default_member_permissions = "MOVE_MEMBERS"
)]
pub async fn voicemove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "To channel"]
    #[channel_types("Voice")]
    to: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    // Admin-victim guard. Mirrors !move.ts: a non-admin invoker cannot
    // move a member holding Administrator.
    let victim_admin = guild_id
        .member(ctx.http(), user.id)
        .await
        .ok()
        .map(|m| is_guild_admin(&ctx, guild_id, &m))
        .unwrap_or(false);
    if victim_admin {
        let invoker_admin = guild_id
            .member(ctx.http(), ctx.author().id)
            .await
            .ok()
            .map(|m| is_guild_admin(&ctx, guild_id, &m))
            .unwrap_or(false);
        if !invoker_admin {
            ctx.say(
                crate::lang::get(&code, "util_move_impossible_to_move_admin").unwrap_or_else(|| {
                    "The member you want to move is an administrator, and you are not an administrator either.".to_string()
                }),
            )
            .await?;
            return Ok(());
        }
    }
    match guild_id.move_member(ctx.http(), user.id, to.id).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_command_ok")
                    .map(|s| {
                        s.replace("${member?.toString()}", &format!("<@{}>", user.id.get()))
                            .replace("${channel.toString()}", &format!("<#{}>", to.id.get()))
                    })
                    .unwrap_or_else(|| "Moved.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "util_move_not_in_vc")
                    .unwrap_or_else(|| "Move failed (member not in voice?).".to_string()),
            )
            .await?
        }
    };
    Ok(())
}
