# Bot languages: typed TypeScript files

## Overview

Every user-visible string of the bot lives in `src/lang/<code>.ts`, one file
per language:

```
src/lang/
├── en-US.ts        reference language: defines the LanguageData type
├── ar-EG.ts  de-DE.ts  es-ES.ts  fr-FR.ts  fr-ME.ts
├── it-IT.ts  jp-JP.ts  pt-PT.ts  ru-RU.ts
└── work_in_progress/
    └── ua-UA.ts    partial translation, not loadable yet
```

A language file is a plain default-exported object:

```ts
import type { LanguageData } from "../../types/languageData.js";

export default {
	// /nowplaying
	nowplaying_header: "En lecture dans ${channel}",
	nowplaying_button_pause: "Pause",

	// /8ball
	question_s: ["Oui.", "Non."]
} satisfies LanguageData;
```

## How the typing works

- `en-US.ts` is the source of truth. `types/languageData.d.ts` is just
  `export type LanguageData = typeof enUS`: there is nothing to generate.
- Every other language ends with `satisfies LanguageData`. TypeScript then
  rejects, at `bun run build` (or in the editor):
  - a key that exists in English but is missing in the translation,
  - a key that does not exist in English (typo, removed key),
  - a value of the wrong type (`string` where English has `string[]`).
- Work-in-progress languages use `satisfies Partial<LanguageData>`: missing
  keys are allowed, unknown keys are still errors.

Code reads strings through the typed object, so a wrong key name in a
command is also a compile error:

```ts
const lang = await client.func.getLanguageData(guildId);
lang.nowplaying_header.replace("${channel}", `<#${channelId}>`);
```

## Placeholders

Placeholders are plain names inside the strings (`"${roles}"`,
`"${authorId}"`, `"{mode}"`) and are replaced at the call site:

```ts
lang.perm_roles_created_role.replace("${roles}", createdRoles.join(", "));
```

- A placeholder is a name, never an expression: `${interaction.user.id}` is
  rejected by `bun run check:lang`.
- Whoever ran the command is `author` (`${author}`, `${authorId}`,
  `${authorUsername}`); the target keeps its own name (`${user}`,
  `${memberId}`).
- Emojis are `${emoji_<Name>}` (`${emoji_Yes}` for
  `client.iHorizon_Emojis.Yes`). They are resolved once, when the language
  is loaded (see below): call sites never replace emojis. Counts are
  `<thing>Count`.
- Replace with plain strings: `.replace("${name}", value)` for one
  occurrence, `.replaceAll("${name}", value)` for several. No regex.
- Always use double-quoted strings, never template literals, or the
  placeholder would be evaluated as code.

TypeScript cannot see placeholders, so `bun run check:lang`
(`tools/LangsChecker-Tools.ts`) compares, for every key, the set of
`${...}` and `{...}` placeholders of each language with English. A
difference is reported as a warning: the translation would leave raw text
or drop a value. Missing or unknown keys make the command exit with code 1.

## Loading at runtime

- `client.func.getLanguageData(guildId)`: the guild's language (from its
  config, cached), English when none is set.
- `client.func.getLanguageDataByCode(code)`: a given language. Only the codes
  listed in `AvailableLanguage` (`src/core/functions/getLanguageData.ts`) are
  imported; anything else falls back to `en-US`. Each language is imported
  once, its `${emoji_<Name>}` placeholders are replaced with the bot's
  emojis, and the result is kept in memory. The cache is cleared when the
  emojis are synced again (`EmojisManager`), so emoji ids stay current.

## Adding or changing a key

1. Add the key to `en-US.ts` under the comment header of its command
   (`// /<command>`), then to every other language file, translated.
2. `bun run check:lang` to check keys and placeholders.
3. `bun run build` (or your editor) to type-check.

## Adding a language

1. Create `src/lang/<code>.ts` from a copy of `en-US.ts`, add the
   `satisfies LanguageData` import and translate every value.
2. Add the code to `AvailableLanguage` in
   `src/core/functions/getLanguageData.ts`.
3. `bun run check:lang` and `bun run build`.
