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
export function calculateMessageTime(msg, nowTimestamp, dailyTimeout, weeklyTimeout, monthlyTimeout, dailyMessages, weeklyMessages, monthlyMessages) {
    if (msg.sentTimestamp >= nowTimestamp - dailyTimeout) {
        dailyMessages.push(msg);
    }
    if (msg.sentTimestamp >= nowTimestamp - weeklyTimeout) {
        weeklyMessages.push(msg);
    }
    if (msg.sentTimestamp >= nowTimestamp - monthlyTimeout) {
        monthlyMessages.push(msg);
    }
    return { dailyMessages, weeklyMessages, monthlyMessages };
}
export function calculateVoiceActivity(voice, nowTimestamp, dailyTimeout, weeklyTimeout, monthlyTimeout, dailyVoiceActivity, weeklyVoiceActivity, monthlyVoiceActivity) {
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
    return { dailyVoiceActivity, weeklyVoiceActivity, monthlyVoiceActivity };
}
export function calculateActiveChannels(messages) {
    const channelMessageCount = {};
    messages.forEach((msg) => {
        if (!channelMessageCount[msg.channelId]) {
            channelMessageCount[msg.channelId] = 0;
        }
        channelMessageCount[msg.channelId]++;
    });
    const sortedChannels = Object.entries(channelMessageCount)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 3);
    return {
        firstActiveChannel: sortedChannels[0] ? sortedChannels[0][0] : "N/A",
        secondActiveChannel: sortedChannels[1] ? sortedChannels[1][0] : "N/A",
        thirdActiveChannel: sortedChannels[2] ? sortedChannels[2][0] : "N/A",
    };
}
export function calculateActiveVoiceChannels(voices) {
    const channelVoiceDuration = {};
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
    return {
        firstActiveVoiceChannel: sortedVoiceChannels[0] ? sortedVoiceChannels[0][0] : "N/A",
        secondActiveVoiceChannel: sortedVoiceChannels[1] ? sortedVoiceChannels[1][0] : "N/A",
        thirdActiveVoiceChannel: sortedVoiceChannels[2] ? sortedVoiceChannels[2][0] : "N/A",
    };
}
export function getChannelName(guild, channelId) {
    return guild.channels.cache.get(channelId)?.name || "Deleted Channel";
}
export function getChannelMessagesCount(channelId, messages) {
    return messages.filter((msg) => msg.channelId === channelId).length || 0;
}
export function getChannelMinutesCount(channelId, voices) {
    const totalDuration = voices
        .filter((voice) => voice.channelId === channelId)
        .reduce((acc, voice) => {
        const sessionDuration = voice.endTimestamp - voice.startTimestamp;
        return acc + sessionDuration;
    }, 0);
    return Math.round(totalDuration / 1000 / 60);
}
export function getStatsLeaderboard(data) {
    const compare = (a, b) => {
        if (b.dailyMessages !== a.dailyMessages) {
            return b.dailyMessages - a.dailyMessages;
        }
        if (b.weeklyMessages !== a.weeklyMessages) {
            return b.weeklyMessages - a.weeklyMessages;
        }
        if (b.monthlyMessages !== a.monthlyMessages) {
            return b.monthlyMessages - a.monthlyMessages;
        }
        if (b.dailyVoiceActivity !== a.dailyVoiceActivity) {
            return b.dailyVoiceActivity - a.dailyVoiceActivity;
        }
        if (b.weeklyVoiceActivity !== a.weeklyVoiceActivity) {
            return b.weeklyVoiceActivity - a.weeklyVoiceActivity;
        }
        return b.monthlyVoiceActivity - a.monthlyVoiceActivity;
    };
    const sortedData = data
        .filter(entry => entry.member !== undefined)
        .sort(compare);
    const top3 = sortedData.slice(0, 3);
    return top3;
}
