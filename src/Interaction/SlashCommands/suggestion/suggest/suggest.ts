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

import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "suggest",

	description: "Subcommand for suggestion category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de suggestion",
		ja: "提案カテゴリのサブコマンド！",
		ru: "Подкоманда для категории предложений!",
		"es-ES": "Subcomando para la categoría de sugerencias!"
	},

	options: [
		{
			name: "reply",
			name_localizations: {
				fr: "répondre",
				ja: "reply",
				ru: "reply",
				"es-ES": "reply"
			},
			prefixName: "sug-reply",

			description: "Reply to the suggestion (need admin permission)!",
			description_localizations: {
				fr: "Répondre à la suggestion (nécessite l'autorisation de l'administrateur)",
				ja: "提案に返信（管理者権限が必要）！",
				ru: "Ответить на предложение (требуются права администратора)!",
				"es-ES": "Responder a la sugerencia (requiere permiso de administrador)!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?"
					},

					required: true,

					permission: null
				},
				{
					name: "message",
					type: ApplicationCommandOptionType.String,

					description: "What message you want reply?",
					description_localizations: {
						fr: "Quelle message vous voulez laissez à la suggestion",
						ja: "どのメッセージに返信しますか？",
						ru: "На какое сообщение вы хотите ответить?",
						"es-ES": "A qué mensaje quieres responder?"
					},

					required: true,

					permission: null
				}
			],

			ephemeral: true,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "deny",
			name_localizations: {
				fr: "refusé",
				ja: "deny",
				ru: "deny",
				"es-ES": "deny"
			},
			prefixName: "sug-deny",

			description: "Deny an suggestion (need admin permission)!",
			description_localizations: {
				fr: "Refuser une suggestion (Requière les permission Admin)",
				ja: "提案を拒否（管理者権限が必要）！",
				ru: "Отклонить предложение (требуются права администратора)!",
				"es-ES": "Denegar una sugerencia (requiere permiso de administrador)!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					name_localizations: {
						fr: "raison",
						ja: "reason",
						ru: "reason",
						"es-ES": "reason"
					},

					type: ApplicationCommandOptionType.String,

					description: "What reason for you denying ?",
					description_localizations: {
						fr: "Quelle message vous voulez laissez à la suggestion",
						ja: "拒否する理由は？",
						ru: "Причина отказа?",
						"es-ES": "Que razón tienes para denegar?"
					},

					required: true,

					permission: null
				}
			],

			ephemeral: true,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "accept",
			name_localizations: {
				fr: "accepté",
				ja: "accept",
				ru: "accept",
				"es-ES": "accept"
			},
			prefixName: "sug-accept",

			description: "Accept an suggestion (need admin permission)!",
			description_localizations: {
				fr: "Accepter une suggestion (Requiert permissions Admin)",
				ja: "提案を承認（管理者権限が必要）！",
				ru: "Принять предложение (требуются права администратора)!",
				"es-ES": "Aceptar una sugerencia (requiere permiso de administrador)!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?"
					},

					required: true,

					permission: null
				},
				{
					name: "reason",
					name_localizations: {
						fr: "raison",
						ja: "reason",
						ru: "reason",
						"es-ES": "reason"
					},

					type: ApplicationCommandOptionType.String,

					description: "What reason for you accepting ?",
					description_localizations: {
						fr: "Quelle message vous voulez laissez à la suggestion",
						ja: "承認する理由は？",
						ru: "Причина принятия?",
						"es-ES": "Que razón tienes para aceptar?"
					},

					required: true,

					permission: null
				}
			],
			ephemeral: true,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "delete",
			name_localizations: {
				fr: "supprimer",
				ja: "delete",
				ru: "delete",
				"es-ES": "delete"
			},
			prefixName: "sug-delete",

			description: "Delete an suggestion (need admin permission)!",
			description_localizations: {
				fr: "Supprimer une suggestion (Requiert permissions Admin)",
				ja: "提案を削除（管理者権限が必要）！",
				ru: "Удалить предложение (требуются права администратора)!",
				"es-ES": "Eliminar una sugerencia (requiere permiso de administrador)!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.String,

					description: "What the id of the suggestion?",
					description_localizations: {
						fr: "Quelle est l'indentifiant de la suggestion ?",
						ja: "提案のIDは？",
						ru: "Какой ID предложения?",
						"es-ES": "Cual es el ID de la sugerencia?"
					},

					required: true,

					permission: null
				}
			],

			ephemeral: true,
			permission: PermissionFlagsBits.Administrator
		}
	],
	category: "suggestion",
	thinking: true,
	type: ApplicationCommandType.ChatInput,

	permission: null
};
