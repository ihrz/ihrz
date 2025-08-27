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
import maskLink from '../../../core/functions/maskLink.js';


export const command: Command = {

	name: 'rate',

	description: 'Let me rate the followed subject',
	description_localizations: {
		"fr": "Affiche au combien tu pue"
	},

	aliases: ["odeur", "odeurs", "puanteurs", "puanteur", "arf", "pue"],

	options: [
		{
			name: "the_things",

			description: "the_things",
			description_localizations: {
				"fr": "la chose"
			},

			type: ApplicationCommandOptionType.String,
			required: true,
			permission: null
		}
	],
	thinking: false,
	category: 'fun',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: null,
	run: async (client: Client, interaction: Message<true>, lang: LanguageData, options?: string[]) => {
		if (!interaction.guild) return;

		// Nombre entre 0 et 10
		const random = Math.floor(Math.random() * 10);

		// Fetch user ou soit mêmea
		const the_things = maskLink(client.func.method.longString(options!, 0) || "nothing");

		await interaction.reply({
			content: lang.fun_rate_command_ok
				.replace('${the_things}', the_things)
				.replace('${random}', random.toString()),
			allowedMentions: {
				repliedUser: false,
				roles: [],
				users: [],
				parse: []
			}
		});
	},
};