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
	name: "voice",

	options: [
		{
			name: "interface",
			name_localizations: {
				fr: "gérer",
				ja: "interface",
				ru: "interface",
				"es-ES": "interface"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			description: "Manage voice's interface",
			description_localizations: {
				fr: "Gérer les interfaces de créations de canaux vocaux",
				ja: "ボイスインターフェースを管理",
				ru: "Управление голосовым интерфейсом",
				"es-ES": "Gestionar la interfaz de voz"
			},

			options: [
				{
					name: "set-voice-channel",
					type: ApplicationCommandOptionType.Subcommand,

					description: "Set the channel for Join4Create!",
					description_localizations: {
						fr: "Définit le salon où le membre se connecte pour créer son propre canal",
						ja: "Join4Createのチャンネルを設定！",
						ru: "Установить канал для Join4Create!",
						"es-ES": "Establecer el canal para Join4Create!"
					},

					options: [
						{
							name: "channel",
							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildVoice],

							description: "The channel you want",
							description_localizations: {
								fr: "Le salon où les gens devront rejoindre pour créer leur propre salon",
								ja: "希望するチャンネル",
								ru: "Желаемый канал",
								"es-ES": "El canal que deseas"
							},

							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "set-text-channel",
					type: ApplicationCommandOptionType.Subcommand,

					description:
						"Send an interface to the channel to manage their own voice channel",
					description_localizations: {
						fr: "Envoyer une interface au canal pour gérer son propre canal vocal",
						ja: "自分のボイスチャンネルを管理するためのインターフェースをチャンネルに送信",
						ru: "Отправить интерфейс в канал для управления своим голосовым каналом",
						"es-ES": "Enviar una interfaz al canal para gestionar su propio canal de voz"
					},

					options: [
						{
							name: "channel",
							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							description:
								"The channel you want the dashboard interface are sent",
							description_localizations: {
								fr: "Le salon où l'interface sera envoyée",
								ja: "ダッシュボードインターフェースを送信するチャンネル",
								ru: "Канал для отправки интерфейса панели управления",
								"es-ES": "El canal donde quieres que se envíe la interfaz del panel"
							},

							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "set-staff-role",
					type: ApplicationCommandOptionType.Subcommand,

					description:
						"Set an role for bypassing TempChannel's permission",
					description_localizations: {
						fr: "Définir un rôle pour contourner l'autorisation des canaux temporaires",
						ja: "TempChannelの権限をバイパスするロールを設定",
						ru: "Установить роль для обхода прав TempChannel",
						"es-ES": "Establecer un rol para omitir los permisos de TempChannel"
					},

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "set-voice-channel-catgory",
					type: ApplicationCommandOptionType.Subcommand,

					description:
						"Set the channel where the voice channel will be created!",
					description_localizations: {
						fr: "Définit la catégorie où le canal perso va être créé",
						ja: "ボイスチャンネルが作成されるチャンネルを設定！",
						ru: "Установить канал, где будет создан голосовой канал!",
						"es-ES": "Establecer el canal donde se creará el canal de voz!"
					},

					options: [
						{
							name: "category",
							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildCategory],

							description: "The category you want",
							description_localizations: {
								fr: "La catégorie que vous voulez",
								ja: "希望するカテゴリ",
								ru: "Желаемая категория",
								"es-ES": "La categoría que deseas"
							},

							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "set-voice-channel-position",
					type: ApplicationCommandOptionType.Subcommand,

					description:
						"Set the voice channel position in the category when it will be created!",
					description_localizations: {
						fr: "Définit la position du salon où le canal perso va être créé dans la catégorie",
						ja: "ボイスチャンネル作成時のカテゴリ内の位置を設定！",
						ru: "Установить позицию голосового канала в категории при создании!",
						"es-ES": "Establecer la posición del canal de voz en la categoría cuando se cree!"
					},

					options: [
						{
							name: "position_type",
							type: ApplicationCommandOptionType.String,

							description: "The position type you want",
							description_localizations: {
								fr: "Quelle position veux-tu pour le salon ?",
								ja: "希望する位置タイプ",
								ru: "Желаемый тип позиции",
								"es-ES": "El tipo de posición que deseas"
							},

							choices: [
								{
									name: "Up (TOP)",
									name_localizations: {
										fr: "En haut",
										ja: "up_top",
										ru: "up_top",
										"es-ES": "up_top"
									},
									value: "top"
								},
								{
									name: "Down (Bottom)",
									name_localizations: {
										fr: "En bas",
										ja: "down_bottom",
										ru: "down_bottom",
										"es-ES": "down_bottom"
									},
									value: "bottom"
								}
							],

							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "set-voice-channel-name",
					type: ApplicationCommandOptionType.Subcommand,

					description:
						"Set the voice channel name when it will be created!",
					description_localizations: {
						fr: "Définit le nom du salon où le canal va être créé",
						ja: "ボイスチャンネル作成時の名前を設定！",
						ru: "Установить имя голосового канала при его создании!",
						"es-ES": "Establecer el nombre del canal de voz cuando se cree!"
					},

					options: [
						{
							name: "channel_name",
							type: ApplicationCommandOptionType.String,

							description:
								"The name you want | Variable: {Username}",
							description_localizations: {
								fr: "Le nom que tu veux | Variable: {Username}",
								ja: "希望する名前 | 変数: {Username}",
								ru: "Желаемое имя | Переменная: {Username}",
								"es-ES": "El nombre que deseas | Variable: {Username}"
							},

							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				}
			],
			permission: null
		}
	],

	description: "Subcommand group for voice's manager",
	description_localizations: {
		fr: "Commande sous-groupé pour la gestion de canaux vocaux",
		ja: "ボイス管理のサブコマンドグループ",
		ru: "Группа подкоманд для управления голосом",
		"es-ES": "Grupo de subcomando para el gestor de voz"
	},

	category: "voicedashboard",
	thinking: true,
	type: ApplicationCommandType.ChatInput,

	permission: null
};
