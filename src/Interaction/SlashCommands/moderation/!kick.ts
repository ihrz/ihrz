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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildMemberRoleManager,
    PermissionsBitField,
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let member = interaction.options.getMember("member") as GuildMember;
        let permission = interaction.memberPermissions?.has(PermissionsBitField.Flags.KickMembers);

        if (!permission) {
            await interaction.editReply({
                content: data.kick_not_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            await interaction.editReply({
                content: data.kick_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (member.user.id === interaction.user.id) {
            await interaction.editReply({
                content: data.kick_attempt_kick_your_self.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if ((interaction.member.roles as GuildMemberRoleManager).highest.position < member.roles.highest.position) {
            await interaction.editReply({
                content: data.kick_attempt_kick_higter_member.replace("${client.iHorizon_Emojis.icon.Stop_Logo}", client.iHorizon_Emojis.icon.Stop_Logo)
            });
            return;
        };

        member.send({
            content: data.kick_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.user.globalName || interaction.user.username)
        }).catch(() => { });

        try {
            await member.kick(`Kicked by ${interaction.user.globalName || interaction.user.username}`);
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.kick_logs_embed_title)
                .setDescription(data.kick_logs_embed_description
                    .replace(/\${member\.user}/g, member.user.toString())
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
            };

            await interaction.editReply({
                content: data.kick_command_work
                    .replace(/\${member\.user}/g, member.user.toString())
                    .replace(/\${interaction\.user}/g, interaction.user.toString())
            });
        } catch (e: any) {
            logger.err(e);
        };
    },
};