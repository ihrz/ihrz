# iHorizon Installation Script

This folder contains an installation script designed to automate the installation of required dependencies and simplify the setup, deployment, and usage of the iHorizon Discord Bot.

These scripts help you:

- Install `git`, `bun`, `pm2`, `nodejs`, the Chrome web browser (via Puppeteer), and additional required fonts
- Clone the iHorizon repository
- Install iHorizon dependencies
- Configure the bot token
- Set up `pm2` for iHorizon and start the bot

The installation script is available as a Bash (`.sh`) script, which means it must be executed on a Linux-based operating system or through [Windows Subsystem for Linux (WSL) with an Ubuntu/Debian base.](https://learn.microsoft.com/en-us/windows/wsl/install)

Currently, the script supports Ubuntu and Debian-based distributions. Support for additional Linux distributions may be added in the future.