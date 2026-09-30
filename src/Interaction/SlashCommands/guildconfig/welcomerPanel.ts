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
	AttachmentBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	GuildMember,
	Interaction,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	Message,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextChannel,
	TextDisplayBuilder,
	TextInputStyle
} from "discord.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { generateJoinImage } from "../../../Events/guildconfig/joinMessage.js";
import logger from "../../../core/logger.js";

const COLLECTOR_TIMEOUT = 800_000;
const BANNER_ATTACHMENT_NAME = "image.png";
const PANEL_ACCENT_COLOR = 0xffb3cc;

const DEFAULT_IMAGE_CONFIG = {
	backgroundURL:
		"https://img.freepik.com/vecteurs-libre/fond-courbe-bleue_53876-113112.jpg",
	profilePictureRound: "status" as const,
	textColour: "#000000",
	textSize: "40px",
	avatarSize: "140px"
};

type WelcomerSection = "join" | "leave" | "channels" | "banner";

type BannerPropAction =
	| "change_background"
	| "change_frame"
	| "change_text_colour"
	| "change_text_message"
	| "change_text_size"
	| "change_avatar_size";

type ContextualPicker =
	{ kind: "frame" } | { kind: "size"; target: "text" | "avatar" } | null;

interface WelcomerPanelState {
	section: WelcomerSection;
	joinMessage: string | null;
	leaveMessage: string | null;
	joinChannel: string | null;
	leaveChannel: string | null;
	banner: DatabaseStructure.JoinBannerOptions;
	bannerState: string;
	picker: ContextualPicker;
}

const isValidColor = (color: string): boolean =>
	/^#([0-9a-f]{3}){1,2}$/i.test(color);

function codeBlock(value: string | null, emptyLabel: string): string {
	return value ? `\`\`\`${value}\`\`\`` : emptyLabel;
}

function buildSectionSelectRow(lang: LanguageData, current: WelcomerSection) {
	const option = (label: string, value: WelcomerSection) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(label)
			.setValue(value)
			.setDefault(value === current);

	const select = new StringSelectMenuBuilder()
		.setCustomId("welcomer-section")
		.setPlaceholder(lang.welcomer_section_placeholder)
		.addOptions(
			option(lang.guildprofil_embed_fields_joinmessage, "join"),
			option(lang.guildprofil_embed_fields_leavemessage, "leave"),
			option(lang.welcomer_section_channels, "channels"),
			option(lang.setjoinmessage_var_image_card, "banner")
		);

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		select
	);
}

function buildMessageBlock(
	title: string,
	custom: string | null,
	fallback: string,
	lang: LanguageData
): TextDisplayBuilder {
	return new TextDisplayBuilder().setContent(
		[
			`### ${title}`,
			`**${lang.setjoinmessage_help_embed_fields_custom_name}**`,
			codeBlock(
				custom,
				lang.setjoinmessage_help_embed_fields_custom_name_empy
			),
			`**${lang.setjoinmessage_help_embed_fields_default_name_empy}**`,
			codeBlock(
				fallback,
				lang.setjoinmessage_help_embed_fields_custom_name_empy
			)
		].join("\n")
	);
}

function buildChannelsBlock(
	state: WelcomerPanelState,
	client: Client,
	lang: LanguageData
): TextDisplayBuilder {
	const joinValue = state.joinChannel
		? `<#${state.joinChannel}>`
		: client.iHorizon_Emojis.No;
	const leaveValue = state.leaveChannel
		? `<#${state.leaveChannel}>`
		: client.iHorizon_Emojis.No;

	return new TextDisplayBuilder().setContent(
		[
			`### ${lang.welcomer_section_channels}`,
			`**${lang.setchannels_embed_fields_value_join}**`,
			joinValue,
			`**${lang.setchannels_embed_fields_value_leave}**`,
			leaveValue
		].join("\n")
	);
}

function buildBannerStatusLine(
	state: WelcomerPanelState,
	client: Client,
	lang: LanguageData
): TextDisplayBuilder {
	const enabled = state.bannerState !== "off";
	const status = enabled
		? `${client.iHorizon_Emojis.GreenTick} ${lang.var_enabled}`
		: `${client.iHorizon_Emojis.No} ${lang.var_disabled}`;

	return new TextDisplayBuilder().setContent(
		`### ${lang.setjoinmessage_var_image_card}\n${status}`
	);
}

