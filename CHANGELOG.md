# Version Minor 2026.7.1 (1st patch of July 2026)

## Changes between [2026.6.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.6.1) and [2026.7.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.7.1)

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

**__Command `/mod unban`__**

- Added `pardon` aliases in MessageContext command.
 
**__Module: `Confession`__**

- Changed the form embed of the confession panel to inform guild members that confessions can be de-anonymized.

**__Module: `Security`__**

- The captcha module has been revamped with a new look, and now handles errors with a threshold of 3 attempts.

**__Module: `ihorizon-logs`__**

- Changed the way iHorizon-Logs are recorded. Previously, a channel had to be named exactly "ihorizon-logs"; it now only needs to contain that string.

**__Module: `Music`__**

- In the `Music` **module**, added a small tip message that randomly appears when the player starts, to let users know that `/lastfm` exists on iHorizon.

## Internal improvements

- Added Sweepers and makeCache to the `Client`'s discord.js configuration to improve memory usage in production.

- Added a TTL purge for all guild messages in the AntiSpam module.

- Improved AntiSpam precision by fixing bugs that could cause false positives.

- Fixed the Boost logs that could cause spam since Sweepers purge members from memory.

- Fixed the iHorizon runtime on Windows.

- New aesthetics on the `/status` command.

- Removed all `while` loops as they caused lag on the `node:loop` runtime.

- Fixed the previous names logging since Sweepers could produce false-null nicknames by using a `Set`.

# Bug fixes

**Clear command**

- *A regression introduced in version 2026.6.1 affected the `/mod clear` command; this has been fixed in this version.*

**Remind ticket command**

- *The remind ticket command has been fixed.*