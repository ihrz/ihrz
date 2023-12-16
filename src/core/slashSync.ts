/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { Collection, REST, Routes, ApplicationCommandType, Client, ApplicationCommand } from "discord.js";
import { Command } from '../../types/command';
import config from "../files/config";
import couleurmdr from 'colors';
import logger from "./logger";

export = async (client: Client, commands: Collection<string, Command>) => {

    let rest = new REST().setToken(config.discord.token);

    try {
        logger.log(couleurmdr.white(`${config.console.emojis.LOAD} >> Currently ${commands?.size || 0} of application (/) commands awaiting for refreshing.`));

        let data = await rest.put(
            Routes.applicationCommands(client.user?.id!),
            {
                body: client.commands?.map((command) => ({
                    name: command.name,
                    description: command.description,
                    options: command.options,
                    type: ApplicationCommandType.ChatInput
                }))
            },
        );

        logger.log(couleurmdr.white(`${config.console.emojis.OK} >> Currently ${data as unknown as ApplicationCommand<{}>[]} of application (/) commands are now synchronized.`));
    } catch (e: any) {
        logger.err(e);
    };
};