use super::*;
use poise::serenity_prelude as serenity;

/// Join role. Mirrors joinRole (GUILD.GUILD_CONFIG.joinroles).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "joinrole",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_joinrole(
    ctx: Ctx<'_>,
    #[description = "Role (omit to clear)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    let has_role = role.is_some();
    welcomer_set(
        &mut cfg,
        "joinroles",
        role.map(|r| serde_json::Value::String(r.id.get().to_string())),
    );
    super::welcomer::save_guild_config_routed(pool, &gid, &cfg).await?;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if has_role {
        ctx.say(
            crate::lang::get(&code, "msg_join_role_set")
                .unwrap_or_else(|| "Join role set.".to_string()),
        )
        .await?;
    } else {
        ctx.say(
            crate::lang::get(&code, "msg_join_role_cleared")
                .unwrap_or_else(|| "Join role cleared.".to_string()),
        )
        .await?;
    }
    Ok(())
}
