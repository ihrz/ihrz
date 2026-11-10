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
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ChannelType,
	UserSelectMenuBuilder,
	ChatInputCommandInteraction,
	ButtonInteraction,
	TextBasedChannel,
	BaseGuildTextChannel,
	User,
	Interaction,
	UserSelectMenuInteraction,
	Role,
	StringSelectMenuInteraction,
	ComponentType,
	TextInputStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ChannelSelectMenuBuilder,
	ModalSubmitInteraction,
	APIEmbed,
	ActionRowData,
	APIMessageTopLevelComponent,
	JSONEncodable,
	MessageActionRowComponentBuilder,
	MessageActionRowComponentData,
	TopLevelComponentData,
	Message,
	MessageFlags,
	Collection,
	PermissionFlagsBits,
	BaseMessageOptions,
	Client,
	Guild,
	GuildMember,
	OverwriteType
} from "discord.js";

import { isDiscordEmoji, isSingleEmoji } from "../functions/emojiChecker.js";
import { iHorizonModalResolve } from "../functions/modalHelper.js";
import logger from "../logger.js";
import { TicketPanel } from "../../Interaction/HybridCommands/ticket/!panel.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import getLanguageData from "../functions/getLanguageData.js";
import { metasTable } from "../../Events/client/ready.js";
import { LanguageData } from "../../../types/languageData.js";
import { DiscordJSTranscript } from "sweety-html-transcripts/adapters/discordjs";

/**
 * Fills placeholders in the text fields of an embed object.
 * Done per field (never on the JSON string) so quotes or backslashes
 * in a guild name or username cannot break the embed.
 */
export function fillEmbedText(
	embed: APIEmbed | null | undefined,
	fill: (text: string) => string
): APIEmbed | null {
	if (!embed) return null;

	const result: APIEmbed = { ...embed };

	if (typeof result.title === "string") result.title = fill(result.title);
	if (typeof result.description === "string")
		result.description = fill(result.description);
	if (result.footer && typeof result.footer.text === "string")
		result.footer = { ...result.footer, text: fill(result.footer.text) };
	if (result.author && typeof result.author.name === "string")
		result.author = { ...result.author, name: fill(result.author.name) };
	if (Array.isArray(result.fields))
		result.fields = result.fields.map((field) => ({
			...field,
			name: fill(field.name),
			value: fill(field.value)
		}));

	return result;
}

export interface CaseList {
	id: number;

	emojis: string | undefined;
	name: string;

	categoryId?: string;
}

/** /ticket config off and the dashboard stop the commands; panels already posted must stop too. */
async function refuseIfDisabled(
	interaction:
		ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">
): Promise<boolean> {
	const disabled = await interaction.client.db.get(
		`${interaction.guildId}.GUILD.TICKET.disable`
	);
	if (!disabled) return false;
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	await interaction.reply({
		content: lang.open_disabled_command,
		flags: [1 << 6]
	});
	return true;
}

async function CreateTicketChannel(
	interaction:
		ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">
) {
	if (await refuseIfDisabled(interaction)) return;

	if (interaction instanceof ButtonInteraction) {
		const result = await interaction.client.db.get(
			`${interaction.guildId}.GUILD.TICKET.${interaction.message.id}`
		);
		let userTickets = (await interaction.client.db.get(
			`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`
		)) as DatabaseStructure.TicketUserData | null;

		if (
			!result ||
			result.channel !== interaction.message.channelId ||
			result.messageID !== interaction.message.id
		)
			return;

		const channelId = userTickets && Object.values(userTickets)[0]?.channel;
		const channel = channelId
			? interaction.guild?.channels.cache.get(channelId) ||
				(await interaction.guild.channels
					.fetch(channelId)
					.catch(() => null))
			: null;

		if (userTickets && !channel) {
			await interaction.client.db.delete(
				`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`
			);
			userTickets = null;
		}

		if (userTickets) {
			await interaction.reply({
				flags: [1 << 6],
				content: (
					await getLanguageData(interaction.guildId)
				).event_ticket_already_opened.replace(
					"${channelId}",
					channelId!
				)
			});
			return;
		} else {
			await CreateChannel(interaction, result);
			return;
		}
	} else {
		const result = await interaction.client.db.get(
			`${interaction.guildId}.GUILD.TICKET.${interaction.message.id}`
		);
		let userTickets = (await interaction.client.db.get(
			`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`
		)) as DatabaseStructure.TicketUserData | null;

		if (
			!result ||
			result.channel !== interaction.message.channelId ||
			result.messageID !== interaction.message.id
		)
			return;

		const channelId = userTickets && Object.values(userTickets)[0]?.channel;
		const channel = channelId
			? interaction.guild?.channels.cache.get(channelId) ||
				(await interaction.guild.channels
					.fetch(channelId)
					.catch(() => null))
			: null;

		if (userTickets && !channel) {
			await interaction.client.db.delete(
				`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`
			);
			userTickets = null;
		}

		if (userTickets) {
			await interaction.reply({
				flags: [1 << 6],
				content: (
					await getLanguageData(interaction.guildId)
				).event_ticket_already_opened.replace(
					"${channelId}",
					channelId!
				)
			});
			return;
		} else {
			await CreateChannel(interaction, result);
			return;
		}
	}
}

type ModalResultArray = {
	questonPlaceholder: string | undefined;
	questionValue: string;
}[];

