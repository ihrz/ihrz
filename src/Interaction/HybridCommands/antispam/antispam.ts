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
	ChatInputCommandInteraction,
	ApplicationCommandType,
	ApplicationCommandOptionType,
	Message,
	PermissionFlagsBits,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: "antispam",

	description: "Subcommand for antispam category!",
	description_localizations: {
		"fr": "Commande sous-groupé pour la catégorie d'antispam"
	},

	options: [
		{
			name: "manage",
			prefixName: "antispam-manage",

			description: "Manage the antispam module",
			description_localizations: {
				"fr": "Gérer le module antispam"
			},

			aliases: ["mng", "antimng"],


			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "bypass-roles",
			prefixName: "antispam-bypass-roles",

			description: "All of the roles wich bypass the antispam",
			description_localizations: {
				"fr": "Tous les rôles qui contournent l'anti spam"
			},

			aliases: ["roles"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,
		},
		{
			name: "ignore-channels",
			prefixName: "antispam-ignore-channels",

			description: "Ignore this channels in the AntiSpam Module",
			description_localizations: {
				"fr": "Ignorer des salons afin que l'AntiSpam ne l'ai prennent pas en compte"
			},

			aliases: ["channels"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator,
		},
	],
	category: 'antispam',
	thinking: true,
	type: ApplicationCommandType.ChatInput,
	permission: null
};