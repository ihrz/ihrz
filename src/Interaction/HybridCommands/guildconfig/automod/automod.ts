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
	ApplicationCommandType,
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { Command } from "../../../../../types/command.js";
import { openAutomodPanel } from "./automodPanel.js";

export const command: Command = {
	name: "automod",
	aliases: [],

	description: "Open the interactive AutoMod configuration panel!",
	description_localizations: {
		fr: "Ouvre le panneau de configuration interactif de l'AutoMod !",
		ja: "対話型AutoMod設定パネルを開きます！",
		ru: "Открывает интерактивную панель настройки AutoMod!",
		"es-ES": "¡Abre el panel de configuración interactivo de AutoMod!",
		ko: "대화형 자동 관리(AutoMod) 설정 패널을 열어요!"
	},

	thinking: true,
	category: "guildconfig",
	type: ApplicationCommandType.ChatInput,

	permission: PermissionFlagsBits.Administrator,

	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		await openAutomodPanel(client, interaction, lang);
	}
};
