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

import { BotEvent } from '../../../types/event';
import { DatabaseStructure } from '../../../types/database_structure';
import { getMemberBoost } from '../../Interaction/HybridCommands/economy/economy.js';

const voiceSessionTimestamps = new Map<string, { startTimestamp: number, channelId: string }>();

export const event: BotEvent = {
    name: "voiceStateUpdate",
    run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {

        if (!oldState.guild) return;

        let oldChannelId = oldState.channelId;
        let newChannelId = newState.channelId;

        let userId = oldState.id;

        if (userId && newChannelId && oldChannelId !== newChannelId) {
            if (voiceSessionTimestamps.has(userId)) {
                const session = voiceSessionTimestamps.get(userId);
                if (session) {
                    const endTimestamp = Date.now();
                    const sessionInfo = {
                        startTimestamp: session.startTimestamp,
                        endTimestamp,
                        channelId: session.channelId
                    };
                    voiceSessionTimestamps.delete(userId);
                }
            }

            voiceSessionTimestamps.set(userId, { startTimestamp: Date.now(), channelId: newChannelId });
        }

        if (userId && oldChannelId && !newChannelId) {
            const session = voiceSessionTimestamps.get(userId);
            if (session) {
                const endTimestamp = Date.now();
                const sessionInfo: DatabaseStructure.StatsVoice = {
                    startTimestamp: session.startTimestamp,
                    endTimestamp,
                    channelId: session.channelId
                };

                // Save the voice session to the database
                await client.db.push(`${newState.guild.id}.STATS.USER.${userId}.voices`, sessionInfo)

                // Delete the session from the cache
                voiceSessionTimestamps.delete(userId);

                // Earn coins for the user for being active in voice channels
                const voiceSessionDuration = sessionInfo.endTimestamp - sessionInfo.startTimestamp;
                const voiceSessionDurationInMinutes = voiceSessionDuration / 1000 / 60;
                const coinsEarned = Math.floor(voiceSessionDurationInMinutes / 10);

                if (coinsEarned > 0) {
                    await client.method.addCoins(newState.member!, coinsEarned * await getMemberBoost(newState.member!));
                }
            }
        }

        return;
    },
};