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
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	Message,
} from 'discord.js'

import { LanguageData } from '../../../../../types/languageData.js';
import { SubCommand } from '../../../../../types/command.js';
import { DatabaseStructure } from '../../../../../types/database_structure.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var channel = interaction.options.getChannel("to", true) as BaseGuildTextChannel;
		} else {
			var channel = await client.func.method.channel(interaction, args!, 0) as BaseGuildTextChannel;
		};

		let baseData: DatabaseStructure.SkullboardConfigSchema = await client.db.get(`${interaction.guildId}.GUILD.SKULLBOARD`) || {
			channel: null,
			createThread: false,
			enabled: false,
			threshold: 2
		};

		baseData.channel = channel.id;
		await client.db.set(`${interaction.guildId}.GUILD.SKULLBOARD`, baseData);


		client.func.method.interactionSend(interaction, {
			content: lang.skullboard_channel_command_ok
				.replaceAll("${client.iHorizon_Emojis.Yes}", client.iHorizon_Emojis.Yes)
				.replaceAll("${channel.toString()}", channel.toString())
				.replaceAll("${baseData.threshold}", baseData.threshold.toString())
		})
	},
};