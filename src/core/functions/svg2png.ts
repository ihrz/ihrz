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
 * SVG -> PNG with resvg, the replacement for `html2png` (headless Chromium).
 * A few milliseconds per image on the libuv thread pool, no browser process,
 * no network: only the bundled fonts are loaded (system fonts would cost
 * ~1.7s per render and differ between hosts), script fonts (Arabic, CJK)
 * only when the SVG uses them.
 */

import { renderAsync } from "@resvg/resvg-js";

import { fontFilesFor } from "../svg/fontMetrics.js";

export interface Svg2PngOptions {
	/** Output scale (2 = twice the SVG size). Default 1. */
	scale?: number;
	/** CSS color painted behind transparent areas. Default transparent. */
	background?: string;
}

export default async function svg2png(
	svg: string,
	options: Svg2PngOptions = {}
): Promise<Buffer> {
	const scale = options.scale ?? 1;
	const rendered = await renderAsync(svg, {
		font: {
			fontFiles: fontFilesFor(svg),
			loadSystemFonts: false,
			defaultFontFamily: "Noto Sans",
			sansSerifFamily: "Noto Sans",
			monospaceFamily: "JetBrains Mono"
		},
		fitTo:
			scale === 1 ? { mode: "original" } : { mode: "zoom", value: scale },
		background: options.background,
		shapeRendering: 2,
		textRendering: 1,
		imageRendering: 0,
		logLevel: "off"
	});
	return rendered.asPng();
}
