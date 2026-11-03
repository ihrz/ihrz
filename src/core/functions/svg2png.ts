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
import { GatewayMethod, HorizonGatewayInternal } from "./apiUrlParser.js";

export interface Svg2PngOptions {
	/** Output scale (2 = twice the SVG size). Default 1. */
	scale?: number;
	/** `#rrggbb` / `#rrggbbaa` painted behind transparent areas (the gateway
	 * only accepts hex). Default transparent. */
	background?: string;
}

// Renders run one at a time per process (shard). Each render loads its
// fonts and allocates a full-size pixmap on the libuv pool; with several in
// flight the native allocator keeps the peak reserved (~300 MB RSS per
// shard measured, vs ~150 MB serialized). Renders take ~15 ms, so the
// queue adds no visible latency.
const RENDER_CONCURRENCY = Math.max(
	1,
	Number(process.env.SVG_RENDER_CONCURRENCY) || 1
);
let active = 0;
const waiting: (() => void)[] = [];

async function withRenderSlot<T>(task: () => Promise<T>): Promise<T> {
	if (active >= RENDER_CONCURRENCY) {
		// The finishing render hands its slot over: no increment here.
		await new Promise<void>((resolve) => waiting.push(resolve));
	} else {
		active++;
	}
	try {
		return await task();
	} finally {
		const next = waiting.shift();
		if (next) next();
		else active--;
	}
}

// Rendering is delegated to HorizonGateway when configured: one resvg
// engine (fonts loaded once) for every shard, instead of ~170 MB of native
// memory per shard. Local rendering is the fallback (dev, gateway down).
const GATEWAY_TIMEOUT_MS = 15_000;
const GATEWAY_RETRY_AFTER_MS = 30_000;
let gatewayDownUntil = 0;

async function renderOnGateway(
	svg: string,
	options: Svg2PngOptions
): Promise<Buffer | null> {
	const config = globalThis.client?.config?.api;
	if (!config?.HorizonGateway && !config?.HorizonGatewayLocal) return null;
	if (!config.apiToken || Date.now() < gatewayDownUntil) return null;

	try {
		const response = await fetch(
			HorizonGatewayInternal(GatewayMethod.SvgRendering),
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-admin-key": config.apiToken
				},
				body: JSON.stringify({
					svg,
					scale: options.scale ?? 1,
					background: options.background
				}),
				signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS)
			}
		);
		const type = response.headers.get("content-type") ?? "";
		if (response.ok && type.startsWith("image/png")) {
			return Buffer.from(await response.arrayBuffer());
		}
		// 400/413: this SVG itself is the problem, the local renderer will
		// give the same answer; anything else means the gateway is unusable.
		if (response.status !== 400 && response.status !== 413) {
			gatewayDownUntil = Date.now() + GATEWAY_RETRY_AFTER_MS;
		}
		logger.warn(
			`[svg2png] Gateway render failed (HTTP ${response.status}), rendering locally`
		);
	} catch (error) {
		gatewayDownUntil = Date.now() + GATEWAY_RETRY_AFTER_MS;
		logger.warn(
			`[svg2png] Gateway unreachable (${String(error)}), rendering locally for ${GATEWAY_RETRY_AFTER_MS / 1000}s`
		);
	}
	return null;
}

export default async function svg2png(
	svg: string,
	options: Svg2PngOptions = {}
): Promise<Buffer> {
	return (
		(await renderOnGateway(svg, options)) ??
		withRenderSlot(() => render(svg, options))
	);
}

async function render(svg: string, options: Svg2PngOptions): Promise<Buffer> {
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
