# AGENTS.md — iHorizon Discord Bot

> Stack: TypeScript + Bun + discord.js. Bot in production since 2020.
> Source of truth is always the existing codebase. Never invent a pattern.

## Codebase rules

- Respect existing patterns. Clean code, follow the module you are editing.
- No French comments. No emojis. No decorative characters in code (the licence header below is the only exception).
- User-visible strings: NEVER hardcoded. Technical / log strings: allowed.
- Never invent a new pattern when one already exists. Search first (`src/core/functions`, `src/Interaction`, `src/assets`).

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
- Files: `src/lang/*.yml` (`ar-EG, de-DE, en-US, es-ES, fr-FR, fr-ME, it-IT, jp-JP, pt-PT, ru-RU`). Typed via `types/languageData.d.ts`.
- After touching any YAML key:

```sh
bun run type:lang
```

- Rules:
  - NO user-visible string in clear text in `.ts` files. Everything goes in YAML.
  - Every new key MUST be translated in ALL languages immediately. No missing language. No fallback logic. No hardcode.

## Core functions (`client.func`)

- Implementations live in `src/core/functions/`, consumed as `client.func.<name>` (e.g. `client.func.html2png`, `client.func.numberBeautifuer`, `client.func.sanitizing` — keep exact existing names, including historical typos).
- Types: `types/client_functions.d.ts`. Regenerate with:

```sh
bun run type:func
```

- Generator: `tools/Client_Func_Typator.ts`. If you add a function file, run it.

## Commands

- Location: `src/Interaction/HybridCommands/<category>/<command>.ts`.
- Template: `src/Interaction/HybridCommands/!BlankHybridCommandTemplate.ts` (also `!BlankHybridSubCommandTemplate.ts`). Copy it. `Command` type: `types/command.d.ts`.
- New command: add its YAML section with a comment header:

```yaml
# /<slash-command-name>
<command_key_here>: "text"
```

- New category: same, plus a module placeholder header listing its commands:

```yaml
# <Placeholder> module
# /<cmd1>, /<cmd2>, ...

# /<slash-command-name>
<command_key_here>: "text"
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

Rules: `categoryName` is lowercase, single glued word. `description` / `placeholder` are YAML keys, not raw text. `emoji` is the literal string `"${client.iHorizon_Emojis.<Name>}"` or a plain UTF-8 emoji.

## Emojis

- Mandatory namespace: `client.iHorizon_Emojis.<Pascal_Snake_Case>`, e.g. `client.iHorizon_Emojis.Save_Clip`.
- Files: `src/assets/emojis/`. Check creation tool: `bun run check:emoji` (`tools/Emoji_Creator.ts`).

## HTML -> PNG

- Templates: `src/assets/html/*.html` with `{snake_case}` variables, camelCase files.
- Render via `client.func.html2png` (wraps puppeteer or HorizonGateway, see `src/core/functions/html2png.ts`):

```ts
let code = client.htmlfiles["twitterCommentCard"]
	.replaceAll("{tweet}", sanitizing(messageArgs.join(' ')))
	.replaceAll("{displayname}", sanitizing(username));

const img = await client.func.html2png(code, {
	omitBackground: true,
	selectElement: true,
	elementSelector: ".tweet-card",
	width: 1200,
	height: 500,
	scaleSize: 3,
});

let attachment = new AttachmentBuilder(img, { name: 'twitter.png' });
```

## Database

- Access via `client.db.get()` / `client.db.set()`.
- Schemas MUST be declared in `types/database_structure.d.ts`. When you `.get()` JSON, type it with that file. Never invent an untyped schema.

## Dependencies (Bun-first)

- No new npm dependency unless strictly necessary (image buffering with png handling: OK; API wrapper: NOT OK — write it with fetch).
- Prefer Bun natives over Node APIs: `Bun.file` over `node:fs`, native `fetch` (see `src/core/functions/axios.ts` wrapper) over extra HTTP libs.

## Commands to run

```sh
bun run dev            # dev bot, bypasses ShardingManager (src/core/bot.ts)
bun run type:lang      # retype YAML langs
bun run type:func      # retype client.func
bun run check:licence  # licence headers
bun run build          # tsc
bun run format         # prettier --write "**/*.ts"
```

## Never do

- Hardcode a user-visible string. Put it in YAML, all languages.
- Use `console.*`, `node:fs` when a Bun native exists, or add an npm package without necessity.
- Create a command/category without its YAML comment block (and `init.json` for categories).
- Use `client.iHorizon_Emojis` with wrong casing or a path outside `src/assets/emojis`.
- Skip verification: after code changes run the relevant `type:*` / `check:licence`, and `bun run dev` to test.
