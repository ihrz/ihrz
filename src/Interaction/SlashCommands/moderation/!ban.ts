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
    GuildMemberRoleManager,
    PermissionsBitField,
} from 'pwss';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let member = interaction.guild.members.cache.get(interaction.options.getUser("member")?.id as string);
        let permission = interaction.memberPermissions?.has(PermissionsBitField.Flags.BanMembers);

        if (!permission) {
            await interaction.editReply({
                content: data.ban_not_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!member) {
            await interaction.editReply({ content: data.ban_dont_found_member });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            await interaction.editReply({
                content: data.ban_dont_have_perm_myself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (member.user.id === interaction.user.id) {
            await interaction.editReply({
                content: data.ban_try_to_ban_yourself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if ((interaction.member.roles as GuildMemberRoleManager).highest.position <= member.roles.highest.position) {
            await interaction.editReply({
                content: data.ban_attempt_ban_higter_member.replace("${client.iHorizon_Emojis.icon.Stop_Logo}", client.iHorizon_Emojis.icon.Stop_Logo)
            });
            return;
        };

        if (!member.bannable) {
            await interaction.editReply({
                content: data.ban_cant_ban_member.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        member.send({
            content: data.ban_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.user.globalName || interaction.user.username)
        })
            .catch(() => {
            })
            .then(() => {
                member?.ban({ reason: 'banned by ' + interaction.user.globalName || interaction.user.username })
                    .then((member) => {
                        interaction.editReply({
                            content: data.ban_command_work
                                .replace(/\${member\.user\.id}/g, member.user.id)
                                .replace(/\${interaction\.member\.id}/g, interaction.user.id)
                        }).catch(() => { });

                        try {
                            let logEmbed = new EmbedBuilder()
                                .setColor("#bf0bb9")
                                .setTitle(data.ban_logs_embed_title)
                                .setDescription(data.ban_logs_embed_description
                                    .replace(/\${member\.user\.id}/g, member.user.id)
                                    .replace(/\${interaction\.member\.id}/g, interaction.user.id)
                                )
                            let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                            if (logchannel) {
                                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                            };
                        } catch (e: any) {
                            logger.err(e);
                        };
                    })
            });
    },
};