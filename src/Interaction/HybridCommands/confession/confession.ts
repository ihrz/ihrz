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
	name: "confession",

	description: "Subcommand for confession category!",
	description_localizations: {
		fr: "Commande sous-groupé pour le module de confession",
		ja: "告白カテゴリのサブコマンド！",
		ru: "Подкоманда для категории признаний!",
		"es-ES": "Subcomando para la categoría de confesiones!"
	},

	options: [
		{
			name: "channel",
			prefixName: "confess-channel",

			description: "Set the confession module's channel!",
			description_localizations: {
				fr: "Définir le canal du module confession",
				ja: "告白モジュールのチャンネルを設定！",
				ru: "Установить канал модуля признаний!",
				"es-ES": "Establecer el canal del módulo de confesiones!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",
					type: ApplicationCommandOptionType.Channel,

					description: "The channel!",
					description_localizations: {
						fr: "Le channel",
						ja: "チャンネル！",
						ru: "Канал!",
						"es-ES": "El canal!"
					},

					channel_types: [ChannelType.GuildText],

					required: true,

					permission: null
				},
				{
					name: "button-title",
					type: ApplicationCommandOptionType.String,

					description: "The button title",
					description_localizations: {
						fr: "Le titre du bouton",
						ja: "ボタンのタイトル",
						ru: "Название кнопки",
						"es-ES": "El título del botón"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "config",
			prefixName: "confess-config",

			description: "Enable or Disable the confession module!",
			description_localizations: {
				fr: "Activer ou désactiver le module",
				ja: "告白モジュールを有効化または無効化！",
				ru: "Включить или отключить модуль признаний!",
				"es-ES": "Habilitar o Deshabilitar el módulo de confesiones!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?"
					},

					required: true,
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

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "thread",
			prefixName: "confthread",

			description: "Create an thread upside the confession ?",
			description_localizations: {
				fr: "Créer un fil de discussion en dessous de la confession ?",
				ja: "告白の上にスレッドを作成しますか？",
				ru: "Создать ветку над признанием?",
				"es-ES": "Crear un hilo encima de la confesión?"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?"
					},

					required: true,
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
							name: "Don´t create thread",
							name_localizations: {
								fr: "Ne pas créer un fil",
								ja: "don_t_create_thread",
								ru: "don_t_create_thread",
								"es-ES": "don_t_create_thread"
							},
							value: "no"
						}
					],

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "cooldown",
			prefixName: "confess-cooldown",

			description: "Change the cooldown between confession!",
			description_localizations: {
				fr: "Changer le cooldown entre les confession",
				ja: "告白間のクールダウンを変更！",
				ru: "Изменить задержку между признаниями!",
				"es-ES": "Cambiar el enfriamiento entre confesiones!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "time",
					type: ApplicationCommandOptionType.String,

					description: "Coolodwn's time like 3h/30m/10s...",
					description_localizations: {
						fr: "Le temps comme 3h/30m/10s...",
						ja: "クールダウン時間（例: 3h/30m/10s...）",
						ru: "Время задержки, например 3ч/30м/10с...",
						"es-ES": "Tiempo de enfriamiento como 3h/30m/10s..."
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "confession",
	type: ApplicationCommandType.ChatInput,
	permission: null
};
