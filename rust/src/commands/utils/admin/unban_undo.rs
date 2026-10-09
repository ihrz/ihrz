use super::*;

/// Re-ban the members unbanned by unban-all. Mirrors unbanall !undo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-undo",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn unban_undo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.unban_members").await;
    let list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let mut n = 0;
    for id in list {
        if let Ok(uid) = id.parse::<u64>() {
            if guild_id
                .ban(ctx.http(), poise::serenity_prelude::UserId::new(uid), 0)
                .await
                .is_ok()
            {
                n += 1;
            }
        }
    }
    ctx.say(format!("Re-banned {n}.")).await?;
    Ok(())
}
