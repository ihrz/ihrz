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
		"es-ES": "Subcomando para la categoría de gestor de invitaciones!",
		ko: "초대 관리 하위 명령어!",
		uk: "Підкоманда категорії менеджера запрошень!",
		de: "Unterbefehle der Einladungsverwaltungs-Kategorie!",
		it: "Sottocomandi della categoria gestione inviti!",
		"pt-BR": "Subcomandos da categoria gerenciador de convites!",
		pl: "Podkomendy kategorii menedżera zaproszeń!"
	},
	options: [
		{
			name: "addinvites",

			description: "Add invites to a user!",
			description_localizations: {
				fr: "Ajouter des invitations à un utilisateur",
				ja: "ユーザーに招待を追加！",
				ru: "Добавить приглашения пользователю!",
				"es-ES": "Añadir invitaciones a un usuario!",
				ko: "사용자에게 초대 수를 추가해요!",
				uk: "Додати запрошення користувачу!",
				de: "Füge einem Nutzer Einladungen hinzu!",
				it: "Aggiungi inviti a un utente!",
				"pt-BR": "Adicione convites a um usuário!",
				pl: "Dodaj zaproszenia użytkownikowi!"
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
						"es-ES":
							"el miembro al que quieres añadir invitaciones",
						ko: "초대 수를 추가할 멤버",
						uk: "Учасник, якому ви хочете додати запрошення",
						de: "Das Mitglied, dem du Einladungen hinzufügst",
						it: "Il membro a cui aggiungere inviti",
						"pt-BR": "O membro a quem você quer adicionar convites",
						pl: "Członek, któremu dodać zaproszenia"
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
						"es-ES": "Número de invitaciones que quieres añadir",
						ko: "추가할 초대 수",
						uk: "Кількість запрошень, яку ви хочете додати",
						de: "Anzahl der hinzuzufügenden Einladungen",
						it: "Numero di inviti da aggiungere",
						"pt-BR": "Número de convites a adicionar",
						pl: "Liczba zaproszeń do dodania"
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
				"es-ES":
					"Mostrar la tabla de clasificación de invitaciones del servidor!",
				ko: "서버 초대 순위표를 보여줘요!",
				uk: "Показати таблицю лідерів сервера за запрошеннями!",
				de: "Zeigt die Einladungs-Rangliste des Servers!",
				it: "Mostra la classifica inviti del server!",
				"pt-BR": "Mostra o ranking de convites do servidor!",
				pl: "Pokazuje ranking zaproszeń serwera!"
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
				"es-ES": "Obtener la cantidad de invitaciones de un usuario!",
				ko: "사용자의 초대 수를 확인해요!",
				uk: "Отримати кількість запрошень користувача!",
				de: "Zeige die Einladungsanzahl eines Nutzers!",
				it: "Ottieni il numero di inviti di un utente!",
				"pt-BR": "Veja a quantidade de convites de um usuário!",
				pl: "Pokaż liczbę zaproszeń użytkownika!"
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
						"es-ES":
							"el miembro al que quieres mostrar sus invitaciones",
						ko: "초대 수를 볼 멤버",
						uk: "Учасник, чиї запрошення ви хочете показати",
						de: "Das Mitglied, dessen Einladungen du sehen willst",
						it: "Il membro di cui vedere gli inviti",
						"pt-BR": "O membro cujos convites você quer ver",
						pl: "Członek, którego zaproszenia chcesz zobaczyć"
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
				"es-ES":
					"Eliminar todos los datos de InviteManager en el servidor",
				ko: "서버의 InviteManager 데이터를 모두 삭제해요",
				uk: "Видалити всі дані InviteManager на сервері",
				de: "Alle InviteManager-Daten des Servers löschen",
				it: "Elimina tutti i dati di InviteManager nel server",
				"pt-BR": "Exclua todos os dados do InviteManager no servidor",
				pl: "Usuń wszystkie dane InviteManager na serwerze"
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
				"es-ES": "Eliminar invitaciones de un usuario!",
				ko: "사용자의 초대 수를 차감해요!",
				uk: "Забрати запрошення в користувача!",
				de: "Entferne Einladungen eines Nutzers!",
				it: "Rimuovi inviti a un utente!",
				"pt-BR": "Remova convites de um usuário!",
				pl: "Usuń zaproszenia użytkownikowi!"
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
						"es-ES":
							"el miembro del que quieres quitar invitaciones",
						ko: "초대 수를 제거할 멤버",
						uk: "Учасник, у якого ви хочете забрати запрошення",
						de: "Das Mitglied, dem du Einladungen entfernst",
						it: "Il membro a cui rimuovere inviti",
						"pt-BR": "O membro de quem você quer remover convites",
						pl: "Członek, któremu odjąć zaproszenia"
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
						"es-ES": "Número de invitaciones que quieres restar",
						ko: "차감할 초대 수",
						uk: "Кількість запрошень, яку ви хочете відняти",
						de: "Anzahl der abzuziehenden Einladungen",
						it: "Numero di inviti da sottrarre",
						"pt-BR": "Número de convites a subtrair",
						pl: "Liczba zaproszeń do odjęcia"
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
