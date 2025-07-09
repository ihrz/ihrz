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

import {
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionFlagsBits,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

const timeConversion: Record<string, string> = {
	"0": "0",
	"5s": "5",
	"10s": "10",
	"15s": "15",
	"30s": "30",
	"1m": "60",
	"2m": "120",
	"5m": "300",
	"10m": "600",
	"15m": "900",
	"30m": "1800",
	"1h": "3600",
	"2h": "7200",
	"6h": "21600"
};

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var duration = interaction.options.getString("cooldown", true);
		} else {
			var duration = client.func.method.string(args!, 0)!
		}

		let channel = interaction.channel;
		let duration_in_string = client.timeCalculator.to_beautiful_string(duration, lang);

		if (!interaction.guild.members.me?.permissions.has([
			PermissionFlagsBits.ManageChannels
		])) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.unban_bot_dont_have_permission.replace('${client.iHorizon_Emojis.No}', client.iHorizon_Emojis.No)
			})
		}
		(channel as BaseGuildTextChannel).setRateLimitPerUser(timeConversion[duration] as any, "Slow command executed by " + interaction.member.user.id);

		await client.func.method.interactionSend(interaction, {
			content: lang.util_cooldown_command_ok
				.replace("${duration_in_string}", duration_in_string)
		})
	},
};