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
	ChannelSelectMenuBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	ContainerBuilder,
	Message,
	MessageFlags,
	RoleSelectMenuBuilder,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	TextInputStyle
} from "discord.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
import { LanguageData } from "../../../../types/languageData.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";

const PANEL_ACCENT = 0xed8bbe;
const PANEL_COLLECTOR_TIME = 1_250_000 * 2;

type TempVoiceState = {
	voice_channel: string | null;
	voice_channel_category: string | null;
	voice_channel_position: "top" | "bottom" | null;
	voice_channel_name: string | null;
	staff_role: string[];
};

export async function tempvoiceConfigPanel(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached">,
	lang: LanguageData
) {
	// Guard's Typing
	if (
		!interaction.member ||
		!client.user ||
		!interaction.guild ||
		!interaction.channel
	)
		return;

	const baseData = (await client.db.get(
		`${interaction.guildId}.VOICE_INTERFACE`
	)) as DatabaseStructure.VoiceData | null | undefined;

	const state: TempVoiceState = {
		voice_channel: baseData?.voice_channel ?? null,
		voice_channel_category: baseData?.voice_channel_category ?? null,
		voice_channel_position: baseData?.voice_channel_position ?? null,
		voice_channel_name: baseData?.voice_channel_name ?? null,
		staff_role: Array.isArray(baseData?.staff_role)
			? baseData.staff_role
			: []
	};

	const ownerId = interaction.member.user.id as string;

	function settingsLabels(): string {
		return [
			`**${client.iHorizon_Emojis.VC_Limit} ${lang.tempvoice_cfg_hub} :** ${state.voice_channel ? `<#${state.voice_channel}>` : lang.var_no_set}`,
			`**${client.iHorizon_Emojis.VC_Region} ${lang.tempvoice_cfg_category} :** ${state.voice_channel_category ? `<#${state.voice_channel_category}>` : lang.var_no_set}`,
			`**${client.iHorizon_Emojis.VC_Name} ${lang.tempvoice_cfg_name} :** ${state.voice_channel_name || lang.var_no_set}`,
			`**${client.iHorizon_Emojis.VC_Transfer} ${lang.tempvoice_cfg_position} :** ${state.voice_channel_position === "top" ? lang.tempvoice_cfg_position_top : state.voice_channel_position === "bottom" ? lang.tempvoice_cfg_position_bottom : lang.var_no_set}`,
			`**${client.iHorizon_Emojis.VC_Trust} ${lang.tempvoice_cfg_staff} :** ${state.staff_role.length > 0 ? state.staff_role.map((x) => `<@&${x}>`).join(" ") : lang.var_no_set}`
		].join("\n");
	}

	function buildContainer(): ContainerBuilder {
		const container = new ContainerBuilder().setAccentColor(PANEL_ACCENT);

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`## ${client.iHorizon_Emojis.Rainbow_Tada} ${lang.tempvoice_cfg_panel_title}\n${lang.tempvoice_cfg_panel_desc}`
			)
		);

		container.addSeparatorComponents(new SeparatorBuilder());

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(settingsLabels())
		);

		container.addSeparatorComponents(new SeparatorBuilder());

		container.addActionRowComponents(
			new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
				buildHubSelect()
			)
		);
		container.addActionRowComponents(
			new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
				buildCategorySelect()
			)
		);
		container.addActionRowComponents(
			new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
				buildStaffSelect()
			)
		);
		container.addActionRowComponents(
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				buildOptionsSelect()
			)
		);
		container.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(buildButtons())
		);

		return container;
	}

	function buildPromptContainer(text: string): ContainerBuilder {
		return new ContainerBuilder()
			.setAccentColor(PANEL_ACCENT)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(text)
			);
	}

	function buildHubSelect() {
		const select = new ChannelSelectMenuBuilder()
			.setCustomId("tempvoice_cfg_hub_select")
			.setChannelTypes(ChannelType.GuildVoice)
			.setPlaceholder(lang.tempvoice_cfg_hub);

		if (state.voice_channel)
			select.setDefaultChannels([state.voice_channel]);
		return select;
	}

	function buildCategorySelect() {
		const select = new ChannelSelectMenuBuilder()
			.setCustomId("tempvoice_cfg_category_select")
			.setChannelTypes(ChannelType.GuildCategory)
			.setPlaceholder(lang.tempvoice_cfg_category);

		if (state.voice_channel_category)
			select.setDefaultChannels([state.voice_channel_category]);
		return select;
	}

	function buildStaffSelect() {
		const select = new RoleSelectMenuBuilder()
			.setCustomId("tempvoice_cfg_staff_select")
			.setPlaceholder(lang.tempvoice_cfg_staff)
			.setMinValues(0)
			.setMaxValues(5);

		if (state.staff_role.length > 0)
			select.setDefaultRoles(state.staff_role);
		return select;
	}

	function buildOptionsSelect() {
		return new StringSelectMenuBuilder()
			.setCustomId("tempvoice_cfg_options_select")
			.setPlaceholder(lang.tempvoice_cfg_select_placeholder)
			.addOptions([
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.tempvoice_cfg_opt_name)
					.setValue("name")
					.setEmoji(client.iHorizon_Emojis.VC_Name),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.tempvoice_cfg_opt_position_top)
					.setValue("position_top")
					.setEmoji(client.iHorizon_Emojis.VC_Transfer),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.tempvoice_cfg_opt_position_bottom)
					.setValue("position_bottom")
					.setEmoji(client.iHorizon_Emojis.VC_Transfer)
			]);
	}

	function buildButtons() {
		return [
			new ButtonBuilder()
				.setCustomId("tempvoice_cfg_done")
				.setLabel(lang.tempvoice_cfg_done)
				.setStyle(ButtonStyle.Primary)
				.setEmoji(client.iHorizon_Emojis.Yes)
		];
	}

	async function refreshPanelMessage(panelMessage: Message) {
		await panelMessage.edit({
			components: [buildContainer()],
			files: [],
			flags: [MessageFlags.IsComponentsV2]
		});
	}

	async function prompt(panelMessage: Message, text: string) {
		await panelMessage.edit({
			components: [buildPromptContainer(text)],
			files: [],
			flags: [MessageFlags.IsComponentsV2]
		});
	}

	const panelMessage = await client.func.method.interactionSend(interaction, {
		components: [buildContainer()],
		flags: [MessageFlags.IsComponentsV2]
	});

	const selectCollector = panelMessage.createMessageComponentCollector({
		componentType: ComponentType.StringSelect,
		time: PANEL_COLLECTOR_TIME
	});

	const channelCollector = panelMessage.createMessageComponentCollector({
		componentType: ComponentType.ChannelSelect,
		time: PANEL_COLLECTOR_TIME
	});

	const roleCollector = panelMessage.createMessageComponentCollector({
		componentType: ComponentType.RoleSelect,
		time: PANEL_COLLECTOR_TIME
	});

	const buttonCollector = panelMessage.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: PANEL_COLLECTOR_TIME
	});

	channelCollector.on("collect", async (i) => {
		if (i.user.id !== interaction.member.user.id) {
			return await i.reply({
				flags: [1 << 6],
				content: lang.help_not_for_you
			});
		}

		await i.deferUpdate();

		if (i.customId === "tempvoice_cfg_hub_select") {
			state.voice_channel = i.values[0];
			await client.db.set(
				`${interaction.guildId}.VOICE_INTERFACE.voice_channel`,
				i.values[0]
			);
		} else {
			state.voice_channel_category = i.values[0];
			await client.db.set(
				`${interaction.guildId}.VOICE_INTERFACE.voice_channel_category`,
				i.values[0]
			);
		}

		await refreshPanelMessage(panelMessage);
	});

	roleCollector.on("collect", async (i) => {
		if (i.user.id !== interaction.member.user.id) {
			return await i.reply({
				flags: [1 << 6],
				content: lang.help_not_for_you
			});
		}

		await i.deferUpdate();

		state.staff_role = i.values as string[];
		await client.db.set(
			`${interaction.guildId}.VOICE_INTERFACE.staff_role`,
			state.staff_role
		);

		await refreshPanelMessage(panelMessage);
	});

	selectCollector.on("collect", async (i: StringSelectMenuInteraction) => {
		if (i.user.id !== interaction.member.user.id) {
			return await i.reply({
				flags: [1 << 6],
				content: lang.help_not_for_you
			});
		}

		switch (i.values[0]) {
			case "name":
				await askName(i);
				break;
			case "position_top":
				await setBottomOrTop(i, "top");
				break;
			case "position_bottom":
				await setBottomOrTop(i, "bottom");
				break;
		}
	});

	async function setBottomOrTop(
		i: StringSelectMenuInteraction,
		position: "top" | "bottom"
	) {
		await i.deferUpdate();

		state.voice_channel_position = position;
		await client.db.set(
			`${interaction.guildId}.VOICE_INTERFACE.voice_channel_position`,
			position
		);

		await refreshPanelMessage(panelMessage);
	}

	async function askName(i: StringSelectMenuInteraction) {
		const modal = await iHorizonModalResolve(
			{
				customId: "tempvoice_cfg_name_modal",
				title: lang.tempvoice_cfg_modal_title,
				deferUpdate: false,
				fields: [
					{
						customId: "name",
						label: lang.tempvoice_cfg_modal_label,
						style: TextInputStyle.Short,
						required: true,
						maxLength: 100,
						minLength: 1
					}
				]
			},
			i
		);

		if (!modal) return;

		await modal.deferUpdate();

		state.voice_channel_name = modal.fields.getTextInputValue("name");
		await client.db.set(
			`${interaction.guildId}.VOICE_INTERFACE.voice_channel_name`,
			state.voice_channel_name
		);

		await refreshPanelMessage(panelMessage);
	}

	buttonCollector.on("collect", async (i) => {
		if (i.user.id !== interaction.member.user.id) {
			return await i.reply({
				flags: [1 << 6],
				content: lang.help_not_for_you
			});
		}

		await i.deferUpdate();

		await prompt(
			panelMessage,
			`### ${client.iHorizon_Emojis.Yes} ${lang.tempvoice_cfg_saved}`
		);

		selectCollector.stop("legitEnd");
		channelCollector.stop("legitEnd");
		roleCollector.stop("legitEnd");
		buttonCollector.stop("legitEnd");
	});

	selectCollector.on("end", async (_, reason) => {
		if (reason !== "legitEnd") {
			await prompt(
				panelMessage,
				`### ${client.iHorizon_Emojis.Pause} ${lang.tempvoice_cfg_expired}`
			);
		}
	});

	return;
}
