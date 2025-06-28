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
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';


const itemsPerPage = 15;

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {
		const execTimestamp = Date.now();

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		const char = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;
		const arr: { invites: number; regular: number; bonus: number; leaves: number; inviter: string; }[] = [];

		for (const key in char) {
			const a = char?.[key]?.INVITES;

			if (a && a.invites && a.invites >= 1) {
				arr.push({
					invites: a.invites || 0,
					regular: a.regular || 0,
					bonus: a.bonus || 0,
					leaves: a.leaves || 0,
					inviter: key,
				});
			}
		}
		arr.sort((a, b) => b.invites - a.invites);

		const userId = interaction.member.user.id;
		const userRank = arr.findIndex(user => user.inviter === userId);
		const userRankText = userRank !== -1
			? lang.leaderboard_rank_text.replace('${userRank + 1}', String(userRank + 1)).replace('${arr.length}', arr.length.toString()).replace('${arr[userRank].invites}', String(arr[userRank].invites))
			: lang.leaderboard_rank_none;

		const text = lang.leaderboard_gen_time_msg.replace("${interaction.guild?.name}", interaction.guild?.name!).replace('${Date.now() - execTimestamp}', String(Date.now() - execTimestamp!));

		const generateEmbed = async (start: number) => {
			const current = arr.slice(start, start + itemsPerPage);
			let pageText = text;
			let i = start + 1;
			current.forEach((index) => {
				pageText += lang.leaderboard_text_inline
					.replace("${i}", String(i === 1 ? "🥇" : i === 2 ? "🥈" : i === 3 ? "🥉" : i.toString()))
					.replace("${index.invites}", index.invites.toString())
					.replace("${index.regular}", index.regular.toString())
					.replace("${index.bonus}", index.bonus.toString())
					.replace("${index.inviter}", index.inviter.toString())
					.replace("${index.leaves}", index.leaves.toString());
				i++;
			});

			if (start === 0) {
				pageText += `\n${userRankText}`;
			}

			return new EmbedBuilder()
				.setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#FFB6C1")
				.setTitle(lang.leaderboard_default_text + " • " + interaction.guild?.name)
				.setDescription(pageText)
				.setTimestamp()
				.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
				.setThumbnail("attachment://guildIcon.png");
		};

		const canFitOnOnePage = arr.length <= itemsPerPage;
		const embedMessage = await client.func.method.interactionSend(interaction, {
			embeds: [await generateEmbed(0)],
			components: canFitOnOnePage ? [] : [new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('previous')
					.setLabel('<<')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(true),
				new ButtonBuilder()
					.setCustomId('next')
					.setLabel('>>')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(arr.length <= itemsPerPage)
			)],
			files: [
				await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction),
				{ attachment: (await interaction.client.func.image64.image64(interaction.guild.iconURL({ size: 512 }) || interaction.client.user?.displayAvatarURL())) ?? Buffer.from([]), name: 'guildIcon.png' }
			]
		});

		if (canFitOnOnePage) return;

		const collector = embedMessage.createMessageComponentCollector({ filter: (i) => i.customId === 'previous' || i.customId === 'next', componentType: ComponentType.Button, time: 60000 });

		let currentIndex = 0;
		collector.on('collect', async (i) => {
			if (i.customId === 'previous') {
				currentIndex -= itemsPerPage;
			} else if (i.customId === 'next') {
				currentIndex += itemsPerPage;
			}

			await i.update({
				embeds: [await generateEmbed(currentIndex)],
				components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId('previous')
						.setLabel('<<')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentIndex === 0),
					new ButtonBuilder()
						.setCustomId('next')
						.setLabel('>>')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentIndex + itemsPerPage >= arr.length)
				)],
			});
		});

		collector.on('end', () => {
			embedMessage.edit({ components: [] });
		});
	},
};