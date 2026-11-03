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

import { Client } from "discord.js";

import path from "path";
import { readdir } from "node:fs/promises";

// SVG templates rendered by `client.func.svg2png` (see svgKit.fill).
export default async (client: Client) => {
	const directory = path.join(process.cwd(), "src", "assets", "svg");
	const files = (await readdir(directory)).filter((file) =>
		file.endsWith(".svg")
	);

	await Promise.all(
		files.map(async (file) => {
			client.svgfiles[file.slice(0, -".svg".length)] = await Bun.file(
				path.join(directory, file)
			).text();
		})
	);
};
