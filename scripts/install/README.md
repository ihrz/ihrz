# iHorizon Installation Script

`install.sh` installs and configures the iHorizon Discord Bot on Ubuntu / Debian, then starts it under `pm2`.

```bash
curl -fsSL https://ihorizon.org/install.sh -o install.sh && bash install.sh
```

Run it as your normal user (not root): it uses `sudo` for the system packages only. Running it again updates the bot and lets you keep or redo the configuration.

What it does:

1. Installs the missing system packages: `git`, `curl`, `unzip`, `ffmpeg`, `melt`, `xvfb` and `fonts-noto-color-emoji` (nothing else is upgraded).
2. Installs Bun, Node.js (through nvm, for `pm2`) and `pm2` when they are missing.
3. Clones the repository into `~/ihrz` on the `production` or `dev` branch, or updates an existing checkout (switching branch if needed), then installs the dependencies.
4. Writes the configuration in `.env`: the Discord token and owners, prefix settings, Lavalink nodes (music), the database (SQLite, PostgreSQL, HorizonDB or JSON), log channels, Last.fm and development mode. Secrets are typed hidden, IDs are checked, and connection URLs are built and percent-encoded for you. An existing `.env` can be kept (a legacy `src/files/config.ts` is then moved into it with `bun run config:env`) or backed up and replaced.
5. Checks the configuration with the bot's own parser before starting anything.
6. Starts iHorizon under `pm2`, either from the checkout (it updates itself with `git pull` on every restart) or as a standalone binary built on the machine and installed in `~/ihorizon-bin` with its `.env`, data and version files. The previous `iHorizon` pm2 process is replaced, so two copies of the bot never run at once.
7. Optionally makes `pm2` start iHorizon at boot (needs `systemd` or `openrc`).

`IHORIZON_DIR` and `IHORIZON_BIN_DIR` override the checkout and binary folders.

On Windows, use [Windows Subsystem for Linux (WSL) with an Ubuntu/Debian base](https://learn.microsoft.com/en-us/windows/wsl/install).
