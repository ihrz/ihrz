/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

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
    CommandInteractionOptionResolver,
    Guild,
    GuildMember,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        try {
            let voiceChannel = (interaction.member as GuildMember).voice.channel;
            let player = client.player.getPlayer(interaction.guildId as string);
            let mode = interaction.options.getString('mode');

            if (!player || !player.playing || !voiceChannel) {
                await interaction.editReply({ content: data.loop_no_queue });
                return;
            };

            await player.setRepeatMode(mode as "off" | "track" | "queue");

            await interaction.editReply({
                content: data.loop_command_work
                    .replace("{mode}", mode === 'track' ? `🔂` : `▶`)
            });
            return;
        } catch (error: any) {
            logger.err(error);
        };
    },
};