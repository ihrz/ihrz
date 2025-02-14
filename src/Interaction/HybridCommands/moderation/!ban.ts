/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
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
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getUser("member")!
            var reason = interaction.options.getString("reason")
        } else {

            var member = await client.method.user(interaction, args!, 0) as User;
            var reason = client.method.longString(args!, 1);
        };

        if (!reason) {
            reason = lang.guildprofil_not_set_punishPub
        };

        if (!member) {
            await client.method.interactionSend(interaction, {
                content: lang.ban_dont_found_member
            });
            return;
        };

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            await client.method.interactionSend(interaction, {
                content: lang.ban_dont_have_perm_myself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        let guildMember = interaction.guild.members.cache.get(member.id);

        if (member.id === interaction.member.user.id) {
            await client.method.interactionSend(interaction, {
                content: lang.ban_try_to_ban_yourself.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (guildMember) {

            if ((interaction.member.roles as GuildMemberRoleManager).highest.position <= guildMember.roles.highest.position) {
                await client.method.interactionSend(interaction, {
                    content: lang.ban_attempt_ban_higter_member.replace("${client.iHorizon_Emojis.icon.Stop_Logo}", client.iHorizon_Emojis.icon.Stop_Logo)
                });
                return;
            };

            if (!guildMember.bannable) {
                await client.method.interactionSend(interaction, {
                    content: lang.ban_cant_ban_member.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            };
        }

        member.send({
            content: lang.ban_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
        })
            .catch(() => false)
            .then(() => false);

        interaction.guild?.bans.create(member?.id!, { reason: `Banned by: ${(interaction.member?.user as User).globalName || interaction.member?.user.username} | Reason: ${reason}` })
            .then(async () => {
                client.method.interactionSend(interaction, {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(lang.setjoinroles_var_perm_ban_members)
                            .setFields({ name: lang.var_member, value: member.toString(), inline: true },
                                { name: lang.var_author, value: interaction.member?.toString()!, inline: true },
                                { name: lang.var_reason, value: reason || lang.var_no_set, inline: true }
                            )
                            .setFooter(await client.method.bot.footerBuilder(interaction))
                    ],
                    files: [await client.method.bot.footerAttachmentBuilder(interaction)]
                }).catch(() => { });

                await client.method.iHorizonLogs.send(interaction, {
                    title: lang.ban_logs_embed_title,
                    description: lang.ban_logs_embed_description
                        .replace(/\${member\.user\.id}/g, member.id)
                        .replace(/\${interaction\.member\.id}/g, interaction.member?.user.id!)
                });
            })
            .catch(() => {
                return client.method.interactionSend(interaction, {
                    content: lang.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
            });
    },
};