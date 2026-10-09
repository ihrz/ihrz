use super::*;

/// Voice mute/unmute helpers. Mirrors talk/untalk (!talk.ts family).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "talk",
    aliases("mutetalk"),
    default_member_permissions = "MUTE_MEMBERS"
)]
pub async fn talk(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    voice_mute_flag(&ctx, user, false).await
}
