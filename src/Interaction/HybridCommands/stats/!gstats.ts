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
import {
    calculateActiveChannels,
    calculateActiveVoiceChannels,
    calculateMessageTime,
    calculateVoiceActivity,
    getChannelMessagesCount,
    getChannelMinutesCount,
    getChannelName,
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

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        if (!client.user || !interaction.guild || !interaction.channel) return;

        let leaderboardData: {
            member: GuildMember,
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

        // Calcul des statistiques des membres et des canaux
        for (let memberId in res?.USER) {
            let userData = res.USER[memberId];
            let dailyMessages = 0, weeklyMessages = 0, monthlyMessages = 0;
            let dailyVoice = 0, weeklyVoice = 0, monthlyVoice = 0;

            allMessages = [...allMessages, ...userData.messages || []];
            allVoiceActivities = [...allVoiceActivities, ...userData.voices || []];

            let member = interaction.guild.members.cache.get(memberId);

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

                // Mise à jour des statistiques de canal
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

                // Mise à jour des statistiques de canal vocal
                if (!channelStats[voice.channelId]) {
                    channelStats[voice.channelId] = { dailyMessages: 0, weeklyMessages: 0, monthlyMessages: 0, dailyVoice: 0, weeklyVoice: 0, monthlyVoice: 0 };
                }

                channelStats[voice.channelId].dailyVoice += nowTimestamp - voice.endTimestamp <= dailyTimeout ? voiceDuration : 0;
                channelStats[voice.channelId].weeklyVoice += nowTimestamp - voice.endTimestamp <= weeklyTimeout ? voiceDuration : 0;
                channelStats[voice.channelId].monthlyVoice += nowTimestamp - voice.endTimestamp <= monthlyTimeout ? voiceDuration : 0;
            });

            leaderboardData.push({
                member: member!,
                dailyMessages: dailyMessages,
                weeklyMessages: weeklyMessages,
                monthlyMessages: monthlyMessages,
                dailyVoiceActivity: dailyVoice,
                weeklyVoiceActivity: weeklyVoice,
                monthlyVoiceActivity: monthlyVoice
            });

            memberStats[memberId] = { dailyMessages, weeklyMessages, monthlyMessages, dailyVoice, weeklyVoice, monthlyVoice };
        }

        // Fonction pour obtenir le top 3 des canaux
        function topThree(obj: { [key: string]: { [statKey: string]: number } }, key: string) {
            return Object.entries(obj)
                .sort(([, a], [, b]) => (b[key] as number) - (a[key] as number))
                .slice(0, 3)
                .map(([id, stats]) => ({ id, ...(stats as object) }));
        }

        // Obtenir les meilleurs canaux pour les messages et l'activité vocale
        let [firstActiveChannel, secondActiveChannel, thirdActiveChannel] = topThree(channelStats, 'dailyMessages').map(item => item.id);
        let [firstActiveVoiceChannel, secondActiveVoiceChannel, thirdActiveVoiceChannel] = topThree(channelStats, 'dailyVoice').map(item => item.id);

        console.log(topThree(channelStats, 'dailyVoice'))
        var htmlContent = readFileSync(path.join(process.cwd(), 'src', 'assets', 'guildStatsLeaderboard.html'), 'utf-8');

        htmlContent = htmlContent
            .replaceAll('{header_h1_value}', data.header_h1_value)
            .replaceAll("{guild_pfp}", interaction.guild.iconURL({ size: 512 }) || client.user.displayAvatarURL({ size: 512 }))
            .replaceAll("{author_username}", interaction.guild.name)
            .replaceAll('{top_message_users}', leaderboardData.map((user, index) => `
            <div class="list-item">
                <span>${index + 1}. @${user.member.user.username}</span>
                <span>1d: ${user.dailyMessages} ${data.messages_word}, 7d: ${user.weeklyMessages} ${data.messages_word}, 30d: ${user.monthlyMessages} ${data.messages_word}</span>
            </div>
        `).join(''))
            .replaceAll('{top_text_channels}', `
            <div class="list-item">
                <span># ${getChannelName(interaction.guild, firstActiveChannel)}</span>
                <span>${getChannelMessagesCount(firstActiveChannel, allMessages)} ${data.messages_word}</span>
            </div>
            <div class="list-item">
                <span># ${getChannelName(interaction.guild, secondActiveChannel)}</span>
                <span>${getChannelMessagesCount(secondActiveChannel, allMessages)} ${data.messages_word}</span>
            </div>
            <div class="list-item">
                <span># ${getChannelName(interaction.guild, thirdActiveChannel)}</span>
                <span>${getChannelMessagesCount(thirdActiveChannel, allMessages)} ${data.messages_word}</span>
            </div>
        `)
            .replaceAll('{top_voice_channels}', `
            <div class="list-item">
                <span># ${getChannelName(interaction.guild, firstActiveVoiceChannel)}</span>
                <span>${getChannelMinutesCount(firstActiveVoiceChannel, allVoiceActivities)} ${data.minutes_word}</span>
            </div>
            <div class="list-item">
                <span># ${getChannelName(interaction.guild, secondActiveVoiceChannel)}</span>
                <span>${getChannelMinutesCount(secondActiveVoiceChannel, allVoiceActivities)} ${data.minutes_word}</span>
            </div>
            <div class="list-item">
                <span># ${getChannelName(interaction.guild, thirdActiveVoiceChannel)}</span>
                <span>${getChannelMinutesCount(thirdActiveVoiceChannel, allVoiceActivities)} ${data.minutes_word}</span>
            </div>
        `);

        const image = await client.method.imageManipulation.html2Png(htmlContent, {
            width: 1280,
            height: 720,
            scaleSize: 2,
            elementSelector: '.container',
            omitBackground: true,
            selectElement: true,
        });

        const attachment = new AttachmentBuilder(image, { name: 'image.png' });

        await client.method.interactionSend(interaction, { files: [attachment] });
    },
};
