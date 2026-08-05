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

const pkg = await Bun.file(process.cwd() + "/package.json").json();

export function shell(str: string): string {
	return Bun.spawnSync({
		cmd: str.split(" ") || []
	})
		.stdout.toString()
		.trim();
}

export function parseGitRemote(remote: string): string {
	return remote
		.trim()
		.replace(/^git@([^:]+):/, "https://$1/")
		.replace(/\.git$/, "");
}

export const env: string = shell("git branch --show-current");

export const version = pkg.version;
export const djs = pkg.dependencies["discord.js"];
export const git_remote = parseGitRemote(shell("git remote get-url origin"));
export const short_commit_hex = shell("git rev-parse --short HEAD");
export const long_commit_hex = shell("git rev-parse HEAD");
export const git_commit_url = `${git_remote}/commit/${long_commit_hex}`;

export const ClientVersion = `${version} (${env}:${short_commit_hex}) discord.js@${djs}`;
