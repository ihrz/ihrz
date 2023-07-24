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
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import { lyricsExtractor } from '@discord-player/extractor';

const lyricsFinder = lyricsExtractor();

export const command: Command = {
    name: 'lyrics',
    description: 'Find the lyrics of a title!',
    options: [
        {
            name: 'title',
            type: ApplicationCommandOptionType.String,
            description: 'The track title you want (you can put URL as you want)',
            required: true
        }
    ],
    category: 'music',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        try {
            const title = interaction.options.getString("title");
            const lyrics = await lyricsFinder.search(title).catch(() => null);

            if (!lyrics) return interaction.reply({ content: 'No lyrics found', ephemeral: true });
            const trimmedLyrics = lyrics.lyrics.substring(0, 1997);

            const embed = new EmbedBuilder()
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

            return interaction.reply({ embeds: [embed] });

        } catch (error: any) {
            logger.err(error);
        }
    },
};