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
	Client,
	EmbedBuilder,
	ActionRowBuilder,
	ComponentType,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuOptionBuilder,
	ColorResolvable,
	ChatInputCommandInteraction,
	BaseGuildTextChannel,
	StringSelectMenuInteraction,
	ChannelSelectMenuBuilder,
	ChannelType,
	ButtonInteraction,
	ChannelSelectMenuInteraction,
	Message,
	TextChannel,
} from 'discord.js';

import { generatePassword } from '../../../core/functions/random.js';
import { LanguageData } from '../../../../types/languageData.js';


import { DatabaseStructure } from '../../../../types/database_structure.js';
import { SubCommand } from '../../../../types/command.js';

// Types
type Attachment = { attachment: string; name: string; };
type FileType = 'footer' | 'image' | 'thumbnail';
type LanguageDataKeys = keyof LanguageData;

interface EmbedFiles {
	footer: Attachment | null;
	image: Attachment | null;
	thumbnail: Attachment | null;
}

interface DiscordUrlParts {
	userIdOrGuildId: string;
	channelId: string;
	messageId: string;
}

// Utility functions
export function isValidLink(url: string): boolean {
	return ["https://", "http://"].some(protocol => url.startsWith(protocol));
}

export function isValidColor(color: string): boolean {
	return /^#([0-9a-f]{3}){1,2}$/i.test(color);
}

export function getMediaByMessage(message: Message): { name: string; attachment: string; } {
	if (isValidLink(message.content)) {
		return { name: "url", attachment: message.content };
	}

	const attachment = message.attachments.first();
	if (attachment?.contentType?.startsWith("image/")) {
		const name = client.func.method.isAnimated(attachment.url) ? "image.gif" : "image.png";
		return { attachment: attachment.url, name };
	}

	return { name: "none", attachment: "" };
}

function extractDiscordUrlParts(url: string): DiscordUrlParts {
	try {
		const urlObj = new URL(url);
		const pathSegments = urlObj.pathname.split('/').filter(segment => segment !== '');

		if (pathSegments.length < 4 || pathSegments[0] !== 'channels') {
			throw new Error('URL Discord non valide');
		}

		return {
			userIdOrGuildId: pathSegments[1],
			channelId: pathSegments[2],
			messageId: pathSegments[3]
		};
	} catch (err) {
		throw new Error('URL Discord non valide');
	}
}

// Main class for embed management
class EmbedManager {
	private interaction: ChatInputCommandInteraction<"cached"> | Message;
	private lang: LanguageData;
	private embed: EmbedBuilder;
	private files: EmbedFiles;
	private response: Message;

	constructor(interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData) {
		this.interaction = interaction;
		this.lang = lang;
		this.embed = new EmbedBuilder().setDescription('** **');
		this.files = { footer: null, image: null, thumbnail: null };
	}

	// Optimized file management
	private setFile(type: FileType, file: Attachment | null): void {
		this.files[type] = file;
	}

	private getFilesArray(): Attachment[] {
		return Object.values(this.files).filter(file => file !== null) as Attachment[];
	}

	private updateMedia(type: FileType, message: Message): void {
		const { name, attachment } = getMediaByMessage(message);

		// Clear previous file of this type
		this.setFile(type, null);

		if (name === "url") {
			this.handleUrlMedia(type, attachment);
		} else if (name !== "none") {
			this.handleFileMedia(type, name, attachment);
		} else {
			this.clearMedia(type);
		}

		this.updateResponse();
	}

	private handleUrlMedia(type: FileType, url: string): void {
		switch (type) {
			case 'footer':
				this.embed.setFooter({
					iconURL: url,
					text: this.embed.data.footer?.text || "Footer"
				});
				break;
			case 'image':
				this.embed.setImage(url);
				break;
			case 'thumbnail':
				this.embed.setThumbnail(url);
				break;
		}
	}

	private handleFileMedia(type: FileType, name: string, attachment: string): void {
		const attachmentUrl = "attachment://" + name;
		this.setFile(type, { attachment, name });

		switch (type) {
			case 'footer':
				this.embed.setFooter({
					iconURL: attachmentUrl,
					text: this.embed.data.footer?.text || "Footer"
				});
				break;
			case 'image':
				this.embed.setImage(attachmentUrl);
				break;
			case 'thumbnail':
				this.embed.setThumbnail(attachmentUrl);
				break;
		}
	}

	private clearMedia(type: FileType): void {
		this.setFile(type, null);
		switch (type) {
			case 'footer':
				this.embed.setFooter({
					text: this.embed.data.footer?.text || "Footer"
				});
				break;
			case 'image':
				this.embed.setImage(null);
				break;
			case 'thumbnail':
				this.embed.setThumbnail(null);
				break;
		}
	}

