# SVG rendering (resvg) instead of HTML (Chromium)

Branch `feat/resvg-renderer`. Goal: generate every image of the bot from SVG
templates rendered by [resvg](https://github.com/linebender/resvg)
(`@resvg/resvg-js`), and retire `html2png` (Puppeteer / headless Chromium).

## Why

| | HTML + Chromium | SVG + resvg |
|---|---|---|
| Ranks card, median per image (2x) | 82.9 ms | 13.8 ms (layout included) |
| Browser start | 254 ms (first image) | none |
| Memory | Bun 109 MB + Chromium 231 MB | Bun ~130-290 MB, plateau (allocator) |
| 50 images in parallel | queued tabs | 238 ms |
| Network at render time | Google Fonts, `chart.js` (unpinned), Tailwind CDN | none (Twemoji once, cached) |
| User input | injected into a live page (HTML/CSS injection, Chromium loads any URL) | XML-escaped, resvg never fetches |

Measured on this machine with `src/assets/html/ranksCard.html` against
`src/assets/svg/ranksCard.svg` (same avatar, same data, scale 2).

## Architecture

```
src/assets/svg/*.svg            templates, {snake_case} placeholders (client.svgfiles)
src/assets/fonts/*.ttf          bundled fonts (OFL, licences next to them)
src/core/handlers/loadSvgFile.ts    loads the templates at boot
src/core/functions/svg2png.ts   client.func.svg2png(svg, { scale, background })
src/core/functions/svgKit.ts    client.func.svgKit: fill, text, paragraph, wrap,
                                ellipsize, measure, image, fetchImage, raw, escape
src/core/svg/fontMetrics.ts     TrueType advance widths (cmap/hmtx), no dependency
src/core/svg/emoji.ts           grapheme split, Twemoji images (pinned, cached)
src/core/svg/remoteImage.ts     public-only download for user-supplied URLs
```

Usage:

```ts
const kit = client.func.svgKit;
const svg = kit.fill(client.svgfiles["ranksCard"], {
	color_start: color1, // plain values are escaped
	username: await kit.text(name, { x: 140, y: 48, size: 24, weight: 700, maxWidth: 400 }),
	avatar: kit.image(avatarBuffer, { x: 20, y: 30, width: 100, height: 100, radius: "circle" })
});
const png = await client.func.svg2png(svg, { scale: 2 });
```

## Rules

- Never build a `kit.raw(...)` from user input. Strings passed to `fill` and
  `text` are escaped; that is the only injection barrier.
- Images are embedded (`kit.image(buffer)`): Discord avatars via
  `client.func.image64.image64`, any other URL via `kit.fetchImage`
  (public hosts only, redirects re-checked, 8 MB / 5 s caps).
- Text that comes from users goes through `kit.text` / `kit.paragraph`:
  it handles emoji (Twemoji) and truncation. A raw `<text>` is fine only for
  fixed content (digits, captcha letters).
- Render with `client.func.svg2png` only. `new Resvg(...).render()` leaks
  ~1.5 MB per call under Bun; `renderAsync` (used by svg2png) does not and
  runs off the main thread.
- Layout is explicit (coordinates), no flexbox: compute positions with
  `kit.measure`, `kit.wrap` and `kit.ellipsize`. Metrics match resvg within
  1% (checked against `getBBox` on every bundled font).

## Known limits

- resvg-js 2.6.2 cannot draw color emoji fonts: emoji are Twemoji SVGs
  fetched once from jsDelivr (pinned 15.1.0) and cached in memory. Offline,
  an emoji is skipped, the image still renders.
- Bundled fonts cover Latin, Greek and Cyrillic. CJK, Arabic, Thai... render
  as missing glyphs. Fix: add e.g. `NotoSansJP-Regular.ttf` to
  `src/assets/fonts` and `FONT_FILES` (each font file is parsed on every
  render: prefer subsets).
- No variable fonts: weights are separate static files.
- No CSS (filters and gradients are SVG ones), no JavaScript.

## Migration status

Done on this branch:

| Template | Notes |
|---|---|
| `captcha` | glyph rotation/offset and noise strokes now random per render (the HTML one drew the same lines every time); no Google Fonts fetch |
| `ranksCard` | emoji in names, ellipsis, labels shortened before values; fixes "total XP" showing the current XP |
| `welcomeCard` (was `guildconfigWelcomeCart`) | background downloaded through `fetchImage` (Chromium loaded the admin URL itself: SSRF), message escaped (HTML/CSS injection), `<br>` and wrapping, readability veil |

Remaining, by effort:

| Template | Used by | Effort | What it needs |
|---|---|---|---|
| `love`, `catsay`, `captions`, `bubbles` | `src/core/images.ts` | S | image + text overlays |
| `musicBanner`, `nowPlaying` | music, playerManager | S | cover art, progress bar, ellipsis |
| `youtubeCommentCard` | `/youtube` | S | avatar, wrapped comment |
| `twitterCommentCard` | `/tweet` | M | wrapped text, icons (inline SVG paths already in the HTML) |
| `topMessagesLeaderboard`, `topVoiceLeaderboard` | stats | M | rows of avatar + bar + numbers |
| `podiumRanksModule`, `podiumEconomyModule` | leaderboards | M | 3 avatars, steps; drops the Tailwind CDN script |
| `guildStatsLeaderboard`, `channelStatsPage` | stats | M/L | tables, cards grid |
| `botLatencyMonitoring` | infrastructure monitoring | M | line chart (polyline from data) |
| `userStatsPage`, `authRestoreGetPage` | stats, authrestore | L | charts currently drawn by `chart.js` loaded from an unpinned CDN at render time: replace with generated SVG paths (line/area/bar) |
| `botProfileCard`, `old.userStatsPage` | unused | - | delete |

Suggested order: small cards first (S), then a tiny chart helper in svgKit
(axes, polyline, area, bars) shared by the four chart templates. Once the
last template is migrated: remove `html2png`, `loadHtmlFile`,
`src/assets/html`, the `puppeteer` dependency, and the HorizonGateway image
offload (it existed because Chromium was too heavy to run on every shard).
