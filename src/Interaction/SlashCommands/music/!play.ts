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
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let voiceChannel = (interaction.member as GuildMember)?.voice.channel;
        let check = interaction.options.getString("title");

        if (!voiceChannel) {
            await interaction.editReply({ content: data.p_not_in_voice_channel });
            return;
        };

        if (client.functions.isAllowedLinks(check)) {
            return interaction.editReply({ content: data.p_not_allowed })
        };

        let result = await client.player.search(check as string, interaction.user);

        if (!result) {
            let results = new EmbedBuilder()
                .setTitle(data.p_embed_title)
                .setColor('#ff0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [results] });
            return;
        };

        const player = client.player.create({
            guild: interaction.guild?.id as string,
            voiceChannel: voiceChannel.id,
            textChannel: interaction.channel?.id as string,
        });

        player.connect();
        player.queue.add(result.tracks[0]);

        if (
            !player.playing
            && !player.paused
            && !player.queue.size
        ) player.play();

        function timeCalcultator() {
            let totalDurationMs = yes.duration
            let totalDurationSec = Math.floor(totalDurationMs! / 1000);
            let hours = Math.floor(totalDurationSec / 3600);
            let minutes = Math.floor((totalDurationSec % 3600) / 60);
            let seconds = totalDurationSec % 60;
            let durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            return durationStr;
        };

        let yes = result.tracks[0];

        let embed = new EmbedBuilder()
            .setDescription(`**${yes.title}**`)
            .setColor('#00cc1a')
            .setTimestamp()
            .setFooter({ text: data.p_duration + `${timeCalcultator()}` })
            .setThumbnail(yes.thumbnail);

        await interaction.editReply({
            content: data.p_loading_message
                .replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
                .replace("{result}", result.playlist ? 'playlist' : 'track')
            , embeds: [embed]
        });

        function deleteContent() {
            interaction.editReply({ content: ' ' });
        };

        setTimeout(deleteContent, 4000)
        return;
    },
};