function buildPropSelectRow(lang: LanguageData) {
	const select = new StringSelectMenuBuilder()
		.setCustomId("welcomer-banner-prop")
		.setPlaceholder(lang.setjoinmessage_change_image_button_title)
		.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(
					lang.setjoinmessage_change_image_propreties_background
				)
				.setValue("change_background"),
			new StringSelectMenuOptionBuilder()
				.setLabel(
					lang.setjoinmessage_change_image_propreties_frame_color
				)
				.setValue("change_frame"),
			new StringSelectMenuOptionBuilder()
				.setLabel(
					lang.setjoinmessage_change_image_propreties_text_colour
				)
				.setValue("change_text_colour"),
			new StringSelectMenuOptionBuilder()
				.setLabel(
					lang.setjoinmessage_change_image_propreties_text_message
				)
				.setValue("change_text_message"),
			new StringSelectMenuOptionBuilder()
				.setLabel(lang.setjoinmessage_change_image_propreties_text_size)
				.setValue("change_text_size"),
			new StringSelectMenuOptionBuilder()
				.setLabel(
					lang.setjoinmessage_change_image_propreties_avatar_size
				)
				.setValue("change_avatar_size")
		);

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		select
	);
}

function buildFramePickerRow(lang: LanguageData) {
	const select = new StringSelectMenuBuilder()
		.setCustomId("welcomer-frame-pick")
		.setPlaceholder(lang.setjoinmessage_change_image_propreties_frame_color)
		.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(
					lang.setjoinmessage_change_image_menu_frame_color_profil
				)
				.setValue("hexProfileColor"),
			new StringSelectMenuOptionBuilder()
				.setLabel(
					lang.setjoinmessage_change_image_menu_frame_status_profil
				)
				.setValue("status")
		);

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		select
	);
}

function buildSizePickerRow(lang: LanguageData, target: "text" | "avatar") {
	const options =
		target === "text"
			? [
					{
						label: `${lang.setjoinmessage_var_text_size}0.5`,
						value: "20px"
					},
					{
						label: `${lang.setjoinmessage_var_text_size}1`,
						value: "40px"
					},
					{
						label: `${lang.setjoinmessage_var_text_size}1.5`,
						value: "60px"
					},
					{
						label: `${lang.setjoinmessage_var_text_size}2`,
						value: "80px"
					},
					{
						label: `${lang.setjoinmessage_var_text_size}3`,
						value: "120px"
					},
					{
						label: `${lang.setjoinmessage_var_text_size}4`,
						value: "160px"
					}
				]
			: [
					{
						label: `${lang.setjoinmessage_var_avatar_size}0.5`,
						value: "70px"
					},
					{
						label: `${lang.setjoinmessage_var_avatar_size}1`,
						value: "140px"
					},
					{
						label: `${lang.setjoinmessage_var_avatar_size}1.5`,
						value: "210px"
					},
					{
						label: `${lang.setjoinmessage_var_avatar_size}2`,
						value: "280px"
					},
					{
						label: `${lang.setjoinmessage_var_avatar_size}3`,
						value: "430px"
					}
				];

	const select = new StringSelectMenuBuilder()
		.setCustomId("welcomer-size-pick")
		.setPlaceholder(
			target === "text"
				? lang.setjoinmessage_change_image_propreties_text_size
				: lang.setjoinmessage_change_image_propreties_avatar_size
		)
		.addOptions(
			options.map((opt) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(opt.label)
					.setValue(opt.value)
			)
		);

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		select
	);
}

function sectionTitle(lang: LanguageData, section: WelcomerSection): string {
	switch (section) {
		case "leave":
			return lang.guildprofil_embed_fields_leavemessage;
		case "channels":
			return lang.welcomer_section_channels;
		case "banner":
			return lang.setjoinmessage_var_image_card;
		case "join":
		default:
			return lang.guildprofil_embed_fields_joinmessage;
	}
}

