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
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	ComponentType,
	PermissionFlagsBits,
	Message,
	ApplicationCommandType
} from "discord.js";

import { Command } from "../../../../types/command.js";
import { LanguageData } from "../../../../types/languageData.js";
import {
	AvailableLanguage,
	getLanguageByCode
} from "../../../core/functions/getLanguageData.js";

export const command: Command = {
	name: "setlang",
	name_localizations: {
		fr: "setlangue",
		ja: "setlang",
		ru: "setlang",
		"es-ES": "setlang"
	},

	aliases: ["setsrvlang", "lang"],

	description: "Set the server language!",
	description_localizations: {
		fr: "Choisir la langue du bot discord !",
		ja: "サーバーの言語を設定！",
		ru: "Установить язык сервера!",
		"es-ES": "Establecer el idioma del servidor!"
	},

	thinking: false,
	category: "bot",
	type: ApplicationCommandType.ChatInput,
	permission: PermissionFlagsBits.Administrator,
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

		const currentLang = (await client.db.get(
			`${interaction.guildId}.GUILD.LANG.lang`
		)) as string;
		const current = AvailableLanguage.find((l) => l.code === currentLang);

		const embed = new EmbedBuilder()
			.setTitle(lang.setserverlang_panel_title)
			.setColor("#475387")
			.setDescription(lang.setserverlang_panel_description)
			.addFields({
				name: lang.setserverlang_panel_current,
				value: current
					? `${current.flag} ${current.name}`
					: lang.setserverlang_panel_select
			})
			.setFooter(
				await client.func.displayBotName.footerBuilder(
					interaction.guildId!
				)
			)
			.setThumbnail("attachment://footer_icon.png")
			.setTimestamp();

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("setlang-language-selecter")
			.setPlaceholder(lang.setserverlang_panel_select)
			.addOptions(
				AvailableLanguage.map((l) => ({
					label: l.name,
					value: l.code,
					emoji: l.flag,
					default: l.code === currentLang
				}))
			);

		const saveButton = new ButtonBuilder()
			.setCustomId("setlang-save-button")
			.setStyle(ButtonStyle.Primary)
			.setEmoji("💾");

		const selectRow =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				selectMenu
			);
		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			saveButton
		);

		const og_response = await client.func.method.interactionSend(
			interaction,
			{
				embeds: [embed],
				components: [selectRow, buttonRow],
				files: [
					await client.func.displayBotName.footerAttachmentBuilder(
						interaction
					)
				]
			}
		);

		let selectedLang: string | null = null;

		const selectCollector = og_response.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 240_000,
			filter: (i) => i.user.id === interaction.member?.user.id
		});

		const buttonCollector = og_response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 240_000,
			filter: (i) => i.user.id === interaction.member?.user.id
		});

		selectCollector.on(
			"collect",
			async (selectInteraction: StringSelectMenuInteraction) => {
				await selectInteraction.deferUpdate();
				selectedLang = selectInteraction.values[0];

				const newLang = await getLanguageByCode(selectedLang);
				const chosen = AvailableLanguage.find(
					(l) => l.code === selectedLang
				);

				embed
					.setTitle(newLang.setserverlang_panel_title)
					.setDescription(newLang.setserverlang_panel_description)
					.setFields({
						name: newLang.setserverlang_panel_current,
						value: chosen
							? `${chosen.flag} ${chosen.name}`
							: newLang.setserverlang_panel_select
					});

				const updatedSelect = new StringSelectMenuBuilder()
					.setCustomId("setlang-language-selecter")
					.setPlaceholder(newLang.setserverlang_panel_select)
					.addOptions(
						AvailableLanguage.map((l) => ({
							label: l.name,
							value: l.code,
							emoji: l.flag,
							default: l.code === selectedLang
						}))
					);

				const updatedSelectRow =
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						updatedSelect
					);

				await og_response.edit({
					embeds: [embed],
					components: [updatedSelectRow, buttonRow]
				});
			}
		);

		buttonCollector.on(
			"collect",
			async (buttonInteraction: ButtonInteraction) => {
				await buttonInteraction.deferUpdate();

				if (buttonInteraction.customId === "setlang-save-button") {
					if (!selectedLang) {
						await buttonInteraction.followUp({
							content: lang.setserverlang_panel_select,
							flags: [1 << 6]
						});
						return;
					}

					const newButtonRow =
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							saveButton
								.setStyle(ButtonStyle.Success)
								.setEmoji(client.iHorizon_Emojis.Yes)
								.setDisabled(true)
						);

					selectMenu.setDisabled(true);
					const disabledSelectRow =
						new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
							selectMenu
						);

					await og_response.edit({
						components: [disabledSelectRow, newButtonRow]
					});

					await client.func.ihorizon_logs(interaction, {
						title: lang.setserverlang_logs_embed_title_on_enable,
						description:
							lang.setserverlang_logs_embed_description_on_enable
								.replace(
									"${interaction.user.id}",
									interaction.member?.user.id!
								)
								.replace("${type}", selectedLang)
					});

					await client.db.set(`${interaction.guildId}.GUILD.LANG`, {
						lang: selectedLang
					});

					await buttonInteraction.followUp({
						content: lang.setserverlang_panel_saved.replace(
							"${type}",
							selectedLang
						),
						flags: [1 << 6]
					});

					selectCollector.stop();
					buttonCollector.stop();
				}
			}
		);

		selectCollector.on("end", async () => {
			selectMenu.setDisabled(true);
			const disabledSelectRow =
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					selectMenu
				);

			saveButton.setDisabled(true);
			const disabledButtonRow =
				new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);

			await og_response
				.edit({ components: [disabledSelectRow, disabledButtonRow] })
				.catch(() => {});
		});
	}
};
