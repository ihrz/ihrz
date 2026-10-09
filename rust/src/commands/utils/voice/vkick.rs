use super::*;

/// Voice kick (disconnect). Mirrors !vkick.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "vkick",
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn vkick(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match guild_id.disconnect_member(ctx.http(), user.id).await {
        Ok(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_voice_kicked")
                    .unwrap_or_else(|| "Voice kicked.".to_string()),
            )
            .await?
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "vkick_not_in_vc")
                    .unwrap_or_else(|| "The member is not in a voice channel.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}