async function CreateTicketChannelV2(
	interaction:
		StringSelectMenuInteraction<"cached"> | ButtonInteraction<"cached">
) {
	if (await refuseIfDisabled(interaction)) return;

	const panelCode = (await interaction.client.db.get(
		`${interaction.guildId}.GUILD.TICKET_PANEL.${interaction.message.id}`
	)) as string | null;
	const result = (await interaction.client.db.get(
		`${interaction.guildId}.GUILD.TICKET_PANEL.${panelCode}`
	)) as TicketPanel | null;
	if (!result) return;
	let userTickets = (await interaction.client.db.get(
		`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`
	)) as DatabaseStructure.TicketUserData | null;

	const channelId = userTickets && Object.values(userTickets)[0]?.channel;
	const channel = channelId
		? interaction.guild?.channels.cache.get(channelId) ||
			(await interaction.guild.channels
				.fetch(channelId)
				.catch(() => null))
		: null;

	if (userTickets && !channel) {
		await interaction.client.db.delete(
			`${interaction.guildId}.TICKET_ALL.${interaction.user.id}`
		);
		userTickets = null;
	}

	if (userTickets) {
		await interaction.reply({
			flags: [1 << 6],
			content: (
				await getLanguageData(interaction.guildId)
			).event_ticket_already_opened.replace("${channelId}", channelId!)
		});
		return;
	} else {
		await CreateChannelV2(interaction, result);
	}
}

interface ResultButton {
	panelName: string;
	reason?: boolean;
	categoryId?: string;
	selection?: {
		id: number;
		name: string;
		emojis: string;
		categoryId?: string;
	}[];
}

async function CreateChannel(
	interaction:
		ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
	result: ResultButton
) {
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	let category = await interaction.client.db.get(
		`${interaction.message.guildId}.GUILD.TICKET.category`
	);

	if (result.categoryId) category = result.categoryId;

	let reason = "";
	let reasonInteraction: ModalSubmitInteraction<"cached">;

	if (result && result?.reason) {
		const response = await iHorizonModalResolve(
			{
				customId: "ticket_reason_modal",
				title: lang.event_ticket_create_reason_modal_title,
				deferUpdate: false,
				fields: [
					{
						customId: "ticket_reason",
						label: lang.event_ticket_create_reason_modal_fields_1_label,
						style: TextInputStyle.Short,
						required: true,
						maxLength: 350,
						minLength: 8
					}
				]
			},
			interaction
		);

		if (!response) return;
		try {
			reason = response?.fields.getTextInputValue("ticket_reason")!;
			reasonInteraction = response;
		} catch (error) {
			return;
		}
	} else {
		await interaction.deferReply({ flags: [1 << 6] });
	}

	await interaction.guild?.channels
		.create({
			name: `ticket-${interaction.user.username}`,
			type: ChannelType.GuildText,
			parent:
				interaction.guild.channels.cache.get(
					interaction instanceof StringSelectMenuInteraction
						? (result.selection?.find(
								(item) =>
									item.id === parseInt(interaction.values[0])
							)?.categoryId ?? category)
						: category
				)?.id || null
		})
		.then(async (channel) => {
			if (category) {
				channel.lockPermissions();
			}

			await channel.permissionOverwrites.edit(
				interaction.guild?.roles.everyone as Role,
				{
					ViewChannel: false,
					SendMessages: false,
					ReadMessageHistory: false
				}
			);

			await channel.permissionOverwrites.edit(interaction.user.id, {
				ViewChannel: true,
				SendMessages: true,
				ReadMessageHistory: true,
				AttachFiles: true,
				UseApplicationCommands: true,
				SendVoiceMessages: true,
				EmbedLinks: true
			});

			if (interaction instanceof ButtonInteraction) {
				await interaction.editReply({
					content: lang.event_ticket_whenCreated_msg
						.replace("${author}", interaction.user.toString())
						.replace("${channelId}", channel.id)
				});
			} else {
				if (reasonInteraction) {
					await reasonInteraction.reply({
						content: lang.event_ticket_whenCreated_msg
							.replace("${author}", interaction.user.toString())
							.replace("${channelId}", channel.id),
						flags: [1 << 6]
					});
				} else {
					await interaction.editReply({
						content: lang.event_ticket_whenCreated_msg
							.replace("${author}", interaction.user.toString())
							.replace("${channelId}", channel.id)
					});
				}
			}

			const embeds: EmbedBuilder[] = [];

			if (interaction instanceof StringSelectMenuInteraction) {
				embeds.push(
					new EmbedBuilder()
						.setColor(2829617)
						.setDescription(
							lang.sethereticket_panel_select_embed_desc
								.replace("${panelName}", result.panelName)
								.replace(
									"{msg}",
									lang.event_ticket_embed_description.replace(
										"${userUsername}",
										interaction.user.username
									)
								)
								.replace(
									"{category}",
									result.selection?.find(
										(item) =>
											item.id ===
											parseInt(interaction.values[0])
									)?.name!
								)
						)
						.setFooter(
							await interaction.client.func.displayBotName.footerBuilder(
								interaction.guildId!
							)
						)
				);

				if (result.reason && result.reason) {
					embeds.push(
						new EmbedBuilder()
							.setColor(2829617)
							.setDescription(
								lang.event_ticket_reason_embed_desc.replace(
									"${reason}",
									reason
								)
							)
							.setFooter(
								await interaction.client.func.displayBotName.footerBuilder(
									interaction.guildId!
								)
							)
					);
				}
			} else {
				embeds.push(
					new EmbedBuilder()
						.setColor("#3b8f41")
						.setDescription(
							lang.event_ticket_embed_description.replace(
								"${userUsername}",
								interaction.user.username
							)
						)
						.setFooter(
							await interaction.client.func.displayBotName.footerBuilder(
								interaction.guildId!
							)
						)
				);
			}

			await interaction.client.db.set(
				`${interaction.guildId}.TICKET_ALL.${interaction.user.id}.${channel.id}`,
				{
					channel: channel.id,
					author: interaction.user.id,
					alive: true
				}
			);

			const delete_ticket_button = new ButtonBuilder()
				.setCustomId("t-embed-delete-ticket")
				.setEmoji("🗑️")
				.setLabel(lang.ticket_module_button_delete)
				.setStyle(ButtonStyle.Danger);

			const transcript_ticket_button = new ButtonBuilder()
				.setCustomId("t-embed-transcript-ticket")
				.setEmoji("📜")
				.setLabel(lang.ticket_module_button_transcript)
				.setStyle(ButtonStyle.Primary);

			const selectUsersMenu = new UserSelectMenuBuilder()
				.setCustomId("t-embed-select-user")
				.setPlaceholder(
					`${lang.ticket_module_button_addmember} / ${lang.ticket_module_button_removemember}`
				)
				.setMinValues(0)
				.setMaxValues(10);

			(channel as BaseGuildTextChannel)
				.send({
					embeds: embeds,
					content: interaction.user.toString(),
					components: [
						new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
							selectUsersMenu
						),
						new ActionRowBuilder<ButtonBuilder>()
							.addComponents(transcript_ticket_button)
							.addComponents(delete_ticket_button)
					],
					files: [
						await interaction.client.func.displayBotName.footerAttachmentBuilder(
							interaction
						)
					]
				})
				.then(async (msg) => {
					await msg.pin("Ticket Panel").catch(() => {});
				})
				.catch((err: any) => {
					logger.err(err);
				});

			try {
				let TicketLogsChannel = await interaction.client.db.get(
					`${interaction.guildId}.GUILD.TICKET.logs`
				);
				TicketLogsChannel =
					interaction.guild?.channels.cache.get(TicketLogsChannel);
				if (!TicketLogsChannel) return;

				const embed = new EmbedBuilder()
					.setColor("#008000")
					.setTitle(
						lang.event_ticket_logsChannel_onCreationChannel_embed_title
					)
					.setDescription(
						lang.event_ticket_logsChannel_onCreationChannel_embed_desc
							.replace("${author}", interaction.user.toString())
							.replace("${channelId}", channel.id)
					)
					.setFooter(
						await interaction.client.func.displayBotName.footerBuilder(
							interaction.guildId!
						)
					)
					.setTimestamp();

				TicketLogsChannel.send({
					embeds: [embed],
					files: [
						await interaction.client.func.displayBotName.footerAttachmentBuilder(
							interaction
						)
					]
				});
				return;
			} catch (e) {
				return;
			}
		})
		.catch(() => {});
}

