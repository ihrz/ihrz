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
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;



		let channel = interaction.options.getChannel("target") as BaseGuildTextChannel;
		let fetched = await client.db.get(`${interaction.guildId}.NOTIFIER`) as DatabaseStructure.NotifierSchema;

		if (fetched && channel.id === fetched.channelId) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.joinghostping_add_already_set
					.replace("${channel}", channel.toString())
			})
		};

		await client.func.ihorizon_logs(interaction, {
			title: lang.notifier_config_channel_logsEmbed_title,
			description: lang.notifier_config_channel_logsEmbed_desc
				.replace('${interaction.user.id}', interaction.member.toString())
				.replace('${channel}', channel.toString())
		});

		await client.db.set(`${interaction.guildId}.NOTIFIER.channelId`, channel.id);

		await client.func.method.interactionSend(interaction, {
			content: lang.notifier_config_message_command_ok
				.replace("${channel.toString()}", channel.toString())
		})
	},
};