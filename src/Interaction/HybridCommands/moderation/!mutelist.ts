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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let char = Array.from(interaction.guild.members.cache.filter(member => member.isCommunicationDisabled()).values()) || [];

		if (char.length == 0) {
			await client.func.method.interactionSend(interaction, { content: lang.prevnames_undetected });
			return;
		};

		let currentPage = 0;
		const usersPerPage = 5;
		const pages: { description: string; }[] = [];

		for (let i = 0; i < char.length; i += usersPerPage) {
			const pageUsers = char.slice(i, i + usersPerPage);
			const pageContent = pageUsers.map((userId) => userId).join('\n');
			pages.push({
				description: pageContent,
			});
		};

		const createEmbed = async () => {
			return new EmbedBuilder()
				.setColor(await client.db.get(`${interaction.guild!.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#000000")
				.setDescription(pages[currentPage].description)
				.setFooter({
					text: lang.prevnames_embed_footer_text
						.replace('${currentPage + 1}', (currentPage + 1).toString())
						.replace('${pages.length}', pages.length.toString()),
					iconURL: "attachment://footer_icon.png"
				})
				.setTimestamp()
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId('previousPage')
				.setLabel('<<<')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('nextPage')
				.setLabel('>>>')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("trash-prevnames-embed")
				.setLabel('🗑️')
				.setStyle(ButtonStyle.Danger)
		);

		const messageEmbed = await client.func.method.interactionSend(interaction, {
			embeds: [await createEmbed()],
			components: [row],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});

		const collector = messageEmbed.createMessageComponentCollector({
			filter: async (i) => {
				await i.deferUpdate();
				return interaction.member?.user.id === i.user.id;
			}, time: 60_000
		});

		collector.on('collect', async (interaction_2) => {
			if (interaction_2.customId === 'previousPage') {

				currentPage = (currentPage - 1 + pages.length) % pages.length;

			} else if (interaction_2.customId === 'nextPage') {
				currentPage = (currentPage + 1) % pages.length;

			} else if (interaction_2.customId === 'trash-prevnames-embed') {
				char.forEach(x => {
					x.timeout(null);
				})
				char = []
			};

			messageEmbed.edit({ embeds: [await createEmbed()] });
		});

		collector.on('end', async () => {
			await messageEmbed.edit({ components: [] });
		});

	},
};