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

import { LanguageData } from '../../../../types/languageData.js';
import { axios } from '../../../core/functions/axios.js';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        axios.get('https://dog.ceo/api/breeds/image/random')
            .then(async res => {
                let emb = new EmbedBuilder()
                    .setImage(res.data.message).setTitle(data.dogs_embed_title).setTimestamp();

                await interaction.editReply({ embeds: [emb] });
                return;
            })
            .catch(async err => {
                logger.err(err);
                await interaction.editReply({ content: data.dogs_embed_command_error });
                return;
            });
    },
};