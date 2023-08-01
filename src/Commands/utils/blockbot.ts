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
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';
import logger from '../../core/logger';
import ms from 'ms';
import config from '../../files/config';

import * as db from '../../core/functions/DatabaseModel';

export const command: Command = {
    name: 'blockbot',
    description: 'Block the ability to add bots to the server',
    category: 'utils',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: 'Power On',
                    value: "on"
                },
                {
                    name: "Power Off",
                    value: "off"
                }
            ],
        }
    ],
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let action = interaction.options.getString('action');

        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: data.blockbot_not_owner });
        };

        if (action === 'on') {

            // ------------------------
            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.blockbot_logs_enable_title)
                    .setDescription(data.blockbot_logs_enable_description
                        .replace(/\${interaction\.user}/g, interaction.user)
                    );

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };
            // ------------------------

            await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.BLOCK_BOT`, value: true });

            return interaction.reply({ content: data.blockbot_command_work_on_enable });
        } else if (action === 'off') {

            // ------------------------
            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.blockbot_logs_disable_commmand_work)
                    .setDescription(data.blockbot_logs_disable_description
                        .replace(/\${interaction\.user}/g, interaction.user)
                    );

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };
            // ------------------------

            await db.DataBaseModel({ id: db.Delete, key: `${interaction.guild.id}.GUILD.BLOCK_BOT` });

            return interaction.reply({ content: data.blockbot_command_work_on_disable });
        };
    },
};