async function CreateChannelV2(
	interaction:
		StringSelectMenuInteraction<"cached"> | ButtonInteraction<"cached">,
	result: TicketPanel
) {
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);

	let values: ModalResultArray = [];
	let reasonInteraction: ModalSubmitInteraction<"cached"> | null = null;

	// Simple panels are a single button: no option, no question.
	const selected = interaction.isStringSelectMenu()
		? interaction.values[0]
		: null;
	const simple = selected === null;

	const chosenCategory = selected
		? result.config.optionFields?.find((item) => item.value === selected)
		: undefined;

	const category = chosenCategory?.categoryId || result.category;

	if (chosenCategory?.form?.length! >= 1) {
		const modalFields = chosenCategory?.form!.map((field) => {
			return {
				customId: field.questionId.toString(),
				label: field.questionTitle.substring(0, 45),
				style: TextInputStyle.Short,
				required: true,
				placeHolder: field.questionPlaceholder?.substring(0, 60),
				maxLength: 240,
				minLength: 1
			};
		});

		const modal = await iHorizonModalResolve(
			{
				customId: "ticket_reason_modal",
				title: lang.event_ticket_create_reason_modal_fields_1_label,
				deferUpdate: false,
				fields: modalFields!
			},
			interaction
		);

		if (!modal) return;
		reasonInteraction = modal;

		// get the values from the modal
		values = modal.fields.fields.map((field) => {
			return {
				questonPlaceholder: modalFields!.find(
					(x) => x.customId === field.customId
				)?.label,
				questionValue: modal.fields.getTextInputValue(field.customId)
			};
		});
	} else if (!simple && result.config.form.length >= 1) {
		const modalFields = result.config.form.map((field) => {
			return {
				customId: field.questionId.toString(),
				label: field.questionTitle.substring(0, 45),
				style: TextInputStyle.Short,
				required: true,
				placeHolder: field.questionPlaceholder?.substring(0, 60),
				maxLength: 240,
				minLength: 1
			};
		});

		const modal = await iHorizonModalResolve(
			{
				customId: "ticket_reason_modal",
				title: lang.event_ticket_create_reason_modal_fields_1_label,
				deferUpdate: false,
				fields: modalFields
			},
			interaction
		);

		if (!modal) return;
		reasonInteraction = modal;

		// get the values from the modal
		values = modal.fields.fields.map((field) => {
			return {
				questonPlaceholder: modalFields.find(
					(x) => x.customId === field.customId
				)?.label,
				questionValue: modal.fields.getTextInputValue(field.customId)
			};
		});
	}

	const loadingTarget = reasonInteraction || interaction;
	if (loadingTarget.deferred || loadingTarget.replied) {
		await loadingTarget.editReply({
			content: client.iHorizon_Emojis.Discord_Loading
		});
	} else {
		await loadingTarget.reply({
			content: client.iHorizon_Emojis.Discord_Loading,
			flags: MessageFlags.Ephemeral
		});
	}

	await interaction.guild?.channels
		.create({
			name: `ticket-${interaction.user.username}`,
			type: ChannelType.GuildText,
			parent:
				interaction.guild.channels.cache.get(category || "")?.id || null
		})
		.then(async (channel) => {
			if (category) {
				channel.lockPermissions();
			}

			await channel.permissionOverwrites.edit(
				interaction.guild?.roles.everyone as Role,
				{
					ViewChannel: false,
					SendMessages: false,
					ReadMessageHistory: false
				}
			);

			await channel.permissionOverwrites.edit(interaction.user.id, {
				ViewChannel: true,
				SendMessages: true,
				ReadMessageHistory: true,
				AttachFiles: true,
				UseApplicationCommands: true,
				SendVoiceMessages: true,
				EmbedLinks: true
			});

			if (reasonInteraction) {
				await reasonInteraction.editReply({
					content: lang.event_ticket_whenCreated_msg
						.replace("${author}", interaction.user.toString())
						.replace("${channelId}", channel.id),
					flags: [1 << 6]
				});
			} else {
				await interaction.editReply({
					content: lang.event_ticket_whenCreated_msg
						.replace("${author}", interaction.user.toString())
						.replace("${channelId}", channel.id),
					flags: [1 << 6]
				});
			}

			const embeds: EmbedBuilder[] = [];
			const files: any[] = [];

			const welcome = lang.event_ticket_embed_description.replace(
				"${userUsername}",
				interaction.user.username
			);
			const og_embed = new EmbedBuilder()
				.setColor(2829617)
				.setDescription(
					simple
						? welcome
						: lang.sethereticket_panel_select_embed_desc
								.replace("${panelName}", result.placeholder)
								.replace("{msg}", welcome)
								.replace(
									"{category}",
									chosenCategory?.name ?? ""
								)
				)
				.setFooter(
					await interaction.client.func.displayBotName.footerBuilder(
						interaction.guildId!
					)
				);

			if (chosenCategory?.panelId) {
				var embed_from_db = await metasTable.get(
					`EMBED.${chosenCategory?.panelId}.embedSource`
				);
				// do this hack for replacing category in descriptions, fields ,etc
				embed_from_db = fillEmbedText(
					embed_from_db as APIEmbed | null,
					(text) =>
						client.func.method
							.generateCustomMessagePreview(text, {
								user: interaction.user,
								guild: interaction.guild!,
								guildLocal: interaction.guildLocale
							})
							.replaceAll(
								"{category}",
								chosenCategory?.name ?? ""
							)
				);

				if (embed_from_db) {
					embeds.push(EmbedBuilder.from(embed_from_db));
				} else {
					files.push(
						await interaction.client.func.displayBotName.footerAttachmentBuilder(
							interaction
						)
					);
					embeds.push(og_embed);
				}
			} else if (result.ticketChannelPanel) {
				var embed_from_db = await metasTable.get(
					`EMBED.${result.ticketChannelPanel}.embedSource`
				);
				// do this hack for replacing category in descriptions, fields ,etc
				embed_from_db = fillEmbedText(
					embed_from_db as APIEmbed | null,
					(text) =>
						client.func.method
							.generateCustomMessagePreview(text, {
								user: interaction.user,
								guild: interaction.guild!,
								guildLocal: interaction.guildLocale
							})
							.replaceAll(
								"{category}",
								chosenCategory?.name ?? ""
							)
				);

				if (embed_from_db) {
					embeds.push(EmbedBuilder.from(embed_from_db));
				} else {
					files.push(
						await interaction.client.func.displayBotName.footerAttachmentBuilder(
							interaction
						)
					);
					embeds.push(og_embed);
				}
			} else {
				files.push(
					await interaction.client.func.displayBotName.footerAttachmentBuilder(
						interaction
					)
				);
				embeds.push(og_embed);
			}

			if (values.length > 0) {
				let desc = "";
				for (const x in values) {
					desc += `## ${values[x].questonPlaceholder}\n\`${values[x].questionValue}\`\n`;
				}
				embeds.push(
					new EmbedBuilder()
						.setColor(2829617)
						.setDescription(desc)
						.setFooter(
							await interaction.client.func.displayBotName.footerBuilder(
								interaction.guildId!
							)
						)
				);
			}

			await interaction.client.db.set(
				`${interaction.guildId}.TICKET_ALL.${interaction.user.id}.${channel.id}`,
				{
					channel: channel.id,
					author: interaction.user.id,
					alive: true
				}
			);

			let components: JSONEncodable<APIMessageTopLevelComponent>[] = [];

			const selectUsersMenu = new UserSelectMenuBuilder()
				.setCustomId("t-embed-select-user")
				.setPlaceholder(
					`${lang.ticket_module_button_addmember} / ${lang.ticket_module_button_removemember}`
				)
				.setMinValues(0)
				.setMaxValues(10);

			if (result.config.userSelectPanel !== false) {
				components.push(
					new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
						selectUsersMenu
					)
				);
			}

			let row = new ActionRowBuilder<ButtonBuilder>();

			if (result.config.deleteButton !== false) {
				row.addComponents(
					new ButtonBuilder()
						.setCustomId("t-embed-delete-ticket")
						.setEmoji("🗑️")
						.setLabel(lang.ticket_module_button_delete)
						.setStyle(ButtonStyle.Danger)
				);
			}

			if (result.config.transcriptButton !== false) {
				row.addComponents(
					new ButtonBuilder()
						.setCustomId("t-embed-transcript-ticket")
						.setEmoji("📜")
						.setLabel(lang.ticket_module_button_transcript)
						.setStyle(ButtonStyle.Primary)
				);
			}

			if (row.components.length > 0) components.push(row);

			let content: string = "";

			if (result.config.pingUser) {
				content = interaction.user.toString();
			}

			if (chosenCategory?.rolesToPing) {
				chosenCategory?.rolesToPing.forEach((role) => {
					content += `<@&${role}> `;
				});
			}
			if (result.config.rolesToPing) {
				result.config.rolesToPing.forEach((role) => {
					content += `<@&${role}> `;
				});
			}

			(channel as BaseGuildTextChannel)
				.send({
					embeds: embeds,
					content: content === "" ? undefined : content,
					components,
					files: files,
					allowedMentions: {
						users: result.config.pingUser
							? [interaction.user.id]
							: [],
						// Discord rejects duplicate ids and more than 100.
						roles: [
							...new Set([
								...(chosenCategory?.rolesToPing ?? []),
								...(result.config.rolesToPing ?? [])
							])
						].slice(0, 100)
					}
				})
				.then(async (msg) => {
					await msg.pin("Ticket Panel").catch(() => {});
				})
				.catch((err: any) => {
					logger.err(err);
				});

			try {
				let TicketLogsChannel = await interaction.client.db.get(
					`${interaction.guildId}.GUILD.TICKET.logs`
				);
				TicketLogsChannel =
					interaction.guild?.channels.cache.get(TicketLogsChannel);
				if (!TicketLogsChannel) return;

				const embed = new EmbedBuilder()
					.setColor("#008000")
					.setTitle(
						lang.event_ticket_logsChannel_onCreationChannel_embed_title
					)
					.setDescription(
						lang.event_ticket_logsChannel_onCreationChannel_embed_desc
							.replace("${author}", interaction.user.toString())
							.replace("${channelId}", channel.id)
					)
					.setFooter(
						await interaction.client.func.displayBotName.footerBuilder(
							interaction.guildId!
						)
					)
					.setTimestamp();

				TicketLogsChannel.send({
					embeds: [embed],
					files: [
						await interaction.client.func.displayBotName.footerAttachmentBuilder(
							interaction
						)
					]
				});
				return;
			} catch (e) {
				return;
			}
		})
		.catch((e) => {
			logger.err(e);
		});
}

