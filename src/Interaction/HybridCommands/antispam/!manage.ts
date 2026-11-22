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
	Message,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextInputStyle
} from "discord.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";

import { LanguageData } from "../../../../types/languageData.js";
import { AntiSpam } from "../../../../types/antispam.js";
import { invalidateAntiSpamConfig } from "../../../core/modules/antiSpamEngine.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload
} from "../../../core/modules/uiCard.js";

type AntiSpamOptionKey = keyof AntiSpam.AntiSpamOptions;
type PresetKeys = "chill" | "guard" | "extreme";

const AntiSpamPreset: { [key in PresetKeys]: AntiSpam.AntiSpamOptions } = {
	chill: {
		BYPASS_ROLES: [],
		ignoreBots: true,
		maxInterval: 1900,
		Enabled: true,
		Threshold: 7,
		removeMessages: true,
		punishment_type: "mute",
		punishTime: 1000 * 60 * 2 // 2 MINUTES,
	},
	guard: {
		BYPASS_ROLES: [],
		ignoreBots: false,
		maxInterval: 2700,
		Enabled: true,
		Threshold: 5,
		removeMessages: true,
		punishment_type: "mute",
		punishTime: 1000 * 60 * 4 // 4 MINUTES,
	},
	extreme: {
		BYPASS_ROLES: [],
		ignoreBots: false,
		maxInterval: 3200,
		Enabled: true,
		Threshold: 3,
		removeMessages: true,
		punishment_type: "mute",
		punishTime: 1000 * 60 * 30 // 30 MINUTES,
	}
};

