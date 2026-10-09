use super::*;

/// Banner parent. Mirrors utils banner/banner.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "banner",
    subcommands("banner_user", "banner_server"),
    subcommand_required
)]
pub async fn banner(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
