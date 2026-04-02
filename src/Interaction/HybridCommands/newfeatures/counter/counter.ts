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
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../../types/command.js';


export const command: Command = {
	name: "counter",

	description: "Count number into a channel",
	description_localizations: {
		"fr": "Compter les nombres dans un salon"
	},

	options: [
		{
			name: "channel",
			prefixName: "counter-channel",

			description: "Set the counter module's channel!",
			description_localizations: {
				"fr": "Définir le canal du module counter"
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
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "config",
			prefixName: "counter-config",

			description: "Enable or Disable the counter module!",
			description_localizations: {
				"fr": "Activer ou désactiver le module compteur"
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
							name_localizations: { fr: 'Activer' },
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: { fr: 'Désactiver' },
							value: "off"
						},
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: 'newfeatures',
	type: ApplicationCommandType.ChatInput,
	permission: null
};