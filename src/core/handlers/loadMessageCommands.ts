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
import logger from "../logger.js";
import { Command } from "../../../types/command.js";
import { ExportedFiles } from "../modules/exportsManifest.js";

import { stringifyOption } from "../functions/method.js";

export interface CommandModule {
	command: Command;
}

async function loadCommands(client: Client): Promise<void> {
	const { default: files } = await import("../../exports/messageCommands.ts");

	let i = 0;
	for (const module of Object.values(files as ExportedFiles)) {
		i++;

		const { command } = module as CommandModule;
		if (!command) continue;

		client.content.push({
			cmd: command.name,
			desc: command.description,
			desc_localized: command.description_localizations,
			category: command.category,
			messageCmd: 1,
			usage: stringifyOption(command.options || []),
			aliases: command.aliases
		});

		client.message_commands.set(command.name, command);
		if (!command?.aliases) continue;

		for (const aliases of command.aliases) {
			client.message_commands.set(aliases, command);
		}
	}

	logger.log(
		`${client.config.console.emojis.OK} >> Loaded ${i} Message commands.`
	);
}

export default loadCommands;
