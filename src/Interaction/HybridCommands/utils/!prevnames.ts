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
	ContainerBuilder,
	Message,
	MessageFlags
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { prevnamesTable } from "../../../Events/client/ready.js";
import type { DatabaseStructure } from "../../../../types/database_structure.js";
import {
	displayName,
	loadHistory,
	sanitizeName
} from "../../../core/modules/prevnamesHistory.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	pageLabel,
	sendCard
} from "../../../core/modules/uiCard.js";

const PER_PAGE = 10;

const ID = {
	previous: "prevnames_previous",
	next: "prevnames_next",
	erase: "prevnames_erase"
} as const;

/** The name first, then its type and date on the sub-line. */
function formatEntry(
	entry: DatabaseStructure.PrevnameEntry,
	lang: LanguageData
): string {
	const meta: string[] = [];
	if (entry.type === "username") meta.push(lang.prevnames_label_username);
	else if (entry.type === "displayname")
		meta.push(lang.prevnames_label_display_name);
	else if (entry.type === "nickname") {
		const guild = displayName(entry.guild.name);
		// A function: `$&` in a server name is not a replacement pattern.
		meta.push(
			lang.prevnames_label_nickname.replace("${guild}", () => guild)
		);
	}
	if (entry.at !== null) {
		const seconds = Math.floor(entry.at / 1000);
		meta.push(`<t:${seconds}:D>`, `<t:${seconds}:R>`);
	}
	const name = `**${displayName(entry.name)}**`;
	return meta.length ? `${name}\n-# ${meta.join(" · ")}` : name;
}

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
		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getUser("user") || interaction.user;
		} else {
			var user =
				(await client.func.method.user(interaction, args!, 0)) ||
				interaction.member.user;
		}

		const stored = await prevnamesTable.get(`${user.id}`);
		const char = loadHistory(stored);

		// Store what was loaded when it differs (old strings, nulls,
		// duplicates), so the public API serves the same history.
		if (stored && JSON.stringify(stored) !== JSON.stringify(char)) {
			await (
				char.length
					? prevnamesTable.set(`${user.id}`, char)
					: prevnamesTable.delete(`${user.id}`)
			).catch((error: unknown) =>
				logger.warn(`prevnames repair failed: ${String(error)}`)
			);
		}

		if (char.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.prevnames_undetected
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		// Newest first.
		const entries = [...char].reverse();
		const pages = Math.ceil(entries.length / PER_PAGE);
		const signature = await botSignature(client, interaction.guildId);
		// Only the user can erase their own history.
		const canErase = interaction.member.user.id === user.id;
		let currentPage = 0;

		const render = (disabled: boolean): ContainerBuilder => {
			const container = buildCard({
				accent: user.accentColor ?? ACCENT.info,
				emoji: e.Nametag,
				title: lang.prevnames_card_title.replace("${user}", () =>
					displayName(
						sanitizeName(user.globalName) ??
							sanitizeName(user.username) ??
							user.id
					)
				),
				description: `-# ${lang.prevnames_card_count.replace("${count}", String(entries.length))}`,
				thumbnail: user.displayAvatarURL({ size: 128 }),
				blocks: [
					entries
						.slice(
							currentPage * PER_PAGE,
							(currentPage + 1) * PER_PAGE
						)
						.map((entry) => formatEntry(entry, lang))
						.join("\n")
				],
				footer: pageLabel(lang, currentPage, pages),
				signature
			});

			const row = new ActionRowBuilder<ButtonBuilder>();
			if (pages > 1) {
				row.addComponents(
					new ButtonBuilder()
						.setCustomId(ID.previous)
						.setLabel(lang.var_previous)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled),
					new ButtonBuilder()
						.setCustomId(ID.next)
						.setLabel(lang.var_next)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled)
				);
			}
			if (canErase) {
				row.addComponents(
					new ButtonBuilder()
						.setCustomId(ID.erase)
						.setEmoji(e.Ticket_Trash)
						.setLabel(lang.prevnames_button_erase)
						.setStyle(ButtonStyle.Danger)
						.setDisabled(disabled)
				);
			}
			if (row.components.length) container.addActionRowComponents(row);
			return container;
		};

		const message = await sendCard(client, interaction, render(false));
		if (pages < 2 && !canErase) return;

		const collector = message.createMessageComponentCollector({
			time: 60_000 * 15
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			if (i.customId === ID.previous) {
				currentPage = (currentPage - 1 + pages) % pages;
			} else if (i.customId === ID.next) {
				currentPage = (currentPage + 1) % pages;
			} else if (i.customId === ID.erase && canErase) {
				await prevnamesTable.delete(`${user.id}`);
				collector.stop("erased");
				await i.update({
					components: [
						notice(
							"success",
							`${e.Yes} ${lang.prevnames_data_erased}`
						)
					]
				});
				return;
			} else return;

			await i.update({ components: [render(false)] });
		});

		collector.on("end", async (_collected, reason) => {
			if (reason === "erased") return;
			await message
				.edit({ components: [render(true)] })
				.catch(() => undefined);
		});

		return;
	}
};
