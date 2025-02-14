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
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    GuildChannel,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    PermissionsBitField,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';

import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let channel = interaction.channel as BaseGuildTextChannel;

        try {
            if (!interaction.guild.channels.cache.get(channel.id)) {
                channel = (await interaction.guild.channels.fetch(channel.id)) as BaseGuildTextChannel;
            }

            let here = await channel.clone({
                name: channel.name,
                parent: channel.parent,
                permissionOverwrites: channel.permissionOverwrites.cache!,
                topic: (channel as BaseGuildTextChannel).topic!,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser!,
                reason: `Channel re-create by ${interaction.member.user} (${interaction.member.user.id})`
            });

            await here.setPosition(channel.rawPosition);
            await channel.delete();

            here.send({ content: lang.renew_channel_send_success.replace(/\${interaction\.user}/g, interaction.member.user.toString()) });
            return;
        } catch (error) {
            await client.method.interactionSend(interaction, { content: lang.renew_dont_have_permission });
            return;
        }
    },
};