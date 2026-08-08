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
		fr: "Commande sous-groupé pour la catégorie des statistique des utilisateurs!",
		ja: "統計カテゴリのサブコマンド！",
		ru: "Подкоманда для категории статистики!",
		"es-ES": "Subcomando para la categoría de estadísticas!"
	},

	options: [
		{
			name: "ustats",

			description: "See profil",
			description_localizations: {
				fr: "Regarder un profil",
				ja: "プロフィールを表示",
				ru: "Посмотреть профиль",
				"es-ES": "Ver perfil"
			},

			aliases: ["u"],

			options: [
				{
					name: "member",

					description: "The member you want",
					description_localizations: {
						fr: "L'utilisateur que vous souhaiter",
						ja: "対象のメンバー",
						ru: "Желаемый участник",
						"es-ES": "El miembro que deseas"
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
				fr: "Regarder le classement du serveur",
				ja: "サーバーランキングを表示",
				ru: "Показать таблицу лидеров сервера",
				"es-ES": "Ver tabla de clasificación del servidor"
			},

			aliases: ["g"],

			permission: null,
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "top-messages",

			description: "See top users by messages",
			description_localizations: {
				fr: "Voir le top des utilisateurs par messages",
				ja: "メッセージ数トップユーザーを表示",
				ru: "Показать топ пользователей по сообщениям",
				"es-ES": "Ver usuarios top por mensajes"
			},

			aliases: ["tm", "topm"],

			options: [
				{
					name: "period",
					description: "Time period (daily, weekly, monthly)",
					description_localizations: {
						fr: "Période (quotidien, hebdomadaire, mensuel)",
						ja: "期間（デイリー、ウィークリー、マンスリー）",
						ru: "Период (ежедневно, еженедельно, ежемесячно)",
						"es-ES": "Período de tiempo (diario, semanal, mensual)"
					},
					type: ApplicationCommandOptionType.String,
					required: false,
					choices: [
						{
							name: "Daily",
							name_localizations: {
								fr: "Quotidien",
								ja: "daily",
								ru: "daily",
								"es-ES": "daily"
							},
							value: "daily"
						},
						{
							name: "Weekly",
							name_localizations: {
								fr: "Hebdomadaire",
								ja: "weekly",
								ru: "weekly",
								"es-ES": "weekly"
							},
							value: "weekly"
						},
						{
							name: "Monthly",
							name_localizations: {
								fr: "Mensuel",
								ja: "monthly",
								ru: "monthly",
								"es-ES": "monthly"
							},
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
						fr: "Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)",
						ja: "表示するユーザー数（デフォルト: 10, 最大: 25）",
						ru: "Количество пользователей для отображения (по умолчанию: 10, макс: 25)",
						"es-ES": "Número de usuarios a mostrar (predeterminado: 10, máx: 25)"
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
				fr: "Voir le top des utilisateurs par activité vocale",
				ja: "ボイスアクティビティトップユーザーを表示",
				ru: "Показать топ пользователей по голосовой активности",
				"es-ES": "Ver usuarios top por actividad de voz"
			},

			aliases: ["tv", "topv"],

			options: [
				{
					name: "period",
					description: "Time period (daily, weekly, monthly)",
					description_localizations: {
						fr: "Période (quotidien, hebdomadaire, mensuel)",
						ja: "期間（デイリー、ウィークリー、マンスリー）",
						ru: "Период (ежедневно, еженедельно, ежемесячно)",
						"es-ES": "Período de tiempo (diario, semanal, mensual)"
					},
					type: ApplicationCommandOptionType.String,
					required: false,
					choices: [
						{
							name: "Daily",
							name_localizations: {
								fr: "Quotidien",
								ja: "daily",
								ru: "daily",
								"es-ES": "daily"
							},
							value: "daily"
						},
						{
							name: "Weekly",
							name_localizations: {
								fr: "Hebdomadaire",
								ja: "weekly",
								ru: "weekly",
								"es-ES": "weekly"
							},
							value: "weekly"
						},
						{
							name: "Monthly",
							name_localizations: {
								fr: "Mensuel",
								ja: "monthly",
								ru: "monthly",
								"es-ES": "monthly"
							},
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
						fr: "Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)",
						ja: "表示するユーザー数（デフォルト: 10, 最大: 25）",
						ru: "Количество пользователей для отображения (по умолчанию: 10, макс: 25)",
						"es-ES": "Número de usuarios a mostrar (predeterminado: 10, máx: 25)"
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
				fr: "Comparer les statistiques entre plusieurs utilisateurs",
				ja: "複数ユーザー間の統計を比較",
				ru: "Сравнить статистику нескольких пользователей",
				"es-ES": "Comparar estadísticas entre múltiples usuarios"
			},

			aliases: ["cmp"],

			options: [
				{
					name: "user1",
					description: "First user to compare",
					description_localizations: {
						fr: "Premier utilisateur à comparer",
						ja: "比較する1人目のユーザー",
						ru: "Первый пользователь для сравнения",
						"es-ES": "Primer usuario a comparar"
					},
					type: ApplicationCommandOptionType.User,
					required: true,
					permission: null
				},
				{
					name: "user2",
					description: "Second user to compare",
					description_localizations: {
						fr: "Deuxième utilisateur à comparer",
						ja: "比較する2人目のユーザー",
						ru: "Второй пользователь для сравнения",
						"es-ES": "Segundo usuario a comparar"
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
				fr: "Voir les statistiques d'un canal spécifique",
				ja: "特定のチャンネルの統計を表示",
				ru: "Посмотреть статистику канала",
				"es-ES": "Ver estadísticas de un canal específico"
			},

			aliases: ["cstats", "chstats"],

			options: [
				{
					name: "channel",
					description: "The channel to analyze",
					description_localizations: {
						fr: "Le canal à analyser",
						ja: "分析するチャンネル",
						ru: "Канал для анализа",
						"es-ES": "El canal a analizar"
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
