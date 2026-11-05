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
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	PermissionsBitField,
	RoleSelectMenuBuilder,
	RoleSelectMenuInteraction,
	ComponentType,
	Role,
	PermissionFlagsBits,
	Message,
	MessageFlags,
	BaseGuildTextChannel,
	ContainerBuilder
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	sendCard
} from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		let all_roles: DatabaseStructure.UtilsData["wlRoles"] =
			(await client.db.get(`${interaction.guildId}.UTILS.wlRoles`)) || [];

		const e = client.iHorizon_Emojis;
		const signature = await botSignature(client, interaction.guildId);

		const roleSelectMenu = new RoleSelectMenuBuilder()
			.setCustomId("utils-wlRoles-role-selecter")
			.setMaxValues(25)
			.setMinValues(0);

		if (all_roles !== undefined && all_roles?.length >= 1) {
			const roles: string[] = Array.isArray(all_roles)
				? all_roles
				: [all_roles];
			roleSelectMenu.setDefaultRoles(roles);
		}

		const saveButton = new ButtonBuilder()
			.setCustomId("utils-wlRoles-save-button")
			.setStyle(ButtonStyle.Primary)
			.setLabel(lang.utils_label_save)
			.setEmoji(e.Save_Clip);

		const comp =
			new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
				roleSelectMenu
			);
		const comp_2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			saveButton
		);

		// Role ids shown on the card (the saved list, then the selection).
		let shownRoles: string[] = Array.isArray(all_roles) ? all_roles : [];
		// Once saved, only the (disabled) save button stays under the card.
		let saved = false;

		function render(): ContainerBuilder {
			const container = buildCard({
				accent: ACCENT.info,
				emoji: e.Ticket_Role,
				title: lang.wlroles_card_title,
				description: lang.utils_wlroles_embed_desc,
				fields: [
					{
						emoji: e.Ticket_Role,
						label: lang.setjoinroles_help_embed_fields_1_name,
						value:
							shownRoles.map((x) => `<@&${x}>`).join(", ") ||
							lang.setjoinroles_var_none
					}
				],
				signature
			});
			if (saved) container.addActionRowComponents(comp_2);
			else
				container
					.addActionRowComponents(comp)
					.addActionRowComponents(comp_2);
			return container;
		}

		const refresh = () =>
			og_response.edit({ components: [render()] }).catch(() => undefined);

		const og_response = await sendCard(client, interaction, render());

		const confirmedDangerousRoles = new Set<string>();
		const tooHighterRoles = new Set<string>();

		let selectedRoles: Role[] = [];

		const collector = og_response.createMessageComponentCollector({
			componentType: ComponentType.RoleSelect,
			time: 240_000,
			filter: (i) => i.user.id === interaction.member?.user.id
		});

		const buttonCollector = og_response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 240_000,
			filter: (i) => i.user.id === interaction.member?.user.id
		});

		collector.on(
			"collect",
			async (roleInteraction: RoleSelectMenuInteraction) => {
				selectedRoles = [];
				all_roles = [];

				const dangerous_roles: {
					id: string;
					name: string;
					permissions: string[];
				}[] = [];
				const too_highter_roles: {
					id: string;
					name: string;
					position: string;
				}[] = [];

				if (
					!roleInteraction.guild?.members.me?.permissions.has(
						PermissionFlagsBits.ManageRoles
					)
				) {
					await roleInteraction.deferUpdate();
					// The panel is a Components V2 message: it cannot take a
					// plain text edit, so the warning goes in an ephemeral reply.
					await roleInteraction.followUp({
						content: lang.setjoinroles_var_perm_issue,
						flags: [MessageFlags.Ephemeral]
					});
					return;
				}

				for (const role of roleInteraction.roles) {
					all_roles.push(role[1].id);
					const rolePermissions = new PermissionsBitField(
						(role[1] as Role).permissions
					);
					const roleDangerousPermissions: string[] = [];

					for (const perm of client.func.method.getDangerousPermissions(
						lang
					)) {
						if (rolePermissions.has(perm.flag)) {
							roleDangerousPermissions.push(perm.name);
						}
					}

					if (
						roleDangerousPermissions.length > 0 &&
						!confirmedDangerousRoles.has(role[1].id)
					) {
						dangerous_roles.push({
							id: role[1].id,
							name: role[1].name,
							permissions: roleDangerousPermissions
						});
					}

					selectedRoles.push(role[1] as Role);

					if (
						interaction.guild?.members.me?.roles.highest
							.position! <= role[1].position
					) {
						if (!tooHighterRoles.has(role[1].id)) {
							too_highter_roles.push({
								id: role[1].id,
								name: role[1].name,
								position: role[1].position.toString()
							});
						}
					}
				}

				if (dangerous_roles.length > 0) {
					await handleDangerousRolesConfirmation(
						roleInteraction,
						dangerous_roles,
						confirmedDangerousRoles,
						lang
					);
				} else if (too_highter_roles.length > 0) {
					await handleTooHighterRoles(
						roleInteraction,
						too_highter_roles
					);
				} else {
					await roleInteraction.deferUpdate();
					showSelection(selectedRoles);
					await refresh();
				}
			}
		);

		buttonCollector.on(
			"collect",
			async (buttonInteraction: ButtonInteraction) => {
				await buttonInteraction.deferUpdate();
				if (
					buttonInteraction.customId === "utils-wlRoles-save-button"
				) {
					saveButton
						.setStyle(ButtonStyle.Success)
						.setEmoji(e.Yes)
						.setDisabled(true);
					saved = true;

					await refresh();

					await client.func.ihorizon_logs(interaction, {
						title: lang.utils_wlRoles_logsEmbed_title,
						description: lang.utils_wlRoles_logsEmbed_desc.replace(
							"${author}",
							interaction.member?.user.toString()!
						)
					});

					await client.db.set(
						`${interaction.guildId}.UTILS.wlRoles`,
						all_roles
					);
					collector.stop();
					buttonCollector.stop();
				}
			}
		);

		collector.on("end", async () => {
			comp.components.forEach((x) => {
				x.setDisabled(true);
			});

			comp_2.components.forEach((x) => {
				x.setDisabled(true);
			});

			await refresh();
		});

		function showSelection(roles: Role[]) {
			shownRoles = roles.map((role) => role.id);
		}

		async function handleDangerousRolesConfirmation(
			roleInteraction: RoleSelectMenuInteraction,
			dangerous_roles: {
				id: string;
				name: string;
				permissions: string[];
			}[],
			confirmedDangerousRoles: Set<string>,
			lang: LanguageData
		) {
			const confirm_buttons =
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("dangerous_roles_confirm_yes")
						.setStyle(ButtonStyle.Danger)
						.setLabel(lang.var_yes),
					new ButtonBuilder()
						.setCustomId("dangerous_roles_confirm_no")
						.setStyle(ButtonStyle.Secondary)
						.setLabel(lang.var_no)
				);

			const warnCard = (
				row: ActionRowBuilder<ButtonBuilder>
			): ContainerBuilder =>
				buildCard({
					accent: ACCENT.warning,
					emoji: e.Warn,
					title: lang.wlroles_card_warn_title,
					description: lang.setjoinroles_warn_dangerous_perm,
					blocks: [
						dangerous_roles
							.map(
								(role) =>
									`<@&${role.id}> \`${role.id}\`\n-# ${role.permissions.join(", ")}`
							)
							.join("\n")
					],
					signature
				}).addActionRowComponents(row);

			const warn_msg = await roleInteraction.reply({
				...cardPayload(warnCard(confirm_buttons)),
				flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
			});

			const disabledRow = (label: string) =>
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setDisabled(true)
						.setStyle(ButtonStyle.Secondary)
						.setCustomId("utils-wlRoles-choice-timeOut")
						.setLabel(label)
				);

			try {
				const buttonInteraction = await (
					interaction.channel as BaseGuildTextChannel
				)?.awaitMessageComponent({
					componentType: ComponentType.Button,
					time: 20_000,
					filter: (i) => i.user.id === interaction.member?.user.id!
				});

				await buttonInteraction?.deferUpdate();

				if (
					buttonInteraction?.customId ===
					"dangerous_roles_confirm_yes"
				) {
					dangerous_roles.forEach((role) =>
						confirmedDangerousRoles.add(role.id)
					);
					confirm_buttons.components.forEach((x) =>
						x.setDisabled(true)
					);
					await warn_msg.edit({
						components: [warnCard(confirm_buttons)]
					});

					showSelection(selectedRoles);
					await refresh();
				} else if (
					buttonInteraction?.customId === "dangerous_roles_confirm_no"
				) {
					await warn_msg.edit({
						components: [
							warnCard(
								disabledRow(lang.setjoinroles_action_canceled)
							)
						]
					});
				}
			} catch (err) {
				await warn_msg
					.edit({
						components: [
							warnCard(
								disabledRow(lang.setjoinroles_timesup_button)
							)
						]
					})
					.catch(() => undefined);
			}
		}

		async function handleTooHighterRoles(
			roleInteraction: RoleSelectMenuInteraction,
			too_highter_roles: {
				id: string;
				name: string;
				position: string;
			}[]
		) {
			const myPosition =
				interaction.guild?.members.me?.roles.highest.position;
			const card = buildCard({
				accent: ACCENT.danger,
				emoji: e.Warn,
				title: lang.wlroles_card_high_title,
				description: lang.setjoinroles_too_highter_roles,
				blocks: [
					too_highter_roles
						.map(
							(role) =>
								`<@&${role.id}> \`${role.position}\` · ${interaction.client.user.toString()} \`${myPosition}\``
						)
						.join("\n")
				],
				signature
			});

			await roleInteraction.reply({
				...cardPayload(card),
				flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
			});
		}
	}
};
