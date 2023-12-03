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
} from 'discord.js';

import { Command } from '../../../types/command';
import logger from '../../core/logger';

export const command: Command = {
    name: 'support',
    description: 'Give a roles when guild\'s member have something about your server on them bio!',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the action',
            required: true,
            choices: [
                {
                    name: "POWER ON",
                    value: "true"
                },
                {
                    name: "POWER OFF",
                    value: "false"
                }
            ]
        },
        {
            name: 'input',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the keywords wanted in the bio',
            required: false,
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,
            description: 'The wanted roles to give for your member',
            required: false,
        }
    ],
    thinking: false,
    category: 'newfeatures',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.support_not_admin });
            return;
        };

        let action = interaction.options.getString("action");
        let input = interaction.options.getString("input");
        let roles = interaction.options.getRole("roles");

        if (!roles) {
            await interaction.reply({ content: data.support_command_not_role });
            return;
        }
        if (action == "true") {
            await client.db.set(`${interaction.guild.id}.GUILD.SUPPORT`,
                {
                    input: input,
                    rolesId: roles.id,
                    state: action
                }
            );

            await interaction.reply({
                content: data.support_command_work
                    .replace("${interaction.guild.name}", interaction.guild.name)
                    .replace("${input}", input)
                    .replace("${roles.id}", roles.id)
            });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                    .setDescription(data.setjoinroles_logs_embed_description_on_enable
                        .replace("${interaction.user.id}", interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };
        } else {
            await client.db.delete(`${interaction.guild.id}.GUILD.SUPPORT`);

            await interaction.reply({
                content: data.support_command_work_on_disable
                    .replace("${interaction.guild.name}", interaction.guild.name)
            })

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                    .setDescription(data.setjoinroles_logs_embed_description_on_enable
                        .replace("${interaction.user.id}", interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };
            return;
        };
    },
};