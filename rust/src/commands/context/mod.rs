// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Context menu commands. Mirrors UserApplicationCommands/* +
// MessageApplicationCommands/* (bridges to existing logic;
// sound_to_video shells out to ffmpeg/ffprobe like the TS version).

use crate::bot::Ctx;

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub mod msg;
pub mod user;
