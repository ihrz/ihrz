use super::*;
use poise::serenity_prelude as serenity;

/// Load a guild config backup from an encrypted file.
// Mirrors !restore.ts (always replies restore_msg).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config-restore",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_config_restore(
    ctx: Ctx<'_>,
    #[description = "Backup file"] backup_to_load: Option<serenity::Attachment>,
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    if let (Some(gid), Some(att)) = (ctx.guild_id().map(|g| g.get().to_string()), backup_to_load) {
        let token = crate::config::api_token().unwrap_or_default();
        if let Ok(bytes) = att.download().await {
            if let Ok(text) = String::from_utf8(bytes) {
                // Stray control bytes break JSON parsing; string
                // escapes stay intact (they are not literal).
                let clean: String = text.chars().filter(|c| !c.is_control()).collect();
                if let Some(plain) = crate::funcs::decrypt_text(&token, clean.trim()) {
                    if let Ok(serde_json::Value::Object(map)) =
                        serde_json::from_str::<serde_json::Value>(&plain)
                    {
                        let _ = restore_guild_rows(pool, &gid, &map).await;
                    }
                }
            }
        }
    }
    ctx.say(t("guildconfig_config_restore_msg")).await?;
    Ok(())
}
