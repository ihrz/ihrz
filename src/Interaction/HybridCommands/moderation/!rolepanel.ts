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
	ComponentType,
	ContainerBuilder,
	GuildMember,
	Message,
	MessageFlags,
	PermissionFlagsBits,
	PermissionsBitField,
	Role,
	RoleSelectMenuBuilder,
	RoleSelectMenuInteraction
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
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
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const author = interaction.member as GuildMember;
		const targetMember = await resolveTargetMember(
			client,
			interaction,
			args
		);
		let selectedRoles: Role[] = [];
		let refusedRoles: string[] = [];
		let done: ContainerBuilder | null = null;

		if (!targetMember) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_found_member
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const guild = interaction.guild;
		const signature = await botSignature(client, guild.id);

		const roleSelectMenu = new RoleSelectMenuBuilder()
			.setCustomId("mod-rolepanel-role-select")
			.setPlaceholder(lang.rolepanel_setup_select_placeholder)
			.setMinValues(1)
			.setMaxValues(25);

		const applyButton = new ButtonBuilder()
			.setCustomId("mod-rolepanel-apply-button")
			.setEmoji(client.iHorizon_Emojis.Yes)
			.setStyle(ButtonStyle.Success);

		const selectRow =
			new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
				roleSelectMenu
			);
		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			applyButton
		);

		const setupCard = (): ContainerBuilder =>
			buildCard({
				accent: ACCENT.info,
				emoji: e.Ticket_Role,
				title: lang.rolepanel_setup_embed_title,
				description: lang.rolepanel_setup_embed_desc.replaceAll(
					"${member}",
					targetMember.toString()
				),
				thumbnail: guild.iconURL({ forceStatic: false }),
				fields: [
					{
						emoji: e.Ticket_Role,
						label: lang.rolepanel_setup_embed_roles_field,
						value:
							selectedRoles.length > 0
								? selectedRoles
										.map((role) => role.toString())
										.join(", ")
								: lang.var_none
					}
				],
				blocks: [
					refusedRoles.length > 0 &&
						`${e.No} **${lang.rolepanel_setup_embed_refused_field}**\n${refusedRoles.join("\n")}`
				],
				signature
			})
				.addActionRowComponents(selectRow)
				.addActionRowComponents(buttonRow);

		const originalResponse = await sendCard(
			client,
			interaction,
			setupCard()
		);

		const selectCollector =
			originalResponse.createMessageComponentCollector({
				componentType: ComponentType.RoleSelect,
				time: 240_000,
				filter: (i) => i.user.id === author.id
			});

		const buttonCollector =
			originalResponse.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 240_000,
				filter: (i) => i.user.id === author.id
			});

		selectCollector.on(
			"collect",
			async (roleInteraction: RoleSelectMenuInteraction<"cached">) => {
				await roleInteraction.deferUpdate();

				if (
					!roleInteraction.guild.members.me?.permissions.has(
						PermissionFlagsBits.ManageRoles
					)
				) {
					await client.func.method.interactionSend(interaction, {
						content: lang.setjoinroles_var_perm_issue,
						flags: [1 << 6]
					});
					return;
				}

				const validRoles: Role[] = [];
				const refused: string[] = [];

				for (const [, role] of roleInteraction.roles) {
					const refusedReason = getRefusedRoleReason(
						role as Role,
						author,
						lang
					);

					if (refusedReason) {
						refused.push(`${role.toString()}: ${refusedReason}`);
						continue;
					}

					validRoles.push(role as Role);
				}

				selectedRoles = validRoles;
				refusedRoles = refused;
				await roleInteraction.editReply({ components: [setupCard()] });
			}
		);

		buttonCollector.on(
			"collect",
			async (buttonInteraction: ButtonInteraction<"cached">) => {
				await buttonInteraction.deferUpdate();

				if (selectedRoles.length === 0) {
					await client.func.method.interactionSend(interaction, {
						content: lang.rolepanel_setup_no_roles,
						flags: [1 << 6]
					});
					return;
				}

				const addedRoles: string[] = [];
				const removedRoles: string[] = [];
				const refusedOnApply: string[] = [];

				for (const role of selectedRoles) {
					const refusedReason = getRefusedRoleReason(
						role,
						author,
						lang
					);

					if (refusedReason) {
						refusedOnApply.push(
							`${role.toString()}: ${refusedReason}`
						);
						continue;
					}

					if (targetMember.roles.cache.has(role.id)) {
						await targetMember.roles.remove(
							role.id,
							`[RolePanel] Author: ${author.id}`
						);
						removedRoles.push(role.toString());
						continue;
					}

					await targetMember.roles.add(
						role.id,
						`[RolePanel] Author: ${author.id}`
					);
					addedRoles.push(role.toString());
				}

				done = buildCard({
					accent:
						addedRoles.length > 0 || removedRoles.length > 0
							? ACCENT.success
							: ACCENT.warning,
					emoji: e.Ticket_Role,
					title: lang.rolepanel_card_done_title,
					thumbnail: targetMember.displayAvatarURL({ size: 128 }),
					fields: [
						{
							emoji: e.Ticket_User,
							label: lang.utils_label_member,
							value: targetMember.toString()
						},
						{
							emoji: e.Security,
							label: lang.utils_label_by,
							value: author.toString()
						},
						{
							emoji: e.Plus,
							label: lang.rolepanel_label_added,
							value: addedRoles.join(", ") || lang.var_none
						},
						{
							emoji: e.Minus,
							label: lang.rolepanel_label_removed,
							value: removedRoles.join(", ") || lang.var_none
						}
					],
					blocks: [
						refusedOnApply.length > 0 &&
							`${e.No} **${lang.rolepanel_label_refused}**\n${refusedOnApply.join("\n")}`
					],
					signature
				});
				await buttonInteraction.editReply({ components: [done] });

				if (addedRoles.length > 0 || removedRoles.length > 0) {
					await client.func.ihorizon_logs(interaction, {
						title: lang.rolepanel_logs_embed_title_apply,
						description: lang.rolepanel_logs_embed_desc_apply
							.replace("${authorId}", author.id)
							.replace("${memberId}", targetMember.id)
							.replace(
								"${addedRoles}",
								addedRoles.join(", ") || lang.var_none
							)
							.replace(
								"${removedRoles}",
								removedRoles.join(", ") || lang.var_none
							)
					});
				}

				selectCollector.stop();
				buttonCollector.stop();
			}
		);

		selectCollector.on("end", async () => {
			// After an apply the result card is already shown, without rows.
			if (done) return;
			selectRow.components.forEach((component) =>
				component.setDisabled(true)
			);
			buttonRow.components.forEach((component) =>
				component.setDisabled(true)
			);
			await originalResponse
				.edit({
					...cardPayload(setupCard()),
					flags: [MessageFlags.IsComponentsV2]
				} as never)
				.catch(() => undefined);
		});
	}
};

