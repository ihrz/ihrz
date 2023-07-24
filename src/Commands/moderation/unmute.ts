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
    ApplicationCommandOptionType,
    User
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';

export const command: Command = {
    name: 'unmute',
    description: 'Unmute a user!',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to unmuted',
            required: true
        }
    ],
    category: 'moderation',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        let tomute = interaction.options.getMember("user");

        const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
        if (!permission) return interaction.reply({ content: data.unmute_dont_have_permission });
        if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.ManageRoles])) {
            return interaction.reply({ content: data.unmute_i_dont_have_permission });
        };
        if (tomute.id === interaction.user.id) return interaction.reply({ content: data.unmute_attempt_mute_your_self });
        let muterole = interaction.guild.roles.cache.find((role: { name: string; }) => role.name === 'muted');

        if (!tomute.roles.cache.has(muterole.id)) {
            return interaction.reply({ content: data.unmute_not_muted })
        };

        if (!muterole) {
            return interaction.reply({ content: data.unmute_muted_role_doesnt_exist })
        };

        tomute.roles.remove(muterole.id);
        await interaction.reply({
            content: data.unmute_command_work
                .replace("${tomute.id}", tomute.id)
        });
        try {
            const logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.unmute_logs_embed_title)
                .setDescription(data.unmute_logs_embed_description
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${tomute.id}", tomute.id)
                )

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }); };
        } catch (e: any) { logger.err(e) };
    },
};