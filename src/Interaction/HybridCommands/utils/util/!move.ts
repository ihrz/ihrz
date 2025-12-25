/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ActionRowBuilder,
	BaseGuildVoiceChannel,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	PermissionFlagsBits,
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData.js';
import { SubCommand } from '../../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getMember("member");
			var channel = interaction.options.getChannel("channel", true) as BaseGuildVoiceChannel;
		} else {
			var member = client.func.method.member(interaction, args!, 0);
			var channel = (await client.func.method.voiceChannel(interaction, args!, 1))!;
		}

		// Check if member is in a voice channel
		if (member?.voice.channelId === null) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_move_not_in_vc,
			});
		}

		// Check if the member is an admin
		if (member?.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_move_impossible_to_move_admin,
			});
			return;
		}

		await member?.voice.setChannel(channel.id);

		await client.func.method.interactionSend(interaction, {
			content: lang.util_move_command_ok
				.replace("${member?.toString()}", member?.toString()!)
				.replace("${channel.toString()}", channel.toString())
		});
		return;
	},
};