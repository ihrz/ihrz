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
import ms from 'ms';

export const command: Command = {
    name: 'pay',
    description: 'Pay a user a certain amount!',
    options: [
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'The amount of money you want to donate to them',
            required: true
        },
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The member you want to donate the money',
            required: true
        }
    ],
    category: 'economy',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let user = interaction.options.getMember("member");
        let amount = interaction.options.getNumber("amount");

        let member = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${user.id}.ECONOMY.money` });
        if (amount.toString().includes('-')) {
            return interaction.reply({ content: data.pay_negative_number_error });
        }
        if (member < amount.value) {
            return interaction.reply({ content: data.pay_dont_have_enought_to_give })
        }

        await interaction.reply({
            content: data.pay_command_work
                .replace(/\${interaction\.user\.username}/g, interaction.user.username)
                .replace(/\${user\.user\.username}/g, user.user.username)
                .replace(/\${amount}/g, amount)
        })
        await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${user.id}.ECONOMY.money`, value: amount });
        await db.DataBaseModel({ id: db.Sub, key: `${interaction.guild.id}.USER.${interaction.member.id}.ECONOMY.money`, value: amount });
    },
};