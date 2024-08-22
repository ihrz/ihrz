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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    PermissionsBitField,
    TextChannel
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';
import { DatabaseStructure } from '../../../../types/database_structure';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let member: GuildMember;
        let user;

        if (interaction instanceof ChatInputCommandInteraction) {
            member = (interaction.options.getMember('member') || interaction.member) as GuildMember;
            user = interaction.user;
        } else {
            let _ = await client.method.checkCommandArgs(interaction, command, args!, data);
            if (!_) return;
            member = (client.method.member(interaction, args!, 0) || interaction.member) as GuildMember;
            user = interaction.author;
        }

        let res = await client.db.get(`${interaction.guildId}.STATS.USER.${member.user.id}`) as DatabaseStructure.UserStats | null;

        if (!res) {
            return;
        }

        let monthlyVoiceActivity = 0;
        let weeklyVoiceActivity = 0;
        let dailyVoiceActivity = 0;

        let monthlyMessages: DatabaseStructure.StatsMessage[] = [];
        let weeklyMessage: DatabaseStructure.StatsMessage[] = [];
        let dailyMessages: DatabaseStructure.StatsMessage[] = [];

        let nowTimestamp = Date.now();

        let dailyTimeout = 86_400_000; // 24 hours in ms
        let weeklyTimeout = 604_800_000; // One week in ms
        let monthlyTimeout = 2_592_000_000; // One month in ms

        let firstActiveVoiceChannel: string = "";
        let secondActiveVoiceChannel: string = "";
        let thirdActiveVoiceChannel: string = "";

        let firstActiveChannel: string = "";
        let secondActiveChannel: string = "";
        let thirdActiveChannel: string = "";

        function calculateMessageTime(msg: DatabaseStructure.StatsMessage) {
            if (msg.sentTimestamp >= nowTimestamp - dailyTimeout) {
                dailyMessages.push(msg);
            }
            if (msg.sentTimestamp >= nowTimestamp - weeklyTimeout) {
                weeklyMessage.push(msg);
            }
            if (msg.sentTimestamp >= nowTimestamp - monthlyTimeout) {
                monthlyMessages.push(msg);
            }
        }

        function calculateVoiceActivity(voice: DatabaseStructure.StatsVoice) {
            const sessionDuration = voice.endTimestamp - voice.startTimestamp;

            if (voice.endTimestamp >= nowTimestamp - dailyTimeout) {
                dailyVoiceActivity += sessionDuration;
            }
            if (voice.endTimestamp >= nowTimestamp - weeklyTimeout) {
                weeklyVoiceActivity += sessionDuration;
            }
            if (voice.endTimestamp >= nowTimestamp - monthlyTimeout) {
                monthlyVoiceActivity += sessionDuration;
            }
        }

        function calculateActiveChannels(messages: DatabaseStructure.StatsMessage[]) {
            const channelMessageCount: { [channelId: string]: number } = {};

            messages.forEach((msg) => {
                if (!channelMessageCount[msg.channelId]) {
                    channelMessageCount[msg.channelId] = 0;
                }
                channelMessageCount[msg.channelId]++;
            });

            const sortedChannels = Object.entries(channelMessageCount)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 3);

            firstActiveChannel = sortedChannels[0] ? sortedChannels[0][0] : "N/A";
            secondActiveChannel = sortedChannels[1] ? sortedChannels[1][0] : "N/A";
            thirdActiveChannel = sortedChannels[2] ? sortedChannels[2][0] : "N/A";
        }

        function calculateActiveVoiceChannels(voices: DatabaseStructure.StatsVoice[]) {
            const channelVoiceDuration: { [channelId: string]: number } = {};

            voices.forEach((voice) => {
                const sessionDuration = voice.endTimestamp - voice.startTimestamp;
                if (!channelVoiceDuration[voice.channelId]) {
                    channelVoiceDuration[voice.channelId] = 0;
                }
                channelVoiceDuration[voice.channelId] += sessionDuration;
            });

            const sortedVoiceChannels = Object.entries(channelVoiceDuration)
                .sort(([, durationA], [, durationB]) => durationB - durationA)
                .slice(0, 3);

            firstActiveVoiceChannel = sortedVoiceChannels[0] ? sortedVoiceChannels[0][0] : "N/A";
            secondActiveVoiceChannel = sortedVoiceChannels[1] ? sortedVoiceChannels[1][0] : "N/A";
            thirdActiveVoiceChannel = sortedVoiceChannels[2] ? sortedVoiceChannels[2][0] : "N/A";
        }

        calculateActiveChannels(res.messages);
        res.messages.forEach((x) => calculateMessageTime(x));

        calculateActiveVoiceChannels(res.voices);
        res.voices.forEach((v) => calculateVoiceActivity(v));

        var embed = new EmbedBuilder()
            .setColor("DarkGold")
            .setDescription(`User stats of ${member.toString()}`)
            .setFields(
                {
                    name: "Daily Messages",
                    value: String(dailyMessages.length),
                    inline: true
                },
                {
                    name: "Daily Voice Activity",
                    value: `${Math.round(dailyVoiceActivity / 1000 / 60)} minutes`, // Conversion en minutes
                    inline: true
                },
                {
                    name: "** **",
                    value: "** **",
                    inline: false
                },
                {
                    name: "Weekly Messages",
                    value: String(weeklyMessage.length),
                    inline: true
                },
                {
                    name: "Weekly Voice Activity",
                    value: `${Math.round(weeklyVoiceActivity / 1000 / 60)} minutes`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `** **`,
                    inline: false
                },
                {
                    name: "Monthly Messages",
                    value: String(monthlyMessages.length),
                    inline: true
                },
                {
                    name: "Monthly Voice Activity",
                    value: `${Math.round(monthlyVoiceActivity / 1000 / 60)} minutes`,
                    inline: true
                },
                {
                    name: "** **",
                    value: `** **`,
                    inline: false
                },
                {
                    name: "Top Active Channels (Message)",
                    value: `Top 1: <#${firstActiveChannel}>\nTop 2: <#${secondActiveChannel}>\nTop 3: <#${thirdActiveChannel}>`,
                    inline: true
                },
                {
                    name: "Top Active Channels (Voice)",
                    value: `Top 1: <#${firstActiveVoiceChannel}>\nTop 2: <#${secondActiveVoiceChannel}>\nTop 3: <#${thirdActiveVoiceChannel}>`,
                    inline: true
                }
            );

        await client.method.interactionSend(interaction, { embeds: [embed] });
    },
};