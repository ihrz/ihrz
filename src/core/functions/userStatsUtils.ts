import { Guild } from 'discord.js';
import { DatabaseStructure } from '../../../types/database_structure';

export function calculateMessageTime(
    msg: DatabaseStructure.StatsMessage,
    nowTimestamp: number,
    dailyTimeout: number,
    weeklyTimeout: number,
    monthlyTimeout: number,
    dailyMessages: DatabaseStructure.StatsMessage[],
    weeklyMessage: DatabaseStructure.StatsMessage[],
    monthlyMessages: DatabaseStructure.StatsMessage[]
) {
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

export function calculateVoiceActivity(
    voice: DatabaseStructure.StatsVoice,
    nowTimestamp: number,
    dailyTimeout: number,
    weeklyTimeout: number,
    monthlyTimeout: number,
    dailyVoiceActivity: number,
    weeklyVoiceActivity: number,
    monthlyVoiceActivity: number
) {
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

export function calculateActiveChannels(
    messages: DatabaseStructure.StatsMessage[],
    firstActiveChannel: string,
    secondActiveChannel: string,
    thirdActiveChannel: string
) {
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

export function calculateActiveVoiceChannels(
    voices: DatabaseStructure.StatsVoice[],
    firstActiveVoiceChannel: string,
    secondActiveVoiceChannel: string,
    thirdActiveVoiceChannel: string
) {
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

export function getChannelName(guild: Guild, channelId: string): string {
    return guild.channels.cache.get(channelId)?.name || "Deleted Channel";
}

export function getChannelMessagesCount(
    channelId: string,
    msg: DatabaseStructure.StatsMessage[]
) {
    return msg.filter((x) => x.channelId === channelId).length || 0;
}

export function getChannelMinutesCount(
    channelId: string,
    voices: DatabaseStructure.StatsVoice[]
): number {
    const totalDuration = voices
        .filter((voice) => voice.channelId === channelId)
        .reduce((acc, voice) => {
            const sessionDuration = voice.endTimestamp - voice.startTimestamp;
            return acc + sessionDuration;
        }, 0);

    return Math.round(totalDuration / 1000 / 60);
}