import { SubCommand } from "../../../../types/command.js";

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

		let baseData: AntiSpam.AntiSpamOptions = (await client.db.get(
			`${interaction.guildId}.GUILD.ANTISPAM`
		)) || {
			ignoreBots: false,
			maxInterval: 1900,
			Enabled: true,
			Threshold: 3,
			removeMessages: true,
			punishment_type: "mute",
			punishTime: client.timeCalculator.to_ms("15m")!,
			BYPASS_CHANNELS:
				(await client.db.get(
					`${interaction.guildId}.GUILD.ANTISPAM.BYPASS_CHANNELS`
				)) || [],
			BYPASS_ROLES:
				(await client.db.get(
					`${interaction.guildId}.GUILD.ANTISPAM.BYPASS_ROLES`
				)) || []
		};

		const e = client.iHorizon_Emojis;
		const signature = await botSignature(client, interaction.guildId);
		const guildIcon = interaction.guild.iconURL({ size: 256 });

		const choices: {
			label: string;
			description: string;
			value: string;
			type: "boolean" | "punish" | "number";
			componentType: ComponentType | "modal";
			wantedValueType?: "time" | "number";
		}[] = [
			{
				label: lang.antispam_manage_choices_1_label,
				description: lang.antispam_manage_choices_1_desc,
				value: "Enabled",
				type: "boolean",

				componentType: ComponentType.StringSelect
			},
			{
				label: lang.antispam_manage_choices_2_label,
				description: lang.antispam_manage_choices_2_desc,
				value: "ignoreBots",
				type: "boolean",

				componentType: ComponentType.StringSelect
			},
			{
				label: lang.antispam_manage_choices_3_label,
				description: lang.antispam_manage_choices_3_desc,
				value: "punishment_type",
				type: "punish",

				componentType: ComponentType.StringSelect
			},
			{
				label: lang.antispam_manage_choices_4_label,
				description: lang.antispam_manage_choices_4_desc,
				value: "punishTime",
				type: "number",

				componentType: "modal",
				wantedValueType: "time"
			},
			{
				label: lang.antispam_manage_choices_6_label,
				description: lang.antispam_manage_choices_6_desc,
				value: "removeMessages",
				type: "boolean",

				componentType: ComponentType.StringSelect
			},
			{
				label: lang.antispam_manage_choices_7_label,
				description: lang.antispam_manage_choices_7_desc,
				value: "maxInterval",
				type: "number",

				componentType: "modal",
				wantedValueType: "time"
			},
			{
				label: lang.antispam_manage_choices_12_label,
				description: lang.antispam_manage_choices_12_desc,
				value: "Threshold",
				type: "number",

				componentType: "modal",
				wantedValueType: "number"
			}
		];

		// The value shown for each choice, in the same order.
		const shown: string[] = choices.map((content) => {
			let value: string = "";
			const inDb = baseData?.[content.value as AntiSpamOptionKey];

			switch (content.type) {
				case "boolean":
					value =
						inDb === true
							? "🟢 " + lang.guildprofil_set_blockpub
							: inDb === undefined
								? "🔴 " + lang.setjoinroles_var_none
								: "🔴 " + lang.guildprofil_not_set_blockpub;
					break;
				case "number":
					if (inDb) {
						if (content.wantedValueType === "number") {
							value = inDb.toString();
						} else if (content.wantedValueType === "time") {
							const beautifulTime =
								client.timeCalculator.to_beautiful_string(
									inDb.toString() + "ms",
									lang
								);

							if (!beautifulTime) {
								value = "⏲️ " + lang.setjoinroles_var_none;
							} else {
								value = beautifulTime;
							}
						}
					}
					break;
				case "punish":
					value =
						inDb !== undefined
							? String(inDb)
							: `🔥 ` + lang.setjoinroles_var_none;
					break;
			}
			return value ? "`" + value + "`" : lang.setjoinroles_var_none;
		});

		function beautifyValue(
			key: string,
			value: any,
			lang: LanguageData
		): string {
			switch (key) {
				case "Enabled":
				case "ignoreBots":
				case "removeMessages":
				case "punishTimeMultiplier":
					return value
						? `\`🟢 ${lang.guildprofil_set_blockpub}\``
						: `\`🔴 ${lang.guildprofil_not_set_blockpub}\``;
				case "punishment_type":
					return value
						? `\`${value}\``
						: `\`🔥 ${lang.setjoinroles_var_none}\``;
				case "punishTime":
				case "maxDuplicatesInterval":
				case "maxInterval":
					return client.timeCalculator.to_beautiful_string(
						value.toString() + "ms",
						lang
					)
						? `\`${client.timeCalculator.to_beautiful_string(value.toString() + "ms", lang)}\``
						: `\`⏲️ ${lang.setjoinroles_var_none}\``;
				default:
					return `\`${value.toString()}\``;
			}
		}

		/** After a preset: every value from baseData. */
		function resetShown(baseData: AntiSpam.AntiSpamOptions) {
			choices.forEach((content, x) => {
				shown[x] = beautifyValue(
					content.value,
					baseData[content.value as AntiSpamOptionKey],
					lang
				);
			});
		}

		/** Shows `value` for the choice `key`. */
		function show(key: string, value: string) {
			const fieldIndex = choices.findIndex((x) => x.value === key);
			if (fieldIndex !== -1) shown[fieldIndex] = value;
		}

		const select = new StringSelectMenuBuilder()
			.setCustomId("antispam-select-config")
			.setPlaceholder(lang.help_select_menu)
			.addOptions(choices);

		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Success)
			.setCustomId("antispam-manage-save-button")
			.setLabel(lang.antispam_manage_button_label);

		const button2 = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setCustomId("antispam-manage-preset-button")
			.setLabel(lang.antispam_manage_button_preset_label);

		const presetSelect = new StringSelectMenuBuilder()
			.setCustomId("antispam-select-preset")
			.setPlaceholder(lang.antispam_manage_selectstring_preset_label)
			.addOptions([
				{
					label: lang.antispam_manage_preset_level1_name,
					value: "chill"
				},
				{
					label: lang.antispam_manage_preset_level2_name,
					value: "guard"
				},
				{
					label: lang.antispam_manage_preset_level3_name,
					value: "extreme"
				}
			]);

		// What sits under the card: the main menu and buttons, the preset
		// menu alone, or the main menu with a second menu for one value.
		let mode: "main" | "preset" | StringSelectMenuBuilder = "main";

		function render(): ContainerBuilder {
			const card = buildCard({
				accent: ACCENT.info,
				emoji: e.AutoMod_Spam,
				title: lang.antispam_manage_embed_title,
				thumbnail: guildIcon,
				fields: choices.map((content, x) => ({
					label: content.label,
					value: shown[x]
				})),
				signature
			});
			const row = <T extends StringSelectMenuBuilder | ButtonBuilder>(
				...components: T[]
			) => new ActionRowBuilder<T>().addComponents(...components);

			if (mode === "preset") {
				card.addActionRowComponents(row(presetSelect));
				return card;
			}
			card.addActionRowComponents(row(select));
			if (mode !== "main") card.addActionRowComponents(row(mode));
			card.addActionRowComponents(row(button, button2));
			return card;
		}

		// Every edit sends the whole card again with the Components V2 flag.
		const refresh = () =>
			originalResponse
				.edit(cardPayload(render()) as never)
				.catch(() => undefined);

		const originalResponse = await client.func.method.interactionSend(
			interaction,
			cardPayload(render()) as never
		);

		const collector = originalResponse.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: (i) => i.customId === "antispam-select-config",
			time: 240_000
		});

		const buttonCollector =
			originalResponse.createMessageComponentCollector({
				time: 240_000,
				componentType: ComponentType.Button
			});

		buttonCollector.on(
			"collect",
			async (i: ButtonInteraction<"cached">) => {
				if (i.user.id !== interaction.member?.user.id) {
					await i.reply({
						content: lang.help_not_for_you,
						flags: [1 << 6]
					});
					return;
				}

				if (i.customId === "antispam-manage-save-button") {
					await client.db.set(
						`${interaction.guildId}.GUILD.ANTISPAM`,
						baseData
					);
					invalidateAntiSpamConfig(interaction.guildId!);
					await i.deferUpdate();

					collector.stop();
					buttonCollector.stop();
				} else if (i.customId === "antispam-manage-preset-button") {
					await i.deferUpdate();
					mode = "preset";
					await refresh();

					const response = await i.channel?.awaitMessageComponent({
						componentType: ComponentType.StringSelect,
						filter: (m) => m.customId === "antispam-select-preset",
						time: 120_000
					});

					if (response) {
						await response.deferUpdate();

						const preset = response.values[0];

						switch (preset) {
							case "chill":
								baseData = {
									...AntiSpamPreset.chill,
									BYPASS_CHANNELS: baseData.BYPASS_CHANNELS,
									BYPASS_ROLES: baseData.BYPASS_ROLES
								};
								break;
							case "guard":
								baseData = {
									...AntiSpamPreset.guard,
									BYPASS_CHANNELS: baseData.BYPASS_CHANNELS,
									BYPASS_ROLES: baseData.BYPASS_ROLES
								};
								break;
							case "extreme":
								baseData = {
									...AntiSpamPreset.extreme,
									BYPASS_CHANNELS: baseData.BYPASS_CHANNELS,
									BYPASS_ROLES: baseData.BYPASS_ROLES
								};
								break;
						}

						resetShown(baseData);
						select.setDisabled(false);
						button.setDisabled(false);
						button2.setDisabled(false);
						mode = "main";
						await refresh();
					}
				}
			}
		);

		collector.on(
			"collect",
			async (i: StringSelectMenuInteraction<"cached">) => {
				if (i.user.id !== interaction.member?.user.id) {
					await i.reply({
						content: lang.help_not_for_you,
						flags: [1 << 6]
					});
					return;
				}

				const value = i.values[0];
				const choicesGet = choices.find((x) => x.value === value);

				if (choicesGet?.componentType === "modal") {
					const result = await iHorizonModalResolve(
						{
							customId: "antispam-modal-config",
							title: lang.antispam_manage_modal_title,
							deferUpdate: false,
							fields: [
								{
									customId: value,
									style: TextInputStyle.Short,
									required: true,
									label: choicesGet.label.substring(0, 44),
									placeHolder: choicesGet.description,
									minLength: 1
								}
							]
						},
						i
					);

					if (!result) return;

					const resultModal = result.fields
						.getTextInputValue(value)
						.replace(",", ".");

					if (choicesGet.wantedValueType === "time") {
						const formatedTime =
							client.timeCalculator.to_ms(resultModal);

						if (!formatedTime) {
							await result.reply({
								content:
									lang.too_new_account_invalid_time_on_enable,
								flags: [1 << 6]
							});
							return;
						}

						await result.deferUpdate();

						show(choicesGet.value, `\`${resultModal}\``);
						await refresh();

						(baseData[
							choicesGet.value as AntiSpamOptionKey
						] as number) = formatedTime;
					} else if (choicesGet.wantedValueType === "number") {
						const isNumber = parseInt(resultModal);

						if (Number.isNaN(isNumber)) {
							await result.reply({
								content:
									lang.temporary_voice_limit_button_not_integer.replace(
										"${emoji_No}",
										client.iHorizon_Emojis.No
									),
								flags: [1 << 6]
							});
							return;
						}

						show(choicesGet.value, `\`${resultModal}\``);
						await refresh();
						await result.deferUpdate();

						(baseData[
							choicesGet.value as AntiSpamOptionKey
						] as number) = parseInt(resultModal);
					}
				} else if (
					choicesGet?.componentType === ComponentType.StringSelect &&
					choicesGet.type === "boolean"
				) {
					await i.deferUpdate();

					select.setDisabled(false);
					mode = new StringSelectMenuBuilder()
						.setCustomId("antispam-manage-yes-or-no")
						.setPlaceholder(choicesGet.description)
						.addOptions(
							new StringSelectMenuOptionBuilder()
								.setLabel(lang.var_yes)
								.setValue("antispam-manage-yes"),
							new StringSelectMenuOptionBuilder()
								.setLabel(lang.var_no)
								.setValue("antispam-manage-no")
						);
					await refresh();

					const response = await i.channel?.awaitMessageComponent({
						componentType: ComponentType.StringSelect,
						filter: (m) =>
							m.customId === "antispam-manage-yes-or-no",
						time: 120_000
					});

					if (!response) return;

					await response.deferUpdate();

					if (response.values[0] === "antispam-manage-yes") {
						show(
							choicesGet.value,
							`\`🟢 ${lang.guildprofil_set_blockpub}\``
						);
						mode = "main";
						await refresh();

						(baseData[
							choicesGet.value as AntiSpamOptionKey
						] as boolean) = true;
					} else if (response.values[0] === "antispam-manage-no") {
						show(
							choicesGet.value,
							`\`🔴 ${lang.guildprofil_not_set_blockpub}\``
						);
						mode = "main";
						await refresh();

						(baseData[
							choicesGet.value as AntiSpamOptionKey
						] as boolean) = false;
					}
				} else if (choicesGet?.type === "punish") {
					await i.deferUpdate();

					select.setDisabled(false);
					mode = new StringSelectMenuBuilder()
						.setCustomId("antispam-manage-punish-type")
						.setPlaceholder(choicesGet.description)
						.addOptions(
							new StringSelectMenuOptionBuilder()
								.setLabel(
									lang.setjoinroles_var_perm_ban_members
								)
								.setValue("antispam-manage-ban"),
							new StringSelectMenuOptionBuilder()
								.setLabel(
									lang.setjoinroles_var_perm_kick_members
								)
								.setValue("antispam-manage-kick"),
							new StringSelectMenuOptionBuilder()
								.setLabel(
									lang.antispam_manage_select_menu_punish_mute_label
								)
								.setValue("antispam-manage-mute")
						);
					await refresh();

					const response = await i.channel?.awaitMessageComponent({
						componentType: ComponentType.StringSelect,
						filter: (m) =>
							m.customId === "antispam-manage-punish-type",
						time: 120_000
					});

					if (!response) return;

					await response.deferUpdate();

					const collectedResponse = response.values[0];

					if (collectedResponse.endsWith("kick")) {
						show(choicesGet.value, "`kick`");
					} else if (collectedResponse.endsWith("ban")) {
						show(choicesGet.value, "`ban`");
					} else if (collectedResponse.endsWith("mute")) {
						show(choicesGet.value, "`mute`");
					}
					mode = "main";
					await refresh();
					(baseData[
						choicesGet.value as AntiSpamOptionKey
					] as string) = collectedResponse.split("-")[2]!;
				}
			}
		);

		collector.on("end", async () => {
			select.setDisabled(true);
			button.setDisabled(true);
			button2.setDisabled(true);
			mode = "main";
			await refresh();
		});
	}
};
