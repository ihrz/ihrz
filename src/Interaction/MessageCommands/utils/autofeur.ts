/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {

	name: 'autorespond',
	aliases: ['auto-feur', 'auto-feur', "autofeur", "ftgl"],

	description: 'Enable / Disable the auto response when user says something (only in fr-ME lang)',
	description_localizations: {
		"fr": "Activer/Désactiver la réponse automatique lorsque l'utilisateur dit quelque chose (uniquement en fr-ME)"
	},

	thinking: false,
	category: 'guildconfig',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: PermissionsBitField.Flags.ManageGuildExpressions,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message<true>, lang: LanguageData, options?: string[]) => {

		if (await client.db.get(`${interaction.guild?.id}.GUILD.LANG.lang`) !== "fr-ME") return;
		const state = await client.db.get(`${interaction.guildId}.UTILS.autoFeur`);

		await client.db.set(`${interaction.guildId}.UTILS.autoFeur`, !state);

		const newState = !state;
		await interaction.reply({
			content: newState ? "Bravo mec, maintenant je réponds automatiquement à tout ce que tu dis." : "Je ne réponds plus automatiquement à tout ce que tu dis."
			, allowedMentions: { repliedUser: false }
		});
		return;
	},
};