/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputStyle,
	MessageComponentInteraction,
	Interaction,
	StringSelectMenuInteraction,
	CacheType
} from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { LanguageData } from '../../../../types/languageData.js';
import { generateJoinImage } from '../../../Events/guildconfig/joinMessage.js';
import logger from '../../../core/logger.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';

// Constants
const COLLECTOR_TIMEOUT = 800_000;
const SELECT_TIMEOUT = 1_250_000;
const DEFAULT_IMAGE_CONFIG: Exclude<DatabaseStructure.JoinMessageOptions, "message"> = {
	backgroundURL: "https://img.freepik.com/vecteurs-libre/fond-courbe-bleue_53876-113112.jpg",
	profilePictureRound: "status" as const,
	textColour: "#000000",
	textSize: "40px",
	avatarSize: "140px",
	type: 2,
	message: ''
};

// Utility functions
const isValidColor = (color: string): boolean => /^#([0-9a-f]{3}){1,2}$/i.test(color);

const createEmbedFields = (joinMessage: string | null, lang: LanguageData, client: Client, interaction: ChatInputCommandInteraction, guildLocal: string) => [
	{
		name: lang.setjoinmessage_help_embed_fields_custom_name,
		value: joinMessage
			? `\`\`\`${joinMessage}\`\`\`\n${client.func.method.generateCustomMessagePreview(joinMessage, {
				user: interaction.user,
				guild: interaction.guild!,
				guildLocal,
			})}`
			: lang.setjoinmessage_help_embed_fields_custom_name_empy
	},
	{
		name: lang.setjoinmessage_help_embed_fields_default_name_empy,
		value: `\`\`\`${lang.event_welcomer_inviter}\`\`\`\n${client.func.method.generateCustomMessagePreview(lang.event_welcomer_inviter, {
			user: interaction.user,
			guild: interaction.guild!,
			guildLocal,
		})}`
	}
];

class JoinMessageHandler {
	private client: Client;
	private interaction: ChatInputCommandInteraction<"cached">;
	private lang: LanguageData;
	private guildLocal: string;
	private imageConfig: DatabaseStructure.JoinMessageOptions;
	private imageBannerStates: string;

	constructor(
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData,
		guildLocal: string,
		imageConfig: DatabaseStructure.JoinMessageOptions,
		imageBannerStates: string
	) {
		this.client = client;
		this.interaction = interaction;
		this.lang = lang;
		this.guildLocal = guildLocal;
		this.imageConfig = imageConfig;
		this.imageBannerStates = imageBannerStates;
	}

