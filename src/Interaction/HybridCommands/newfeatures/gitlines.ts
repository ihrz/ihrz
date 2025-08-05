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
	ApplicationCommandType,
	PermissionFlagsBits,
	ApplicationCommandOptionType,
} from 'discord.js';

import { Command } from '../../../../types/command.js';

export const command: Command = {
	name: 'git',

	description: '⭐️ (VERY UHQ) Git Lines',
	description_localizations: {
		"fr": "⭐️ (VRAIMENT UHQ) Git Lines"
	},

	options: [
		{
			name: "lines",

			description: "Config the Git Lines modules",
			description_localizations: {
				fr: "Configurer les modules Git Lines"
			},

			permission: PermissionFlagsBits.Administrator,
			type: ApplicationCommandOptionType.Subcommand,
		}
	],

	thinking: false,
	category: 'newfeatures',
	permission: PermissionFlagsBits.Administrator,
	type: ApplicationCommandType.ChatInput
};