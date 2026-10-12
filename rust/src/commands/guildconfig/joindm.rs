use super::*;

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors `client.func.ihorizon_logs` (best-effort, silent
/// when missing), like the panel `askForDm` / `resetDm` audit posts
/// (`welcomerPanel.ts:1058-1065,1095-1102`) and the panel
/// `saveRoles` join-roles post (`welcomerPanel.ts:1118-1125`).
pub(super) async fn post_joindm_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|c| (c.id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(0xBF0BB9)
        .title(title.to_string())
        .description(description.to_string());
    let _ = poise::serenity_prelude::ChannelId::new(log_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

// Mirrors the welcomer panel `askForDm` / `resetDm`
// (`welcomerPanel.ts:1016-1105`, `GUILD.GUILD_CONFIG.joindm`).
/// Join DM text.
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
    // Mirrors the panel `resetDm` guard (`welcomerPanel.ts:1078-1084`):
    // clearing an already-empty join DM replies `already_disable`.
    let had = cfg
        .get("joindm")
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    welcomer_set(
        &mut cfg,
        "joindm",
        cleaned.clone().map(serde_json::Value::String),
    );
    super::welcomer::save_guild_config_routed(pool, &gid, &cfg).await?;
    let author_id = ctx.author().id.get().to_string();
    match cleaned {
        Some(text) => {
            let title = crate::lang::get(&code, "setjoindm_logs_embed_title_on_enable")
                .unwrap_or_else(|| "Set JoinDM Logs".to_string());
            let desc = crate::lang::get(&code, "setjoindm_logs_embed_description_on_enable")
                .map(|s| s.replace("${interaction.user.id}", &author_id))
                .unwrap_or_else(|| format!("<@{author_id}> set the join DM message!"));
            post_joindm_log(&ctx, &title, &desc).await;
            ctx.say(
                crate::lang::get(&code, "setjoindm_confirmation_message_on_enable")
                    .map(|s| s.replace("${dm_msg}", &text))
                    .unwrap_or_else(|| {
                        "You have successfully set the join DM to:```${dm_msg}``` And enabled it"
                            .to_string()
                    }),
            )
            .await?;
        }
        None => {
            if !had {
                ctx.say(
                    crate::lang::get(&code, "setjoindm_already_disable")
                        .unwrap_or_else(|| "The join DM message is already disabled!".to_string()),
                )
                .await?;
                return Ok(());
            }
            let title = crate::lang::get(&code, "setjoindm_logs_embed_title_on_disable")
                .unwrap_or_else(|| "Set JoinDm Logs".to_string());
            let desc = crate::lang::get(&code, "setjoindm_logs_embed_description_on_disable")
                .map(|s| s.replace("${interaction.user.id}", &author_id))
                .unwrap_or_else(|| format!("<@{author_id}> disabled the join DM message!"));
            post_joindm_log(&ctx, &title, &desc).await;
            ctx.say(
                crate::lang::get(&code, "setjoindm_confirmation_message_on_disable")
                    .unwrap_or_else(|| "You have successfully disabled the join DM!".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
