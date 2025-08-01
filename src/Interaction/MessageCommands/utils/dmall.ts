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
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { sleep } from 'bun';


export const command: Command = {

	name: 'dmall',
	aliases: [],

	description: "dm all ton serveur bébou",
	description_localizations: {
		"fr": "dm all ton serveur fdp"
	},

	options: [
		{
			name: "message",

			description: "le message que tu veux fils",
			description_localizations: {
				fr: "tagl windows"
			},

			type: ApplicationCommandOptionType.String,
			required: true,
			permission: null
		}
	],

	thinking: false,
	category: 'owner',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: PermissionsBitField.Flags.ManageGuildExpressions,
	run: async (client: Client, interaction: Message<true>, lang: LanguageData, options?: string[]) => {
		if (client.owners.includes(interaction.author.id)) {
			if (interaction.author.id !== interaction.guild.ownerId) {
				return client.func.method.interactionSend(interaction, {
					content: "Fils de viol, tu crois vraiment me bz? bsartek ta mère ta jeté du pont ouuu?"
				})
			};
			let content = `dmall form ${interaction.guild.name} (id: ${interaction.guild.id}) by (owner of the server: ${interaction.guild.ownerId})\n` + client.func.method.longString(options!, 0)!;

			let _members = await interaction.guild.members.fetch().catch(() => null);
			let members = _members?.values().toArray() || [];
			let delay = 3000;

			let message = `# DM ALL TON SERVEUR DE PUTE
**Membres sur ton serveur de gaulmon**: **\`${interaction.guild.memberCount || interaction.guild.available}\`**
**Membres sur ton serveur que je vais mogu-mogu**: **\`${members?.length}\`**
**Délais entre chaque DM**: **\`${client.timeCalculator.to_beautiful_string(delay, lang)}\`**
`;
			client.func.method.interactionSend(interaction, {
				content: message
			});

			(async () => {
				for (let member of members) {
					member.send({ content }).catch(() => null).then(x => console.log("user " + x?.id + " dmed"))
					await sleep(delay);
				}
			})();
		}
	},
};