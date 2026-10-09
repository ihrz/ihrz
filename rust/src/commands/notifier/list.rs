use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let entries = load_entries(&ctx.data().pool, &gid).await;
    ctx.say(if entries.is_empty() {
        "No notifier entries.".to_string()
    } else {
        entries
            .iter()
            .map(|e| format!("{} ({})", e.id_or_username, e.platform))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}
