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
		"es-ES": "h247"
	},

	description: "Keep iHorizon connected 24/7 in a voice channel!",
	description_localizations: {
		fr: "Garder iHorizon connecté 24/7 dans un salon vocal!",
		ja: "iHorizonをボイスチャンネルに24時間365日接続させ続けます！",
		ru: "Держите iHorizon на связи 24/7 в голосовом канале!",
		"es-ES": "¡Mantén a iHorizon conectado 24/7 en un canal de voz!"
	},

	options: [
		{
			name: "join",

			name_localizations: {
				fr: "rejoindre",
				ja: "join",
				ru: "join",
				"es-ES": "join"
			},

			description: "Park iHorizon 24/7 in a voice channel!",
			description_localizations: {
				fr: "Garer iHorizon 24/7 dans un salon vocal!",
				ja: "iHorizonをボイスチャンネルに常駐させます！",
				ru: "Оставить iHorizon 24/7 в голосовом канале!",
				"es-ES": "¡Estacionar a iHorizon 24/7 en un canal de voz!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "channel",

					name_localizations: {
						fr: "salon",
						ja: "channel",
						ru: "channel",
						"es-ES": "canal"
					},

					description: "The voice channel where iHorizon will stay!",
					description_localizations: {
						fr: "Le salon vocal où iHorizon restera!",
						ja: "iHorizonが常駐するボイスチャンネル！",
						ru: "Голосовой канал, где останется iHorizon!",
						"es-ES": "¡El canal de voz donde se quedará iHorizon!"
					},

					type: ApplicationCommandOptionType.Channel,
					channel_types: [ChannelType.GuildVoice],

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "leave",

			name_localizations: {
				fr: "quitter",
				ja: "leave",
				ru: "leave",
				"es-ES": "leave"
			},

			description: "Disable the 24/7 connection on this server!",
			description_localizations: {
				fr: "Désactiver la connexion 24/7 sur ce serveur!",
				ja: "このサーバーの24時間接続を無効化します！",
				ru: "Отключить подключение 24/7 на этом сервере!",
				"es-ES": "¡Desactivar la conexión 24/7 en este servidor!"
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
