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
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var role = interaction.options.getRole("role");
        } else {

            var role = client.func.method.role(interaction, args!, 0);
        };

        interaction.guild.channels.cache.forEach((c) => {
            if (c.type === ChannelType.GuildText) {
                c.permissionOverwrites.create(role?.id || interaction.guild?.roles.everyone.id!, { SendMessages: false });
            };
        });


        await client.func.ihorizon_logs(interaction, {
            title: lang.lockall_logs_embed_title,
            description: lang.lockall_logs_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
        });

        await client.func.method.interactionSend(interaction, {
            content: lang.lockall_embed_message_description
                .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
        });
        return;
    },
};