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
	name: "blogger",

	description: "Subcommand category for blogger RSS feeds!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie des flux RSS de blogs",
		ja: "ブロガーRSSフィードのサブコマンドカテゴリ！",
		ru: "Категория подкоманд для RSS-лент блога!",
		"es-ES": "Categoría de subcomando para feeds RSS de blogger!",
		ko: "블로그 RSS 피드 하위 명령어!",
		uk: "Категорія підкоманд для RSS-стрічок блогів!",
		de: "Unterbefehl-Kategorie für Blogger-RSS-Feeds!",
		it: "Categoria di sottocomandi per i feed RSS dei blog!",
		"pt-BR": "Categoria de subcomandos para feeds RSS de blogs!",
		pl: "Kategoria podkomend dla kanałów RSS blogów!"
	},

	options: [
		{
			name: "blog",

			description: "Blog RSS feed manipulation",
			description_localizations: {
				fr: "Manipulation des flux RSS de blogs",
				ja: "ブログRSSフィードの操作",
				ru: "Управление RSS-лентами блога",
				"es-ES": "Manipulación de feeds RSS de blog",
				ko: "블로그 RSS 피드 관리",
				uk: "Керування RSS-стрічками блогів",
				de: "Blog-RSS-Feeds verwalten",
				it: "Gestione dei feed RSS dei blog",
				"pt-BR": "Gerenciar feeds RSS de blogs",
				pl: "Zarządzanie kanałami RSS blogów"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: "add",
					prefixName: "blog-add",

					description: "Add a blog RSS feed",
					description_localizations: {
						fr: "Ajouter un flux RSS de blog",
						ja: "ブログのRSSフィードを追加",
						ru: "Добавить RSS-ленту блога",
						"es-ES": "Añadir un feed RSS de blog",
						ko: "블로그 RSS 피드 추가",
						uk: "Додати RSS-стрічку блогу",
						de: "Einen Blog-RSS-Feed hinzufügen",
						it: "Aggiungi un feed RSS di un blog",
						"pt-BR": "Adicionar um feed RSS de blog",
						pl: "Dodaj kanał RSS bloga"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "rss",

							description: "The RSS feed URL",
							description_localizations: {
								fr: "L'URL du flux RSS",
								ja: "RSSフィードのURL",
								ru: "URL RSS-ленты",
								"es-ES": "La URL del feed RSS",
								ko: "RSS 피드 URL",
								uk: "URL RSS-стрічки",
								de: "Die URL des RSS-Feeds",
								it: "L'URL del feed RSS",
								"pt-BR": "A URL do feed RSS",
								pl: "Adres URL kanału RSS"
							},

							type: ApplicationCommandOptionType.String,

							required: true,

							permission: null
						},
						{
							name: "channel",

							description:
								"The channel where notifications will be sent",
							description_localizations: {
								fr: "Le salon où les notifications seront envoyées",
								ja: "通知が送信されるチャンネル",
								ru: "Канал, куда будут отправляться уведомления",
								"es-ES":
									"El canal donde se enviarán las notificaciones",
								ko: "알림을 보낼 채널",
								uk: "Канал, куди надсилатимуться сповіщення",
								de: "Kanal, in dem Benachrichtigungen gesendet werden",
								it: "Canale in cui verranno inviate le notifiche",
								"pt-BR":
									"Canal onde as notificações serão enviadas",
								pl: "Kanał, na który trafią powiadomienia"
							},

							channel_types: [ChannelType.GuildText],
							type: ApplicationCommandOptionType.Channel,

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "remove",
					prefixName: "blog-remove",

					description: "Remove a blog RSS feed",
					description_localizations: {
						fr: "Supprimer un flux RSS de blog",
						ja: "ブログのRSSフィードを削除",
						ru: "Удалить RSS-ленту блога",
						"es-ES": "Eliminar un feed RSS de blog",
						ko: "블로그 RSS 피드 제거",
						uk: "Видалити RSS-стрічку блогу",
						de: "Einen Blog-RSS-Feed entfernen",
						it: "Rimuovi un feed RSS di un blog",
						"pt-BR": "Remover um feed RSS de blog",
						pl: "Usuń kanał RSS bloga"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "id",

							description: "The blog RSS feed ID",
							description_localizations: {
								fr: "L'identifiant du flux RSS",
								ja: "ブログRSSフィードのID",
								ru: "ID RSS-ленты блога",
								"es-ES": "El ID del feed RSS del blog",
								ko: "블로그 RSS 피드 ID",
								uk: "ID RSS-стрічки блогу",
								de: "ID des Blog-RSS-Feeds",
								it: "ID del feed RSS del blog",
								"pt-BR": "ID do feed RSS do blog",
								pl: "ID kanału RSS bloga"
							},

							type: ApplicationCommandOptionType.String,

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "list",
					prefixName: "blog-list",

					description: "Show all configured blog RSS feeds",
					description_localizations: {
						fr: "Afficher tous les flux RSS de blogs configurés",
						ja: "設定された全ブログRSSフィードを表示",
						ru: "Показать все настроенные RSS-ленты блогов",
						"es-ES":
							"Mostrar todos los feeds RSS de blog configurados",
						ko: "설정된 모든 블로그 RSS 피드를 보여줘요",
						uk: "Показати всі налаштовані RSS-стрічки блогів",
						de: "Zeigt alle eingerichteten Blog-RSS-Feeds",
						it: "Mostra tutti i feed RSS dei blog configurati",
						"pt-BR":
							"Mostra todos os feeds RSS de blogs configurados",
						pl: "Pokazuje wszystkie skonfigurowane kanały RSS blogów"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			permission: null
		},
		{
			name: "config",

			description: "Configuration for the Blogger Module",
			description_localizations: {
				fr: "La configuration pour le module Blogger",
				ja: "Bloggerモジュールの設定",
				ru: "Настройка модуля Blogger",
				"es-ES": "Configuración para el módulo Blogger",
				ko: "Blogger 모듈 설정",
				uk: "Налаштування модуля Blogger",
				de: "Konfiguration des Blogger-Moduls",
				it: "Configurazione del modulo Blogger",
				"pt-BR": "Configuração do módulo Blogger",
				pl: "Konfiguracja modułu Blogger"
			},

			options: [
				{
					name: "status",

					description: "Enable or disable the Blogger module",
					description_localizations: {
						fr: "Activer ou désactiver le module Blogger",
						ja: "Bloggerモジュールを有効化または無効化",
						ru: "Включить или отключить модуль Blogger",
						"es-ES": "Habilitar o deshabilitar el módulo Blogger",
						ko: "Blogger 모듈을 켜거나 꺼요",
						uk: "Увімкнути або вимкнути модуль Blogger",
						de: "Blogger-Modul aktivieren oder deaktivieren",
						it: "Attiva o disattiva il modulo Blogger",
						"pt-BR": "Ative ou desative o módulo Blogger",
						pl: "Włącz lub wyłącz moduł Blogger"
					},

					options: [
						{
							name: "power",

							description: "Power On or Power Off",
							description_localizations: {
								fr: "Activer ou Désactiver",
								ja: "オンまたはオフ",
								ru: "Включить или Выключить",
								"es-ES": "Encender o Apagar",
								ko: "켜기 또는 끄기",
								uk: "Увімкнути або вимкнути",
								de: "Ein- oder ausschalten",
								it: "Attiva o disattiva",
								"pt-BR": "Ligar ou desligar",
								pl: "Włącz lub wyłącz"
							},

							type: ApplicationCommandOptionType.String,

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

							permission: null
						}
					],

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: PermissionFlagsBits.ManageGuild
		}
	],
	thinking: false,
	category: "blogger",
	type: ApplicationCommandType.ChatInput,

	permission: null
};
