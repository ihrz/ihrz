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
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	PermissionFlagsBits,
	PermissionsBitField,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let all_bots = Array.from(interaction.guild.members.cache
			.filter(x => x.user.bot)
			.values()
		) || [];

		if (all_bots.length == 0) {
			await client.func.method.interactionSend(interaction, { content: lang.all_admins_nobody_admins });
			return;
		};

		let currentPage = 0;
		let usersPerPage = 5;
		let pages: { title: string; description: string; }[] = [];

		for (let i = 0; i < all_bots.length; i += usersPerPage) {
			let pageUsers = all_bots.slice(i, i + usersPerPage);
			let pageContent = pageUsers.map((userId) => userId).join('\n');
			pages.push({
				title: lang.all_bots_embed_title
					.replace("${i / usersPerPage + 1}", String(i / usersPerPage + 1)),
				description: pageContent,
			});
		};

		let createEmbed = () => {
			return new EmbedBuilder()
				.setColor("#000000")
				.setTitle(pages[currentPage].title)
				.setDescription(pages[currentPage].description)
				.setFooter({
					text: lang.prevnames_embed_footer_text
						.replace('${currentPage + 1}', (currentPage + 1).toString())
						.replace('${pages.length}', pages.length.toString()),
					iconURL: "attachment://footer_icon.png"
				})
				.setTimestamp()
		};

		let row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId('previousPage')
				.setLabel('<<')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('nextPage')
				.setLabel('>>')
				.setStyle(ButtonStyle.Secondary),
		);

		let messageEmbed = await client.func.method.interactionSend(interaction, {
			embeds: [createEmbed()],
			components: [row],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});

		let collector = messageEmbed.createMessageComponentCollector({
			time: 60_000
		});

		collector.on('collect', async (interaction_2) => {
			if (interaction_2.user.id !== interaction.member?.user.id) {
				await interaction_2.reply({ content: lang.help_not_for_you, ephemeral: true });
				return;
			};

			if (interaction_2.customId === 'previousPage') {

				await interaction_2.deferUpdate();
				currentPage = (currentPage - 1 + pages.length) % pages.length;

			} else if (interaction_2.customId === 'nextPage') {

				await interaction_2.deferUpdate();
				currentPage = (currentPage + 1) % pages.length;
			};

			messageEmbed.edit({ embeds: [createEmbed()] });
		});

		collector.on('end', async () => {
			await messageEmbed.edit({ components: [] });
		});

		return;
	},
};