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
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	notice,
	pageLabel,
	sendCard
} from "../../../core/modules/uiCard.js";

const PER_PAGE = 10;

const ID = {
	previous: "admin_users_previous",
	next: "admin_users_next",
	unrank: "admin_users_unrank",
	bots: "admin_users_bots"
} as const;

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

		const guild = interaction.guild;
		const e = client.iHorizon_Emojis;
		const all_admin_members = Array.from(
			guild.members.cache
				.filter((x) =>
					x.permissions.has(PermissionFlagsBits.Administrator)
				)
				.filter((x) => x.user.id !== x.guild.ownerId)
				.filter((x) => x.user.id !== x.client.user.id)
				.values()
		);

		if (all_admin_members.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.all_admins_nobody_admins
			});
			return;
		}

		const signature = await botSignature(client, guild.id);
		let currentPage = 0;
		let is_bot_filtered = false;

		const visible = () =>
			is_bot_filtered
				? all_admin_members.filter((m) => !m.user.bot)
				: all_admin_members;
		const pageCount = () =>
			Math.max(1, Math.ceil(visible().length / PER_PAGE));

		const render = (disabled: boolean): ContainerBuilder => {
			const members = visible();
			const pages = pageCount();
			currentPage = Math.min(currentPage, pages - 1);

			const list = members
				.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE)
				.map((m) => {
					const bot = m.user.bot
						? ` ${e.Slash_Bot_Badge} ${lang.card_bot}`
						: "";
					return `${m}${bot}\n-# \`${m.user.tag}\` · ${m.roles.highest}`;
				})
				.join("\n");

			const container = buildCard({
				accent: ACCENT.warning,
				emoji: e.Crown,
				title: lang.admin_users_card_title,
				description: `-# ${lang.admin_users_card_count.replace("${count}", String(all_admin_members.length))}`,
				thumbnail: guild.iconURL({ size: 128 }),
				blocks: [list || lang.admin_users_card_only_bots],
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
					.setCustomId(ID.bots)
					.setEmoji(e.Slash_Bot_Badge)
					.setLabel(
						is_bot_filtered
							? lang.admin_users_button_show_bots
							: lang.admin_users_button_hide_bots
					)
					.setStyle(
						is_bot_filtered
							? ButtonStyle.Success
							: ButtonStyle.Secondary
					)
					.setDisabled(disabled),
				new ButtonBuilder()
					.setCustomId(ID.unrank)
					.setEmoji(e.Ticket_Trash)
					.setLabel(lang.all_admins_unrank_button_label)
					.setStyle(ButtonStyle.Danger)
					.setDisabled(disabled)
			);
			return container.addActionRowComponents(row);
		};

		const message = await sendCard(client, interaction, render(false));

		const collector = message.createMessageComponentCollector({
			time: 1_60_000
		});

		collector.on("collect", async (interaction_2) => {
			if (interaction_2.user.id !== interaction.member?.user.id) {
				await interaction_2.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			if (interaction_2.customId === ID.previous) {
				currentPage = (currentPage - 1 + pageCount()) % pageCount();
			} else if (interaction_2.customId === ID.next) {
				currentPage = (currentPage + 1) % pageCount();
			} else if (interaction_2.customId === ID.bots) {
				is_bot_filtered = !is_bot_filtered;
			} else if (interaction_2.customId === ID.unrank) {
				if (interaction_2.user.id !== interaction_2.guild?.ownerId) {
					await interaction_2.reply({
						content: lang.all_admins_unrank_not_owner
					});
					collector.stop();
					return;
				}

				collector.stop("unranked");
				await interaction_2.update({
					components: [
						notice(
							"info",
							`${e.Discord_Loading} ${lang.card_working}`
						)
					]
				});

				let good = 0;
				let bad = 0;
				const to_unrank_members = all_admin_members.filter(
					(x) => x.guild.ownerId !== x.user.id
				);

				for (const member of to_unrank_members) {
					const filtered_roles = Array.from(
						member.roles.cache
							.filter(
								(x) =>
									!x.permissions.has(
										PermissionFlagsBits.Administrator
									)
							)
							.keys()
					);

					try {
						await member.roles
							.set(
								filtered_roles,
								"[AdminUsers] clearing admin on the server"
							)
							.catch(() => false);
						good++;
					} catch (err) {
						bad++;
					}
				}

				await message
					.edit({
						components: [
							buildCard({
								accent: bad ? ACCENT.warning : ACCENT.success,
								emoji: e.Yes,
								title: lang.admin_users_card_done_title,
								thumbnail: guild.iconURL({ size: 128 }),
								fields: [
									{
										emoji: e.Ticket_User,
										label: lang.card_label_requested_by,
										value: `${interaction_2.user}`
									},
									{
										emoji: e.Yes,
										label: lang.admin_users_label_unranked,
										value: `\`${good}\``
									},
									{
										emoji: e.No,
										label: lang.card_label_failed,
										value: `\`${bad}\``
									}
								],
								signature
							})
						]
					})
					.catch(() => undefined);
				return;
			} else return;

			await interaction_2.update({ components: [render(false)] });
		});

		collector.on("end", async (_collected, reason) => {
			if (reason === "unranked") return;
			await message
				.edit({ components: [render(true)] })
				.catch(() => undefined);
		});

		return;
	}
};
