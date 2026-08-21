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
	name: "utilss",

	description: "SubCommand category for utils command",
	description_localizations: {
		fr: "Commande sous groupé pour la catégorie utilitaire",
		ja: "ユーティリティコマンドのサブコマンドカテゴリ",
		ru: "Категория подкоманд для утилит",
		"es-ES": "Categoría de subcomando para comandos de utilidad"
	},

	options: [
		{
			name: "renewvc",

			description:
				"Set the voice region of your current voice channel to automatic",
			description_localizations: {
				fr: "Définir la région vocale de votre salon vocal actuel en automatique",
				ja: "現在のボイスチャンネルのボイスリージョンを自動に設定",
				ru: "Установить голосовой регион текущего голосового канала на автоматический",
				"es-ES":
					"Establecer la región de voz de tu canal de voz actual en automático"
			},

			aliases: ["rvc"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.ManageChannels
		}
	],

	category: "utils",
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null
};
