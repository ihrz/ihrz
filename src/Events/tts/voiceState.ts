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

import {
	BaseGuildVoiceChannel,
	ChannelType,
	Client,
	VoiceBasedChannel,
	VoiceState
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { getTTSData, cleanupTTS } from "../../core/modules/ttsManager.js";

async function isMemberlessChannel(
	channel: VoiceBasedChannel | null | undefined
): Promise<boolean> {
	if (!channel || channel.type !== ChannelType.GuildVoice) return false;
	try {
		const fresh = (await channel.fetch()) as BaseGuildVoiceChannel;
		return fresh.members.filter((m) => !m.user.bot).size === 0;
	} catch {
		return true;
	}
}

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		if (!oldState || !oldState.guild) return;

		if (newState.channelId === oldState.channelId) return;

		const ttsData = await getTTSData(client, oldState.guild.id);
		if (!ttsData || !ttsData.enabled) return;

		if (oldState.channelId !== ttsData.voiceChannelId) return;

		const voiceChannel = oldState.guild.channels.cache.get(
			ttsData.voiceChannelId
		);
		if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice)
			return;

		if (await isMemberlessChannel(voiceChannel as VoiceBasedChannel)) {
			await cleanupTTS(client, oldState.guild.id);
		}
	}
};