	// Create main action buttons
	private createMainButtons() {
		return new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId("joinMessage-set-message")
					.setLabel(this.lang.setjoinmessage_button_set_name)
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId("joinMessage-default-message")
					.setLabel(this.lang.setjoinmessage_buttom_del_name)
					.setStyle(ButtonStyle.Danger)
			);
	}

	// Create image configuration buttons
	private createImageButtons() {
		const isImageEnabled = this.imageBannerStates !== "off";

		return new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setCustomId("joinMessage-set-image")
					.setLabel(this.lang.setjoinmessage_change_image_button_title)
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId("joinMessage-default-image")
					.setLabel(this.lang.setjoinmessage_default_image_button_title)
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("joinMessage-delete-image")
					.setLabel(isImageEnabled ? this.lang.setjoinmessage_var_disable_image : this.lang.setjoinmessage_var_enable_image)
					.setStyle(isImageEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
			);
	}

	// Create image customization select menu
	private createImageCustomizationMenu() {
		return new StringSelectMenuBuilder()
			.setCustomId("image-customization")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_propreties_background)
					.setValue("change_background"),
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_propreties_frame_color)
					.setValue("change_frame"),
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_propreties_text_colour)
					.setValue("change_text_colour"),
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_propreties_text_message)
					.setValue("change_text_message"),
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_propreties_text_size)
					.setValue("change_text_size"),
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_propreties_avatar_size)
					.setValue("change_avatar_size")
			);
	}

	// Generate join image with current config
	private async generateImage() {
		return await generateJoinImage(this.interaction.member as GuildMember, this.imageConfig);
	}

	// Update database with current image config
	private async saveImageConfig() {
		await this.client.db.set(`${this.interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`, this.imageConfig);
	}

	// Update banner states in database
	private async updateBannerStates(state: string) {
		await this.client.db.set(`${this.interaction.guildId}.GUILD.GUILD_CONFIG.joinbannerStates`, state);
		this.imageBannerStates = state;
	}

	// Handle message setting
	async handleSetMessage(buttonInteraction: MessageComponentInteraction) {
		const modalInteraction = await iHorizonModalResolve({
			customId: 'joinMessage-modal',
			title: this.lang.setjoinmessage_awaiting_response,
			deferUpdate: false,
			fields: [{
				customId: 'joinMessage-input',
				label: this.lang.guildprofil_embed_fields_joinmessage,
				style: TextInputStyle.Paragraph,
				required: true,
				maxLength: 1010,
				minLength: 2
			}]
		}, buttonInteraction as Interaction);

		if (!modalInteraction) return null;

		try {
			const response = modalInteraction.fields.getTextInputValue('joinMessage-input');
			await this.client.db.set(`${this.interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`, response);

			await modalInteraction.reply({
				content: this.lang.setjoinmessage_command_work_on_enable
					.replace("${client.iHorizon_Emojis.GreenTick}", this.client.iHorizon_Emojis.GreenTick),
				flags: [1 << 6]
			});

			await this.client.func.ihorizon_logs(this.interaction, {
				title: this.lang.setjoinmessage_logs_embed_title_on_enable,
				description: this.lang.setjoinmessage_logs_embed_description_on_enable
					.replace("${interaction.user.id}", this.interaction.user.id)
			});

			return response;
		} catch (error) {
			logger.err(error as any);
			return null;
		}
	}

	// Handle default message
	async handleDefaultMessage(buttonInteraction: MessageComponentInteraction) {
		await this.client.db.delete(`${this.interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`);

		await buttonInteraction.reply({
			content: this.lang.setjoinmessage_command_work_on_enable
				.replace("${client.iHorizon_Emojis.GreenTick}", this.client.iHorizon_Emojis.GreenTick),
			flags: [1 << 6]
		});

		await this.client.func.ihorizon_logs(this.interaction, {
			title: this.lang.setjoinmessage_logs_embed_title_on_disable,
			description: this.lang.setjoinmessage_logs_embed_description_on_disable
				.replace("${interaction.user.id}", this.interaction.user.id)
		});
	}

	// Handle background URL change
	async handleBackgroundChange(selectInteraction: MessageComponentInteraction) {
		const modalRes = await iHorizonModalResolve({
			title: this.lang.setjoinmessage_change_image_propreties_background,
			customId: 'change_background',
			deferUpdate: true,
			fields: [{
				customId: 'url',
				label: this.lang.setjoinmessage_modal_fields_background_url,
				style: TextInputStyle.Short,
				required: true,
				maxLength: 300,
				minLength: 7
			}]
		}, selectInteraction as Interaction);

		if (!modalRes) return;

		const newUrl = modalRes.fields.getTextInputValue("url");

		if (await this.client.func.image64.isImageUrl(newUrl)) {
			this.imageConfig.backgroundURL = newUrl;
		}
	}

	// Handle frame style change
	async handleFrameChange(selectInteraction: MessageComponentInteraction) {
		await selectInteraction.deferUpdate();

		const frameMenu = new StringSelectMenuBuilder()
			.setCustomId("frame-select")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_menu_frame_color_profil)
					.setValue("hexProfileColor"),
				new StringSelectMenuOptionBuilder()
					.setLabel(this.lang.setjoinmessage_change_image_menu_frame_status_profil)
					.setValue("status")
			);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(frameMenu);
		const msg = await selectInteraction.editReply({ components: [row] });

		const frameResponse = await msg.awaitMessageComponent({
			componentType: ComponentType.StringSelect,
			time: SELECT_TIMEOUT,
			filter: (x) => x.user.id === this.interaction.user.id
		});

		await frameResponse.deferUpdate();
		this.imageConfig.profilePictureRound = frameResponse.values[0] as "status" | "hexProfileColor";
	}

	// Handle text color change
	async handleTextColorChange(selectInteraction: MessageComponentInteraction) {
		const modalRes = await iHorizonModalResolve({
			title: this.lang.setjoinmessage_change_image_propreties_text_colour,
			customId: 'change_text_colour',
			deferUpdate: false,
			fields: [{
				customId: 'colour',
				label: this.lang.setjoinmessage_modal_fields_hex_color,
				style: TextInputStyle.Short,
				required: true,
				maxLength: 9,
				minLength: 3
			}]
		}, selectInteraction as Interaction);

		if (!modalRes) return;

		const newColor = modalRes.fields.getTextInputValue("colour");

		if (isValidColor(newColor)) {
			this.imageConfig.textColour = newColor;
			await modalRes.deferUpdate();
		} else {
			await modalRes.reply({
				content: this.lang.embed_choose_12_error.replace("${client.iHorizon_Emojis.No}", this.client.iHorizon_Emojis.No),
				flags: [1 << 6]
			});
		}
	}

	// Handle size selection (text or avatar)
	async handleSizeSelection(selectInteraction: MessageComponentInteraction, type: 'text' | 'avatar') {
		await selectInteraction.deferUpdate();

		const sizeOptions = type === 'text'
			? [
				{ label: this.lang.setjoinmessage_var_text_size + "0.5", value: "20px" },
				{ label: this.lang.setjoinmessage_var_text_size + "1", value: "40px" },
				{ label: this.lang.setjoinmessage_var_text_size + "1.5", value: "60px" },
				{ label: this.lang.setjoinmessage_var_text_size + "2", value: "80px" },
				{ label: this.lang.setjoinmessage_var_text_size + "3", value: "120px" },
				{ label: this.lang.setjoinmessage_var_text_size + "4", value: "160px" }
			]
			: [
				{ label: this.lang.setjoinmessage_var_avatar_size + "0.5", value: "70px" },
				{ label: this.lang.setjoinmessage_var_avatar_size + "1", value: "140px" },
				{ label: this.lang.setjoinmessage_var_avatar_size + "1.5", value: "210px" },
				{ label: this.lang.setjoinmessage_var_avatar_size + "2", value: "280px" },
				{ label: this.lang.setjoinmessage_var_avatar_size + "3", value: "430px" }
			];

		const sizeMenu = new StringSelectMenuBuilder()
			.setCustomId("size-select")
			.addOptions(sizeOptions.map(opt =>
				new StringSelectMenuOptionBuilder()
					.setLabel(opt.label)
					.setValue(opt.value)
			));

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(sizeMenu);
		const msg = await selectInteraction.editReply({ components: [row] });

		const sizeResponse = await msg.awaitMessageComponent({
			componentType: ComponentType.StringSelect,
			time: SELECT_TIMEOUT,
			filter: (x) => x.user.id === this.interaction.user.id
		});

		await sizeResponse.deferUpdate();

		if (type === 'text') {
			this.imageConfig.textSize = sizeResponse.values[0];
		} else {
			this.imageConfig.avatarSize = sizeResponse.values[0];
		}
	}

	async handleOnlyImage(selectInteraction: StringSelectMenuInteraction<CacheType>) {

	}
	// Handle message text change
	async handleMessageChange(selectInteraction: MessageComponentInteraction) {
		const modalRes = await iHorizonModalResolve({
			title: this.lang.setjoinmessage_change_image_propreties_text_message,
			customId: 'change_text_message',
			deferUpdate: true,
			fields: [{
				customId: 'msg',
				label: this.lang.setjoinmessage_modal_fields_message,
				style: TextInputStyle.Short,
				required: true,
				maxLength: 100,
				minLength: 15
			}]
		}, selectInteraction as Interaction);

		if (!modalRes) return;

		this.imageConfig.message = modalRes.fields.getTextInputValue("msg");
	}

	// Main execution method
	async execute() {
		let joinMessage = await this.client.db.get(`${this.interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`);
		joinMessage = joinMessage?.substring(0, 1010);

		const helpEmbedFields = createEmbedFields(joinMessage, this.lang, this.client, this.interaction, this.guildLocal);
		const helpEmbed = new EmbedBuilder()
			.setColor("#ffb3cc")
			.setDescription(this.lang.setjoinmessage_help_embed_desc)
			.setTitle(this.lang.setjoinmessage_help_embed_title)
			.setFields(helpEmbedFields);

		const helpEmbed2 = new EmbedBuilder()
			.setColor("#ffb3cc")
			.setTitle(this.lang.setjoinmessage_var_image_card)
			.setImage("attachment://image.png");

		const mainButtons = this.createMainButtons();
		const imageButtons = this.createImageButtons();

		// Prepare embeds and files
		const embeds = [helpEmbed];
		const files = [];

		if (this.imageBannerStates !== "off") {
			const attachment = await this.generateImage();
			if (attachment) {
				embeds.push(helpEmbed2);
				files.push(attachment);
			}
		}

		const message = await this.interaction.editReply({
			embeds,
			components: [mainButtons, imageButtons],
			files
		});

		// Set up collector
		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: COLLECTOR_TIMEOUT
		});

		collector.on('collect', async (buttonInteraction) => {
			// Verify user
			if (buttonInteraction.user.id !== this.interaction.user.id) {
				await buttonInteraction.reply({
					content: this.lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			// Handle different button actions
			switch (buttonInteraction.customId) {
				case "joinMessage-set-message":
					const newMessage = await this.handleSetMessage(buttonInteraction);
					if (newMessage) {
						helpEmbed.setFields(
							{
								name: this.lang.setjoinmessage_help_embed_fields_custom_name,
								value: `\`\`\`${newMessage}\`\`\`\n${this.client.func.method.generateCustomMessagePreview(newMessage, {
									user: this.interaction.user,
									guild: this.interaction.guild!,
									guildLocal: this.guildLocal,
								})}`
							},
							helpEmbedFields[1]
						);
						await this.updateDisplay(message, helpEmbed, helpEmbed2);
					}
					break;

				case "joinMessage-default-message":
					await this.handleDefaultMessage(buttonInteraction);
					helpEmbed.setFields(
						{
							name: this.lang.setjoinmessage_help_embed_fields_custom_name,
							value: this.lang.setjoinmessage_help_embed_fields_custom_name_empy
						},
						helpEmbedFields[1]
					);
					await this.updateDisplay(message, helpEmbed, helpEmbed2);
					break;

				case "joinMessage-set-image":
					await this.handleImageCustomization(buttonInteraction, message, helpEmbed, helpEmbed2);
					break;

				case "joinMessage-default-image":
					await this.handleDefaultImage(buttonInteraction, message, helpEmbed, helpEmbed2);
					break;

				case "joinMessage-delete-image":
					await this.handleImageToggle(buttonInteraction, message, helpEmbed, helpEmbed2);
					break;
			}
		});

		// Handle collector end
		collector.on('end', async () => {
			const disabledMainButtons = this.createMainButtons();
			const disabledImageButtons = this.createImageButtons();

			disabledMainButtons.components.forEach(button => button.setDisabled(true));
			disabledImageButtons.components.forEach(button => button.setDisabled(true));

			await message.edit({ components: [disabledMainButtons, disabledImageButtons] });
		});
	}

	// Helper method to update display
	private async updateDisplay(message: any, helpEmbed: EmbedBuilder, helpEmbed2: EmbedBuilder) {
		const embeds = [helpEmbed];
		const files = [];

		if (this.imageBannerStates !== "off") {
			const attachment = await this.generateImage();
			if (attachment) {
				embeds.push(helpEmbed2);
				files.push(attachment);
			}
		}

		await message.edit({
			embeds,
			files,
			components: [this.createMainButtons(), this.createImageButtons()]
		});
	}

	// Handle image customization flow
	private async handleImageCustomization(buttonInteraction: MessageComponentInteraction, message: any, helpEmbed: EmbedBuilder, helpEmbed2: EmbedBuilder) {
		await buttonInteraction.deferUpdate();

		const customizationMenu = this.createImageCustomizationMenu();
		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(customizationMenu);

		const menuMessage = await buttonInteraction.editReply({ components: [menuRow] });

		const menuCollector = menuMessage.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: SELECT_TIMEOUT,
			filter: (x) => x.user.id === this.interaction.user.id
		});

		menuCollector.on("collect", async (selectInteraction) => {
			const action = selectInteraction.values[0];

			switch (action) {
				case "change_background":
					await this.handleBackgroundChange(selectInteraction);
					break;
				case "change_frame":
					await this.handleFrameChange(selectInteraction);
					break;
				case "change_text_colour":
					await this.handleTextColorChange(selectInteraction);
					break;
				case "change_text_message":
					await this.handleMessageChange(selectInteraction);
					break;
				case "change_text_size":
					await this.handleSizeSelection(selectInteraction, 'text');
					break;
				case "change_avatar_size":
					await this.handleSizeSelection(selectInteraction, 'avatar');
					break;
				case "only_image":
					await this.handleOnlyImage(selectInteraction);
			}

			await this.saveImageConfig();
			await this.updateDisplay(message, helpEmbed, helpEmbed2);
			menuCollector.stop();
		});
	}

	// Handle default image reset
	private async handleDefaultImage(buttonInteraction: MessageComponentInteraction, message: any, helpEmbed: EmbedBuilder, helpEmbed2: EmbedBuilder) {
		await buttonInteraction.deferUpdate();

		this.imageConfig = {
			...DEFAULT_IMAGE_CONFIG,
			message: this.lang.setjoinmessage_image_default_text
		};

		await this.saveImageConfig();
		await this.updateDisplay(message, helpEmbed, helpEmbed2);
	}

	// Handle image toggle (enable/disable)
	private async handleImageToggle(buttonInteraction: MessageComponentInteraction, message: any, helpEmbed: EmbedBuilder, helpEmbed2: EmbedBuilder) {
		await buttonInteraction.deferUpdate();

		const newState = this.imageBannerStates === "off" ? "on" : "off";
		await this.updateBannerStates(newState);
		await this.updateDisplay(message, helpEmbed, helpEmbed2);
	}
}

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {
		// Guard checks
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		// Get database values
		const ImageBannerOptions = await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinbanner`) as DatabaseStructure.JoinMessageOptions | undefined;
		const ImageBannerStates = await client.db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinbannerStates`) || "on";
		const guildLocal = await client.db.get(`${interaction.guild.id}.GUILD.LANG.lang`) || "en-US";

		// Initialize image configuration
		const imageConfig: DatabaseStructure.JoinMessageOptions = {
			backgroundURL: ImageBannerOptions?.backgroundURL || DEFAULT_IMAGE_CONFIG.backgroundURL,
			profilePictureRound: ImageBannerOptions?.profilePictureRound || DEFAULT_IMAGE_CONFIG.profilePictureRound,
			textColour: ImageBannerOptions?.textColour || DEFAULT_IMAGE_CONFIG.textColour,
			message: ImageBannerOptions?.message || lang.setjoinmessage_image_default_text,
			textSize: ImageBannerOptions?.textSize || DEFAULT_IMAGE_CONFIG.textSize,
			avatarSize: ImageBannerOptions?.avatarSize || DEFAULT_IMAGE_CONFIG.avatarSize,
			type: ImageBannerOptions?.type || DEFAULT_IMAGE_CONFIG.type
		};

		// Save initial configuration
		await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinbanner`, imageConfig);

		// Create and execute handler
		const handler = new JoinMessageHandler(
			client,
			interaction,
			lang,
			guildLocal,
			imageConfig,
			ImageBannerStates
		);

		await handler.execute();
	}
};