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

import logger from '../../core/logger';
import { QueueRepeatMode } from 'discord-player';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: any) => {

        try {
            let queue = interaction.client.player.nodes.get(interaction.guild as Guild);

            if (!queue || !queue.isPlaying()) {
                await interaction.editReply({ content: data.loop_no_queue });
                return;
            };

            let loopMode = interaction.options.getNumber("select");

            queue.setRepeatMode(loopMode as number)
            let mode = loopMode === QueueRepeatMode.TRACK ? `🔂` : loopMode === QueueRepeatMode.QUEUE ? `🔂` : `▶`;

            await interaction.editReply({
                content: data.loop_command_work
                    .replace("{mode}", mode)
            });
            return;
        } catch (error: any) {
            logger.err(error);
        };
    },
};