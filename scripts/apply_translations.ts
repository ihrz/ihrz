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

import translations from "./translations_map";
import { readFileSync, writeFileSync } from "node:fs";
import { Glob } from "bun";

const TARGET_LANGS = ["ja", "ru", "es-ES"] as const;

function translate(text: string, lang: "ja" | "ru" | "es-ES"): string {
	const entry = translations[text];
	if (entry) return entry[lang];
	return text;
}

// Discord names must match ^[\w-]{1,32}$ - lowercase alphanumeric only
// For name_localizations, use the English name as-is, not a translation
function sanitizeForNameLocalization(text: string): string {
	if (/^[a-z0-9_-]+$/.test(text)) return text;
	const sanitized = text
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.substring(0, 32);
	return sanitized || text.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 32) || "name";
}

function getIndent(line: string): number {
	const match = line.match(/^(\t*)/);
	return match ? match[1].length : 0;
}

function findPrecedingField(
	lines: string[],
	startIdx: number,
	indent: number,
	fieldName: string
): string | null {
	for (let k = startIdx - 1; k >= 0; k--) {
		const l = lines[k];
		if (l.trim() === "") continue;
		const lIndent = getIndent(l);
		if (lIndent > indent) continue;
		if (lIndent < indent) break;

		const multiRegex = new RegExp(
			"^\\t{" + indent + "}" + fieldName + ":\\s*$"
		);
		if (l.match(multiRegex)) {
			const nextLine = lines[k + 1];
			if (nextLine) {
				const strMatch = nextLine.match(/^\s*(?:"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/);
				if (strMatch) { const result = strMatch[1] !== undefined ? strMatch[1] : strMatch[2]; if (result) return result; }
			}
		}

		const singleRegex = new RegExp(
			"^\\t{" + indent + "}" + fieldName + ':\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|`((?:[^`\\\\]|\\\\.)*)`)'
		);
		const sm = l.match(singleRegex);
		if (sm) { const result = sm[1] !== undefined ? sm[1] : sm[2]; if (result) return result; }
	}
	return null;
}

function findBlockEnd(lines: string[], startIdx: number): number {
	const line = lines[startIdx];
	const openBracePos = line.indexOf("{");
	if (openBracePos === -1) return startIdx;

	// Check if block closes on same line
	const rest = line.substring(openBracePos + 1);
	if (rest.includes("}")) return startIdx;

	// Multi-line block
	const indent = getIndent(line);
	let depth = 1;
	for (let j = startIdx + 1; j < lines.length; j++) {
		const l = lines[j];
		const trimmed = l.trim();
		if (trimmed.startsWith("}") && getIndent(l) === indent) {
			depth--;
			if (depth === 0) return j;
		}
		if (trimmed.endsWith("{")) {
			depth++;
		}
	}
	return startIdx; // Not found
}

function getExistingKeys(
	lines: string[],
	startIdx: number,
	endIdx: number
): Set<string> {
	const keys = new Set<string>();
	for (let k = startIdx + 1; k < endIdx; k++) {
		const km = lines[k].match(/^\t+(fr|ja|ru|"es-ES")\s*:/);
		if (km) keys.add(km[1].replace(/"/g, ""));
	}
	// Also check inline (single-line block)
	if (startIdx === endIdx) {
		const line = lines[startIdx];
		const body = line.substring(
			line.indexOf("{") + 1,
			line.lastIndexOf("}")
		);
		const km = body.match(/\b(fr|ja|ru|"es-ES")\s*:/g);
		if (km) {
			for (const k of km) {
				keys.add(k.replace(/["\s:]/g, ""));
			}
		}
	}
	return keys;
}

function processFile(filePath: string): number {
	const lines = readFileSync(filePath, "utf-8").split("\n");
	let modifications = 0;

	const blockTypes = [
		"description_localizations",
		"name_localizations"
	] as const;

	for (const blockType of blockTypes) {
		const fieldName =
			blockType === "description_localizations" ? "description" : "name";
		const blockRegex = new RegExp("^(\\t*)" + blockType + ":\\s*\\{");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const m = line.match(blockRegex);
			if (!m) continue;

			const blockIndent = getIndent(line);
			const endIdx = findBlockEnd(lines, i);
			const existingKeys = getExistingKeys(lines, i, endIdx);

			const missing = TARGET_LANGS.filter((k) => !existingKeys.has(k));
			if (missing.length === 0) continue;

			const englishText = findPrecedingField(
				lines,
				i,
				blockIndent,
				fieldName
			);
			if (!englishText || englishText.length === 0) continue;

			const bodyIndent = "\t".repeat(blockIndent + 1);
			const newEntries: string[] = [];
			const isNameBlock = blockType === "name_localizations";
			for (let li = 0; li < missing.length; li++) {
				const lang = missing[li];
				const localizedValue = isNameBlock ? sanitizeForNameLocalization(englishText) : translate(englishText, lang);
				const keyStr = lang === "es-ES" ? '"es-ES"' : lang;
				const comma = li < missing.length - 1 ? "," : "";
				newEntries.push(
					bodyIndent + keyStr + ': "' + localizedValue + '"' + comma
				);
			}

			if (endIdx === i) {
				// Single-line block: expand to multi-line
				const openBracePos = line.indexOf("{");
				const closeBracePos = line.lastIndexOf("}");
				const beforeBrace = line.substring(0, openBracePos + 1);
				const braceContent = line.substring(openBracePos + 1, closeBracePos).trim();
				const afterBrace = line.substring(closeBracePos).trim();
				const closeLine = "	".repeat(blockIndent) + afterBrace;
				
				let preservedEntry = braceContent;
				if (preservedEntry && !preservedEntry.endsWith(",")) {
					preservedEntry += ",";
				}
				
				const rebuildParts = [beforeBrace];
				if (preservedEntry) {
					rebuildParts.push(bodyIndent + preservedEntry);
				}
				rebuildParts.push(...newEntries);
				rebuildParts.push(closeLine);
				
				lines.splice(i, 1, ...rebuildParts);
				modifications++;
				i += rebuildParts.length - 1;
			} else {
				// Multi-line block: insert new entries
				let insertAfter = i + 1;
				for (let k = i + 1; k < endIdx; k++) {
					const km = lines[k].match(/^\t+(fr|ja|ru|"es-ES")\s*:/);
					if (km) {
						insertAfter = k;
						if (!lines[k].trimEnd().endsWith(",")) {
							lines[k] = lines[k].trimEnd() + ",";
						}
					}
				}
				lines.splice(insertAfter + 1, 0, ...newEntries);
				modifications++;
				i += newEntries.length;
			}
		}
	}

	if (modifications > 0) {
		writeFileSync(filePath, lines.join("\n"), "utf-8");
	}

	return modifications;
}

const glob = new Glob("src/Interaction/**/*.ts");
let totalMods = 0;
let filesUpdated = 0;

for await (const file of glob.scan(".")) {
	const mods = processFile(file);
	if (mods > 0) {
		filesUpdated++;
		totalMods += mods;
		console.log("[" + mods + "] " + file);
	}
}

console.log("\nFiles updated: " + filesUpdated);
console.log("Total blocks modified: " + totalMods);
