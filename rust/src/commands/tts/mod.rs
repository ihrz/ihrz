// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/tts/* via ttsManager.ts.
//
// TS keys: <guild>.GUILD.TTS {textChannelId, voiceChannelId, lang}.
// 9 locales: en-US fr-FR de-DE es-ES it-IT jp-JP pt-PT ru-RU ar-EG.
// Refusals: music playing, H247 mismatch (see voice.rs music_guard).

pub mod main;
