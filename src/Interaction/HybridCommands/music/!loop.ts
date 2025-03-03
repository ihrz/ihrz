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

import {
	ChatInputCommandInteraction,
	Client,
	CommandInteractionOptionResolver,
	Guild,
	GuildMember,
	InteractionEditReplyOptions,
	Message,
	MessagePayload,
	MessageReplyOptions,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		try {
			let voiceChannel = (interaction.member as GuildMember).voice.channel;
			let player = client.player.getPlayer(interaction.guildId as string);

			if (interaction instanceof ChatInputCommandInteraction) {
				var mode = interaction.options.getString('mode');
			} else {

				var mode = client.func.method.string(args!, 0);
			};

			if (!player || !player.playing || !voiceChannel) {
				await client.func.method.interactionSend(interaction, { content: lang.loop_no_queue });
				return;
			};

			// Check if the member is in the same voice channel as the bot
			if ((interaction.member as GuildMember).voice.channelId !== interaction.guild.members.me?.voice.channelId) {
				await client.func.method.interactionSend(interaction, {
					content: lang.music_cannot.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo),
				});
				return;
			}

			await player.setRepeatMode(mode as "off" | "track" | "queue");

			await client.func.method.interactionSend(interaction, {
				content: lang.loop_command_work
					.replace("{mode}", mode === 'track' ? `🔂` : `▶`)
			});
			return;
		} catch (error: any) {
			logger.err(error);
		};
	},
};