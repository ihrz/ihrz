/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
    PermissionFlagsBits,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {

    name: 'autochannels',

    description: 'Create every logs channel type inside a category',
    description_localizations: {
        "fr": "Créez chaque type de canal de journaux dans une catégorie"
    },

    thinking: true,
    category: 'guildconfig',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.member?.permissions.has([PermissionsBitField.Flags.Administrator])) {
            await interaction.reply({ content: data.renew_not_administrator });
            return;
        };

        let all_created_channels: string[] = [];
        let all_logs_possible = [
            { id: "voices", value: data.setlogschannel_var_voice },
            { id: "moderation", value: data.setlogschannel_var_mods },
            { id: "message", value: data.setlogschannel_var_msg },
            { id: "boosts", value: data.setlogschannel_var_boost },
            { id: "roles", value: data.setlogschannel_var_roles },
        ];

        interaction.guild?.channels.create({
            name: "LOGS",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }
            ],
        }).then(async category => {
            const promises = all_logs_possible.map(async (typeOfLogs) => {
                const channel = await interaction.guild?.channels.create({
                    name: typeOfLogs.value,
                    parent: category.id,
                    permissionOverwrites: category.permissionOverwrites.cache,
                    type: ChannelType.GuildText
                });
                if (channel) {
                    all_created_channels.push(channel.id);
                    (client.channels.cache.get(channel.id) as BaseGuildTextChannel).send({
                        content: data.setlogschannel_confirmation_message
                            .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                            .replace("${interaction.user.id}", interaction.author.id)
                            .replace("${typeOfLogs}", typeOfLogs.value)
                    });
                    await client.db.set(`${interaction.guildId}.GUILD.SERVER_LOGS.${typeOfLogs.id}`, channel.id);
                }
            });
            await Promise.all(promises);
            await interaction.reply({
                content: data.setlogschannel_utils_command_work
                    .replace("${argsid.id}", all_created_channels.map(x => `<#${x}>`).join(',').toString())
                    .replace("${typeOfLogs}", all_logs_possible.map(x => x.value).join(', '))
            });
        })
    },
};
