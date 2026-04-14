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
import logger from "../src/core/logger.ts";
import { EmojisManager } from "../src/core/modules/emojisManager.ts";
import config from "../src/files/config.ts";

logger.log("This automatic script will create all emojis for the discord bot.")

global.client = new Client({
	intents: []
});
client.config = config;

client.on('clientReady', async () => {
	logger.log(`The discord bot: ${client.user?.tag} is ready...`);

	const emojisManager = new EmojisManager();

	await emojisManager.startSync();

	client.destroy();
});


client.login(client.config.discord.token)
	.catch(() => console.error);