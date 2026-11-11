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
		ko: "알림 하위 명령어!"
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
				ko: "스트리머/유튜버/트위치 스트리머 관리"
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
						ko: "스트리머/유튜버/트위치 스트리머 추가"
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
								ko: "스트리머/유튜버/트위치 스트리머의 플랫폼"
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
										ko: "YouTube"
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
										ko: "Twitch"
									},
									value: "twitch"
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
								ko: "스트리머/유튜버/트위치 스트리머 ID"
							},

							type: ApplicationCommandOptionType.String,

							required: true,

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
						ko: "스트리머/유튜버/트위치 스트리머 제거"
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
								ko: "스트리머/유튜버/트위치 스트리머의 플랫폼"
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
										ko: "YouTube"
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
										ko: "Twitch"
									},
									value: "twitch"
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
								ko: "스트리머/유튜버/트위치 스트리머 ID"
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
						ko: "스트리머/유튜버/트위치 스트리머 보기"
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
				ko: "Notifier 모듈 설정"
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
						ko: "스트리머/유튜버/트위치 스트리머가 영상을 올리면 iHorizon이 채널에 메시지를 보내요"
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
								ko: "채널"
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
						ko: "스트리머/유튜버/트위치 스트리머가 영상을 올리면 iHorizon이 메시지를 보내요"
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
