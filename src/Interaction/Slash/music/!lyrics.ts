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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js';

import logger from '../../../core/logger';
import { lyricsExtractor } from '@discord-player/extractor';

let lyricsFinder = lyricsExtractor();

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: any) => {

        try {
            let title = interaction.options.getString("title");
            let lyrics = await lyricsFinder.search(title as string).catch(() => null);

            if (!lyrics) {
                await interaction.deleteReply();    
                await interaction.followUp({ content: 'No lyrics found', ephemeral: true });
                return;
            }
            let trimmedLyrics = lyrics.lyrics.substring(0, 1997);

            let embed = new EmbedBuilder()
                .setTitle(lyrics.title)
                .setURL(lyrics.url)
                .setTimestamp()
                .setThumbnail(lyrics.thumbnail)
                .setAuthor({
                    name: lyrics.artist.name,
                    iconURL: lyrics.artist.image,
                    url: lyrics.artist.url
                })
                .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
                .setColor('#cd703a')
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed] });
            return;

        } catch (error: any) {
            logger.err(error);
        };
    },
};