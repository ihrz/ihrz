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
	name: "starboard",
	aliases: [],

	category: "starboard",
	description: "SubCommand group for Starboard category",
	description_localizations: {
		fr: "sous-commande groupé pour la catégorie Starboard",
		ja: "スターボードカテゴリのサブコマンドグループ",
		ru: "Группа подкоманд для категории Starboard",
		"es-ES": "Grupo de subcomando para la categoría Starboard",
		ko: "스타보드 카테고리의 하위 명령어 그룹",
		uk: "Група підкоманд для категорії Starboard",
		de: "Unterbefehlsgruppe für die Starboard-Kategorie",
		it: "Gruppo di sottocomandi per la categoria Starboard",
		"pt-BR": "Grupo de subcomandos da categoria Starboard",
		pl: "Grupa podkomend kategorii Starboard"
	},

	permission: [PermissionFlagsBits.Administrator],
	thinking: false,

	options: [
		{
			name: "config",
			prefixName: "starboarconfig",

			description: "Enable or disable the module",
			description_localizations: {
				fr: "désactiver ou activer le module",
				ja: "モジュールを有効化または無効化",
				ru: "Включить или отключить модуль",
				"es-ES": "Habilitar o deshabilitar el módulo",
				ko: "모듈을 켜거나 꺼요",
				uk: "Увімкнути або вимкнути модуль",
				de: "Modul aktivieren oder deaktivieren",
				it: "Attiva o disattiva il modulo",
				"pt-BR": "Ative ou desative o módulo",
				pl: "Włącz lub wyłącz moduł"
			},

			options: [
				{
					name: "action",

					description: "What you want to do ?",
					description_localizations: {
						fr: "que voulez-vous faire?",
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

					choices: [
						{
							name: "Power On",
							name_localizations: {
								fr: "Activer",
								ja: "power_on",
								ru: "power_on",
								"es-ES": "power_on",
								ko: "켜기",
								uk: "Увімкнути",
								de: "Einschalten",
								it: "Attiva",
								"pt-BR": "Ligar",
								pl: "Włącz"
							},
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: {
								fr: "Désactiver",
								ja: "power_off",
								ru: "power_off",
								"es-ES": "power_off",
								ko: "끄기",
								uk: "Вимкнути",
								de: "Ausschalten",
								it: "Disattiva",
								"pt-BR": "Desligar",
								pl: "Wyłącz"
							},
							value: "off"
						}
					],

					required: true,
					type: ApplicationCommandOptionType.String,

					permission: null
				}
			],

			permission: [PermissionFlagsBits.Administrator],

			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: "channel",
			prefixName: "starboard-channel",

			description:
				"Change the channel which are send the most starred messages",
			description_localizations: {
				fr: "Changer le salon où sont envoyer les messages avec le plus d'étoile.",
				ja: "最も多くのスター付きメッセージが送信されるチャンネルを変更",
				ru: "Изменить канал для сообщений со звездами",
				"es-ES":
					"Cambiar el canal donde se envían los mensajes más destacados",
				ko: "별 반응을 가장 많이 받은 메시지를 보낼 채널을 변경해요",
				uk: "Змінити канал для повідомлень з найбільшою кількістю зірок",
				de: "Ändere den Kanal für die am meisten mit Stern bewerteten Nachrichten",
				it: "Cambia il canale dei messaggi con più stelle",
				"pt-BR": "Altere o canal das mensagens mais estreladas",
				pl: "Zmień kanał z najczęściej gwiazdkowanymi wiadomościami"
			},

			options: [
				{
					name: "to",

					description: "the channel you want",
					description_localizations: {
						fr: "Le salon que vous souhaitez",
						ja: "希望するチャンネル",
						ru: "желаемый канал",
						"es-ES": "el canal que deseas",
						ko: "원하는 채널",
						uk: "бажаний канал",
						de: "Der gewünschte Kanal",
						it: "Il canale che vuoi",
						"pt-BR": "O canal que você quer",
						pl: "Wybrany kanał"
					},

					permission: null,
					required: true,
					channel_types: [
						ChannelType.GuildText,
						ChannelType.GuildAnnouncement
					],

					type: ApplicationCommandOptionType.Channel
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: [PermissionFlagsBits.Administrator]
		},
		{
			name: "threshold",
			name_localizations: {
				fr: "seuil",
				ja: "threshold",
				ru: "threshold",
				"es-ES": "threshold",
				ko: "threshold",
				uk: "threshold",
				de: "threshold",
				it: "threshold",
				"pt-BR": "threshold",
				pl: "threshold"
			},
			prefixName: "starboardthreshold",

			description:
				"Set the star threshold needed for being referenced into the channel",
			description_localizations: {
				fr: "Définissez le seuil d'étoiles nécessaire pour être référencé dans le canal.",
				ja: "チャンネルで参照されるために必要なスターのしきい値を設定",
				ru: "Установить порог звезд для попадания в канал",
				"es-ES":
					"Establecer el umbral de estrellas necesario para ser referenciado en el canal",
				ko: "채널에 올라가는 데 필요한 별 수를 설정해요",
				uk: "Встановити поріг зірок для потрапляння в канал",
				de: "Legt die nötige Sternanzahl für die Aufnahme in den Kanal fest",
				it: "Imposta la soglia di stelle per essere inserito nel canale",
				"pt-BR":
					"Define o limite de estrelas para ser incluído no canal",
				pl: "Ustawia próg gwiazdek potrzebny do umieszczenia na kanale"
			},

			options: [
				{
					name: "amount",

					description: "the threshold",
					description_localizations: {
						fr: "Le seuil/pallier",
						ja: "しきい値",
						ru: "порог",
						"es-ES": "el umbral",
						ko: "기준 수",
						uk: "поріг",
						de: "Der Schwellenwert",
						it: "La soglia",
						"pt-BR": "O limite",
						pl: "Próg"
					},

					type: ApplicationCommandOptionType.Number,
					required: true,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: [PermissionFlagsBits.Administrator]
		},
		{
			name: "create-thread",
			prefixName: "starboardthread",

			description:
				"Create a thread bellow the message into the star channel ?",
			description_localizations: {
				fr: "Créer un fil de discussion en dessous du message dans le canal ?",
				ja: "スターチャンネルのメッセージの下にスレッドを作成しますか？",
				ru: "Создать ветку под сообщением в звездном канале?",
				"es-ES":
					"Crear un hilo debajo del mensaje en el canal de estrellas?",
				ko: "스타 채널의 메시지 아래에 스레드를 만들까요?",
				uk: "Створювати гілку під повідомленням у каналі зірок?",
				de: "Thread unter der Nachricht im Sternkanal erstellen?",
				it: "Creare un thread sotto il messaggio nel canale delle stelle?",
				"pt-BR":
					"Criar um tópico abaixo da mensagem no canal de estrelas?",
				pl: "Utworzyć wątek pod wiadomością na kanale gwiazdek?"
			},

			options: [
				{
					name: "action",

					description: "What you want to do?",
					description_localizations: {
						fr: "que voulez-vous faire?",
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

					choices: [
						{
							name: "Create thread",
							name_localizations: {
								fr: "Créer un fil",
								ja: "create_thread",
								ru: "create_thread",
								"es-ES": "create_thread",
								ko: "스레드 만들기",
								uk: "Створювати гілку",
								de: "Thread erstellen",
								it: "Crea thread",
								"pt-BR": "Criar tópico",
								pl: "Utwórz wątek"
							},
							value: "yes"
						},
						{
							name: "Don't create thread",
							name_localizations: {
								fr: "Ne pas créer un fil",
								ja: "don_t_create_thread",
								ru: "don_t_create_thread",
								"es-ES": "don_t_create_thread",
								ko: "스레드 만들지 않기",
								uk: "Не створювати гілку",
								de: "Keinen Thread erstellen",
								it: "Non creare thread",
								"pt-BR": "Não criar tópico",
								pl: "Nie twórz wątku"
							},
							value: "no"
						}
					],

					type: ApplicationCommandOptionType.String,
					permission: null,
					required: true
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: [PermissionFlagsBits.Administrator]
		}
	],

	type: ApplicationCommandType.ChatInput
};
