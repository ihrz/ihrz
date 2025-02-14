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
    Message,
    PermissionsBitField,
    TextChannel
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var channel = interaction.options.getChannel('channel') as BaseGuildTextChannel | null;
        } else {

            var channel = await client.method.channel(interaction, args!, 0) as BaseGuildTextChannel | null;
        }

        let fetch = await client.db.get(`${interaction.guildId}.PFPS.disable`);

        if (!fetch && channel) {
            await client.db.set(`${interaction.guildId}.PFPS.channel`, channel.id);

            let embed = new EmbedBuilder()
                .setColor('#333333')
                .setTitle(lang.pfps_channel_embed_title)
                .setDescription(lang.pfps_channel_embed_desc
                    .replace('${interaction.user}', interaction.member.user.toString())
                )
                .setTimestamp();

            await client.method.interactionSend(interaction, {
                content: lang.pfps_channel_command_work
                    .replace('${interaction.user}', interaction.member.user.toString())
                    .replace('${channel}', channel.toString())
            });

            client.method.channelSend(channel, { embeds: [embed] });
            return;

        } else {
            await client.method.interactionSend(interaction, {
                content: lang.pfps_channel_command_error
                    .replace('${interaction.user}', interaction.member.user.toString())
            });
            return;
        };
    },
};