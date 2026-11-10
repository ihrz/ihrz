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
	PermissionFlagsBits
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

async function CloseTicket(
	interaction: ChatInputCommandInteraction<"cached"> | Message
) {
	const data = await interaction.client.func.getLanguageData(
		interaction.guildId
	);

	const fetch = await interaction.client.db.get(
		`${interaction.guildId}.TICKET_ALL`
	);

	for (const user in fetch) {
		for (const channel in fetch[user]) {
			if (channel === interaction.channel?.id) {
				const member = interaction.guild?.members.cache.get(
					fetch[user][channel]?.author
				);

				const attachment = await DiscordJSTranscript.create({
					channel: interaction.channel as TextBasedChannel,
					limit: -1,
					filename: `${interaction.guildId}-transcript.html`,
					footerText: "Exported {number} message{s}",
					poweredBy: false
				});

				const embed = new EmbedBuilder()
					.setDescription(data.close_title_sourcebin)
					.setColor("#0014a8");

				try {
					(
						interaction.channel as BaseGuildTextChannel
					).permissionOverwrites.create(member?.user as User, {
						ViewChannel: false,
						SendMessages: false,
						ReadMessageHistory: false
					});
					client.func.method.interactionSend(interaction, {
						content: data.close_command_work_notify_channel,
						files: [attachment],
						embeds: [embed]
					});
				} catch {
					await interaction.client.func.method.channelSend(
						interaction,
						data.close_command_error
					);
					return;
				}

				try {
					let TicketLogsChannel = await interaction.client.db.get(
						`${interaction.guildId}.GUILD.TICKET.logs`
					);
					TicketLogsChannel =
						interaction.guild?.channels.cache.get(
							TicketLogsChannel
						);
					if (!TicketLogsChannel) return;

					const embed = new EmbedBuilder()
						.setColor("#008000")
						.setTitle(
							data.event_ticket_logsChannel_onClose_embed_title
						)
						.setDescription(
							data.event_ticket_logsChannel_onClose_embed_desc
								.replace(
									"${author}",
									interaction.member?.user.toString()!
								)
								.replace(
									"${channelId}",
									interaction.channel?.id!
								)
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
							attachment,
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
		}
	}
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
	const userId = member?.user.id;
	const allowed =
		(!!userId && userId === authorId) ||
		(!!member &&
			(member.permissions.has(PermissionFlagsBits.Administrator) ||
				(!!channel &&
					member
						.permissionsIn(channel.id)
						.has(PermissionFlagsBits.ManageChannels))));

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

async function TicketRemoveMember(
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	member: User
) {
	const data = await interaction.client.func.getLanguageData(
		interaction.guildId
	);

	try {
		(
			interaction.channel as BaseGuildTextChannel
		)?.permissionOverwrites.create(member as User, {
			ViewChannel: false,
			SendMessages: false,
			ReadMessageHistory: false
		});
		client.func.method.interactionSend(interaction, {
			content: data.remove_command_work.replaceAll(
				"${memberTag}",
				member?.username!
			)
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
					data.event_ticket_logsChannel_onRemoveMember_embed_title
				)
				.setDescription(
					data.event_ticket_logsChannel_onRemoveMember_embed_desc
						.replace("${member}", member?.toString()!)
						.replace(
							"${author}",
							interaction.member?.user.toString()!
						)
						.replace("${channelId}", interaction.channel?.id!)
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
	} catch {
		await client.func.method.interactionSend(interaction, {
			content: data.remove_command_error
		});
		return;
	}
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
		(
			interaction.channel as BaseGuildTextChannel
		).permissionOverwrites.create(member, {
			ViewChannel: true,
			SendMessages: true,
			ReadMessageHistory: true
		});
		await client.func.method.interactionSend(interaction, {
			content: data.add_command_work.replaceAll(
				"${memberTag}",
				member.username
			)
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
				.setTitle(data.event_ticket_logsChannel_onAddMember_embed_title)
				.setDescription(
					data.event_ticket_logsChannel_onAddMember_embed_desc
						.replace("${member}", member.toString())
						.replace(
							"${author}",
							interaction.member?.user.toString()!
						)
						.replace("${channelId}", interaction.channel?.id!)
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
	} catch (e) {
		await client.func.method.interactionSend(interaction, {
			content: data.add_command_error
		});
		return;
	}
}

async function TicketReOpen(
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData
) {
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
						lang
					))
				)
					return;

				const member = interaction.guild?.members.cache.get(
					fetch[user][channel]?.author
				);

				try {
					(
						interaction.channel as BaseGuildTextChannel
					).permissionOverwrites
						.edit(member?.user.id!, {
							ViewChannel: true,
							SendMessages: true,
							AttachFiles: true,
							ReadMessageHistory: true
						})
						.then(() => {
							client.func.method.interactionSend(interaction, {
								content: lang.open_command_work.replaceAll(
									"${channel}",
									interaction.channel?.toString()!
								)
							});
							return;
						});

					try {
						let TicketLogsChannel = await interaction.client.db.get(
							`${interaction.guildId}.GUILD.TICKET.logs`
						);
						TicketLogsChannel =
							interaction.guild?.channels.cache.get(
								TicketLogsChannel
							);
						if (!TicketLogsChannel) return;

						const embed = new EmbedBuilder()
							.setColor("#008000")
							.setTitle(
								lang.event_ticket_logsChannel_onReopen_embed_title
							)
							.setDescription(
								lang.event_ticket_logsChannel_onReopen_embed_desc
									.replace(
										"${author}",
										interaction.member?.user.toString()!
									)
									.replace(
										"${channelId}",
										interaction.channel.id
									)
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
				} catch (e) {
					await client.func.method.interactionSend(interaction, {
						content: lang.open_command_error
					});
					return;
				}
			}
		}
	}
}

async function TicketDelete(interaction: Interaction<"cached"> | Message) {
	const data = await interaction.client.func.getLanguageData(
		interaction.guildId
	);
	const fetch = await interaction.client.db.get(
		`${interaction.guildId}.TICKET_ALL`
	);
	const lang = await client.func.getLanguageData(interaction.guildId);

	for (const user in fetch) {
		for (const channel in fetch[user]) {
			if (channel === interaction.channel?.id) {
				const ticketOwnerId = fetch[user][channel]?.author;
				const ticketOwner = ticketOwnerId
					? await interaction.client.users
							.fetch(ticketOwnerId)
							.catch(() => null)
					: null;
				const ticketOwnerMention =
					ticketOwner?.toString() || `<@${ticketOwnerId}>`;
				if (
					!(await denyUnlessTicketStaff(
						interaction,
						ticketOwnerId,
						lang
					))
				)
					return;

				const deletedByUserId = interaction.member?.user.id;
				const shouldSendOwnerDm =
					!!ticketOwner &&
					!!deletedByUserId &&
					ticketOwnerId !== deletedByUserId;

				await interaction.client.db.delete(
					`${interaction.guildId}.TICKET_ALL.${user}.${channel}`
				);

				try {
					let TicketLogsChannel = await interaction.client.db.get(
						`${interaction.guildId}.GUILD.TICKET.logs`
					);
					TicketLogsChannel =
						interaction.guild?.channels.cache.get(
							TicketLogsChannel
						);

					if (TicketLogsChannel) {
						const attachment = await DiscordJSTranscript.create({
							channel: interaction.channel as TextBasedChannel,
							limit: -1,
							filename: `${interaction.guildId}-transcript.html`,
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
										.replace(
											"${deletedByUserId}",
											deletedByUserId
										),
									files: [attachment]
								})
								.catch(() => null);
						}

						const embed = new EmbedBuilder()
							.setColor("#008000")
							.setTitle(
								data.event_ticket_logsChannel_onDelete_embed_title
							)
							.setDescription(
								data.event_ticket_logsChannel_onDelete_embed_desc
									.replace(
										"${author}",
										interaction.member?.user.toString()!
									)
									.replace(
										"${channelName}",
										(
											interaction.channel as BaseGuildTextChannel
										)?.name
									)
							)
							.setFooter(
								await interaction.client.func.displayBotName.footerBuilder(
									interaction.guildId!
								)
							)
							.setTimestamp();
						interaction.channel.delete();

						TicketLogsChannel.send({
							embeds: [embed],
							files: [
								await interaction.client.func.displayBotName.footerAttachmentBuilder(
									interaction
								),
								attachment
							]
						});
					} else {
						await interaction.channel.delete();
					}
					return;
				} catch (e) {
					return;
				}
			}
		}
	}
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
	const tickets = await interaction.client.db.get(
		`${interaction.guildId}.TICKET_ALL`
	);

	if (!tickets) return null;

	for (const userTickets of Object.values(tickets) as Record<
		string,
		DatabaseStructure.TicketChannelData
	>[]) {
		if (channelId in userTickets) {
			return userTickets[channelId];
		}
	}

	return null;
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

	let ticketOwner =
		interaction.guild?.members.cache.get(owner_ticket.author) ||
		(await interaction.guild?.members
			.fetch(owner_ticket.author)
			.catch(() => null));

	// Fetch messages properly - get the last 100 messages
	let messages = await interaction.channel?.messages
		.fetch({ limit: 100 })
		.catch(() => null);

	if (!messages) return; // Exit if we couldn't fetch messages

	// Filter to get only messages from the ticket owner
	let lastOwnerMessage = messages
		.filter((x) => x.author.id === ticketOwner?.id)
		.sort((a, b) => b.createdTimestamp - a.createdTimestamp)
		.first();

	let timestamp = lastOwnerMessage?.createdTimestamp;
	let time = timestamp
		? interaction.client.timeCalculator.to_beautiful_string(
				Date.now() - timestamp,
				lang
			)
		: lang.var_never;

	let Success = await ticketOwner
		?.send({
			content: `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`,
			embeds: [
				new EmbedBuilder()
					.setTitle(lang.ticket_remind_embed_title)
					.setDescription(lang.ticket_remind_embed_desc)
					.setFields({
						name: lang.ticket_remind_embed_fields_1_name,
						value: `[${time}](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${lastOwnerMessage?.id})`
					})
					.setColor("Red")
					.setFooter(
						await client.func.displayBotName.footerBuilder(
							interaction.guildId!
						)
					)
			],
			files: [
				await client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			]
		})
		.then(() => true)
		.catch(() => false);

	if (!Success) {
		client.func.method.interactionSend(interaction, {
			content: lang.utils_dm_cant
				.replace("${emoji_No}", client.iHorizon_Emojis.No)
				.replace("${targetMember}", ticketOwner?.toString()!)
		});
	} else {
		client.func.method.interactionSend(interaction, {
			content: lang.ticket_remind_command_ok
		});
	}
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
	TicketSearch
};
