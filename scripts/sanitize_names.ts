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

import { readFileSync, writeFileSync } from "node:fs";
import { Glob } from "bun";

function getIndent(line: string): number {
	const match = line.match(/^(\t*)/);
	return match ? match[1].length : 0;
}

function sanitizeName(text: string): string {
	// Discord names must match ^[\w-]{1,32}$ and be lowercase
	// Take only [a-z0-9_-] characters, limit to 32 chars, ensure non-empty
	const sanitized = text
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.substring(0, 32);
	return sanitized || "name";
}

function processFile(filePath: string): number {
	const lines = readFileSync(filePath, "utf-8").split("\n");
	let modifications = 0;
	const blockRegex = /^(\t*)name_localizations:\s*\{/;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const m = line.match(blockRegex);
		if (!m) continue;

		const blockIndent = getIndent(line);

		// Find block content (possibly multi-line or single-line)
		let closeIdx: number;
		let isSingleLine = false;

		const openPos = line.indexOf("{");
		const restOfLine = line.substring(openPos + 1);
		const singleClose = restOfLine.indexOf("}");
		if (singleClose !== -1) {
			closeIdx = i;
			isSingleLine = true;
		} else {
			// Multi-line: find matching }
			let depth = 1;
			let j = i + 1;
			while (j < lines.length && depth > 0) {
				const l = lines[j];
				const t = l.trim();
				if (t.startsWith("}") && getIndent(l) === blockIndent) {
					depth--;
					if (depth === 0) break;
				}
				if (t.endsWith("{")) depth++;
				j++;
			}
			closeIdx = j;
		}

		// Get all key-value pairs
		const entries: { key: string; value: string; lineIdx: number }[] = [];

		if (isSingleLine) {
			const body = line.substring(openPos + 1, line.lastIndexOf("}"));
			const entryRegex = /(fr|ja|ru|"es-ES")\s*:\s*"((?:[^"\\]|\\.)*)"/g;
			let em;
			while ((em = entryRegex.exec(body)) !== null) {
				entries.push({
					key: em[1].replace(/"/g, ""),
					value: em[2],
					lineIdx: i
				});
			}
		} else {
			for (let k = i + 1; k < closeIdx; k++) {
				const km = lines[k].match(
					/^\t+(fr|ja|ru|"es-ES")\s*:\s*"((?:[^"\\]|\\.)*)"/
				);
				if (km) {
					entries.push({
						key: km[1].replace(/"/g, ""),
						value: km[2],
						lineIdx: k
					});
				}
			}
		}

		// Check which entries need sanitization
		let needsFix = false;
		for (const e of entries) {
			if (!/^[a-z0-9_-]+$/.test(e.value)) {
				needsFix = true;
				break;
			}
		}
		if (!needsFix) continue;

		// Sanitize all values
		for (const e of entries) {
			if (!/^[a-z0-9_-]+$/.test(e.value)) {
				const sanitized = sanitizeName(e.value);
				if (isSingleLine) {
					// Replace in the line
					lines[i] = lines[i].replace(
						new RegExp(
							"(" +
								e.key.replace(/"/g, '"') +
								':\\s*)"((?:[^"\\\\]|\\\\.)*)"',
							"g"
						),
						'$1"' + sanitized + '"'
					);
				} else {
					const lineEndsWithComma = lines[e.lineIdx].trimEnd().endsWith(",");
					lines[e.lineIdx] = lines[e.lineIdx].replace(
						/"((?:[^"\\]|\\.)*)"(,?)$/,
						'"' + sanitized + '"' + (lineEndsWithComma ? "," : "")
					);
				}
			}
		}
		modifications++;
	}

	if (modifications > 0) {
		writeFileSync(filePath, lines.join("\n"), "utf-8");
	}
	return modifications;
}

const glob = new Glob("src/Interaction/**/*.ts");
let total = 0;
let files = 0;

for await (const f of glob.scan(".")) {
	const m = processFile(f);
	if (m > 0) {
		files++;
		total += m;
		console.log("[" + m + "] " + f);
	}
}
console.log("\nFiles: " + files + ", blocks: " + total);
