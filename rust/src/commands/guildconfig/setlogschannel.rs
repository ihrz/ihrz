use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "setlogs",
    aliases("logs", "setlog"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_setlogs(
    ctx: Ctx<'_>,
    #[description = "Log type"] log_type: String,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !valid_log_type(&log_type) {
        ctx.say(
            crate::lang::get(&code, "msg_bad_log_type")
                .unwrap_or_else(|| "Bad log type.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("GUILD.SERVER_LOGS.{log_type}");
    match channel {
        Some(ch) => {
            crate::db::kv_set(&ctx.data().pool, &gid, &key, &ch.id.get().to_string()).await?;
            let cid = ch.id.get().to_string();
            ctx.say(
                crate::lang::get(&code, "setlogschannel_command_work")
                    .map(|s| {
                        s.replace("${argsid.id}", &cid)
                            .replace("${typeOfLogs}", &log_type)
                    })
                    .unwrap_or_else(|| format!("Logs {log_type} set.")),
            )
            .await?;
        }
        None => {
            sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(&ctx.data().pool)
                .await?;
            let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
            ctx.say(
                crate::lang::get(&code, "setlogschannel_command_work_on_delete")
                    .map(|s| s.replace("${interaction.guild.name}", &guild_name))
                    .unwrap_or_else(|| format!("Logs {log_type} cleared.")),
            )
            .await?;
        }
    }
    Ok(())
}
