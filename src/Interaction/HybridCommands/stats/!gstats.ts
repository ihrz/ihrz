/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Client,
    GuildMember,
    Message,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import {
    calculateActiveChannels,
    calculateActiveVoiceChannels,
    calculateMessageTime,
    calculateVoiceActivity,
    getChannelMessagesCount,
    getChannelMinutesCount,
    getChannelName,
    getStatsLeaderboard,
} from "../../../core/functions/userStatsUtils.js";

type MemberStats = {
    dailyMessages: number,
    weeklyMessages: number,
    monthlyMessages: number,
    dailyVoice: number,
    weeklyVoice: number,
    monthlyVoice: number
};

type ChannelStats = {
    dailyMessages: number,
    weeklyMessages: number,
    monthlyMessages: number,
    dailyVoice: number,
    weeklyVoice: number,
    monthlyVoice: number
};

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        if (!client.user || !interaction.guild || !interaction.channel) return;

        let leaderboardData: {
            member: User | undefined,
            dailyMessages: number,
            weeklyMessages: number,
            monthlyMessages: number,
            dailyVoiceActivity: number,
            weeklyVoiceActivity: number,
            monthlyVoiceActivity: number
        }[] = [];

        const nowTimestamp = Date.now();
        const dailyTimeout = 86_400_000;
        const weeklyTimeout = 604_800_000;
        const monthlyTimeout = 2_592_000_000;

        const res = await client.db.get(`${interaction.guildId}.STATS`) as DatabaseStructure.GuildStats | null;

        let memberStats: { [memberId: string]: MemberStats } = {};
        let channelStats: { [channelId: string]: ChannelStats } = {};

        let allMessages: DatabaseStructure.StatsMessage[] = [];
        let allVoiceActivities: DatabaseStructure.StatsVoice[] = [];

        for (let memberId in res?.USER) {
            let userData = res.USER[memberId];
            let dailyMessages = 0, weeklyMessages = 0, monthlyMessages = 0;
            let dailyVoice = 0, weeklyVoice = 0, monthlyVoice = 0;

            allMessages = [...allMessages, ...userData.messages || []];
            allVoiceActivities = [...allVoiceActivities, ...userData.voices || []];

            let user = client.users.cache.get(memberId);

            userData.messages?.forEach(message => {
                if (nowTimestamp - message.sentTimestamp <= dailyTimeout) {
                    dailyMessages++;
                }
                if (nowTimestamp - message.sentTimestamp <= weeklyTimeout) {
                    weeklyMessages++;
                }
                if (nowTimestamp - message.sentTimestamp <= monthlyTimeout) {
                    monthlyMessages++;
                }

                if (!channelStats[message.channelId]) {
                    channelStats[message.channelId] = { dailyMessages: 0, weeklyMessages: 0, monthlyMessages: 0, dailyVoice: 0, weeklyVoice: 0, monthlyVoice: 0 };
                }

                channelStats[message.channelId].dailyMessages += nowTimestamp - message.sentTimestamp <= dailyTimeout ? 1 : 0;
                channelStats[message.channelId].weeklyMessages += nowTimestamp - message.sentTimestamp <= weeklyTimeout ? 1 : 0;
                channelStats[message.channelId].monthlyMessages += nowTimestamp - message.sentTimestamp <= monthlyTimeout ? 1 : 0;
            });

            userData.voices?.forEach(voice => {
                let voiceDuration = voice.endTimestamp - voice.startTimestamp;
                if (nowTimestamp - voice.endTimestamp <= dailyTimeout) {
                    dailyVoice += voiceDuration;
                }
                if (nowTimestamp - voice.endTimestamp <= weeklyTimeout) {
                    weeklyVoice += voiceDuration;
                }
                if (nowTimestamp - voice.endTimestamp <= monthlyTimeout) {
                    monthlyVoice += voiceDuration;
                }

                if (!channelStats[voice.channelId]) {
                    channelStats[voice.channelId] = { dailyMessages: 0, weeklyMessages: 0, monthlyMessages: 0, dailyVoice: 0, weeklyVoice: 0, monthlyVoice: 0 };
                }

                channelStats[voice.channelId].dailyVoice += nowTimestamp - voice.endTimestamp <= dailyTimeout ? voiceDuration : 0;
                channelStats[voice.channelId].weeklyVoice += nowTimestamp - voice.endTimestamp <= weeklyTimeout ? voiceDuration : 0;
                channelStats[voice.channelId].monthlyVoice += nowTimestamp - voice.endTimestamp <= monthlyTimeout ? voiceDuration : 0;
            });

            leaderboardData.push({
                member: user,
                dailyMessages: dailyMessages,
                weeklyMessages: weeklyMessages,
                monthlyMessages: monthlyMessages,
                dailyVoiceActivity: dailyVoice,
                weeklyVoiceActivity: weeklyVoice,
                monthlyVoiceActivity: monthlyVoice
            });

            memberStats[memberId] = { dailyMessages, weeklyMessages, monthlyMessages, dailyVoice, weeklyVoice, monthlyVoice };
        }

        function topThree(obj: { [key: string]: { [statKey: string]: number } }, key: string) {
            return Object.entries(obj)
                .sort(([, a], [, b]) => (b[key] as number) - (a[key] as number))
                .slice(0, 3)
                .map(([id, stats]) => ({ id, ...(stats as object) }));
        }

        let [firstActiveChannel, secondActiveChannel, thirdActiveChannel] = topThree(channelStats, 'dailyMessages').map(item => item.id);
        let [firstActiveVoiceChannel, secondActiveVoiceChannel, thirdActiveVoiceChannel] = topThree(channelStats, 'dailyVoice').map(item => item.id);

        var htmlContent = client.htmlfiles['guildStatsLeaderboard'];
        leaderboardData = getStatsLeaderboard(leaderboardData)

        htmlContent = htmlContent
            .replaceAll('{header_h1_value}', lang.header_h1_value)
            .replaceAll("{guild_pfp}", interaction.guild.iconURL({ size: 512 }) || client.user.displayAvatarURL({ size: 512 }))
            .replaceAll("{author_username}", interaction.guild.name)
            .replaceAll('{top_message_users}', leaderboardData.map((user, index) => `
        <div class="list-item">
            <div class="user-info">
                <span>${index + 1}. @${user.member?.username}</span>
            </div>
            <div class="activity-stats">
                <div>
                    <span class="badge">1d</span>
                    <span>${user.dailyMessages} ${lang.messages_word}, ${(user.dailyVoiceActivity / 1000 / 60).toFixed(2)} ${lang.minutes_word}</span>
                </div>
                <div>
                    <span class="badge">7d</span>
                    <span>${user.weeklyMessages} ${lang.messages_word}, ${(user.weeklyVoiceActivity / 1000 / 60).toFixed(2)} ${lang.minutes_word}</span>
                </div>
                <div>
                    <span class="badge">30d</span>
                    <span>${user.monthlyMessages} ${lang.messages_word}, ${(user.monthlyVoiceActivity / 1000 / 60).toFixed(2)} ${lang.minutes_word}</span>
                </div>
            </div>
        </div>
        `).join(''))
            .replaceAll('{top_text_channels}', `
        <div class="list-item">
            <span># ${getChannelName(interaction.guild, firstActiveChannel)}</span>
            <span>${getChannelMessagesCount(firstActiveChannel, allMessages)} ${lang.messages_word}</span>
        </div>
        <div class="list-item">
            <span># ${getChannelName(interaction.guild, secondActiveChannel)}</span>
            <span>${getChannelMessagesCount(secondActiveChannel, allMessages)} ${lang.messages_word}</span>
        </div>
        <div class="list-item">
            <span># ${getChannelName(interaction.guild, thirdActiveChannel)}</span>
            <span>${getChannelMessagesCount(thirdActiveChannel, allMessages)} ${lang.messages_word}</span>
        </div>
        `)
            .replaceAll('{top_voice_channels}', `
        <div class="list-item">
            <span># ${getChannelName(interaction.guild, firstActiveVoiceChannel)}</span>
            <span>${getChannelMinutesCount(firstActiveVoiceChannel, allVoiceActivities)} ${lang.minutes_word}</span>
        </div>
        <div class="list-item">
            <span># ${getChannelName(interaction.guild, secondActiveVoiceChannel)}</span>
            <span>${getChannelMinutesCount(secondActiveVoiceChannel, allVoiceActivities)} ${lang.minutes_word}</span>
        </div>
        <div class="list-item">
            <span># ${getChannelName(interaction.guild, thirdActiveVoiceChannel)}</span>
            <span>${getChannelMinutesCount(thirdActiveVoiceChannel, allVoiceActivities)} ${lang.minutes_word}</span>
        </div>
        `);

        const image = await client.func.html2png(htmlContent, {
            width: 1902,
            height: 1080,
            scaleSize: 2,
            elementSelector: '.container',
            omitBackground: true,
            selectElement: true,
        });

        const attachment = new AttachmentBuilder(image, { name: 'image.png' });

        await client.func.method.interactionSend(interaction, { files: [attachment] });
    },
};
