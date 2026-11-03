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
- Scripts: Latin, Greek, Cyrillic (Noto Sans), Arabic (Noto Sans Arabic),
  Japanese incl. kanji (Noto Sans JP), Korean (Noto Sans KR). Script fonts
  are only loaded when the SVG uses them (~5 ms extra for CJK). Chinese
  characters outside the Japanese set, Thai, Hebrew, Devanagari... render
  as missing glyphs: add the Noto font to `FONT_FILES` / `SCRIPT_PATTERNS`.
- resvg 2.6 keeps the first fallback font for the rest of a text element
  and drops an element containing an Arabic `<tspan>`: `svgKit.text` draws
  each script run as its own element, positioned from the metrics. Arabic
  is measured with its contextual forms (`src/core/svg/arabic.ts`, 1-4%
  error instead of ~40% with the base letters).
- No WebP decoding in resvg-js 2.6: `fetchImage` asks Discord's CDN /
  media proxy for PNG and treats any remaining WebP as missing; request
  Discord avatars / banners with `extension: "png"`.
- No variable fonts: weights are separate static files.
- No CSS (filters and gradients are SVG ones), no JavaScript.

## Migration status

Done: every image of the bot is rendered with resvg. `html2png`,
`loadHtmlFile`, `src/assets/html` and the HorizonGateway image offload are
gone.

| Image | Where |
|---|---|
| captcha | `src/core/captcha.ts` (random glyph rotation and noise per render) |
| ranks card | `/ranks show` |
| welcome card | `src/Events/guildconfig/joinMessage.ts` (background via `fetchImage`) |
| love, catsay, captions, bubbles | `src/core/images.ts` (Anton replaces Impact) |
| now playing, track banner | `src/core/modules/musicCards.ts` |
| /tweet, /youtube | `src/core/modules/socialCards.ts` |
| top messages / voice, gstats, channel stats, ustats, authrestore | `src/core/modules/statsPage.ts` (block engine: lists, metric cards, columns, area charts) |
| ranks / economy podiums | `src/core/modules/podiumCard.ts` |
| latency monitoring | `src/assets/svg/botLatencyMonitoring.svg` |

Puppeteer is still a dependency for two non-rendering uses: `/togif`
decodes WebP through a browser canvas (resvg-js 2.6 cannot decode WebP)
and `tools/ChangelogPdf.ts` prints the changelog PDFs.
