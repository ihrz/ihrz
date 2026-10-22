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
 * Decodes the handful of HTML entities streaming platforms still embed
 * inside JSON-LD blocks and embed pages.
 */
export function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, "/");
}

/**
 * Converts an ISO 8601 duration ("PT3M17S") into seconds.
 */
export function isoDurationToSeconds(iso: string): number {
	const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso);

	if (!match) {
		return 0;
	}

	const hours = Number(match[1] ?? 0);
	const minutes = Number(match[2] ?? 0);
	const seconds = Number(match[3] ?? 0);

	return hours * 3600 + minutes * 60 + Math.round(seconds);
}

/**
 * Converts a clock duration ("3:17" or "1:03:17") into seconds.
 */
export function clockToSeconds(text?: string | null): number {
	if (!text) {
		return 0;
	}

	const parts = text.trim().split(":").map(Number);

	if (parts.length === 2) {
		return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
	}

	if (parts.length === 3) {
		return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
	}

	return 0;
}

export interface ScriptTag {
	attributes: Record<string, string>;
	content: string;
}

/**
 * Extracts every `<script>` element of an HTML document along with its
 * attributes and inner content. This is the dependency-free replacement
 * for the himalaya HTML parser the upstream spotify-metadata package used.
 */
export function extractScriptTags(html: string): ScriptTag[] {
	const tags: ScriptTag[] = [];

	const tagRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
	let match;

	while ((match = tagRegex.exec(html)) !== null) {
		const attributes: Record<string, string> = {};

		const attributeRegex = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*)"/g;
		let attributeMatch;

		while ((attributeMatch = attributeRegex.exec(match[1])) !== null) {
			attributes[attributeMatch[1]] = attributeMatch[2];
		}

		tags.push({
			attributes,
			content: match[2]
		});
	}

	return tags;
}

/**
 * Removes every HTML tag from a text snippet (used to flatten attributes
 * values such as `<span>` content of TIDAL embed pages).
 */
export function stripHtmlTags(text: string): string {
	return text.replace(/<[^>]+>/g, "");
}
