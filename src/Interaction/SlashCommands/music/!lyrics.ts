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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'pwss';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        try {
            client.lyricsSearcher.search(interaction.options.getString("query")!)
                .then(async response => {
                    let trimmedLyrics = response?.lyrics?.substring(0, 1997);

                    let embed = new EmbedBuilder()
                        .setTitle(response?.title || data.lyrics_embed_title_unknown)
                        .setURL(response?.url!)
                        .setTimestamp()
                        .setThumbnail(response?.thumbnail!)
                        .setAuthor({
                            name: response?.artist.name || data.lyrics_embed_author_name_unknown,
                            iconURL: response?.artist.image,
                            url: response?.artist.url
                        })
                        .setDescription(trimmedLyrics?.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics ?? 'null')
                        .setColor('#cd703a')
                        .setFooter({ text: await client.func.displayBotName(interaction.guild?.id), iconURL: "attachment://icon.png" });

                    await interaction.editReply({
                        embeds: [embed],
                        files: [
                            {
                                attachment: await interaction.client.func.image64(interaction.client.user?.displayAvatarURL()),
                                name: 'icon.png'
                            }
                        ]
                    });
                    return;
                })
                .catch(async err => {
                    await interaction.deleteReply();
                    await interaction.followUp({ content: data.lyrics_not_found, ephemeral: true });
                    return;
                });

        } catch (error: any) {
            logger.err(error);
        };
    },
};