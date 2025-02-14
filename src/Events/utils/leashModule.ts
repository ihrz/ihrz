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

export const event: BotEvent = {
    name: "voiceStateUpdate",
    run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
        const baseData = await client.db.get(`${newState.guild.id}.UTILS.LEASH`) as DatabaseStructure.UtilsData["LEASH"];
        const currentTime = Date.now();

        const validEntries = baseData?.filter(entry => currentTime - entry.timestamp <= 30 * 60 * 1000) || [];
        const expiredEntries = baseData?.filter(entry => currentTime - entry.timestamp > 30 * 60 * 1000) || [];

        if (expiredEntries.length > 0) {
            await client.db.set(`${newState.guild.id}.UTILS.LEASH`, validEntries);
        }

        const matchedPairings = validEntries.filter(x =>
            x.sub === oldState.member?.id ||
            x.dom === oldState.member?.id ||
            x.sub === newState.member?.id ||
            x.dom === newState.member?.id
        );

        for (const pairing of matchedPairings) {
            const subMembers = pairing.sub.split(',').map(id =>
                newState.guild.members.cache.get(id.trim())
            ).filter(member => member !== undefined);

            const domMember = newState.guild.members.cache.get(pairing.dom);

            if (!domMember || subMembers.length === 0) continue;

            const changingMemberId = newState.member?.id || oldState.member?.id;
            const isDom = changingMemberId === pairing.dom;
            const targetChannel = isDom ? newState.channel : oldState.channel;

            if (isDom && targetChannel) {
                for (const subMember of subMembers) {
                    if (subMember!.voice.channel !== targetChannel) {
                        try {
                            await subMember!.voice.setChannel(targetChannel);
                        } catch (error) {
                            console.error(`Error moving sub ${subMember!.id}:`, error);
                        }
                    }
                }
            }
            else if (!isDom && domMember.voice.channel && targetChannel !== domMember.voice.channel) {
                try {
                    const movingMember = subMembers.find(member => member!.id === changingMemberId);
                    if (movingMember) {
                        await movingMember.voice.setChannel(domMember.voice.channel);
                    }
                } catch (error) {
                    console.error("Channel synchronization error:", error);
                }
            }
        }
    },
};