# Version Minor 2026.6.1 (1st patch of June 2026)

## Changes between [2026.5.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.5.1) and [2026.6.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.6.1)

---

## User-facing changes

**_New command: `/music trackinfo`_**

- **You can now search for a track and instantly display its artwork, link and lyrics in a dedicated embed.**

**_New command: `/music volume`_**

- **You can now change the player volume directly from the music command, with predefined volume levels.**

**_New owner command: `/commandlimit`_**

- **You can now configure per-command rate limits for your guild, including setting, listing and resetting limits.**

**_New command: `/derogation`_**

- **You can now create derogation entries through a dedicated utility command.**

- _The music player now starts at 60% volume by default._

- _The `/music clear-queue` command now also supports the `clearqueue` alias._

- _The economy shop now restores previously owned roles when needed._

- _The `!balance-add` command now targets the correct argument when selecting a user._

- _The wake up command has been reduced from 5 minutes to 2 minutes and now handles move failures more safely._

- _The Temporary Voice Channel cleanup has been improved to better remove empty owned channels and avoid deleting channels when a member was only moved._

- _The ticket panel has been heavily reworked, including fixes for forms and overall ticket panel behavior._

- _The moderation clear command has been reworked and refined._

- _The top-messages stats command now updates its progress message correctly when there is no data and when the generated image is sent._

- _Regex handling related to the ready status and Discord invite AutoMod detection has been fixed._

**_New owner command: `/freeze`_**

- _This command aim to freeze a voice channel, server members who's try to joining the channel will be disconnected._

**_New owner command: `/unfreeze`_**

- _Permit to remove the current freeze status on a voice channel._

**_New owner command: `/talk`_**

- _Make everyone on a specific voice channel muted._

**_New owner command: `/untalk`_**

- _Remove the talk mode from a voice channel already set up._

## Internal improvements

- Improved giveaway management for sharded environments.

- Exported shared music helpers for reuse in the new track information flow.

- Added translation entries and typings required by the new music, command limit and derogation features.

- Fixed the giveaway end command

- Migrating the server backups and giveaways from files to production database

# Bug fixes

**__Avatar command__**

- _Now, users where are not in the guild will show avatar, not fallback to the author of the command.__

**__Clear command__**

- _Clear command got fixed_