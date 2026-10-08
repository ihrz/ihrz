// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
// Copyright (c) 2020-2026 iHorizon
//
// Rust port entry point. Mirrors src/index.ts (shard bootstrap)
// + src/core/bot.ts (client construction) + src/core/core.ts (module init).

// Incremental port: pure helpers land with unit tests before their Discord
// call sites are wired; silence dead_code until the port converges.
#![allow(dead_code)]

mod audio;
mod bot;
mod cards;
mod commands;
mod config;
mod core;
mod db;
mod embed_builder;
mod emojis;
mod events;
mod events_handler;
mod executor;
mod funcs;
mod lang;
mod logger;
mod monitor;
mod notifier;
mod scheduler;
mod transcript;
mod voice;

use anyhow::Context;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    logger::init();

    let cfg = config::load().context("load config")?;
    tracing::info!("iHorizon Rust v{} starting", env!("CARGO_PKG_VERSION"));

    // Mirrors src/index.ts writeVersionFile(): persist current version for
    // release-notifier comparison (v.txt vs v.old.txt at repo root).
    core::release::write_version_file(env!("CARGO_PKG_VERSION"))?;

    // DB mirrors src/core/database (sqlite by default, mysql optional).
    let pool = db::init(&cfg).await.context("init database")?;

    bot::run(cfg, pool).await
}
