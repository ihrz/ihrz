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
	ApplicationCommandType
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "honeypot",

	description: "Subcommand for honeypot configuration!",
	description_localizations: {
		fr: "Commande sous-groupée pour la configuration de Honeypot",
		ja: "ハニーポット設定のサブコマンド！",
		ru: "Подкоманда для настройки Honeypot!",
		"es-ES": "Subcomando para la configuración de honeypot!"
	},

	options: [
		{
			name: "config",

			description: "Configure the Honeypot protection panel.",
			description_localizations: {
				fr: "Configurer le panneau de protection Honeypot",
				ja: "ハニーポット保護パネルを設定。",
				ru: "Настроить панель защиты Honeypot.",
				"es-ES": "Configurar el panel de protección Honeypot."
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		}
	],
	thinking: false,
	category: "honeypot",
	type: ApplicationCommandType.ChatInput,

	permission: null
};
