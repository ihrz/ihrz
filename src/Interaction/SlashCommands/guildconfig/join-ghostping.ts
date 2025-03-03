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
import { LanguageData } from '../../../../types/languageData.js'; export const command: Command = {
	name: "join-ghostping",

	description: "Subcommand for guildconfig category!",
	description_localizations: {
		"fr": "Commande sous-groupé pour la catégorie de configuration du serveur"
	},

	options: [
		{
			name: 'channel',

			description: 'Channel manipulation for the Join GhostPing Module',
			description_localizations: {
				"fr": "Manipulation de salons pour le module Join GhostPing"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: 'add',

					description: 'Add a channel',
					description_localizations: {
						"fr": "Ajouter un salon"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "channel",
							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							description: "The channel you want",
							description_localizations: {
								"fr": "Le salon que tu veux"
							},

							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: 'remove',

					description: 'Delete a channel',
					description_localizations: {
						"fr": "Enlever un salon de la liste"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "channel",
							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							description: "The channel you want",
							description_localizations: {
								"fr": "Le salon que tu veux"
							},

							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
			],

			permission: null
		},
	],
	thinking: false,
	category: 'guildconfig',
	type: ApplicationCommandType.ChatInput,

	permission: null
};