type TicketFiles = NonNullable<BaseMessageOptions["files"]>;

/** Everything in `TICKET_ALL` for a guild, flattened (`key` = the author key). */
async function listTicketEntries(
	client: Client,
	guildId: string
): Promise<{ key: string; data: DatabaseStructure.TicketChannelData }[]> {
	const all = (await client.db.get(
		`${guildId}.TICKET_ALL`
	)) as DatabaseStructure.TicketData | null;
	const out: { key: string; data: DatabaseStructure.TicketChannelData }[] =
		[];
	if (!all || typeof all !== "object") return out;
	for (const key of Object.keys(all)) {
		const byUser = all[key];
		if (!byUser || typeof byUser !== "object") continue;
		for (const channelId of Object.keys(byUser)) {
			const data = byUser[channelId];
			if (data && typeof data === "object") {
				// The channel id is the key; `channel` mirrors it.
				out.push({ key, data: { ...data, channel: channelId } });
			}
		}
	}
	return out;
}

/** The ticket stored for a channel, with the author key it is filed under. */
async function findTicketByChannel(
	client: Client,
	guildId: string,
	channelId: string | null | undefined
): Promise<{ key: string; data: DatabaseStructure.TicketChannelData } | null> {
	if (!channelId) return null;
	const entries = await listTicketEntries(client, guildId);
	return entries.find((e) => e.data.channel === channelId) ?? null;
}

