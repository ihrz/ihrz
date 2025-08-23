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
	ApplicationCommandType,
	PermissionFlagsBits,
} from 'discord.js'

import { Command } from '../../../../../types/command.js';


export const command: Command = {
	name: "channel",
	name_localizations: {
		"fr": 'channel'
	},

	description: "Channel operating commands",
	description_localizations: {
		"fr": "Commandes d'opérations pour salons"
	},

	options: [
		{
			name: 'hide',
			description: 'Hide the current channel from everyone',
			description_localizations: {
				"fr": "Masquer le salon actuel pour everyone"
			},
			aliases: ["masquer"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: 'unhide',
			description: 'Unhide the current channel from everyone',
			description_localizations: {
				"fr": "Démasquer le salon actuel pour everyone"
			},
			aliases: ["démasquer"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: 'unhideall',
			description: 'Unhide all channels in the server from everyone',
			description_localizations: {
				"fr": "Démasquer tous les salons du serveur pour everyone"
			},
			aliases: ["démasquer-tout"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
	],

	category: 'utils',
	thinking: true,
	type: ApplicationCommandType.ChatInput,


	permission: PermissionFlagsBits.Administrator
};