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
    Message,
    PermissionsBitField,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var types = interaction.options.getString("action");
        } else {

            var types = client.func.method.string(args!, 0);
        };

        if (types == "off") {
            await client.func.ihorizon_logs(interaction, {
                title: lang.disablexp_logs_embed_title_disable,
                description: lang.disablexp_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
            });

            await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.disable`, false);

            await client.func.method.interactionSend(interaction, { content: lang.disablexp_command_work_disable });
            return;
        } else if (types == "disable") {

            await client.func.ihorizon_logs(interaction, {
                title: lang.disablexp_logs_embed_title_disable,
                description: lang.disablexp_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
            });

            await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.disable`, 'disable');

            await client.func.method.interactionSend(interaction, { content: lang.disablexp_command_work_disable_entierly });
            return;
        } else if (types == "on") {
            await client.func.ihorizon_logs(interaction, {
                title: lang.disablexp_logs_embed_title_enable,
                description: lang.disablexp_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
            });

            await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.disable`, true);

            await client.func.method.interactionSend(interaction, { content: lang.disablexp_command_work_enable });
            return;
        };
    },
};