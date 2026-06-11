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

import { REST, Routes } from "discord.js";
import logger from "../src/core/logger.ts";
import { EmojisManager } from "../src/core/modules/emojisManager.ts";
import config from "../src/files/config.ts";

logger.log("This automatic script will create all emojis for the discord bot.");

async function main() {
	try {
		const token = process.env.BOT_TOKEN || config.discord.token;
		const rest = new REST({ version: "10" }).setToken(token);

		const application = (await rest.get(
			Routes.oauth2CurrentApplication()
		)) as {
			id: string;
			name: string;
		};

		logger.log(
			`The discord application: ${application.name} is ready for emoji synchronization.`
		);

		const emojisManager = new EmojisManager({
			rest,
			applicationId: application.id
		});

		await emojisManager.startSync();
	} catch (error) {
		logger.err(error);
		process.exitCode = 1;
	}
}

await main();
