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
    PermissionsBitField,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {        


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let type = interaction.options.getString('action');

        if (type === "off") {
            await client.func.ihorizon_logs(interaction, {
                title: lang.disableticket_logs_embed_title_disable,
                description: lang.disableticket_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.user.id)
            });

            await client.db.set(`${interaction.guildId}.GUILD.TICKET.disable`, true);
            await interaction.editReply({ content: lang.disableticket_command_work_disable });
            return;
        } else if (type === "on") {
            await client.func.ihorizon_logs(interaction, {
                title: lang.disableticket_logs_embed_title_enable,
                description: lang.disableticket_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.user.id)
            });

            await client.db.set(`${interaction.guildId}.GUILD.TICKET.disable`, false);
            await interaction.editReply({ content: lang.disableticket_command_work_enable });
            return;
        };
    },
};