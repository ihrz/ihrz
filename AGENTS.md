# AGENTS.md — iHorizon Discord Bot

> Stack: TypeScript + Bun + discord.js. Bot in production since 2020.
> Source of truth is always the existing codebase. Never invent a pattern.

## Codebase rules

- Respect existing patterns. Clean code, follow the module you are editing.
- No French comments. No emojis. No decorative characters in code (the licence header below is the only exception).
- User-visible strings: NEVER hardcoded. Technical / log strings: allowed.
- Never invent a new pattern when one already exists. Search first (`src/core/functions`, `src/core/modules`, `src/Interaction`, `src/assets`).

## Licence header

Every `.ts` file MUST start with this exact static header (year is fixed per file, new files use current year):

```ts
/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/
```

Source of truth: `tools/LicenceHeader.ts`. Verify with:

```sh
bun run check:licence
```

## Logger (global, no import)

`console.*` is FORBIDDEN everywhere. `client` and `logger` are globals (see `types/global.d.ts`).

```ts
logger.log("message");
logger.warn("message");
logger.err("message");
logger.debug("message"); // no-op unless client.config.core.devMode
```

## i18n — Languages (STRICT)

- Per-guild language: `await client.func.getLanguageData(guildId)` (see `src/core/functions/getLanguageData.ts`, fallback `en-US` only for guild config lookup, never for user strings).
- Files: `src/lang/*.ts` (`ar-EG, de-DE, en-US, es-ES, fr-FR, fr-ME, it-IT, jp-JP, pt-PT, ru-RU`), one default-exported object of `key: "text"` (or `string[]`).
- Typing: `en-US.ts` is the reference, `LanguageData` is `typeof` it (`types/languageData.d.ts`, nothing to regenerate). Every other file ends with `satisfies LanguageData`, so a missing, extra or mistyped key fails `bun run build`. `src/lang/work_in_progress/` files use `satisfies Partial<LanguageData>` and are not loadable.
- Placeholders are plain names inside the strings (`"${roles}"`, `"${authorId}"`, `"{mode}"`), replaced at the call site with plain strings: `.replace("${roles}", value)` / `.replaceAll(...)`, double quotes, never template literals, never a regex. Never an expression (`${interaction.user.id}`): `check:lang` rejects it. Whoever ran the command is `author` (`${author}`, `${authorId}`, `${authorUsername}`), counts are `<thing>Count`.
- Emojis are `${emoji_<Name>}` (`${emoji_Yes}` = `client.iHorizon_Emojis.Yes`), resolved when the language is loaded (`getLanguageDataByCode`): never replace them at the call site.
- After touching any key:

```sh
bun run check:lang     # keys + placeholder parity against en-US
bun run build          # tsc: satisfies LanguageData
```

- Rules:
  - NO user-visible string in clear text outside `src/lang/*.ts`. Everything goes in the language files.
  - Every new key MUST be translated in ALL languages immediately. No missing language. No fallback logic. No hardcode.

## Core functions (`client.func`)

- Implementations live in `src/core/functions/`, consumed as `client.func.<name>` (e.g. `client.func.svg2png`, `client.func.numberBeautifuer`, `client.func.sanitizing` — keep exact existing names, including historical typos).
- Types: `types/client_functions.d.ts`. Regenerate with:

```sh
bun run type:func
```

- Generator: `tools/Client_Func_Typator.ts`. If you add a function file, run it.

## Commands

- Location: `src/Interaction/HybridCommands/<category>/<command>.ts`.
- Template: `src/Interaction/HybridCommands/!BlankHybridCommandTemplate.ts` (also `!BlankHybridSubCommandTemplate.ts`). Copy it. `Command` type: `types/command.d.ts`.
- New command: add its keys to every language file under a comment header:

```ts
	// /<slash-command-name>
	command_key_here: "text",
```

- New category: same, plus a module placeholder header listing its commands:

