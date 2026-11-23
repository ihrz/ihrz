/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import { Client, VoiceState } from "discord.js";
import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import {
	activeLeashes,
	getLeashConfig
} from "../../core/modules/memberToolsManager.js";

// A leashed member follows the one who holds the leash: when the holder
// changes voice channel, the members they hold are moved there; a held
// member who goes to another channel is brought back. Leashes last
// `UTILS.LEASH_CONFIG.maxLeashTime` (30 minutes by default), like
// `/utilss leashlist` shows.

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		const baseData = (await client.db.get(
			`${newState.guild.id}.UTILS.LEASH`
		)) as DatabaseStructure.UtilsData["LEASH"];
		if (!baseData?.length) return;

		const { maxLeashTime } = await getLeashConfig(
			client,
			newState.guild.id
		);
		const validEntries = activeLeashes(baseData, maxLeashTime);

		if (validEntries.length !== baseData.length) {
			await client.db.set(
				`${newState.guild.id}.UTILS.LEASH`,
				validEntries
			);
		}

		const matchedPairings = validEntries.filter(
			(x) =>
				x.sub === oldState.member?.id ||
				x.dom === oldState.member?.id ||
				x.sub === newState.member?.id ||
				x.dom === newState.member?.id
		);

		for (const pairing of matchedPairings) {
			const subMembers = pairing.sub
				.split(",")
				.map((id) => newState.guild.members.cache.get(id.trim()))
				.filter((member) => member !== undefined);

			const domMember = newState.guild.members.cache.get(pairing.dom);

			if (!domMember || subMembers.length === 0) continue;

			const changingMemberId = newState.member?.id || oldState.member?.id;
			const isDom = changingMemberId === pairing.dom;
			const targetChannel = newState.channel;

			if (isDom && targetChannel) {
				for (const subMember of subMembers) {
					// Discord can only move a member who is in voice.
					if (
						subMember!.voice.channelId &&
						subMember!.voice.channelId !== targetChannel.id
					) {
						try {
							await subMember!.voice.setChannel(targetChannel);
						} catch (error) {
							logger.err(
								`Error moving sub ${subMember!.id}:`,
								error
							);
						}
					}
				}
			} else if (
				!isDom &&
				targetChannel &&
				domMember.voice.channel &&
				targetChannel.id !== domMember.voice.channel.id
			) {
				try {
					const movingMember = subMembers.find(
						(member) => member!.id === changingMemberId
					);
					if (movingMember) {
						await movingMember.voice.setChannel(
							domMember.voice.channel
						);
					}
				} catch (error) {
					logger.err("Channel synchronization error:", error);
				}
			}
		}
	}
};
