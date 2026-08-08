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
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "gw",
	description: "Subcommand for giveaway category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de giveaway",
		ja: "ギブアウェイカテゴリのサブコマンド！",
		ru: "Подкоманда для категории розыгрышей!",
		"es-ES": "Subcomando para la categoría de sorteos!"
	},
	options: [
		{
			name: "create",
			name_localizations: {
				fr: "créer",
				ja: "create",
				ru: "create",
				"es-ES": "create"
			},
			prefixName: "gw-create",

			aliases: ["gstart", "gcreate"],

			description: "Start a giveaway!",
			description_localizations: {
				fr: "Commencer un giveaway",
				ja: "ギブアウェイを開始！",
				ru: "Начать розыгрыш!",
				"es-ES": "Iniciar un sorteo!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "winner",
					name_localizations: {
						fr: "gagnants",
						ja: "winner",
						ru: "winner",
						"es-ES": "winner"
					},

					type: ApplicationCommandOptionType.Number,

					description: "Number of winner for the giveaways",
					description_localizations: {
						fr: "Nombre de gagnants pour les cadeaux",
						ja: "ギブアウェイの当選者数",
						ru: "Количество победителей розыгрыша",
						"es-ES": "Número de ganadores del sorteo"
					},

					required: true,

					permission: null
				},
				{
					name: "time",
					name_localizations: {
						fr: "temps",
						ja: "time",
						ru: "time",
						"es-ES": "time"
					},

					type: ApplicationCommandOptionType.String,

					description: "The time duration of the giveaways",
					description_localizations: {
						fr: "La durée des cadeaux",
						ja: "ギブアウェイの開催時間",
						ru: "Длительность розыгрыша",
						"es-ES": "La duración del sorteo"
					},

					required: true,

					permission: null
				},
				{
					name: "requirement",

					description: "The requirement to enter into the giveaway",
					description_localizations: {
						fr: "Le prérequis pour rentrer dans le giveaways",
						ja: "ギブアウェイ参加要件",
						ru: "Требование для участия в розыгрыше",
						"es-ES": "El requisito para entrar en el sorteo"
					},

					choices: [
						{
							name: "None",
							name_localizations: {
								fr: "Aucun",
								ja: "none",
								ru: "none",
								"es-ES": "none"
							},
							value: "none"
						},
						{
							name: "Need Specific invitations amount",
							name_localizations: {
								fr: "Besoin d'un nombre spécifique d'invitations",
								ja: "need_specific_invitations_amount",
								ru: "need_specific_invitations_amount",
								"es-ES": "need_specific_invitations_amount"
							},
							value: "invites"
						},
						{
							name: "Need specific messages number",
							name_localizations: {
								fr: "Besoin d'un nombre spécifique de messages",
								ja: "need_specific_messages_number",
								ru: "need_specific_messages_number",
								"es-ES": "need_specific_messages_number"
							},
							value: "messages"
						},
						{
							name: "Need specific roles",
							name_localizations: {
								fr: "Besoin de rôles spécifiques",
								ja: "need_specific_roles",
								ru: "need_specific_roles",
								"es-ES": "need_specific_roles"
							},
							value: "roles"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "prize",
					name_localizations: {
						fr: "prix",
						ja: "prize",
						ru: "prize",
						"es-ES": "prize"
					},

					type: ApplicationCommandOptionType.String,

					description: "The giveaway's prize",
					description_localizations: {
						fr: "Le prix du giveaway",
						ja: "ギブアウェイの賞品",
						ru: "Приз розыгрыша",
						"es-ES": "El premio del sorteo"
					},

					required: true,

					permission: null
				},
				{
					name: "requirement-value",
					type: ApplicationCommandOptionType.String,

					description: "The requirement value",
					description_localizations: {
						fr: "La valeur du prérequis pour entrer dans le giveaway",
						ja: "要件の値",
						ru: "Значение требования",
						"es-ES": "El valor del requisito"
					},

					required: false,

					permission: null
				},
				{
					name: "image",
					type: ApplicationCommandOptionType.String,

					description: "Image showed on the giveaway's embed",
					description_localizations: {
						fr: "le lien d'une image qui seras inclu dans l'embed du giveaway",
						ja: "ギブアウェイの埋め込みに表示される画像",
						ru: "Изображение в эмбеде розыгрыша",
						"es-ES": "Imagen mostrada en el embed del sorteo"
					},

					required: false,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "end",
			name_localizations: {
				fr: "finnir",
				ja: "end",
				ru: "end",
				"es-ES": "end"
			},
			prefixName: "gw-end",

			aliases: ["gstop", "gbreak"],

			description: "Stop a giveaway!",
			description_localizations: {
				fr: "Arrêter un giveaway",
				ja: "ギブアウェイを停止！",
				ru: "Остановить розыгрыш!",
				"es-ES": "Detener un sorteo!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",
					type: ApplicationCommandOptionType.String,

					description:
						"The giveaway id (is the message id of the embed's giveaways)",
					description_localizations: {
						fr: "L'identifiant du cadeau (est l'identifiant du message du giveaway)",
						ja: "ギブアウェイID（埋め込みギブアウェイのメッセージID）",
						ru: "ID розыгрыша (это ID сообщения эмбеда розыгрыша)",
						"es-ES": "El ID del sorteo (es el ID del mensaje del embed del sorteo)"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "reroll",
			name_localizations: {
				fr: "relancer",
				ja: "reroll",
				ru: "reroll",
				"es-ES": "reroll"
			},

			description: "Reroll a giveaway winner(s)!",
			description_localizations: {
				fr: "Relancez un ou plusieurs gagnants",
				ja: "ギブアウェイの当選者を再抽選！",
				ru: "Перевыбрать победителя(ей) розыгрыша!",
				"es-ES": "Volver a sortear ganador(es) del sorteo!"
			},

			aliases: ["re"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",
					type: ApplicationCommandOptionType.String,

					description:
						"The giveaway id (is the message id of the embed's giveaways)",
					description_localizations: {
						fr: "L'identifiant du cadeau (est l'identifiant du message du giveaway)",
						ja: "ギブアウェイID（埋め込みギブアウェイのメッセージID）",
						ru: "ID розыгрыша (это ID сообщения эмбеда розыгрыша)",
						"es-ES": "El ID del sorteo (es el ID del mensaje del embed del sorteo)"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "list-entries",
			name_localizations: {
				fr: "afficher-les-participant",
				ja: "list-entries",
				ru: "list-entries",
				"es-ES": "list-entries"
			},

			description: "List all entries in giveaway!",
			description_localizations: {
				fr: "Répertorier toutes les entrées dans le giveaway",
				ja: "ギブアウェイの全エントリーを一覧表示！",
				ru: "Показать всех участников розыгрыша!",
				"es-ES": "Listar todas las entradas en el sorteo!"
			},

			aliases: ["list"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",
					type: ApplicationCommandOptionType.String,

					description:
						"The giveaway id (is the message id of the embed's giveaways)",
					description_localizations: {
						fr: "L'identifiant du cadeau (est l'identifiant du message du giveaway)",
						ja: "ギブアウェイID（埋め込みギブアウェイのメッセージID）",
						ru: "ID розыгрыша (это ID сообщения эмбеда розыгрыша)",
						"es-ES": "El ID del sorteo (es el ID del mensaje del embed del sorteo)"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "get-data",
			name_localizations: {
				fr: "get-data",
				ja: "get-data",
				ru: "get-data",
				"es-ES": "get-data"
			},

			description: "Get informations about a giveaway (JSON Body)",
			description_localizations: {
				fr: "Obtenir des informations à propos d'un giveaways! (Format JSON)",
				ja: "ギブアウェイの情報を取得（JSONデータ）",
				ru: "Получить информацию о розыгрыше (JSON)",
				"es-ES": "Obtener información sobre un sorteo (cuerpo JSON)"
			},

			aliases: ["get"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "giveaway-id",

					description: "Giveaway's ID",
					description_localizations: {
						fr: "L'identifiant du giveaways",
						ja: "ギブアウェイのID",
						ru: "ID розыгрыша",
						"es-ES": "ID del sorteo"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageMessages
		},
		{
			name: "get-all",
			name_localizations: {
				fr: "get-all",
				ja: "get-all",
				ru: "get-all",
				"es-ES": "get-all"
			},

			description:
				"Get informations about all giveaways in a guild (JSON Body)",
			description_localizations: {
				fr: "Obtenir des informations à propos de tout les giveaways d'un serveur! (Format JSON)",
				ja: "サーバー内の全ギブアウェイの情報を取得（JSONデータ）",
				ru: "Получить информацию о всех розыгрышах на сервере (JSON)",
				"es-ES": "Obtener información sobre todos los sorteos en un servidor (cuerpo JSON)"
			},

			aliases: ["gall"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageMessages
		}
	],
	thinking: true,
	category: "giveaway",
	type: ApplicationCommandType.ChatInput,
	permission: null
};
