# Version Patch 2026.8.2 (2nd patch of August 2026)

---

## 🌍 iHorizon now speaks 5 languages (command description)

All commands are now available in **French**, **English**, **Japanese**, **Russian** and **Spanish**. `/help` and `+h` automatically adapt to your server's language.

---

## 🎤 TTS: iHorizon reads messages out loud

A brand new Text-to-Speech module arrives with 4 commands:

- `/tts join` — iHorizon joins your voice channel and reads messages
- `/tts leave` — iHorizon leaves the channel
- `/tts lang` — choose the voice language
- `/tts info` — check the module status

---

## 🎵 Apple Music, Amazon Music & Tidal

The music player now supports **Apple Music**, **Amazon Music** and **Tidal** links alongside Spotify, YouTube, SoundCloud, Deezer and Discord CDN.

---

## 👋 A warmer welcome

When iHorizon joins a server, it now sends a **welcome DM** to the owner — and also to the person who added the bot. A nice embed with buttons to discover the project.

---

## ⚙️ `/setlang` gets a makeover

No more language codes to type. `/setlang` opens an **interactive menu** with the full language list and their flags. Pick one, hit Save, done. The panel now dynamically updates its labels in the selected language as you browse.

---

## 📋 `+updates` — Changelog at your fingertips

A new `+updates` command (aliases: `+changelog`, `+update`) lets you view the latest iHorizon version, commit details and branch — with the full changelog attached as a downloadable PDF. The PDF is automatically served in your server's language (French or English), with a fallback if one isn't available.

---

## 📰 Newsletter — stay up to date automatically

Server owners now receive an automatic **DM notification** whenever a new version of iHorizon is released (major, minor and patch). The message includes the version number, release link, and the full changelog as a PDF. Owners can unsubscribe anytime with a single button.

---

## 🛠️ Fixes & improvements

- **Lock / Unlock**: no longer wipes custom channel permissions
- **Tempmute**: can no longer mute someone with an equal or higher role
- **Automod**: now blocks URL-encoded invite links that previously bypassed the filter
- **Ticket**: the ticket panel no longer crashes with overly long option names
- **Confession**: module rewritten for better reliability
