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

import path from "path";

import { Category } from "../../types/category.js";

const emojisFile = Bun.file(
	path.join(process.cwd(), "src", "files", "emojis.json")
);
const emojisFilesExist = await emojisFile.exists();
const emojisJson = emojisFilesExist ? await emojisFile.json() : null;

// Top-level entries of a command tree export: `!name.ts` files are
// subcommands, only reached through their parent command.
export function isCommandEntry(file: string): boolean {
	return !path.posix.basename(file).startsWith("!");
}

// Export key of the subcommand `name` of the command stored at `commandFile`.
export function subCommandKey(commandFile: string, name: string): string {
	const directory = path.posix.dirname(commandFile);

	return directory === "." ? `!${name}.ts` : `${directory}/!${name}.ts`;
}

export function resolveCategoryInitializer(category: Category): Category {
	return {
		...category,
		options: {
			...category.options,
			emoji: resolveCategoryTemplate(category.options.emoji)
		}
	};
}

function resolveCategoryTemplate(value: string): string {
	const match = value.match(
		/^\$\{client\.iHorizon_Emojis\.([A-Za-z0-9_]+)\}$/
	);

	if (!match || !emojisFilesExist) {
		return value;
	}

	const emojiKey = match[1] as keyof typeof emojisJson;
	return emojisJson?.[emojiKey] || value;
}
