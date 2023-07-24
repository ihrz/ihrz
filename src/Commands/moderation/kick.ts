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
    name: 'kick',
    description: 'Kick a user!',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'the member you want to kick',
            required: true
        }
    ],
    category: 'moderation',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        const member = interaction.options.getMember("member");
        const permission = interaction.member.permissions.has([PermissionsBitField.Flags.KickMembers]);

        if (!permission) {
            return interaction.reply({ content: data.kick_not_permission });
        };

        if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.KickMembers])) {
            return interaction.reply({ content: data.kick_dont_have_permission });
        };

        if (member.user.id === interaction.member.id) {
            return interaction.reply({ content: data.kick_attempt_kick_your_self });
        };

        if (interaction.member.roles.highest.position < member.roles.highest.position) {
            return interaction.reply({ content: data.kick_attempt_kick_higter_member });
        };

        member.send({
            content: data.kick_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
        }).catch(() => { });

        try {
            await member.kick({ reason: 'kicked by ' + interaction.user.username });

            const logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.kick_logs_embed_title)
                .setDescription(data.kick_logs_embed_description
                    .replace(/\${member\.user}/g, member.user)
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }

            await interaction.reply({
                content: data.kick_command_work
                    .replace(/\${member\.user}/g, member.user)
                    .replace(/\${interaction\.user}/g, interaction.user)
            });
        } catch (e: any) {
            logger.err(e);
        };
    },
};