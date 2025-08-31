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
	ApplicationCommandOptionType,
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { generateMultiplePasswords, generatePassword } from '../../../core/functions/random.js';

function getNitro(x: number = 1): string {
	return x === 1 ? "https://discord.gift/" + generatePassword({
		length: 16,
		symbols: false,
		numbers: true,
	}) : generateMultiplePasswords(x, {
		length: 16,
		symbols: false,
		numbers: true,
	}).map(x => `https://discord.gift/${x}`).join("\n")
}

export const command: Command = {

	name: 'nitrofdp',

	description: 'without comment',
	description_localizations: {
		"fr": "sans commentaires"
	},

	options: [
		{
			name: "amount",

			description: "amount of nitro",
			description_localizations: {
				"fr": "nombre de nitro"
			},

			type: ApplicationCommandOptionType.Number,

			required: false,

			permission: null
		}
	],

	thinking: false,
	category: '404',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: null,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message<true>, lang: LanguageData, options?: string[]) => {
		let amount = client.func.method.number(options!, 0) || 1;

		if (amount > 275000) {
			amount = 10_000;
		}

		if (interaction.guild.preferredLocale.includes("fr")) {
			const buffer = Buffer.from(getNitro(amount), 'utf-8');
			const attachment = new AttachmentBuilder(buffer, { name: 'fake_nitro.txt' })

			interaction.reply({
				files: [
					attachment
				]
			})
		}
	},
};