/** Sends an entry to the ticket log channel (`GUILD.TICKET.logs`), if set. Never throws. */
async function sendTicketLog(
	guild: Guild,
	title: string,
	description: string,
	files: TicketFiles = []
): Promise<void> {
	try {
		const logsId = await guild.client.db.get(
			`${guild.id}.GUILD.TICKET.logs`
		);
		const logs = logsId ? guild.channels.cache.get(logsId) : undefined;
		if (!logs?.isSendable()) return;

		const embed = new EmbedBuilder()
			.setColor("#008000")
			.setTitle(title)
			.setDescription(description)
			.setFooter(
				await guild.client.func.displayBotName.footerBuilder(guild.id)
			)
			.setTimestamp();

		await logs.send({
			embeds: [embed],
			files: [
				await guild.client.func.displayBotName.footerAttachmentBuilder(
					guild
				),
				...files
			]
		});
	} catch {}
}

function interactionUser(interaction: Interaction<"cached"> | Message): User {
	return interaction instanceof Message
		? interaction.author
		: interaction.user;
}

/**
 * /ticket close and the dashboard: full transcript, the author loses access,
 * `notify` gets the transcript, then the log entry. False if the channel
 * permissions could not be changed.
 */
async function closeTicketChannel(
	channel: BaseGuildTextChannel,
	authorId: string,
	actor: User,
	lang: LanguageData,
	notify: (payload: {
		content: string;
		files: TicketFiles;
		embeds: EmbedBuilder[];
	}) => Promise<unknown>
): Promise<boolean> {
	const attachment = await DiscordJSTranscript.create({
		channel: channel as TextBasedChannel,
		limit: -1,
		filename: `${channel.guildId}-transcript.html`,
		footerText: "Exported {number} message{s}",
		poweredBy: false
	});

	const embed = new EmbedBuilder()
		.setDescription(lang.close_title_sourcebin)
		.setColor("#0014a8");

	try {
		await channel.permissionOverwrites.create(
			authorId,
			{
				ViewChannel: false,
				SendMessages: false,
				ReadMessageHistory: false
			},
			{ type: OverwriteType.Member }
		);
	} catch {
		return false;
	}

	await notify({
		content: lang.close_command_work_notify_channel,
		files: [attachment],
		embeds: [embed]
	}).catch(() => null);

	await sendTicketLog(
		channel.guild,
		lang.event_ticket_logsChannel_onClose_embed_title,
		lang.event_ticket_logsChannel_onClose_embed_desc
			.replace("${author}", actor.toString())
			.replace("${channelId}", channel.id),
		[attachment]
	);
	return true;
}

async function CloseTicket(
	interaction: ChatInputCommandInteraction<"cached"> | Message
) {
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const ticket = await findTicketByChannel(
		interaction.client,
		interaction.guildId!,
		interaction.channel?.id
	);
	if (!ticket) return;

	const ok = await closeTicketChannel(
		interaction.channel as BaseGuildTextChannel,
		ticket.data.author,
		interactionUser(interaction),
		lang,
		(payload) =>
			interaction.client.func.method.interactionSend(interaction, payload)
	);
	if (!ok) {
		await interaction.client.func.method.channelSend(
			interaction,
			lang.close_command_error
		);
	}
}

/**
 * Who may delete, transcript or reopen a ticket: its author, administrators
 * and anyone who can manage the ticket channel.
 */
function canManageTicket(
	member: GuildMember,
	channelId: string | null | undefined,
	authorId: string | undefined
): boolean {
	return (
		member.id === authorId ||
		member.permissions.has(PermissionFlagsBits.Administrator) ||
		(!!channelId &&
			member
				.permissionsIn(channelId)
				.has(PermissionFlagsBits.ManageChannels))
	);
}

