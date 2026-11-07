# Changelog queue (next release)

Changes merged since the last release, waiting to be folded into `CHANGELOG.md` at the next version bump.

---

## 🎶 Music — a live player panel

`/music play` and `/music nowplaying` now reply with the same **Components V2 live player**: a compact player card (blurred artwork backdrop, cover, title, artist and a progress bar with the elapsed and total time, set in JetBrains Mono), the voice channel, who asked for the track, what comes next, the volume, loop mode and queue size, the platform the track comes from and an **Open** button. **Pause/Resume**, **Skip**, **Loop**, **Lyrics** and **Stop** work right from the panel for listeners of the bot's voice channel, and each action is announced in the channel.

The panel follows the queue by itself (new artwork, colours and card on every track change), so the separate "now playing" message is gone; `/music play` adds a note when your track was queued behind another one. One live panel per server: opening a new one freezes the previous one. The player buttons get a new set of emojis.

---

## 🎶 Music — smooth transitions, for real

The cross-fade announced with the new music backend now actually happens: the next track of the queue fades in during the last 3 seconds of the current one, with no silence in between. Very short tracks and live streams follow each other without a gap.

---

## 🎶 Music — a new `/music queue`

`/music queue` is redrawn as a modern panel: the track playing now with its artwork and position, then the upcoming tracks ten per page with their author, length and who asked for them, plus the number of tracks, the time left and the loop mode. Anyone can browse it; listeners in the bot's voice channel can also **shuffle** the queue or **skip straight to** any track from a menu.

---

## 🎤 Music — lyrics that work, and track suggestions

- Lyrics show up again everywhere (`/music lyrics`, the **Lyrics** button of the player, `/music trackinfo`): they now come from lyrics.ovh through the music backend, and are remembered per song so they appear instantly the next time.
- `/music play` and `/music lyrics` **suggest tracks as you type** ("Title - Artist (3:20)", from Deezer, then SoundCloud); picking one plays, or fetches the lyrics of, exactly that song. A pasted link is kept as is.
- `/music trackinfo` works again: it takes an optional title (empty: the track playing now) and shows a card with the artwork, length, source and lyrics.

---

## 🎚️ Music — skips crossfade

`/music skip`, the now playing panel's skip button and jumps from the queue panel now fade into the next track over 3 s on a Wavyzon node, instead of cutting. The new track starts immediately; it is announced when the fade ends. Other nodes, a paused player and the last seconds of a track keep the plain skip.

---

## 🎛️ Music — Equalizer APO configs for each server

`/music apo` opens a panel where the server's administrators and owners keep up to **5 Equalizer APO configurations** (`.txt` files of 15 KiB and 50 command lines at most: AutoEQ headphone profiles, REW exports, parametric or graphic EQ, convolution and reverb). Each config can be added, renamed, replaced, deleted and **frozen**: a frozen config can still be applied but not changed or deleted, until the person who froze it, a server owner or a bot owner unfreezes it. One config is **applied by default** to everything the server plays, right away and for every next track, and the whole module can be switched off. The music node checks each file before it is saved, and the lines it skips are listed. A file attached to `/music apo` is added as a new config. The same configs, with the same rules, can be managed from the dashboard (**Equalizer APO** module, administrators). Needs Wavyzon with its `apo` plugin.

---

## 📜 Music — a new music history

