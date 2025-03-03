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
	Client,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: 'banner',

	description: 'Pick the banner of specified things (Server/User)',
	description_localizations: {
		"fr": "Récuperer la bannière des éléments spécifiés (serveur/utilisateur)"
	},

	category: 'utils',
	options: [
		{
			name: "banner-user",

			description: "Get the banner of a specified user!",
			description_localizations: {
				"fr": "Récuperer la bannière des éléments spécifiés (serveur/utilisateur)"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,

					description: 'What the user then?',
					description_localizations: {
						"fr": "Qu'est-ce que l'utilisateur alors ?"
					},

					required: false,

					permission: null
				},
			],

			permission: null
		},
		{
			name: "banner-server",

			description: "Get the banner of the server!",
			description_localizations: {
				"fr": "Récupérer la bannière du serveur"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
	],
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null
};