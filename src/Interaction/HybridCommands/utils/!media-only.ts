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
	PermissionFlagsBits,
	Message,
	MessageFlags,
	ChannelSelectMenuBuilder,
	ChannelType,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputStyle
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
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

		let all_channels =
			(await client.db.get(`${interaction.guildId}.UTILS.picOnly`)) ||
			([] as DatabaseStructure.UtilsData["picOnly"]);
		const baseData: DatabaseStructure.PicOnlyConfig = (await client.db.get(
			`${interaction.guildId}.UTILS.picOnlyConfig`
		)) || {
			threshold: 3,
			muteTime: 600000,
			createThread: "yes"
		};

		const e = client.iHorizon_Emojis;
		const signature = await botSignature(client, interaction.guildId);

		const channelSelectMenu = new ChannelSelectMenuBuilder()
			.setCustomId("utils-picOnly-role-selecter")
			.setChannelTypes([ChannelType.GuildText])
			.setMaxValues(25)
			.setMinValues(0);

		const choiceSelectMenu = new StringSelectMenuBuilder()
			.setCustomId("utils-picOnly-option-selecter")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.utils_piconly_select1_option1_label)
					.setValue("utils-picOnly-option-change-time"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.utils_piconly_select1_option2_label)
					.setValue("utils-picOnly-option-change-threshold"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.utils_piconly_embed_fields2_placeholder)
					.setValue("utils-picOnly-option-change-create-thread")
			);

		if (all_channels !== undefined && all_channels?.length >= 1) {
			const channels: string[] = Array.isArray(all_channels)
				? all_channels
				: [all_channels];
			channelSelectMenu.setDefaultChannels(channels);
		}

		const saveButton = new ButtonBuilder()
			.setCustomId("utils-picOnly-save-button")
			.setStyle(ButtonStyle.Primary)
			.setLabel(lang.utils_label_save)
			.setEmoji(e.Save_Clip);

		const comp =
			new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
				channelSelectMenu
			);
		const comp_1 =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				choiceSelectMenu
			);
		const comp_2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			saveButton
		);

		// Once saved, only the (disabled) save button stays under the card.
		let saved = false;

		function render() {
			const channels: string[] = Array.isArray(all_channels)
				? all_channels
				: [];
			const container = buildCard({
				accent: ACCENT.info,
				emoji: e.Camera,
				title: lang.media_only_card_title,
				description: lang.utils_pic_only_emnbed_desc,
				fields: [
					{
						emoji: e.Ticket_Hash,
						label: lang.joinghostping_add_ok_embed_fields_name,
						value:
							channels.map((x) => `<#${x}>`).join(", ") ||
							lang.setjoinroles_var_none
					},
					{
						emoji: e.Warn,
						label: lang.antispam_manage_choices_12_label,
						value: `\`${baseData?.threshold || 3}\``
					},
					{
						emoji: e.Timer,
						label: lang.utils_piconly_embed_fields_3_name,
						value: String(
							client.timeCalculator.to_beautiful_string(
								baseData.muteTime!,
								lang
							) ||
								client.timeCalculator.to_beautiful_string(
									"10m",
									lang
								)
						)
					},
					{
						emoji: e.Pin,
						label: lang.utils_piconly_embed_fields2_placeholder,
						value:
							baseData.createThread === "yes"
								? lang.var_yes
								: lang.var_no
					}
				],
				signature
			});
			if (saved) {
				container.addActionRowComponents(comp_2);
			} else {
				container
					.addActionRowComponents(comp)
					.addActionRowComponents(comp_1)
					.addActionRowComponents(comp_2);
			}
			return container;
		}

		const refresh = () =>
			og_response.edit({ components: [render()] }).catch(() => undefined);

		const og_response = await sendCard(client, interaction, render());

		const collector = og_response.createMessageComponentCollector({
			componentType: ComponentType.ChannelSelect,
			time: 240_000,
			filter: (i) => i.user.id === interaction.member?.user.id
		});

		const collector_1 = og_response.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 240_000,
			filter: (i) => i.user.id === interaction.member?.user.id
		});

		const buttonCollector = og_response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 240_000,
			filter: (i) => i.user.id === interaction.member?.user.id
		});

		collector.on("collect", async (channelInteraction) => {
			all_channels = channelInteraction.values;

			if (
				!channelInteraction.guild?.members.me?.permissions.has(
					PermissionFlagsBits.ManageRoles
				)
			) {
				await channelInteraction.deferUpdate();
				// The panel is a Components V2 message: it cannot take a
				// plain text edit, so the warning goes in an ephemeral reply.
				await channelInteraction.followUp({
					content: lang.setjoinroles_var_perm_issue,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			await channelInteraction.deferUpdate();
			await refresh();
		});

		collector_1.on("collect", async (stringInteraction) => {
			if (
				stringInteraction.values[0] ===
				"utils-picOnly-option-change-time"
			) {
				const response = await iHorizonModalResolve(
					{
						title: lang.utils_piconly_modal1_title,
						customId: "pic_only_time_config",
						deferUpdate: true,

						fields: [
							{
								customId: "case_value",
								placeHolder:
									lang.utils_piconly_modal1_fields1_placeholder,
								label: lang.utils_piconly_modal1_fields1_label,
								style: TextInputStyle.Short,
								maxLength: 8,
								minLength: 2,
								required: true
							}
						]
					},
					stringInteraction
				);

				const calculedTime =
					client.timeCalculator.to_ms(
						response?.fields.getTextInputValue("case_value")!
					) || 600000;

				baseData.muteTime =
					1296000000 < calculedTime ? 600000 : calculedTime;

				await refresh();
				await client.db.set(
					`${interaction.guildId}.UTILS.picOnlyConfig`,
					baseData
				);
			} else if (
				stringInteraction.values[0] ===
				"utils-picOnly-option-change-threshold"
			) {
				const response = await iHorizonModalResolve(
					{
						title: lang.utils_piconly_modal2_title,
						customId: "pic_only_threshold_config",
						deferUpdate: true,

						fields: [
							{
								customId: "case_value",
								placeHolder:
									lang.utils_piconly_modal2_fields1_placeholder,
								label: lang.utils_piconly_modal2_fields1_label,
								style: TextInputStyle.Short,
								maxLength: 4,
								minLength: 1,
								required: true
							}
						]
					},
					stringInteraction
				);

				const threshold = parseInt(
					response?.fields.getTextInputValue("case_value")!
				);

				baseData.threshold = 15 < threshold ? 3 : threshold;

				await refresh();
				await client.db.set(
					`${interaction.guildId}.UTILS.picOnlyConfig`,
					baseData
				);
			} else if (
				stringInteraction.values[0] ===
				"utils-picOnly-option-change-create-thread"
			) {
				stringInteraction.deferUpdate();
				if (baseData.createThread === "no") {
					baseData.createThread = "yes";
				} else {
					baseData.createThread = "no";
				}
				await refresh();
				await client.db.set(
					`${interaction.guildId}.UTILS.picOnlyConfig`,
					baseData
				);
			}
		});

		buttonCollector.on(
			"collect",
			async (buttonInteraction: ButtonInteraction) => {
				await buttonInteraction.deferUpdate();
				if (
					buttonInteraction.customId === "utils-picOnly-save-button"
				) {
					saveButton
						.setStyle(ButtonStyle.Success)
						.setEmoji(e.Yes)
						.setDisabled(true);
					saved = true;

					await refresh();

					await client.db.set(
						`${interaction.guildId}.UTILS.picOnly`,
						all_channels
					);
					await client.db.set(
						`${interaction.guildId}.UTILS.picOnlyConfig`,
						baseData
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

			comp_1.components.forEach((x) => {
				x.setDisabled(true);
			});

			comp_2.components.forEach((x) => {
				x.setDisabled(true);
			});

			await refresh();
		});
	}
};
