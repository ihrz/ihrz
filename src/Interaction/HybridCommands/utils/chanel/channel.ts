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
		"es-ES": "channel",
		ko: "channel",
		uk: "channel",
		de: "channel",
		it: "channel",
		"pt-BR": "channel",
		pl: "channel"
	},

	description: "Channel operating commands",
	description_localizations: {
		fr: "Commandes d'opérations pour salons",
		ja: "チャンネル操作コマンド",
		ru: "Команды управления каналами",
		"es-ES": "Comandos de operación de canales",
		ko: "채널 관리 명령어",
		uk: "Команди керування каналами",
		de: "Kanal-Befehle",
		it: "Comandi per i canali",
		"pt-BR": "Comandos de canais",
		pl: "Komendy kanałów"
	},

	options: [
		{
			name: "hide",
			description: "Hide the current channel from everyone",
			description_localizations: {
				fr: "Masquer le salon actuel pour everyone",
				ja: "現在のチャンネルを全員から非表示",
				ru: "Скрыть текущий канал от всех",
				"es-ES": "Ocultar el canal actual de todos",
				ko: "현재 채널을 모두에게서 숨겨요",
				uk: "Приховати поточний канал від усіх",
				de: "Den aktuellen Kanal für alle ausblenden",
				it: "Nascondi a tutti il canale attuale",
				"pt-BR": "Oculte o canal atual de todos",
				pl: "Ukryj bieżący kanał przed wszystkimi"
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
						"es-ES": "el rol que quieres ocultar en el canal",
						ko: "채널에서 숨길 역할",
						uk: "роль, від якої потрібно приховати канал",
						de: "Rolle, die im Kanal versteckt wird",
						it: "Ruolo da nascondere nel canale",
						"pt-BR": "Cargo a ocultar no canal",
						pl: "Rola do ukrycia na kanale"
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
				"es-ES": "Mostrar el canal actual a todos",
				ko: "현재 채널을 모두에게 다시 보이게 해요",
				uk: "Показати поточний канал усім",
				de: "Macht den aktuellen Kanal wieder für alle sichtbar",
				it: "Rende di nuovo visibile a tutti il canale corrente",
				"pt-BR": "Torna o canal atual visível para todos",
				pl: "Odkrywa bieżący kanał dla wszystkich"
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
						"es-ES": "el rol que quieres mostrar en el canal",
						ko: "채널에서 다시 보이게 할 역할",
						uk: "роль, якій потрібно показати канал",
						de: "Rolle, die im Kanal wieder sichtbar wird",
						it: "Ruolo da mostrare di nuovo nel canale",
						"pt-BR": "Cargo a reexibir no canal",
						pl: "Rola do odkrycia na kanale"
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
				"es-ES": "Mostrar todos los canales del servidor a todos",
				ko: "서버의 모든 채널을 모두에게 다시 보이게 해요",
				uk: "Показати всі канали сервера всім",
				de: "Macht alle Kanäle des Servers wieder für alle sichtbar",
				it: "Rende di nuovo visibili a tutti tutti i canali del server",
				"pt-BR":
					"Torna todos os canais do servidor visíveis para todos",
				pl: "Odkrywa wszystkie kanały serwera dla wszystkich"
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
						"es-ES":
							"el rol que quieres mostrar en todos los canales del servidor",
						ko: "서버의 모든 채널에서 다시 보이게 할 역할",
						uk: "роль, якій потрібно показати всі канали сервера",
						de: "Rolle, die in allen Kanälen des Servers wieder sichtbar wird",
						it: "Ruolo da mostrare di nuovo in tutti i canali del server",
						"pt-BR":
							"Cargo a reexibir em todos os canais do servidor",
						pl: "Rola do odkrycia na wszystkich kanałach serwera"
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
				"es-ES": "Ocultar todos los canales del servidor a todos",
				ko: "서버의 모든 채널을 모두에게서 숨겨요",
				uk: "Приховати всі канали сервера від усіх",
				de: "Alle Kanäle des Servers für alle ausblenden",
				it: "Nascondi a tutti tutti i canali del server",
				"pt-BR": "Oculte todos os canais do servidor de todos",
				pl: "Ukryj wszystkie kanały serwera przed wszystkimi"
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
						"es-ES":
							"el rol que quieres ocultar en todos los canales del servidor",
						ko: "서버의 모든 채널에서 숨길 역할",
						uk: "роль, від якої потрібно приховати всі канали сервера",
						de: "Rolle, die in allen Kanälen des Servers versteckt wird",
						it: "Ruolo da nascondere in tutti i canali del server",
						"pt-BR":
							"Cargo a ocultar em todos os canais do servidor",
						pl: "Rola do ukrycia na wszystkich kanałach serwera"
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
