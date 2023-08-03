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
    CategoryChannel,
} from 'discord.js';
import * as sourcebin from 'sourcebin';

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';
import ms from 'ms';

export const command: Command = {
    name: "ticket",
    description: "Subcommand for ticket category!",
    options: [
        {
            name: "add",
            description: "Add a member into your ticket!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to add into your ticket',
                    required: true
                }
            ],
        },
        {
            name: "close",
            description: "Close a ticket!",
            type: 1,
        },
        {
            name: "delete",
            description: "Delete a iHorizon ticket!",
            type: 1,
        },
        {
            name: "disable",
            description: "Disable ticket commands on a guild!",
            type: 1,
            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,
                    description: 'What you want to do?',
                    required: true,
                    choices: [
                        {
                            name: "Remove the module",
                            value: "off"
                        },
                        {
                            name: 'Power on the module',
                            value: "on"
                        },
                    ],
                },
            ],
        },
        {
            name: "open",
            description: "re-open a closed ticket!",
            type: 1,
        },
        {
            name: 'remove',
            description: "Remove a member from your ticket!",
            type: 1,
            options: [
                {
                    name: 'user',
                    type: ApplicationCommandOptionType.User,
                    description: 'The user you want to remove into your ticket',
                    required: true
                }
            ],
        },
        {
            name: "set-here",
            description: "Make a embed for allowing to user to create a ticket!",
            type: 1,
            options: [
                {
                    name: "name",
                    description: "The name of you ticket's panel.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ],
        },
        {
            name: "set-category",
            description: "Set the category where ticket are been create!",
            type: 1,
            options: [
                {
                    name: "category-name",
                    description: "The name of you ticket's panel.",
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                }
            ],
        },
        {
            name: "transcript",
            description: "Get the transript of a ticket message!",
            type: 1,
        },
    ],
    category: 'ticket',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let command: any = interaction.options.getSubcommand();

        if (command === 'add') {

            let blockQ = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` });

            if (blockQ) { return interaction.reply({ content: data.add_disabled_command }); };
            if (interaction.channel.name.includes('ticket-')) {

                const member = interaction.options.getUser("user");

                if (!member) {
                    return interaction.reply({ content: data.add_incorect_syntax });
                }

                try {
                    interaction.channel.permissionOverwrites.create(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                    interaction.reply({ content: data.add_command_work.replace(/\${member\.tag}/g, member.username) });
                } catch (e) {
                    return interaction.reply({ content: data.add_command_error });
                }
            };

        } else if (command === 'close') {

            let blockQ = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` });
            if (blockQ) { return interaction.reply({ content: data.close_disabled_command }); };

            if (interaction.channel.name.includes('ticket-')) {
                const member = interaction.guild.members.cache.get(interaction.channel.name.split('ticket-').join(''));
                if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || interaction.channel.name === `ticket-${interaction.user.id}`) {
                    interaction.channel.messages.fetch().then(async (messages: any[]) => {
                        const output = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.username}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');

                        let response;
                        try {
                            response = await sourcebin.create({
                                title: data.close_title_sourcebin,
                                description: data.close_description_sourcebin,
                                files: [
                                    {
                                        content: output,
                                        language: 'text',
                                    },
                                ],
                            })

                        } catch (e: any) {
                            return interaction.reply({ content: data.close_error_command });
                        };

                        try {
                            const embed = new EmbedBuilder()
                                .setDescription(`[\`View This\`](${response.url})`)
                                .setColor('#5b92e5');
                            interaction.reply({ content: data.close_command_work_channel, embeds: [embed] })
                        } catch (e: any) {
                            logger.err(e)
                        };

                        try {
                            interaction.channel.permissionOverwrites.create(member.user, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                            interaction.channel.send({ content: data.close_command_work_notify_channel });
                        } catch (e: any) {
                            return interaction.channel.send(data.close_command_error);
                        }
                    });
                }
            } else {
                return interaction.reply({ content: data.close_not_in_ticket });
            };

        } else if (command === 'delete') {

            let blockQ = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` });

            if (blockQ) { return interaction.reply({ content: data.delete_disabled_command }); };
            if (interaction.channel.name.includes('ticket-')) {
                interaction.channel.delete();
            } else {
                return interaction.reply({ content: data.delete_not_in_ticket });
            };

        } else if (command === 'disable') {

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.disableticket_not_admin });
            }

            let type = interaction.options.getString('action');

            if (type === "off") {
                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.disableticket_logs_embed_title_disable)
                        .setDescription(data.disableticket_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.user.id));

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };

                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.TICKET.disable`, value: true });
                return interaction.reply({ content: data.disableticket_command_work_disable });
            }
            if (type === "on") {
                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.disableticket_logs_embed_title_enable)
                        .setDescription(data.disableticket_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.user.id));

                    let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e: any) { logger.err(e) };
                await db.DataBaseModel({ id: db.Set, key: `${interaction.guild.id}.GUILD.TICKET.disable`, value: false });
                return interaction.reply({ content: data.disableticket_command_work_enable });
            };

        } else if (command === 'open') {

            let blockQ = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` });

            if (blockQ) { return interaction.reply({ content: data.open_disabled_command }); };

            if (interaction.channel.name.includes('ticket-')) {
                const member = interaction.guild.members.cache.get(interaction.channel.name.split('ticket-').join(''));
                try {
                    interaction.channel.permissionOverwrites.edit(member.id, {
                        VIEW_CHANNEL: true,
                        SEND_MESSAGES: true,
                        ATTACH_FILES: true,
                        READ_MESSAGE_HISTORY: true,
                    })
                        .then(() => {
                            return interaction.reply({
                                content: data.open_command_work
                                    .replace(/\${interaction\.channel}/g, interaction.channel)
                            });
                        });
                } catch (e: any) {
                    return interaction.reply({ content: data.open_command_error });
                };
            } else {
                return await interaction.reply({ content: data.open_not_in_ticket });
            };

        } else if (command === 'remove') {

            let blockQ = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` });

            if (blockQ) { return interaction.reply({ content: data.remove_disabled_command }); };

            if (interaction.channel.name.includes('ticket-')) {
                const member = interaction.options.getUser("user");

                try {
                    interaction.channel.permissionOverwrites.create(member, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                    interaction.reply({ content: data.remove_command_work.replace(/\${member\.tag}/g, member.username) });
                } catch (e: any) {
                    return interaction.reply({ content: data.remove_command_error });
                }
            } else {
                return interaction.reply({ content: data.remove_not_in_ticket })
            };

        } else if (command === 'set-here') {

            let panelName = interaction.options.getString("name");

            if (await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` })) {
                return interaction.reply({ content: data.sethereticket_disabled_command });
            };

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.sethereticket_not_admin });
            };

            let panel = new EmbedBuilder()
                .setTitle(`${panelName}`)
                .setColor("#3b8f41")
                .setDescription(data.sethereticket_description_embed)
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })

            interaction.channel.send({ embeds: [panel] }).then(async (message: { react: (arg0: string) => void; guild: { id: any; }; id: any; channel: { id: any; }; }) => {
                message.react("📩");

                await db.DataBaseModel({
                    id: db.Set, key: `${message.guild.id}.GUILD.TICKET.${message.id}`,
                    value: {
                        author: interaction.user.id,
                        used: true,
                        panelName: panelName,
                        channel: message.channel.id,
                        messageID: message.id,
                    }
                });
            });

            return interaction.reply({ content: data.sethereticket_command_work, ephemeral: true });

        } else if (command === 'set-category') {

            let category = interaction.options.getChannel("category-name");

            if (await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` })) {
                return interaction.reply({ content: data.setticketcategory_disabled_command });
            };

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: data.setticketcategory_not_admin });
            };

            if (!(category instanceof CategoryChannel)) {
                return interaction.reply({ content: data.setticketcategory_not_a_category });
            };

            await db.DataBaseModel({
                id: db.Set, key: `${interaction.guild.id}.GUILD.TICKET.category`,
                value: category.id
            });

            let embed = new EmbedBuilder()
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                .setColor('#00FFFF')
                .setDescription(data.setticketcategory_command_work
                    .replace('${category.name}', category.name)
                    .replace('${interaction.user.id}', interaction.user.id)
                );

            return interaction.reply({ embeds: [embed], ephemeral: false });

        } else if (command === 'transcript') {

            let blockQ = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` });

            if (blockQ) {
                return interaction.reply({ content: data.transript_disabled_command })
            };

            let channel = interaction.channel;

            if (channel.name.includes('ticket-')) {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || channel.name === `ticket-${interaction.user.id}`) {
                    channel.messages.fetch().then(async (messages: any[]) => {
                        let output = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.username}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');

                        let response;
                        try {
                            response = await sourcebin.create({
                                title: data.close_title_sourcebin,
                                description: data.close_description_sourcebin,
                                files: [
                                    {
                                        content: output,
                                        language: 'text',
                                    },
                                ],
                            })

                        } catch (e: any) {
                            return interaction.reply({ content: data.transript_command_error });
                        };

                        let embed = new EmbedBuilder()
                            .setDescription(`[\`View this\`](${response.url})`)
                            .setColor('#0014a8');
                        return interaction.reply({ embeds: [embed], content: data.transript_command_work });
                    });
                }
            } else {
                return interaction.reply({ content: data.transript_not_in_ticket });
            };
        };
    },
}