	private updateResponse(): void {
		this.response.edit({
			embeds: [this.embed],
			files: this.getFilesArray()
		});
	}

	// Simplified action handlers
	private async handleCollector(i: StringSelectMenuInteraction<"cached">, replyContent: LanguageDataKeys, onCollect: (message: Message) => void): Promise<void> {
		const replyMessage = Array.isArray(this.lang[replyContent])
			? (this.lang[replyContent] as string[]).join(' ')
			: this.lang[replyContent];

		const reply = await i.reply({ content: replyMessage.toString(), flags: [1 << 6] });

		const messageCollector = (this.interaction.channel as BaseGuildTextChannel)?.createMessageCollector({
			filter: (m) => m.author.id === this.interaction.member?.user.id!,
			max: 1,
			time: 300_000
		});

		messageCollector?.on('collect', async (message) => {
			onCollect(message);
			await reply.delete().catch(() => { });
			await message.delete().catch(() => { });
		});
	}

	private async copyEmbed(messageUrl: string): Promise<void> {
		const parts = extractDiscordUrlParts(messageUrl);

		if (parts.userIdOrGuildId !== this.interaction.guildId) {
			throw new Error(this.lang.embed_copy_bad_guild_msg.replace("${interaction.guild?.name}", this.interaction.guild?.name!));
		}

		const channel = this.interaction.guild?.channels.cache.get(parts.channelId) as TextChannel;
		if (!channel) {
			throw new Error(this.lang.embed_copy_bad_channel_msg);
		}

		const targetMessage = await channel.messages.fetch(parts.messageId);
		if (!targetMessage) {
			throw new Error(this.lang.embed_copy_bad_message_msg);
		}

		if (targetMessage.embeds.length === 0) {
			throw new Error(this.lang.embed_copy_bad_embed_message_msg);
		}

		this.embed = EmbedBuilder.from(targetMessage.embeds[0]);
		this.updateResponse();
	}

	// Action handlers with optimized logic
	private async chooseAction(i: StringSelectMenuInteraction<"cached">): Promise<void> {
		const actions: Record<string, () => Promise<void>> = {
			'0': async () => {
				await this.handleCollector(i, 'embed_choose_0', async (message) => {
					try {
						await this.copyEmbed(message.content || 'none');
					} catch (err) {
						i.followUp({ content: (err as Error).message, flags: [1 << 6] });
					}
				});
			},
			'1': async () => {
				await this.handleCollector(i, 'embed_choose_1', (message) => {
					this.embed.setTitle(message.content);
					this.updateResponse();
				});
			},
			'2': async () => {
				this.embed.setTitle(null);
				this.updateResponse();
				await i.reply({ content: this.lang.embed_choose_2, flags: [1 << 6] });
			},
			'3': async () => {
				await this.handleCollector(i, 'embed_choose_3', (message) => {
					this.embed.setDescription(message.content);
					this.updateResponse();
				});
			},
			'4': async () => {
				this.embed.setDescription("** **");
				this.updateResponse();
				await i.reply({ content: this.lang.embed_choose_4, flags: [1 << 6] });
			},
			'5': async () => {
				await this.handleCollector(i, 'embed_choose_5', (message) => {
					this.embed.setAuthor({ name: message.content });
					this.updateResponse();
				});
			},
			'6': async () => {
				this.embed.setAuthor(null);
				this.updateResponse();
				await i.reply({ content: this.lang.embed_choose_6, flags: [1 << 6] });
			},
			'7': async () => {
				await this.handleCollector(i, 'embed_choose_7', (message) => {
					this.embed.setFooter({ text: message.content });
					this.updateResponse();
				});
			},
			'7bis': async () => {
				await this.handleCollector(i, 'embed_choose_7bis', (message) => {
					this.updateMedia('footer', message);
				});
			},
			'8': async () => {
				this.embed.setFooter(null);
				this.setFile('footer', null);
				this.updateResponse();
				await i.reply({ content: this.lang.embed_choose_8, flags: [1 << 6] });
			},
			'9': async () => {
				await this.handleCollector(i, 'embed_choose_9', (message) => {
					this.updateMedia('thumbnail', message);
				});
			},
			'10': async () => {
				await this.handleCollector(i, 'embed_choose_10', (message) => {
					this.updateMedia('image', message);
				});
			},
			'11': async () => {
				await this.handleCollector(i, 'embed_choose_11', (message) => {
					if (isValidLink(message.content)) {
						this.embed.setURL(message.content);
						this.updateResponse();
					}
				});
			},
			'12': async () => {
				await this.handleCollector(i, 'embed_choose_12', async (message) => {
					if (isValidColor(message.content)) {
						this.embed.setColor(message.content as ColorResolvable);
						this.updateResponse();
					} else {
						await client.func.method.channelSend(this.interaction, {
							content: this.lang.embed_choose_12_error.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
						});
					}
				});
			},
			'13': async () => {
				this.embed.setColor(null);
				this.updateResponse();
				await i.reply({ content: this.lang.embed_choose_13, flags: [1 << 6] });
			}
		};

		const action = actions[i.values[0]];
		if (action) {
			await action();
		}
	}

