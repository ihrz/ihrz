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

import {
    Client,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms from 'ms';

export let command: Command = {
    name: 'report',
    description: 'Report a bug, error, spell error to the iHorizon\'s dev!',
    options: [
        {
            name: 'message-to-dev',
            type: ApplicationCommandOptionType.String,
            description: 'What is the problem? Please make a good sentences',
            required: true
        }
    ],
    category: 'newfeatures',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        var sentences = interaction.options.getString("message-to-dev")
        let timeout = 18000000
        let cooldown = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.REPORT.cooldown` });

        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            let time = ms(timeout - (Date.now() - cooldown));

            return interaction.editReply({
                content: data.report_cooldown_command
                    .replace("${time}", time)
            });
        } else {
            if (interaction.guild.ownerId != interaction.user.id) {
                return interaction.editReply({ content: data.report_owner_need });
            };

            if (sentences.split(' ').length < 8) {
                return interaction.editReply({ content: data.report_specify });
            };

            interaction.editReply({ content: data.report_command_work });
            var embed = new EmbedBuilder()
                .setColor("#ff0000")
                .setDescription(`**${interaction.user.username}** (<@${interaction.user.id}>) reported:\n~~--------------------------------~~\n${sentences}\n~~--------------------------------~~\nServer ID: **${interaction.guild.id}**`)

            await interaction.client.channels.cache.get(config.core.reportChannelID).send({ embeds: [embed] });

            return await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.REPORT.cooldown`, value: Date.now() });
        }
    },
}