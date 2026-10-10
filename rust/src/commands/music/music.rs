use super::*;
use super::{
    clear_queue::m_clear, history::m_history, lyrics::m_lyrics, nowplaying::m_nowplaying,
    pause::m_pause, play::m_play, queue::m_queue, r#loop::m_loop, resume::m_resume,
    shuffle::m_shuffle, skip::m_skip, stop::m_stop, trackinfo::m_trackinfo, volume::m_volume,
};

/// Run-less group root. Mirrors the TS `music` HybridCommand definition.
// Prefix alias parity: TS `music.ts:244` puts `p` on the `play`
// subcommand (not the group); the Rust `m_play` leaf keeps
// `aliases("p")`, so `!music p <title>` resolves exactly like TS.
// The group itself keeps only the `m` alias. A bare invocation raises
// SubcommandRequired (mapped to help in `bot.rs`) before this body
// runs, on both paths.
#[poise::command(
    slash_command,
    prefix_command,
    category = "music",
    rename = "music",
    aliases("m"),
    subcommands(
        "m_play",
        "m_skip",
        "m_stop",
        "m_pause",
        "m_resume",
        "m_queue",
        "m_clear",
        "m_shuffle",
        "m_loop",
        "m_volume",
        "m_nowplaying",
        "m_history",
        "m_lyrics",
        "m_trackinfo"
    ),
    subcommand_required
)]
pub async fn music(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
