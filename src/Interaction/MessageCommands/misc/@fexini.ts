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

import { ApplicationCommandOptionType, Message, Client } from "discord.js";

import path from "path";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";

import { axios } from "../../../core/functions/axios.js";
import {
	convertToPng,
	resizeImage,
	tempDir
} from "../../../core/functions/mediaManipulation.js";
import { unlink } from "fs/promises";

export const command: Command = {
	name: "fexini",

	description: "Show our best partner",
	description_localizations: {
		fr: "voir la pub de notre meilleur partenaire <3",
		ja: "最高のパートナーを表示",
		ru: "Показать нашего лучшего партнера",
		"es-ES": "Mostrar nuestro mejor socio"
	},

	thinking: false,
	category: "bot",
	type: "PREFIX_IHORIZON_COMMAND",
	permission: null,
	run: async (
		client: Client,
		interaction: Message<true>,
		lang: LanguageData,
		options?: string[]
	) => {
		if (interaction.guild.preferredLocale !== "fr") return;

		interaction
			.reply({
				content: `:pushpin:  **Regardez des films, séries et animés gratuitement, sans pub, en streaming. Catalogue mis à jour quotidiennement.**

:point_right: https://fexini.tv/`
			})
			.then((x) =>
				setTimeout(() => {
					if (x.deletable) x.delete();
					if (interaction.deletable) interaction.delete();
				}, 10000)
			);
	}
};
