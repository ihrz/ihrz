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
    Guild,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        try {
            let queue = interaction.client.player.nodes.get(interaction.guild as Guild);

            if (!queue || !queue.isPlaying()) {
                await interaction.deleteReply();    
                await interaction.followUp({ content: data.stop_nothing_playing, ephemeral: true });
                return;
            };

            interaction.client.player.nodes.delete(interaction.guild?.id as string);
            await interaction.editReply({ content: data.stop_command_work });
            return;
        } catch (error: any) {
            logger.err(error);
        };
    },
};