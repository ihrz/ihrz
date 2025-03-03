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
	Client,
	EmbedBuilder,
	PermissionsBitField,
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	GuildMember,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';

import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { generatePassword } from '../../../core/functions/random.js';
import { format } from '../../../core/functions/date_and_time.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;;

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getMember("member") as GuildMember | null;
		} else {

			var member = client.func.method.member(interaction, args!, 0) as GuildMember | null;
		};

		let allWarns: DatabaseStructure.WarnsData[] | null = await client.db.get(`${interaction.guildId}.USER.${member?.id}.WARNS`);

		if (!allWarns || allWarns.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.warnlist_no_data
					.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
					.replace("${member?.toString()}", member?.toString()!)
			})
			return;
		}

		let currentPage = 0;
		let usersPerPage = 5;
		let pages: { title: string; description: string; }[] = [];

		for (let i = 0; i < allWarns.length; i += usersPerPage) {
			let pageUsers = allWarns.slice(i, i + usersPerPage);
			let pageContent = pageUsers.map((x) =>
				lang.warnlist_embed_desc
					.replace("${x.id}", x.id)
					.replace("${format(x.timestamp, 'DD/MM/YYYY')}", format(x.timestamp, 'DD/MM/YYYY'))
					.replace("${x.authorID}", x.authorID)
					.replace("${x.reason}", x.reason)
			).join("\n");
			pages.push({
				title: lang.warnlist_embed_title
					.replace("${member?.user.globalName}", member?.user.globalName!)
					.replace("${i / usersPerPage + 1}", String(i / usersPerPage + 1))
				,
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
				.setLabel('<<<')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('nextPage')
				.setLabel('>>>')
				.setStyle(ButtonStyle.Secondary),
		);

		let messageEmbed = await client.func.method.interactionSend(interaction, {
			embeds: [createEmbed()],
			components: [row],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});

		let collector = messageEmbed.createMessageComponentCollector({
			filter: async (i) => {
				await i.deferUpdate();
				return interaction.member?.user.id === i.user.id;
			}, time: 60000
		});

		collector.on('collect', async (interaction_2: { customId: string; }) => {
			if (interaction_2.customId === 'previousPage') {

				currentPage = (currentPage - 1 + pages.length) % pages.length;

			} else if (interaction_2.customId === 'nextPage') {
				currentPage = (currentPage + 1) % pages.length;
			};

			messageEmbed.edit({ embeds: [createEmbed()] });
		});

		collector.on('end', async () => {
			await messageEmbed.edit({ components: [] });
		});

	},
};