/**
 * Delete, transcript and reopen actions: ticket author, administrators and
 * staff (anyone who can manage the ticket channel) only, whatever the source
 * (button, slash command or prefix command).
 * Replies with the permission-denied message and returns false otherwise.
 */
async function denyUnlessTicketStaff(
	interaction:
		| ButtonInteraction<"cached">
		| ChatInputCommandInteraction<"cached">
		| Interaction<"cached">
		| Message,
	authorId: string | undefined,
	lang: LanguageData
): Promise<boolean> {
	const channel = interaction.channel;
	const member = interaction.member;
	const allowed = !!member && canManageTicket(member, channel?.id, authorId);

	if (allowed) return true;

	const content = lang.var_doesnt_have_permissions.replace(
		"{permission}",
		"ManageChannels"
	);

	if (interaction instanceof Message) {
		await interaction.client.func.method.interactionSend(interaction, {
			content
		});
	} else if (interaction.isRepliable()) {
		if (interaction.deferred || interaction.replied) {
			// Slash commands are deferred before running.
			await interaction.editReply({ content }).catch(() => {});
		} else {
			await interaction
				.reply({
					content,
					flags: MessageFlags.Ephemeral
				})
				.catch(() => {});
		}
	}
	return false;
}

async function TicketTranscript(interaction: ButtonInteraction<"cached">) {
	const data = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const interactionChannel = interaction.channel;

	if (interactionChannel?.type !== ChannelType.GuildText) return;

	const fetch = await interaction.client.db.get(
		`${interaction.guildId}.TICKET_ALL`
	);

	for (const user in fetch) {
		for (const channel in fetch[user]) {
			if (channel === interaction.channel?.id) {
				if (
					!(await denyUnlessTicketStaff(
						interaction,
						fetch[user][channel]?.author,
						data
					))
				)
					return;

				const attachment = await DiscordJSTranscript.create({
					channel: interactionChannel as TextBasedChannel,
					limit: -1,
					filename: `${interaction.guildId}-transcript.html`,
					footerText: "Exported {number} message{s}",
					poweredBy: false,
					saveImages: true,
					favicon: interaction.client.user.displayAvatarURL({
						size: 512,
						extension: "png"
					})
				});

				const embed = new EmbedBuilder()
					.setDescription(data.close_title_sourcebin)
					.setColor("#0014a8");

				if (interaction.deferred) {
					await interaction.editReply({
						content: data.guildconfig_config_save_check_dm
					});
				} else {
					await interaction.reply({
						content: data.guildconfig_config_save_check_dm,
						flags: [1 << 6]
					});
				}

				await interaction.user
					.send({
						embeds: [embed],
						content: data.transript_command_work,
						files: [attachment]
					})
					.catch(() =>
						interaction.followUp({
							content: data.ticket_transcript_failed_to_send,
							flags: [1 << 6]
						})
					);

				return;
			}
		}
	}
}

/** /ticket remove-member and the dashboard: the user loses access, then the log entry. Throws if Discord refuses. */
async function removeTicketMember(
	channel: BaseGuildTextChannel,
	user: User,
	actor: User,
	lang: LanguageData
): Promise<void> {
	await channel.permissionOverwrites.create(user, {
		ViewChannel: false,
		SendMessages: false,
		ReadMessageHistory: false
	});
	await sendTicketLog(
		channel.guild,
		lang.event_ticket_logsChannel_onRemoveMember_embed_title,
		lang.event_ticket_logsChannel_onRemoveMember_embed_desc
			.replace("${member}", user.toString())
			.replace("${author}", actor.toString())
			.replace("${channelId}", channel.id)
	);
}

async function TicketRemoveMember(
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	member: User
) {
	const data = await interaction.client.func.getLanguageData(
		interaction.guildId
	);

	try {
		await removeTicketMember(
			interaction.channel as BaseGuildTextChannel,
			member,
			interactionUser(interaction),
			data
		);
	} catch {
		await client.func.method.interactionSend(interaction, {
			content: data.remove_command_error
		});
		return;
	}
	await client.func.method.interactionSend(interaction, {
		content: data.remove_command_work.replaceAll(
			"${memberTag}",
			member?.username!
		)
	});
}

/** /ticket add-member and the dashboard: the user gets access, then the log entry. Throws if Discord refuses. */
async function addTicketMember(
	channel: BaseGuildTextChannel,
	user: User,
	actor: User,
	lang: LanguageData
): Promise<void> {
	await channel.permissionOverwrites.create(user, {
		ViewChannel: true,
		SendMessages: true,
		ReadMessageHistory: true
	});
	await sendTicketLog(
		channel.guild,
		lang.event_ticket_logsChannel_onAddMember_embed_title,
		lang.event_ticket_logsChannel_onAddMember_embed_desc
			.replace("${member}", user.toString())
			.replace("${author}", actor.toString())
			.replace("${channelId}", channel.id)
	);
}

async function TicketAddMember(
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	member: User
) {
	const data = await interaction.client.func.getLanguageData(
		interaction.guildId
	);

	if (!member) {
		await client.func.method.interactionSend(interaction, {
			content: data.add_command_error
		});
		return;
	}

	try {
		await addTicketMember(
			interaction.channel as BaseGuildTextChannel,
			member,
			interactionUser(interaction),
			data
		);
	} catch (e) {
		await client.func.method.interactionSend(interaction, {
			content: data.add_command_error
		});
		return;
	}
	await client.func.method.interactionSend(interaction, {
		content: data.add_command_work.replaceAll(
			"${memberTag}",
			member.username
		)
	});
}

