// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/starboard/* (+ skullboard mirror).
//
// TS key: <guild>.GUILD.STARBOARD {channel, createThread, enabled, threshold}
// with threshold clamped 2..=10. Skullboard uses GUILD.SKULLBOARD.

use crate::bot::Ctx;

use poise::serenity_prelude as serenity;

pub mod helpers;
pub mod main;
pub mod skull_channel;
pub mod skull_config;
pub mod skull_thread;
pub mod skull_threshold;
pub mod skullboard;
pub mod starboard_channel;
pub mod starboard_config;
pub mod starboard_thread;
pub mod starboard_threshold;

pub use helpers::*;
/// Leaf re-exports: keep every command/enum reachable via `super::*`
/// from the parent files (confession-style split).
#[allow(unused_imports)]
pub use skull_channel::*;
#[allow(unused_imports)]
pub use skull_config::*;
#[allow(unused_imports)]
pub use skull_thread::*;
#[allow(unused_imports)]
pub use skull_threshold::*;
#[allow(unused_imports)]
pub use starboard_channel::*;
#[allow(unused_imports)]
pub use starboard_config::*;
#[allow(unused_imports)]
pub use starboard_thread::*;
#[allow(unused_imports)]
pub use starboard_threshold::*;
