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
	ChannelType,
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "ticket",

	description: "Subcommand for ticket category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de ticket",
		ja: "チケットカテゴリのサブコマンド！",
		ru: "Подкоманда для категории тикетов!",
		"es-ES": "Subcomando para la categoría de tickets!",
		ko: "티켓 하위 명령어!",
		uk: "Підкоманда для категорії тікетів!",
		de: "Unterbefehle der Ticket-Kategorie!",
		it: "Sottocomandi della categoria ticket!",
		"pt-BR": "Subcomandos da categoria tickets!",
		pl: "Podkomendy kategorii ticketów!"
	},

	options: [
		{
			name: "add-member",

			description: "Add a member into your ticket!",
			description_localizations: {
				fr: "Ajoutez un membre dans votre ticket",
				ja: "チケットにメンバーを追加！",
				ru: "Добавить участника в тикет!",
				"es-ES": "Añadir un miembro a tu ticket!",
				ko: "티켓에 멤버를 추가해요!",
				uk: "Додати учасника до вашого тікета!",
				de: "Füge ein Mitglied zu deinem Ticket hinzu!",
				it: "Aggiungi un membro al tuo ticket!",
				"pt-BR": "Adicione um membro ao seu ticket!",
				pl: "Dodaj członka do swojego ticketu!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to add into your ticket",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez ajouter à votre ticket",
						ja: "チケットに追加したいユーザー",
						ru: "Пользователь, которого вы хотите добавить в тикет",
						"es-ES": "El usuario que quieres añadir a tu ticket",
						ko: "티켓에 추가할 사용자",
						uk: "Користувач, якого ви хочете додати до тікета",
						de: "Das Mitglied, das du zu deinem Ticket hinzufügen willst",
						it: "L'utente da aggiungere al tuo ticket",
						"pt-BR":
							"O usuário que você quer adicionar ao seu ticket",
						pl: "Użytkownik do dodania do twojego ticketu"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "close",

			description: "Close a ticket!",
			description_localizations: {
				fr: "Fermer un ticket",
				ja: "チケットを閉じる！",
				ru: "Закрыть тикет!",
				"es-ES": "Cerrar un ticket!",
				ko: "티켓을 닫아요!",
				uk: "Закрити тікет!",
				de: "Schließe ein Ticket!",
				it: "Chiudi un ticket!",
				"pt-BR": "Feche um ticket!",
				pl: "Zamknij ticket!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "rename",

			description: "Rename a ticket!",
			description_localizations: {
				fr: "Rénommer un ticket",
				ja: "チケットの名前を変更！",
				ru: "Переименовать тикет!",
				"es-ES": "Renombrar un ticket!",
				ko: "티켓 이름을 바꿔요!",
				uk: "Перейменувати тікет!",
				de: "Benenne ein Ticket um!",
				it: "Rinomina un ticket!",
				"pt-BR": "Renomeie um ticket!",
				pl: "Zmień nazwę ticketu!"
			},

			options: [
				{
					name: "name",

					description: "The new name of the ticket channel.",
					description_localizations: {
						fr: "Le nouveau nom du canal de ticket",
						ja: "チケットチャンネルの新しい名前。",
						ru: "Новое название канала тикета.",
						"es-ES": "El nuevo nombre del canal de ticket.",
						ko: "티켓 채널의 새 이름",
						uk: "Нова назва каналу тікета.",
						de: "Der neue Name des Ticket-Kanals.",
						it: "Il nuovo nome del canale del ticket.",
						"pt-BR": "O novo nome do canal do ticket.",
						pl: "Nowa nazwa kanału ticketu."
					},

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "remind",

			description:
				"Remind the ticket owner that they not have responded since while !",
			description_localizations: {
				fr: "Rappelez au propriétaire du ticket qu'il n'a pas répondu depuis un certain temps !",
				ja: "チケット所有者がしばらく応答していないことを通知！",
				ru: "Напомнить владельцу тикета, что он давно не отвечал!",
				"es-ES":
					"Recordar al propietario del ticket que no ha respondido desde hace tiempo!",
				ko: "한동안 응답하지 않은 티켓 작성자에게 알림을 보내요!",
				uk: "Нагадати власнику тікета, що він давно не відповідав!",
				de: "Erinnere den Ticket-Ersteller, dass er seit Längerem nicht geantwortet hat!",
				it: "Ricorda al proprietario del ticket che non risponde da un po'!",
				"pt-BR":
					"Lembre o dono do ticket de que ele não responde há um tempo!",
				pl: "Przypomnij autorowi ticketu, że od dawna nie odpowiada!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: [PermissionFlagsBits.ManageChannels]
		},
		{
			name: "delete",
			prefixName: "ticket-delete",

			description: "Delete a iHorizon ticket!",
			description_localizations: {
				fr: "Supprimer un ticket",
				ja: "iHorizonチケットを削除！",
				ru: "Удалить тикет iHorizon!",
				"es-ES": "Eliminar un ticket de iHorizon!",
				ko: "iHorizon 티켓을 삭제해요!",
				uk: "Видалити тікет iHorizon!",
				de: "Lösche ein iHorizon-Ticket!",
				it: "Elimina un ticket iHorizon!",
				"pt-BR": "Exclua um ticket do iHorizon!",
				pl: "Usuń ticket iHorizon!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			aliases: ["tdelete"],

			permission: null
		},
		{
			name: "config",
			prefixName: "ticket-config",

			description: "Disable ticket commands on a guild!",
			description_localizations: {
				fr: "Désactiver les commande de ticket au seins du serveur",
				ja: "サーバーでチケットコマンドを無効化！",
				ru: "Отключить команды тикетов на сервере!",
				"es-ES": "Deshabilitar los comandos de ticket en un servidor!",
				ko: "서버에서 티켓 명령어를 비활성화해요!",
				uk: "Вимкнути команди тікетів на сервері!",
				de: "Ticket-Befehle auf einem Server deaktivieren!",
				it: "Disattiva i comandi ticket in un server!",
				"pt-BR": "Desative os comandos de ticket em um servidor!",
				pl: "Wyłącz komendy ticketów na serwerze!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What you want to do ?",
					description_localizations: {
						fr: "Que veux-tu faire? ",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					required: true,
					choices: [
						{
							name: "Remove the module",
							name_localizations: {
								fr: "Supprimer le module",
								ja: "remove_the_module",
								ru: "remove_the_module",
								"es-ES": "remove_the_module",
								ko: "모듈 제거",
								uk: "Вимкнути модуль",
								de: "Modul entfernen",
								it: "Rimuovi il modulo",
								"pt-BR": "Remover o módulo",
								pl: "Usuń moduł"
							},
							value: "off"
						},
						{
							name: "Power on the module",
							name_localizations: {
								fr: "Activer le module",
								ja: "power_on_the_module",
								ru: "power_on_the_module",
								"es-ES": "power_on_the_module",
								ko: "모듈 켜기",
								uk: "Увімкнути модуль",
								de: "Modul einschalten",
								it: "Attiva il modulo",
								"pt-BR": "Ligar o módulo",
								pl: "Włącz moduł"
							},
							value: "on"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "log-channel",

			description:
				"Set a channel where iHorizon sent a logs about tickets!",
			description_localizations: {
				fr: "Définir un canal sur lequel iHorizon a envoyé des journaux sur les tickets",
				ja: "iHorizonがチケットに関するログを送信するチャンネルを設定！",
				ru: "Установить канал для логов iHorizon о тикетах!",
				"es-ES":
					"Establecer un canal donde iHorizon envíe registros sobre tickets!",
				ko: "iHorizon이 티켓 로그를 보낼 채널을 설정해요!",
				uk: "Встановити канал, куди iHorizon надсилатиме логи тікетів!",
				de: "Legt einen Kanal für iHorizons Ticket-Logs fest!",
				it: "Imposta un canale dove iHorizon invia i log dei ticket!",
				"pt-BR":
					"Define um canal onde o iHorizon envia os logs de tickets!",
				pl: "Ustawia kanał, na który iHorizon wysyła logi ticketów!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					description: "Where you want the logs",
					description_localizations: {
						fr: "Où voulez-vous les journaux ?",
						ja: "ログを送信する場所",
						ru: "Куда вы хотите отправлять логи",
						"es-ES": "Donde quieres los registros",
						ko: "로그를 보낼 위치",
						uk: "Куди надсилати логи",
						de: "Wo die Logs landen sollen",
						it: "Dove vuoi i log",
						"pt-BR": "Onde você quer os logs",
						pl: "Gdzie mają trafiać logi"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "open",

			description: "re-open a closed ticket!",
			description_localizations: {
				fr: "Re-ouvrir un ticket fermet",
				ja: "閉じたチケットを再オープン！",
				ru: "переоткрыть закрытый тикет!",
				"es-ES": "reabrir un ticket cerrado!",
				ko: "닫힌 티켓을 다시 열어요!",
				uk: "Повторно відкрити закритий тікет!",
				de: "Öffnet ein geschlossenes Ticket erneut!",
				it: "Riapre un ticket chiuso!",
				"pt-BR": "Reabre um ticket fechado!",
				pl: "Ponownie otwiera zamknięty ticket!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "remove-member",

			description: "Remove a member from your ticket!",
			description_localizations: {
				fr: "Enlever un membre d'un ticket",
				ja: "チケットからメンバーを削除！",
				ru: "Удалить участника из тикета!",
				"es-ES": "Eliminar a un miembro de tu ticket!",
				ko: "티켓에서 멤버를 제거해요!",
				uk: "Видалити учасника з вашого тікета!",
				de: "Entferne ein Mitglied aus deinem Ticket!",
				it: "Rimuovi un membro dal tuo ticket!",
				"pt-BR": "Remova um membro do seu ticket!",
				pl: "Usuń członka ze swojego ticketu!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to remove into your ticket",
					description_localizations: {
						fr: "L'utilisateur que vous souhaitez supprimer de votre ticket",
						ja: "チケットから削除したいユーザー",
						ru: "Пользователь, которого вы хотите удалить из тикета",
						"es-ES": "El usuario que quieres eliminar de tu ticket",
						ko: "티켓에서 제거할 사용자",
						uk: "Користувач, якого ви хочете видалити з тікета",
						de: "Das Mitglied, das du aus deinem Ticket entfernen willst",
						it: "L'utente da rimuovere dal tuo ticket",
						"pt-BR":
							"O usuário que você quer remover do seu ticket",
						pl: "Użytkownik do usunięcia z twojego ticketu"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "panel",

			description: "Making a panel for custom ticket configuration",
			description_localizations: {
				fr: "Créer un panel pour customiser le système de ticket",
				ja: "カスタムチケット設定用パネルを作成",
				ru: "Создание панели для настройки тикетов",
				"es-ES":
					"Crear un panel para configuración de tickets personalizada",
				ko: "맞춤 티켓 설정 패널을 만들어요",
				uk: "Створення панелі для власного налаштування тікетів",
				de: "Erstelle ein Panel für eine eigene Ticket-Konfiguration",
				it: "Crea un pannello per la configurazione personalizzata dei ticket",
				"pt-BR":
					"Crie um painel para configuração personalizada de tickets",
				pl: "Utwórz panel własnej konfiguracji ticketów"
			},

			options: [
				{
					name: "panel_id",

					description: "ID of your panel",
					description_localizations: {
						fr: "L'identifiant du panel",
						ja: "パネルのID",
						ru: "ID вашей панели",
						"es-ES": "ID de tu panel",
						ko: "패널 ID",
						uk: "ID вашої панелі",
						de: "ID deines Panels",
						it: "ID del tuo pannello",
						"pt-BR": "ID do seu painel",
						pl: "ID twojego panelu"
					},

					required: false,
					type: ApplicationCommandOptionType.String,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "set-category",

			description: "Set the category where ticket are create!",
			description_localizations: {
				fr: "Définir la catégorie dans laquelle les ticket doivent être créés",
				ja: "チケットが作成されるカテゴリを設定！",
				ru: "Установить категорию для создания тикетов!",
				"es-ES": "Establecer la categoría donde se crean los tickets!",
				ko: "티켓이 생성될 카테고리를 설정해요!",
				uk: "Встановити категорію, у якій створюються тікети!",
				de: "Legt die Kategorie für neue Tickets fest!",
				it: "Imposta la categoria in cui vengono creati i ticket!",
				"pt-BR": "Define a categoria onde os tickets são criados!",
				pl: "Ustawia kategorię, w której powstają tickety!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "category-name",

					description: "The name of you ticket's panel.",
					description_localizations: {
						fr: "Le nom du panneau de votre ticket",
						ja: "チケットパネルの名前。",
						ru: "Название вашей панели тикетов.",
						"es-ES": "El nombre de tu panel de tickets.",
						ko: "티켓 패널 이름",
						uk: "Назва вашої панелі тікетів.",
						de: "Der Name deines Ticket-Panels.",
						it: "Il nome del tuo pannello ticket.",
						"pt-BR": "O nome do seu painel de tickets.",
						pl: "Nazwa twojego panelu ticketów."
					},

					channel_types: [ChannelType.GuildCategory],

					type: ApplicationCommandOptionType.Channel,
					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "transcript",

			description: "Get the transript of a ticket message!",
			description_localizations: {
				fr: "Obtenir la transcription d'un message de ticket",
				ja: "チケットメッセージのトランスクリプトを取得！",
				ru: "Получить транскрипт тикета!",
				"es-ES": "Obtener la transcripción de un mensaje de ticket!",
				ko: "티켓 대화 기록을 받아요!",
				uk: "Отримати транскрипт тікета!",
				de: "Zeige das Transkript eines Tickets!",
				it: "Ottieni la trascrizione di un ticket!",
				"pt-BR": "Veja a transcrição de um ticket!",
				pl: "Pokaż transkrypt ticketu!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "unlink",

			description: "Unlink a ticket!",
			description_localizations: {
				fr: "Transforme le salon de ticket en salon classique auprès du bot.",
				ja: "チケットのリンクを解除！",
				ru: "Отвязать тикет!",
				"es-ES": "Desvincular un ticket!",
				ko: "티켓 연결을 해제해요!",
				uk: "Відв'язати тікет!",
				de: "Löst die Verknüpfung eines Tickets!",
				it: "Scollega un ticket!",
				"pt-BR": "Desvincula um ticket!",
				pl: "Odłącza ticket!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		}
	],
	thinking: true,
	category: "ticket",
	type: ApplicationCommandType.ChatInput,

	permission: null
};
