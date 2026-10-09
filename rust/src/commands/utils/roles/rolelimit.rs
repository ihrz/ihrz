use super::*;

/// Role member cap. Mirrors !rolelimit.ts (GUILD.UTILS.ROLE_LIMIT.<role>).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "rolelimit",
    aliases("limitrole", "limitoles", "roleslimit"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rolelimit(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
    #[description = "Max members (0 to clear)"] limit: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("GUILD.UTILS.ROLE_LIMIT.{}", role.id.get());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match limit.unwrap_or(0) {
        0 => {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(&ctx.data().pool)
                .await;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_cleared")
                    .unwrap_or_else(|| "Role limit cleared.".to_string()),
            )
            .await?;
        }
        n => {
            crate::db::kv_set(&ctx.data().pool, &gid, &key, &n.max(1).to_string()).await?;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_set")
                    .unwrap_or_else(|| "Role limit set.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
