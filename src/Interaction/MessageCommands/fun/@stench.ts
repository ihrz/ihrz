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
	ApplicationCommandOptionType,
	Client,
	Message,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {

	name: 'stench',

	description: 'Show how much stench you are',
	description_localizations: {
		"fr": "Affiche au combien tu pue"
	},

	aliases: ["odeur", "odeurs", "puanteurs", "puanteur", "arf", "pue"],

	options: [
		{
			name: "user",

			description: "the user",
			description_localizations: {
				"fr": "l'user"
			},

			type: ApplicationCommandOptionType.User,
			required: false,
			permission: null
		}
	],
	thinking: false,
	category: 'fun',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: PermissionsBitField.Flags.ManageGuildExpressions,
	run: async (client: Client, interaction: Message<true>, lang: LanguageData, options?: string[]) => {
		if (!interaction.guild) return;

		// Nombre entre 0 et 100
		const random = Math.floor(Math.random() * 100);

		// Fetch user ou soit mêmea
		const user = client.func.method.member(interaction, options!, 0) || interaction.member!;

		await interaction.reply({
			content: lang.fun_stench_command_ok
				.replace('${user}', user.toString())
				.replace('${random}', random.toString())
		});
	},
};