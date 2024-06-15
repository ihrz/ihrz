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

import { Client, CommandInteractionOptionResolver, GuildChannel, Interaction } from 'discord.js';

import logger from '../../core/logger.js';
import fs from 'node:fs';

import { BotEvent } from '../../../types/event';

export const event: BotEvent = {
    name: "interactionCreate",
    run: async (client: Client, interaction: Interaction) => {

        if (!interaction.isCommand()
            || !interaction.guild?.channels
            || interaction.user.bot) return;

        let optionsList: string[] = (interaction.options as CommandInteractionOptionResolver)["_hoistedOptions"].map(element => `${element.name}:"${element.value}"`)
        let subCmd: string = '';

        if ((interaction.options as CommandInteractionOptionResolver)["_subcommand"]) {
            if ((interaction.options as CommandInteractionOptionResolver).getSubcommandGroup()) subCmd += (interaction.options as CommandInteractionOptionResolver).getSubcommandGroup()! + " ";
            subCmd += (interaction.options as CommandInteractionOptionResolver).getSubcommand()
        };

        let logMessage = `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] "${interaction.guild?.name}" #${interaction.channel ? (interaction.channel as GuildChannel).name : 'Unknown Channel'}:\n` +
            `${interaction.user.username}:\n` +
            `/${interaction.commandName} ${subCmd} ${optionsList?.join(' ')}\n\n`;

        fs.appendFile(`${process.cwd()}/src/files/slash.log`, logMessage, (err) => {
            if (err) {
                logger.warn('Error writing to slash.log');
            };
        });
    },
};