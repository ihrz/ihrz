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
    Message,
    GuildMember,
    PermissionsBitField,
    GuildMemberRoleManager,
    BaseGuildTextChannel
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';

export const command: Command = {
    name: 'kick',

    description: 'Kick a user!',
    description_localizations: {
        "fr": "Expulser un utilisateur"
    },

    category: 'moderation',
    thinking: true,
    type: 'PREFIX_IHORIZON_COMMAND',
    run: async (client: Client, interaction: Message) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        let member = interaction.mentions.members?.toJSON()[1] || interaction.member as GuildMember;
        let permission = interaction.member?.permissions?.has(PermissionsBitField.Flags.KickMembers);

        if (!permission) {
            await interaction.reply({
                content: data.kick_not_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!interaction.guild?.members.me?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            await interaction.reply({
                content: data.kick_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (member.user?.id === interaction.author.id) {
            await interaction.reply({
                content: data.kick_attempt_kick_your_self.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if ((interaction.member?.roles as GuildMemberRoleManager).highest.position < member?.roles.highest.position) {
            await interaction.reply({
                content: data.kick_attempt_kick_higter_member.replace("${client.iHorizon_Emojis.icon.Stop_Logo}", client.iHorizon_Emojis.icon.Stop_Logo)
            });
            return;
        };

        member?.send({
            content: data.kick_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.author.globalName || interaction.author.username as string)
        }).catch(() => { });

        try {
            await member?.kick(`Kicked by ${interaction.author.globalName || interaction.author.username}`);
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.kick_logs_embed_title)
                .setDescription(data.kick_logs_embed_description
                    .replace(/\${member\.user}/g, member.user as unknown as string)
                    .replace(/\${interaction\.user\.id}/g, interaction.author.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
            };

            await interaction.reply({
                content: data.kick_command_work
                    .replace(/\${member\.user}/g, member.user as unknown as string)
                    .replace(/\${interaction\.user}/g, interaction.author as unknown as string)
            });
        } catch (e: any) {
            logger.err(e);
        };

    },
};