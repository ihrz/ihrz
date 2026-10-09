use super::*;
use poise::serenity_prelude as serenity;

/// Export the guild config backup.
// Mirrors !save.ts: gateway link on prod/dev, encrypted file DM else.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config-save",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_config_save(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    ctx.send(
        poise::CreateReply::default()
            .content(t("guildconfig_config_save_check_dm"))
            .ephemeral(true),
    )
    .await?;
    let token = crate::config::api_token().unwrap_or_default();
    if crate::config::is_gateway_env() {
        if let (Some(base), Some(_)) = (crate::config::gateway_base(), Some(())) {
            if let Ok(link) =
                crate::funcs::gateway_url(&base, crate::funcs::GatewayMethod::ServerBackup)
            {
                let url = format!(
                    "{link}/{}/{}",
                    crate::funcs::encrypt_text(&token, &gid),
                    crate::funcs::encrypt_text(&token, &now_ms().to_string())
                );
                let _ = ctx
                    .author()
                    .direct_message(
                        ctx.http(),
                        serenity::CreateMessage::new()
                            .content(format!("{}{url}", t("guildconfig_config_save_user_msg_2"))),
                    )
                    .await;
                return Ok(());
            }
        }
    }
    let dump = dump_guild_rows(pool, &gid).await;
    let payload = crate::funcs::encrypt_text(&token, &serde_json::Value::Object(dump).to_string());
    let guild_name = ctx
        .guild()
        .map(|g| g.name.clone())
        .unwrap_or_else(|| gid.clone());
    let _ = ctx
        .author()
        .direct_message(
            ctx.http(),
            serenity::CreateMessage::new()
                .content(
                    t("guildconfig_config_save_user_msg")
                        .replace("${interaction.guild.name}", &guild_name),
                )
                .add_file(serenity::CreateAttachment::bytes(
                    payload.into_bytes(),
                    format!("{gid}.json"),
                )),
        )
        .await;
    Ok(())
}
