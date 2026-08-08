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
	PermissionsBitField
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "inv",
	description: "Subcommand for invites manager category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie d'InviteManager",
		ja: "招待管理カテゴリのサブコマンド！",
		ru: "Подкоманда для категории управления приглашениями!",
		"es-ES": "Subcomando para la categoría de gestor de invitaciones!"
	},
	options: [
		{
			name: "addinvites",

			description: "Add invites to a user!",
			description_localizations: {
				fr: "Ajouter des invitations à un utilisateur",
				ja: "ユーザーに招待を追加！",
				ru: "Добавить приглашения пользователю!",
				"es-ES": "Añadir invitaciones a un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to add invites",
					description_localizations: {
						fr: "le membre auquel vous souhaitez ajouter des invitations",
						ja: "招待を追加したいメンバー",
						ru: "участник, которому добавить приглашения",
						"es-ES": "el miembro al que quieres añadir invitaciones"
					},

					required: true,

					permission: null
				},
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "Number of invites you want to add",
					description_localizations: {
						fr: "Nombre d'invitations que vous souhaitez ajouter",
						ja: "追加したい招待数",
						ru: "Количество приглашений для добавления",
						"es-ES": "Número de invitaciones que quieres añadir"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionsBitField.Flags.Administrator
		},
		{
			name: "leaderboard",
			prefixName: "invites-leaderboard",

			aliases: ["lb-invites", "invlb", "inviteslb"],

			description: "Show the guild invites's leaderboard!",
			description_localizations: {
				fr: "Afficher le classement des invitations du serveur",
				ja: "サーバー招待ランキングを表示！",
				ru: "Показать таблицу лидеров по приглашениям!",
				"es-ES": "Mostrar la tabla de clasificación de invitaciones del servidor!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "invites",

			description: "Get the invites amount of a user!",
			description_localizations: {
				fr: "Obtenez le montant des invitations d'un utilisateur",
				ja: "ユーザーの招待数を取得！",
				ru: "Получить количество приглашений пользователя!",
				"es-ES": "Obtener la cantidad de invitaciones de un usuario!"
			},

			aliases: ["i", "invsee"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to show them invites",
					description_localizations: {
						fr: "le membre où souhaitez voir ces invitations",
						ja: "招待数を表示したいメンバー",
						ru: "участник, чьи приглашения показать",
						"es-ES": "el miembro al que quieres mostrar sus invitaciones"
					},

					required: false,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "reset",
			prefixName: "invites-reset",

			description: "Delete all data of InviteManager in the guild",
			description_localizations: {
				fr: "Supprimer toute les données du module d'InviteManager",
				ja: "サーバー内のInviteManagerの全データを削除",
				ru: "Удалить все данные InviteManager на сервере",
				"es-ES": "Eliminar todos los datos de InviteManager en el servidor"
			},

			aliases: ["inv-delete-all", "invreset"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionsBitField.Flags.Administrator
		},
		{
			name: "removeinvites",
			aliases: ["rinvites", "subinv"],

			description: "Remove invites from a user!",
			description_localizations: {
				fr: "Supprimer les invitations d'un utilisateur",
				ja: "ユーザーから招待を削除！",
				ru: "Удалить приглашения у пользователя!",
				"es-ES": "Eliminar invitaciones de un usuario!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to remove invites",
					description_localizations: {
						fr: "le membre où vous souhaitez supprimer ces invites",
						ja: "招待を削除したいメンバー",
						ru: "участник, у которого убрать приглашения",
						"es-ES": "el miembro del que quieres quitar invitaciones"
					},

					required: true,

					permission: null
				},
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "Number of invites you want to substract",
					description_localizations: {
						fr: "Nombre d'invitations que vous souhaitez soustraire",
						ja: "減らしたい招待数",
						ru: "Количество приглашений для вычитания",
						"es-ES": "Número de invitaciones que quieres restar"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionsBitField.Flags.Administrator
		}
	],
	thinking: true,
	category: "invitemanager",
	type: ApplicationCommandType.ChatInput,
	permission: null
};
