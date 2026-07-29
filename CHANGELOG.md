# Version Minor 2026.8.1 (1st patch of July 2026)

## Changes between [2026.7.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.7.1) and [2026.8.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.8.1)

---

## Current Changes

**__Command: `/custom`__**

We are evolving the way we approach bot customization features.

Since the project became open source in 2022, we have always aimed to keep iHorizon free and accessible to everyone. However, between hosting, servers, domains, licenses, and the various services required to operate the bot, the costs continue to increase.

In practice, this allows iHorizon to fully integrate into your community, as if it were your own bot, while maintaining the stability, features, and ongoing maintenance of the main project.

Until now, bot customization features were considered simple "fun" commands. Today, we are evolving this vision.

Using `/custom`, iHorizon can adopt an identity specific to your server, like a "custom-made" bot, while remaining stable, maintained, and consistent within the overall ecosystem.

This evolution helps support the project while giving more flexibility to servers that want a truly personalized experience with iHorizon.

Thanks to everyone who has supported iHorizon since the beginning. ❤️

**__Command `/utils userinfo`__**

- From now on, OAuth2 is no longer the only method used to detect a user's Nitro subscription. iHorizon now uses the banner and animated avatar features to determine whether a user has Nitro.
- Fixed the Nitro detection logic when relying on the banner.

**__Command `/mod unban`__**

- Added `pardon` aliases in MessageContext command.

**__Command `/mod rolepanel` (+rolepanel)__**

- New command: lets you give selected roles to a member through an interactive panel.

**__Command `/mod unmuteall` (+unmuteall)__**

- New command to unmute all currently muted members at once.

**__Command `/mod unlockall`__**

- New command to unlock all channels at once.

**__Command `/mod tempmute` (+tempmute)__**

- Increased the maximum timeout duration to 28 days.

**__Command `/utils admin-roles`__**

- Added an alias: `allpa`.

**__Command `+move`__**

- You can now specify a voice channel by name directly in the command (e.g. `+move 2h0 Voice 1`).

**__Command `+soutien`__**

- Fixed argument handling.

**__Command `+sticker`__**

- Fixed an issue affecting the command.

**__Command `+antiexe`__**

- Fixed a permission issue.

**__Module: `Confession`__**

- Changed the form embed of the confession panel to inform guild members that confessions can be de-anonymized.

**__Module: `Security`__**

- The captcha module has been revamped with a new look, and now handles errors with a threshold of 3 attempts.

**__Module: `ihorizon-logs`__**

- Changed the way iHorizon-Logs are recorded. Previously, a channel had to be named exactly "ihorizon-logs"; it now only needs to contain that string.

**__Module: `Music`__**

- Added a small tip message that randomly appears when the player starts, to let users know that `/lastfm` exists on iHorizon.
- `/music skip` (+skip) — added alias: `+next`.
- Fixed volume resetting incorrectly when a new track starts.
- Added support for Spotify links (Album/Track/Playlist) and YouTube Music track links.

**__Module: `Giveaways`__**

- Added "Participants List" button to giveaway embeds, letting users check all participants of the current giveaway.
- The `gw` command is now available in French.
- Fixed a typing bug on the backend.

**__Module: `Server Leave / Data Management`__**

- Major change in philosophy regarding server departures: iHorizon now waits 10 hours before permanently deleting a server's data after the bot leaves. This allows you to re-invite the bot and cancel the deletion process if it was kicked by mistake, keeping your full configuration intact.

**__Module: `Logging`__**

- Improved previous names logging; guild nicknames are now also logged, using a `Set` to avoid false-null entries caused by Sweepers.
- Fixed footer text across logs for a better user experience.

**__Fun__**

- Added a new "autofeur" sentence.

## Internal improvements

- Added Sweepers and makeCache to the `Client`'s discord.js configuration to improve memory usage in production.
- Added a TTL purge for all guild messages in the AntiSpam module.
- Improved AntiSpam precision by fixing bugs that could cause false positives.
- Fixed the Boost logs that could cause spam since Sweepers purge members from memory.
- Fixed the iHorizon runtime on Windows.
- New aesthetics on the `/status` command.
- Removed all `while` loops as they caused lag on the `node:loop` runtime.
- Removed Sweepers for guild Member.
- Optimizing `InviteManager` internal module and invites fetching. Now, less API calls, and less rate-limiting.
- Major backend code improvement: unified the context handler between Slash and Hybrid commands for better code support and maintainability.
- Updated all libraries to their latest versions.
- Fixed the pm2 file for production.

# Bug fixes

**Clear command**

- *A regression introduced in version 2026.6.1 affected the `/mod clear` command; this has been fixed in this version.*

**Remind ticket command**

- *The remind ticket command has been fixed.*

**HoneyPot**

- *Fixed a bug where messages in the HoneyPot channel weren't deleted.*

**Ranks Show Command**

- *Fixed a bug where the command resulted in a crash when the dominant color wasn't calculated correctly.*

**Command handler in PM channels**

- *Fixed the handler for commands used in private messages.*

**`tooNewAccount` check**

- *Fixed a bug that added 1 flag before correctly calculating the Discord account creation time window.*