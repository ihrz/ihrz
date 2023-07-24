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
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';

export const command: Command = {
    name: 'addmoney',
    description: 'Add money to a user!',
    options: [
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'The amount of money you want to add',
            required: true
        },
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The member who you want to add money',
            required: true
        }
    ],
    category: 'economy',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({content: data.addmoney_not_admin})
        }
        var amount = interaction.options.get("amount");
        let user = interaction.options.get("member");

        interaction.reply({
            content: data.addmoney_command_work
                .replace("${user.user.id}", user.user.id)
                .replace("${amount.value}", amount.value)
        }
        );

        await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, value: amount.value });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.addmoney_logs_embed_title)
                .setDescription(data.addmoney_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace(/\${amount\.value}/g, amount.value)
                    .replace(/\${user\.user\.id}/g, user.user.id)
                )

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { return };
    },
};