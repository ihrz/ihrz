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

import pkg from "../package.json" with { type: "json" };

// Empty when git is missing or this is not a checkout (standalone binary).
export function shell(str: string): string {
	try {
		return Bun.spawnSync({
			cmd: str.split(" ") || []
		})
			.stdout.toString()
			.trim();
	} catch {
		return "";
	}
}

// Baked in by tools/Standalone_Build.ts: a binary has no git checkout.
const build = typeof IHORIZON_BUILD === "undefined" ? null : IHORIZON_BUILD;

export function parseGitRemote(remote: string): string {
	return remote
		.trim()
		.replace(/^git@([^:]+):/, "https://$1/")
		.replace(/\.git$/, "");
}

export const env: string = build?.branch ?? shell("git branch --show-current");

export const version = pkg.version;
export const djs = pkg.dependencies["discord.js"];
export const git_remote = parseGitRemote(
	build?.remote ?? shell("git remote get-url origin")
);
export const short_commit_hex =
	build?.shortCommit ?? shell("git rev-parse --short HEAD");
export const long_commit_hex = build?.longCommit ?? shell("git rev-parse HEAD");
export const git_commit_url = `${git_remote}/commit/${long_commit_hex}`;

export const ClientVersion = `${version} (${env}:${short_commit_hex}) discord.js@${djs}`;
