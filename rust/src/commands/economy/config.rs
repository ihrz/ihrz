use super::*;

/// Mirrors `!config.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    // Mirrors !config.ts: only the exact states "on"/"off" change anything.
    // Any other input (typo, ...) leaves the module untouched — it must
    // never disable the economy on a typo.
    let state = action.trim();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    let disabled = economy_disabled(&ctx.data().pool, &gid).await;
    let enabled = state == "on";
    if enabled {
        if !disabled {
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_enable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already on.".to_string()),
            )
            .await?;
        } else {
            // TS `db.set(..., false)`: a real boolean, not "0".
            crate::db::kv_set(&ctx.data().pool, &gid, "ECONOMY.disabled", "false").await?;
            ctx.say(
                crate::lang::get(&code, "economy_disable_set_enable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy on.".to_string()),
            )
            .await?;
            let author = user_mention(ctx.author().id.get());
            let state_label = crate::commands::lang_for(&ctx, "var_on", "enabled").await;
            post_economy_log(
                &ctx,
                "economy_logs_config_title",
                "economy_logs_config_desc",
                &[("author", &author), ("state", &state_label)],
            )
            .await?;
        }
    } else if state == "off" {
        if disabled {
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_disable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already off.".to_string()),
            )
            .await?;
        } else {
            // TS `db.set(..., true)`: a real boolean, not "1".
            crate::db::kv_set(&ctx.data().pool, &gid, "ECONOMY.disabled", "true").await?;
            ctx.say(
                crate::lang::get(&code, "economy_disable_set_disable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy off.".to_string()),
            )
            .await?;
            let author = user_mention(ctx.author().id.get());
            let state_label = crate::commands::lang_for(&ctx, "var_off", "disabled").await;
            post_economy_log(
                &ctx,
                "economy_logs_config_title",
                "economy_logs_config_desc",
                &[("author", &author), ("state", &state_label)],
            )
            .await?;
        }
    }
    // TS posts the ihorizon log for EVERY call, including garbage
    // states (the call sits outside the on/off branches).
    let title =
        crate::commands::lang_for(&ctx, "economy_disable_logs_embed_title", "Economy Logs").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "economy_disable_logs_embed_desc",
        "<@${interaction.user.id}> has put the Economy Module to `${state}`!",
    )
    .await
    .replace("${interaction.user.id}", &author_id)
    .replace("${state}", state);
    post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}
