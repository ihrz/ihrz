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
	name: "notifier",

	description: "Subcommand category for notifier!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie des notifications de vidéo/short/stream",
		ja: "通知のサブコマンドカテゴリ！",
		ru: "Категория подкоманд для уведомлений!",
		"es-ES": "Categoría de subcomando para notificador!",
		ko: "알림 하위 명령어!",
		uk: "Категорія підкоманд для сповіщень!",
		de: "Unterbefehl-Kategorie für den Notifier!",
		it: "Categoria di sottocomandi per il notifier!",
		"pt-BR": "Categoria de subcomandos para o notifier!",
		pl: "Kategoria podkomend dla notifiera!"
	},

	options: [
		{
			name: "author",

			description: "Streamer/Youtuber/Twitcher manipulation",
			description_localizations: {
				fr: "Manipulation pour les streamer, youtubeur, twticherm vidéaste",
				ja: "ストリーマー/YouTuber/Twitcherの操作",
				ru: "Управление стримерами/YouTube/Twitch",
				"es-ES": "Manipulación de Streamer/Youtuber/Twitcher",
				ko: "스트리머/유튜버/트위치 스트리머 관리",
				uk: "Керування стримерами/ютуберами/твічерами",
				de: "Streamer/Youtuber/Twitcher verwalten",
				it: "Gestione di Streamer/Youtuber/Twitcher",
				"pt-BR": "Gerenciar Streamer/Youtuber/Twitcher",
				pl: "Zarządzanie streamerami/youtuberami/twitcherami"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: "add",
					prefixName: "author-add",

					description: "Add Streamer/Youtuber/Twitcher",
					description_localizations: {
						fr: "Ajouter Streamer/Youtuber/Twitcher",
						ja: "ストリーマー/YouTuber/Twitcherを追加",
						ru: "Добавить стримера/YouTube/Twitch",
						"es-ES": "Añadir Streamer/Youtuber/Twitcher",
						ko: "스트리머/유튜버/트위치 스트리머 추가",
						uk: "Додати стримера/ютубера/твічера",
						de: "Streamer/YouTuber/Twitcher hinzufügen",
						it: "Aggiungi Streamer/YouTuber/Twitcher",
						"pt-BR": "Adicionar Streamer/YouTuber/Twitcher",
						pl: "Dodaj streamera/YouTubera/Twitchera"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "platform",

							description:
								"The Streamer/Youtuber/Twitcher platform",
							description_localizations: {
								fr: "La plateforme du Streamer/Youtuber/Twitcher",
								ja: "ストリーマー/YouTuber/Twitcherのプラットフォーム",
								ru: "Платформа стримера/YouTube/Twitch",
								"es-ES":
									"La plataforma del Streamer/Youtuber/Twitcher",
								ko: "스트리머/유튜버/트위치 스트리머의 플랫폼",
								uk: "Платформа стримера/ютубера/твічера",
								de: "Plattform des Streamers/Youtubers/Twitchers",
								it: "Piattaforma dello Streamer/Youtuber/Twitcher",
								"pt-BR":
									"Plataforma do Streamer/Youtuber/Twitcher",
								pl: "Platforma streamera/youtubera/twitchera"
							},

							type: ApplicationCommandOptionType.String,

							choices: [
								{
									name: "Youtube",
									name_localizations: {
										fr: "Youtube",
										ja: "youtube",
										ru: "youtube",
										"es-ES": "youtube",
										ko: "YouTube",
										uk: "YouTube",
										de: "YouTube",
										it: "YouTube",
										"pt-BR": "YouTube",
										pl: "YouTube"
									},
									value: "youtube"
								},
								{
									name: "Twitch",
									name_localizations: {
										fr: "Twitch",
										ja: "twitch",
										ru: "twitch",
										"es-ES": "twitch",
										ko: "Twitch",
										uk: "Twitch",
										de: "Twitch",
										it: "Twitch",
										"pt-BR": "Twitch",
										pl: "Twitch"
									},
									value: "twitch"
								},
								{
									name: "Kick",
									name_localizations: {
										fr: "Kick",
										ja: "Kick",
										ru: "Kick",
										"es-ES": "Kick",
										ko: "Kick",
										uk: "Kick",
										de: "Kick",
										it: "Kick",
										"pt-BR": "Kick",
										pl: "Kick"
									},
									value: "kick"
								},
								{
									name: "Bluesky",
									name_localizations: {
										fr: "Bluesky",
										ja: "Bluesky",
										ru: "Bluesky",
										"es-ES": "Bluesky",
										ko: "Bluesky",
										uk: "Bluesky",
										de: "Bluesky",
										it: "Bluesky",
										"pt-BR": "Bluesky",
										pl: "Bluesky"
									},
									value: "bluesky"
								},
								{
									name: "Mastodon",
									name_localizations: {
										fr: "Mastodon",
										ja: "Mastodon",
										ru: "Mastodon",
										"es-ES": "Mastodon",
										ko: "Mastodon",
										uk: "Mastodon",
										de: "Mastodon",
										it: "Mastodon",
										"pt-BR": "Mastodon",
										pl: "Mastodon"
									},
									value: "mastodon"
								}
							],

							required: true,

							permission: null
						},
						{
							name: "author",

							description: "The Streamer/Youtuber/Twitcher ID",
							description_localizations: {
								fr: "L'identifiant du Streamer/Youtuber/Twitcher",
								ja: "ストリーマー/YouTuber/TwitcherのID",
								ru: "ID стримера/YouTube/Twitch",
								"es-ES": "El ID del Streamer/Youtuber/Twitcher",
								ko: "스트리머/유튜버/트위치 스트리머 ID",
								uk: "ID стримера/ютубера/твічера",
								de: "ID des Streamers/Youtubers/Twitchers",
								it: "ID dello Streamer/Youtuber/Twitcher",
								"pt-BR": "ID do Streamer/Youtuber/Twitcher",
								pl: "ID streamera/youtubera/twitchera"
							},

							type: ApplicationCommandOptionType.String,

							required: true,

							permission: null
						},
						{
							name: "channel",

							description:
								"Where this account posts (default: the notifier channel)",
							description_localizations: {
								fr: "Où ce compte publie (par défaut : le salon du notifier)",
								ja: "このアカウントの通知先（既定：通知チャンネル）",
								ru: "Куда публикует этот аккаунт (по умолчанию: канал уведомлений)",
								"es-ES":
									"Dónde publica esta cuenta (por defecto: el canal del notificador)",
								ko: "이 계정이 알림을 보낼 채널 (기본: 알림 채널)",
								uk: "Куди публікує цей акаунт (за замовчуванням: канал сповіщень)",
								de: "Wohin dieses Konto postet (Standard: der Benachrichtigungskanal)",
								it: "Dove pubblica questo account (predefinito: il canale delle notifiche)",
								"pt-BR":
									"Onde esta conta publica (padrão: o canal de notificações)",
								pl: "Gdzie publikuje to konto (domyślnie: kanał powiadomień)"
							},

							type: ApplicationCommandOptionType.Channel,

							channel_types: [
								ChannelType.GuildText,
								ChannelType.GuildAnnouncement
							],

							required: false,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "remove",
					prefixName: "author-remove",

					description: "Remove Streamer/Youtuber/Twitcher",
					description_localizations: {
						fr: "Supprimer Streamer/Youtuber/Twitcher",
						ja: "ストリーマー/YouTuber/Twitcherを削除",
						ru: "Удалить стримера/YouTube/Twitch",
						"es-ES": "Eliminar Streamer/Youtuber/Twitcher",
						ko: "스트리머/유튜버/트위치 스트리머 제거",
						uk: "Видалити стримера/ютубера/твічера",
						de: "Streamer/YouTuber/Twitcher entfernen",
						it: "Rimuovi Streamer/YouTuber/Twitcher",
						"pt-BR": "Remover Streamer/YouTuber/Twitcher",
						pl: "Usuń streamera/YouTubera/Twitchera"
					},

					type: ApplicationCommandOptionType.Subcommand,

					options: [
						{
							name: "platform",

							description:
								"The Streamer/Youtuber/Twitcher platform",
							description_localizations: {
								fr: "La plateforme du Streamer/Youtuber/Twitcher",
								ja: "ストリーマー/YouTuber/Twitcherのプラットフォーム",
								ru: "Платформа стримера/YouTube/Twitch",
								"es-ES":
									"La plataforma del Streamer/Youtuber/Twitcher",
								ko: "스트리머/유튜버/트위치 스트리머의 플랫폼",
								uk: "Платформа стримера/ютубера/твічера",
								de: "Plattform des Streamers/Youtubers/Twitchers",
								it: "Piattaforma dello Streamer/Youtuber/Twitcher",
								"pt-BR":
									"Plataforma do Streamer/Youtuber/Twitcher",
								pl: "Platforma streamera/youtubera/twitchera"
							},

							type: ApplicationCommandOptionType.String,

							choices: [
								{
									name: "Youtube",
									name_localizations: {
										fr: "Youtube",
										ja: "youtube",
										ru: "youtube",
										"es-ES": "youtube",
										ko: "YouTube",
										uk: "YouTube",
										de: "YouTube",
										it: "YouTube",
										"pt-BR": "YouTube",
										pl: "YouTube"
									},
									value: "youtube"
								},
								{
									name: "Twitch",
									name_localizations: {
										fr: "Twitch",
										ja: "twitch",
										ru: "twitch",
										"es-ES": "twitch",
										ko: "Twitch",
										uk: "Twitch",
										de: "Twitch",
										it: "Twitch",
										"pt-BR": "Twitch",
										pl: "Twitch"
									},
									value: "twitch"
								},
								{
									name: "Kick",
									name_localizations: {
										fr: "Kick",
										ja: "Kick",
										ru: "Kick",
										"es-ES": "Kick",
										ko: "Kick",
										uk: "Kick",
										de: "Kick",
										it: "Kick",
										"pt-BR": "Kick",
										pl: "Kick"
									},
									value: "kick"
								},
								{
									name: "Bluesky",
									name_localizations: {
										fr: "Bluesky",
										ja: "Bluesky",
										ru: "Bluesky",
										"es-ES": "Bluesky",
										ko: "Bluesky",
										uk: "Bluesky",
										de: "Bluesky",
										it: "Bluesky",
										"pt-BR": "Bluesky",
										pl: "Bluesky"
									},
									value: "bluesky"
								},
								{
									name: "Mastodon",
									name_localizations: {
										fr: "Mastodon",
										ja: "Mastodon",
										ru: "Mastodon",
										"es-ES": "Mastodon",
										ko: "Mastodon",
										uk: "Mastodon",
										de: "Mastodon",
										it: "Mastodon",
										"pt-BR": "Mastodon",
										pl: "Mastodon"
									},
									value: "mastodon"
								}
							],

							required: true,

							permission: null
						},
						{
							name: "author",

							description: "The Streamer/Youtuber/Twitcher ID",
							description_localizations: {
								fr: "L'identifiant du Streamer/Youtuber/Twitcher",
								ja: "ストリーマー/YouTuber/TwitcherのID",
								ru: "ID стримера/YouTube/Twitch",
								"es-ES": "El ID del Streamer/Youtuber/Twitcher",
								ko: "스트리머/유튜버/트위치 스트리머 ID",
								uk: "ID стримера/ютубера/твічера",
								de: "ID des Streamers/Youtubers/Twitchers",
								it: "ID dello Streamer/Youtuber/Twitcher",
								"pt-BR": "ID do Streamer/Youtuber/Twitcher",
								pl: "ID streamera/youtubera/twitchera"
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
					prefixName: "author-list",

					description: "Show Streamer/Youtuber/Twitcher",
					description_localizations: {
						fr: "Afficher tout les Streamer/Youtuber/Twitcher configurer",
						ja: "ストリーマー/YouTuber/Twitcherを表示",
						ru: "Показать стримера/YouTube/Twitch",
						"es-ES": "Mostrar Streamer/Youtuber/Twitcher",
						ko: "스트리머/유튜버/트위치 스트리머 보기",
						uk: "Показати стримерів/ютуберів/твічерів",
						de: "Streamer/Youtuber/Twitcher anzeigen",
						it: "Mostra Streamer/Youtuber/Twitcher",
						"pt-BR": "Mostrar Streamer/Youtuber/Twitcher",
						pl: "Pokaż streamerów/youtuberów/twitcherów"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			permission: null
		},
		{
			name: "config",

			description: "Configuration for the Notifier Module",
			description_localizations: {
				fr: "La configuration pour le module de Notifier",
				ja: "Notifierモジュールの設定",
				ru: "Настройка модуля Notifier",
				"es-ES": "Configuración para el módulo Notifier",
				ko: "Notifier 모듈 설정",
				uk: "Налаштування модуля Notifier",
				de: "Konfiguration des Notifier-Moduls",
				it: "Configurazione del modulo Notifier",
				"pt-BR": "Configuração do módulo Notifier",
				pl: "Konfiguracja modułu Notifier"
			},

			options: [
				{
					name: "channel",

					description:
						"When a Streamer/Youtuber/Twitcher publish a video, iHorizon send a message in channel",
					description_localizations: {
						fr: "Lorsqu'un Streamer/Youtuber/Twitcher publie une vidéo, iHorizon envoie un message dans le canal",
						ja: "ストリーマー/YouTuber/Twitcherが動画を公開したら、iHorizonがチャンネルにメッセージを送信",
						ru: "Когда стример/YouTube/Twitch публикует видео, iHorizon отправляет сообщение в канал",
						"es-ES":
							"Cuando un Streamer/Youtuber/Twitcher publica un video, iHorizon envía un mensaje en el canal",
						ko: "스트리머/유튜버/트위치 스트리머가 영상을 올리면 iHorizon이 채널에 메시지를 보내요",
						uk: "Коли стример/ютубер/твічер публікує відео, iHorizon надсилає повідомлення в канал",
						de: "Veröffentlicht ein Streamer/Youtuber/Twitcher etwas, sendet iHorizon eine Nachricht in den Kanal",
						it: "Quando uno Streamer/Youtuber/Twitcher pubblica, iHorizon invia un messaggio nel canale",
						"pt-BR":
							"Quando um Streamer/Youtuber/Twitcher publica, o iHorizon envia uma mensagem no canal",
						pl: "Gdy streamer/youtuber/twitcher coś opublikuje, iHorizon wyśle wiadomość na kanał"
					},

					options: [
						{
							name: "target",

							description: "The channel",
							description_localizations: {
								fr: "Le salon textuelle",
								ja: "チャンネル",
								ru: "Канал",
								"es-ES": "El canal",
								ko: "채널",
								uk: "Канал",
								de: "Der Kanal",
								it: "Il canale",
								"pt-BR": "O canal",
								pl: "Kanał"
							},

							channel_types: [
								ChannelType.GuildText,
								ChannelType.GuildAnnouncement
							],
							type: ApplicationCommandOptionType.Channel,
							required: true,

							permission: null
						}
					],

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "message",

					description:
						"When a Streamer/Youtuber/Twitcher publish a video, iHorizon send a message",
					description_localizations: {
						fr: "Lorsqu'un Streamer/Youtuber/Twitcher publie une vidéo, iHorizon envoie un message",
						ja: "ストリーマー/YouTuber/Twitcherが動画を公開したら、iHorizonがメッセージを送信",
						ru: "Когда стример/YouTube/Twitch публикует видео, iHorizon отправляет сообщение",
						"es-ES":
							"Cuando un Streamer/Youtuber/Twitcher publica un video, iHorizon envía un mensaje",
						ko: "스트리머/유튜버/트위치 스트리머가 영상을 올리면 iHorizon이 메시지를 보내요",
						uk: "Коли стример/ютубер/твічер публікує відео, iHorizon надсилає повідомлення",
						de: "Wenn ein Streamer/Youtuber/Twitcher etwas veröffentlicht, sendet iHorizon eine Nachricht",
						it: "Quando uno Streamer/Youtuber/Twitcher pubblica, iHorizon invia un messaggio",
						"pt-BR":
							"Quando um Streamer/Youtuber/Twitcher publica, o iHorizon envia uma mensagem",
						pl: "Gdy streamer/youtuber/twitcher coś opublikuje, iHorizon wyśle wiadomość"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: PermissionFlagsBits.ManageGuild
		}
	],
	thinking: false,
	category: "notifier",
	type: ApplicationCommandType.ChatInput,

	permission: null
};
