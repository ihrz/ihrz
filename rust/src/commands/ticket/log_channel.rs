use super::*;
use poise::serenity_prelude as serenity;

/// Embed description for the logs-channel confirm: actor + channel slots.
/// Mirrors !log-channel.ts:76-101 (green embed + footer + footer attachment).
pub fn logchannel_desc(template: &str, user_mention: &str, channel_mention: &str) -> String {
    template
        .replace("${interaction.user}", user_mention)
        .replace("${channel}", channel_mention)
}

/// Set a channel where iHorizon sent a logs about tickets!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "log-channel",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir un canal sur lequel iHorizon a envoyé des journaux sur les tickets"
    ),
    description_localized("ja", "iHorizonがチケットに関するログを送信するチャンネルを設定！"),
    description_localized("ru", "Установить канал для логов iHorizon о тикетах!"),
    description_localized(
        "es-ES",
        "Establecer un canal donde iHorizon envíe registros sobre tickets!"
    )
)]
pub async fn ticket_log_channel(
    ctx: Ctx<'_>,
    #[description = "Where you want the logs"]
    #[description_localized("fr", "Où voulez-vous les journaux ?")]
    #[description_localized("ja", "ログを送信する場所")]
    #[description_localized("ru", "Куда вы хотите отправлять логи")]
    #[description_localized("es-ES", "Donde quieres los registros")]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Mirrors !log-channel.ts: disable guard.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    let http = ctx.serenity_context().http.clone();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.TICKET.logs",
        &channel.id.get().to_string(),
    )
    .await?;
    let desc = logchannel_desc(
        &crate::lang::get(&code, "ticket_logchannel_embed_desc").unwrap_or_else(|| {
            "${interaction.user}, you have set the Ticket module's log channel to ${channel}!"
                .to_string()
        }),
        &format!("<@{}>", ctx.author().id.get()),
        &format!("<#{}>", channel.id.get()),
    );
    let (footer_name, footer_icon) = ticket_footer(&http, pool, &gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(
                crate::lang::get(&code, "ticket_logchannel_embed_title")
                    .unwrap_or_else(|| "Ticket Logs Channel".to_string()),
            )
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &footer_name,
        footer_icon.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(icon) = footer_icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desc_fills_actor_and_channel() {
        let out = logchannel_desc("${interaction.user} -> ${channel}!", "<@7>", "<#9>");
        assert_eq!(out, "<@7> -> <#9>!");
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn logs_flag_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g", "g", "GUILD.TICKET.logs", "456")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.TICKET.logs")
                .await
                .as_deref(),
            Some("456")
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.TICKET.logs")
            .await
            .is_some());
    }
}
