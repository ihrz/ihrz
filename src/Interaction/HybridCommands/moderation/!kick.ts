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
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';
import { Command } from '../../../../types/command.js';



import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("member") as GuildMember | null;
            var reason = interaction.options.getString("reason")
        } else {

            var member = client.method.member(interaction, args!, 0) as GuildMember | null;
            var reason = client.method.longString(args!, 1);
        };

        if (!reason) {
            reason = lang.guildprofil_not_set_punishPub
        };

        if (!member) return;

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            await client.method.interactionSend(interaction, {
                content: lang.kick_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (member.id === interaction.member.user.id) {
            await client.method.interactionSend(interaction, {
                content: lang.kick_attempt_kick_your_self.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if ((interaction.member.roles as GuildMemberRoleManager).highest.position < member.roles.highest.position) {
            await client.method.interactionSend(interaction, {
                content: lang.kick_attempt_kick_higter_member.replace("${client.iHorizon_Emojis.icon.Stop_Logo}", client.iHorizon_Emojis.icon.Stop_Logo)
            });
            return;
        };

        member.send({
            content: lang.kick_message_to_the_banned_member
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
                .replace(/\${interaction\.member\.user\.username}/g, interaction.member.user.username)
        }).catch(() => { });

        await member.kick(`Kicked by: ${interaction.member.user.username} | Reason: ${reason}`)
            .catch((error) => {
                return client.method.interactionSend(interaction, {
                    content: lang.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
            });

        await client.method.interactionSend(interaction, {
            embeds: [
                new EmbedBuilder()
                    .setTitle(lang.setjoinroles_var_perm_kick_members)
                    .setFields({ name: lang.var_member, value: member.toString(), inline: true },
                        { name: lang.var_author, value: interaction.member?.toString()!, inline: true },
                        { name: lang.var_reason, value: reason || lang.var_no_set, inline: true }
                    )
                    .setFooter(await client.method.bot.footerBuilder(interaction))
            ],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });

        await client.method.iHorizonLogs.send(interaction, {
            title: lang.kick_logs_embed_title,
            description: lang.kick_logs_embed_description
                .replace(/\${member\.user}/g, member.user.toString())
                .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
        });
    },
};