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
	PermissionFlagsBits,
	PermissionsBitField
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
	previous: "admin_roles_previous",
	next: "admin_roles_next",
	remove: "admin_roles_remove"
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
		const all_admin_roles = Array.from(
			guild.roles.cache
				.filter((x) =>
					x.permissions.has(PermissionFlagsBits.Administrator)
				)
				.values()
		).sort((a, b) => b.position - a.position);

		if (all_admin_roles.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.admin_roles_nobody_roles
			});
			return;
		}

		const signature = await botSignature(client, guild.id);
		const pages = Math.ceil(all_admin_roles.length / PER_PAGE);
		let currentPage = 0;

		const render = (disabled: boolean): ContainerBuilder => {
			const list = all_admin_roles
				.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE)
				.map((role) => {
					const sub = [
						`\`${role.id}\``,
						lang.role_members_card_count.replace(
							"${count}",
							String(role.members.size)
						),
						role.managed ? lang.admin_roles_card_managed : null
					]
						.filter(Boolean)
						.join(" · ");
					const bot = role.managed ? ` ${e.Slash_Bot_Badge}` : "";
					return `${role}${bot}\n-# ${sub}`;
				})
				.join("\n");

			const container = buildCard({
				accent: ACCENT.warning,
				emoji: e.Ticket_Role,
				title: lang.admin_roles_card_title,
				description: `-# ${lang.admin_roles_card_count.replace("${count}", String(all_admin_roles.length))}`,
				thumbnail: guild.iconURL({ size: 128 }),
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
					.setCustomId(ID.remove)
					.setEmoji(e.Ticket_Trash)
					.setLabel(lang.admin_roles_remove_button_label)
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
				currentPage = (currentPage - 1 + pages) % pages;
			} else if (interaction_2.customId === ID.next) {
				currentPage = (currentPage + 1) % pages;
			} else if (interaction_2.customId === ID.remove) {
				if (interaction_2.user.id !== interaction_2.guild?.ownerId) {
					await interaction_2.reply({
						content: lang.admin_roles_remove_not_owner
					});
					collector.stop();
					return;
				}

				collector.stop("removed");
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

				for (const role of all_admin_roles) {
					try {
						// Create new permissions without Administrator
						const newPermissions = new PermissionsBitField(
							role.permissions
						);
						newPermissions.remove(
							PermissionFlagsBits.Administrator
						);

						await role.setPermissions(
							newPermissions,
							`[AdminRoles] removing admin permission from role`
						);
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
								title: lang.admin_roles_card_done_title,
								thumbnail: guild.iconURL({ size: 128 }),
								fields: [
									{
										emoji: e.Ticket_User,
										label: lang.card_label_requested_by,
										value: `${interaction_2.user}`
									},
									{
										emoji: e.Yes,
										label: lang.admin_roles_label_modified,
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
			if (reason === "removed") return;
			await message
				.edit({ components: [render(true)] })
				.catch(() => undefined);
		});

		return;
	}
};
