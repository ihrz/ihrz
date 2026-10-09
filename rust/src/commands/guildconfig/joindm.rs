use super::*;

/// Join DM text. Mirrors joinDm (GUILD.JOIN_DM).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "joindm",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_joindm(
    ctx: Ctx<'_>,
    #[description = "Message (empty to clear)"] message: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let cleaned = message
        .map(|m| m.trim().to_string())
        .filter(|m| !m.is_empty());
    let mut cfg = load_guild_config(pool, &gid).await;
    welcomer_set(
        &mut cfg,
        "joindm",
        cleaned.clone().map(serde_json::Value::String),
    );
    save_guild_config(pool, &gid, &cfg).await?;
    match cleaned {
        Some(text) => {
            ctx.say(
                crate::lang::get(&code, "setjoindm_confirmation_message_on_enable")
                    .map(|s| s.replace("${dm_msg}", &text))
                    .unwrap_or_else(|| "Join DM set.".to_string()),
            )
            .await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "setjoindm_confirmation_message_on_disable")
                    .unwrap_or_else(|| "Join DM cleared.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