```ts
	// <Placeholder> module
	// /<cmd1>, /<cmd2>, ...

	// /<slash-command-name>
	command_key_here: "text",
```

- Each category directory MUST contain a strict-JSON `init.json` (no comments), e.g. `src/Interaction/HybridCommands/backup/init.json`:

```json
{
	"categoryInitializer": {
		"categoryName": "backup",
		"categoryColor": "#11304c",
		"options": {
			"description": "help_backup_dsc",
			"emoji": "${client.iHorizon_Emojis.Save_Clip}",
			"placeholder": "help_backup_fields"
		}
	}
}
```

Rules: `categoryName` is lowercase, single glued word. `description` / `placeholder` are language keys, not raw text. `emoji` is the literal string `"${client.iHorizon_Emojis.<Name>}"` or a plain UTF-8 emoji.

## Generated exports (`src/exports`)

- Shards never scan the source tree: every handler in `src/core/handlers/` loads its generated `src/exports/<name>.ts` (static imports, keyed by path). Generator and rules (which files, `!name.ts` subcommands): `src/core/modules/exportsManifest.ts`.
- Adding, renaming or deleting a command, subcommand, `init.json`, event, button, select menu, `src/core/functions` file or SVG template: run `bun run gen:exports` (or `bun run dev`, which rewrites the changed ones) and commit `src/exports` with the change. Never edit them by hand.
- The ShardingManager (`src/index.ts`) only checks them (`checkExports`) and warns when stale, it never writes in prod.
- It then builds the shard bundle once (`src/core/modules/shardBundle.ts`: `Bun.build` of `src/core/bot.ts`, packages external, linked sourcemap) into `dist/shard/bot.js`, which every shard runs. Inside the bundle `import.meta.dir` / `__dirname` point at `dist/shard`: resolve paths from `process.cwd()`, and never `import()` a computed path (add an export instead, like `src/exports/lang.ts`). `IHORIZON_NO_BUNDLE=1` runs `src` directly.

## Emojis

- Mandatory namespace: `client.iHorizon_Emojis.<Pascal_Snake_Case>`, e.g. `client.iHorizon_Emojis.Save_Clip`.
- Files: `src/assets/emojis/`. Check creation tool: `bun run check:emoji` (`tools/Emoji_Creator.ts`).

## SVG -> PNG

- Every generated image is SVG rendered by `client.func.svg2png` (resvg). There is no HTML renderer anymore (no `html2png`, no `src/assets/html`). Full guide: `src/assets/svg/README.md`.
- Templates: `src/assets/svg/*.svg` with `{snake_case}` placeholders (`client.svgfiles`). Layout-driven images reuse the modules in `src/core/modules/` (`statsPage.ts` for stats/leaderboards/charts, `podiumCard.ts`, `musicCards.ts`, `socialCards.ts`).
- Fill with `client.func.svgKit.fill`: plain values are escaped; generated markup comes from `svgKit.text` / `paragraph` / `image` / `raw`. Never `raw()` user input.
- User text goes through `svgKit.text` (emoji via Twemoji, `maxWidth` ellipsis). Images are embedded buffers: avatars via `image64`, any other URL via `svgKit.fetchImage` (public hosts only).
- Never call `new Resvg(...).render()` (leaks under Bun): always `svg2png`.
- Characters missing from the base fonts are drawn from `src/assets/fonts/fallback` (static Regular Noto fonts), routed by `src/core/svg/glyphFallbacks.json`. After changing that folder run `tools/Font_Fallback_Import.py`, then `bun run tools/Font_Fallback_Generator.ts`, then restart HorizonGateway (it reads the fonts once at boot). A font must be checked with `bun test test/svg`: some marks abort local resvg when they end a text (see `svgKit.text`).
- No WebP decoding anywhere (resvg-js cannot, and there is no browser at runtime): download Discord media with `svgKit.fetchImage` (asks the CDN / media proxy for PNG) or request `extension: "png"`. Puppeteer is a devDependency for `tools/ChangelogPdf.ts` only, never import it from `src/`.

