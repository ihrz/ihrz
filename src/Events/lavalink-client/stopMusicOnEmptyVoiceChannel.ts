/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { BotEvent } from '../../../types/event.js';
import { ChannelType, Client, VoiceState } from 'discord.js';

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		if (client.player.getPlayer(oldState.guild.id)) {
			let player = client.player.getPlayer(oldState.guild.id)!;
			let channel_played = oldState.guild.channels.cache.get(player?.voiceChannelId!) || await oldState.guild.channels.fetch(player?.voiceChannelId!);

			// if the bot is alone in the voice channel
			if (channel_played?.type === ChannelType.GuildVoice && channel_played.members.size === 1) {
				let player_text_channel = oldState.guild.channels.cache.get(player?.textChannelId!) || await oldState.guild.channels.fetch(player?.textChannelId!);
				let lang = await oldState.client.func.getLanguageData(oldState.guild.id);

				player.stopPlaying();

				if (player_text_channel?.type === ChannelType.GuildText) {
					player_text_channel.send({
						content: lang.event_mp_emptyChannel
							.replace('${client.iHorizon_Emojis.No}', oldState.client.iHorizon_Emojis.No)
					});
				}
			} else {
				return;
			}
		}
	},
};