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
	ApplicationCommandType,
	ApplicationCommandOptionType,
	PermissionFlagsBits,
	EmbedBuilder,
	Message,
	time,
	ChatInputCommandInteraction
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "tag",
	description: "Subcommand for the category of tags message",
	description_localizations: {
		fr: "Sous-commande pour la catégorie de message de tags",
		ja: "タグメッセージカテゴリのサブコマンド",
		ru: "Подкоманда для категории тегов сообщений",
		"es-ES": "Subcomando para la categoría de mensajes de etiquetas"
	},

	options: [
		{
			name: "wlroles-use",
			prefixName: "tag-wluse",

			description: "Roles whitelist for using tags",
			description_localizations: {
				fr: "Rôles whitelist pour utiliser les tags",
				ja: "タグ使用用のホワイトリストロール",
				ru: "Белый список ролей для использования тегов",
				"es-ES": "Roles de lista blanca para usar etiquetas"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "wlroles-create",
			prefixName: "tag-wlcreate",

			description: "Roles whitelist for creating tags",
			description_localizations: {
				fr: "Rôles whitelist pour créer des tags",
				ja: "タグ作成用のホワイトリストロール",
				ru: "Белый список ролей для создания тегов",
				"es-ES": "Roles de lista blanca para crear etiquetas"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "use",
			prefixName: "tag-use",

			description: "Use a tag",
			description_localizations: {
				fr: "Utiliser un tag",
				ja: "タグを使用",
				ru: "Использовать тег",
				"es-ES": "Usar una etiqueta"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "mention",

					description: "Mention the user",
					description_localizations: {
						fr: "Mentionner l'utilisateur",
						ja: "ユーザーにメンション",
						ru: "Упомянуть пользователя",
						"es-ES": "Mencionar al usuario"
					},

					type: ApplicationCommandOptionType.User,
					required: false,
					permission: null
				},
				{
					name: "message_id",

					description: "Message's ID to reply",
					description_localizations: {
						fr: "ID du message pour répondre",
						ja: "返信するメッセージのID",
						ru: "ID сообщения для ответа",
						"es-ES": "ID del mensaje para responder"
					},

					type: ApplicationCommandOptionType.String,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			ephemeral: true,
			permission: null
		},
		{
			name: "create",
			prefixName: "tag-create",

			description: "Create a tag",
			description_localizations: {
				fr: "Créer un tag",
				ja: "タグを作成",
				ru: "Создать тег",
				"es-ES": "Crear una etiqueta"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "embed_id",

					description: "Embed's ID",
					description_localizations: {
						fr: "ID de l'embed",
						ja: "埋め込みのID",
						ru: "ID эмбеда",
						"es-ES": "ID del embed"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "message_content",

					description: "Message with the embed",
					description_localizations: {
						fr: "le message qui acompagneras l'embed",
						ja: "埋め込み付きメッセージ",
						ru: "Сообщение с эмбедом",
						"es-ES": "Mensaje con el embed"
					},

					type: ApplicationCommandOptionType.String,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "edit",

			description: "Edit a tag",
			description_localizations: {
				fr: "Modifier un tag",
				ja: "タグを編集",
				ru: "Редактировать тег",
				"es-ES": "Editar una etiqueta"
			},

			options: [
				{
					name: "current_tag_name",

					description: "The current tag name",
					description_localizations: {
						fr: "Le nom actuel du tag",
						ja: "現在のタグ名",
						ru: "Текущее название тега",
						"es-ES": "El nombre actual de la etiqueta"
					},

					type: ApplicationCommandOptionType.String,
					permission: null,
					required: true
				},
				{
					name: "new_tag_name",

					description: "The new tag name",
					description_localizations: {
						fr: "Le nouveau nom du tag",
						ja: "新しいタグ名",
						ru: "Новое название тега",
						"es-ES": "El nuevo nombre de la etiqueta"
					},

					type: ApplicationCommandOptionType.String,
					permission: null,
					required: true
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "delete",
			prefixName: "tag-delete",

			description: "Delete a tag",
			description_localizations: {
				fr: "Supprimer un tag",
				ja: "タグを削除",
				ru: "Удалить тег",
				"es-ES": "Eliminar una etiqueta"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "list",
			prefixName: "tag-list",

			description: "List all tags",
			description_localizations: {
				fr: "Lister tous les tags",
				ja: "全タグを一覧表示",
				ru: "Показать все теги",
				"es-ES": "Listar todas las etiquetas"
			},

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "info",
			prefixName: "tag-info",

			description: "Info of a tag",
			description_localizations: {
				fr: "Info d'un tag",
				ja: "タグの情報",
				ru: "Информация о теге",
				"es-ES": "Información de una etiqueta"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta"
					},

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: null,
			ephemeral: true
		}
	],

	category: "tags",
	thinking: false,
	permission: null,
	type: ApplicationCommandType.ChatInput
};
