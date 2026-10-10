use super::*;
use super::{info::tts_info, join::tts_join, lang::tts_lang, leave::tts_leave};

/// Subcommand for tts category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "tts",
    rename = "tts",
    subcommands("tts_join", "tts_leave", "tts_info", "tts_lang"),
    subcommand_required
)]
pub async fn tts(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
