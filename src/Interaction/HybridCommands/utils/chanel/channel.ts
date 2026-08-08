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
	name: "channel",
	name_localizations: {
		fr: "channel",
		ja: "channel",
		ru: "channel",
		"es-ES": "channel"
	},

	description: "Channel operating commands",
	description_localizations: {
		fr: "Commandes d'opérations pour salons",
		ja: "チャンネル操作コマンド",
		ru: "Команды управления каналами",
		"es-ES": "Comandos de operación de canales"
	},

	options: [
		{
			name: "hide",
			description: "Hide the current channel from everyone",
			description_localizations: {
				fr: "Masquer le salon actuel pour everyone",
				ja: "現在のチャンネルを全員から非表示",
				ru: "Скрыть текущий канал от всех",
				"es-ES": "Ocultar el canal actual de todos"
			},

			options: [
				{
					name: "role",

					description:
						"the role that you want to hide into the channel",
					description_localizations: {
						fr: "Le rôle que tu veux masquer dans le salon",
						ja: "チャンネルで非表示にしたいロール",
						ru: "роль, которую нужно скрыть в канале",
						"es-ES": "el rol que quieres ocultar en el canal"
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: false
				}
			],
			aliases: ["masquer"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "unhide",
			description: "Unhide the current channel from everyone",
			description_localizations: {
				fr: "Démasquer le salon actuel pour everyone",
				ja: "現在のチャンネルを全員に表示",
				ru: "Показать текущий канал всем",
				"es-ES": "Mostrar el canal actual a todos"
			},

			options: [
				{
					name: "role",

					description:
						"the role that you want to unhide into the channel",
					description_localizations: {
						fr: "Le rôle que tu veux démasquer dans le salon",
						ja: "チャンネルで表示したいロール",
						ru: "роль, которую нужно показать в канале",
						"es-ES": "el rol que quieres mostrar en el canal"
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: false
				}
			],

			aliases: ["démasquer"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.ManageChannels
		},
		{
			name: "unhideall",
			description: "Unhide all channels in the server from everyone",
			description_localizations: {
				fr: "Démasquer tous les salons du serveur pour everyone",
				ja: "サーバー内の全チャンネルを全員に表示",
				ru: "Показать все каналы всем на сервере",
				"es-ES": "Mostrar todos los canales del servidor a todos"
			},

			options: [
				{
					name: "role",

					description:
						"the role that you want to unhide into all guild channels",
					description_localizations: {
						fr: "Le rôle que tu veux démasquer dans tout les salons du serveur",
						ja: "全サーバーチャンネルで表示したいロール",
						ru: "роль, которую нужно показать во всех каналах",
						"es-ES": "el rol que quieres mostrar en todos los canales del servidor"
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: false
				}
			],

			aliases: ["démasquer-tout"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "hideall",
			description: "Hide all channels in the server from everyone",
			description_localizations: {
				fr: "Masquer tous les salons du serveur pour everyone",
				ja: "サーバー内の全チャンネルを全員から非表示",
				ru: "Скрыть все каналы от всех на сервере",
				"es-ES": "Ocultar todos los canales del servidor a todos"
			},

			options: [
				{
					name: "role",

					description:
						"the role that you want to hide into all guild channels",
					description_localizations: {
						fr: "Le rôle que tu veux masquer dans tout les salons du serveur",
						ja: "全サーバーチャンネルで非表示にしたいロール",
						ru: "роль, которую нужно скрыть во всех каналах сервера",
						"es-ES": "el rol que quieres ocultar en todos los canales del servidor"
					},

					permission: null,
					type: ApplicationCommandOptionType.Role,
					required: false
				}
			],

			aliases: ["masquer-tout"],
			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		}
	],

	category: "utils",
	thinking: true,
	type: ApplicationCommandType.ChatInput,

	permission: PermissionFlagsBits.Administrator
};
