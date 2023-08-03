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

export const command: Command = {
    name: "invites",
    description: "Subcommand for invites manager category!",
    options: [
        {
            name: "addinvites",
            description: "Add invites to a user!",
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to add invites',
                    required: true
                },
                {
                    name: 'amount',
                    type: ApplicationCommandOptionType.Number,
                    description: 'Number of invites you want to add',
                    required: true
                }
            ],
        },
        {
            name: 'leaderboard',
            description: 'Show the guild invites\'s leaderboard!',
            type: 1,
        },
        {
            name: "show",
            description: "Get the invites amount of a user!",
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to show them invites',
                    required: false
                }
            ],
        },
        {
            name: 'removeinvites',
            description: 'Remove invites from a user!',
            type: 1,
            options: [
                {
                    name: 'member',
                    type: ApplicationCommandOptionType.User,
                    description: 'the member you want to remove invites',
                    required: true
                },
                {
                    name: 'amount',
                    type: ApplicationCommandOptionType.Number,
                    description: 'Number of invites you want to substract',
                    required: true
                }
            ],
        }
    ],
    category: 'invitemanager',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'addinvites') {

            let user = interaction.options.getMember("member");
            let amount = interaction.options.getNumber("amount");

            let a = new EmbedBuilder().setColor("#FF0000").setDescription(data.addinvites_not_admin_embed_description)

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ embeds: [a] });
            }

            await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${user.id}.INVITES.invites`, value: amount });

            let finalEmbed = new EmbedBuilder()
                .setDescription(data.addinvites_confirmation_embed_description
                    .replace(/\${amount}/g, amount)
                    .replace(/\${user}/g, user)
                )
                .setColor(`#92A8D1`)
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) });
            await db.DataBaseModel({ id: db.Add, key: `${interaction.guild.id}.USER.${user.id}.INVITES.bonus`, value: amount });
            await interaction.reply({ embeds: [finalEmbed] });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.addinvites_logs_embed_title)
                    .setDescription(data.addinvites_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${amount}/g, amount)
                        .replace(/\${user\.id}/g, user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { return console.log(e) };

        } else if (command === 'leaderboard') {

            var text = data.leaderboard_default_text;
            let ownerList = await db.DataBaseModel({ id: db.All });
            let foundArray = ownerList.findIndex((d: { id: any; }) => d.id === interaction.guild.id);

            await interaction.reply({ content: ":clock:" });

            let char = ownerList[foundArray].value.USER;
            for (let i in char) {
                let a = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${i}.INVITES` });
                if (a && a.invites >= 1) {
                    text += data.leaderboard_text_inline
                        .replace(/\${i}/g, i)
                        .replace(/\${a\.invites\s*\|\|\s*0}/g, a.invites || 0)
                        .replace(/\${a\.regular\s*\|\|\s*0}/g, a.regular || 0)
                        .replace(/\${a\.bonus\s*\|\|\s*0}/g, a.bonus || 0)
                        .replace(/\${a\.leaves\s*\|\|\s*0}/g, a.leaves || 0);
                }
            };

            let embed = new EmbedBuilder().setColor("#FFB6C1").setDescription(text || '?').setTimestamp();

            return await interaction.editReply({ embeds: [embed], content: ' ' });

        } else if (command === 'show') {

            const member = interaction.options.getMember("member") || interaction.member;
            let inv = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.user.id}.INVITES.invites` });
            let leaves = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.user.id}.INVITES.leaves` });
            let Regular = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.user.id}.INVITES.regular` });
            let bonus = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.USER.${member.user.id}.INVITES.bonus` });

            let embed = new EmbedBuilder()
                .setColor("#92A8D1")
                .setTitle(data.invites_confirmation_embed_title)
                .setTimestamp()
                .setThumbnail(member.user.avatarURL({ dynamic: true }))
                .setDescription(
                    data.invites_confirmation_embed_description
                        .replace(/\${member\.user\.id}/g, member.user.id)
                        .replace(/\${bonus\s*\|\|\s*0}/g, bonus || 0)
                        .replace(/\${leaves\s*\|\|\s*0}/g, leaves || 0)
                        .replace(/\${Regular\s*\|\|\s*0}/g, Regular || 0)
                        .replace(/\${inv\s*\|\|\s*0}/g, inv || 0)
                );

            return await interaction.reply({ embeds: [embed] });

        } else if (command === 'removeinvites') {

            let user = interaction.options.getMember("member");
            let amount = interaction.options.getNumber("amount");
            let a = new EmbedBuilder().setColor("#FF0000").setDescription(data.removeinvites_not_admin_embed_description);

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ embeds: [a] })
            }

            await db.DataBaseModel({ id: db.Sub, key: `${interaction.guild.id}.USER.${user.id}.INVITES.invites`, value: amount });

            let finalEmbed = new EmbedBuilder()
                .setDescription(data.removeinvites_confirmation_embed_description
                    .replace(/\${amount}/g, amount)
                    .replace(/\${user}/g, user)
                )
                .setColor(`#92A8D1`)
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) });

            await db.DataBaseModel({ id: db.Sub, key: `${interaction.guild.id}.USER.${user.id}.INVITES.bonus`, value: amount });
            await interaction.reply({ embeds: [finalEmbed] });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.removeinvites_logs_embed_title)
                    .setDescription(data.removeinvites_logs_embed_description
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${amount}/g, amount)
                        .replace(/\${user\.id}/g, user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { return };

        };
    },
}