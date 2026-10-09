use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock-all",
    aliases("unlockall"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_unlock_all(
    ctx: Ctx<'_>,
    #[description = "Role to unlock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    lock_all_inner(&ctx, true, role).await
}