	// Optimized embed operations
	private async saveEmbed(arg?: string): Promise<string> {
		const potentialEmbed = await client.db.get(`EMBED.${arg}`) as DatabaseStructure.DbEmbedObject["EMBED"];

		if (potentialEmbed?.embedOwner !== this.interaction.member?.user.id! || !arg) {
			const password = generatePassword({ length: 16 });
			await client.db.set(`EMBED.${password}`, {
				embedOwner: this.interaction.member?.user.id!,
				embedSource: this.embed.toJSON()
			});
			return password;
		}

		await client.db.set(`EMBED.${arg}`, {
			embedOwner: this.interaction.member?.user.id!,
			embedSource: this.embed.toJSON()
		});
		return arg;
	}

	private async sendEmbed(confirmation: ButtonInteraction<"cached">): Promise<void> {
		const channelSelectMenu = new ActionRowBuilder<ChannelSelectMenuBuilder>()
			.addComponents(
				new ChannelSelectMenuBuilder()
					.setCustomId('embed-save-channel')
					.setChannelTypes(ChannelType.GuildText)
					.setMaxValues(1)
					.setMinValues(1)
			);

		await confirmation.update({
			content: this.lang.embed_send_message.replace('${interaction.user.id}', this.interaction.member?.user.id!),
			components: [channelSelectMenu],
			files: this.getFilesArray()
		});

		const seCollector = (this.interaction.channel as BaseGuildTextChannel)?.createMessageComponentCollector({
			filter: (m) => m.user.id === this.interaction.member?.user.id! && m.customId === 'embed-save-channel',
			max: 1,
			time: 300_000,
			componentType: ComponentType.ChannelSelect
		});

		seCollector?.on('collect', async (result) => {
			if (result instanceof ChannelSelectMenuInteraction) {
				const channel = this.interaction.guild?.channels.cache.get(result.channels.first()?.id!);
				if (!channel) return;

				await (channel as BaseGuildTextChannel).send({
					embeds: [this.embed],
					files: this.getFilesArray()
				});

				seCollector.stop();
				await this.response.edit({
					content: this.lang.embed_send_embed_work
						.replace('${interaction.user.id}', this.interaction.member?.user.id!)
						.replace('${message.content}', channel.id),
					embeds: [],
					components: [],
					files: []
				});
			}
		});

		seCollector?.on('end', async () => {
			await this.response.edit({ components: [] });
		});
	}

	private async replaceEmbed(confirmation: ButtonInteraction<"cached">): Promise<void> {
		await confirmation.update({
			content: this.lang.embed_replace_question_msg,
			components: [],
			files: this.getFilesArray()
		});

		const response2 = await (this.interaction.channel as BaseGuildTextChannel)?.awaitMessages({
			filter: (m) => m.author.id === this.interaction.member?.user.id!,
			max: 1,
			time: 300_000,
		});

		const message = response2.first();
		if (!message) return;

		try {
			const parts = extractDiscordUrlParts(message.content || 'none');
			message.delete().catch(() => { });

			if (parts.userIdOrGuildId !== this.interaction.guildId) {
				throw new Error(this.lang.embed_copy_bad_guild_msg.replace("${interaction.guild?.name}", this.interaction.guild?.name!));
			}

			const channel = this.interaction.guild?.channels.cache.get(parts.channelId) as TextChannel;
			if (!channel) {
				throw new Error(this.lang.embed_copy_bad_channel_msg);
			}

			const targetMessage = await channel.messages.fetch(parts.messageId);
			if (!targetMessage) {
				throw new Error(this.lang.embed_copy_bad_message_msg);
			}

			if (targetMessage.embeds.length === 0) {
				throw new Error(this.lang.embed_copy_bad_embed_message_msg);
			}

			await targetMessage.edit({
				embeds: [this.embed],
				files: this.getFilesArray()
			});

			await confirmation.editReply({
				content: this.lang.embed_replace_message
					.replace('{user}', this.interaction.member?.user.toString()!)
					.replace('{messageUrl}', message.content!),
				files: [],
				embeds: [],
				components: []
			});
		} catch (error) {
			message?.delete().catch(() => { });
			await confirmation.followUp({
				content: (error as Error).message,
				flags: [1 << 6]
			});
			await this.restoreMainInterface();
		}
	}

