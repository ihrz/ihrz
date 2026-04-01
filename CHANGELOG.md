# Version Patch 2026.4.1 (1st patch of April 2026)

## Changes between [2026.1.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.1.1) and [2026.4.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.4.1)

-----

## User-facing changes

### Utility command changes

`/util zip-stickers`, `/util zip-emojis`:

- Initially, we switched from `jszip` to `Bun.Archive` for `.zip` file generation, since the latter pretty much replaced `jszip`
- But afterwards, we reverted this change as it made the command crash when executed

`/utils userinfo`

- The following badges can now be displayed if the user has them:
	- App/Bot
	- Certified App/Bot
	- 'Supports Commands'
	- AutoMod
	- Discord Bug Hunter
	- Discord Moderator
	- Discord Staff
	- Active Developer
	- Early Supporter
	- Server Booster
	- Nitro Boost/Basic
	- HypeSquad
	- Platform icons, similar to Vencord's `PlatformIndicators` plugin
	- Vencord/Equicord donator
- The server crown is also displayed when the specified user is the owner of the server where the command is executed	

`/guildconfig set join-message`

- Added prefix command aliases: `joinmsg`, `jmessage`, `joiner`

`/guildconfig set leave-message`

- Added prefix command aliases: `leavemsg`, `lmessage`, `leaver`

`/guildconfig set join-dm`

- Added prefix command alias: `joinmp`

`/mutelist`

- Added prefix command aliases: `allmute`, `allmutes`, `alltimeout` and `alltimeouts`

### Confession module

- The embed now mentions the fact that users should keep in mind that confessions may not remain anonymous. Server owners or anyone with access to confession logs can identify users if logging is enabled.

### Permission module

***Fix:*** Resolved a bug where command restrictions set by role or user could be bypassed; permission entries are also now properly cleaned up from the database when all restrictions are removed.

### Fun commands

***New prefix/message command:*** `67`

- - Sends a "six-seven" meme GIF when the command is executed (because it's funny)

`/fun tweet`

- Improved HTML tweet card to better imitate the X/Twitter interface

### Music module

- Now supports Discord's new DAVE protocol, aka E2EE, for voice calls (Thanks Lirus!)

### Gay module

- Gay commands are now available as Hybrid Commands instead of prefix/message commands

### Blacklist Module

- Blacklist message has been improved

### Activity presence revamp

- iHorizon's activity presence is now rendered this way : Shards #{shardNumber} | {serverNumber} Servers

### Translations

- Updated translations

### Inviter module

- `{memberUsername}` variables are now wrapped with backticks to prevent Markdown formatting. Without this, iHorizon could underline or format usernames
containing markdown characters like `__` or `**`.

## Internal improvements

### Event files

- Redundant code has been removed from the following files: 
	- `joinMessage.ts`
	- `ranks/onNewMessage.ts`
	- `suggestion/onNewMessage.ts`
	- `rankRoleModule.ts`
- Invite fetching has been improved	

### Config file

- The Client ID field has been removed from `config.example.ts`

### README

- Revamped README file
	- A new "alumni" section has been created to honor past contributors and developers who have helped make iHorizon what it is today.
	- The style of the 'Key Features' section has been improved
	- The `npm` package has been removed from the list of installation methods since it's no longer being maintained
	- In the resources & links section, the documentation is now mentioned as being in BETA
- Updated server and user count

### Sharding

- Better sharding support

### Dependencies

- Miscellaneous dependencies have been updated