## Components V2 (STRICT)

- Welcomer (join/leave) messages MUST be sent via `client.func.welcomerMessage` (see `src/core/functions/welcomerMessage.ts`). Never rebuild the Container + Thumbnail manually in events.
- Thumbnails: NEVER use a raw `displayAvatarURL()` CDN URL. Always snapshot the avatar via `client.func.image64.image64` and send it as an `attachment://` file, otherwise the thumbnail shows "media lost" when the user changes their avatar.
- Same rule for SVG images: embed avatars as buffers (`svgKit.image(await image64(url))`), never as a remote URL.

## Standalone binary and runtime files

- `bun run build:binary` (`tools/Standalone_Build.ts`, entry `src/standalone.ts`) compiles one executable that is both the ShardingManager and every shard (forks itself). It embeds `src/exports` plus `src/assets` (`src/exports/assets.ts`, `type: "file"`), extracted once per build into `.ihorizon/resources/<build id>` (`src/core/modules/resources.ts`).
- Any file shipped in `src/assets` is reached through `resourcePath("assets", ...)`, never `process.cwd() + "/src/assets"`: in the binary the source tree does not exist. Writable data stays under `process.cwd()` (`src/files`, `v.txt`).
- `IS_STANDALONE` is true inside the binary. Build info (branch, commit) comes from the `IHORIZON_BUILD` define there, from git otherwise (`src/version.ts`). No runtime read of `package.json`: import it.

## Configuration (`.env`)

- `client.config` (`ConfigData`, `types/configDatad.d.ts`) is built at runtime from environment variables by `loadConfig()` in `src/core/modules/envConfig.ts` (Bun loads `.env`). Never import `src/files/config.ts`: it is only a legacy fallback, migrated with `bun run config:env`.
- New option: add the variable to `configFromEnv` and `configToEnv`, document it in `.env.example` and in the docs configuration page (EN + FR), cover it in `test/config/envConfig.test.ts`. Connection settings are one URL each (`LAVALINK_URL`, `DATABASE_URL`), lists comma-separated, booleans strict.

## Database

- Access via `client.db.get()` / `client.db.set()`.
- Schemas MUST be declared in `types/database_structure.d.ts`. When you `.get()` JSON, type it with that file. Never invent an untyped schema.

## Dependencies (Bun-first)

- No new npm dependency unless strictly necessary (image buffering with png handling: OK; API wrapper: NOT OK — write it with fetch).
- Prefer Bun natives over Node APIs: `Bun.file` over `node:fs`, native `fetch` (see `src/core/functions/axios.ts` wrapper) over extra HTTP libs.

## Every change: queue changelog + documentation (MANDATORY)

Any change you make (on request or on your own initiative) that is visible to users, server admins or self-hosters MUST, in the same task:

1. Be queued in the changelog for the next release, in BOTH files:
    - `CHANGELOG_QUEUE.md` (EN) and `CHANGELOG_QUEUE_FR.md` (FR), at the repo root.
    - One bullet per change under the matching section (new section with an emoji `##` heading if needed, same style as `CHANGELOG.md`), small fixes under `🛠️ Fixes & improvements`. Update an existing bullet instead of duplicating it when you touch the same feature again.
    - Purely internal changes (refactor, tooling, tests, CI) are skipped unless they change behaviour.
    - At release (see below), the queue is the source for `CHANGELOG.md` / `CHANGELOG_FR.md`, then both queue files are reset to their empty template.
2. Be documented on the website docs: `../ihorizon.org/docs/docs/en/` AND `../ihorizon.org/docs/docs/fr/` (MkDocs, nav in `../ihorizon.org/docs/mkdocs.yml`).
    - Command pages (`commands/<category>.md`): the `## \`/cmd\`` headings and option tables are synced by CI (`docs/commands.py` from the commands API): never hand-edit those, edit the prose around them (description, usage, examples).
    - New page: add it in both languages and to `mkdocs.yml` nav.
    - Commit in the `ihorizon.org` repo separately, style `docs(<area>): ...` (e.g. `docs(music): /music play replies with the live player panel`).

