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

import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(process.cwd() + "/package.json", "utf-8"));

export const env: string = Bun.spawnSync({
	cmd: ["git", "branch", "--show-current"]
})
	.stdout.toString()
	.trim();

export const version = pkg.version;
export const djs = pkg.dependencies["discord.js"];
export const git = Bun.spawnSync({
	cmd: ["git", "rev-parse", "--short", "HEAD"]
})
	.stdout.toString()
	.trim();

export const ClientVersion = `${version} (${env}:${git}) discord.js@${djs}`;
