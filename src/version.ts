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

// The remote as a web link: `git@host:path.git` and `https://host/path.git`
// become `https://host/path`. Credentials in an HTTPS remote
// (`https://user:token@host/…`) are dropped: the link is public (BOT document).
export function parseGitRemote(remote: string): string {
	return remote
		.trim()
		.replace(/^git@([^:]+):/, "https://$1/")
		.replace(/^(https?:\/\/)[^@/]+@/, "$1")
		.replace(/\.git$/, "");
}

/** The running build for the BOT document: null where it is unknown (no git, no remote). */
export function buildInfo() {
	return {
		version,
		branch: env || null,
		commit: short_commit_hex || null,
		commitLong: long_commit_hex || null,
		commitUrl:
			git_remote.startsWith("https://") && long_commit_hex
				? git_commit_url
				: null
	};
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
export function commitUrl(remote: string, commit: string): string {
	// GitLab's own route (`/commit/` only redirects to it); `/commit/` elsewhere (GitHub…).
	return /^https:\/\/[^/]*gitlab\./.test(remote)
		? `${remote}/-/commit/${commit}`
		: `${remote}/commit/${commit}`;
}
export const git_commit_url = commitUrl(git_remote, long_commit_hex);

export const ClientVersion = `${version} (${env}:${short_commit_hex}) discord.js@${djs}`;
