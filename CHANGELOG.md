# Version Patch 2026.10.1 (1st patch of October 2026)

---

## 🎙️ H24/7 — iHorizon never leaves your voice channel

A brand new module keeps iHorizon parked in your voice channel **24/7**, even when nothing is playing — perfect to hold your server's voice streak:

- `/h247 join` — park the bot in a voice channel (Admin only)
- `/h247 leave` — disable the 24/7 presence without cutting active music
- `/h247 info` — check status, channel and how it works

The bot automatically rejoins after a restart, a kick or a disconnect, with a watchdog keeping the connection alive. New `/utilss renewvc` (alias `rvc`) resets your voice channel's region to fix laggy audio.

---

## 👋 Welcomer — one panel for everything

`/guildconfig set welcomer` now opens a **single unified panel** to configure your entire welcome experience: join and leave messages, welcome DMs, auto-roles, channels and banner preview — all editable inline with live toggles. The old separate `join-dm`, `join-message`, `leave-message` and `join-role` commands are merged into this panel.

---

## 📰 Newsletter — hardened and safer

The release newsletter (automatic DM to server owners on each update) has been reworked for reliability: strictly **one DM per owner**, sent from the main shard only, with paced delivery and an automatic pause if Discord rate-limits. Owners with closed DMs are skipped cleanly instead of being retried forever. Unsubscribe anytime with a single button, as before.

---

## 🆓 `/custom` is now free for everyone

The paywall on bot customization has been removed — custom profiles are available to all servers.

---

## ⏳ Smarter cooldowns

Spammy commands now have per-command cooldowns with a friendly "please wait" message instead of silent ignores.

---

## 🛠️ Fixes & improvements

- **Automod**: enabling link-blocking no longer deletes GitHub/GitLab webhooks and media links (code hosts, GIFs, images and video hosts are allowlisted)
- **Anti-spam**: webhooks are no longer flagged as spammers
- **Ticket**: panels with very long option lists now fall back to a file instead of breaking
- **Play in VC**: message attachments over 10MB are refused with a clear error instead of failing silently
- **Bot bio**: iHorizon now sets a translated bio (with your command count) in your server's language when it joins
- **TTS**: refinements and smooth coexistence with the new H24/7 mode
- **Under the hood**: new HorizonDB database backend, automatic repair of missing privileged intents, and a crash-log fix that prevents a file-descriptor leak during error storms
