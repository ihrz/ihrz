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
	name: "unban-all",
	name_localizations: {
		fr: "unbanall",
		ja: "unban-all",
		ru: "unban-all",
		"es-ES": "unban-all"
	},

	aliases: ["massunban"],

	description: "Mass action about unban",
	description_localizations: {
		fr: "Action de masse pour débannir",
		ja: "一斉バン解除アクション",
		ru: "Массовое действие по разбану",
		"es-ES": "Acción masiva sobre desbaneo"
	},

	options: [
		{
			name: "all",
			prefixName: "unbanall",

			description: "Unban all member of the guild",
			description_localizations: {
				fr: "Débannir toute les personnes bannis du serveur",
				ja: "サーバーの全メンバーのバンを解除",
				ru: "Разбанить всех участников сервера",
				"es-ES": "Desbanear a todos los miembros del servidor"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "undo",
			name_localizations: {
				fr: "annuler",
				ja: "undo",
				ru: "undo",
				"es-ES": "undo"
			},

			description: "Undo the unban all of all members",
			description_localizations: {
				fr: "Annuler le dé-bannissement de tout les membres",
				ja: "全メンバーの一斉バン解除を取り消し",
				ru: "Отменить разбан всех участников",
				"es-ES": "Deshacer el desbaneo masivo de todos los miembros"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],

	category: "utils",
	thinking: true,
	type: ApplicationCommandType.ChatInput,

	permission: PermissionFlagsBits.Administrator
};
