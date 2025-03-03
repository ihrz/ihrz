/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	Client, ChatInputCommandInteraction, ApplicationCommandType,
	Message,
	CommandInteractionOptionResolver,
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: 'noaimie',

	description: 'Get unnecessary information about my contributor noaimie',
	description_localizations: {
		"fr": "Obtenir des informations non nécessaires sur ma contributrice"
	},

	aliases: ["noemie", "noémie"],

	category: 'bot',
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		await client.func.method.interactionSend(interaction, { content: "https://imgs.search.brave.com/1d_tcHbIHT78tsDIVByVQAxm3lfKc8rKh_sBO8fjXrA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zLnlp/bWcuY29tL255L2Fw/aS9yZXMvMS4yL2xX/eVBwbFBKUWN6UVAy/MDg0RlFpR2ctLS9Z/WEJ3YVdROWFHbG5h/R3hoYm1SbGNqdDNQ/VGsyTUR0b1BUVTJN/QS0tL2h0dHBzOi8v/bWVkaWEuemVuZnMu/Y29tL2VuL3BhcmFk/ZV8yNTAvOWMyMzI4/ZWIyZGI0MWU3MDZk/ODlmODQ2NGM0ODQ1/MGY" });
		return;
	},
	permission: null
};