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
    ApplicationCommandType,
    BaseGuildTextChannel,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    MessageContextMenuCommandInteraction,
    time,
} from 'pwss';

import { SearchResult, UnresolvedSearchResult } from 'lavalink-client/dist/types/index.js';
import { AnotherCommand } from '../../../types/anotherCommand.js';
import { LanguageData } from '../../../types/languageData.js';

export const command: AnotherCommand = {
    name: "Play it in a voice channel",
    type: ApplicationCommandType.Message,
    thinking: true,
    run: async (client: Client, interaction: MessageContextMenuCommandInteraction) => {

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let voiceChannel = (interaction.member as GuildMember)?.voice.channel;

        let msg = interaction.options.getMessage("message") as Message;
        let check: string[] = [];

        if (msg && msg.attachments.size >= 1) {
            msg.attachments.forEach(content => check.push(content.url));
        } else {
            check.push(msg.content);
        };

        if (!voiceChannel) {
            await interaction.editReply({ content: data.p_not_in_voice_channel });
            return;
        };

        if (!client.func.isAllowedLinks(msg?.content)) {
            return interaction.editReply({ content: data.p_not_allowed })
        };

        let player = client.player.createPlayer({
            guildId: interaction.guildId as string,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
        });

        let all_res: (SearchResult | UnresolvedSearchResult)[] = [];

        for (let trackUrl of check) {
            let res = await player.search({ query: trackUrl }, interaction.user);
            all_res.push(res);

            if (res.tracks.length === 0) {
                let results = new EmbedBuilder()
                    .setTitle(data.p_embed_title)
                    .setColor('#ff0000')
                    .setTimestamp();

                await interaction.editReply({ embeds: [results] });
                return;
            }

            await player.queue.add(res.tracks[0]);

            let channel = client.channels.cache.get(player.textChannelId!);

            (channel as BaseGuildTextChannel)?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(2829617)
                        .setDescription(data.event_mp_audioTrackAdd
                            .replace("${client.iHorizon_Emojis.icon.Music_Icon}", client.iHorizon_Emojis.icon.Music_Icon)
                            .replace("${track.title}", res.tracks[0].info.title as string)
                        )
                ]
            });
        }

        if (!player.connected) {
            await player.connect();
        };

        if (!player.playing) {
            await player.play();
        };

        let yes = all_res[0];

        function timeCalcultator() {
            let totalDurationMs = yes.tracks[0].info.duration;
            let totalDurationSec = Math.floor(totalDurationMs! / 1000);
            let hours = Math.floor(totalDurationSec / 3600);
            let minutes = Math.floor((totalDurationSec % 3600) / 60);
            let seconds = totalDurationSec % 60;
            let durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            return durationStr;
        };

        let embed = new EmbedBuilder()
            .setDescription(`**${yes.tracks[0].info.title}**`)
            .setColor('#00cc1a')
            .setTimestamp()
            .setFooter({ text: data.p_duration + `${timeCalcultator()}` })
            .setThumbnail(yes.tracks[0].info.artworkUrl as string);

        await interaction.editReply({
            content: data.p_loading_message
                .replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
                .replace("{result}", yes.playlist ? 'playlist' : 'track')
            , embeds: [embed]
        });

        function deleteContent() {
            interaction.editReply({ content: null });
        };

        await client.db.push(`${player.guildId}.MUSIC_HISTORY.buffer`,
            `[${(new Date()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}: PLAYED]: { ${yes.tracks[0]?.requester} - ${yes.tracks[0].info.title as string} | ${yes.tracks[0].info.uri} } by ${yes.tracks[0]?.requester}`);
        await client.db.push(`${player.guildId}.MUSIC_HISTORY.embed`,
            `${time(new Date(), 'R')}: ${yes.tracks[0]?.requester} - ${yes.tracks[0].info.title} | ${yes.tracks[0].info.uri} by ${yes.tracks[0]?.requester}`
        );

        setTimeout(deleteContent, 4000)
    },
}; 
