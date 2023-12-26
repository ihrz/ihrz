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
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import logger from '../../../core/logger';

export const command: Command = {
    name: 'setmentionrole',
    description: 'Give a specific role to the user who pings me!',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
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
            required: false
        }
    ],
    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);

        let type = interaction.options.getString("action");
        let argsid = interaction.options.getRole("roles");

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
                let already = await client.db.get(`${interaction.guild?.id}.GUILD.RANK_ROLES.roles`);

                if (already === argsid.id) {
                    await interaction.reply({
                        content: data.setrankroles_already_this_in_db.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                    });
                    return;
                };

                await client.db.set(`${interaction.guild?.id}.GUILD.RANK_ROLES.roles`, argsid.id);

                let e = new EmbedBuilder().setDescription(data.setrankroles_command_work.replace(/\${argsid}/g, argsid.id));

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
                await client.db.delete(`${interaction.guild?.id}.GUILD.RANK_ROLES.roles`);

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