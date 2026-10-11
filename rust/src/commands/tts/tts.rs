use super::*;
use super::{info::tts_info, join::tts_join, lang::tts_lang, leave::tts_leave};

/// Subcommand for TTS (Text-to-Speech) category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "tts",
    rename = "tts",
    subcommands("tts_join", "tts_leave", "tts_info", "tts_lang"),
    subcommand_required,
    name_localized("fr", "tts"),
    name_localized("ja", "tts"),
    name_localized("ru", "tts"),
    name_localized("es-ES", "tts"),
    description_localized("fr", "Commande sous-groupé pour la catégorie TTS (Text-to-Speech)"),
    description_localized("ja", "TTS（テキスト読み上げ）カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории TTS (озвучивание текста)!"),
    description_localized("es-ES", "Subcomando para la categoría TTS (Texto a Voz)!")
)]
pub async fn tts(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