	private async restoreMainInterface(): Promise<void> {
		const { select, buttons } = this.createComponents();
		await this.response.edit({
			content: this.lang.embed_first_message,
			embeds: [this.embed],
			components: [select, buttons],
			files: this.getFilesArray()
		});
	}

	private createComponents(): { select: ActionRowBuilder<StringSelectMenuBuilder>, buttons: ActionRowBuilder<ButtonBuilder> } {
		const select = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(
				new StringSelectMenuBuilder()
					.setCustomId('embed-select-menu')
					.setPlaceholder(this.lang.embed_placeholder_string_select_menu_builder)
					.addOptions(
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_copy_embed).setEmoji("📥").setValue('0'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_title).setEmoji("🖊").setValue('1'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_delete_title).setEmoji("💥").setValue('2'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_description).setEmoji("💬").setValue('3'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_delete_description).setEmoji("📝").setValue('4'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_author).setEmoji("🕵️").setValue('5'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_delete_author).setEmoji("✂").setValue('6'),
						new StringSelectMenuOptionBuilder().setLabel("Changer l'icône du footer").setEmoji("🖼️").setValue('7bis'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_footer).setEmoji("🔻").setValue('7'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_delete_footer).setEmoji("🔺").setValue('8'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_thumbnail).setEmoji("🔳").setValue('9'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_image).setEmoji("🖼️").setValue('10'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_titleurl).setEmoji("🌐").setValue('11'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_edit_color).setEmoji("🎨").setValue('12'),
						new StringSelectMenuOptionBuilder().setLabel(this.lang.embed_placeholder_option_delete_color).setEmoji("🔵").setValue('13')
					)
			);

		const buttons = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder().setCustomId('save').setLabel(this.lang.embed_btn_save).setStyle(ButtonStyle.Success),
				new ButtonBuilder().setCustomId('send').setLabel(this.lang.embed_btn_send).setStyle(ButtonStyle.Primary),
				new ButtonBuilder().setCustomId('replace').setLabel(this.lang.embed_btn_replace).setStyle(ButtonStyle.Secondary),
				new ButtonBuilder().setCustomId('cancel').setLabel(this.lang.embed_btn_cancel).setStyle(ButtonStyle.Danger)
			);

		return { select, buttons };
	}

	// Main run method
	async run(arg?: string): Promise<void> {
		// Load existing embed if available
		const potentialEmbed = await client.db.get(`EMBED.${arg}`) as DatabaseStructure.DbEmbedObject["EMBED"];
		if (potentialEmbed) {
			this.embed = new EmbedBuilder(potentialEmbed.embedSource);
		}

		const { select, buttons } = this.createComponents();

		this.response = await client.func.method.interactionSend(this.interaction, {
			content: this.lang.embed_first_message,
			embeds: [this.embed],
			components: [select, buttons],
		});

		// String select collector
		const selectCollector = this.response.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 1_420_000
		});

		selectCollector.on('collect', async (i: StringSelectMenuInteraction<"cached">) => {
			if (i.user.id !== this.interaction.member?.user.id!) {
				await i.reply({ content: this.lang.embed_interaction_not_for_you, flags: [1 << 6] });
				return;
			}
			await this.chooseAction(i);
		});

		// Button collector
		const buttonCollector = this.response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 300_000
		});

		buttonCollector.on('collect', async (confirmation: ButtonInteraction<"cached">) => {
			if (confirmation.user.id !== this.interaction.member?.user.id!) {
				await confirmation.reply({ content: this.lang.embed_interaction_not_for_you, flags: [1 << 6] });
				return;
			}

			switch (confirmation.customId) {
				case "save":
					const embedId = await this.saveEmbed(arg);
					await confirmation.update({
						content: this.lang.embed_save_message
							.replace('${interaction.user.id}', this.interaction.member?.user.id!)
							.replace('${await saveEmbed()}', embedId),
						components: [],
						embeds: [],
						files: []
					});
					buttonCollector.stop();
					break;
				case "cancel":
					await confirmation.update({
						content: this.lang.embed_cancel_message.replace('${interaction.user.id}', this.interaction.member?.user.id!),
						components: [],
						embeds: [],
						files: []
					});
					buttonCollector.stop();
					break;
				case "send":
					await this.sendEmbed(confirmation);
					break;
				case "replace":
					await this.replaceEmbed(confirmation);
					break;
			}
		});

		// End collectors
		selectCollector.on('end', async () => {
			await this.response.edit({ components: [] }).catch(() => { });
		});

		buttonCollector.on('end', async () => {
			await this.response.edit({ components: [] }).catch(() => { });
		});
	}
}

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {
		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const arg = interaction instanceof ChatInputCommandInteraction
			? interaction.options.getString("id")
			: client.func.method.string(args!, 0);

		const embedManager = new EmbedManager(interaction, lang);
		await embedManager.run(arg || undefined);
	},
};