/** /ticket open and the dashboard: the author gets access back, then the log entry. Throws if Discord refuses. */
async function reopenTicketChannel(
	channel: BaseGuildTextChannel,
	authorId: string,
	actor: User,
	lang: LanguageData
): Promise<void> {
	await channel.permissionOverwrites.edit(
		authorId,
		{
			ViewChannel: true,
			SendMessages: true,
			AttachFiles: true,
			ReadMessageHistory: true
		},
		{ type: OverwriteType.Member }
	);
	await sendTicketLog(
		channel.guild,
		lang.event_ticket_logsChannel_onReopen_embed_title,
		lang.event_ticket_logsChannel_onReopen_embed_desc
			.replace("${author}", actor.toString())
			.replace("${channelId}", channel.id)
	);
}

async function TicketReOpen(
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData
) {
	const ticket = await findTicketByChannel(
		interaction.client,
		interaction.guildId!,
		interaction.channel?.id
	);
	if (!ticket) return;
	if (!(await denyUnlessTicketStaff(interaction, ticket.data.author, lang)))
		return;

	try {
		await reopenTicketChannel(
			interaction.channel as BaseGuildTextChannel,
			ticket.data.author,
			interactionUser(interaction),
			lang
		);
	} catch (e) {
		await client.func.method.interactionSend(interaction, {
			content: lang.open_command_error
		});
		return;
	}
	await client.func.method.interactionSend(interaction, {
		content: lang.open_command_work.replaceAll(
			"${channel}",
			interaction.channel?.toString()!
		)
	});
}

/**
 * Ticket deletion (slash, prefix, button, dashboard), once the caller checked
 * `canManageTicket`: entry removed, transcript to the logs (and to the author
 * by DM when someone else deletes it), channel deleted. False if the channel
 * could not be deleted.
 */
async function deleteTicketChannel(
	channel: BaseGuildTextChannel,
	ticketKey: string,
	ticketOwnerId: string | undefined,
	actor: User,
	lang: LanguageData
): Promise<boolean> {
	const guild = channel.guild;
	const ticketOwner = ticketOwnerId
		? await guild.client.users.fetch(ticketOwnerId).catch(() => null)
		: null;
	const ticketOwnerMention = ticketOwner?.toString() || `<@${ticketOwnerId}>`;
	const deletedByUserId = actor.id;
	const shouldSendOwnerDm =
		!!ticketOwner && ticketOwnerId !== deletedByUserId;

	await guild.client.db.delete(
		`${guild.id}.TICKET_ALL.${ticketKey}.${channel.id}`
	);

	try {
		const logsId = await guild.client.db.get(
			`${guild.id}.GUILD.TICKET.logs`
		);
		const TicketLogsChannel = logsId
			? guild.channels.cache.get(logsId)
			: undefined;

		if (TicketLogsChannel?.isSendable()) {
			const attachment = await DiscordJSTranscript.create({
				channel: channel as TextBasedChannel,
				limit: -1,
				filename: `${guild.id}-transcript.html`,
				footerText: "Exported {number} message{s}",
				poweredBy: false
			});

			if (shouldSendOwnerDm) {
				await ticketOwner
					.send({
						content: lang.ticket_deleted
							.replace(
								"${ticketOwnerMention}",
								ticketOwnerMention
							)
							.replace("${deletedByUserId}", deletedByUserId),
						files: [attachment]
					})
					.catch(() => null);
			}

			const embed = new EmbedBuilder()
				.setColor("#008000")
				.setTitle(lang.event_ticket_logsChannel_onDelete_embed_title)
				.setDescription(
					lang.event_ticket_logsChannel_onDelete_embed_desc
						.replace("${author}", actor.toString())
						.replace("${channelName}", channel.name)
				)
				.setFooter(
					await guild.client.func.displayBotName.footerBuilder(
						guild.id
					)
				)
				.setTimestamp();
			const deleted = await channel.delete().then(
				() => true,
				() => false
			);

			TicketLogsChannel.send({
				embeds: [embed],
				files: [
					await guild.client.func.displayBotName.footerAttachmentBuilder(
						guild
					),
					attachment
				]
			}).catch(() => null);
			return deleted;
		}
		return await channel.delete().then(
			() => true,
			() => false
		);
	} catch (e) {
		return false;
	}
}

async function TicketDelete(interaction: Interaction<"cached"> | Message) {
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const ticket = await findTicketByChannel(
		interaction.client,
		interaction.guildId!,
		interaction.channel?.id
	);
	if (!ticket) return;
	if (!(await denyUnlessTicketStaff(interaction, ticket.data.author, lang)))
		return;

	await deleteTicketChannel(
		interaction.channel as BaseGuildTextChannel,
		ticket.key,
		ticket.data.author,
		interactionUser(interaction),
		lang
	);
}

