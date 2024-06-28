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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ChannelType,
    ChatInputCommandInteraction,
    GuildChannel,
    GuildTextBasedChannel,
    BaseGuildTextChannel,
    Message,
    MessagePayload,
    InteractionEditReplyOptions,
    MessageReplyOptions,
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

async function interactionSend(interaction: ChatInputCommandInteraction | Message, options: string | MessageReplyOptions | InteractionEditReplyOptions): Promise<Message> {
    if (interaction instanceof ChatInputCommandInteraction) {
        const editOptions: InteractionEditReplyOptions = typeof options === 'string' ? { content: options } : options;
        return await interaction.editReply(editOptions);
    } else {
        let replyOptions: MessageReplyOptions;

        if (typeof options === 'string') {
            replyOptions = { content: options, allowedMentions: { repliedUser: false } };
        } else {
            replyOptions = {
                ...options,
                allowedMentions: { repliedUser: false },
                content: options.content ?? undefined
            } as MessageReplyOptions;
        }

        return await interaction.reply(replyOptions);
    }
}

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await interactionSend(interaction, { content: data.lockall_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo) });
            return;
        };

        interaction.guild.channels.cache.forEach((c) => {
            if (c.type === ChannelType.GuildText) {
                c.permissionOverwrites.create(interaction.guildId as string, { SendMessages: false })
            };
        });

        let Lockembed = new EmbedBuilder()
            .setColor("#5b3475")
            .setTimestamp()
            .setDescription(data.lockall_embed_message_description
                .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
            );

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.lockall_logs_embed_title)
                .setDescription(data.lockall_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
                );

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
            };
        } catch (e: any) {
            logger.err(e)
        };

        await interactionSend(interaction, { embeds: [Lockembed] });
        return;
    },
};