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
	name: "h247",
	name_localizations: {
		fr: "h247",
		ja: "h247",
		ru: "h247",
		"es-ES": "h247",
		ko: "h247",
		uk: "h247",
		de: "h247",
		it: "h247",
		"pt-BR": "h247",
		pl: "h247"
	},

	description: "Keep iHorizon connected 24/7 in a voice channel!",
	description_localizations: {
		fr: "Garder iHorizon connecté 24/7 dans un salon vocal!",
		ja: "iHorizonをボイスチャンネルに24時間365日接続させ続けます！",
		ru: "Держите iHorizon на связи 24/7 в голосовом канале!",
		"es-ES": "¡Mantén a iHorizon conectado 24/7 en un canal de voz!",
		ko: "iHorizon을 음성 채널에 24시간 연결해 둬요!",
		uk: "Тримати iHorizon у голосовому каналі 24/7!",
		de: "Halte iHorizon rund um die Uhr in einem Sprachkanal!",
		it: "Mantieni iHorizon connesso 24/7 in un canale vocale!",
		"pt-BR": "Mantenha o iHorizon conectado 24/7 em um canal de voz!",
		pl: "Utrzymaj iHorizon połączonego 24/7 na kanale głosowym!"
	},

	options: [
		{
			name: "join",

			name_localizations: {
				fr: "rejoindre",
				ja: "join",
				ru: "join",
				"es-ES": "join",
				ko: "join",
				uk: "join",
				de: "join",
				it: "join",
				"pt-BR": "join",
				pl: "join"
			},

			description: "Park iHorizon 24/7 in a voice channel!",
			description_localizations: {
				fr: "Garer iHorizon 24/7 dans un salon vocal!",
				ja: "iHorizonをボイスチャンネルに常駐させます！",
				ru: "Оставить iHorizon 24/7 в голосовом канале!",
				"es-ES": "¡Estacionar a iHorizon 24/7 en un canal de voz!",
				ko: "iHorizon을 음성 채널에 24시간 머물게 해요!",
				uk: "Залишити iHorizon у голосовому каналі 24/7!",
				de: "Parke iHorizon rund um die Uhr in einem Sprachkanal!",
				it: "Parcheggia iHorizon 24/7 in un canale vocale!",
				"pt-BR": "Deixe o iHorizon 24/7 em um canal de voz!",
				pl: "Zaparkuj iHorizon 24/7 na kanale głosowym!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",

					name_localizations: {
						fr: "salon",
						ja: "channel",
						ru: "channel",
						"es-ES": "canal",
						ko: "channel",
						uk: "channel",
						de: "channel",
						it: "channel",
						"pt-BR": "channel",
						pl: "channel"
					},

					description: "The voice channel where iHorizon will stay!",
					description_localizations: {
						fr: "Le salon vocal où iHorizon restera!",
						ja: "iHorizonが常駐するボイスチャンネル！",
						ru: "Голосовой канал, где останется iHorizon!",
						"es-ES": "¡El canal de voz donde se quedará iHorizon!",
						ko: "iHorizon이 머무를 음성 채널!",
						uk: "Голосовий канал, у якому залишатиметься iHorizon!",
						de: "Der Sprachkanal, in dem iHorizon bleibt!",
						it: "Il canale vocale in cui resterà iHorizon!",
						"pt-BR": "O canal de voz onde o iHorizon ficará!",
						pl: "Kanał głosowy, w którym zostanie iHorizon!"
					},

					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildVoice],

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "leave",

			name_localizations: {
				fr: "quitter",
				ja: "leave",
				ru: "leave",
				"es-ES": "leave",
				ko: "leave",
				uk: "leave",
				de: "leave",
				it: "leave",
				"pt-BR": "leave",
				pl: "leave"
			},

			description: "Disable the 24/7 connection on this server!",
			description_localizations: {
				fr: "Désactiver la connexion 24/7 sur ce serveur!",
				ja: "このサーバーの24時間接続を無効化します！",
				ru: "Отключить подключение 24/7 на этом сервере!",
				"es-ES": "¡Desactivar la conexión 24/7 en este servidor!",
				ko: "이 서버에서 24/7 연결을 해제해요!",
				uk: "Вимкнути підключення 24/7 на цьому сервері!",
				de: "24/7-Verbindung auf diesem Server deaktivieren!",
				it: "Disattiva la connessione 24/7 su questo server!",
				"pt-BR": "Desative a conexão 24/7 neste servidor!",
				pl: "Wyłącz połączenie 24/7 na tym serwerze!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "info",
			prefixName: "h247info",

			description: "Get information about the H24/7 module!",
			description_localizations: {
				fr: "Obtenir des informations sur le module H24/7",
				ja: "H24/7モジュールの情報を取得！",
				ru: "Получить информацию о модуле H24/7!",
				"es-ES": "Obtener información sobre el módulo H24/7!",
				ko: "H24/7 모듈 정보를 확인해요!",
				uk: "Отримати інформацію про модуль H24/7!",
				de: "Infos zum H24/7-Modul anzeigen!",
				it: "Ottieni informazioni sul modulo H24/7!",
				"pt-BR": "Veja informações sobre o módulo H24/7!",
				pl: "Pokaż informacje o module H24/7!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		}
	],
	thinking: true,
	category: "h247",
	type: ApplicationCommandType.ChatInput,
	permission: PermissionFlagsBits.Administrator
};
