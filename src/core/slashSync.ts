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

import { ApplicationCommand, Client, Collection } from "discord.js";
import logger from "./logger";
import couleurmdr from 'colors';
import config from "../files/config";

import { Command } from '../../types/command';

export = async (client: any, commands: Collection<string, Command>) => {

    let log = (message: any) => config.core.debug && message.number > 0 && logger.log(message?.string.replace('{number}', message.number));

    let ready = client.readyAt ? Promise.resolve() : new Promise(resolve => client.once('ready', resolve));
    await ready;

    let currentCommands = await client.application.commands.fetch();

    log({ string: couleurmdr.white(`${config.console.emojis.LOAD} >> Synchronizing commands...`), number: 1 });
    log({ string: couleurmdr.white(`${config.console.emojis.LOAD} >> Currently {number} Slash commands are registered.`), number: currentCommands.size });

    let deletedCommands = currentCommands.filter((command: ApplicationCommand) => !commands.has(command.name));

    for (let deletedCommand of deletedCommands.values()) {
        await deletedCommand.delete();
    };

    log({ string: couleurmdr.white(`${config.console.emojis.LOAD} >> Deleted {number} Slash commands!`), number: deletedCommands.size });

    let newCommands = commands.filter((command: Command) => !currentCommands.some((c: ApplicationCommand) => c.name === command.name));
    for (let newCommand of newCommands.values()) {
        await client.application.commands.create(newCommand as unknown as ApplicationCommand);
    };

    log({ string: couleurmdr.white(`${config.console.emojis.LOAD} >> Created {number} Slash commands!`), number: newCommands.size });

    let updatedCommands = commands.filter((command: Command) => currentCommands.some((c: ApplicationCommand) => c.name === command.name));
    let updatedCommandCount = 0;
    for (let updatedCommand of updatedCommands.values()) {
        let newCommand = updatedCommand as unknown as ApplicationCommand;
        let previousCommand = currentCommands.find((c: ApplicationCommand) => c.name === updatedCommand.name);
        let modified = false;

        if (previousCommand && previousCommand.description !== newCommand.description) {
            modified = true;
        };

        if (!ApplicationCommand.optionsEqual(previousCommand?.options ?? [], newCommand.options ?? [])) {
            modified = true;
        };

        if (modified) {
            await previousCommand?.edit(newCommand);
            updatedCommandCount++;
        };
    };

    log({ string: couleurmdr.white(`${config.console.emojis.LOAD} >> Updated {number} Slash commands!`), number: updatedCommandCount });
    log({ string: couleurmdr.white(`${config.console.emojis.OK} >> Slash commands are now synchronized with Discord!`), number: 1 });
};