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
 * Arabic joining for measurement only (resvg shapes the real rendering).
 * Arabic letters take contextual forms (initial, medial, final, isolated)
 * whose widths differ a lot from the base code points: measuring the base
 * letters overestimated Arabic runs by ~40%. The bundled Noto Sans Arabic
 * maps the Unicode presentation forms, so the text is converted to them
 * following the Unicode joining rules, then measured as usual.
 */

// Letter -> presentation forms: [isolated, final] for right-joining
// letters, [isolated, final, initial, medial] for dual-joining ones.
const FORMS: Record<number, number[]> = {
	0x0621: [0xfe80],
	0x0622: [0xfe81, 0xfe82],
	0x0623: [0xfe83, 0xfe84],
	0x0624: [0xfe85, 0xfe86],
	0x0625: [0xfe87, 0xfe88],
	0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
	0x0627: [0xfe8d, 0xfe8e],
	0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
	0x0629: [0xfe93, 0xfe94],
	0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98],
	0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
	0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
	0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4],
	0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8],
	0x062f: [0xfea9, 0xfeaa],
	0x0630: [0xfeab, 0xfeac],
	0x0631: [0xfead, 0xfeae],
	0x0632: [0xfeaf, 0xfeb0],
	0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
	0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
	0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
	0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0],
	0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
	0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8],
	0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc],
	0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0],
	0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4],
	0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8],
	0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
	0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0],
	0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4],
	0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
	0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
	0x0648: [0xfeed, 0xfeee],
	0x0649: [0xfeef, 0xfef0],
	0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4],
	// Persian / Urdu letters (Presentation Forms-A)
	0x067e: [0xfb56, 0xfb57, 0xfb58, 0xfb59],
	0x0686: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d],
	0x0698: [0xfb8a, 0xfb8b],
	0x06a9: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91],
	0x06af: [0xfb92, 0xfb93, 0xfb94, 0xfb95],
	0x06cc: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff]
};

// Lam followed by one of these alefs becomes a single ligature [isolated, final].
const LAM = 0x0644;
const LAM_ALEF: Record<number, number[]> = {
	0x0622: [0xfef5, 0xfef6],
	0x0623: [0xfef7, 0xfef8],
	0x0625: [0xfef9, 0xfefa],
	0x0627: [0xfefb, 0xfefc]
};

const TATWEEL = 0x0640;

// Harakat and other marks: transparent for joining.
function isTransparent(codePoint: number): boolean {
	return (
		(codePoint >= 0x064b && codePoint <= 0x065f) ||
		codePoint === 0x0670 ||
		(codePoint >= 0x06d6 && codePoint <= 0x06ed)
	);
}

function joinsBothWays(codePoint: number): boolean {
	return codePoint === TATWEEL || FORMS[codePoint]?.length === 4;
}

function joinsRight(codePoint: number): boolean {
	return codePoint === TATWEEL || (FORMS[codePoint]?.length ?? 0) >= 2;
}

/** Text with Arabic letters replaced by their contextual presentation forms. */
export function arabicPresentationForms(text: string): string {
	const codePoints = [...text].map((char) => char.codePointAt(0)!);
	const neighbour = (from: number, step: 1 | -1): number | undefined => {
		for (let i = from + step; i >= 0 && i < codePoints.length; i += step) {
			if (!isTransparent(codePoints[i])) return codePoints[i];
		}
		return undefined;
	};

	const output: number[] = [];
	for (let i = 0; i < codePoints.length; i++) {
		const codePoint = codePoints[i];
		const forms = FORMS[codePoint];
		if (!forms) {
			output.push(codePoint);
			continue;
		}

		const previous = neighbour(i, -1);
		const joinsPrevious = previous !== undefined && joinsBothWays(previous);

		const nextIndex = codePoints.findIndex(
			(value, index) => index > i && !isTransparent(value)
		);
		const next = nextIndex === -1 ? undefined : codePoints[nextIndex];

		if (codePoint === LAM && next !== undefined && LAM_ALEF[next]) {
			output.push(LAM_ALEF[next][joinsPrevious ? 1 : 0]);
			codePoints[nextIndex] = 0x200b; // consumed by the ligature
			continue;
		}

		const joinsNext =
			forms.length === 4 && next !== undefined && joinsRight(next);
		if (forms.length === 4 && joinsPrevious && joinsNext)
			output.push(forms[3]);
		else if (forms.length === 4 && joinsNext) output.push(forms[2]);
		else if (joinsPrevious && forms.length >= 2) output.push(forms[1]);
		else output.push(forms[0]);
	}

	return String.fromCodePoint(...output.filter((value) => value !== 0x200b));
}
