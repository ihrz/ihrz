use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Config audit log, like the ihorizon_logs calls in !config.ts.
    if let Some(guild_id) = ctx.guild_id() {
        post_ticket_config_log(
            ctx.http(),
            guild_id,
            &code,
            if enabled {
                "disableticket_logs_embed_title_enable"
            } else {
                "disableticket_logs_embed_title_disable"
            },
            if enabled {
                "disableticket_logs_embed_description_enable"
            } else {
                "disableticket_logs_embed_description_disable"
            },
            ctx.author().id.get(),
        )
        .await;
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.TICKET.disable",
        if enabled { "0" } else { "1" },
    )
    .await?;
    ctx.say(
        crate::lang::get(
            &code,
            if enabled {
                "disableticket_command_work_enable"
            } else {
                "disableticket_command_work_disable"
            },
        )
        .unwrap_or_else(|| {
            if enabled {
                "Tickets on.".to_string()
            } else {
                "Tickets off.".to_string()
            }
        }),
    )
    .await?;
    Ok(())
}
