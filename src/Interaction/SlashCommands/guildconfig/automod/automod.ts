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

import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "automod",

	description: "Subcommand for automod category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de protection via l'automod",
		ja: "オートモデレーションカテゴリのサブコマンド！",
		ru: "Подкоманда для категории автомода!",
		"es-ES": "Subcomando para la categoría automod!"
	},

	options: [
		{
			name: "block",

			description: "Block/Protect someting/behaviours into this guild!",
			description_localizations: {
				fr: "Bloquer/Protéger certains comportements/comportements dans ce serveur",
				ja: "このサーバー内の何か/行動をブロック/保護！",
				ru: "Заблокировать/защитить что-либо на этом сервере!",
				"es-ES": "Bloquear/Proteger algo/comportamientos en este servidor!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,
			options: [
				{
					name: "discord_invite_link",

					description:
						"Allow/Unallow the user to send a server invites into them messages!",
					description_localizations: {
						fr: "Autoriser/Interdire à l'utilisateur d'envoyer une invitations de serveur dans ses messages",
						ja: "ユーザーがサーバー招待を送信するのを許可/禁止！",
						ru: "Разрешить/запретить отправку приглашений сервера!",
						"es-ES": "Permitir/Denegar al usuario enviar invitaciones de servidor en sus mensajes!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "action",
							type: ApplicationCommandOptionType.String,

							description: "What you want to do?",
							description_localizations: {
								fr: "Que veux-tu faire?",
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
						},
						{
							name: "logs-channel",

							description:
								"The channel you want logs when user break the rules!",
							description_localizations: {
								fr: "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles",
								ja: "ユーザーがルールを破った時のログを送信するチャンネル！",
								ru: "Канал для логов при нарушении правил!",
								"es-ES": "El canal donde quieres los registros cuando el usuario rompe las reglas!"
							},

							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							required: false,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "telegram_link",

					description:
						"Allow/Unallow the user to send Telegram links into them messages!",
					description_localizations: {
						fr: "Autoriser/Interdire à l'utilisateur d'envoyer des liens Telegram dans ses messages",
						ja: "ユーザーがTelegramリンクを送信するのを許可/禁止！",
						ru: "Разрешить/запретить отправку ссылок Telegram!",
						"es-ES": "Permitir/Denegar al usuario enviar enlaces de Telegram en sus mensajes!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "action",
							type: ApplicationCommandOptionType.String,

							description: "What you want to do?",
							description_localizations: {
								fr: "Que veux-tu faire?",
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
						},
						{
							name: "logs-channel",

							description:
								"The channel you want logs when user break the rules!",
							description_localizations: {
								fr: "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles",
								ja: "ユーザーがルールを破った時のログを送信するチャンネル！",
								ru: "Канал для логов при нарушении правил!",
								"es-ES": "El canal donde quieres los registros cuando el usuario rompe las reglas!"
							},

							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							required: false,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "link",

					description:
						"Allow/Unallow the user to send links into them messages!",
					description_localizations: {
						fr: "Autoriser/Interdire à l'utilisateur d'envoyer des liens dans ses messages",
						ja: "ユーザーがリンクを送信するのを許可/禁止！",
						ru: "Разрешить/запретить отправку ссылок!",
						"es-ES": "Permitir/Denegar al usuario enviar enlaces en sus mensajes!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "action",
							type: ApplicationCommandOptionType.String,

							description: "What you want to do?",
							description_localizations: {
								fr: "Que veux-tu faire?",
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
						},
						{
							name: "logs-channel",

							description:
								"The channel you want logs when user break the rules!",
							description_localizations: {
								fr: "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles",
								ja: "ユーザーがルールを破った時のログを送信するチャンネル！",
								ru: "Канал для логов при нарушении правил!",
								"es-ES": "El canal donde quieres los registros cuando el usuario rompe las reglas!"
							},

							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							required: false,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "spam",

					description: "Block the spam message in this server!",
					description_localizations: {
						fr: "Bloquer le message spam sur ce serveur",
						ja: "このサーバーでのスパムメッセージをブロック！",
						ru: "Блокировать спам-сообщения на этом сервере!",
						"es-ES": "Bloquear los mensajes de spam en este servidor!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "action",
							type: ApplicationCommandOptionType.String,

							description: "What you want to do?",
							description_localizations: {
								fr: "Que veux-tu faire?",
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
						},
						{
							name: "logs-channel",

							description:
								"The channel you want logs when user break the rules",
							description_localizations: {
								fr: "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles",
								ja: "ユーザーがルールを破った時のログを送信するチャンネル",
								ru: "Канал для логов при нарушении правил",
								"es-ES": "El canal donde quieres los registros cuando el usuario rompe las reglas"
							},

							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							required: false,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "mass-mention",

					description:
						"Block the spam which have mass-mention in this message!",
					description_localizations: {
						fr: "Bloquez les spams mentionnés en masse dans ce message",
						ja: "大量メンションを含むスパムをブロック！",
						ru: "Блокировать спам с массовыми упоминаниями!",
						"es-ES": "Bloquear el spam que tiene menciones masivas en este mensaje!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "action",
							type: ApplicationCommandOptionType.String,

							description: "What you want to do?",
							description_localizations: {
								fr: "Que voulez-vous faire?",
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
						},
						{
							name: "max-mention-allowed",
							type: ApplicationCommandOptionType.Number,

							description:
								"Max amount of mention allowed in only one message !",
							description_localizations: {
								fr: "Nombre maximum de mentions autorisées dans un seul message",
								ja: "1つのメッセージで許可される最大メンション数！",
								ru: "Максимальное количество упоминаний в одном сообщении!",
								"es-ES": "Cantidad máxima de menciones permitidas en un solo mensaje!"
							},

							required: false,
							permission: null
						},
						{
							name: "logs-channel",

							description:
								"The channel you want logs when user break the rules",
							description_localizations: {
								fr: "Le canal où vous souhaitez mettre les logs lorsque l'utilisateur enfreint les règles",
								ja: "ユーザーがルールを破った時のログを送信するチャンネル",
								ru: "Канал для логов при нарушении правил",
								"es-ES": "El canal donde quieres los registros cuando el usuario rompe las reglas"
							},

							type: ApplicationCommandOptionType.Channel,
							channel_types: [ChannelType.GuildText],

							required: false,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				}
			],
			permission: null
		}
	],
	thinking: true,
	category: "guildconfig",
	type: ApplicationCommandType.ChatInput,

	permission: null
};
