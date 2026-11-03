# Changelog queue (next release)

Changes merged since the last release, waiting to be folded into `CHANGELOG.md` at the next version bump.

---

## 🎶 Music — `/music play` opens the live player

`/music play` now replies with the same live player panel as `/music nowplaying`: it follows the guild's player from track to track (artwork, colours and card refresh on every change), shows where the track comes from (Deezer, SoundCloud, YouTube...) and says when a track was added to the queue. One live panel per server: opening a new one closes the previous one. The separate "now playing" banner posted in the channel is gone, and the player buttons get a new set of emojis.

---

## 🛠️ Fixes & improvements

- **Self-hosting**: Chrome / Chromium is no longer needed at all, images are rendered with resvg. The install script no longer downloads Chrome, and `PUPPETEER_EXECUTABLE_PATH` can be removed from `.env`
