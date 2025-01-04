/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/
import logger from '../../core/logger.js';
import fs from 'node:fs';
export const event = {
    name: "interactionCreate",
    run: async (client, interaction) => {
        if (!interaction.isCommand()
            || !interaction.guild?.channels
            || interaction.user.bot)
            return;
        let optionsList = interaction.options["_hoistedOptions"].map(element => `${element.name}:"${element.value}"`);
        let subCmd = '';
        if (interaction.options["_subcommand"]) {
            if (interaction.options.getSubcommandGroup())
                subCmd += interaction.options.getSubcommandGroup() + " ";
            subCmd += interaction.options.getSubcommand();
        }
        ;
        let logMessage = `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}] "${interaction.guild?.name}" #${interaction.channel ? interaction.channel.name : 'Unknown Channel'}:\n` +
            `${interaction.user.username}:\n` +
            `/${interaction.commandName} ${subCmd} ${optionsList?.join(' ')}\n\n`;
        fs.appendFile(`${process.cwd()}/src/files/slash.log`, logMessage, (err) => {
            if (err) {
                logger.warn('Error writing to slash.log');
            }
            ;
        });
    },
};
