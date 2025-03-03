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
	Message,
	EmbedBuilder,
	ChannelType,
	PermissionFlagsBits,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: "confession",

	description: "Subcommand for confession category!",
	description_localizations: {
		"fr": "Commande sous-groupé pour le module de confession"
	},

	options: [
		{
			name: "channel",
			prefixName: "confess-channel",

			description: "Set the confession module's channel!",
			description_localizations: {
				"fr": "Définir le canal du module confession"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'channel',
					type: ApplicationCommandOptionType.Channel,

					description: 'The channel!',
					description_localizations: {
						"fr": "Le channel"
					},

					channel_types: [ChannelType.GuildText],

					required: true,

					permission: null
				},
				{
					name: 'button-title',
					type: ApplicationCommandOptionType.String,

					description: 'The button title',
					description_localizations: {
						"fr": "Le titre du bouton"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "disable",
			prefixName: "confess-disable",

			description: "Enable or Disable the confession module!",
			description_localizations: {
				"fr": "Activer ou désactiver le module"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'action',
					type: ApplicationCommandOptionType.String,

					description: 'What do you want to do ?',
					description_localizations: {
						"fr": "Que voulez-vous faire ?"
					},

					required: true,
					choices: [
						{
							name: 'Power On',
							value: "on"
						},
						{
							name: "Power Off",
							value: "off"
						},
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "cooldown",
			prefixName: "confess-cooldown",

			description: "Change the cooldown between confession!",
			description_localizations: {
				"fr": "Changer le cooldown entre les confession"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'time',
					type: ApplicationCommandOptionType.String,

					description: 'Coolodwn\'s time like 3h/30m/10s...',
					description_localizations: {
						"fr": "Le temps comme 3h/30m/10s..."
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: 'confession',
	type: ApplicationCommandType.ChatInput,
	permission: null
};