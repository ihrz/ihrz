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
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../../types/database_structure.js";

import { SubCommand } from "../../../../../types/command.js";

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

		const baseData =
			(await client.db.get(
				`${interaction.guildId}.UTILS.LEASH_CONFIG`
			)) ||
			({
				maxLeashedByUsers: 3,
				maxLeashTime: client.timeCalculator.to_ms("30min")
			} as DatabaseStructure.LeashConfig);
		const fetchedData = ((await client.db.get(
			`${interaction.guildId}.UTILS.LEASH`
		)) || []) as DatabaseStructure.LeashData[];
		const now = Date.now();
		const maxLeashTime =
			baseData.maxLeashTime ?? client.timeCalculator.to_ms("30min");
		const activeLeashes = fetchedData.filter(
			(leash) => now - leash.timestamp <= maxLeashTime
		);

		if (activeLeashes.length !== fetchedData.length) {
			await client.db.set(
				`${interaction.guildId}.UTILS.LEASH`,
				activeLeashes
			);
		}

		if (activeLeashes.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_leashlist_no_data.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		let currentPage = 0;
		const leashesPerPage = 5;
		const pages: { description: string }[] = [];

		for (let i = 0; i < activeLeashes.length; i += leashesPerPage) {
			const pageLeashes = activeLeashes.slice(i, i + leashesPerPage);
			const pageContent = pageLeashes
				.map((leash) => {
					const dom =
						interaction.guild?.members.cache
							.get(leash.dom)
							?.toString() ?? `<@${leash.dom}>`;
					const sub =
						interaction.guild?.members.cache
							.get(leash.sub)
							?.toString() ?? `<@${leash.sub}>`;
					const remaining = client.timeCalculator.to_beautiful_string(
						maxLeashTime - (now - leash.timestamp),
						lang
					);

					return lang.util_leashlist_embed_desc
						.replace("${dom}", dom)
						.replace("${sub}", sub)
						.replace("${remaining}", remaining);
				})
				.join("\n");

			pages.push({ description: pageContent });
		}

		const createEmbed = async () => {
			return new EmbedBuilder()
				.setColor("#010101")
				.setTitle(lang.util_leashlist_embed_title)
				.setDescription(pages[currentPage].description)
				.setFooter(
					await client.func.displayBotName.footerPaginationBuilder(
						interaction.guildId!,
						lang,
						currentPage + 1,
						pages.length
					)
				)
				.setTimestamp();
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("previousPage")
				.setLabel("<<<")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("nextPage")
				.setLabel(">>>")
				.setStyle(ButtonStyle.Secondary)
		);

		const messageEmbed = await client.func.method.interactionSend(
			interaction,
			{
				embeds: [await createEmbed()],
				components: [row],
				files: [
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

		collector.on("collect", async (interaction_2) => {
			if (interaction_2.customId === "previousPage") {
				currentPage = (currentPage - 1 + pages.length) % pages.length;
			} else if (interaction_2.customId === "nextPage") {
				currentPage = (currentPage + 1) % pages.length;
			}

			await messageEmbed.edit({ embeds: [await createEmbed()] });
		});

		collector.on("end", async () => {
			await messageEmbed.edit({ components: [] });
		});
	}
};
