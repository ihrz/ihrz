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
	Client,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "noaimie",

	description: "Get unnecessary information about my contributor noaimie",
	description_localizations: {
		fr: "Obtenir des informations non nécessaires sur ma contributrice",
		ja: "貢献者noaimieの不要な情報を取得",
		ru: "Получить ненужную информацию об участнице noaimie",
		"es-ES":
			"Obtener información innecesaria sobre mi contribuidora noaimie",
		ko: "제 기여자 noaimie에 대한 쓸데없는 정보",
		uk: "Отримати непотрібну інформацію про мого учасника розробки noaimie",
		de: "Unnötige Infos zu meiner Mitwirkenden noaimie",
		it: "Informazioni inutili sulla mia collaboratrice noaimie",
		"pt-BR": "Informações desnecessárias sobre minha colaboradora noaimie",
		pl: "Niepotrzebne informacje o mojej współtwórczyni noaimie"
	},

	aliases: ["noemie", "noémie"],

	category: "bot",
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		await client.func.method.interactionSend(interaction, {
			content: client.func.iHorizonAssets.iHorizonAssetURL(
				client.func.iHorizonAssets.iHorizonAsset.Noaimie
			)
		});
		return;
	},
	permission: null
};
