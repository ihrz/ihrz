/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Client } from 'discord.js';

import { fileURLToPath } from 'url';
import path from 'path';
import { readdir } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (client: Client) => {

	const loadCommands = async (commandType: string) => {
		const commandPath = path.join(__dirname, '..', '..', 'Interaction', commandType + 'ApplicationCommands');

		const files = await readdir(commandPath);

		for (const file of files.filter((file: string) => file.endsWith('.ts'))) {
			const { command } = await import(`${commandPath}/${file}`);

			client.applicationsCommands.set(command.name, {
				type: command.type,
				run: command.run,
				name: command.name,
				thinking: command.thinking,
				permission: command.permission
			});
		}
	};

	/**  Load MessageApplicationCommands */
	await loadCommands('Message');

	/**  Load UserApplicationCommands */
	await loadCommands('User');
};
