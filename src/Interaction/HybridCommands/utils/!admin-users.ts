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
	PermissionFlagsBits,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const all_admin_members = Array.from(interaction.guild.members.cache
			.filter(x => x.permissions.has(PermissionFlagsBits.Administrator))
			.filter(x => x.user.id !== x.guild.ownerId)
			.filter(x => x.user.id !== x.client.user.id)
			.values()
		) || [];

		if (all_admin_members.length == 0) {
			await client.func.method.interactionSend(interaction, { content: lang.all_admins_nobody_admins });
			return;
		};

		let currentPage = 0;
		const usersPerPage = 5;
		const pages: { title: string; description: string; }[] = [];

		for (let i = 0; i < all_admin_members.length; i += usersPerPage) {
			const pageUsers = all_admin_members.slice(i, i + usersPerPage);
			const pageContent = pageUsers.map((member) => {
				if (member.user.bot) {
					return member.toString() + "🤖 (BOT)"
				}
				return member.toString()
			}).join('\n');
			pages.push({
				title: lang.all_admins_embed_title
					.replace("${i / usersPerPage + 1}", String(i / usersPerPage + 1)),
				description: pageContent,
			});
		};

		const createEmbed = () => {
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
				.setCustomId("trash-button-embed")
				.setLabel(lang.all_admins_unrank_button_label)
				.setEmoji("🗑️")
				.setStyle(ButtonStyle.Danger)
		);

		const messageEmbed = await client.func.method.interactionSend(interaction, {
			embeds: [createEmbed()],
			components: [row],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});

		const collector = messageEmbed.createMessageComponentCollector({
			time: 1_60_000
		});

		collector.on('collect', async (interaction_2) => {
			if (interaction_2.user.id !== interaction.member?.user.id) {
				await interaction_2.reply({ content: lang.help_not_for_you, flags: [1 << 6] });
				return;
			};

			if (interaction_2.customId === 'previousPage') {

				await interaction_2.deferUpdate();
				currentPage = (currentPage - 1 + pages.length) % pages.length;

			} else if (interaction_2.customId === 'nextPage') {

				await interaction_2.deferUpdate();
				currentPage = (currentPage + 1) % pages.length;

			} else if (interaction_2.customId === 'trash-button-embed') {

				if (interaction_2.user.id === interaction_2.guild?.ownerId) {
					let good = 0;
					let bad = 0;

					await interaction_2.deferUpdate();
					const to_unrank_members = all_admin_members.filter(x => x.guild.ownerId !== x.user.id);

					for (const member of to_unrank_members) {
						const filtered_roles = Array.from(
							member.roles.cache
								.filter(x => !x.permissions.has(PermissionFlagsBits.Administrator))
								.keys()
						);

						try {
							await member.roles.set(filtered_roles, "[AdminUsers] clearing admin on the server").catch(() => false);
							good++
						} catch (err) {
							bad++
						}

						const embed = new EmbedBuilder()
							.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
							.setColor('#007fff')
							.setTimestamp()
							.setThumbnail(interaction.guild?.iconURL()!)
							.setDescription(lang.all_admins_unrank_embed_desc
								.replace("${interaction.member?.user.toString()}", interaction.member?.user.toString()!)
								.replace("${good}", good.toString())
								.replace("${bad}", bad.toString())
							)

						await messageEmbed.edit({
							embeds: [embed],
							files: [],
						})

						collector.stop()
						return;
					}

				} else {
					await interaction_2.reply({ content: lang.all_admins_unrank_not_owner });
					collector.stop();
				}
			};

			messageEmbed.edit({ embeds: [createEmbed()] });
		});

		collector.on('end', async () => {
			await messageEmbed.edit({ components: [] });
		});

		return;
	},
};