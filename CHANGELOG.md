# Version Minor 2026.8.1 (1st patch of August 2026)

## Changes between [2026.7.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.7.1) and [2026.8.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.8.1)

---

## Current Changes

**__Languages (`All`)__**

-  All internal translations got revisited, rewamped.

**__Command `/mod rolepanel` (+rolepanel)__**

- New command: give selected roles to a member through a panel.

**__Command `/mod unmuteall` (+unmuteall)__**

- New command to unmute all currently muted members at once.

**__Command `/mod unlockall`__**

- New command to unlock all channels at once.

**__Command `/mod tempmute` (+tempmute)__**

- Increased the maximum timeout duration to 28 days.

**__Command `/utils admin-roles`__**

- Added an alias: `allpa`.

**__Command `+move`__**

- You can now precise a voice channel by name directly in the command (ie: `+move 2h0 Voice 1`).

**__Module: `Music`__**

- `/music skip` (+skip) — added alias: `+next`.
- Fixed volume when a new track starts.
- Added support for Spotify links (Album/Track/Playlist) and Youtube Music track links.

**__Module: `Giveaways`__**

- Translated the `gw` command in French.
- Fixed giveaways typing (backend).

**__Module: `Server data on leave`__**

- New way to clear guild data when leaving (major change in philosophy). iHorizon now waits 10 hours before permanently deleting the server's data, allowing you to re-invite the bot and cancel the process if it was kicked by mistake, keeping the full config.

**__Module: `PrevNames Logging`__**

- Improving prevnames logging: also now logging guild nicknames.

**__Fun__**

- Added Autofeur sentence.

## Internal improvements

- Removed Sweepers for guild Member.
- Major code improving in backend — unifying the context handler in Slash/Hybrid for better code support.
- Updates all libraries to the latest version.
- Fixing pm2 file for production.

# Bug fixes

**Command handler in PM channels**

- *Fixing handler for command in PM channel.*

**`/utils userinfo`**

- *Fixing userinfo calculating Nitro with the banner or no.*

**`+sticker` command**

- *Fixing an issue with +sticker command.*

**`+antiexe` command**

- *Fixing +antiexe command permission.*

**`+soutien` command**

- *Fixing +soutien command args handling.*

**Footer text**

- *Fixing footer text for better user experience.*

**`tooNewAccount` check**

- *Fixing tooNewAccount bug that added 1 flag before calculating the Discord account creation time window.*