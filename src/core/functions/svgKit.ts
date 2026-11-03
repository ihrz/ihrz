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
 * Building blocks for SVG templates rendered by `client.func.svg2png`.
 *
 * Templates (`src/assets/svg/*.svg`, `{snake_case}` placeholders) are filled
 * with `fill`: plain values are always XML-escaped, generated markup must be
 * wrapped explicitly (`text`, `paragraph`, `image` and `raw` return one).
 * User input can therefore never inject markup, and resvg never fetches
 * anything: images are embedded as data URIs.
 */

import {
	FontFamily,
	FontWeight,
	Measurer,
	measurer,
	scriptFamilyOf
} from "../svg/fontMetrics.js";
import { emojiImage, Grapheme, graphemes } from "../svg/emoji.js";
import { arabicPresentationForms } from "../svg/arabic.js";
import { fetchPublicImage } from "../svg/remoteImage.js";

export type { FontFamily, FontWeight };

/** Markup inserted as-is by `fill` (never build one from user input). */
export interface SvgMarkup {
	readonly markup: string;
}

export interface TextStyle {
	size: number;
	family?: FontFamily;
	weight?: FontWeight;
	letterSpacing?: number;
}

export interface TextOptions extends TextStyle {
	x: number;
	y: number;
	fill?: string;
	anchor?: "start" | "middle" | "end";
	/** Truncated with an ellipsis beyond this width. */
	maxWidth?: number;
	opacity?: number;
	/** Extra raw attributes for the text elements (e.g. a filter). */
	attributes?: string;
}

export interface ParagraphOptions extends TextOptions {
	maxWidth: number;
	lineHeight: number;
	maxLines?: number;
}

export interface ImageOptions {
	x: number;
	y: number;
	width: number;
	height: number;
	/** Corner radius, or "circle" for a round crop. */
	radius?: number | "circle";
	opacity?: number;
}

const ELLIPSIS = "…";
// Emoji are drawn as square images of the font size, sitting on the baseline.
const EMOJI_ASCENT = 0.86;
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

let idCounter = 0;

/** Unique id for defs (clip paths, gradients) inside one document. */
export function uid(prefix = "id"): string {
	idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER;
	return `${prefix}${idCounter.toString(36)}`;
}

