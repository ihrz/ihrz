/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { AnotherCommand } from '../../../types/anotherCommand';
import { Client, Collection } from 'discord.js';
import { readdirSync } from 'node:fs';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (client: Client) => {
    client.applicationsCommands = new Collection<string, AnotherCommand>();

    let loadCommands = async (commandType: string) => {
        let commandPath = path.join(__dirname, '..', '..', 'Interaction', commandType + 'ApplicationCommands');

        let files = readdirSync(commandPath);

        for (let file of files.filter((file: string) => file.endsWith('.js'))) {
            let { command } = await import(`${commandPath}/${file}`);

            client.applicationsCommands.set(command.name, {
                type: command.type,
                run: command.run,
                name: command.name,
                thinking: command.thinking,
            });
        }
    };

    /**  Load MessageApplicationCommands */
    await loadCommands('Message');

    /**  Load UserApplicationCommands */
    await loadCommands('User');
};
