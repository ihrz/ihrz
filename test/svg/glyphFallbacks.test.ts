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

import { expect, test } from "bun:test";

import { text } from "../../src/core/functions/svgKit.ts";
import svg2png from "../../src/core/functions/svg2png.ts";
import {
	fontFilesFor,
	prepareGlyphFallbacks,
	scriptFamilyOf
} from "../../src/core/svg/fontMetrics.ts";
import glyphFallbacks from "../../src/core/svg/glyphFallbacks.json";

const familiesOf = (markup: string) =>
	[...markup.matchAll(/font-family="([^"]+)"/g)].map((match) => match[1]);

const draw = async (content: string) =>
	(await text(content, { x: 0, y: 40, size: 32, maxWidth: 400 })).markup;

const image = (body: string) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60">${body}</svg>`;

test.each([
	["𝓕𝓪𝓷𝓬𝔂", "Noto Sans Math"],
	["★✧", "Noto Sans Symbols 2"],
	["ᯓ", "Noto Sans Batak"],
	["𓂃", "Noto Sans Egyptian Hieroglyphs"],
	["༄", "Noto Serif Tibetan"],
	["𝄞", "Noto Music"],
	["ᑕᑌᒪ", "Noto Sans Canadian Aboriginal"],
	["ᏦᎥ", "Noto Sans Cherokee"],
	["ꓮꓐ", "Noto Sans Lisu"],
	["ᚠᚢ", "Noto Sans Runic"],
	["𐌀𐌁", "Noto Sans Old Italic"],
	["שלום", "Noto Sans Hebrew"],
	["สวัสดี", "Noto Sans Thai"],
	["नमस्ते", "Noto Sans Devanagari"],
	["Բարև", "Noto Sans Armenian"],
	["გამარჯობა", "Noto Sans Georgian"],
	["ꀀꀁ", "Noto Sans Yi"]
])("%s is drawn with %s", async (content, family) => {
	expect(familiesOf(await draw(content))).toEqual([family]);
});

test("text the base font covers does not change", async () => {
	for (const content of ["Kisakay 123", "Éléonore", "Привет", "ᴋɪsᴀᴋᴀʏ"]) {
		expect(familiesOf(await draw(content))).toEqual(["Noto Sans"]);
	}
});

test("existing script routing does not change", async () => {
	expect(familiesOf(await draw("こんにちは"))).toEqual(["Noto Sans JP"]);
	expect(familiesOf(await draw("안녕"))).toEqual(["Noto Sans KR"]);
});

test("digits and spaces are not stranded in a small font", async () => {
	const markup = await draw("★ 42");
	const families = familiesOf(markup);

	expect(families).toEqual(["Noto Sans Symbols 2", "Noto Sans"]);
	expect(markup).toContain("> 42<");
});

test("a symbol after a script run gets its own font", async () => {
	const families = familiesOf(await draw("こんにちは★"));

	expect(families).toEqual(["Noto Sans JP", "Noto Sans Symbols 2"]);
});

test("a character no font has keeps the image working", async () => {
	const markup = await draw("a\u{10FFFD}b");

	expect(familiesOf(markup)).toEqual(["Noto Sans"]);
	expect((await svg2png(image(markup))).length).toBeGreaterThan(0);
});

test("only the fonts an image uses are loaded", async () => {
	const has = (files: string[], name: string) =>
		files.some((file) => file.endsWith(name));

	const plain = fontFilesFor(image(await draw("Kisakay")));
	expect(has(plain, "NotoSansMath-Regular.otf")).toBe(false);
	expect(has(plain, "NotoSansSymbols2-Regular.otf")).toBe(false);

	const symbols = fontFilesFor(image(await draw("★")));
	expect(has(symbols, "NotoSansSymbols2-Regular.otf")).toBe(true);
	expect(has(symbols, "NotoSansMath-Regular.otf")).toBe(false);
});

// Drawn with the family named in the table: a wrong name, or a file resvg cannot
// read, shows up as the same box as a character no font has.
const MISSING = "\u{10FFFD}";

// Some characters of a font are routed elsewhere first, the ones it shares with
// a script (Arabic marks in Syriac and Math): only its own ones can prove it.
function firstDrawable(index: number): string {
	const { family } = glyphFallbacks.families[index];

	for (let at = 0; at < glyphFallbacks.ranges.length; at += 3) {
		if (glyphFallbacks.ranges[at + 2] !== index) continue;

		for (
			let codePoint = glyphFallbacks.ranges[at];
			codePoint <= glyphFallbacks.ranges[at + 1];
			codePoint++
		) {
			const char = String.fromCodePoint(codePoint);
			if (
				/[\p{L}\p{N}\p{So}\p{Sm}]/u.test(char) &&
				scriptFamilyOf(char) === family
			) {
				return char;
			}
		}
	}
	return "";
}

test("the control for the check below: unknown characters look the same", async () => {
	const [a, b] = await Promise.all([
		svg2png(image(await draw(MISSING))),
		svg2png(image(await draw("\u{10FFFC}")))
	]);

	expect(a.equals(b)).toBe(true);
});

test("the examples from the bug report are really drawn", async () => {
	const missing = await svg2png(image(await draw(MISSING)));

	for (const char of ["ᯓ", "𓂃", "𝓕", "༄"]) {
		const drawn = await svg2png(image(await draw(char)));
		expect(drawn.equals(missing)).toBe(false);
	}
});

test("every font of the table draws its characters", async () => {
	await prepareGlyphFallbacks();

	const missing = await svg2png(image(await draw(MISSING)));
	const broken: string[] = [];

	for (const [index, { family }] of glyphFallbacks.families.entries()) {
		const char = firstDrawable(index);
		if (!char) {
			broken.push(`${family}: no character of its own`);
			continue;
		}

		const markup = await draw(char);
		if (!familiesOf(markup).includes(family)) {
			broken.push(`${family}: routed elsewhere`);
			continue;
		}
		if ((await svg2png(image(markup))).equals(missing)) {
			broken.push(`${family}: nothing drawn for ${char}`);
		}
	}

	expect(broken).toEqual([]);
}, 60_000);

// rustybuzz 0.7 in local resvg reads past the buffer when these end a text, and
// that aborts the process: a regression takes this whole test run down with it.
test("marks that end a text do not abort the renderer", async () => {
	const marks = [
		0x11d97, 0x1b44, 0x11c3f, 0x11003, 0x11004, 0x11133, 0x110b9, 0xa9c0,
		0x11235, 0x11d45, 0xaaf6, 0x1163f, 0xa8c4, 0x11a99, 0x119e0, 0x11442,
		0x115bf, 0x111c0, 0x116b6, 0x11839, 0xa806, 0x1bab, 0x11a47, 0x114c2,
		0x10a3f
	];

	for (const mark of marks) {
		const char = String.fromCodePoint(mark);

		for (const content of [char, char + char]) {
			expect((await svg2png(image(await draw(content)))).length).toBeGreaterThan(0);
		}
	}
});

test("the table is sorted, for the binary search", () => {
	const { ranges } = glyphFallbacks;

	for (let at = 3; at < ranges.length; at += 3) {
		expect(ranges[at]).toBeGreaterThan(ranges[at - 2]);
	}
});
