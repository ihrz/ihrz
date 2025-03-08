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

import { Guild, User } from 'discord.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export function calculateMessageTime(
	msg: DatabaseStructure.StatsMessage,
	nowTimestamp: number,
	dailyTimeout: number,
	weeklyTimeout: number,
	monthlyTimeout: number,
	dailyMessages: DatabaseStructure.StatsMessage[],
	weeklyMessages: DatabaseStructure.StatsMessage[],
	monthlyMessages: DatabaseStructure.StatsMessage[]
): {
	dailyMessages: DatabaseStructure.StatsMessage[],
	weeklyMessages: DatabaseStructure.StatsMessage[],
	monthlyMessages: DatabaseStructure.StatsMessage[],
} {
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

export function calculateVoiceActivity(
	voice: DatabaseStructure.StatsVoice,
	nowTimestamp: number,
	dailyTimeout: number,
	weeklyTimeout: number,
	monthlyTimeout: number,
	dailyVoiceActivity: number,
	weeklyVoiceActivity: number,
	monthlyVoiceActivity: number
): {
	dailyVoiceActivity: number,
	weeklyVoiceActivity: number,
	monthlyVoiceActivity: number,
} {
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

export function calculateActiveChannels(
	messages: DatabaseStructure.StatsMessage[]
): {
	firstActiveChannel: string,
	secondActiveChannel: string,
	thirdActiveChannel: string,
} {
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

	return {
		firstActiveChannel: sortedChannels[0] ? sortedChannels[0][0] : "N/A",
		secondActiveChannel: sortedChannels[1] ? sortedChannels[1][0] : "N/A",
		thirdActiveChannel: sortedChannels[2] ? sortedChannels[2][0] : "N/A",
	};
}

export function calculateActiveVoiceChannels(
	voices: DatabaseStructure.StatsVoice[]
): {
	firstActiveVoiceChannel: string,
	secondActiveVoiceChannel: string,
	thirdActiveVoiceChannel: string,
} {
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

	return {
		firstActiveVoiceChannel: sortedVoiceChannels[0] ? sortedVoiceChannels[0][0] : "N/A",
		secondActiveVoiceChannel: sortedVoiceChannels[1] ? sortedVoiceChannels[1][0] : "N/A",
		thirdActiveVoiceChannel: sortedVoiceChannels[2] ? sortedVoiceChannels[2][0] : "N/A",
	};
}

export function getChannelName(guild: Guild, channelId: string): string {
	return guild.channels.cache.get(channelId)?.name || "Deleted Channel";
}

export function getChannelMessagesCount(
	channelId: string,
	messages: DatabaseStructure.StatsMessage[]
): number {
	return messages.filter((msg) => msg.channelId === channelId).length || 0;
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

export function getStatsLeaderboard(data: {
	member: User | undefined,
	dailyMessages: number,
	weeklyMessages: number,
	monthlyMessages: number,
	dailyVoiceActivity: number,
	weeklyVoiceActivity: number,
	monthlyVoiceActivity: number
}[]) {
	const compare = (a: {
		member: User | undefined,
		dailyMessages: number,
		weeklyMessages: number,
		monthlyMessages: number,
		dailyVoiceActivity: number,
		weeklyVoiceActivity: number,
		monthlyVoiceActivity: number
	}, b: {
		member: User | undefined,
		dailyMessages: number,
		weeklyMessages: number,
		monthlyMessages: number,
		dailyVoiceActivity: number,
		weeklyVoiceActivity: number,
		monthlyVoiceActivity: number
	}) => {
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