Report both updates (queue + docs) in your final summary.

## Release (version + changelog + newsletter)

- The current version lives in `package.json` (`"version": "YYYY.M.P"`). Bumping it IS the release: on boot `src/index.ts` calls `writeVersionFile()` (`v.txt` vs `v.old.txt`), and shard 0 then runs `checkAndNotifyRelease()` (`src/core/modules/releaseNotifier.ts`), which DMs every server owner once. See its header comments for the anti-spam guards (main-shard only, claim-before-send, distributed lock, circuit-breaker) — do not weaken them.
- Find the range to document: the last commit that bumped `package.json` version up to `HEAD` (e.g. `git log --oneline <last-bump>..HEAD`). Only list what is genuinely new since that commit: verify each candidate against the tree AT the bump commit (`git show <bump>:<file>`, `git log <bump>..HEAD -- <file>`) — files touched again after a release must not be re-announced.
- Start from `CHANGELOG_QUEUE.md` / `CHANGELOG_QUEUE_FR.md` (then reset them), and cross-check against the commit range above.
- Rewrite `CHANGELOG.md` (EN) and `CHANGELOG_FR.md` (FR): they contain the LATEST release only, never appended history. Keep the established style (emoji `##` sections, `---` separators, `🛠️ Fixes & improvements` list at the end).
- PDFs are mandatory for the newsletter attachment. Exact paths (built by `getPdfPath()`, no fallback on names):
    - `changelogs/en/<version>/CHANGELOG_EN_<version>.pdf`
    - `changelogs/fr/<version>/CHANGELOG_FR_<version>.pdf`
    Missing PDF = DM sent without attachment (graceful, but avoid it).
- Generate them with the committed tool (no new dependency, uses the installed `puppeteer`):
    ```sh
    bun run tools/ChangelogPdf.ts [version]  # defaults to package.json version
    ```
    It renders both CHANGELOG markdowns to styled HTML and prints them via `page.pdf()` (A4, 15–18mm margins). Gotchas already handled inside (plus manual checks):
    - The repo puppeteer config points to a dead `/nix/store/.../bin/chromium`: the tool auto-resolves the newest cached `chrome-headless-shell` (`~/.cache/puppeteer/...`) and launches with `--no-sandbox --disable-setuid-sandbox`, like `/togif`.
    - Emoji fonts exist on the system (Noto Color Emoji) — emojis render fine.
    - Verify output with `file *.pdf` (PDF 1.4, 2 pages typical) and a screenshot of the HTML before shipping.

## Commands to run

```sh
bun run dev            # dev bot, bypasses ShardingManager (src/core/bot.ts)
pm2 start pm2.config.cjs  # prod: local ./.bun Bun (installed/upgraded), git pull, bun install, then src/index.ts
bun run check:lang     # language keys + placeholders vs en-US
bun run type:func      # retype client.func
bun run gen:exports    # regenerate src/exports (check:exports to verify)
bun run config:env     # move a legacy src/files/config.ts into .env
bun run build:binary   # standalone executable in dist/ (--target for other platforms)
bun run check:licence  # licence headers
bun run build          # tsc
bun run format         # prettier --write "**/*.ts"
```

## Never do

- Hardcode a user-visible string. Put it in `src/lang/*.ts`, all languages.
- Use `console.*`, `node:fs` when a Bun native exists, or add an npm package without necessity.
- Create a command/category without its language comment block (and `init.json` for categories).
- Use `client.iHorizon_Emojis` with wrong casing or a path outside `src/assets/emojis`.
- Ship a user-visible change without its `CHANGELOG_QUEUE*.md` entry (EN + FR) and its `../ihorizon.org` docs update (EN + FR).
- Skip verification: after code changes run the relevant `check:lang` / `type:func` / `check:licence`, and `bun run dev` to test.
