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
} from 'discord.js';

import { useQueue } from 'discord-player';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let queue = useQueue(interaction.guildId);

        if (!queue) return interaction.editReply({ content: data.queue_iam_not_voicec })
        if (!queue.tracks || !queue.currentTrack) {
            return interaction.editReply({ content: data.queue_no_queue })
        };

        let tracks = queue.tracks
            .toArray()
            .map((track, idx) => `**${++idx})** [${track.title}](${track.url})`)

        if (tracks.length === 0) {
            return interaction.editReply({ content: data.queue_empty_queue })
        };

        let embeds: any[] = [];
        let chunkSize = 10;
        let index = 0;
        while (tracks.length > 0) {
            let chunk = tracks.slice(0, chunkSize);
            let embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(data.queue_embed_title)
                .setDescription(chunk.join('\n') || data.queue_embed_description_empty)
                .setFooter({
                    text: data.queue_embed_footer_text
                        .replace("{index}", index + 1)
                        .replace("{track}", queue.tracks.size)
                });

            embeds.push(embed);
            tracks.splice(0, chunkSize);
            index++;
        };

        let message = await interaction.editReply({
            embeds: [embeds[0]],
            fetchReply: true
        })

        if (embeds.length === 1) return;

        message.react('⬅️');
        message.react('➡️');

        let collector = message.createReactionCollector({
            filter: (reaction: { emoji: { name: string; }; }, user: { id: any; }) =>
                ['⬅️', '➡️'].includes(reaction.emoji.name) &&
                user.id === interaction.user.id,
            time: 60000
        });

        let currentIndex = 0;
        collector.on('collect', (reaction: { emoji: { name: any; }; users: { remove: (arg0: any) => Promise<any>; }; }, user: { id: any; }) => {
            switch (reaction.emoji.name) {
                case '⬅️':
                    if (currentIndex === 0) return
                    currentIndex--;
                    break;
                case '➡️':
                    if (currentIndex === embeds.length - 1) return
                    currentIndex++;
                    break;
                default:
                    break;
            }

            reaction.users.remove(user.id).catch(() => {
            });

            message.edit({ embeds: [embeds[currentIndex]] });
        });

        collector.on('end', () => {
            message.reactions.removeAll().catch(() => {
            });
        });
    },
};