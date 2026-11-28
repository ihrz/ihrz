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
import { sendLogCard } from "../../core/modules/logCard.js";

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		const data = await client.func.getLanguageData(oldState.guild.id);

		if (!oldState || !oldState.guild) return;

		const Msgchannel = await client.func.logChannel.getLogChannel(
			oldState.guild,
			"voice"
		);
		if (!Msgchannel) return;

		const Ouser = oldState.id;
		const OchannelID = oldState.channelId;
		const Ostatus = {
			selfDeaf: oldState.selfDeaf,
			selfMute: oldState.selfMute
		};

		const user = newState.id;
		const channelID = newState.channelId;
		const status = {
			selfDeaf: newState.selfDeaf,
			selfMute: newState.selfMute
		};

		const targetUser =
			client.users.cache.get(user) || (await client.users.fetch(user));

		if (targetUser.id === client.user?.id) return;

		const log = (
			kind: "success" | "danger" | "info",
			text: string,
			channelId: string | null
		) =>
			sendLogCard(Msgchannel, {
				kind,
				emoji: client.iHorizon_Emojis.Voice_Channel,
				title: data.logs_voice_title,
				thumbnail: targetUser.displayAvatarURL(),
				description: text
					.replace("${targetUserId}", targetUser.id)
					.replace("${OchannelID}", channelId?.toString() as string)
					.replace("${channelID}", channelId?.toString() as string)
			});

		// JOIN/LEAVE
		if (user && !channelID) {
			await log(
				"danger",
				data.event_srvLogs_voiceStateUpdate_description,
				OchannelID
			);
			return;
		}

		if (Ouser && !OchannelID) {
			await log(
				"success",
				data.event_srvLogs_voiceStateUpdate_2_description,
				channelID
			);
			return;
		}

		// MUTE CASQUE
		if (!Ostatus.selfDeaf && status.selfDeaf) {
			await log(
				"info",
				data.event_srvLogs_voiceStateUpdate_3_description,
				channelID
			);
			return;
		}

		if (Ostatus.selfDeaf && !status.selfDeaf) {
			await log(
				"info",
				data.event_srvLogs_voiceStateUpdate_4_description,
				channelID
			);
			return;
		}

		// MUTE MICRO
		if (!Ostatus.selfMute && status.selfMute) {
			await log(
				"info",
				data.event_srvLogs_voiceStateUpdate_5_description,
				channelID
			);
			return;
		}

		if (Ostatus.selfMute && !status.selfMute) {
			await log(
				"info",
				data.event_srvLogs_voiceStateUpdate_6_description,
				channelID
			);
			return;
		}
	}
};
