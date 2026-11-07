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

// Runtime files shipped with the bot (src/assets: fonts, emojis, video
// templates...). From a checkout they are read in place. A standalone
// binary (`bun run build:binary`) embeds them (src/exports/assets.ts), and
// extracts them once per build into .ihorizon/resources/<build id>: resvg,
// ffmpeg and Kdenlive need real files, not the binary's virtual /$bunfs/.

import path from "node:path";
import { mkdir, readdir, rename, rm } from "node:fs/promises";

// Running from a `bun build --compile` binary (`B:/~BUN/` on Windows).
export const IS_STANDALONE = /\/\$bunfs\/|~BUN/.test(Bun.main);

const RESOURCES_ROOT = path.join(process.cwd(), ".ihorizon", "resources");
const COMPLETE_MARKER = ".complete";

const buildId =
	typeof IHORIZON_BUILD === "undefined" ? "source" : IHORIZON_BUILD.id;

const extractedDir = path.join(RESOURCES_ROOT, buildId);

// Absolute path of a shipped file, `segments` relative to src
// (e.g. resourcePath("assets", "fonts")).
export function resourcePath(...segments: string[]): string {
	return IS_STANDALONE
		? path.join(extractedDir, ...segments)
		: path.join(process.cwd(), "src", ...segments);
}

// Standalone only, idempotent: the manager extracts before spawning the
// shards, which then find the marker. Written to a temporary directory and
// renamed, so a crash never leaves a half-extracted build behind.
export async function extractResources(): Promise<void> {
	if (!IS_STANDALONE) return;
	if (await Bun.file(path.join(extractedDir, COMPLETE_MARKER)).exists()) {
		return;
	}

	const startedAt = performance.now();
	const { default: assets } = await import("../../exports/assets.ts");
	const temporary = `${extractedDir}.tmp-${process.pid}`;

	await rm(temporary, { recursive: true, force: true });

	for (const [file, embedded] of Object.entries(assets)) {
		await Bun.write(
			path.join(temporary, "assets", file),
			Bun.file(embedded)
		);
	}

	await Bun.write(path.join(temporary, COMPLETE_MARKER), buildId);

	try {
		await rename(temporary, extractedDir);
	} catch {
		// Another process finished first: its copy is identical.
		await rm(temporary, { recursive: true, force: true });
	}

	// Older builds are never used again.
	await mkdir(RESOURCES_ROOT, { recursive: true });
	for (const entry of await readdir(RESOURCES_ROOT)) {
		if (entry !== buildId && !entry.includes(".tmp-")) {
			await rm(path.join(RESOURCES_ROOT, entry), {
				recursive: true,
				force: true
			});
		}
	}

	logger.log(
		`Extracted ${Object.keys(assets).length} resources in ${Math.round(performance.now() - startedAt)} ms (${extractedDir})`
	);
}
