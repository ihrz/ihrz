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
 * Minimal TrueType reader: advance widths only (head, hhea, hmtx, cmap
 * formats 4 and 12). resvg has no text layout API usable for measuring
 * (one Resvg instance per measure costs ~200ms), so wrapping and ellipsis
 * are computed here from the same font files resvg renders with.
 * Kerning is ignored: the error is a few pixels on a full line, absorbed by
 * the margins of the layouts.
 */

import path from "path";

export type FontFamily = "Noto Sans" | "JetBrains Mono" | "Rye";
export type FontWeight = 400 | 700;

export const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");

// Family + weight -> file. Families are the names embedded in the files,
// which is what resvg matches `font-family` against.
const FONT_FILES: Record<FontFamily, Partial<Record<FontWeight, string>>> = {
	"Noto Sans": { 400: "NotoSans-Regular.ttf", 700: "NotoSans-Bold.ttf" },
	"JetBrains Mono": {
		400: "JetBrainsMono-Regular.ttf",
		700: "JetBrainsMono-Bold.ttf"
	},
	Rye: { 400: "Rye-Regular.ttf" }
};

// Missing glyphs fall back like resvg does: to the other bundled fonts.
const FALLBACK_ORDER: FontFamily[] = ["Noto Sans", "JetBrains Mono"];

interface ParsedFont {
	unitsPerEm: number;
	advances: Uint16Array;
	glyphOf(codePoint: number): number;
}

const parsed = new Map<string, Promise<ParsedFont>>();

function parseFont(buffer: ArrayBuffer): ParsedFont {
	const view = new DataView(buffer);
	const tables = new Map<string, number>();
	const numTables = view.getUint16(4);
	for (let i = 0; i < numTables; i++) {
		const record = 12 + i * 16;
		const tag = String.fromCharCode(
			view.getUint8(record),
			view.getUint8(record + 1),
			view.getUint8(record + 2),
			view.getUint8(record + 3)
		);
		tables.set(tag, view.getUint32(record + 8));
	}

	const table = (tag: string) => {
		const offset = tables.get(tag);
		if (offset === undefined) throw new Error(`Font table ${tag} missing`);
		return offset;
	};

	const unitsPerEm = view.getUint16(table("head") + 18);
	const numberOfHMetrics = view.getUint16(table("hhea") + 34);
	const numGlyphs = view.getUint16(table("maxp") + 4);

	const hmtx = table("hmtx");
	const advances = new Uint16Array(numGlyphs);
	let last = 0;
	for (let glyph = 0; glyph < numGlyphs; glyph++) {
		if (glyph < numberOfHMetrics) last = view.getUint16(hmtx + glyph * 4);
		advances[glyph] = last;
	}

	return { unitsPerEm, advances, glyphOf: parseCmap(view, table("cmap")) };
}

function parseCmap(
	view: DataView,
	cmap: number
): (codePoint: number) => number {
	let format4 = -1;
	let format12 = -1;
	const count = view.getUint16(cmap + 2);
	for (let i = 0; i < count; i++) {
		const record = cmap + 4 + i * 8;
		const platform = view.getUint16(record);
		const encoding = view.getUint16(record + 2);
		const subtable = cmap + view.getUint32(record + 4);
		const format = view.getUint16(subtable);
		const unicode = platform === 0 || (platform === 3 && encoding !== 0);
		if (!unicode) continue;
		if (format === 12) format12 = subtable;
		else if (format === 4 && format4 === -1) format4 = subtable;
	}

	if (format12 !== -1) {
		const groups = view.getUint32(format12 + 12);
		return (codePoint) => {
			let low = 0;
			let high = groups - 1;
			while (low <= high) {
				const mid = (low + high) >> 1;
				const group = format12 + 16 + mid * 12;
				const start = view.getUint32(group);
				const end = view.getUint32(group + 4);
				if (codePoint < start) high = mid - 1;
				else if (codePoint > end) low = mid + 1;
				else return view.getUint32(group + 8) + codePoint - start;
			}
			return 0;
		};
	}

	if (format4 !== -1) {
		const segCount = view.getUint16(format4 + 6) / 2;
		const endCodes = format4 + 14;
		const startCodes = endCodes + segCount * 2 + 2;
		const idDeltas = startCodes + segCount * 2;
		const idRangeOffsets = idDeltas + segCount * 2;
		return (codePoint) => {
			if (codePoint > 0xffff) return 0;
			for (let i = 0; i < segCount; i++) {
				if (codePoint > view.getUint16(endCodes + i * 2)) continue;
				const start = view.getUint16(startCodes + i * 2);
				if (codePoint < start) return 0;
				const delta = view.getInt16(idDeltas + i * 2);
				const rangeOffsetAt = idRangeOffsets + i * 2;
				const rangeOffset = view.getUint16(rangeOffsetAt);
				if (rangeOffset === 0) return (codePoint + delta) & 0xffff;
				const glyph = view.getUint16(
					rangeOffsetAt + rangeOffset + (codePoint - start) * 2
				);
				return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
			}
			return 0;
		};
	}

	return () => 0;
}

function fileFor(family: FontFamily, weight: FontWeight): string {
	const files = FONT_FILES[family];
	return files[weight] ?? files[400] ?? FONT_FILES["Noto Sans"][400]!;
}

function loadFont(file: string): Promise<ParsedFont> {
	let font = parsed.get(file);
	if (!font) {
		font = Bun.file(path.join(FONT_DIR, file))
			.arrayBuffer()
			.then(parseFont);
		parsed.set(file, font);
	}
	return font;
}

/** Bundled font files resvg must load (absolute paths). */
export function bundledFontFiles(): string[] {
	const files = new Set<string>();
	for (const weights of Object.values(FONT_FILES)) {
		for (const file of Object.values(weights)) {
			if (file) files.add(path.join(FONT_DIR, file));
		}
	}
	return [...files];
}

export interface Measurer {
	/** Width in px of `text` (no emoji) at `size`, letter spacing included. */
	width(text: string): number;
}

/** Loads (once) the fonts needed and returns a synchronous measurer. */
export async function measurer(
	family: FontFamily,
	weight: FontWeight,
	size: number,
	letterSpacing = 0
): Promise<Measurer> {
	const primary = await loadFont(fileFor(family, weight));
	const fallbacks = await Promise.all(
		FALLBACK_ORDER.filter((f) => f !== family).map((f) =>
			loadFont(fileFor(f, weight))
		)
	);

	const advance = (codePoint: number): number => {
		for (const font of [primary, ...fallbacks]) {
			const glyph = font.glyphOf(codePoint);
			if (glyph !== 0) return font.advances[glyph] / font.unitsPerEm;
		}
		// Not covered by any bundled font (e.g. CJK): average glyph width.
		return 0.6;
	};

	return {
		width(text: string): number {
			let em = 0;
			let glyphs = 0;
			for (const char of text) {
				em += advance(char.codePointAt(0)!);
				glyphs++;
			}
			return em * size + glyphs * letterSpacing;
		}
	};
}
