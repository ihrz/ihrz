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

import { Collection, REST, Routes, ApplicationCommandType, Client, ApplicationCommand, User } from "discord.js";
import { Command } from '../../types/command';
import config from "../files/config";
import couleurmdr from 'colors';
import logger from "./logger";

export = async (client: Client) => {

    let rest = new REST().setToken(client.token as string);

    try {
        logger.log(couleurmdr.white(`${config.console.emojis.LOAD} >> Currently ${client.commands?.size || 0} of application (/) commands awaiting for refreshing.`));
        logger.log(couleurmdr.white(`${config.console.emojis.LOAD} >> Currently ${client.applicationsCommands?.size || 0} of application ([@]) commands awaiting for refreshing.`));

        // let data_1 = await rest.put(
        //     Routes.applicationCommands(client.user?.id as string),
        //     {
        //         body: client.commands?.map((command) => ({
        //             name: command.name,
        //             description: command.description,
        //             options: command.options,
        //             type: command.type
        //         }))
        //     },
        // );

        let data_2 = await rest.put(
            Routes.applicationCommands(client.user?.id as string),
            {
                body: client.applicationsCommands?.map((command) => ({
                    name: command.name,
                    type: command.type
                }))
            },
        );

        // logger.log(couleurmdr.white(`${config.console.emojis.OK} >> Currently ${(data_1 as unknown as ApplicationCommand<{}>[]).length} of application (/) commands are now synchronized.`));
        logger.log(couleurmdr.white(`${config.console.emojis.OK} >> Currently ${(data_2 as unknown as ApplicationCommand<{}>[]).length} of application (/) commands are now synchronized.`));

    } catch (error: any) {
        // logger.err(error)
        console.error(error)
    };

};