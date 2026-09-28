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
import { handleH247VoiceStateChange } from "../../core/modules/h247Manager.js";

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		if (!oldState?.guild) return;

		// Mute / deafen only, the channel did not change.
		if (newState.channelId === oldState.channelId) return;

		// Only the bot's own voice states can break the H24/7 presence.
		const memberId = newState.member?.id ?? oldState.member?.id;

		if (!memberId || memberId !== client.user?.id) return;

		// The leave flow deletes the persisted state before disconnecting,
		// so a voluntary /h247 leave resolves to a no-op inside the handler.
		await handleH247VoiceStateChange(client, oldState.guild.id);
	}
};
