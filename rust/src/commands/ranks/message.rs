use super::*;

/// Custom level-up message template.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    aliases("msg"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_msg(
    ctx: Ctx<'_>,
    #[description = "Template (empty to clear)"] template: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match template
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
    {
        Some(t) => {
            crate::db::kv_set(&ctx.data().pool, &gid, "GUILD.RANKS.message", &t).await?;
            ctx.say(
                crate::lang::get(&code, "msg_level_up_message_set")
                    .unwrap_or_else(|| "Level-up message set.".to_string()),
            )
            .await?;
        }
        None => {
            sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind("GUILD.RANKS.message")
                .execute(&ctx.data().pool)
                .await?;
            ctx.say(
                crate::lang::get(&code, "msg_level_up_message_cleared")
                    .unwrap_or_else(|| "Level-up message cleared.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
