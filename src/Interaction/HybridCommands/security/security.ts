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
	name: "security",
	name_localizations: {
		fr: "sécurité",
		ja: "security",
		ru: "security",
		"es-ES": "security"
	},

	description: "Subcommand for security category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de securité",
		ja: "セキュリティカテゴリのサブコマンド！",
		ru: "Подкоманда для категории безопасности!",
		"es-ES": "Subcomando para la categoría de seguridad!"
	},

	options: [
		{
			name: "channel",
			name_localizations: {
				fr: "définir-cannal",
				ja: "channel",
				ru: "channel",
				"es-ES": "channel"
			},
			prefixName: "security-channel",

			description:
				"Channel where are been the verification process for new member(s)!",
			description_localizations: {
				fr: "Canal où se déroule le processus de vérification pour les nouveaux membres",
				ja: "新規メンバーの認証プロセスが行われるチャンネル！",
				ru: "Канал для процесса верификации новых участников!",
				"es-ES": "Canal donde se realiza el proceso de verificación para nuevos miembros!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "id",
					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildText],

					description: "What the channel ?",
					description_localizations: {
						fr: "Quelle est le channel ?",
						ja: "どのチャンネルですか？",
						ru: "Какой канал?",
						"es-ES": "Cual es el canal?"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "config",
			name_localizations: {
				fr: "statut",
				ja: "config",
				ru: "config",
				"es-ES": "config"
			},
			prefixName: "security-config",

			description: "Disable or enable the Security Module feature!",
			description_localizations: {
				fr: "Désactiver ou activer la fonctionnalité du module de sécurité",
				ja: "セキュリティモジュール機能を無効化または有効化！",
				ru: "Отключить или включить модуль безопасности!",
				"es-ES": "Deshabilitar o habilitar la función del módulo de seguridad!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "action",
					type: ApplicationCommandOptionType.String,

					description: "What the action you want to do?",
					description_localizations: {
						fr: "Quelle est l'action que vous souhaitez faire ?",
						ja: "実行したいアクションは？",
						ru: "Какое действие вы хотите выполнить?",
						"es-ES": "Cual es la acción que quieres realizar?"
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
			name: "role-to-give",
			name_localizations: {
				fr: "role-à-donner",
				ja: "role-to-give",
				ru: "role-to-give",
				"es-ES": "role-to-give"
			},

			description:
				"The role that will be given to new member(s) when process to the Captcha verification!",
			description_localizations: {
				fr: "Le rôle qui sera attribué aux nouveaux membre(s) lors du processus de vérification Captcha",
				ja: "キャプチャ認証時に新規メンバーに付与されるロール！",
				ru: "Роль, которая будет выдана новым участникам при прохождении капчи!",
				"es-ES": "El rol que se dará a los nuevos miembros cuando pasen la verificación Captcha!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "What the the role ?",
					description_localizations: {
						fr: "Quel est le rôle ?",
						ja: "どのロールですか？",
						ru: "Какая роль?",
						"es-ES": "Cual es el rol?"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "role-to-remove",
			name_localizations: {
				fr: "role-à-enlever",
				ja: "role-to-remove",
				ru: "role-to-remove",
				"es-ES": "role-to-remove"
			},

			description:
				"The role that will be removed to new member(s) when process to the Captcha verification!",
			description_localizations: {
				fr: "Le rôle qui sera enlevé aux nouveaux membre(s) lors du processus de vérification Captcha",
				ja: "キャプチャ認証時に新規メンバーから削除されるロール！",
				ru: "Роль, которая будет снята с новых участников при прохождении капчи!",
				"es-ES": "El rol que se quitará a los nuevos miembros cuando pasen la verificación Captcha!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "What the the role ?",
					description_localizations: {
						fr: "Quel est le rôle ?",
						ja: "どのロールですか？",
						ru: "Какая роль?",
						"es-ES": "Cual es el rol?"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "security",
	type: ApplicationCommandType.ChatInput,

	permission: null
};
