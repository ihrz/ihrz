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

import { readFileSync } from "node:fs";
import { Glob } from "bun";

const glob = new Glob("src/Interaction/**/*.ts");
const descriptions = new Set<string>();
const choices = new Set<string>();

for await (const file of glob.scan(".")) {
	const content = readFileSync(file, "utf-8");

	// Extract description strings
	const descRegex = /description:\s*"((?:[^"\\]|\\.)*)"/g;
	let match;
	while ((match = descRegex.exec(content)) !== null) {
		descriptions.add(match[1]);
	}

	// Extract choice name strings
	const choiceRegex = /name:\s*"((?:[^"\\]|\\.)*)"/g;
	while ((match = choiceRegex.exec(content)) !== null) {
		choices.add(match[1]);
	}
}

const output = {
	descriptions: Array.from(descriptions).sort(),
	choices: Array.from(choices).sort()
};

await Bun.write(
	"scripts/descriptions_to_translate.json",
	JSON.stringify(output, null, 2)
);
console.log(
	`Extracted ${descriptions.size} description strings and ${choices.size} choice strings`
);
