/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    BaseGuildTextChannel,
    Message,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'pwss';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

export const command: Command = {

    aliases: ['ranks-disable', 'disable-ranks'],

    name: "ranksdisable",

    description: "Disable the message when user earn new xp level message!",
    description_localizations: {
        "fr": "Désactivez le message lorsque l'utilisateur gagne un nouveau message de niveau XP"
    },

    thinking: false,
    category: 'ranks',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, execTimestamp: number, args: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.author || !interaction.guild || !interaction.channel) return;

        const data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.member.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.disablexp_not_admin, allowedMentions: { repliedUser: false } });
            return;
        };

        let types = args[0];

        if (types == "off") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.disablexp_logs_embed_title_disable)
                    .setDescription(data.disablexp_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.author.id))

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                };
            } catch (e: any) {
                logger.err(e)
            };

            await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.disable`, false);

            await interaction.reply({ content: data.disablexp_command_work_disable, allowedMentions: { repliedUser: false } });
            return;
        } else if (types == "disable") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.disablexp_logs_embed_title_disable)
                    .setDescription(data.disablexp_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.author.id))

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                };
            } catch (e: any) {
                logger.err(e)
            };

            await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.disable`, 'disable');

            await interaction.reply({ content: data.disablexp_command_work_disable_entierly, allowedMentions: { repliedUser: false } });
            return;
        } else if (types == "on") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.disablexp_logs_embed_title_enable)
                    .setDescription(data.disablexp_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.author.id))

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                if (logchannel) {
                    (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                };
            } catch (e: any) {
                logger.err(e)
            };

            await client.db.set(`${interaction.guildId}.GUILD.XP_LEVELING.disable`, true);

            await interaction.reply({ content: data.disablexp_command_work_enable, allowedMentions: { repliedUser: false } });
            return;
        };
    },
};