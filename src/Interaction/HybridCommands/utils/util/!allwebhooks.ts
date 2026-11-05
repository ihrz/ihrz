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
	ComponentType,
	ContainerBuilder,
	Message,
	MessageFlags,
	escapeMarkdown
} from "discord.js";
import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	pageLabel,
	sendCard
} from "../../../../core/modules/uiCard.js";

const PER_PAGE = 10;

const ID = {
	previous: "allwebhooks_previous",
	next: "allwebhooks_next",
	delete: "allwebhooks_delete"
} as const;

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		const fetchedWebhooks = await interaction.guild?.fetchWebhooks();
		const webhookArray = fetchedWebhooks?.map((webhook) => webhook);

		if (!webhookArray || webhookArray?.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_no_webhooks
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const signature = await botSignature(client, interaction.guildId);
		const pages = Math.ceil(webhookArray.length / PER_PAGE);
		let currentPage = 0;

		const render = (disabled: boolean): ContainerBuilder => {
			const list = webhookArray
				.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE)
				.map((webhook) => {
					const sub = [
						`\`${webhook.id}\``,
						webhook.owner ? `<@${webhook.owner.id}>` : null,
						`<t:${Math.floor(webhook.createdTimestamp / 1000)}:R>`
					]
						.filter(Boolean)
						.join(" · ");
					const channel = webhook.channelId
						? ` · <#${webhook.channelId}>`
						: "";
					return `**${escapeMarkdown(webhook.name)}**${channel}\n-# ${sub}`;
				})
				.join("\n");

			const container = buildCard({
				accent: ACCENT.info,
				emoji: e.Link_Icon,
				title: lang.util_allwebhooks_embed_title,
				description: `-# ${lang.allwebhooks_card_count.replace("${count}", String(webhookArray.length))}`,
				blocks: [list],
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
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(ID.delete)
					.setEmoji(e.Ticket_Trash)
					.setLabel(lang.allwebhooks_button_delete)
					.setStyle(ButtonStyle.Danger)
					.setDisabled(disabled)
			);
			return container.addActionRowComponents(row);
		};

		const message = await sendCard(client, interaction, render(false));

		const collector = message.createMessageComponentCollector({
			time: 60_000 * 15,
			componentType: ComponentType.Button
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
				await i.update({ components: [render(false)] });
			} else if (i.customId === ID.next) {
				currentPage = (currentPage + 1) % pages;
				await i.update({ components: [render(false)] });
			} else if (i.customId === ID.delete) {
				collector.stop("deleted");
				await i.update({
					components: [
						notice(
							"info",
							`${e.Discord_Loading} ${lang.util_allwebhooks_deleting}`
						)
					]
				});

				let u = 0;

				for (const webhook of webhookArray) {
					await webhook.delete().catch(() => false);
					u++;
				}

				await message
					.edit({
						components: [
							notice(
								"success",
								`${e.Yes} ${lang.util_allwebhooks_deleted.replace("${u}", String(u))}`
							)
						]
					})
					.catch(() => undefined);
			}
		});

		collector.on("end", async (_collected, reason) => {
			if (reason === "deleted") return;
			await message
				.edit({ components: [render(true)] })
				.catch(() => undefined);
		});

		return;
	}
};
