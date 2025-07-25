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
	Client,
	EmbedBuilder,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: 'owner',

	description: 'add user to owner list (can\'t be used by normal member)!',
	description_localizations: {
		"fr": "Ajoutez un membre dans la liste des propriétaire de iHorizon. (Seulement pour les dev)"
	},

	aliases: ["addowner", "owneradd", "owners", "ownerlist"],

	options: [
		{
			name: 'member',
			type: ApplicationCommandOptionType.User,

			description: 'The member you want to made owner of the iHorizon Projects',
			description_localizations: {
				"fr": "Le membre que vous souhaitez rendre propriétaire des projets iHorizon"
			},

			required: false,

			permission: null
		}
	],
	thinking: false,
	category: 'owner',
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const tableOwner = await client.db.table('OWNER');

		let text = "";
		const char = await tableOwner.all();

		for (const entry of char) {
			text += `<@${entry.id}>\n`;
		}

		if (!await tableOwner.get(`${interaction.member.user.id}.owner`)) {
			await client.func.method.interactionSend(interaction, { content: lang.owner_not_owner });
			return;
		};

		const embed = new EmbedBuilder()
			.setColor("#2E2EFE")
			.setAuthor({ name: "Owners" })
			.setDescription(text)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getUser('member');
		} else {
			var member = await client.func.method.user(interaction, args!, 0);
		};

		if (!member) {
			await client.func.method.interactionSend(interaction, { embeds: [embed], files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)] });
			return;
		};


		const is_owner = await tableOwner.get(`${member.id}.owner`);

		if (is_owner) {
			await client.func.method.interactionSend(interaction, { content: lang.owner_already_owner });
			return;
		};

		await tableOwner.set(`${member.id}`, { owner: true });
		client.owners.push(member.id);
		client.owners = [...new Set(client.owners)];

		await client.func.method.interactionSend(interaction, { content: lang.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.globalName || member.displayName) });
		return;
	},
	permission: null
};