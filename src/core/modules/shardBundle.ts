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

// Shard bundle: the ShardingManager compiles iHorizon's own code once per
// boot into dist/shard/bot.js (gitignored), then every shard starts from
// that single file instead of resolving and transpiling the ~700 modules of
// src one by one. Dependencies stay external, loaded from node_modules.
//
// Built from the generated src/exports (static imports only, see
// exportsManifest.ts), with a linked sourcemap: stack traces still point at
// the src/*.ts files. Any failure falls back to the plain source entry, and
// IHORIZON_NO_BUNDLE=1 skips the bundle entirely.

import path from "node:path";

export const SHARD_SOURCE_ENTRY = "./src/core/bot.ts";
export const SHARD_BUNDLE_DIR = path.join("dist", "shard");
export const SHARD_BUNDLE_ENTRY = "./" + path.join(SHARD_BUNDLE_DIR, "bot.js");

// Returns the script the shards must run.
export async function buildShardBundle(): Promise<string> {
	if (process.env.IHORIZON_NO_BUNDLE === "1") {
		logger.log("Shard bundle disabled (IHORIZON_NO_BUNDLE), running src.");
		return SHARD_SOURCE_ENTRY;
	}

	const startedAt = performance.now();

	try {
		const result = await Bun.build({
			entrypoints: [SHARD_SOURCE_ENTRY],
			outdir: SHARD_BUNDLE_DIR,
			target: "bun",
			packages: "external",
			sourcemap: "linked"
		});

		if (!result.success) {
			for (const message of result.logs) logger.err(message);
			throw new Error("Bun.build reported a failure");
		}

		const size = result.outputs.find(
			(output) => output.kind === "entry-point"
		)?.size;

		logger.log(
			`Shard bundle built in ${Math.round(performance.now() - startedAt)} ms (${((size ?? 0) / 1024 / 1024).toFixed(1)} MB)`
		);

		return SHARD_BUNDLE_ENTRY;
	} catch (error) {
		logger.err("Unable to build the shard bundle, running src:", error);
		return SHARD_SOURCE_ENTRY;
	}
}
