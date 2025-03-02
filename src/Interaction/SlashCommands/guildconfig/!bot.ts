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

import {
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {        


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let action = interaction.options.getString('action');

        if (interaction.user.id !== interaction.guild.ownerId) {
            await interaction.editReply({ content: lang.blockbot_not_owner });
            return;
        } else if (action === 'on') {
            await client.func.ihorizon_logs(interaction, {
                title: lang.blockbot_logs_enable_title,
                description: lang.blockbot_logs_enable_description
                    .replace(/\${interaction\.user}/g, interaction.user.toString())
            });

            await client.db.set(`${interaction.guildId}.GUILD.BLOCK_BOT`, true);

            await interaction.editReply({ content: lang.blockbot_command_work_on_enable });
            return;
        } else if (action === 'off') {
            await client.func.ihorizon_logs(interaction, {
                title: lang.blockbot_logs_disable_commmand_work,
                description: lang.blockbot_logs_disable_description
                    .replace(/\${interaction\.user}/g, interaction.user.toString())
            });

            await client.db.delete(`${interaction.guildId}.GUILD.BLOCK_BOT`);

            await interaction.editReply({ content: lang.blockbot_command_work_on_disable });
            return;
        };
    },
};