use super::*;
use poise::serenity_prelude as serenity;

/// Load a guild config backup from an encrypted file.
// Mirrors !restore.ts (always replies restore_msg).
// TS path `guildconfig config restore` (`guildconfig.ts` `config` group leaf).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "restore",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_config_restore(
    ctx: Ctx<'_>,
    // TS guildconfig.ts (`config` -> `restore`) registers "backup-to-load"
    // (required Attachment). Kept `Option` for prefix-path compat (a
    // prefix call carries no attachment); absent -> still replies
    // restore_msg, like !restore.ts would on decrypt failure.
    #[description = "The backup to load"]
    #[description_localized("fr", "La sauvegarde à restaurer")]
    #[description_localized("ja", "読み込むバックアップ")]
    #[description_localized("ru", "Резервная копия для загрузки")]
    #[description_localized("es-ES", "La copia de seguridad a cargar")]
    #[rename = "backup-to-load"]
    backup_to_load: Option<serenity::Attachment>,
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
