use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "suggestion",
    rename = "suggest",
    subcommands("suggest_accept", "suggest_deny", "suggest_delete", "suggest_reply")
)]
pub async fn suggest(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

async fn set_status(
    ctx: &Ctx<'_>,
    code: &str,
    status: &str,
    reply: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = load_suggestion(&ctx.data().pool, &gid, code).await;
    let Some(mut s) = raw else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "suggest_delete_not_found_db")
                .unwrap_or_else(|| "The suggestion is not found in my DB!".to_string()),
        )
        .await?;
        return Ok(());
    };
    s.status = status.to_string();
    if let Ok(thread_id) = s.thread_id.parse::<u64>() {
        if thread_id != 0 {
            let _ = poise::serenity_prelude::ChannelId::new(thread_id)
                .say(
                    &ctx.http(),
                    format!(
                        "Suggestion {code} is now {status}.{}",
                        reply.clone().unwrap_or_default()
                    ),
                )
                .await;
        }
    }
    save_suggestion(&ctx.data().pool, &gid, code, &s).await?;
    ctx.say(format!(
        "Suggestion {code} {status}.{}",
        reply.map(|r| format!(" Reply: {r}")).unwrap_or_default()
    ))
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "accept",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_accept(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
) -> Result<(), anyhow::Error> {
    set_status(&ctx, &code, "accepted", None).await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "deny",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_deny(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
) -> Result<(), anyhow::Error> {
    set_status(&ctx, &code, "denied", None).await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "reply",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_reply(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
    #[description = "Reply"] reply: String,
) -> Result<(), anyhow::Error> {
    set_status(&ctx, &code, "replied", Some(reply)).await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "delete",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn suggest_delete(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    delete_suggestion(&ctx.data().pool, &gid, &code).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "suggest_delete_command_work")
            .unwrap_or_else(|| "You have deleted the suggestion!".to_string()),
    )
    .await?;
    Ok(())
}
