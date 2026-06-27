# Version Minor 2026.7.1 (1st patch of July 2026)

## Changes between [2026.6.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.6.1) and [2026.7.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.7.1)

---

## Current Changes

**__Command: `/custom`__**

We are evolving the way we approach bot customization features.

Since the project became open source in 2022, we have always aimed to keep iHorizon free and accessible to everyone. However, between hosting, servers, domains, licenses, and the various services required to operate the bot, the costs continue to increase.

In practice, this allows iHorizon to fully integrate into your community, as if it were your own bot, while maintaining the stability, features, and ongoing maintenance of the main project.

Until now, bot customization features were considered simple “fun” commands. Today, we are evolving this vision.

Using /custom, iHorizon can adopt an identity specific to your server, like a “custom-made” bot, while remaining stable, maintained, and consistent within the overall ecosystem.

This evolution helps support the project while giving more flexibility to servers that want a truly personalized experience with iHorizon.

Thanks to everyone who has supported iHorizon since the beginning. ❤️

**__Command `/utils userinfo`__**

- Since right now, not only oauth2 can be used for guessing Nitro subscription of someone. iHorizon use the banner and animated avatar feature to guess if user have nitro boost.

**__Modules: `Confession`__**

- Change the forms embed of confession panel to keep aware guild members that confession can be de-anonymised

**__Modules: `Security`__**

- The captcha module get rewamped, new look for captcha, handling errors with a thresold of 3 errors.

**__Modules: `ihorizon-logs`__**

- Changing the way iHorizon-Logs get logged. In the past you have to a channel exatly with the "ihorizon-logs" name, since now, it only need to be included in the string.

**__Modules: `Music`__**

- In the `Music` **module**, added a small tip message that randomly appears when the player starts, to let users know that /lastfm exists on iHorizon.

## Internal improvements

- Added Sweepers and makeCache in the `Client`'s discord.js for improving memory usage in production.

- Added a TTL purge for every guild messages in the AntiSpam modules.

- Improving AntiSpam precision by removing some bug that may cause false-flags.

- Fixing the Boost logs that may occur a spam since Sweepers purge members in memory.

- Fixing the iHorizon runtime on Windows.

- New esthetics on `/status` command

- Removing every `while` loop since it make the bot lagging on the `node:loop` runtime.
  
- Fixing the prevnames logging since Sweepers may occure false-nullable nickname by making a `Set`


# Bug fixes

****Clear command****

- _since the last old 2026.6.1 version created a regression on `/mod clear` command, we fixed it on this version._

****Remind ticket command****

- _Remind ticket command got fixed_