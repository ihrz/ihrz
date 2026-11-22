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
	RoleSelectMenuBuilder
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { AntiSpam } from "../../../../types/antispam.js";
import { invalidateAntiSpamConfig } from "../../../core/modules/antiSpamEngine.js";
import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload
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
			!interaction.guild ||
			!interaction.channel
		)
			return;

		let all_roles =
			(await client.db.get(
				`${interaction.guildId}.GUILD.ANTISPAM.BYPASS_ROLES`
			)) || ([] as AntiSpam.AntiSpamOptions["BYPASS_ROLES"]);

		const e = client.iHorizon_Emojis;
		const signature = await botSignature(client, interaction.guildId);
		const guildIcon = interaction.guild.iconURL({ size: 256 });

		// Role ids shown on the card: the saved list, then the selection.
		let shown: string[] = Array.isArray(all_roles) ? all_roles : [];

		const select = new RoleSelectMenuBuilder()
			.setCustomId("antispam-select-config")
			.setPlaceholder(lang.help_select_menu)
			.setMinValues(0)
			.setMaxValues(20);

		if (all_roles !== undefined && all_roles.length >= 1) {
			const roles: string[] = Array.isArray(all_roles)
				? all_roles
				: [all_roles];
			select.setDefaultRoles(roles);
		}

		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Success)
			.setCustomId("antispam-manage-save-button")
			.setLabel(lang.antispam_manage_button_label);

		const selectRow =
			new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(select);
		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			button
		);

		function render(): ContainerBuilder {
			return buildCard({
				accent: ACCENT.info,
				emoji: e.AutoMod_Spam,
				title: lang.antispam_manage_embed_title,
				description: lang.antispan_bypassroles_embed_desc,
				thumbnail: guildIcon,
				fields: [
					{
						emoji: e.Ticket_Role,
						label: lang.setjoinroles_help_embed_fields_1_name,
						value:
							shown.map((x) => `<@&${x}>`).join(", ") ||
							lang.setjoinroles_var_none
					}
				],
				signature
			})
				.addActionRowComponents(selectRow)
				.addActionRowComponents(buttonRow);
		}

		const originalResponse = await client.func.method.interactionSend(
			interaction,
			cardPayload(render()) as never
		);

		const collector = originalResponse.createMessageComponentCollector({
			componentType: ComponentType.RoleSelect,
			time: 240_000
		});

		const buttonCollector =
			originalResponse.createMessageComponentCollector({
				time: 240_000,
				componentType: ComponentType.Button
			});

		buttonCollector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			await client.db.set(
				`${interaction.guildId}.GUILD.ANTISPAM.BYPASS_ROLES`,
				all_roles
			);
			invalidateAntiSpamConfig(interaction.guildId!);

			await i.deferUpdate();

			collector.stop();
			buttonCollector.stop();
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			await i.deferUpdate();

			all_roles = i.values;
			shown = i.values;
			// The card is sent again with its menu: keep the new selection in it.
			select.setDefaultRoles(i.values);
			await originalResponse
				.edit(cardPayload(render()) as never)
				.catch(() => undefined);
		});

		collector.on("end", async () => {
			select.setDisabled(true);
			button
				.setLabel(lang.antispam_manage_button_label)
				.setEmoji(e.Yes)
				.setDisabled(true);
			await originalResponse
				.edit(cardPayload(render()) as never)
				.catch(() => undefined);
		});
	}
};
