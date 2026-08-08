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

import { LanguageData } from "../../../../../types/languageData.js";
import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "skullboard",
	aliases: [],

	category: "starboard",
	description: "SubCommand group for Starboard category",
	description_localizations: {
		fr: "sous-commande groupé pour la catégorie Starboard",
		ja: "スターボードカテゴリのサブコマンドグループ",
		ru: "Группа подкоманд для категории Starboard",
		"es-ES": "Grupo de subcomando para la categoría Starboard"
	},

	permission: [PermissionFlagsBits.Administrator],
	thinking: false,

	options: [
		{
			name: "config",
			prefixName: "skullboardconfig",

			description: "Enable or disable the module",
			description_localizations: {
				fr: "désactiver ou activer le module",
				ja: "モジュールを有効化または無効化",
				ru: "Включить или отключить модуль",
				"es-ES": "Habilitar o deshabilitar el módulo"
			},

			options: [
				{
					name: "action",

					description: "What you want to do ?",
					description_localizations: {
						fr: "que voulez-vous faire?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?"
					},

					choices: [
						{
							name: "Power On",
							name_localizations: {
								fr: "Activer",
								ja: "power_on",
								ru: "power_on",
								"es-ES": "power_on"
							},
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: {
								fr: "Désactiver",
								ja: "power_off",
								ru: "power_off",
								"es-ES": "power_off"
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
			prefixName: "skullboardchannel",

			description:
				"Change the channel which are send the most skulled messages",
			description_localizations: {
				fr: "Changer le salon où sont envoyer les messages avec le plus de crâne.",
				ja: "最も多くの skulled メッセージが送信されるチャンネルを変更",
				ru: "Изменить канал для сообщений с черепами",
				"es-ES": "Cambiar el canal donde se envían los mensajes más skulled"
			},

			options: [
				{
					name: "to",

					description: "the channel you want",
					description_localizations: {
						fr: "Le salon que vous souhaitez",
						ja: "希望するチャンネル",
						ru: "желаемый канал",
						"es-ES": "el canal que deseas"
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
				"es-ES": "threshold"
			},
			prefixName: "skullboardthreshold",

			description:
				"Set skull threshold needed for being referenced into the channel",
			description_localizations: {
				fr: "Définissez le seuil de crâne nécessaire pour être référencé dans le canal.",
				ja: "チャンネルで参照されるために必要な skull のしきい値を設定",
				ru: "Установить порог черепов для попадания в канал",
				"es-ES": "Establecer el umbral de skulls necesario para ser referenciado en el canal"
			},

			options: [
				{
					name: "amount",

					description: "the threshold",
					description_localizations: {
						fr: "Le seuil/pallier",
						ja: "しきい値",
						ru: "порог",
						"es-ES": "el umbral"
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
			prefixName: "skullboardthread",

			description:
				"Create a thread bellow the message into the skull channel ?",
			description_localizations: {
				fr: "Créer un fil de discussion en dessous du message dans le canal ?",
				ja: "skullチャンネルのメッセージの下にスレッドを作成しますか？",
				ru: "Создать ветку под сообщением в канале черепов?",
				"es-ES": "Crear un hilo debajo del mensaje en el canal de skulls?"
			},

			options: [
				{
					name: "action",

					description: "What you want to do?",
					description_localizations: {
						fr: "que voulez-vous faire?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?"
					},

					choices: [
						{
							name: "Create thread",
							name_localizations: {
								fr: "Créer un fil",
								ja: "create_thread",
								ru: "create_thread",
								"es-ES": "create_thread"
							},
							value: "yes"
						},
						{
							name: "Don't create thread",
							name_localizations: {
								fr: "Ne pas créer un fil",
								ja: "don_t_create_thread",
								ru: "don_t_create_thread",
								"es-ES": "don_t_create_thread"
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
