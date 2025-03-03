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
	ChannelType,
	PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: "setsuggest",

	description: "Subcommand for suggestion category!",
	description_localizations: {
		"fr": "Commande sous-groupé pour la catégorie de suggestion"
	},

	options: [
		{
			name: "disable",
			prefixName: "suggest-disable",

			description: "Disable the suggestion module (need admin permission)!",
			description_localizations: {
				"fr": "Désactivez le module de suggestion (besoin de l'autorisation de l'administrateur)"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'action',
					type: ApplicationCommandOptionType.String,

					description: 'What you want to do ?',
					description_localizations: {
						"fr": "Que veux-tu faire ?"
					},

					required: true,
					choices: [
						{
							name: 'Power On the Suggestion Module',
							value: 'on'
						},
						{
							name: 'Power Off the Suggestion Module',
							value: 'off'
						},
					],

					permission: null
				},
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "channel",
			prefixName: "suggest-channel",

			description: "Set a channel for the Suggestion Module (need admin permission)!",
			description_localizations: {
				"fr": "Définir un canal pour le module de suggestion (nécessite une autorisation d'administrateur)"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'channel',
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					description: 'What the channel for the suggestion place?',
					description_localizations: {
						"fr": "Quel est le channel pour le lieu de suggestion ?"
					},

					required: true,

					permission: null
				},
			],

			permission: PermissionFlagsBits.Administrator
		},
	],
	thinking: false,
	category: 'suggestion',
	type: ApplicationCommandType.ChatInput,

	permission: null
};