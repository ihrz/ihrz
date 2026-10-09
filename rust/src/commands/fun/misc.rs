use super::*;

/// 67 meme. Mirrors fun !67.ts (fixed GIF URL).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "67")]
pub async fn sixseven(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    ctx.say("https://www.ihorizon.org/assets/img/fun/67_command.gif")
        .await?;
    Ok(())
}

/// Inside joke reply. Mirrors MessageCommands bot @ (grosbg), verbatim.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "grosbg")]
pub async fn grosbg(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("kly ( @hjcbebcbknckehcbckb ) le plus beau").await?;
    Ok(())
}

/// Enable/disable fun commands. Mirrors fun !config.ts (GUILD.FUN.states).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn fun_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.FUN.states",
        if enabled { "1" } else { "0" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let action_type = crate::lang::get(
        &code,
        if enabled {
            "var_enabled"
        } else {
            "var_disabled"
        },
    )
    .unwrap_or_else(|| {
        if enabled {
            "Enabled".to_string()
        } else {
            "Disabled".to_string()
        }
    });
    ctx.say(
        crate::lang::get(&code, "fun_disable_command_msg")
            .map(|s| {
                s.replace("${action_type}", &action_type).replace(
                    "${interaction.member?.user.toString()}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
            })
            .unwrap_or_else(|| {
                if enabled {
                    "Fun on.".to_string()
                } else {
                    "Fun off.".to_string()
                }
            }),
    )
    .await?;
    Ok(())
}
