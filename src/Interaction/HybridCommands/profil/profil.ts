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
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';


export const command: Command = {
	name: "profil",

	description: "Subcommand for profil category!",
	description_localizations: {
		"fr": "Commande sous-groupé pour la catégorie de visualisation profil"
	},

	options: [
		{
			name: "show",
			name_localizations: {
				"fr": "afficher"
			},

			description: "See the iHorizon's profil of the member!",
			description_localizations: {
				"fr": "Voir le profil iHorizon du membre"
			},

			aliases: ["me", "prof"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,

					description: 'The user you want to lookup',
					description_localizations: {
						"fr": "L'utilisateur que vous souhaitez rechercher"
					},

					required: false,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-age",
			name_localizations: {
				"fr": "définir-âge"
			},

			description: "Set your age on the iHorizon's Profil !",
			description_localizations: {
				"fr": "Définissez votre âge sur le profil iHorizon"
			},

			aliases: ["age"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'age',
					type: ApplicationCommandOptionType.Number,

					description: "Your age on the iHorizon's profil",
					description_localizations: {
						"fr": "Votre âge sur votre profil iHorizon"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-description",
			name_localizations: {
				"fr": "définir-description"
			},

			description: "Set your description on the iHorizon's Profil!",
			description_localizations: {
				"fr": "Définissez votre description sur le profil iHorizon"
			},

			aliases: ["desc", "description"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'description',
					type: ApplicationCommandOptionType.String,

					description: "Your descriptions on the iHorizon's profil",
					description_localizations: {
						"fr": "La description sur votre profil"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-gender",
			name_localizations: {
				"fr": "définir-genre"
			},

			description: "Set your gender on the iHorizon's Profil!",
			description_localizations: {
				"fr": "Définissez votre genre sur le profil iHorizon"
			},

			aliases: ["gender"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'gender',
					type: ApplicationCommandOptionType.String,

					description: "Gender that fits you the most",
					description_localizations: {
						"fr": "Le genre qui vous correspond le plus"
					},

					required: true,
					choices: [
						{
							name: "♀ Female",
							value: "female"
						},
						{
							name: "♂ Male",
							value: "male"
						},
						{
							name: "⚧ Non-binary",
							value: "non-binary"
						}
					],

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-pronoun",
			name_localizations: {
				"fr": "définir-pronom"
			},

			description: "Set your pronoun on the iHorizon's Profil!",
			description_localizations: {
				"fr": "Définissez votre pronom sur le profil iHorizon"
			},

			aliases: ["pronoun", "pronom"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'pronoun',
					type: ApplicationCommandOptionType.String,

					description: "Pronoun that fits you the most",
					description_localizations: {
						"fr": "Le pronom qui vous correspond le plus"
					},

					required: true,
					choices: [
						{
							name: "she/her",
							value: "she-her"
						},
						{
							name: "he/him",
							value: "he-him"
						},
						{
							name: "they/them",
							value: "they-them"
						},
						{
							name: "xe/xem",
							value: "xe-xem"
						},
						{
							name: "ze/zem",
							value: "ze-zem"
						},
						{
							name: "other (say my name)",
							value: "other"
						}
					],

					permission: null
				}
			],

			permission: null
		},
		{
			name: "set-birthday",
			name_localizations: {
				"fr": "définir-anniversaire"
			},

			description: "Set your birthday on the iHorizon's Profil!",
			description_localizations: {
				"fr": "Définissez votre anniversaire sur le profil iHorizon"
			},

			aliases: ["birthday", "anniversaire"],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		}
	],
	integration_types: [0, 1],
	contexts: [0, 1, 2],

	thinking: false,
	category: 'profil',
	type: ApplicationCommandType.ChatInput,
	permission: null
};