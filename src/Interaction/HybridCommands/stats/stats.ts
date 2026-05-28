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
	ApplicationCommandType
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "stats",
	description: "Subcommand for stats category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie des statistique des utilisateurs!"
	},

	options: [
		{
			name: "ustats",

			description: "See profil",
			description_localizations: {
				fr: "Regarder un profil"
			},

			aliases: ["u"],

			options: [
				{
					name: "member",

					description: "The member you want",
					description_localizations: {
						fr: "L'utilisateur que vous souhaiter"
					},

					type: ApplicationCommandOptionType.User,
					required: false,

					permission: null
				}
			],

			permission: null,

			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "gstats",

			description: "See guild leaderboard",
			description_localizations: {
				fr: "Regarder le classement du serveur"
			},

			aliases: ["g"],

			permission: null,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "top-messages",

			description: "See top users by messages",
			description_localizations: {
				fr: "Voir le top des utilisateurs par messages"
			},

			aliases: ["tm", "topm"],

			options: [
				{
					name: "period",
					description: "Time period (daily, weekly, monthly)",
					description_localizations: {
						fr: "Période (quotidien, hebdomadaire, mensuel)"
					},
					type: ApplicationCommandOptionType.String,
					required: false,
					choices: [
						{
							name: "Daily",
							name_localizations: { fr: "Quotidien" },
							value: "daily"
						},
						{
							name: "Weekly",
							name_localizations: { fr: "Hebdomadaire" },
							value: "weekly"
						},
						{
							name: "Monthly",
							name_localizations: { fr: "Mensuel" },
							value: "monthly"
						}
					],
					permission: null
				},
				{
					name: "limit",
					description:
						"Number of users to show (default: 10, max: 25)",
					description_localizations: {
						fr: "Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)"
					},
					type: ApplicationCommandOptionType.Integer,
					required: false,
					permission: null
					// min_value: 5,
					// max_value: 25
				}
			],

			permission: null,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "top-voice",

			description: "See top users by voice activity",
			description_localizations: {
				fr: "Voir le top des utilisateurs par activité vocale"
			},

			aliases: ["tv", "topv"],

			options: [
				{
					name: "period",
					description: "Time period (daily, weekly, monthly)",
					description_localizations: {
						fr: "Période (quotidien, hebdomadaire, mensuel)"
					},
					type: ApplicationCommandOptionType.String,
					required: false,
					choices: [
						{
							name: "Daily",
							name_localizations: { fr: "Quotidien" },
							value: "daily"
						},
						{
							name: "Weekly",
							name_localizations: { fr: "Hebdomadaire" },
							value: "weekly"
						},
						{
							name: "Monthly",
							name_localizations: { fr: "Mensuel" },
							value: "monthly"
						}
					],
					permission: null
				},
				{
					name: "limit",
					description:
						"Number of users to show (default: 10, max: 25)",
					description_localizations: {
						fr: "Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)"
					},
					type: ApplicationCommandOptionType.Integer,
					required: false,
					permission: null
					// min_value: 5,
					// max_value: 25
				}
			],

			permission: null,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "compare",

			description: "Compare statistics between multiple users",
			description_localizations: {
				fr: "Comparer les statistiques entre plusieurs utilisateurs"
			},

			aliases: ["cmp"],

			options: [
				{
					name: "user1",
					description: "First user to compare",
					description_localizations: {
						fr: "Premier utilisateur à comparer"
					},
					type: ApplicationCommandOptionType.User,
					required: true,
					permission: null
				},
				{
					name: "user2",
					description: "Second user to compare",
					description_localizations: {
						fr: "Deuxième utilisateur à comparer"
					},
					type: ApplicationCommandOptionType.User,
					required: true,
					permission: null
				}
			],

			permission: null,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "channel-stats",

			description: "See statistics for a specific channel",
			description_localizations: {
				fr: "Voir les statistiques d'un canal spécifique"
			},

			aliases: ["cstats", "chstats"],

			options: [
				{
					name: "channel",
					description: "The channel to analyze",
					description_localizations: {
						fr: "Le canal à analyser"
					},
					type: ApplicationCommandOptionType.Channel,
					required: false,
					permission: null
				}
			],

			permission: null,
			type: ApplicationCommandOptionType.Subcommand
		}
		// {
		//     name: "reset",
		//     description: "Reset profil",
		//     description_localizations: {
		//         fr: "Réintialiser un profil"
		//     },
		//     options: [
		//         {
		//             name: "member",
		//             description: "The member you want",
		//             description_localizations: {
		//                 fr: "L'utilisateur que vous souhaiter"
		//             },
		//             type: ApplicationCommandOptionType.String,
		//             required: false
		//         }
		//     ],
		//     type: ApplicationCommandOptionType.Subcommand,
		// },
	],

	thinking: true,
	category: "stats",
	type: ApplicationCommandType.ChatInput,
	permission: null
};
