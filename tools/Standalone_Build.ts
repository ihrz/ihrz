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

// Builds the standalone binary: `bun run build:binary [--target <target>]
// [--outfile <path>]`, e.g. `--target bun-linux-arm64`. One executable runs
// the ShardingManager and every shard, with the code, the language files,
// the SVG templates and src/assets embedded. Next to it, it only needs a
// `.env` (see .env.example) and writes its data in the working directory
// (src/files, .ihorizon/resources, v.txt).
//
// Native modules (resvg) are embedded for the platform the build runs on:
// build on the target platform, or only SVG rendering through the
// HorizonGateway will work elsewhere.

import { parseArgs } from "node:util";

import logger from "../src/core/logger.ts";
import { writeExports } from "../src/core/modules/exportsManifest.ts";
import { parseGitRemote, shell } from "../src/version.ts";
import pkg from "../package.json" with { type: "json" };

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		target: { type: "string" },
		outfile: { type: "string" }
	}
});

// No target: the platform the build runs on.
const target = values.target as Bun.Build.CompileTarget | undefined;
const outfile =
	values.outfile ??
	`dist/ihorizon${target ? `-${target.replace(/^bun-/, "")}` : ""}${target?.includes("windows") ? ".exe" : ""}`;

// The binary embeds src/exports: they must match the tree.
const written = await writeExports();
if (written.length) logger.log(`Rewrote exports: ${written.join(", ")}`);

const shortCommit = shell("git rev-parse --short HEAD");
const build = {
	id: `${pkg.version}-${shortCommit || "nogit"}-${Date.now().toString(36)}`,
	branch: shell("git branch --show-current"),
	shortCommit,
	longCommit: shell("git rev-parse HEAD"),
	remote: parseGitRemote(shell("git remote get-url origin"))
};

const startedAt = performance.now();
const result = await Bun.build({
	entrypoints: ["src/standalone.ts"],
	compile: target ? { target, outfile } : { outfile },
	// Optional dependencies loaded inside a try, never installed.
	external: ["sharp", "ffmpeg-static"],
	define: { IHORIZON_BUILD: JSON.stringify(build) },
	sourcemap: "linked"
});

if (!result.success) {
	for (const message of result.logs) logger.err(message);
	process.exit(1);
}

// The sourcemap is embedded in the binary (stack traces point at src/*.ts):
// the copy written next to it is not needed.
await Bun.file(`${outfile}.map`)
	.delete()
	.catch(() => {});

logger.log(
	`Built ${outfile} (${target ?? "host platform"}, ${build.id}) in ${Math.round(performance.now() - startedAt)} ms`
);
