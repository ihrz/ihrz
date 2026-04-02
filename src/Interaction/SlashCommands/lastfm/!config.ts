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

		const isFrench = (interaction.locale || interaction.guildLocale || '').toLowerCase().startsWith('fr');
		const power = interaction.options.getString('power', true) as 'on' | 'off';
		const enabled = power === 'on';

		if (enabled && !client.lastFMScrobbler.isConfigured()) {
			return client.func.method.interactionSend(interaction, {
				content: client.lastFMScrobbler.getMissingConfigurationMessage(isFrench)
			});
		}

		const result = await client.lastFMScrobbler.setEnabled(interaction.user.id, enabled);
		if (!result.ok) {
			return client.func.method.interactionSend(interaction, {
				content: isFrench
					? `${client.iHorizon_Emojis.No} | Vous devez d'abord utiliser \`/lastfm login\` avant d'activer le module.`
					: `${client.iHorizon_Emojis.No} | You need to use \`/lastfm login\` first before enabling the module.`
			});
		}

		await client.func.method.interactionSend(interaction, {
			content: enabled
				? (isFrench
					? `${client.iHorizon_Emojis.Yes} | Le scrobbling Last.fm est maintenant activé pour votre compte.`
					: `${client.iHorizon_Emojis.Yes} | Last.fm scrobbling is now enabled for your account.`)
				: (isFrench
					? `${client.iHorizon_Emojis.Yes} | Le scrobbling Last.fm est maintenant désactivé pour votre compte.`
					: `${client.iHorizon_Emojis.Yes} | Last.fm scrobbling is now disabled for your account.`),
			embeds: [
				await client.lastFMScrobbler.generateUserEmbed(interaction.user.id, interaction.user.username, isFrench)
			]
		});
	},
};
