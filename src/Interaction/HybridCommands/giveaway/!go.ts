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
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CacheType,
	ChannelSelectMenuBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	Message,
	MessageFlags,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	TextInputStyle
} from "discord.js";

import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";

interface GiveawayPanelState {
	prize: string | null;
	durationMs: number | null;
	winners: number | null;
	requirement: {
		type: "none" | "invites" | "messages" | "roles";
		value: string | null;
	};
	channelId: string;
	imageUrl: string | null;
}

const PANEL_ACCENT = 0x9a5af2;
const COLLECTOR_TIME = 1_250_000 * 2;

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

		const state: GiveawayPanelState = {
			prize: null,
			durationMs: null,
			winners: null,
			requirement: { type: "none", value: null },
			channelId: interaction.channel.id,
			imageUrl: null
		};

		if (!(interaction instanceof ChatInputCommandInteraction)) {
			const winnersArg = client.func.method.number(args!, 0);
			const durationArg = client.func.method.string(args!, 1);
			const requirementArg = client.func.method.string(args!, 2) as
				"none" | "invites" | "messages" | "roles" | null;
			const prizeArg = client.func.method.string(args!, 3);
			const requirementValueArg = client.func.method.string(args!, 4);

			if (winnersArg > 0) state.winners = winnersArg;
			if (durationArg)
				state.durationMs = client.timeCalculator.to_ms(durationArg);
			if (
				["none", "invites", "messages", "roles"].includes(
					requirementArg || ""
				)
			) {
				state.requirement.type = requirementArg!;
				state.requirement.value = requirementValueArg;
			}
			if (prizeArg) state.prize = prizeArg;
		}

		function requirementToString(): string {
			if (state.requirement.type === "none") return lang.gw_go_req_none;

			const typeLabel =
				state.requirement.type === "invites"
					? lang.gw_go_req_invites
					: state.requirement.type === "messages"
						? lang.gw_go_req_messages
						: lang.gw_go_req_roles;

			return `${typeLabel} - ${lang.gw_go_req_value_dsc.replace(
				"${value}",
				String(state.requirement.value || lang.var_no_set)
			)}`;
		}

		function buildContainer(): ContainerBuilder {
			const container = new ContainerBuilder().setAccentColor(
				PANEL_ACCENT
			);

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`## ${client.iHorizon_Emojis.Rainbow_Tada} ${lang.gw_go_panel_title}\n${lang.gw_go_panel_desc}`
				)
			);

			container.addSeparatorComponents(new SeparatorBuilder());

			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						`**${client.iHorizon_Emojis.Coin} ${lang.gw_go_opt_prize} :** ${state.prize || lang.var_no_set}`,
						`**${client.iHorizon_Emojis.Timer} ${lang.gw_go_opt_duration} :** ${state.durationMs ? client.timeCalculator.to_beautiful_string(state.durationMs, lang) : lang.var_no_set}`,
						`**${client.iHorizon_Emojis.Sunglass} ${lang.gw_go_opt_winners} :** ${state.winners || lang.var_no_set}`,
						`**${client.iHorizon_Emojis.Security} ${lang.gw_go_opt_requirement} :** ${requirementToString()}`,
						`**${client.iHorizon_Emojis.Pointer} ${lang.gw_go_channel_placeholder} :** <#${state.channelId}>`,
						`**${client.iHorizon_Emojis.Camera} ${lang.gw_go_opt_image} :** ${state.imageUrl || lang.var_no_set}`
					].join("\n")
				)
			);

			if (state.imageUrl) {
				container.addMediaGalleryComponents(
					new MediaGalleryBuilder().addItems(
						new MediaGalleryItemBuilder().setURL(state.imageUrl)
					)
				);
			}

			container.addSeparatorComponents(new SeparatorBuilder());

			container.addActionRowComponents(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					buildEditSelect()
				)
			);
			container.addActionRowComponents(
				new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
					buildChannelSelect()
				)
			);
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					buildButtons()
				)
			);

			return container;
		}

		function buildEditSelect() {
			return new StringSelectMenuBuilder()
				.setCustomId("gw_go_edit_select")
				.setPlaceholder(lang.gw_go_select_placeholder)
				.addOptions([
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.gw_go_opt_prize)
						.setValue("prize")
						.setEmoji(client.iHorizon_Emojis.Coin),
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.gw_go_opt_duration)
						.setValue("duration")
						.setEmoji(client.iHorizon_Emojis.Timer),
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.gw_go_opt_winners)
						.setValue("winners")
						.setEmoji(client.iHorizon_Emojis.Sunglass),
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.gw_go_opt_requirement)
						.setValue("requirement")
						.setEmoji(client.iHorizon_Emojis.Security),
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.gw_go_opt_image)
						.setValue("image")
						.setEmoji(client.iHorizon_Emojis.Camera)
				]);
		}

		function buildChannelSelect() {
			return new ChannelSelectMenuBuilder()
				.setCustomId("gw_go_channel_select")
				.setChannelTypes(ChannelType.GuildText)
				.setDefaultChannels([state.channelId])
				.setPlaceholder(lang.gw_go_channel_placeholder);
		}

		function buildButtons() {
			return [
				new ButtonBuilder()
					.setCustomId("gw_go_launch")
					.setLabel(lang.gw_go_launch_buttontitle)
					.setStyle(ButtonStyle.Primary)
					.setEmoji(client.iHorizon_Emojis.Yes),
				new ButtonBuilder()
					.setCustomId("gw_go_cancel")
					.setLabel(lang.gw_go_cancel_buttontitle)
					.setStyle(ButtonStyle.Danger)
					.setEmoji(client.iHorizon_Emojis.No)
			];
		}

		function buildPromptContainer(text: string): ContainerBuilder {
			return new ContainerBuilder()
				.setAccentColor(PANEL_ACCENT)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(text)
				);
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

		async function askPrize(
			panelMessage: Message,
			selectInteraction: StringSelectMenuInteraction<CacheType>
		) {
			const modal = await iHorizonModalResolve(
				{
					customId: "gw_go_modal_prize",
					title: lang.gw_go_modal_prize,
					deferUpdate: false,
					fields: [
						{
							customId: "prize",
							label: lang.gw_go_modal_prize_label,
							style: TextInputStyle.Paragraph,
							required: true,
							maxLength: 256
						}
					]
				},
				selectInteraction
			);

			if (!modal) return;

			state.prize = modal.fields.getTextInputValue("prize");

			await modal.deferUpdate();
			await refreshPanelMessage(panelMessage);
		}

		async function askDuration(
			panelMessage: Message,
			selectInteraction: StringSelectMenuInteraction<CacheType>
		) {
			const modal = await iHorizonModalResolve(
				{
					customId: "gw_go_modal_duration",
					title: lang.gw_go_modal_duration,
					deferUpdate: false,
					fields: [
						{
							customId: "duration",
							label: lang.gw_go_modal_duration_label,
							style: TextInputStyle.Short,
							required: true,
							maxLength: 32
						}
					]
				},
				selectInteraction
			);

			if (!modal) return;

			const durationMs = client.timeCalculator.to_ms(
				modal.fields.getTextInputValue("duration")
			);

			await modal.deferUpdate();

			if (!durationMs) {
				return await modal.followUp({
					content: lang.start_time_not_valid.replace(
						"${interaction.user}",
						selectInteraction.user.toString()
					),
					flags: [1 << 6]
				});
			}

			if (durationMs < 3 * 60_000) {
				return await modal.followUp({
					content: lang.gw_go_duration_too_low.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					),
					flags: [1 << 6]
				});
			}

			state.durationMs = durationMs;
			await refreshPanelMessage(panelMessage);
		}

		async function askWinners(
			panelMessage: Message,
			selectInteraction: StringSelectMenuInteraction<CacheType>
		) {
			const modal = await iHorizonModalResolve(
				{
					customId: "gw_go_modal_winners",
					title: lang.gw_go_modal_winners,
					deferUpdate: false,
					fields: [
						{
							customId: "winners",
							label: lang.gw_go_modal_winners_label,
							style: TextInputStyle.Short,
							required: true,
							minLength: 1,
							maxLength: 8
						}
					]
				},
				selectInteraction
			);

			if (!modal) return;

			const winnersInput = modal.fields.getTextInputValue("winners");

			await modal.deferUpdate();

			if (
				!client.func.method.isNumber(winnersInput) ||
				parseInt(winnersInput) <= 0
			) {
				return await modal.followUp({
					content: lang.start_is_not_valid,
					flags: [1 << 6]
				});
			}

			state.winners = parseInt(winnersInput);
			await refreshPanelMessage(panelMessage);
		}

		async function askRequirement(
			panelMessage: Message,
			selectInteraction: StringSelectMenuInteraction<CacheType>
		) {
			const modal = await iHorizonModalResolve(
				{
					customId: "gw_go_modal_requirement",
					title: lang.gw_go_modal_req_title,
					deferUpdate: false,
					fields: [
						{
							type: "radio_group",
							customId: "req_type",
							label: lang.gw_go_modal_req_type_label,
							options: [
								{
									label: lang.gw_go_req_none,
									value: "none",
									default: state.requirement.type === "none"
								},
								{
									label: lang.gw_go_req_invites,
									value: "invites",
									default:
										state.requirement.type === "invites"
								},
								{
									label: lang.gw_go_req_messages,
									value: "messages",
									default:
										state.requirement.type === "messages"
								},
								{
									label: lang.gw_go_req_roles,
									value: "roles",
									default: state.requirement.type === "roles"
								}
							]
						},
						{
							customId: "req_value",
							label: lang.gw_go_modal_req_value_label,
							style: TextInputStyle.Short,
							required: false,
							minLength: 1,
							maxLength: 64
						}
					]
				},
				selectInteraction
			);

			if (!modal) return;

			const requirementType = modal.fields.getRadioGroup("req_type") as
				"none" | "invites" | "messages" | "roles";
			const requirementValue =
				modal.fields.getTextInputValue("req_value");

			await modal.deferUpdate();

			state.requirement = {
				type: requirementType,
				value:
					requirementType === "none" ? null : requirementValue || null
			};

			await refreshPanelMessage(panelMessage);
		}

		async function askImage(
			panelMessage: Message,
			selectInteraction: StringSelectMenuInteraction<CacheType>
		) {
			const modal = await iHorizonModalResolve(
				{
					customId: "gw_go_modal_image",
					title: lang.gw_go_modal_image,
					deferUpdate: false,
					fields: [
						{
							customId: "image",
							label: lang.gw_go_modal_image_label,
							style: TextInputStyle.Short,
							required: false,
							minLength: 1,
							maxLength: 300
						}
					]
				},
				selectInteraction
			);

			if (!modal) return;

			const imageUrl = modal.fields.getTextInputValue("image").trim();

			await modal.deferUpdate();

			if (!imageUrl) {
				state.imageUrl = null;
				return await refreshPanelMessage(panelMessage);
			}

			if (!(await client.func.mediaManipulation.isImageUrl(imageUrl))) {
				return await modal.followUp({
					content: lang.gw_go_invalid_image.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					),
					flags: [1 << 6]
				});
			}

			state.imageUrl = imageUrl;
			await refreshPanelMessage(panelMessage);
		}

		function validateState(): string | null {
			if (!state.prize) {
				return lang.gw_go_need_prize.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				);
			}

			if (!state.durationMs) {
				return lang.gw_go_need_duration.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				);
			}

			if (state.durationMs < 3 * 60_000) {
				return lang.gw_go_duration_too_low.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				);
			}

			if (!state.winners || state.winners <= 0) {
				return lang.gw_go_need_winners.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				);
			}

			if (state.requirement.type !== "none") {
				const value = state.requirement.value || "";

				if (
					["invites", "messages"].includes(state.requirement.type) &&
					!client.func.method.isNumber(value)
				) {
					const errorKey =
						state.requirement.type === "invites"
							? lang.start_invalid_invites_req_value
							: lang.start_invalid_messages_req_value;

					return errorKey.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					);
				}

				if (
					state.requirement.type === "roles" &&
					!interaction.guild!.roles.cache.has(value)
				) {
					return lang.start_invalid_roles_req_value.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					);
				}
			}

			return null;
		}

		async function launch(panelMessage: Message) {
			const error = validateState();

			if (error) {
				return await prompt(panelMessage, error);
			}

			const targetChannel = interaction.guild!.channels.cache.get(
				state.channelId
			) as BaseGuildTextChannel | undefined;

			const channelError = lang.gw_go_channel_error.replace(
				"${client.iHorizon_Emojis.No}",
				client.iHorizon_Emojis.No
			);

			if (!targetChannel?.isSendable()) {
				return await prompt(panelMessage, channelError);
			}

			try {
				await client.giveawaysManager.create(targetChannel, {
					duration: state.durationMs!,
					prize: (state.prize || "")?.substring(0, 256),
					winnerCount: state.winners!,
					hostedBy: interaction.member!.user.id,
					embedImageURL: state.imageUrl,
					requirement: {
						type: state.requirement.type,
						value: state.requirement.value
					}
				});
			} catch {
				return await prompt(panelMessage, channelError);
			}

			await client.func.ihorizon_logs(interaction, {
				title: lang.start_logs_embed_title,
				description: lang.start_logs_embed_description
					.replace(
						"${interaction.user.id}",
						interaction.member!.user.id
					)
					.replace(/\${giveawayChannel}/g, targetChannel.toString()!)
			});

			await prompt(
				panelMessage,
				`### ${client.iHorizon_Emojis.Rainbow_Tada} ${lang.gw_go_started.replace(
					"${channel}",
					targetChannel.toString()!
				)}`
			);
		}

		const panelMessage = await client.func.method.interactionSend(
			interaction,
			{
				components: [buildContainer()],
				flags: [MessageFlags.IsComponentsV2]
			}
		);

		const selectCollector = panelMessage.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: COLLECTOR_TIME
		});

		const channelCollector = panelMessage.createMessageComponentCollector({
			componentType: ComponentType.ChannelSelect,
			time: COLLECTOR_TIME
		});

		const buttonCollector = panelMessage.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: COLLECTOR_TIME
		});

		selectCollector.on(
			"collect",
			async (i: StringSelectMenuInteraction) => {
				if (i.user.id !== (interaction.member!.user.id as string)) {
					return i.reply({
						flags: [1 << 6],
						content: lang.help_not_for_you
					});
				}

				switch (i.values[0]) {
					case "prize":
						await askPrize(panelMessage, i);
						break;
					case "duration":
						await askDuration(panelMessage, i);
						break;
					case "winners":
						await askWinners(panelMessage, i);
						break;
					case "requirement":
						await askRequirement(panelMessage, i);
						break;
					case "image":
						await askImage(panelMessage, i);
						break;
				}
			}
		);

		channelCollector.on("collect", async (i) => {
			if (i.user.id !== interaction.member!.user.id) {
				return i.reply({
					flags: [1 << 6],
					content: lang.help_not_for_you
				});
			}

			await i.deferUpdate();

			state.channelId = i.values[0];

			await refreshPanelMessage(panelMessage);
		});

		buttonCollector.on("collect", async (i: ButtonInteraction) => {
			if (i.user.id !== interaction.member!.user.id) {
				return i.reply({
					flags: [1 << 6],
					content: lang.help_not_for_you
				});
			}

			await i.deferUpdate();

			if (i.customId === "gw_go_launch") {
				await launch(panelMessage);
			} else {
				await prompt(
					panelMessage,
					`### ${client.iHorizon_Emojis.Pause} ${lang.gw_go_cancelled}`
				);
			}

			selectCollector.stop("legitEnd");
			channelCollector.stop("legitEnd");
			buttonCollector.stop("legitEnd");
		});

		selectCollector.on("end", async (_, reason) => {
			if (reason !== "legitEnd") {
				await prompt(
					panelMessage,
					`### ${client.iHorizon_Emojis.Pause} ${lang.gw_go_expired}`
				);
			}
		});
	}
};
