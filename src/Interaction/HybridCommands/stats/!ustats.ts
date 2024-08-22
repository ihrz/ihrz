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
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Client,
    GuildMember,
    Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';
import { DatabaseStructure } from '../../../../types/database_structure';
import { readFileSync } from 'fs';
import path from 'path';

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
        let totalMessages: number = res.messages?.length || 0;

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

        function getChannelName(str: string): string {
            return interaction.guild?.channels.cache.get(str)?.name || "Deleted Channel"
        }

        function getChannelMessagesCount(channelId: string, msg: DatabaseStructure.StatsMessage[]) {
            return msg.filter(x => x.channelId === channelId).length || 0
        }

        function getChannelMinutesCount(channelId: string, voices: DatabaseStructure.StatsVoice[]): number {
            const totalDuration = voices
                .filter(voice => voice.channelId === channelId)
                .reduce((acc, voice) => {
                    const sessionDuration = voice.endTimestamp - voice.startTimestamp;
                    return acc + sessionDuration;
                }, 0);

            return Math.round(totalDuration / 1000 / 60);
        }

        calculateActiveChannels(res.messages || []);
        res.messages?.forEach((x) => calculateMessageTime(x));

        calculateActiveVoiceChannels(res.voices || []);
        res.voices?.forEach((v) => calculateVoiceActivity(v));

        var htmlContent = readFileSync(path.join(process.cwd(), "src", "assets", "userStatsPage.html"), 'utf-8');

        htmlContent = htmlContent
            .replaceAll("{author_username}", member.user.globalName || member.user.displayName)
            .replaceAll("{guild_name}", interaction.guild.name)
            .replaceAll("{messages_length}", String(totalMessages))
            .replaceAll("{voice_daily}", String(Math.round(dailyVoiceActivity / 1000 / 60)))
            .replaceAll("{voice_weekly}", String(Math.round(weeklyVoiceActivity / 1000 / 60)))
            .replaceAll("{voice_monthly}", String(Math.round(monthlyVoiceActivity / 1000 / 60)))
            .replaceAll("{message_daily}", String(dailyMessages.length))
            .replaceAll("{message_weekly}", String(weeklyMessage.length))
            .replaceAll("{message_monthly}", String(monthlyMessages.length))
            .replaceAll("{messages_top1}", String(getChannelName(firstActiveChannel)))
            .replaceAll("{messages_top2}", String(getChannelName(secondActiveChannel)))
            .replaceAll("{messages_top3}", String(getChannelName(thirdActiveChannel)))
            .replaceAll("{messages_top1_2}", String(getChannelMessagesCount(firstActiveChannel, res.messages || [])))
            .replaceAll("{messages_top2_2}", String(getChannelMessagesCount(secondActiveChannel, res.messages || [])))
            .replaceAll("{messages_top3_2}", String(getChannelMessagesCount(thirdActiveChannel, res.messages || [])))
            .replaceAll("{voice_top1}", String(getChannelName(firstActiveVoiceChannel)))
            .replaceAll("{voice_top2}", String(getChannelName(secondActiveVoiceChannel)))
            .replaceAll("{voice_top3}", String(getChannelName(thirdActiveVoiceChannel)))
            .replaceAll("{voice_top1_2}", String(getChannelMinutesCount(thirdActiveVoiceChannel, res.voices || [])))
            .replaceAll("{voice_top2_2}", String(getChannelMinutesCount(thirdActiveVoiceChannel, res.voices || [])))
            .replaceAll("{voice_top3_2}", String(getChannelMinutesCount(thirdActiveVoiceChannel, res.voices || [])))

        var image = await client.method.imageManipulation.html2Png(htmlContent);

        const attachment = new AttachmentBuilder(image, { name: "image.png" })

        await client.method.interactionSend(interaction, { files: [attachment] });
    },
};