`/music history` is rebuilt as a **Components V2** card in the colours of the latest artwork: what the server played over the last 30 days, the number of tracks and the listening time, the most played artist and who requested the most, a mosaic of the latest artworks, then five plays per page with their artwork, link, length, source, who asked for it and when (in each reader's own time zone). **Export** sends the full history as a text file, only to you. **Clear** now needs the Manage Server permission and a confirmation; anyone else pressing the buttons is told why nothing happens.

---

## 🧰 Utilities — new cards everywhere

Every utility command answers with a **Components V2** card instead of an embed: one clear title with an emoji from the bot's pack, one detail per line, dates shown in each reader's own time zone, the server's bot name as a quiet signature, and colours that say what happened (green when done, red when destructive, orange when something failed). `/userinfo`, `/serverinfo`, `/avatar`, `/banner`, `/inviteinfo` (one card now, with the inviter and the expiry), `/serverpic`, `/where`, `/vc` and `/snipe` get richer cards; the lists (`/allbots`, `/admin-users`, `/admin-roles`, `/allwebhooks`, `/role-members`, `/prevnames`, `/leashlist`, `/locknamelist`) turn pages with Previous / Next that only the author can use; mass actions (`/massiverole`, `/nickrole`, `/massmove`, `/bringall`, `/derank`, `/unbanall`) show what they did and what failed; the media-only, nick-kicker and whitelisted-roles panels keep their menus inside the card. Fixes on the way: `/vc` counted deafened members as muted, `/locknamelist` showed wrong dates, `/util move` tried to move members who weren't in a voice channel, `/admin-users` can really hide bots now, and `/prevnames` only offers to erase your own history.

The same cards reach **moderation**, **fun** and the **invites manager**. `/ban` and `/kick` say who was sanctioned, by whom and why; `/baninfo` shows the real ban date (or that it's unknown); `/banlist`, `/mutelist` and `/warnlist` turn pages, with timeouts and warns dated in your own time zone; `/unwarn` and `/rolepanel` show what changed. The animal pictures share one card, the random results (`/dice`, `/heads-tails`, `/number`, `/gay`, `/rate`…) show a score bar, `/love`, `/tweet`, `/youtube` and `/catsay` keep their images inside the card, and `/poll` still collects its reactions. `/invites` details regular, left and bonus invites and who invited the member; `/leaderboard` turns pages and shows your own rank. Fix on the way: `/kick` no longer announces a kick that failed.

---

## 📊 Stats — rebuilt from scratch

`/stats` answers with a **Components V2** card: a few sentences on what stands out (when you are most active, this week against the last, your favourite channel, your streak, who leads), a new image, and a menu to switch views without running the command again. The images are redrawn from the ground up: big figures with their trend against last week, a daily chart (messages as bars, voice as a curve), and a **weekday × hour heatmap** that shows when the server, a member or a channel is really active, with the peak outlined. Messages are always blue and voice always coral. Hours follow the server's time zone (from its language) and dates and weekdays are written in the server's language.

- `/stats ustats`: messages, voice time, active days and current streak, server rank, favourite text and voice channels; the **Rhythm** view adds average message length, voice sessions, longest session and best streak.
- `/stats gstats`: messages, voice, active members and peak hour, top members by messages and by voice; **Rhythm** and **Channels** views.
- `/stats channel-stats`: one text or voice channel, with its members and its rhythm.
- `/stats compare`: two members face to face on six measures, and both daily curves.
- `/stats top-messages` / `/stats top-voice`: a ranked list with avatars over 24 hours, 7 or 30 days (up to 15 members).

Fixes on the way: the 30-day figures were labelled "14d", and the activity chart could be cut off by the footer.

---

## 🖥️ Dashboard — changes apply instantly

Settings saved on the dashboard are now applied right away by the bot, with the same checks as the matching commands: H24/7, the server language bio, the bot's name and avatar, member counters, sticky messages, reaction roles (buttons and select menus), the honeypot trap, the confession panel, temporary bans and roles, TTS join/leave and the AuthRestore verify button. A change the bot refuses is reverted and reported. The music history now keeps each track's artwork for the dashboard.

---

## 🎟️ Tickets — simple or advanced panels

`/ticket panel` gets a mode. **Simple**: one button opens a ticket, with no options or questions; the embed is optional and a localized default is used. **Advanced**: the select menu with options and forms, as before. New panels start in simple mode, existing ones stay advanced, and advanced-only settings are hidden in simple mode. `/ticket set-here` is removed (simple mode replaces it); panels already posted keep working.

---

## 🔐 Protection — a real-time engine

Protection now reacts to Discord's audit log events as they happen, instead of fetching the audit log on every change: sanctions and restorations run in parallel and are much faster during a raid.

- Changes are reverted from their previous values in one request (channels, permission overwrites, roles, server settings including icon and banner, webhooks, member roles)
- Deleted channels and roles are rebuilt with their categories, overwrites and **members** (the role goes back to its members, not to the attacker)
- New coverage: permission overwrites, member prune, webhook updates and deletions
- **Administrator** granted by editing a role (including @everyone) or by creating one with it is now caught
- An attacker can no longer get their removed roles back, and a mass role deletion no longer slows the bot down for other servers

---

## 🛡️ Anti-spam & anti-advertising — rewritten

- Spam is punished **immediately**: a sustained raid from several accounts used to escape the sanction entirely
- Detection is a sliding window plus duplicate content, which also catches slow cross-channel spam, and regular members chatting fast no longer get muted by flags that piled up for hours
- Only the spam burst is deleted (not hours of the member's history), and escalating mutes cool down after 24 h
- Anti-advertising matches allowed sites by their exact domain (look-alike domains and links hiding an allowed name no longer slip through), detects `discord.com/invite` without `https://` and covers threads and voice-channel chats
- Links are no longer fetched to check them

---

## 🖼️ Images — a new renderer

Every generated image (rank cards, welcome cards, captcha, memes, `/tweet` and `/youtube` cards, stats pages, podiums, latency monitoring, the music player card) moved to a new renderer: much faster, with emojis, **Arabic, Japanese and Korean** text and long names cut cleanly. The captcha draws new noise on every render, and the economy podium now draws its coin.

---

## ⚙️ Self-hosting — `.env` configuration and a standalone binary

The bot is configured with environment variables, read from a `.env` file (`cp .env.example .env`), instead of `src/files/config.ts`. Connections are a single URL each: `LAVALINK_URL=ws://password@host:2333` (several nodes comma-separated, `wss://` for TLS) and `DATABASE_URL` (`sqlite`, `json`, `memory`, `postgres://...` or `ws://...` for HorizonDB). Lists are comma-separated (`OWNERS=id1,id2`), and a typo in a value stops the bot at startup with a clear message instead of being guessed. Nothing is compiled into the code anymore, so the same build runs any bot.

An existing `config.ts` keeps working for now (with a warning): `bun run config:env` moves it into `.env`, keeps what `.env` already had, checks the result and renames `config.ts` to `config.ts.migrated`. The **installation script is rebuilt**: it writes `.env` with hidden secrets, checked IDs and connection URLs built for you (several Lavalink nodes, SQLite, PostgreSQL, HorizonDB or JSON instead of a MySQL option that no driver supported), checks the result with the bot's own parser before starting, can run the bot from the checkout or as the standalone binary below, and never leaves two copies of the bot running. It now installs `ffmpeg` (needed by sound-to-video) and no longer upgrades the whole system.

`bun run build:binary` builds iHorizon into **a single executable**: code, languages, SVG templates, fonts, emojis and video templates are inside, so it runs with just a `.env` next to it, without Bun, `node_modules` or the source code. The same file runs the shard manager and every shard, extracts its files once per build into `.ihorizon/resources/`, and error stack traces still point at the source files. Build it on the platform that runs the bot (`--target` for others).

---

## 🛠️ Fixes & improvements

- **Self-hosting**: Chrome / Chromium is no longer needed at all, images are rendered with resvg. The install script no longer downloads Chrome, and `PUPPETEER_EXECUTABLE_PATH` can be removed from `.env`
- **Self-hosting**: `pm2 start pm2.config.cjs` now installs and upgrades its own Bun, pulls the latest code and installs new dependencies on every start; images can be rendered by HorizonGateway to save memory on every shard
- **Protection**: members picking or dropping their roles through Onboarding or Channels & Roles are no longer treated as a role update and sanctioned
- **Images**: styled nicknames and special characters (`𝓕𝓪𝓷𝓬𝔂`, `★`, `ᯓ𓂃`, `༄`, runes, Hebrew, Thai, Hindi and many more alphabets) now show up on every generated image instead of empty boxes
- **Self-hosting**: stopping or restarting the bot now also stops its shards, and `pm2 start pm2.config.cjs` stops any process left over from a previous run of the same folder, so old shards can no longer answer every command a second time
- **Security**: reminder DMs could contain other users' reminders, and the level-up message could ping `@everyone` or roles — both fixed; user text in generated images is always shown as text
- **Music**: some SoundCloud tracks failed with "not found at source"; they play now
- **Music**: a connection to the music provider that drops mid-track (after a long pause, for example) no longer stops the track: it resumes where it stopped
- **H24/7**: a voice connection that fails 3 times in a row is now reset on its own: the bot drops its stored connection and joins its channel again, the H24/7 setting stays on
- **Music**: the player is no longer destroyed when its text channel is missing
- **Music**: the **Lyrics** button of the player is disabled too once its panel has ended
- **`+helpall`**: paginated by category with a select menu, like `+h`
- **`/automod`**: the panel opens again when a bypass role or the log channel was deleted
- **Captcha**: members who fail it are now actually kicked
- **Role saver**: gives back only roles the bot can assign, merged with the join roles; a protection kick deranks first so roles cannot come back on rejoin
- **`/utils prevnames`**: no more `null` entries or names listed several times (old histories are repaired when viewed), and names are cleaned: no invisible characters or line breaks, and a name like `<@id>` is no longer shown as a mention. Histories are now stored as typed objects (`{ type, name, at }`, with `guild` for nicknames), converted when loaded: the `data` of the public prevnames API follows, and `tools/ClearNullPrevnames.ts --apply` converts a whole table
- **Dashboard**: the required account age of the new account policy takes durations in words (`2 weeks`, `1 month`); typing one used to save 0, which silently turned the policy off. The bot no longer kicks every new member when the policy is on with no age set
- **Dashboard**: a section holding a date (temporary bans and roles, tags, blacklist, a triggered honeypot) can be saved again; embed images and welcome backgrounds hosted on Discord no longer get refused; saving leveling, welcome or utility settings no longer turns off level-up messages, hey reactions, `autoFeur` or GitHub lines; changing a `/protect` rule's mode keeps its sanction
- **Anti-exe**: turned off really means off (it stayed active)
- **Role saver**: admin roles are only given back when asked for
- **Join roles**: no longer remove the roles the role saver gives back
- **`/schedule`**: reminders are sent even when the user isn't cached, instead of being dropped
- **`/confession config`, `/starboard threshold`, `/skullboard threshold`**: they now really apply
- **Dashboard**: the anti-spam mute and economy cooldowns were read in milliseconds while the fields said seconds (a 600 mute lasted 0.6 s, an 86400 cooldown 86 s): they now take durations like `15min` or `2h`. Number fields refuse what isn't a number instead of saving nothing or 0, unset economy values stay unset, and a config missing what it needs (captcha role, blog feed, notifier or voice channel, punishment type) is refused with a message
- **Anti-spam**: enabled with a missing threshold or interval, it detected nothing; it now uses the defaults of `/antispam`
- **Pictures only**: the warning threshold is applied (it was always 3)
- **Night mode**: UTC+8 is available, and the dashboard only offers offsets the bot knows
- **`/punishpub`**: the sanction comes at the chosen number of flags (one too early before, and never with 1)
- **Starboard / skullboard**: at least 2 reactions, even with an empty threshold
- **Self-hosting**: `tools/MigrateDashboardUnits.ts --apply` repairs the values saved in the wrong unit
- **Dashboard**: saving no longer undoes what happened since the page was read: only the saved sections are written, and only what you changed goes over them. "Delete module" on welcome and utilities no longer wipes the role saver, permissions, limits and other settings stored alongside. Long bot-kept lists (notifier, blogger, confessions) no longer block a save. The server tooltip shows the member total
- **Reaction roles**: the dashboard can save them again (every emoji or button key was refused), and its switch really turns a role on or off
- **Tickets**: when turned off, panels already posted stop opening tickets too
- **Dashboard**: removed settings that did nothing: the allowlist switch (the list always applies in allowlist mode) and the notifier timestamp
- **`/setlogschannel`**: the `boost` and `ticket` choices now work (they stored a key nothing reads)
- **Member count**: `{ChannelCount}` shows the channels (it showed the roles on refresh)
- **Tags**: a tag without an embed can be used and shown
- **Ticket panels**: removing a question no longer gives the next one a duplicate id, which broke the form; a simple panel can be published from the dashboard without an embed, like with `/ticket panel`
- **Dashboard blacklist**: adding a user bans them with the reason you give, and removing one unbans them, like the commands
- **Dashboard automod**: the spam, mass mention, links and Discord invites switches now turn the same native AutoMod rules on and off as `/automod`, keeping their roles and logs. A rule Discord refuses is reported and its switch goes back
- **`/schedule`**: the reminder DM shows its title and description in proper blocks (stray backticks showed at the end)
- **Temporary voice channels**: a bot no longer gets one. When the 24/7 channel was also the join-to-create hub, iHorizon created a new "Channel of <bot>" for itself every minute
- **`/tempvoice`**: the join-to-create channel can be removed (a button, or by emptying the menu), and the panel no longer breaks when that channel was deleted
- **Commands outside a server** (`/fun` in DMs or as a user app): no more "malformed key" error when the card signature was looked up
- **Honeypot**: bans a spammer who already left the server
- **Invites**: joins are counted again on servers that never configured anything (an error stopped them before the count)
- **Stats**: `/stats ustats` counted every message twice, `/gstats` titles are translated
- **Languages**: raw placeholders fixed in `/perm create-roles` (Japanese), `/daily`, `/schedule`, profile pictures and the blacklist summary; missing emojis now show in sticky messages, Last.fm errors, the welcomer leave message, the TempVoice panel and the empty-channel music notice; French texts fixed
- **Performance**: server settings are cached, so busy servers get faster answers
- Fewer error-log entries: Discord refusals for missing access or permissions are expected and no longer logged
- The `+fexini` partner command is removed
- **Self-hosting**: every remaining error and warning now goes through the bot logger (timestamp, shard, level), and errors are logged with their full stack instead of `{}`, once (on stderr) instead of twice
- **Self-hosting**: the `[DEP0169] url.parse()` deprecation warning no longer shows in the logs when a music link is checked
- **H24/7**: when its voice channel is deleted, the H24/7 setting is cleared instead of being retried forever (and warned about in the logs)
- **Self-hosting**: shards no longer scan the source folders at boot: commands, events, components, functions and SVG templates are loaded from the generated `src/exports/` files `bun run dev` keeps them up to date, `bun run gen:exports` regenerates them by hand, and the bot warns at startup when they are stale. On every start, the shard manager also compiles iHorizon's code once into `dist/shard/bot.js`, and every shard starts from that single file instead of ~700 source files (error stack traces still point at `src/`). `IHORIZON_NO_BUNDLE=1` runs the shards from `src` as before, and a failed build falls back to it on its own
