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

/*
 * Language files check (src/lang/*.ts) against the reference en-US.ts.
 * Keys and value types are already enforced by TypeScript (`satisfies
 * LanguageData`); this also catches what the compiler cannot see: a
 * placeholder (`${...}` or `{...}`) present in English but missing or
 * renamed in a translation, which would leave raw text in a message.
 *
 * Usage: bun run check:lang   (exit code 1 when a key is missing or extra)
 */

import logger from "../src/core/logger.js";
import "../src/core/functions/colors.js";
import { AvailableLanguage } from "../src/core/functions/getLanguageData.js";

type LangFile = Record<string, string | string[]>;

const PLACEHOLDER = /\$\{[^}]+\}|\{[A-Za-z0-9_.]+\}/g;

function placeholders(value: string | string[]): string[] {
	const text = Array.isArray(value) ? value.join("\n") : value;
	return [...new Set(text.match(PLACEHOLDER) ?? [])].sort();
}

async function load(code: string): Promise<LangFile> {
	return (await import(`../src/lang/${code}.ts`)).default as LangFile;
}

const reference = await load("en-US");
const referenceKeys = Object.keys(reference);
let errors = 0;
let warnings = 0;

for (const { code } of AvailableLanguage) {
	if (code === "en-US") continue;
	const lang = await load(code);

	const missing = referenceKeys.filter((key) => !(key in lang));
	const extra = Object.keys(lang).filter((key) => !(key in reference));
	for (const key of missing) logger.err(`${code}: missing key ${key}`);
	for (const key of extra) logger.err(`${code}: unknown key ${key}`);
	errors += missing.length + extra.length;

	for (const key of referenceKeys) {
		if (!(key in lang)) continue;
		const expected = placeholders(reference[key]).join(" ");
		const actual = placeholders(lang[key]).join(" ");
		if (expected !== actual) {
			logger.warn(
				`${code}: ${key} placeholders [${actual}] differ from en-US [${expected}]`
			);
			warnings++;
		}
	}
}

logger.log(
	`Languages checked: ${AvailableLanguage.length}, ${errors} error(s), ${warnings} placeholder warning(s).`
);
process.exit(errors > 0 ? 1 : 0);
