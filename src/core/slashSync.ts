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

import { ApplicationCommand, Client } from "discord.js";
import logger from "./logger";
import couleurmdr from 'colors';
import config from "../files/config";

export = async (client: any, commands: any = {}) => {
    let guildId: any;

    let log = (message: any) => config.core.debug && message.number > 0 && logger.log(message?.string.replace('{number}', message.number));

    const ready = client.readyAt ? Promise.resolve() : new Promise(resolve => client.once('ready', resolve));
    await ready;
    const currentCommands = await client.application.commands.fetch(guildId ? { guildId } : undefined);

    log({ string: couleurmdr.white(`Synchronizing commands...`), number: 1 });
    log({ string: couleurmdr.white(`Currently {number} commands are registered to the bot.`), number: currentCommands.size });

    const deletedCommands = currentCommands.filter((command: any) => !commands.some((c: any) => c.name === command.name)).toJSON();

    for (let deletedCommand of deletedCommands) {
        await deletedCommand.delete();
    };

    log({ string: couleurmdr.white(`Deleted {number} commands!`), number: deletedCommands.length });

    const newCommands = commands.filter((command: ApplicationCommand) => !currentCommands.some((c: ApplicationCommand) => c.name === command.name));
    for (const newCommand of newCommands) {
        await client.application.commands.create(newCommand, guildId);
    };
    log({ string: couleurmdr.white(`Created {number} commands!`), number: newCommands.length });

    const updatedCommands = commands.filter((command: any) => currentCommands.some((c: any) => c.name === command.name));
    let updatedCommandCount = 0;
    for (let updatedCommand of updatedCommands) {
        const newCommand = updatedCommand;
        const previousCommand = currentCommands.find((c: any) => c.name === updatedCommand.name);
        let modified = false;
        if (!previousCommand.description === newCommand.description) { modified = true; };

        if (!ApplicationCommand.optionsEqual(previousCommand.options ?? [], newCommand.options ?? [])) modified = true;
        if (modified) {
            await previousCommand.edit(newCommand);
            updatedCommandCount++;
        }
    };

    log({ string: couleurmdr.white(`Updated {number} commands!`), number: updatedCommandCount });
    log({ string: couleurmdr.white(`Commands synchronized!`), number: 1 });

    return {
        currentCommandCount: currentCommands.size,
        newCommandCount: newCommands.length,
        deletedCommandCount: deletedCommands.length,
        updatedCommandCount
    };
};