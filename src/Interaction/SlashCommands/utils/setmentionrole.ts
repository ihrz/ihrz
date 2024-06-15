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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';

export const command: Command = {
    name: 'setmentionrole',

    description: 'Give a specific role to the user who pings me!',
    description_localizations: {
        "fr": "Donner un rôle spécifique à l'utilisateur qui me ping"
    },

    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,

            description: 'What you want to do?',
            description_localizations: {
                "fr": "Que veux-tu faire?"
            },

            required: true,
            choices: [
                {
                    name: "Power Off",
                    value: "off"
                },
                {
                    name: 'Power On',
                    value: "on"
                }
            ],
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,

            description: 'The specific roles to give !',
            description_localizations: {
                "fr": "Les rôles spécifiques à donner"
            },

            required: false
        },
        {
            name: 'part-of-nickname',
            type: ApplicationCommandOptionType.String,

            description: 'La partie du surnom que vous souhaitez que la personne ait dans son surnom',
            description_localizations: {
                "fr": "The part of the nickname you want the person to have in their nickname"
            },

            required: false
        }
    ],
    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId);

        let type = interaction.options.getString("action");
        let argsid = interaction.options.getRole("roles");
        let nickname = interaction.options.getString("part-of-nickname");

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({
                content: data.setrankroles_not_admin.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (type === "on") {
            if (!argsid) {
                await interaction.reply({
                    content: data.setrankroles_not_roles_typed.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setrankroles_logs_embed_title_enable)
                    .setDescription(data.setrankroles_logs_embed_description_enable
                        .replace(/\${interaction\.user.id}/g, interaction.user.id)
                        .replace(/\${argsid}/g, argsid.id)
                    );

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.RANK_ROLES.roles`);

                if (already === argsid.id) {
                    await interaction.reply({
                        content: data.setrankroles_already_this_in_db.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                    });
                    return;
                };

                let msg = '';

                if (nickname) {
                    msg = data.setrankroles_command_work_with_nicknames
                        .replace('${argsid}', argsid.id)
                        .replace('${nicknames}', nickname);

                    await client.db.set(`${interaction.guildId}.GUILD.RANK_ROLES.nicknames`, nickname);
                } else {
                    msg = data.setrankroles_command_work.replace('${argsid}', argsid.id)
                }

                await client.db.set(`${interaction.guildId}.GUILD.RANK_ROLES.roles`, argsid.id);

                let e = new EmbedBuilder().setDescription(msg);

                await interaction.reply({ embeds: [e] });
                return;

            } catch (e: any) {
                logger.err(e);
                await interaction.reply({
                    content: data.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            }
        } else if (type == "off") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setrankroles_logs_embed_title_disable)
                    .setDescription(data.setrankroles_logs_embed_description_disable
                        .replace(/\${interaction\.user.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                await client.db.delete(`${interaction.guildId}.GUILD.RANK_ROLES`);

                await interaction.reply({
                    content: data.setrankroles_command_work_disable
                        .replace(/\${interaction\.user.id}/g, interaction.user.id)
                });
                return;
            } catch (e: any) {
                logger.err(e)
                await interaction.reply({
                    content: data.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            }
        }
    },
};