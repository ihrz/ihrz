# Version Patch 2026.11.1 (1st patch of November 2026)

---

## 🎙️ TempVoice — a full control panel, right in your channel

`/tempvoice` replaces the old `/voice` setup commands with a single **Components V2** panel: choose the join-to-create channel, destination category, default name and position, and staff roles that bypass restrictions. Every temporary channel now gets its own **Components V2 control panel** with a select menu for claiming ownership, renaming, setting a user limit, changing privacy, region, trust/block lists, transferring ownership and deleting the channel. The panel refreshes when someone claims the channel, and the old separate `set-voice-channel*`, `set-staff-role` and `set-text-channel` commands are gone.

---

## 🎟️ Tickets — a rebuilt panel

`/ticket panel` now renders in **Components V2** with a cleaner layout and iHorizon's custom emojis. Configuration, preview, roles to ping, category, option fields, forms and ticket buttons are grouped into readable sections, while the same panel keeps driving transcript, delete and user-select options.

---

## 🎁 Giveaways — `/gw go` opens a live panel

`/gw go` opens a **Components V2** panel to prepare a giveaway without typing a full command: prize, duration, winner count, entry requirement, image and target channel. Edit each setting, then launch, cancel or close the panel; the giveaway starts in the selected channel once everything is valid.

---

## 🔒 Utilities — lock nicknames, list every leash

- `/utilss lockname` locks a member's nickname, optionally forcing a new one, while `/utilss unlockname` releases it. `/utilss locknamelist` shows every locked nickname with who locked it and when.
- `/utilss leashlist` lists active leashes with their remaining time, paginates long lists and automatically removes expired entries.

---

## 🎵 Music — native metadata for every platform

Spotify, Apple Music, Amazon Music and Tidal links are now resolved by **built-in extractors** instead of external GitHub packages. Song, album, playlist and artwork metadata remain available even if those packages change, and the Apple Music parser handles the current page format.

---

## 🛡️ Anti-spam — escalating mutes

When a member is muted by anti-spam, each new sanction now **doubles the timeout** instead of always applying the same duration, capped at **28 days**. Repeat offenders are handled progressively.

---

## 🆘 `+helpall` — only the commands you can use

New prefix command listing every hybrid command the member is allowed to use, based on the server's custom permissions, grouped by category. If no custom permissions are configured, it points to `+h` instead of showing an empty list.

---

## 🛠️ Fixes & improvements

- **Ticket transcripts**: closing, deleting or leaving a ticket uses the new transcript backend and keeps working when the ticket owner leaves the server
- **Role buttons & select menus**: confirmation messages now correctly say whether a role was added or removed
- **TempVoice**: concurrent joins can no longer create duplicate or phantom channels, orphaned channel entries are cleaned up on boot, and the control panel updates when ownership is claimed
- **H24/7**: re-adopts the existing voice session after a restart without a visible leave/join, only reports connected with a live djs-voice connection, and recovers from destroyed players
- **Moderation**: `/warn` and `/unwarn` logs fall back to `#mods` or the configured moderation logs when iHorizon logs are missing; `/warn`, `/lock`, `/unlock` and role reaction commands no longer crash on missing members, channels or invalid IDs
- **`/togif`**: supports DM uploads and WebP sources, with a 15 MB limit and clearer errors
- **Honeypot**: cleanup now sweeps uncached channels and active/archived threads, with a second pass for messages posted during cleanup
- **Status**: the ping chart is rendered offline as inline SVG (no Chart.js CDN), and the stray data-point marker is gone
- **Help**: prefix help no longer shows a duplicate embed for slash command groups
- **Banners**: animated user and guild banners now render correctly through a new banner resolver
- **Release notifier**: waits for every shard before starting, resumes in a deterministic order and logs progress and ETA
- **Database**: HorizonDB now uses a single `horizon_dbUrl` (credentials and timeout included), and deprecated config keys were removed
- **Under the hood**: crypto-backed randomness replaces `Math.random`, RSS feeds are parsed with `Bun.XML`, and the external transcript/RSS dependencies were replaced
