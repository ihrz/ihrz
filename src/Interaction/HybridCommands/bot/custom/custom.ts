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
	PermissionFlagsBits
} from 'discord.js';

import { Command } from '../../../../../types/command.js';


export const command: Command = {
	name: "custom",

	description: "Custom the bot profile in your discord server",
	description_localizations: {
		"fr": "Customiser le profil du bot sur le serveur discord"
	},

	options: [
		{
			name: 'name',

			description: 'Change the iHorizon name into the server',
			description_localizations: {
				"fr": "Définir le nom du bot sur le serveur"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						"fr": "Que voulez-vous faire ?"
					},

					choices: [
						{
							name: "Bot Name",
							value: "reset"
						},
						{
							name: "Set one",
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "name",

					description: "The name",
					description_localizations: {
						"fr": "Le noms du bot"
					},

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'avatar',

			description: 'Set the bot avatar into your server',
			description_localizations: {
				"fr": "Définir la photo de profil du bot sur votre serveur discord"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						"fr": "Que voulez-vous faire ?"
					},

					choices: [
						{
							name: "Bot Avatar",
							value: "reset"
						},
						{
							name: "Set one",
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "avatar",

					description: "The avatar",
					description_localizations: {
						"fr": "L'avatar du bot"
					},

					type: ApplicationCommandOptionType.Attachment,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'banner',
			prefixName: "bot-banner",

			description: 'Set the bot banner into your server',
			description_localizations: {
				"fr": "Définir la bannière de profil du bot sur votre serveur discord"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						"fr": "Que voulez-vous faire ?"
					},

					choices: [
						{
							name: "Default Bot Banner",
							value: "reset"
						},
						{
							name: "Set one",
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "banner",

					description: "The banner",
					description_localizations: {
						"fr": "La bannière du bot"
					},

					type: ApplicationCommandOptionType.Attachment,
					required: false,
					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: 'bio',

			description: 'Set the bot bio into your server',
			description_localizations: {
				"fr": "Définir la bio de profil du bot sur votre serveur discord"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						"fr": "Que voulez-vous faire ?"
					},

					choices: [
						{
							name: "Default Bot Description",
							value: "reset"
						},
						{
							name: "Set one",
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "bio",

					description: "The description",
					description_localizations: {
						"fr": "La bio du bot"
					},

					type: ApplicationCommandOptionType.String,
					required: false,
					permission: null
				},
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
	],

	thinking: true,
	category: 'profil',
	type: ApplicationCommandType.ChatInput,
	permission: null
};