export function escape(value: string): string {
	return value
		.replace(INVALID_XML, "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export function raw(markup: string): SvgMarkup {
	return { markup };
}

/** Replaces `{key}` placeholders; strings and numbers are escaped. */
export function fill(
	template: string,
	values: Record<string, string | number | SvgMarkup>
): string {
	return template.replace(/\{([a-z0-9_]+)\}/g, (match, key: string) => {
		if (!(key in values)) return match;
		const value = values[key];
		return typeof value === "object" ? value.markup : escape(String(value));
	});
}

/* ------------------------------------------------------------------ */
/* Text                                                               */
/* ------------------------------------------------------------------ */

type RunKind = "emoji" | FontFamily;

interface Run {
	kind: RunKind;
	value: string;
}

// Spaces, digits and punctuation stay in the current run, so an Arabic or
// Japanese phrase keeps its spaces and numbers inside one shaped run.
const NEUTRAL = /^[\s\p{P}\p{N}\p{S}]+$/u;

/** Splits text into emoji runs, script-font runs and base-family runs. */
function runsOf(parts: Grapheme[], base: FontFamily): Run[] {
	const runs: Run[] = [];
	for (const part of parts) {
		const last = runs[runs.length - 1];
		let kind: RunKind;
		if (part.emoji) kind = "emoji";
		else
			kind =
				scriptFamilyOf(part.value) ??
				(NEUTRAL.test(part.value) && last && last.kind !== "emoji"
					? last.kind
					: base);

		if (last && last.kind === kind && kind !== "emoji")
			last.value += part.value;
		else runs.push({ kind, value: part.value });
	}
	return runs;
}

/**
 * Synchronous width function for the given text sample: loads the base
 * family and only the script fonts the sample actually needs.
 */
async function widthOf(style: TextStyle, sample: Grapheme[]) {
	const base = style.family ?? "Noto Sans";
	const families = new Set<FontFamily>([base]);
	for (const run of runsOf(sample, base)) {
		if (run.kind !== "emoji") families.add(run.kind);
	}
	const measurers = new Map<FontFamily, Measurer>();
	await Promise.all(
		[...families].map(async (family) =>
			measurers.set(
				family,
				await measurer(
					family,
					style.weight ?? 400,
					style.size,
					style.letterSpacing ?? 0
				)
			)
		)
	);
	const emojiWidth = style.size + (style.letterSpacing ?? 0);
	const runWidth = (run: Run) => {
		if (run.kind === "emoji") return emojiWidth;
		const metrics = measurers.get(run.kind) ?? measurers.get(base)!;
		// Arabic is measured with its contextual forms (see svg/arabic.ts).
		return metrics.width(
			run.kind === "Noto Sans Arabic"
				? arabicPresentationForms(run.value)
				: run.value
		);
	};

	return Object.assign(
		(parts: Grapheme[]) =>
			runsOf(parts, base).reduce((sum, run) => sum + runWidth(run), 0),
		{ runWidth }
	);
}

export async function measure(text: string, style: TextStyle): Promise<number> {
	const parts = graphemes(text);
	return (await widthOf(style, parts))(parts);
}

function truncate(
	parts: Grapheme[],
	maxWidth: number,
	width: (parts: Grapheme[]) => number
): Grapheme[] {
	if (width(parts) <= maxWidth) return parts;
	const ellipsis: Grapheme = { value: ELLIPSIS, emoji: false };
	let low = 0;
	let high = parts.length;
	while (low < high) {
		const mid = (low + high + 1) >> 1;
		if (width([...parts.slice(0, mid), ellipsis]) <= maxWidth) low = mid;
		else high = mid - 1;
	}
	const kept = parts.slice(0, low);
	while (kept.length && kept[kept.length - 1].value.trim() === "") kept.pop();
	return [...kept, ellipsis];
}

export async function ellipsize(
	text: string,
	maxWidth: number,
	style: TextStyle
): Promise<string> {
	const parts = graphemes(text);
	const width = await widthOf(style, parts);
	return truncate(parts, maxWidth, width)
		.map((part) => part.value)
		.join("");
}

/** Word wrap (explicit `\n` honoured); the last line gets an ellipsis if cut. */
export async function wrap(
	text: string,
	maxWidth: number,
	style: TextStyle,
	maxLines = Infinity
): Promise<string[]> {
	const width = await widthOf(style, graphemes(text));
	const lines: Grapheme[][] = [];

	for (const paragraph of text.split(/\r?\n/)) {
		let line: Grapheme[] = [];
		const hasContent = () => line.some((part) => part.value.trim() !== "");

		for (const word of paragraph.split(/(\s+)/)) {
			if (!word) continue;
			const parts = graphemes(word);

			// Spaces only between words: never at the start of a line.
			if (!word.trim()) {
				if (hasContent()) line.push(...parts);
				continue;
			}
			if (width([...line, ...parts]) <= maxWidth) {
				line.push(...parts);
				continue;
			}
			if (hasContent()) {
				lines.push(line);
				line = [];
			}
			if (width(parts) <= maxWidth) {
				line = parts;
				continue;
			}
			// A word wider than a whole line is split between graphemes.
			for (const part of parts) {
				if (line.length && width([...line, part]) > maxWidth) {
					lines.push(line);
					line = [];
				}
				line.push(part);
			}
		}
		lines.push(line);
	}

	const kept = lines.slice(0, maxLines);
	if (lines.length > kept.length && kept.length > 0) {
		const last = kept[kept.length - 1];
		kept[kept.length - 1] = truncate(
			[...last, { value: ELLIPSIS, emoji: false }],
			maxWidth,
			width
		);
	}
	return kept.map((line) =>
		line
			.map((part) => part.value)
			.join("")
			.trim()
	);
}

function textAttributes(options: TextOptions, family: FontFamily): string {
	const attributes = [
		`font-family="${escape(family)}"`,
		`font-size="${options.size}"`,
		`font-weight="${options.weight ?? 400}"`,
		`fill="${escape(options.fill ?? "#ffffff")}"`,
		'xml:space="preserve"'
	];
	if (options.letterSpacing)
		attributes.push(`letter-spacing="${options.letterSpacing}"`);
	if (options.opacity !== undefined)
		attributes.push(`opacity="${options.opacity}"`);
	if (options.attributes) attributes.push(options.attributes);
	return attributes.join(" ");
}

/**
 * One line of text. A single run (one font, no emoji) is aligned by resvg
 * itself (exact). Otherwise every run (base font, script font, Twemoji
 * image) is its own element, positioned from the font metrics: resvg 2.6
 * cannot mix scripts inside one text element reliably.
 */
export async function text(
	content: string,
	options: TextOptions
): Promise<SvgMarkup> {
	let parts = graphemes(content);
	const width = await widthOf(options, parts);
	if (options.maxWidth !== undefined) {
		parts = truncate(parts, options.maxWidth, width);
	}

	const base = options.family ?? "Noto Sans";
	const runs = runsOf(parts, base);
	const anchor = options.anchor ?? "start";

	if (runs.length <= 1 && runs[0]?.kind !== "emoji") {
		const family = (runs[0]?.kind as FontFamily | undefined) ?? base;
		return raw(
			`<text x="${options.x}" y="${options.y}" text-anchor="${anchor}" ${textAttributes(options, family)}>${escape(runs[0]?.value ?? "")}</text>`
		);
	}

	const total = width(parts);
	let x =
		anchor === "middle"
			? options.x - total / 2
			: anchor === "end"
				? options.x - total
				: options.x;

	const images = await Promise.all(
		runs.map((run) => (run.kind === "emoji" ? emojiImage(run.value) : null))
	);

	const elements: string[] = [];
	runs.forEach((run, index) => {
		if (run.kind === "emoji") {
			const href = images[index];
			if (href) {
				const opacity =
					options.opacity !== undefined
						? ` opacity="${options.opacity}"`
						: "";
				elements.push(
					`<image href="${href}" x="${x.toFixed(2)}" y="${(options.y - options.size * EMOJI_ASCENT).toFixed(2)}" width="${options.size}" height="${options.size}"${opacity}/>`
				);
			}
		} else {
			elements.push(
				`<text x="${x.toFixed(2)}" y="${options.y}" ${textAttributes(options, run.kind)}>${escape(run.value)}</text>`
			);
		}
		x += width.runWidth(run);
	});

	return raw(`<g>${elements.join("")}</g>`);
}

/** Wrapped multi-line text, lines `lineHeight` apart from `y`. */
export async function paragraph(
	content: string,
	options: ParagraphOptions
): Promise<SvgMarkup> {
	const lines = await wrap(
		content,
		options.maxWidth,
		options,
		options.maxLines
	);
	const rendered = await Promise.all(
		lines.map((line, index) =>
			text(line, {
				...options,
				maxWidth: undefined,
				y: options.y + index * options.lineHeight
			})
		)
	);
	return raw(rendered.map((line) => line.markup).join(""));
}

/* ------------------------------------------------------------------ */
/* Images                                                             */
/* ------------------------------------------------------------------ */

function mimeOf(buffer: Buffer): string {
	if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
	if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
	if (buffer.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
	if (buffer.subarray(8, 12).toString("ascii") === "WEBP")
		return "image/webp";
	return "image/png";
}

/**
 * Pixel size read from the file header (PNG, JPEG, GIF, WebP), to lay out
 * an image at its aspect ratio (CSS `height: auto`). Null if unknown.
 */
export function imageSize(
	buffer: Buffer
): { width: number; height: number } | null {
	if (buffer.length < 30) return null;
	switch (mimeOf(buffer)) {
		case "image/png":
			return {
				width: buffer.readUInt32BE(16),
				height: buffer.readUInt32BE(20)
			};
		case "image/gif":
			return {
				width: buffer.readUInt16LE(6),
				height: buffer.readUInt16LE(8)
			};
		case "image/webp": {
			const chunk = buffer.subarray(12, 16).toString("ascii");
			if (chunk === "VP8X")
				return {
					width: 1 + buffer.readUIntLE(24, 3),
					height: 1 + buffer.readUIntLE(27, 3)
				};
			if (chunk === "VP8L") {
				const bits = buffer.readUInt32LE(21);
				return {
					width: 1 + (bits & 0x3fff),
					height: 1 + ((bits >> 14) & 0x3fff)
				};
			}
			if (chunk === "VP8 ")
				return {
					width: buffer.readUInt16LE(26) & 0x3fff,
					height: buffer.readUInt16LE(28) & 0x3fff
				};
			return null;
		}
		case "image/jpeg": {
			// Walk the segments up to a start-of-frame marker.
			let offset = 2;
			while (offset + 9 < buffer.length) {
				if (buffer[offset] !== 0xff) return null;
				const marker = buffer[offset + 1];
				const length = buffer.readUInt16BE(offset + 2);
				const isFrame =
					marker >= 0xc0 &&
					marker <= 0xcf &&
					marker !== 0xc4 &&
					marker !== 0xc8 &&
					marker !== 0xcc;
				if (isFrame)
					return {
						width: buffer.readUInt16BE(offset + 7),
						height: buffer.readUInt16BE(offset + 5)
					};
				offset += 2 + length;
			}
			return null;
		}
		default:
			return null;
	}
}

export function dataUri(buffer: Buffer): string {
	return `data:${mimeOf(buffer)};base64,${buffer.toString("base64")}`;
}

/** Embedded image, cropped like CSS `object-fit: cover`. */
export function image(source: Buffer, options: ImageOptions): SvgMarkup {
	const { x, y, width, height } = options;
	const opacity =
		options.opacity !== undefined ? ` opacity="${options.opacity}"` : "";
	const element = (clip: string) =>
		`<image href="${dataUri(source)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"${clip}${opacity}/>`;

	if (options.radius === undefined) return raw(element(""));

	const id = uid("clip");
	const shape =
		options.radius === "circle"
			? `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${Math.min(width, height) / 2}"/>`
			: `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${options.radius}"/>`;
	return raw(
		`<clipPath id="${id}">${shape}</clipPath>${element(` clip-path="url(#${id})"`)}`
	);
}

/**
 * Downloads a user-supplied image URL safely (public hosts only, bounded
 * size and time). Use it for any URL that does not come from Discord.
 */
export function fetchImage(url: string): Promise<Buffer | null> {
	return fetchPublicImage(url);
}
