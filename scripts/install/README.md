# iHorizon Installation Script

This folder contains an installation script designed to automate the installation of required dependencies and simplify the setup, deployment, and usage of the iHorizon Discord Bot.

These scripts help you:

- Install `git`, `curl`, `unzip`, `bun`, `nodejs`, `pm2`, the Chrome web browser (via Puppeteer), and additional required packages (`fonts-noto-color-emoji`, `xvfb`, `melt`)
- Clone the iHorizon repository (choosing between the `production` and `dev` branches)
- Install iHorizon dependencies
- Back up any existing `config.ts` before regenerating it, and optionally skip the interactive setup to keep your current configuration
- Walk you through an interactive setup covering the Discord bot token, owner IDs, phone presence, message command settings, Lavalink (music module), Last.fm (scrobbler module), and database configuration (SQLite or MySQL)
- Set up `pm2` for iHorizon, start the bot, and optionally configure it to launch automatically at machine startup

The installation script is available as a Bash (`.sh`) script, which means it must be executed on a Linux-based operating system or through [Windows Subsystem for Linux (WSL) with an Ubuntu/Debian base.](https://learn.microsoft.com/en-us/windows/wsl/install)

Currently, the script supports Ubuntu and Debian-based distributions, and requires either `systemd` or `openrc` as your init system (needed for `pm2 startup`). Support for additional Linux distributions may be added in the future.