/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

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
	ChannelType,
	PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: "blogger",

	description: "Subcommand category for blogger RSS feeds!",
	description_localizations: {
		"fr": "Commande sous-groupé pour la catégorie des flux RSS de blogs"
	},

	options: [
		{
			name: "blog",

			description: "Blog RSS feed manipulation",
			description_localizations: {
				fr: "Manipulation des flux RSS de blogs"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: "add",
					prefixName: "blog-add",

					description: "Add a blog RSS feed",
					description_localizations: {
						fr: "Ajouter un flux RSS de blog"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "rss",

							description: "The RSS feed URL",
							description_localizations: {
								fr: "L'URL du flux RSS"
							},

							type: ApplicationCommandOptionType.String,

							required: true,

							permission: null
						},
						{
							name: "channel",

							description: "The channel where notifications will be sent",
							description_localizations: {
								fr: "Le salon où les notifications seront envoyées"
							},

							channel_types: [ChannelType.GuildText],
							type: ApplicationCommandOptionType.Channel,

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "remove",
					prefixName: "blog-remove",

					description: "Remove a blog RSS feed",
					description_localizations: {
						fr: "Supprimer un flux RSS de blog"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "id",

							description: "The blog RSS feed ID",
							description_localizations: {
								fr: "L'identifiant du flux RSS"
							},

							type: ApplicationCommandOptionType.String,

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "list",
					prefixName: "blog-list",

					description: "Show all configured blog RSS feeds",
					description_localizations: {
						fr: "Afficher tous les flux RSS de blogs configurés"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			permission: null
		},
		{
			name: "config",

			description: "Configuration for the Blogger Module",
			description_localizations: {
				fr: "La configuration pour le module Blogger"
			},

			options: [
				{
					name: "status",

					description: "Enable or disable the Blogger module",
					description_localizations: {
						fr: "Activer ou désactiver le module Blogger"
					},

					options: [
						{
							name: "power",

							description: "Power On or Power Off",
							description_localizations: {
								fr: "Activer ou Désactiver"
							},

							type: ApplicationCommandOptionType.String,

							choices: [
								{
									name: "Power On",
									value: "on"
								},
								{
									name: "Power Off",
									value: "off"
								}
							],

							required: true,

							permission: null
						}
					],

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: PermissionFlagsBits.ManageGuild
		}
	],
	thinking: false,
	category: 'blogger',
	type: ApplicationCommandType.ChatInput,

	permission: null
};