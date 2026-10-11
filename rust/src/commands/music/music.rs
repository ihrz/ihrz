use super::*;
use super::{
    clear_queue::m_clear, history::m_history, lyrics::m_lyrics, nowplaying::m_nowplaying,
    pause::m_pause, play::m_play, queue::m_queue, r#loop::m_loop, resume::m_resume,
    shuffle::m_shuffle, skip::m_skip, stop::m_stop, trackinfo::m_trackinfo, volume::m_volume,
};

/// Run-less group root. Mirrors the TS `music` HybridCommand definition.
// TS order (`music.ts:64-419`): loop, lyrics, history, clear-queue,
// nowplaying, pause, play, volume, trackinfo, queue, resume, shuffle,
// skip, stop (`volume` is a real TS sub at music.ts:270, kept).
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
        "m_loop",
        "m_lyrics",
        "m_history",
        "m_clear",
        "m_nowplaying",
        "m_pause",
        "m_play",
        "m_volume",
        "m_trackinfo",
        "m_queue",
        "m_resume",
        "m_shuffle",
        "m_skip",
        "m_stop"
    ),
    subcommand_required,
    name_localized("fr", "musique"),
    name_localized("ja", "music"),
    name_localized("ru", "music"),
    name_localized("es-ES", "music"),
    description_localized("fr", "Commande sous-groupé pour la catégorie de musique"),
    description_localized("ja", "音楽カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории музыки!"),
    description_localized("es-ES", "Subcomando para la categoría de música!")
)]
pub async fn music(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
