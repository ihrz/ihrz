# Version Patch 2026.5.1 (1st patch of May 2026)

## Changes between [2026.4.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.4.1) and [2026.5.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.5.1)

-----

## User-facing changes

***NEW MODULE: LastFM Scrobbler***
- **Connect your Last.fm account and automatically scrobble the tracks played by iHorizon while you stay in the voice channel.**

***NEW MODULE: Sticky***
- **Keep an important message always visible in your channels with automatic reposting. Embeds, just text or both, you choose!**

***NEW MODULE: Honeypot***
- **Only one command: `/honeypot config`**
- **Set up a trap channel to catch compromised accounts and automatically clean up recent spam across your server.**
- **Inspired by [RiskyMH's Honeypot bot](https://github.com/RiskyMH/Honeypot), check it out!**

***The PicOnly module is now called MediaOnly***
- **The MediaOnly module now supports sending other types of media than only photos, videos can now be sent in channels where the module is enabled.**

- *The dropdown menu of the bot's help command has new updated icons for each command category.*

***New command: `/music clear-queue`***
- *You can now clear the music queue present in the server where the command is executed.* 

***New command: `/automod block telegram_link`***
- *You can now use Discord's built-in AutoMod to block Telegram links across your server.*

***New command: `/music clear-queue`***
- *You can now clear the music queue present in the guild where the command is executed.*

- *Fixing the ticket panel module that was broken due to duplicate `optionFields`.*

- *Schedule module fixes*

- *Fixing ghost temporary voice channel in the Temporary Voice Channel module*

- *iHorizon's RPC presence has been modified. It will be now displayed as `PLAYING Shards #[CLIENT_SHARD_ID] | [SERVER_COUNT] Servers | www.ihorizon.org`*

- *Improved translations and wording*

- Modules relying on `HTML2PNG` (e.g. `/love` and `/stats` commands) have been fixed

## Internal improvements

- Improved `EmojiManager`

- Centralize `HTML2PNG` rendering in `ShardManager`

- Added `dev` script in `package.json` to launch the bot for development purposes

- Updated dependencies