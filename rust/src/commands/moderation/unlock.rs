use super::*;
use poise::serenity_prelude as serenity;

/// Unlock a channel. Mirrors !unlock.ts: neutral overwrite, not delete.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_unlock(
    ctx: Ctx<'_>,
    #[description = "Role to unlock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some(current) = ctx.guild_channel().await else {
        return Ok(());
    };
    let target = role
        .map(|r| r.id)
        .unwrap_or_else(|| serenity::RoleId::new(guild_id.get()));
    // TS writes {SendMessages: null, Connect: null}; an empty PUT
    // overwrite is the equivalent neutral state.
    let _ = current
        .id
        .create_permission(
            ctx.http(),
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::empty(),
                deny: serenity::Permissions::empty(),
                kind: serenity::PermissionOverwriteType::Role(target),
            },
        )
        .await;
    ctx.say(
        crate::lang::get(&code, "unlock_embed_message_description")
            .unwrap_or_else(|| "Channel unlocked.".to_string()),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unlock_logs_embed_title"),
        t("unlock_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${interaction.channel.id}", &current.id.get().to_string()),
    )
    .await;
    Ok(())
}
