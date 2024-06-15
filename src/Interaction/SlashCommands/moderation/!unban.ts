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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.BanMembers)) {
            await interaction.editReply({
                content: data.unban_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };

        if (!interaction.guild?.members.me?.permissions.has([PermissionsBitField.Flags.BanMembers])) {
            await interaction.editReply({
                content: data.unban_bot_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            })
            return;
        };

        let userID = interaction.options.getString('userid');
        let reason = interaction.options.getString('reason');

        if (!reason) reason = data.unban_reason;

        await interaction.guild.bans.fetch()
            .then(async (bans) => {
                if (bans.size == 0) {
                    await interaction.editReply({
                        content: data.unban_there_is_nobody_banned.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                    });
                    return;
                }
                let bannedID = bans.find(ban => ban.user.id == userID);
                if (!bannedID) {
                    await interaction.editReply({
                        content: data.unban_the_member_is_not_banned.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                    });
                    return;
                };

                await interaction.guild?.bans.remove(userID as string, reason as string).catch(() => { });
                await interaction.editReply({
                    content: data.unban_is_now_unbanned
                        .replace(/\${userID}/g, userID as string)
                });
            })
            .catch((err: string) => logger.err(err));

        try {
            let logEmbed = new EmbedBuilder().setColor("#bf0bb9").setTitle(data.unban_logs_embed_title)
                .setDescription(data.unban_logs_embed_description
                    .replace(/\${userID}/g, userID as string)
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                )
            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
            };
        } catch (e: any) {
            logger.err(e);
        };
    },
};