async function resolveTargetMember(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	args?: string[]
): Promise<GuildMember | null> {
	if (interaction instanceof ChatInputCommandInteraction) {
		return (
			(interaction.options.getMember("member") as GuildMember | null) ||
			(interaction.member as GuildMember)
		);
	}

	const value = args?.[0]?.toLowerCase();
	if (!value || ["myself", "self", "me", "moi"].includes(value)) {
		return interaction.member as GuildMember;
	}

	return (
		(client.func.method.member(interaction, args!, 0) as GuildMember) ||
		null
	);
}

function getRefusedRoleReason(
	role: Role,
	author: GuildMember,
	lang: LanguageData
): string | null {
	const botMember = role.guild.members.me;

	if (role.id === role.guild.id || role.managed) {
		return lang.rolepanel_role_managed_or_everyone;
	}

	if (!botMember || botMember.roles.highest.position <= role.position) {
		return lang.rolepanel_role_too_high_bot;
	}

	if (
		role.guild.ownerId !== author.id &&
		author.roles.highest.position <= role.position
	) {
		return lang.rolepanel_role_too_high_user;
	}

	const authorPermissions = new PermissionsBitField(author.permissions);
	const rolePermissions = new PermissionsBitField(role.permissions);

	if (!authorPermissions.has(PermissionFlagsBits.Administrator)) {
		const missingPermissions = rolePermissions
			.toArray()
			.filter((permission) => !authorPermissions.has(permission));

		if (missingPermissions.length > 0) {
			return lang.rolepanel_role_missing_permissions.replace(
				"${permissions}",
				missingPermissions
					.map((permission) => `\`${permission}\``)
					.join(", ")
			);
		}
	}

	return null;
}
