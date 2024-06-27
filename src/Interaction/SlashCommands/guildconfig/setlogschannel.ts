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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType,
    ChannelType,
    PermissionFlagsBits,
} from 'pwss';

import { Command } from '../../../../types/command.js';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
    name: 'setlogschannel',
    description: 'Set a logs channel for Audits Logs!',
    description_localizations: {
        "fr": "Définir des canaux de journaux pour les journaux d'audit"
    },
    options: [
        {
            name: 'type',
            type: ApplicationCommandOptionType.String,
            description: 'Specified logs category',
            description_localizations: {
                "fr": "Spécifier le canal de journaux"
            },
            required: true,
            choices: [
                { name: "Delete all settings", value: "off" },
                { name: "Setup all channels", value: "auto" },
                { name: "Roles Logs", value: "roles" },
                { name: "Moderation Logs", value: "moderation" },
                { name: "Voice Logs", value: "voice" },
                { name: "Messages Logs", value: "message" },
                { name: "Boost Logs", value: "boost" },
                { name: "Ticket Logs", value: "ticket" },
                { name: "AntiSpam Logs", value: "antispam" }
            ]
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            description: "The channel you want your logs message!",
            description_localizations: {
                "fr": "Le canal sur lequel vous souhaitez recevoir votre message de journaux"
            },
            required: false
        }
    ],
    thinking: true,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setlogschannel_not_admin });
            return;
        }

        let type = interaction.options.getString("type")!;
        let channel = interaction.options.getChannel("channel");

        const createLogsChannel = async (name: string, typeOfLogs: string) => {
            if (!channel) {
                await interaction.editReply({ content: data.setlogschannel_not_specified_args });
                return;
            }

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.${type}`);
                if (already === channel.id) {
                    await interaction.editReply({ content: data.setlogschannel_already_this_channel });
                    return;
                }

                (client.channels.cache.get(channel.id) as BaseGuildTextChannel).send({
                    content: data.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.${type}`, channel.id);

                await interaction.editReply({
                    content: data.setlogschannel_command_work
                        .replace("${argsid.id}", channel.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });

                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace("${argsid.id}", channel.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                    );

                let logChannel = interaction.guild?.channels.cache.find(ch => ch.name === 'ihorizon-logs') as BaseGuildTextChannel;
                if (logChannel) {
                    logChannel.send({ embeds: [logEmbed] });
                }
            } catch (e) {
                logger.err(e as any);
                await interaction.editReply({ content: data.setlogschannel_command_error });
            }
        };

        if (type === "auto") {
            let allCreatedChannels: string[] = [];
            let allLogsPossible = [
                { id: "voice", value: data.setlogschannel_var_voice },
                { id: "moderation", value: data.setlogschannel_var_mods },
                { id: "message", value: data.setlogschannel_var_msg },
                { id: "boosts", value: data.setlogschannel_var_boost },
                { id: "roles", value: data.setlogschannel_var_roles },
                { id: "ticket-log-channel", value: data.setlogschannel_var_tickets },
                { id: "antispam", value: data.setlogschannel_var_antispam }
            ];

            let category = await interaction.guild.channels.create({
                name: "LOGS",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ]
            });

            if (category) {
                for (let logType of allLogsPossible) {
                    let channel = await interaction.guild.channels.create({
                        name: logType.value,
                        parent: category.id,
                        permissionOverwrites: category.permissionOverwrites.cache,
                        type: ChannelType.GuildText
                    });
                    if (channel) {
                        allCreatedChannels.push(channel.id);
                        (client.channels.cache.get(channel.id) as BaseGuildTextChannel).send({
                            content: data.setlogschannel_confirmation_message
                                .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                                .replace("${interaction.user.id}", interaction.user.id)
                                .replace("${typeOfLogs}", logType.value)
                        });
                        if (logType.id === 'ticket-log-channel') {
                            await client.db.set(`${interaction.guildId}.GUILD.TICKET.logs`, channel.id);
                        } else {
                            await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.${logType.id}`, channel.id);
                        }
                    }
                }
                await interaction.editReply({
                    content: data.setlogschannel_utils_command_work
                        .replace("${argsid.id}", allCreatedChannels.map(x => `<#${x}>`).join(','))
                        .replace("${typeOfLogs}", allLogsPossible.map(x => x.value).join(', '))
                });
            }
            return;
        }

        if (type === "off") {
            try {
                const logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setlogschannel_logs_embed_title)
                    .setDescription(data.setlogschannel_logs_embed_description_on_off
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    );

                let logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'ihorizon-logs') as BaseGuildTextChannel;
                if (logChannel) {
                    logChannel.send({ embeds: [logEmbed] });
                }

                let checkData = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS`);
                if (!checkData) {
                    await interaction.editReply({ content: data.setlogschannel_already_deleted });
                    return;
                }

                await client.db.delete(`${interaction.guildId}.GUILD.SERVER_LOGS`);
                await interaction.editReply({
                    content: data.setlogschannel_command_work_on_delete
                        .replace("${interaction.guild.name}", interaction.guild?.name as string)
                });
            } catch (e) {
                logger.err(e as any);
                await interaction.editReply({ content: data.setlogschannel_command_error });
            }
            return;
        }

        const typeOfLogsMap: { [key: string]: string } = {
            "roles": data.setlogschannel_var_roles,
            "moderation": data.setlogschannel_var_mods,
            "voice": data.setlogschannel_var_voice,
            "message": data.setlogschannel_var_msg,
            "boost": data.setlogschannel_var_boost,
            "ticket": data.setlogschannel_var_tickets,
            "antispam": data.setlogschannel_var_antispam,
        };

        if (type in typeOfLogsMap) {
            await createLogsChannel(type, typeOfLogsMap[type]);
        }
    },
};