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
	name: "backup",

	description: "Subcommand for backup category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie backup",
		ja: "バックアップカテゴリのサブコマンド！",
		ru: "Подкоманда для категории резервного копирования!",
		"es-ES": "Subcomando para la categoría de copias de seguridad!"
	},

	options: [
		{
			name: "create",
			prefixName: "backup-create",

			name_localizations: {
				fr: "créer",
				ja: "create",
				ru: "create",
				"es-ES": "create"
			},

			aliases: ["bcreate"],

			description: "Create a backup!",
			description_localizations: {
				fr: "Créer une backup",
				ja: "バックアップを作成！",
				ru: "Создать резервную копию!",
				"es-ES": "Crear una copia de seguridad!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "save-message",
					type: ApplicationCommandOptionType.String,

					description: "Do you want to save message(s) ?",
					description_localizations: {
						fr: "Voulez-vous sauvegarder des message(s) ?",
						ja: "メッセージを保存しますか？",
						ru: "Сохранить сообщения?",
						"es-ES": "Quieres guardar los mensajes?"
					},

					choices: [
						{
							name: "Yes",
							name_localizations: {
								fr: "Oui",
								ja: "yes",
								ru: "yes",
								"es-ES": "yes"
							},
							value: "yes"
						},
						{
							name: "No",
							name_localizations: {
								fr: "Non",
								ja: "no",
								ru: "no",
								"es-ES": "no"
							},
							value: "no"
						}
					],
					required: true,

					permission: null
				}
			],
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "list",
			name_localizations: {
				fr: "listé",
				ja: "list",
				ru: "list",
				"es-ES": "list"
			},
			prefixName: "backup-list",

			description: "List your backup(s)!",
			description_localizations: {
				fr: "Listé toute vos backup(s)",
				ja: "バックアップを一覧表示！",
				ru: "Показать ваши резервные копии!",
				"es-ES": "Listar tus copias de seguridad!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "load",
			name_localizations: {
				fr: "chargé",
				ja: "load",
				ru: "load",
				"es-ES": "load"
			},
			prefixName: "backup-load",

			description: "Load your backup to initialize!",
			description_localizations: {
				fr: "Charger une de vos backup(s)",
				ja: "バックアップを読み込んで初期化！",
				ru: "Загрузить резервную копию для инициализации!",
				"es-ES": "Cargar tu copia de seguridad para inicializar!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "backup-id",
					type: ApplicationCommandOptionType.String,

					description: "Whats is the backup id?",
					description_localizations: {
						fr: "Quelle est l'identifiant de la backup ?",
						ja: "バックアップIDは？",
						ru: "Какой ID резервной копии?",
						"es-ES": "Cual es el ID de la copia de seguridad?"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "delete",
			prefixName: "backup-delete",

			description: "Delete your backup from the list",
			description_localizations: {
				fr: "Supprimer une backup de la liste",
				ja: "リストからバックアップを削除",
				ru: "Удалить резервную копию из списка",
				"es-ES": "Eliminar tu copia de seguridad de la lista"
			},

			options: [
				{
					name: "backup-id",

					description:
						"The ID of your backup you want to delete from the list",
					description_localizations: {
						fr: "L'identifiant de la backup que vous voulez supprimer de la liste",
						ja: "リストから削除したいバックアップのID",
						ru: "ID резервной копии, которую вы хотите удалить из списка",
						"es-ES": "El ID de tu copia de seguridad que quieres eliminar de la lista"
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "manage",
			prefixName: "backup-manager",

			description: "Manage the backup system into this guild",
			description_localizations: {
				fr: "Gérer le système de backup sur le serveur",
				ja: "このサーバーのバックアップシステムを管理",
				ru: "Управление системой резервного копирования",
				"es-ES": "Gestionar el sistema de copias de seguridad en este servidor"
			},

			permission: null,
			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "only_guild_owner",

					description:
						"Make the backup system only working for guild owner",
					description_localizations: {
						fr: "Faire fonctionner le système de backup uniquement pour le propriétaire du serveur discord.",
						ja: "バックアップシステムをサーバーオーナーのみに制限",
						ru: "Сделать систему резервного копирования доступной только владельцу сервера",
						"es-ES": "Hacer que el sistema de copias de seguridad solo funcione para el propietario del servidor"
					},

					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Only owner",
							name_localizations: {
								fr: "Seulement le propriétaire",
								ja: "only_owner",
								ru: "only_owner",
								"es-ES": "only_owner"
							},
							value: "owner"
						},
						{
							name: "All admin(s)",
							name_localizations: {
								fr: "Tous les administrateurs",
								ja: "all_admin_s",
								ru: "all_admin_s",
								"es-ES": "all_admin_s"
							},
							value: "admin"
						}
					],

					required: true,
					permission: null
				}
			]
		}
	],
	category: "backup",
	thinking: true,
	type: ApplicationCommandType.ChatInput,
	permission: null
};
