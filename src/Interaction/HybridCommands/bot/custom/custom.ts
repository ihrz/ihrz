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
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../../types/command.js";

export const command: Command = {
	name: "custom",

	description: "Custom the bot profile in your discord server",
	description_localizations: {
		fr: "Customiser le profil du bot sur le serveur Discord",
		ja: "Discordサーバーでボットのプロフィールをカスタマイズ",
		ru: "Настроить профиль бота на вашем сервере",
		"es-ES": "Personalizar el perfil del bot en tu servidor de Discord"
	},

	options: [
		{
			name: "name",
			prefixName: "botname",
			aliases: ["setname", "setbotname"],

			description: "Change the iHorizon name into the server",
			description_localizations: {
				fr: "Définir le nom du bot sur le serveur",
				ja: "サーバーのiHorizonの名前を変更",
				ru: "Изменить имя iHorizon на сервере",
				"es-ES": "Cambiar el nombre de iHorizon en el servidor"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?"
					},

					choices: [
						{
							name: "Default Bot Name",
							name_localizations: {
								fr: "Reprendre le nom par défaut du bot",
								ja: "ボットのデフォルトの名前に戻す",
								ru: "Восстановить имя бота по умолчанию",
								"es-ES":
									"Restablecer el nombre predeterminado del bot"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir un nom",
								ja: "名前を設定",
								ru: "Задать имя",
								"es-ES": "Establecer un nombre"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,

					permission: null
				},
				{
					name: "name",

					description: "The name",
					description_localizations: {
						fr: "Le nom du bot",
						ja: "名前",
						ru: "Имя",
						"es-ES": "El nombre"
					},

					type: ApplicationCommandOptionType.String,
					required: false,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "avatar",
			prefixName: "botavatar",
			aliases: ["setpic", "setavatar", "setpp"],

			description: "Change the iHorizon avatar into your server",
			description_localizations: {
				fr: "Définir la photo de profil du bot sur votre serveur discord",
				ja: "サーバーのiHorizonアバターを変更",
				ru: "Изменить аватар iHorizon на сервере",
				"es-ES": "Cambiar el avatar de iHorizon en tu servidor"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?"
					},

					choices: [
						{
							name: "Default Bot Avatar",
							name_localizations: {
								fr: "Reprendre l'avatar par défaut du bot",
								ja: "ボットのデフォルトアバターに戻す",
								ru: "Восстановить аватар бота по умолчанию",
								"es-ES":
									"Restablecer el avatar predeterminado del bot"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir un avatar",
								ja: "アバターを設定",
								ru: "Задать аватар",
								"es-ES": "Establecer un avatar"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "avatar",

					description: "The avatar",
					description_localizations: {
						fr: "L'avatar du bot",
						ja: "アバター",
						ru: "Аватар",
						"es-ES": "El avatar"
					},

					type: ApplicationCommandOptionType.Attachment,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "banner",
			prefixName: "botbanner",

			aliases: ["setbotbanner", "setbanner"],

			description: "Change the iHorizon banner into your server",
			description_localizations: {
				fr: "Définir la bannière de profil du bot sur votre serveur discord",
				ja: "サーバーのiHorizonバナーを変更",
				ru: "Изменить баннер iHorizon на сервере",
				"es-ES": "Cambiar el banner de iHorizon en tu servidor"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?"
					},

					choices: [
						{
							name: "Default Bot Banner",
							name_localizations: {
								fr: "Reprendre la bannière par défaut du bot",
								ja: "ボットのデフォルトバナーに戻す",
								ru: "Восстановить баннер бота по умолчанию",
								"es-ES":
									"Restablecer el banner predeterminado del bot"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir une bannière",
								ja: "バナーを設定",
								ru: "Задать баннер",
								"es-ES": "Establecer un banner"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "banner",

					description: "The banner",
					description_localizations: {
						fr: "La bannière du bot",
						ja: "バナー",
						ru: "Баннер",
						"es-ES": "El banner"
					},

					type: ApplicationCommandOptionType.Attachment,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "bio",
			prefixName: "botbio",

			aliases: ["setbotbio", "setbio"],
			description: "Change the iHorizon bio into your server",
			description_localizations: {
				fr: "Définir la bio de profil du bot sur votre serveur discord",
				ja: "サーバーのiHorizonの自己紹介を変更",
				ru: "Изменить описание iHorizon на сервере",
				"es-ES": "Cambiar la biografía de iHorizon en tu servidor"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "¿Qué quieres hacer?"
					},

					choices: [
						{
							name: "Default Bot Description",
							name_localizations: {
								fr: "Reprendre la description par défaut du bot",
								ja: "ボットのデフォルトの説明に戻す",
								ru: "Восстановить описание бота по умолчанию",
								"es-ES":
									"Restablecer la descripción predeterminada del bot"
							},
							value: "reset"
						},
						{
							name: "Set one",
							name_localizations: {
								fr: "Définir une description",
								ja: "説明を設定",
								ru: "Задать описание",
								"es-ES": "Establecer una descripción"
							},
							value: "set"
						}
					],

					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "bio",

					description: "The description",
					description_localizations: {
						fr: "La bio du bot",
						ja: "説明",
						ru: "Описание",
						"es-ES": "La descripción"
					},

					type: ApplicationCommandOptionType.String,
					required: false,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],

	thinking: true,
	category: "profil",
	type: ApplicationCommandType.ChatInput,
	permission: null
};