function buildChannelSelectRow(
	customId: "welcomer-channel-join" | "welcomer-channel-leave",
	placeholder: string
) {
	const select = new ChannelSelectMenuBuilder()
		.setCustomId(customId)
		.setPlaceholder(placeholder)
		.setChannelTypes(ChannelType.GuildText)
		.setMinValues(1)
		.setMaxValues(1);

	return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
		select
	);
}

export async function openWelcomerPanel(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData
): Promise<void> {
	const guildId = interaction.guildId!;
	const authorId = interaction.member?.user.id!;

	const [
		storedJoin,
		storedLeave,
		storedJoinChannel,
		storedLeaveChannel,
		storedBanner,
		storedBannerState
	] = await Promise.all([
		client.db.get(`${guildId}.GUILD.GUILD_CONFIG.joinmessage`),
		client.db.get(`${guildId}.GUILD.GUILD_CONFIG.leavemessage`),
		client.db.get(`${guildId}.GUILD.GUILD_CONFIG.join`),
		client.db.get(`${guildId}.GUILD.GUILD_CONFIG.leave`),
		client.db.get(`${guildId}.GUILD.GUILD_CONFIG.joinbanner`),
		client.db.get(`${guildId}.GUILD.GUILD_CONFIG.joinbannerStates`)
	]);

	const bannerConfig: DatabaseStructure.JoinBannerOptions = {
		backgroundURL:
			(storedBanner as DatabaseStructure.JoinBannerOptions | undefined)
				?.backgroundURL || DEFAULT_IMAGE_CONFIG.backgroundURL,
		profilePictureRound:
			(storedBanner as DatabaseStructure.JoinBannerOptions | undefined)
				?.profilePictureRound ||
			DEFAULT_IMAGE_CONFIG.profilePictureRound,
		textColour:
			(storedBanner as DatabaseStructure.JoinBannerOptions | undefined)
				?.textColour || DEFAULT_IMAGE_CONFIG.textColour,
		message:
			(storedBanner as DatabaseStructure.JoinBannerOptions | undefined)
				?.message || lang.setjoinmessage_image_default_text,
		textSize:
			(storedBanner as DatabaseStructure.JoinBannerOptions | undefined)
				?.textSize || DEFAULT_IMAGE_CONFIG.textSize,
		avatarSize:
			(storedBanner as DatabaseStructure.JoinBannerOptions | undefined)
				?.avatarSize || DEFAULT_IMAGE_CONFIG.avatarSize
	};

	const state: WelcomerPanelState = {
		section: "join",
		joinMessage:
			(storedJoin as string | undefined)?.substring(0, 1010) ?? null,
		leaveMessage:
			(storedLeave as string | undefined)?.substring(0, 1010) ?? null,
		joinChannel: (storedJoinChannel as string | undefined) ?? null,
		leaveChannel: (storedLeaveChannel as string | undefined) ?? null,
		banner: bannerConfig,
		bannerState: (storedBannerState as string | undefined) || "on",
		picker: null
	};

	await client.db.set(
		`${guildId}.GUILD.GUILD_CONFIG.joinbanner`,
		bannerConfig
	);

	const messageButtons = (
		kind: "join" | "leave",
		disabled: boolean
	): ActionRowBuilder<ButtonBuilder> =>
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`welcomer-${kind}-set`)
				.setLabel(lang.setjoinmessage_button_set_name)
				.setStyle(ButtonStyle.Primary)
				.setDisabled(disabled),
			new ButtonBuilder()
				.setCustomId(`welcomer-${kind}-reset`)
				.setLabel(lang.setjoinmessage_buttom_del_name)
				.setStyle(ButtonStyle.Danger)
				.setDisabled(disabled)
		);

	async function render(
		message: Message<true>,
		disabled: boolean = false
	): Promise<void> {
		const files: AttachmentBuilder[] = [];
		const container = new ContainerBuilder().setAccentColor(
			PANEL_ACCENT_COLOR
		);

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`## ${lang.welcomer_panel_title} — ${sectionTitle(lang, state.section)}`
			)
		);

		if (!disabled) {
			container.addActionRowComponents(
				buildSectionSelectRow(lang, state.section)
			);
		}

		if (state.section === "join" || state.section === "leave") {
			const isJoin = state.section === "join";

			container.addTextDisplayComponents(
				buildMessageBlock(
					isJoin
						? lang.guildprofil_embed_fields_joinmessage
						: lang.guildprofil_embed_fields_leavemessage,
					isJoin ? state.joinMessage : state.leaveMessage,
					isJoin
						? lang.event_welcomer_inviter
						: lang.event_goodbye_inviter,
					lang
				),
				new TextDisplayBuilder().setContent(
					lang.setjoinmessage_help_embed_desc
				)
			);

			container.addActionRowComponents(
				messageButtons(state.section, disabled)
			);
		}

		if (state.section === "channels") {
			container.addTextDisplayComponents(
				buildChannelsBlock(state, client, lang)
			);

			if (!disabled) {
				container.addActionRowComponents(
					buildChannelSelectRow(
						"welcomer-channel-join",
						lang.setchannels_button_join
					),
					buildChannelSelectRow(
						"welcomer-channel-leave",
						lang.setchannels_button_leave
					)
				);
			}

			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("welcomer-channels-reset")
						.setLabel(lang.setchannels_button_delete)
						.setStyle(ButtonStyle.Danger)
						.setDisabled(disabled)
				)
			);
		}

		if (state.section === "banner") {
			container.addSeparatorComponents(
				new SeparatorBuilder()
					.setDivider(true)
					.setSpacing(SeparatorSpacingSize.Large)
			);

			container.addTextDisplayComponents(
				buildBannerStatusLine(state, client, lang)
			);

			if (state.bannerState !== "off") {
				try {
					const preview = await generateJoinImage(
						interaction.member as GuildMember,
						state.banner
					);

					if (preview) {
						files.push(
							new AttachmentBuilder(preview, {
								name: BANNER_ATTACHMENT_NAME
							})
						);
						container.addMediaGalleryComponents(
							new MediaGalleryBuilder().addItems(
								new MediaGalleryItemBuilder().setURL(
									`attachment://${BANNER_ATTACHMENT_NAME}`
								)
							)
						);
					}
				} catch (error) {
					logger.err(error);
				}
			}

			const bannerEnabled = state.bannerState !== "off";

			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("welcomer-banner-reset")
						.setLabel(
							lang.setjoinmessage_default_image_button_title
						)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled),
					new ButtonBuilder()
						.setCustomId("welcomer-banner-toggle")
						.setLabel(
							bannerEnabled
								? lang.setjoinmessage_var_disable_image
								: lang.setjoinmessage_var_enable_image
						)
						.setStyle(
							bannerEnabled
								? ButtonStyle.Danger
								: ButtonStyle.Success
						)
						.setDisabled(disabled)
				)
			);

			if (!disabled) {
				if (!state.picker) {
					container.addActionRowComponents(buildPropSelectRow(lang));
				} else if (state.picker.kind === "frame") {
					container.addActionRowComponents(buildFramePickerRow(lang));
				} else {
					container.addActionRowComponents(
						buildSizePickerRow(lang, state.picker.target)
					);
				}
			}
		}

		await message.edit({
			components: [container],
			files,
			flags: [MessageFlags.IsComponentsV2]
		});
	}

	async function askForMessage(
		source: ButtonInteraction<"cached">,
		kind: "join" | "leave"
	): Promise<string | null> {
		const isJoin = kind === "join";
		const modal = await iHorizonModalResolve(
			{
				customId: `welcomer-${kind}-modal`,
				title: isJoin
					? lang.setjoinmessage_awaiting_response
					: lang.setleavemessage_awaiting_response,
				deferUpdate: false,
				fields: [
					{
						customId: `welcomer-${kind}-input`,
						label: isJoin
							? lang.guildprofil_embed_fields_joinmessage
							: lang.guildprofil_embed_fields_leavemessage,
						style: TextInputStyle.Paragraph,
						required: true,
						maxLength: 1010,
						minLength: 2
					}
				]
			},
			source as Interaction
		);

		if (!modal) return null;

		try {
			const response = modal.fields.getTextInputValue(
				`welcomer-${kind}-input`
			);

			await client.db.set(
				`${guildId}.GUILD.GUILD_CONFIG.${isJoin ? "joinmessage" : "leavemessage"}`,
				response
			);

			await modal.reply({
				content: (isJoin
					? lang.setjoinmessage_command_work_on_enable
					: lang.setleavemessage_command_work_on_enable
				).replace(
					"${client.iHorizon_Emojis.GreenTick}",
					client.iHorizon_Emojis.GreenTick
				),
				flags: [1 << 6]
			});

			await client.func.ihorizon_logs(interaction, {
				title: isJoin
					? lang.setjoinmessage_logs_embed_title_on_enable
					: lang.setleavemessage_logs_embed_title_on_enable,
				description: (isJoin
					? lang.setjoinmessage_logs_embed_description_on_enable
					: lang.setleavemessage_logs_embed_description_on_enable
				).replace("${interaction.user.id}", authorId)
			});

			return response;
		} catch (error) {
			logger.err(error);
			return null;
		}
	}

	async function resetMessage(
		source: ButtonInteraction<"cached">,
		kind: "join" | "leave",
		message: Message<true>
	): Promise<void> {
		const isJoin = kind === "join";

		await client.db.delete(
			`${guildId}.GUILD.GUILD_CONFIG.${isJoin ? "joinmessage" : "leavemessage"}`
		);

		if (isJoin) state.joinMessage = null;
		else state.leaveMessage = null;

		await source.reply({
			content: (isJoin
				? lang.setjoinmessage_command_work_on_disable
				: lang.setleavemessage_command_work_on_disable
			).replace(
				"${client.iHorizon_Emojis.Yes}",
				client.iHorizon_Emojis.Yes
			),
			flags: [1 << 6]
		});

		await client.func.ihorizon_logs(interaction, {
			title: isJoin
				? lang.setjoinmessage_logs_embed_title_on_disable
				: lang.setleavemessage_logs_embed_title_on_disable,
			description: (isJoin
				? lang.setjoinmessage_logs_embed_description_on_disable
				: lang.setleavemessage_logs_embed_description_on_disable
			).replace("${interaction.user.id}", authorId)
		});

		await render(message);
	}

	async function saveBanner(): Promise<void> {
		await client.db.set(
			`${guildId}.GUILD.GUILD_CONFIG.joinbanner`,
			state.banner
		);
	}

	async function handlePropAction(
		source: StringSelectMenuInteraction<"cached">,
		action: BannerPropAction,
		message: Message<true>
	): Promise<void> {
		switch (action) {
			case "change_background": {
				const modal = await iHorizonModalResolve(
					{
						title: lang.setjoinmessage_change_image_propreties_background,
						customId: "welcomer-background-modal",
						deferUpdate: true,
						fields: [
							{
								customId: "url",
								label: lang.setjoinmessage_modal_fields_background_url,
								style: TextInputStyle.Short,
								required: true,
								maxLength: 300,
								minLength: 7
							}
						]
					},
					source as Interaction
				);

				if (!modal) return;

				const newUrl = modal.fields.getTextInputValue("url");

				if (await client.func.image64.isImageUrl(newUrl)) {
					state.banner.backgroundURL = newUrl;
				} else {
					await source.followUp({
						content: lang.setjoinmessage_change_image_invalid_url,
						flags: [1 << 6]
					});
					return;
				}
				break;
			}
			case "change_frame": {
				await source.deferUpdate();
				state.picker = { kind: "frame" };
				await render(message);
				return;
			}
			case "change_text_colour": {
				const modal = await iHorizonModalResolve(
					{
						title: lang.setjoinmessage_change_image_propreties_text_colour,
						customId: "welcomer-colour-modal",
						deferUpdate: false,
						fields: [
							{
								customId: "colour",
								label: lang.setjoinmessage_modal_fields_hex_color,
								style: TextInputStyle.Short,
								required: true,
								maxLength: 9,
								minLength: 3
							}
						]
					},
					source as Interaction
				);

				if (!modal) return;

				const newColor = modal.fields.getTextInputValue("colour");

				if (isValidColor(newColor)) {
					state.banner.textColour = newColor;
					await modal.deferUpdate();
				} else {
					await modal.reply({
						content: lang.embed_choose_12_error.replace(
							"${client.iHorizon_Emojis.No}",
							client.iHorizon_Emojis.No
						),
						flags: [1 << 6]
					});
					return;
				}
				break;
			}
			case "change_text_message": {
				const modal = await iHorizonModalResolve(
					{
						title: lang.setjoinmessage_change_image_propreties_text_message,
						customId: "welcomer-text-modal",
						deferUpdate: true,
						fields: [
							{
								customId: "msg",
								label: lang.setjoinmessage_modal_fields_message,
								style: TextInputStyle.Short,
								required: true,
								maxLength: 100,
								minLength: 15
							}
						]
					},
					source as Interaction
				);

				if (!modal) return;

				state.banner.message = modal.fields.getTextInputValue("msg");
				break;
			}
			case "change_text_size": {
				await source.deferUpdate();
				state.picker = { kind: "size", target: "text" };
				await render(message);
				return;
			}
			case "change_avatar_size": {
				await source.deferUpdate();
				state.picker = { kind: "size", target: "avatar" };
				await render(message);
				return;
			}
		}

		await saveBanner();
		await render(message);
	}

	async function handleChannelPick(
		source: ChannelSelectMenuInteraction<"cached">,
		kind: "join" | "leave",
		message: Message<true>
	): Promise<void> {
		const isJoin = kind === "join";
		const channelId = source.channels.first()?.id;

		const channel =
			interaction.guild?.channels.cache.get(channelId as string) ??
			(await interaction.guild?.channels
				.fetch(channelId as string)
				.catch(() => null));

		if (!(channel instanceof TextChannel)) {
			await source.reply({
				content: lang.setchannels_not_a_text_channel.replace(
					"${client.iHorizon_Emojis.Warning_Icon}",
					client.iHorizon_Emojis.Warning_Icon
				),
				flags: [1 << 6]
			});
			return;
		}

		const current = isJoin ? state.joinChannel : state.leaveChannel;

		if (current === channelId) {
			await source.reply({
				content: isJoin
					? lang.setchannels_already_this_channel_on_join
					: lang.setchannels_already_this_channel_on_leave,
				flags: [1 << 6]
			});
			return;
		}

		try {
			const targetChannel =
				(interaction.guild!.channels.cache.get(channelId as string) as
					BaseGuildTextChannel | undefined) ??
				((await interaction
					.guild!.channels.fetch(channelId as string)
					.catch(() => null)) as BaseGuildTextChannel | null);

			if (!targetChannel) throw new Error("Channel not found");

			await targetChannel.send({
				content: isJoin
					? lang.setchannels_confirmation_message_on_join
					: lang.setchannels_confirmation_message_on_leave
			});

			await client.db.set(
				`${guildId}.GUILD.GUILD_CONFIG.${isJoin ? "join" : "leave"}`,
				channelId
			);

			if (isJoin) state.joinChannel = channelId as string;
			else state.leaveChannel = channelId as string;

			await client.func.ihorizon_logs(interaction, {
				title: isJoin
					? lang.setchannels_logs_embed_title_on_join
					: lang.setchannels_logs_embed_title_on_leave,
				description: (isJoin
					? lang.setchannels_logs_embed_description_on_join
					: lang.setchannels_logs_embed_description_on_leave
				)
					.replace(/\${argsid\.id}/g, channelId as string)
					.replace(/\${interaction\.user\.id}/g, authorId)
			});

			await source.reply({
				content: (isJoin
					? lang.setchannels_command_work_on_join
					: lang.setchannels_command_work_on_leave
				).replace(/\${argsid\.id}/g, channelId as string),
				flags: [1 << 6]
			});

			await render(message);
		} catch {
			await source.reply({
				content: isJoin
					? lang.setchannels_command_error_on_join
					: lang.setchannels_command_error_on_leave,
				flags: [1 << 6]
			});
		}
	}

	async function handleChannelsReset(
		source: ButtonInteraction<"cached">,
		message: Message<true>
	): Promise<void> {
		await client.func.ihorizon_logs(interaction, {
			title: lang.setchannels_logs_embed_title_on_off,
			description: lang.setchannels_logs_embed_description_on_off.replace(
				/\${interaction\.user\.id}/g,
				authorId
			)
		});

		if (!state.joinChannel && !state.leaveChannel) {
			await source.reply({
				content: lang.setchannels_already_on_off,
				flags: [1 << 6]
			});
			return;
		}

		await client.db.delete(`${guildId}.GUILD.GUILD_CONFIG.join`);
		await client.db.delete(`${guildId}.GUILD.GUILD_CONFIG.leave`);

		state.joinChannel = null;
		state.leaveChannel = null;

		await source.reply({
			content: lang.setchannels_command_work_on_off,
			flags: [1 << 6]
		});

		await render(message);
	}

	const placeholder = (await client.func.method.interactionSend(interaction, {
		components: [
			new ContainerBuilder()
				.setAccentColor(PANEL_ACCENT_COLOR)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`## ${lang.welcomer_panel_title} — ${sectionTitle(lang, state.section)}`
					)
				)
				.addActionRowComponents(
					buildSectionSelectRow(lang, state.section)
				)
		],
		flags: [MessageFlags.IsComponentsV2]
	})) as Message<true>;

	await render(placeholder);

	const collector = placeholder.createMessageComponentCollector({
		time: COLLECTOR_TIMEOUT
	});

	collector.on("collect", async (collected) => {
		if (collected.user.id !== authorId) {
			await collected.reply({
				content: lang.help_not_for_you,
				flags: [1 << 6]
			});
			return;
		}

		try {
			if (collected.isStringSelectMenu()) {
				const source =
					collected as StringSelectMenuInteraction<"cached">;

				if (source.customId === "welcomer-section") {
					await source.deferUpdate();
					state.section = source.values[0] as WelcomerSection;
					state.picker = null;
					await render(placeholder);
					return;
				}

				if (source.customId === "welcomer-banner-prop") {
					await handlePropAction(
						source,
						source.values[0] as BannerPropAction,
						placeholder
					);
					return;
				}

				if (source.customId === "welcomer-frame-pick") {
					await source.deferUpdate();
					state.banner.profilePictureRound = source.values[0] as
						"status" | "hexProfileColor";
					state.picker = null;
					await saveBanner();
					await render(placeholder);
					return;
				}

				if (source.customId === "welcomer-size-pick") {
					await source.deferUpdate();

					if (
						state.picker?.kind === "size" &&
						state.picker.target === "text"
					) {
						state.banner.textSize = source.values[0];
					} else {
						state.banner.avatarSize = source.values[0];
					}

					state.picker = null;
					await saveBanner();
					await render(placeholder);
					return;
				}
			}

			if (collected.isChannelSelectMenu()) {
				const source =
					collected as ChannelSelectMenuInteraction<"cached">;

				if (source.customId === "welcomer-channel-join") {
					await handleChannelPick(source, "join", placeholder);
					return;
				}

				if (source.customId === "welcomer-channel-leave") {
					await handleChannelPick(source, "leave", placeholder);
					return;
				}
			}

			if (collected.isButton()) {
				const source = collected as ButtonInteraction<"cached">;

				switch (source.customId) {
					case "welcomer-join-set": {
						const response = await askForMessage(source, "join");

						if (response) {
							state.joinMessage = response;
							await render(placeholder);
						}
						break;
					}
					case "welcomer-join-reset": {
						await resetMessage(source, "join", placeholder);
						break;
					}
					case "welcomer-leave-set": {
						const response = await askForMessage(source, "leave");

						if (response) {
							state.leaveMessage = response;
							await render(placeholder);
						}
						break;
					}
					case "welcomer-leave-reset": {
						await resetMessage(source, "leave", placeholder);
						break;
					}
					case "welcomer-channels-reset": {
						await handleChannelsReset(source, placeholder);
						break;
					}
					case "welcomer-banner-reset": {
						await source.deferUpdate();
						state.banner = {
							...DEFAULT_IMAGE_CONFIG,
							message: lang.setjoinmessage_image_default_text
						};
						state.picker = null;
						await saveBanner();
						await render(placeholder);
						break;
					}
					case "welcomer-banner-toggle": {
						await source.deferUpdate();
						state.bannerState =
							state.bannerState === "off" ? "on" : "off";
						await client.db.set(
							`${guildId}.GUILD.GUILD_CONFIG.joinbannerStates`,
							state.bannerState
						);
						await render(placeholder);
						break;
					}
				}
				return;
			}
		} catch (error) {
			logger.err(error);
		}
	});

	collector.on("end", async () => {
		try {
			state.picker = null;
			await render(placeholder, true);
		} catch {
			// Message may have been deleted, nothing to disable.
		}
	});
}
