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
    GuildMember,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        let voiceChannel = (interaction.member as GuildMember).voice.channel;
        let player = client.player.getPlayer(interaction.guildId as string);

        if (!player || !player.playing || !voiceChannel) {
            await interaction.editReply({ content: data.shuffle_no_queue });
            return;
        };

        if (player.queue.tracks.length < 2) {
            await interaction.editReply({ content: data.shuffle_no_enought });
            return;
        };

        await player.queue.shuffle();

        await interaction.editReply({ content: data.shuffle_command_work });
        return;
    },
};