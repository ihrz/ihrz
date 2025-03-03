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

import { Client, VoiceState } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { getMemberBoost } from '../../Interaction/HybridCommands/economy/economy.js';

interface VoiceSession {
	startTimestamp: number;
	channelId: string;
}

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		if (!oldState.guild) return;

		const userId = oldState.id;
		const guildId = oldState.guild.id;
		const oldChannelId = oldState.channelId;
		const newChannelId = newState.channelId;

		const saveActiveSession = async (userId: string, session: VoiceSession) => {
			await client.db.set(
				`${guildId}.ACTIVE_VOICE_SESSIONS.${userId}`,
				session
			);
		};

		const getActiveSession = async (userId: string): Promise<VoiceSession | null> => {
			return await client.db.get(
				`${guildId}.ACTIVE_VOICE_SESSIONS.${userId}`
			);
		};

		const clearActiveSession = async (userId: string) => {
			await client.db.delete(
				`${guildId}.ACTIVE_VOICE_SESSIONS.${userId}`
			);
		};

		const processSessionEnd = async (session: VoiceSession) => {
			const endTimestamp = Date.now();
			const sessionInfo: DatabaseStructure.StatsVoice = {
				startTimestamp: session.startTimestamp,
				endTimestamp,
				channelId: session.channelId
			};

			await client.db.push(
				`${guildId}.STATS.USER.${userId}.voices`,
				sessionInfo
			);

			const voiceSessionDuration = endTimestamp - session.startTimestamp;
			const voiceSessionDurationInMinutes = voiceSessionDuration / 1000 / 60;
			const coinsEarned = Math.floor(voiceSessionDurationInMinutes / 10);

			if (coinsEarned > 0 && newState.member) {
				await client.func.method.addCoins(
					newState.member,
					coinsEarned * await getMemberBoost(newState.member)
				);
			}
		};

		if (userId && newChannelId && oldChannelId !== newChannelId) {
			const existingSession = await getActiveSession(userId);

			if (existingSession) {
				await processSessionEnd(existingSession);
				await clearActiveSession(userId);
			}

			await saveActiveSession(userId, {
				startTimestamp: Date.now(),
				channelId: newChannelId
			});
		}

		if (userId && oldChannelId && !newChannelId) {
			const existingSession = await getActiveSession(userId);

			if (existingSession) {
				await processSessionEnd(existingSession);
				await clearActiveSession(userId);
			}
		}
	},
};

export const recoverActiveSessions = async (client: Client) => {
	for (const guild of client.guilds.cache.values()) {
		const activeSessions = await client.db.get(
			`${guild.id}.ACTIVE_VOICE_SESSIONS`
		) || {};

		for (const [userId, session] of Object.entries(activeSessions)) {
			const member = await guild.members.fetch(userId).catch(() => null);
			if (!member?.voice.channelId) {
				await event.run(
					client,
					{ guild, id: userId, channelId: (session as VoiceSession).channelId } as VoiceState,
					{ guild, id: userId, channelId: null } as VoiceState
				);
			}
		}
	}
};