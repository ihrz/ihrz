use super::*;
use poise::serenity_prelude as serenity;

/// Lock or unlock all text channels.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lock-all",
    aliases("lockall"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_lock_all(
    ctx: Ctx<'_>,
    #[description = "Role to lock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, false, role).await
}
