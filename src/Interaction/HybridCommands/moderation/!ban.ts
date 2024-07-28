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
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    PermissionsBitField,
    User,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommandArgumentValue } from '../../../core/functions/arg.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("member") as GuildMember | null
            var reason = interaction.options.getString("reason")
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var member = client.method.member(interaction, args!, 0) as GuildMember | null;
            var reason = client.method.longString(args!, 1);
        };

        if (!reason) {
            reason = data.guildprofil_not_set_punishPub
        };

        const permissionsArray = [PermissionsBitField.Flags.BanMembers]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.method.interactionSend(interaction, {
                content: data.ban_not_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!member) {
            await client.method.interactionSend(interaction, {
                content: data.ban_dont_found_member
            });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            await client.method.interactionSend(interaction, {
                content: data.ban_dont_have_perm_myself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (member.user.id === interaction.member.user.id) {
            await client.method.interactionSend(interaction, {
                content: data.ban_try_to_ban_yourself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if ((interaction.member.roles as GuildMemberRoleManager).highest.position <= member.roles.highest.position) {
            await client.method.interactionSend(interaction, {
                content: data.ban_attempt_ban_higter_member.replace("${client.iHorizon_Emojis.icon.Stop_Logo}", client.iHorizon_Emojis.icon.Stop_Logo)
            });
            return;
        };

        if (!member.bannable) {
            await client.method.interactionSend(interaction, {
                content: data.ban_cant_ban_member.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
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
                member?.ban({ reason: `Banned by: ${(interaction.member?.user as User).globalName || interaction.member?.user.username} | Reason: ${reason}` })
                    .then((member) => {
                        client.method.interactionSend(interaction, {
                            content: data.ban_command_work
                                .replace(/\${member\.user\.id}/g, member.user.id)
                                .replace(/\${interaction\.member\.id}/g, interaction.member?.user.id!)
                        }).catch(() => { });

                        try {
                            let logEmbed = new EmbedBuilder()
                                .setColor("#bf0bb9")
                                .setTitle(data.ban_logs_embed_title)
                                .setDescription(data.ban_logs_embed_description
                                    .replace(/\${member\.user\.id}/g, member.user.id)
                                    .replace(/\${interaction\.member\.id}/g, interaction.member?.user.id!)
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