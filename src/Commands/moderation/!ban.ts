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
} from 'discord.js';

import logger from '../../core/logger';

export = {
    run: async (client: Client, interaction: any, data: any) => {
        let member = interaction.guild.members.cache.get(interaction.options.get("member").user.id)
        let permission = interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)
        if (!permission) return interaction.editReply({ content: data.ban_not_permission });
        if (!member) return interaction.editReply({ content: data.ban_dont_found_member });

        if (!interaction.channel.permissionsFor(client.user).has('BAN_MEMBERS')) {
            await interaction.editReply({ content: data.ban_dont_have_perm_myself });
            return;
        };

        if (member.user.id === interaction.member.id) {
            await interaction.editReply({ content: data.ban_try_to_ban_yourself });
            return;
        };

        if (interaction.member.roles.highest.position < member.roles.highest.position) {
            await interaction.editReply({ content: data.ban_attempt_ban_higter_member });
            return;
        };

        if (!member.bannable) {
            await interaction.editReply({ content: data.ban_cant_ban_member });
            return;
        };

        member.send({
            content: data.ban_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
        })
            .catch(() => {
            })
            .then(() => {
                member.ban({ reason: 'banned by ' + interaction.user.username })
                    .then((member: { user: { id: any; }; }) => {
                        interaction.editReply({
                            content: data.ban_command_work
                                .replace(/\${member\.user\.id}/g, member.user.id)
                                .replace(/\${interaction\.member\.id}/g, interaction.member.id)
                        }).catch(() => { });

                        try {
                            let logEmbed = new EmbedBuilder()
                                .setColor("#bf0bb9")
                                .setTitle(data.ban_logs_embed_title)
                                .setDescription(data.ban_logs_embed_description
                                    .replace(/\${member\.user\.id}/g, member.user.id)
                                    .replace(/\${interaction\.member\.id}/g, interaction.member.id)
                                )
                            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                            if (logchannel) {
                                logchannel.send({ embeds: [logEmbed] })
                            };
                        } catch (e: any) {
                            logger.err(e);
                        };
                    })
            });
    },
};