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
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		let history = await client.db.get(
			`${interaction.guildId}.MUSIC_HISTORY`
		);

		// Clean history entries older than 30 days
		if (history && history.embed && history.embed.length > 0) {
			const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
			const filteredEmbed: string[] = [];
			const filteredBuffer: string[] = [];

			for (let i = 0; i < history.embed.length; i++) {
				const entry = history.embed[i];
				// Assume each entry contains a timestamp (adapt according to your format)
				// Expected format: something with a parsable date
				const timestampMatch = entry.match(/<t:(\d+):/);

				if (timestampMatch) {
					const timestamp = parseInt(timestampMatch[1]) * 1000;
					if (timestamp >= thirtyDaysAgo) {
						filteredEmbed.push(entry);
						if (history.buffer && history.buffer[i]) {
							filteredBuffer.push(history.buffer[i]);
						}
					}
				} else {
					// If no timestamp found, keep the entry for safety
					filteredEmbed.push(entry);
					if (history.buffer && history.buffer[i]) {
						filteredBuffer.push(history.buffer[i]);
					}
				}
			}

			// Update history if entries were deleted
			if (filteredEmbed.length < history.embed.length) {
				history = {
					embed: filteredEmbed,
					buffer: filteredBuffer
				};
				await client.db.set(
					`${interaction.guildId}.MUSIC_HISTORY`,
					history
				);
			}
		}

		if (!history || !history.embed || history.embed.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.history_no_entries
			});
			return;
		}

		const buffer = Buffer.from(
			history.buffer.map((content: string) => content).join("\n"),
			"utf-8"
		);
		const attachment = new AttachmentBuilder(buffer, {
			name: "music_history_by_ihorizon.txt"
		});

		let currentPage = 0;
		const usersPerPage = 10;
		const pages: { title: string; description: string }[] = [];

		for (let i = 0; i < history.embed.length; i += usersPerPage) {
			const pageUsers = history.embed.slice(i, i + usersPerPage);
			const pageContent = pageUsers
				.map((userId: string) => userId)
				.join("\n");

			pages.push({
				title: lang.history_embed_title
					.replace(
						"${interaction.guild?.name}",
						interaction.guild.name
					)
					.replace(
						"${i / usersPerPage + 1}",
						(i / usersPerPage + 1).toString()
					),
				description: pageContent
			});
		}

		const createEmbed = () => {
			return new EmbedBuilder()
				.setColor("#00cc1a")
				.setTimestamp()
				.setTitle(pages[currentPage].title)
				.setDescription(pages[currentPage].description)
				.setFooter({
					text: lang.history_embed_footer_text
						.replace(
							"${currentPage + 1}",
							(currentPage + 1).toString()
						)
						.replace("${pages.length}", pages.length.toString()),
					iconURL: "attachment://footer_icon.png"
				})
				.setTimestamp();
		};

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId("previousPage")
				.setLabel("<<<")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("nextPage")
				.setLabel(">>>")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("deleteHistory")
				.setEmoji("🗑️")
				.setStyle(ButtonStyle.Danger)
		);

		const messageEmbed = await client.func.method.interactionSend(
			interaction,
			{
				embeds: [createEmbed()],
				components: [row as ActionRowBuilder<ButtonBuilder>],
				files: [
					attachment,
					await client.func.displayBotName.footerAttachmentBuilder(
						interaction
					)
				]
			}
		);

		const collector = messageEmbed.createMessageComponentCollector({
			filter: async (i) => {
				await i.deferUpdate();
				return interaction.member?.user.id === i.user.id;
			},
			time: 60_000 * 15
		});

		collector.on(
			"collect",
			async (buttonInteraction: { customId: string }) => {
				if (buttonInteraction.customId === "previousPage") {
					currentPage =
						(currentPage - 1 + pages.length) % pages.length;
					await messageEmbed.edit({ embeds: [createEmbed()] });
				} else if (buttonInteraction.customId === "nextPage") {
					currentPage = (currentPage + 1) % pages.length;
					await messageEmbed.edit({ embeds: [createEmbed()] });
				} else if (buttonInteraction.customId === "deleteHistory") {
					// Delete history from database
					await client.db.delete(
						`${interaction.guildId}.MUSIC_HISTORY`
					);

					// Create confirmation embed
					const confirmEmbed = new EmbedBuilder()
						.setColor("#ff0000")
						.setTitle(lang.history_delete_embed_title)
						.setDescription(lang.history_delete_embed_desc)
						.setTimestamp();

					// Disable all buttons
					row.components.forEach((component) => {
						if (component instanceof ButtonBuilder) {
							component.setDisabled(true);
						}
					});

					await messageEmbed.edit({
						embeds: [confirmEmbed],
						components: [row as ActionRowBuilder<ButtonBuilder>],
						files: []
					});

					// Stop the collector
					collector.stop();
				}
			}
		);

		collector.on("end", () => {
			row.components.forEach((component) => {
				if (component instanceof ButtonBuilder) {
					component.setDisabled(true);
				}
			});
			messageEmbed.edit({
				components: [row as ActionRowBuilder<ButtonBuilder>]
			});
		});

		return;
	}
};
