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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType,
    ChannelType,
    PermissionFlagsBits,
    Message,
    MessagePayload,
    InteractionEditReplyOptions,
    Channel,
    MessageReplyOptions,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
    name: 'setlogs',

    description: 'Set a logs channel for Audits Logs!',
    description_localizations: {
        "fr": "Définir des canaux de journaux pour les journaux d'audit"
    },

    aliases: ["logs", "setlog"],

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
                { name: "Setup all channels", value: "auto" },
                { name: "Delete all settings", value: "off" },
                { name: "AntiSpam Logs", value: "antispam" },
                { name: "Boost Logs", value: "boost" },
                { name: "Channel Logs", value: "channel" },
                { name: "Messages Logs", value: "message" },
                { name: "Moderation Logs", value: "moderation" },
                { name: "Roles Logs", value: "roles" },
                { name: "Ticket Logs", value: "ticket" },
                { name: "Voice Logs", value: "voice" },
            ],

            permission: null
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            description: "The channel you want your logs message!",
            description_localizations: {
                "fr": "Le canal sur lequel vous souhaitez recevoir votre message de journaux"
            },
            required: false,
            permission: null
        }
    ],
    thinking: true,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,
    permission: PermissionFlagsBits.Administrator,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let allCreatedChannels: string[] = [];
        let allLogsPossible = [
            { id: "voice", value: lang.setlogschannel_var_voice },
            { id: "moderation", value: lang.setlogschannel_var_mods },
            { id: "message", value: lang.setlogschannel_var_msg },
            { id: "boosts", value: lang.setlogschannel_var_boost },
            { id: "roles", value: lang.setlogschannel_var_roles },
            { id: "ticket-log-channel", value: lang.setlogschannel_var_tickets },
            { id: "antispam", value: lang.setlogschannel_var_antispam },
            { id: "channel", value: lang.var_text_channel }
        ];

        if (interaction instanceof ChatInputCommandInteraction) {
            var type = interaction.options.getString("type")!;
            var channel = interaction.options.getChannel("channel") as Channel | null;
        } else {

            var type = client.method.string(args!, 0)!;
            var channel = await client.method.channel(interaction, args!, 1);
        };

        const createLogsChannel = async (name: string, typeOfLogs: string) => {
            if (!channel) {
                await client.method.interactionSend(interaction, { content: lang.guildprofil_not_logs_set });
                return;
            }

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.${type}`);
                if (already === channel.id) {
                    await client.method.interactionSend(interaction, { content: lang.joinghostping_add_already_set.replace("${channel}", channel.toString()) });
                    return;
                }

                (interaction.guild?.channels.cache.get(channel.id) as BaseGuildTextChannel | null)?.send({
                    content: lang.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.member?.user.id!)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.${type}`, channel.id);

                await client.method.interactionSend(interaction, {
                    content: lang.setlogschannel_command_work
                        .replace("${argsid.id}", channel.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });

                await client.method.iHorizonLogs.send(interaction, {
                    title: lang.setlogschannel_logs_embed_title,
                    description: lang.setlogschannel_logs_embed_description_on_enable
                        .replace(/\${interaction\.user\.id}/g, interaction.member?.user.id!)
                        .replace("${argsid.id}", channel.id)
                        .replace("${typeOfLogs}", typeOfLogs)
                });
            } catch (e) {
                logger.err(e as any);
                await client.method.interactionSend(interaction, { content: lang.setlogschannel_command_error });
            }
        };

        if (type === "auto") {

            if (channel) {
                for (let logType of allLogsPossible) {
                    if (logType.id === 'ticket-log-channel') {
                        await client.db.set(`${interaction.guildId}.GUILD.TICKET.logs`, channel.id);
                    } else {
                        await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.${logType.id}`, channel.id);
                    }
                }
                allCreatedChannels.push(channel.id);
                (interaction.guild.channels.cache.get(channel.id) as BaseGuildTextChannel | null)?.send({
                    content: lang.setlogschannel_confirmation_message
                        .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                        .replace("${interaction.user.id}", interaction.member.user.id!)
                        .replace("${typeOfLogs}", allLogsPossible.map(x => x.value).join(","))
                });
            } else {
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
                            (interaction.guild.channels.cache.get(channel.id) as BaseGuildTextChannel | null)?.send({
                                content: lang.setlogschannel_confirmation_message
                                    .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                                    .replace("${interaction.user.id}", interaction.member.user.id!)
                                    .replace("${typeOfLogs}", logType.value)
                            });
                            if (logType.id === 'ticket-log-channel') {
                                await client.db.set(`${interaction.guildId}.GUILD.TICKET.logs`, channel.id);
                            } else {
                                await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.${logType.id}`, channel.id);
                            }
                        }
                    }
                }
            }
            await client.method.interactionSend(interaction, {
                content: lang.setlogschannel_utils_command_work
                    .replace("${argsid.id}", allCreatedChannels.map(x => `<#${x}>`).join(','))
                    .replace("${typeOfLogs}", allLogsPossible.map(x => x.value).join(', '))
            });
            return;
        }

        if (type === "off") {
            try {
                await client.method.iHorizonLogs.send(interaction, {
                    title: lang.setlogschannel_logs_embed_title,
                    description: lang.setlogschannel_logs_embed_description_on_off
                        .replace(/\${interaction\.user\.id}/g, interaction.member.user.id!)
                });

                let checkData = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS`);
                if (!checkData) {
                    await client.method.interactionSend(interaction, { content: lang.setlogschannel_already_deleted });
                    return;
                }

                await client.db.delete(`${interaction.guildId}.GUILD.SERVER_LOGS`);
                await client.method.interactionSend(interaction, {
                    content: lang.setlogschannel_command_work_on_delete
                        .replace("${interaction.guild.name}", interaction.guild?.name as string)
                });
            } catch (e) {
                logger.err(e as any);
                await client.method.interactionSend(interaction, { content: lang.setlogschannel_command_error });
            }
            return;
        }

        const typeOfLogsMap: { [key: string]: string; } = {
            "roles": lang.setlogschannel_var_roles,
            "moderation": lang.setlogschannel_var_mods,
            "voice": lang.setlogschannel_var_voice,
            "message": lang.setlogschannel_var_msg,
            "boost": lang.setlogschannel_var_boost,
            "ticket": lang.setlogschannel_var_tickets,
            "antispam": lang.setlogschannel_var_antispam,
            "channel": lang.var_text_channel,
        };

        if (type && type in typeOfLogsMap) {
            await createLogsChannel(type, typeOfLogsMap[type]);
        }
    },
};