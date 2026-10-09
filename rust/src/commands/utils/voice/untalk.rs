use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "untalk",
    aliases("unmutetalk"),
    default_member_permissions = "MUTE_MEMBERS"
)]
pub async fn untalk(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    voice_mute_flag(&ctx, user, true).await
}
