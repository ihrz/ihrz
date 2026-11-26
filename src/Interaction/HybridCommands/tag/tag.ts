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
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "tag",
	description: "Subcommand for the category of tags message",
	description_localizations: {
		fr: "Sous-commande pour la catégorie de message de tags",
		ja: "タグメッセージカテゴリのサブコマンド",
		ru: "Подкоманда для категории тегов сообщений",
		"es-ES": "Subcomando para la categoría de mensajes de etiquetas",
		ko: "태그 메시지 하위 명령어",
		uk: "Підкоманда для категорії тегів повідомлень",
		de: "Unterbefehle der Tag-Nachrichten-Kategorie",
		it: "Sottocomandi della categoria messaggi tag",
		"pt-BR": "Subcomandos da categoria mensagens de tags",
		pl: "Podkomendy kategorii wiadomości tagów"
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
				"es-ES": "Roles de lista blanca para usar etiquetas",
				ko: "태그를 사용할 수 있는 역할 허용 목록",
				uk: "Білий список ролей для використання тегів",
				de: "Rollen-Whitelist zum Verwenden von Tags",
				it: "Whitelist dei ruoli per usare i tag",
				"pt-BR": "Whitelist de cargos para usar tags",
				pl: "Biała lista ról do używania tagów"
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
				"es-ES": "Roles de lista blanca para crear etiquetas",
				ko: "태그를 만들 수 있는 역할 허용 목록",
				uk: "Білий список ролей для створення тегів",
				de: "Rollen-Whitelist zum Erstellen von Tags",
				it: "Whitelist dei ruoli per creare tag",
				"pt-BR": "Whitelist de cargos para criar tags",
				pl: "Biała lista ról do tworzenia tagów"
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
				"es-ES": "Usar una etiqueta",
				ko: "태그 사용",
				uk: "Використати тег",
				de: "Einen Tag verwenden",
				it: "Usa un tag",
				"pt-BR": "Usar uma tag",
				pl: "Użyj tagu"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta",
						ko: "태그 이름",
						uk: "Назва тегу",
						de: "Name des Tags",
						it: "Nome del tag",
						"pt-BR": "Nome da tag",
						pl: "Nazwa tagu"
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
						"es-ES": "Mencionar al usuario",
						ko: "사용자 멘션",
						uk: "Згадати користувача",
						de: "Den Nutzer erwähnen",
						it: "Menziona l'utente",
						"pt-BR": "Mencionar o usuário",
						pl: "Wspomnij użytkownika"
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
						"es-ES": "ID del mensaje para responder",
						ko: "답장할 메시지 ID",
						uk: "ID повідомлення для відповіді",
						de: "ID der Nachricht, auf die geantwortet wird",
						it: "ID del messaggio a cui rispondere",
						"pt-BR": "ID da mensagem a responder",
						pl: "ID wiadomości, na którą odpowiadasz"
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
				"es-ES": "Crear una etiqueta",
				ko: "태그 만들기",
				uk: "Створити тег",
				de: "Tag erstellen",
				it: "Crea un tag",
				"pt-BR": "Criar uma tag",
				pl: "Utwórz tag"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta",
						ko: "태그 이름",
						uk: "Назва тегу",
						de: "Name des Tags",
						it: "Nome del tag",
						"pt-BR": "Nome da tag",
						pl: "Nazwa tagu"
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
						"es-ES": "ID del embed",
						ko: "임베드 ID",
						uk: "ID ембеда",
						de: "Embed-ID",
						it: "ID dell'embed",
						"pt-BR": "ID do embed",
						pl: "ID embeda"
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
						"es-ES": "Mensaje con el embed",
						ko: "임베드가 있는 메시지",
						uk: "Повідомлення з ембедом",
						de: "Nachricht mit dem Embed",
						it: "Messaggio con l'embed",
						"pt-BR": "Mensagem com o embed",
						pl: "Wiadomość z embedem"
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
				"es-ES": "Editar una etiqueta",
				ko: "태그 편집",
				uk: "Редагувати тег",
				de: "Tag bearbeiten",
				it: "Modifica un tag",
				"pt-BR": "Editar uma tag",
				pl: "Edytuj tag"
			},

			options: [
				{
					name: "current_tag_name",

					description: "The current tag name",
					description_localizations: {
						fr: "Le nom actuel du tag",
						ja: "現在のタグ名",
						ru: "Текущее название тега",
						"es-ES": "El nombre actual de la etiqueta",
						ko: "현재 태그 이름",
						uk: "Поточна назва тегу",
						de: "Der aktuelle Tag-Name",
						it: "Il nome attuale del tag",
						"pt-BR": "O nome atual da tag",
						pl: "Aktualna nazwa tagu"
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
						"es-ES": "El nuevo nombre de la etiqueta",
						ko: "새 태그 이름",
						uk: "Нова назва тегу",
						de: "Der neue Tag-Name",
						it: "Il nuovo nome del tag",
						"pt-BR": "O novo nome da tag",
						pl: "Nowa nazwa tagu"
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
				"es-ES": "Eliminar una etiqueta",
				ko: "태그 삭제",
				uk: "Видалити тег",
				de: "Tag löschen",
				it: "Elimina un tag",
				"pt-BR": "Excluir uma tag",
				pl: "Usuń tag"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta",
						ko: "태그 이름",
						uk: "Назва тегу",
						de: "Name des Tags",
						it: "Nome del tag",
						"pt-BR": "Nome da tag",
						pl: "Nazwa tagu"
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
				"es-ES": "Listar todas las etiquetas",
				ko: "모든 태그 목록",
				uk: "Показати всі теги",
				de: "Alle Tags auflisten",
				it: "Elenca tutti i tag",
				"pt-BR": "Listar todas as tags",
				pl: "Wyświetl wszystkie tagi"
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
				"es-ES": "Información de una etiqueta",
				ko: "태그 정보",
				uk: "Інформація про тег",
				de: "Infos zu einem Tag",
				it: "Info di un tag",
				"pt-BR": "Informações de uma tag",
				pl: "Informacje o tagu"
			},

			options: [
				{
					name: "tag_name",

					description: "Name of the tag",
					description_localizations: {
						fr: "Nom du tag",
						ja: "タグの名前",
						ru: "Название тега",
						"es-ES": "Nombre de la etiqueta",
						ko: "태그 이름",
						uk: "Назва тегу",
						de: "Name des Tags",
						it: "Nome del tag",
						"pt-BR": "Nome da tag",
						pl: "Nazwa tagu"
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
