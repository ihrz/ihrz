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
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
} from 'discord.js';

import { QueryType } from 'discord-player';
import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {

    name: 'play',

    description: 'Play a song!',
    description_localizations: {
        "fr": "Jouer une musique!"
    },

    options: [
        {
            name: 'title',
            type: ApplicationCommandOptionType.String,

            description: 'The track title you want (you can put URL as you want)',
            description_localizations: {
                "fr": "Titre de la musique (URL si vous le voulez)"
            },

            required: true
        }
    ],
    thinking: true,
    category: 'music',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        let voiceChannel = (interaction.member as GuildMember)?.voice.channel;
        let check = args.join(" ");

        if (!voiceChannel) {
            await interaction.reply({ content: data.p_not_in_voice_channel });
            return;
        };

        if (client.functions.isAllowedLinks(check)) { return interaction.reply({ content: data.p_not_allowed }) };

        let result = await interaction.client.player.search(check as string, {
            requestedBy: interaction.author, searchEngine: QueryType.AUTO
        });

        let results = new EmbedBuilder()
            .setTitle(data.p_embed_title)
            .setColor('#ff0000')
            .setTimestamp();

        if (!result.hasTracks()) {
            await interaction.reply({ embeds: [results] });
            return;
        };

        let yes = await interaction.client.player.play((interaction.member as GuildMember).voice.channel?.id as GuildVoiceChannelResolvable, result, {
            nodeOptions: {
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild?.members.me,
                    requestedBy: interaction.author.globalName
                },
                volume: 60,
                bufferingTimeout: 3000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 150000,
                leaveOnStop: true,
                leaveOnStopCooldown: 30000,
                leaveOnEmpty: true,
            },
        });

        function yess() {
            let totalDurationMs = yes.track.playlist?.tracks.reduce((a, c) => c.durationMS + a, 0)
            let totalDurationSec = Math.floor(totalDurationMs! / 1000);
            let hours = Math.floor(totalDurationSec / 3600);
            let minutes = Math.floor((totalDurationSec % 3600) / 60);
            let seconds = totalDurationSec % 60;
            let durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            return durationStr;
        };

        let embed = new EmbedBuilder()
            .setDescription(`${yes.track.playlist ? `**multiple tracks** from: **${yes.track.playlist.title}**` : `**${yes.track.title}**`}`)
            .setColor('#00cc1a')
            .setTimestamp()
            .setFooter({ text: data.p_duration + `${yes.track.playlist ? `${yess()}` : `${yes.track.duration}`}` });

        embed
            .setThumbnail(`${yes.track.playlist ? `${yes.track.playlist.thumbnail}` : `${yes.track.thumbnail}`}`)

        await interaction.reply({
            content: data.p_loading_message
                .replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
                .replace("{result}", result.playlist ? 'playlist' : 'track')
            , embeds: [embed]
        });
        return;
    },
};