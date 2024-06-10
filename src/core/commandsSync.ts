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

import { REST, Routes, Client, ApplicationCommand } from "discord.js";
import logger from "./logger.js";

const synchronizeCommands = async (client: Client): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            let rest = new REST().setToken(process.env.BOT_TOKEN || client.config.discord.token);

            logger.log(`${client.config.console.emojis.LOAD} >> Currently ${client.commands?.size || 0} of application (/) commands awaiting for refreshing.`.white());
            logger.log(`${client.config.console.emojis.LOAD} >> Currently ${client.applicationsCommands?.size || 0} of application ([]) commands awaiting for refreshing.`.white());

            let appCmds = (client.applicationsCommands || []).map((command) => ({
                name: command.name,
                type: command.type,
            }));

            let slashCommands = client.commands?.map((command) => ({
                name: command.name,
                type: command.type,
                description: command.description,
                name_localizations: command.name_localizations,
                description_localizations: command.description_localizations,
                options: command.options,
            })) || [];

            let allCommands = [...slashCommands, ...appCmds];

            let data = await rest.put(
                Routes.applicationCommands(client.user?.id!),
                { body: allCommands }
            );

            logger.log(`${client.config.console.emojis.OK} >> Currently ${(data as unknown as ApplicationCommand<{}>[]).length} of application are now synchronized.`.white());
            resolve();
        } catch (error: any) {
            logger.err(error);
            reject(error);
        }
    });
};

export default synchronizeCommands;