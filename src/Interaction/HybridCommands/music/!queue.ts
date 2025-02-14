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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let player = client.player.getPlayer(interaction.guildId as string);

        if (!player) {
            await client.method.interactionSend(interaction, { content: lang.queue_iam_not_voicec });
            return;
        };

        // Check if the member is in the same voice channel as the bot
        if ((interaction.member as GuildMember).voice.channelId !== interaction.guild.members.me?.voice.channelId) {
            await client.method.interactionSend(interaction, {
                content: lang.music_cannot.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo),
            });
            return;
        }

        if (!player.queue.tracks) {
            await client.method.interactionSend(interaction, { content: lang.queue_no_queue });
            return;
        };

        let tracks = player.queue.tracks
            .map((track, idx) => `**${++idx})** [${track.info.title}](${track.info.uri})`)

        if (tracks.length === 0) {
            await client.method.interactionSend(interaction, { content: lang.queue_empty_queue });
            return;
        };

        let embeds: EmbedBuilder[] = [];
        let chunkSize = 10;
        let index = 0;
        while (tracks.length > 0) {
            let chunk = tracks.slice(0, chunkSize);
            let embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(lang.queue_embed_title)
                .setDescription(chunk.join('\n') || lang.queue_embed_description_empty)
                .setFooter({
                    text: lang.queue_embed_footer_text
                        .replace("{index}", (index + 1).toString())
                        .replace("{track}", player.queue.tracks.length.toString())
                });

            embeds.push(embed);
            tracks.splice(0, chunkSize);
            index++;
        };

        let message = await client.method.interactionSend(interaction, { embeds: [embeds[0]] }) as Message;

        if (embeds.length === 1) return;

        message.react('⬅️');
        message.react('➡️');

        let collector = message.createReactionCollector({
            filter: (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name as string) && user.id === interaction.member?.user.id,
            time: 60000
        });

        let currentIndex = 0;
        collector.on('collect', (reaction, user) => {
            switch (reaction.emoji.name) {
                case '⬅️':
                    if (currentIndex === 0) return;
                    currentIndex--;
                    break;
                case '➡️':
                    if (currentIndex === embeds.length - 1) return;
                    currentIndex++;
                    break;
                default:
                    break;
            }
            reaction.users.remove(user.id).catch(() => { });
            message.edit({ embeds: [embeds[currentIndex]] });
        });

        collector.on('end', () => {
            message.reactions.removeAll().catch(() => { });
        });
    },
};