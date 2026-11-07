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

/**
 * Rebuilds src/core/svg/glyphFallbacks.json from src/assets/fonts/fallback
 * (imported by tools/Font_Fallback_Import.py): which font draws each character
 * the base fonts lack.
 */

import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FONT_DIR, parseFont } from "../src/core/svg/fontMetrics.ts";

const OUTPUT = path.join(process.cwd(), "src/core/svg/glyphFallbacks.json");
const FALLBACK_DIR = path.join(FONT_DIR, "fallback");

// Handled as a script: see SCRIPT_PATTERNS.
const NOT_FALLBACKS = ["NotoSansHebrew.ttf"];

// Several script fonts carry a few shared symbols (the dotted circle of
// combining marks): these fonts draw them first, so one symbol has one look.
const FIRST = [
	"NotoSansSymbols",
	"NotoSansSymbols2",
	"NotoSansMath",
	"NotoMusic"
];

const rank = (file: string) => {
	const index = FIRST.indexOf(file.replace(/(-Regular)?\.(ttf|otf)$/, ""));
	return index === -1 ? FIRST.length : index;
};

function read(file: string): ArrayBuffer {
	const buffer = readFileSync(file);
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.length
	) as ArrayBuffer;
}

// The name resvg matches `font-family` against: the typographic family when
// there is one, as fontdb does, then the plain family.
function familyOf(buffer: ArrayBuffer): string {
	const view = new DataView(buffer);
	let name = -1;
	for (let i = 0; i < view.getUint16(4); i++) {
		const record = 12 + i * 16;
		const tag = String.fromCharCode(...new Uint8Array(buffer, record, 4));
		if (tag === "name") name = view.getUint32(record + 8);
	}
	const count = view.getUint16(name + 2);
	const strings = name + view.getUint16(name + 4);
	const found = new Map<number, string>();
	for (let i = 0; i < count; i++) {
		const record = name + 6 + i * 12;
		const platform = view.getUint16(record);
		const language = view.getUint16(record + 4);
		const id = view.getUint16(record + 6);
		if (platform !== 3 || language !== 0x409 || (id !== 1 && id !== 16)) {
			continue;
		}
		const bytes = new Uint8Array(
			buffer,
			strings + view.getUint16(record + 10),
			view.getUint16(record + 8)
		);
		found.set(id, new TextDecoder("utf-16be").decode(bytes));
	}
	const family = found.get(16) ?? found.get(1);
	if (!family) throw new Error("No family name");
	return family;
}

const files = readdirSync(FALLBACK_DIR)
	.filter(
		(file) => /\.(ttf|otf)$/.test(file) && !NOT_FALLBACKS.includes(file)
	)
	.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

const fonts = files.map((file) => {
	const buffer = read(path.join(FALLBACK_DIR, file));
	return { file, family: familyOf(buffer), font: parseFont(buffer) };
});

const base = ["NotoSans-Regular.ttf", "JetBrainsMono-Regular.ttf"].map((file) =>
	parseFont(read(path.join(FONT_DIR, file)))
);

const ranges: number[] = [];

for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
	// Surrogates and private use areas have no meaning to draw.
	if (codePoint === 0xd800) codePoint = 0xf900;
	if (codePoint === 0xf0000) break;

	if (base.some((font) => font.glyphOf(codePoint) !== 0)) continue;

	const index = fonts.findIndex(({ font }) => font.glyphOf(codePoint) !== 0);
	if (index === -1) continue;

	const last = ranges.length - 3;
	if (
		last >= 0 &&
		ranges[last + 1] === codePoint - 1 &&
		ranges[last + 2] === index
	) {
		ranges[last + 1] = codePoint;
	} else {
		ranges.push(codePoint, codePoint, index);
	}
}

// A font whose characters all come from another one would never be read
// (layout variants, test fonts): it only weighs on the repository.
const used = [...new Set(ranges.filter((_, at) => at % 3 === 2))].sort(
	(a, b) => a - b
);
for (const [index, { file }] of fonts.entries()) {
	if (!used.includes(index)) unlinkSync(path.join(FALLBACK_DIR, file));
}

writeFileSync(
	OUTPUT,
	`${JSON.stringify({
		families: used.map((index) => ({
			family: fonts[index].family,
			file: fonts[index].file
		})),
		ranges: ranges.map((value, at) =>
			at % 3 === 2 ? used.indexOf(value) : value
		)
	})}\n`
);

process.stdout.write(
	`${used.length} fonts, ${ranges.length / 3} ranges written to ${OUTPUT}\n`
);
