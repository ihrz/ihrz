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
	MessageFlags,
	escapeMarkdown
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import { prevnamesTable } from "../../../Events/client/ready.js";
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

/**
 * Entries are stored as `<t:SECONDS:d> - [type] value` (see prevnamesModule):
 * show the name first and the kind of name and date on the sub-line.
 */
function formatEntry(entry: string, lang: LanguageData): string {
	const match = entry.match(/^<t:(\d+):\w>\s*-\s*\[([^\]]+)\]\s*([\s\S]*)$/);
	if (!match) return entry;
	const [, seconds, type, value] = match;
	let kind: string;
	if (type === "username") kind = lang.prevnames_label_username;
	else if (type === "globalName") kind = lang.prevnames_label_display_name;
	else if (type.startsWith("nickname:"))
		kind = lang.prevnames_label_nickname.replace(
			"${guild}",
			escapeMarkdown(type.slice("nickname:".length))
		);
	else kind = type;
	return `**${escapeMarkdown(value)}**\n-# ${kind} · <t:${seconds}:D> · <t:${seconds}:R>`;
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

		const char: Array<string> =
			(await prevnamesTable.get(`${user.id}`)) || [];

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
				title: lang.prevnames_card_title.replace(
					"${user}",
					user.globalName ?? user.username
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