async function TicketAddMember_2(
	interaction: UserSelectMenuInteraction<"cached">
) {
	const data = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const owner_ticket = await interaction.client.db.get(
		`${interaction.guildId}.TICKET_ALL.${interaction.user.id}.${interaction.channel?.id}`
	);

	if (!owner_ticket) {
		await interaction.deferUpdate();
		return;
	}

	const membersArray: string[] = [];
	const listmembersArray: string[] = [];

	interaction.members.each(async (i) => {
		membersArray.push(i.user?.id!);
	});

	(interaction.channel as BaseGuildTextChannel).permissionOverwrites.cache
		.filter((i) => i.type === 1)
		.each((i) => {
			listmembersArray.push(i.id);
		});

	const addedMembers: string[] = [];
	const removedMembers: string[] = [];

	listmembersArray.forEach(async (overwriteId) => {
		if (
			!membersArray.includes(overwriteId) &&
			owner_ticket.author !== overwriteId
		) {
			removedMembers.push(overwriteId);
			await (
				interaction.channel as BaseGuildTextChannel
			).permissionOverwrites.delete(overwriteId);
		}
	});

	membersArray.forEach(async (memberId) => {
		if (!listmembersArray.includes(memberId)) {
			(
				interaction.channel as BaseGuildTextChannel
			).permissionOverwrites.edit(memberId, {
				ViewChannel: true,
				SendMessages: true,
				ReadMessageHistory: true,
				AttachFiles: true
			});
			addedMembers.push(memberId);
		}
	});

	if (addedMembers.length > 0) {
		interaction.client.func.method.channelSend(interaction, {
			content: data.event_ticket_add_member
				.replace("${author}", interaction.user.toString())
				.replace(
					"${addedMembers}",
					addedMembers.map((memberId) => `<@${memberId}>`).join(" ")
				)
				.replace("${channel}", interaction.channel!.toString())
		});
	}

	if (removedMembers.length > 0) {
		interaction.client.func.method.channelSend(interaction, {
			content: data.event_ticket_del_member
				.replace("${author}", interaction.user.toString())
				.replace(
					"${removedMembers}",
					removedMembers.map((memberId) => `<@${memberId}>`).join(" ")
				)
				.replace("${channel}", interaction.channel!.toString())
		});
	}
	await interaction.deferUpdate();

	try {
		let TicketLogsChannel = await interaction.client.db.get(
			`${interaction.guildId}.GUILD.TICKET.logs`
		);
		TicketLogsChannel =
			interaction.guild?.channels.cache.get(TicketLogsChannel);
		if (!TicketLogsChannel) return;

		const embed = new EmbedBuilder()
			.setColor("#008000")
			.setTitle(data.event_ticket_logsChannel_onAddMember2_embed_title)
			.setDescription(
				data.event_ticket_logsChannel_onAddMember2_embed_desc
					.replace("${author}", interaction.user.toString())
					.replace(
						"${removedMembers}",
						removedMembers
							.map((memberId) => `<@${memberId}>`)
							.join(" ") || "None"
					)
					.replace(
						"${addedMembers}",
						addedMembers
							.map((memberId) => `<@${memberId}>`)
							.join(" ") || "None"
					)
					.replace("${channel}", interaction.channel?.toString()!)
			)
			.setFooter(
				await interaction.client.func.displayBotName.footerBuilder(
					interaction.guildId!
				)
			)
			.setTimestamp();

		TicketLogsChannel.send({
			embeds: [embed],
			files: [
				await interaction.client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			]
		});
		return;
	} catch (e) {
		return;
	}
}

async function TicketSearch(
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	channelId: string
): Promise<DatabaseStructure.TicketChannelData | null> {
	return (
		(
			await findTicketByChannel(
				interaction.client,
				interaction.guildId!,
				channelId
			)
		)?.data ?? null
	);
}

/**
 * /ticket remind and the dashboard: DMs the ticket author a link to the
 * ticket with the time since their last message. Null if the channel
 * messages could not be read.
 */
async function remindTicketOwner(
	channel: BaseGuildTextChannel,
	authorId: string,
	lang: LanguageData
): Promise<{ owner: GuildMember | null; sent: boolean } | null> {
	const guild = channel.guild;
	const ticketOwner =
		guild.members.cache.get(authorId) ||
		(await guild.members.fetch(authorId).catch(() => null));

	// The last 100 messages.
	const messages = await channel.messages
		.fetch({ limit: 100 })
		.catch(() => null);
	if (!messages) return null;

	// The ticket owner's latest message.
	const lastOwnerMessage = messages
		.filter((x) => x.author.id === ticketOwner?.id)
		.sort((a, b) => b.createdTimestamp - a.createdTimestamp)
		.first();

	const timestamp = lastOwnerMessage?.createdTimestamp;
	const time = timestamp
		? guild.client.timeCalculator.to_beautiful_string(
				Date.now() - timestamp,
				lang
			)
		: lang.var_never;

	const sent = !!(await ticketOwner
		?.send({
			content: `https://discord.com/channels/${guild.id}/${channel.id}`,
			embeds: [
				new EmbedBuilder()
					.setTitle(lang.ticket_remind_embed_title)
					.setDescription(lang.ticket_remind_embed_desc)
					.setFields({
						name: lang.ticket_remind_embed_fields_1_name,
						value: `[${time}](https://discord.com/channels/${guild.id}/${channel.id}/${lastOwnerMessage?.id})`
					})
					.setColor("Red")
					.setFooter(
						await guild.client.func.displayBotName.footerBuilder(
							guild.id
						)
					)
			],
			files: [
				await guild.client.func.displayBotName.footerAttachmentBuilder(
					guild
				)
			]
		})
		.then(() => true)
		.catch(() => false));

	return { owner: ticketOwner ?? null, sent };
}

async function TicketRemind(
	interaction: ChatInputCommandInteraction<"cached"> | Message
) {
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const owner_ticket = await TicketSearch(interaction, interaction.channelId);

	if (!owner_ticket) {
		await client.func.method.interactionSend(interaction, {
			content: lang.open_not_in_ticket
		});
		return;
	}

	const result = await remindTicketOwner(
		interaction.channel as BaseGuildTextChannel,
		owner_ticket.author,
		lang
	);
	if (!result) return; // Exit if we couldn't fetch messages

	if (!result.sent) {
		client.func.method.interactionSend(interaction, {
			content: lang.utils_dm_cant
				.replace("${emoji_No}", client.iHorizon_Emojis.No)
				.replace("${targetMember}", result.owner?.toString()!)
		});
	} else {
		client.func.method.interactionSend(interaction, {
			content: lang.ticket_remind_command_ok
		});
	}
}

/** /ticket rename and the dashboard. False if Discord refuses. */
async function renameTicketChannel(
	channel: BaseGuildTextChannel,
	name: string
): Promise<boolean> {
	return channel.setName(name).then(
		() => true,
		() => false
	);
}

export {
	CloseTicket,
	CreateTicketChannel,
	CreateTicketChannelV2,
	TicketTranscript,
	TicketDelete,
	TicketRemoveMember,
	TicketAddMember,
	TicketReOpen,
	TicketAddMember_2,
	TicketRemind,
	TicketSearch,
	listTicketEntries,
	findTicketByChannel,
	canManageTicket,
	closeTicketChannel,
	addTicketMember,
	removeTicketMember,
	reopenTicketChannel,
	deleteTicketChannel,
	remindTicketOwner,
	renameTicketChannel
};
