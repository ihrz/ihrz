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
	ChatInputCommandInteraction,
	Client,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<'cached'>, lang: LanguageData) => {
		if (!interaction.user) return;

		const power = interaction.options.getString('power', true) as 'on' | 'off';
		const enabled = power === 'on';

		if (enabled && !client.lastFMScrobbler.isConfigured()) {
			return client.func.method.interactionSend(interaction, {
				content: client.lastFMScrobbler.getMissingConfigurationMessage(lang)
			});
		}

		const result = await client.lastFMScrobbler.setEnabled(interaction.user.id, enabled);
		if (!result.ok) {
			return client.func.method.interactionSend(interaction, {
				content: lang.lastfm_config_login_required
					.replace(/\${client\.iHorizon_Emojis\.No}/g, client.iHorizon_Emojis.No)
			});
		}

		await client.func.method.interactionSend(interaction, {
			content: enabled
				? lang.lastfm_config_enabled.replace(/\${client\.iHorizon_Emojis\.Yes}/g, client.iHorizon_Emojis.Yes)
				: lang.lastfm_config_disabled.replace(/\${client\.iHorizon_Emojis\.Yes}/g, client.iHorizon_Emojis.Yes),
			embeds: [
				await client.lastFMScrobbler.generateUserEmbed(interaction.user.id, interaction.user.username, lang)
			]
		});
	},
};
