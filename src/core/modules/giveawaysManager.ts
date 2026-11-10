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
	time,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	Client,
	BaseGuildTextChannel,
	GuildTextBasedChannel,
	ChatInputCommandInteraction,
	Message,
	ButtonInteraction,
	ColorResolvable,
	Guild,
	GuildMember
} from "discord.js";

import {
	Giveaway,
	GiveawayCreateOptions,
	GiveawayFetch,
	GiveawayRequirementBody,
	GiveawaysManagerOptions
} from "../../../types/giveaways.js";
import getLanguageData from "../functions/getLanguageData.js";
import { LanguageData } from "../../../types/languageData.js";
import { secureRandomInt } from "../functions/random.js";
import db, { dedupeEntries } from "./giveawaysDatabaseManager.js";

export enum GiveawayEndedStatus {
	ENDED = 1,
	NOT_ENDED = 2
}

/**
 * The description of a running giveaway, always built from its data (never
 * by editing the text already posted: that broke on French typography, and
 * on a server that had changed language). Used at creation and on each
 * entry or leave.
 */
export function renderGiveawayDescription(
	lang: LanguageData,
	giveaway: {
		expireIn: Date | string | number;
		hostedBy: string;
		winnerCount: number;
	},
	entries: number
): string {
	const end = new Date(giveaway.expireIn);
	return lang.event_gw_embed_desc
		.replace("${end_string}", time(end, "R"))
		.replace("${end_string2}", time(end, "D"))
		.replace("${winners_amount}", String(giveaway.winnerCount))
		.replace("${hostedBy}", String(giveaway.hostedBy))
		.replace("${entries}", String(entries));
}

class GiveawayManager {
	options: GiveawaysManagerOptions;

	constructor(options: GiveawaysManagerOptions) {
		if (!client.options) {
			throw new Error(`Client is a required option. (val=${client})`);
		}

		this.options = options;

		client.on("interactionCreate", async (interaction) => {
			if (interaction.isButton()) {
				if (interaction.customId === "confirm-entry-giveaway") {
					await this.addEntries(
						interaction as ButtonInteraction<"cached">
					);
				} else if (interaction.customId === "giveaway-list-entries") {
					await this.listEntries(
						interaction as ButtonInteraction<"cached">,
						interaction.message.id
					);
				}
			}
		});
	}

	private isRefreshing = false;

	public init() {
		this.refresh(client);

		setInterval(() => {
			this.refresh(client);
		}, this.options.config?.forceUpdateEvery);
	}

	public create(
		channel: BaseGuildTextChannel,
		data: GiveawayCreateOptions
	): Promise<Message> {
		return new Promise(async (resolve, reject) => {
			try {
				const lang = await getLanguageData(channel.guildId);
				const confirm = new ButtonBuilder()
					.setCustomId("confirm-entry-giveaway")
					.setEmoji(this.options.config.reaction)
					.setStyle(ButtonStyle.Primary);
				const entriesList = new ButtonBuilder()
					.setCustomId("giveaway-list-entries")
					.setLabel(lang.event_gw_entries_button_title)
					.setStyle(ButtonStyle.Secondary);

				const gw = new EmbedBuilder()
					.setColor(
						this.options.config?.embedColor as ColorResolvable
					)
					.setTitle(data.prize)
					.setDescription(
						renderGiveawayDescription(
							lang,
							{
								expireIn: Date.now() + data.duration,
								hostedBy: data.hostedBy,
								winnerCount: data.winnerCount
							},
							0
						)
					)
					.setTimestamp(new Date(Date.now() + data.duration))
					.setFooter(
						await client.func.displayBotName.footerBuilder(
							channel.guildId
						)
					)
					.setImage(data.embedImageURL);

				const response = await channel.client.func.method.channelSend(
					channel,
					{
						embeds: [gw],
						components: [
							new ActionRowBuilder<ButtonBuilder>().addComponents(
								confirm,
								entriesList
							)
						],
						files: [
							await client.func.displayBotName.footerAttachmentBuilder(
								channel.guild
							)
						]
					}
				);

				const requirement = data.requirement;

				await db.Create(
					{
						channelId: response.channelId,
						guildId: response.guildId!,

						winnerCount: data.winnerCount,
						prize: data.prize,
						hostedBy: data.hostedBy,
						expireIn: new Date(Date.now() + data.duration),
						ended: GiveawayEndedStatus.NOT_ENDED,
						entries: [],
						winners: [],
						isValid: true,
						embedImageURL: data.embedImageURL,
						requirement
					},
					response.id
				);

				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	}

	public async addEntries(interaction: ButtonInteraction<"cached">) {
		const giveawayData = await db.GetGiveawayData(interaction.message.id);
		const lang = await getLanguageData(interaction.guildId!);

		if (
			!giveawayData ||
			giveawayData.ended === GiveawayEndedStatus.ENDED ||
			new Date(giveawayData.expireIn).getTime() <= Date.now()
		) {
			await interaction.deferUpdate().catch(() => {});
			return;
		}

		if (giveawayData?.entries?.includes(interaction.user.id)) {
			await this.removeEntries(interaction);
			return;
		} else {
			if (giveawayData?.requirement.type !== "none") {
				let reqPass: boolean = false;
				switch (giveawayData?.requirement.type) {
					case "invites":
						reqPass =
							(await interaction.client.db.get(
								`${interaction.guildId}.USER.${interaction.member?.user.id}.INVITES.invites`
							)) >= parseInt(giveawayData.requirement.value!);
						break;
					case "messages":
						reqPass =
							(
								((await interaction.client.db.get(
									`${interaction.guildId}.STATS.USER.${interaction.member?.user.id}.messages`
								)) || []) as string[]
							).length >=
							parseInt(giveawayData.requirement.value!);
						break;
					case "roles":
						reqPass = (
							interaction.member as GuildMember
						)?.roles.cache.has(giveawayData.requirement.value!);
						break;
				}
				if (!reqPass) {
					return interaction.reply({
						content: lang.event_gw_break_req
							.replace(
								"${requirementValue}",
								String(giveawayData?.requirement.value)
							)
							.replace(
								"${requirementType}",
								String(giveawayData?.requirement.type)
							)
							.replace(
								"${emoji_No}",
								interaction.client.iHorizon_Emojis.No
							),
						flags: [1 << 6]
					});
				}
			}

			await interaction.deferUpdate();

			const entryCount = await db.AddEntries(
				interaction.message.id,
				interaction.user.id
			);
			if (entryCount === null) return;

			const embedsToEdit = EmbedBuilder.from(
				interaction.message.embeds[0]
			)
				.setDescription(
					renderGiveawayDescription(lang, giveawayData, entryCount)
				)
				.setFooter(
					await client.func.displayBotName.footerBuilder(
						interaction.guild.id
					)
				);

			await interaction.message
				.edit({ embeds: [embedsToEdit] })
				.catch(() => {});

			return;
		}
	}

	private async removeEntries(interaction: ButtonInteraction<"cached">) {
		const lang = await getLanguageData(interaction.guildId!);

		const prompt = await interaction.reply({
			content: lang.event_gw_confirm_leave_msg.replace(
				"${author}",
				interaction.user.toString()
			),
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("giveaway-leave")
						.setStyle(ButtonStyle.Danger)
						.setLabel(lang.event_gw_leave_button_placeholder)
				)
			],
			flags: [1 << 6],
			withResponse: true
		});
		const promptMessage = prompt.resource?.message;
		if (!promptMessage) return;

		const collector = promptMessage.createMessageComponentCollector({
			time: 60_000,
			filter: (i) => interaction.user.id === i.user.id
		});

		collector.on("collect", async (i: ButtonInteraction<"cached">) => {
			if (i.customId === "giveaway-leave") {
				collector.stop("left");
				const now_members = await db.RemoveEntries(
					interaction.message.id,
					interaction.user.id
				);
				const giveaway = await db.GetGiveawayData(
					interaction.message.id
				);
				if (!giveaway) return;
				const embedsToEdit = EmbedBuilder.from(
					interaction.message.embeds[0]
				)
					.setDescription(
						renderGiveawayDescription(
							lang,
							giveaway,
							now_members.length
						)
					)
					.setFooter(
						await client.func.displayBotName.footerBuilder(
							interaction.guild.id
						)
					);

				await interaction.message
					.edit({ embeds: [embedsToEdit] })
					.catch(() => {});
				await i
					.update({
						components: [],
						content: lang.event_gw_removeentries_msg.replace(
							"${author}",
							interaction.user.toString()
						)
					})
					.catch(() => {});

				return;
			}
		});

		collector.on("end", async (_collected, reason) => {
			if (reason === "left") return;
			await interaction.deleteReply().catch(() => {});
		});
	}

	public isValid(giveawayId: string): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			try {
				const fetch = await db.GetGiveawayData(giveawayId);

				if (fetch) {
					resolve(true);
				} else {
					resolve(false);
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	public isEnded(giveawayId: string): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			try {
				const fetch = await db.GetGiveawayData(giveawayId);

				if (fetch?.ended === GiveawayEndedStatus.ENDED) {
					resolve(true);
				} else {
					resolve(false);
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	end(client: Client, giveawayId: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				const giveawayData = (await db.GetGiveawayData(giveawayId))!;

				if (!client.inShard(giveawayData.guildId)) {
					resolve();
					return;
				}

				if (
					giveawayData.isValid &&
					giveawayData.ended === GiveawayEndedStatus.NOT_ENDED
				) {
					await db.SetEnded(giveawayId, GiveawayEndedStatus.ENDED);
					await this.finish(
						client,
						giveawayId,
						giveawayData.guildId,
						giveawayData.channelId
					);
					resolve();
				} else {
					reject(new Error("Invalid Giveaway"));
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	public async finish(
		client: Client,
		giveawayId: string,
		guildId: string,
		channelId: string
	) {
		try {
			if (!client.inShard(guildId)) return;

			const lang = await getLanguageData(guildId);

			const fetch = await db.GetGiveawayData(giveawayId);

			if (!fetch) return;

			const guild = await client.guilds
				.fetch(guildId)
				.catch(() => undefined);
			if (!guild) return;

			const winner = this.selectWinners(
				{ entries: fetch.entries, winners: fetch.winners },
				fetch.winnerCount
			);

			await db.SetEnded(giveawayId, GiveawayEndedStatus.ENDED);
			await db.SetWinners(giveawayId, winner || "None");

			const channel = await guild.channels.fetch(channelId).catch(() => {
				this.delete(giveawayId);
			});

			const message = (await (channel as GuildTextBasedChannel).messages
				.fetch(giveawayId)
				.catch(async () => {
					await this.delete(giveawayId);
					return;
				})) as Message;

			const winners = winner
				? winner.map((winner: string) => `<@${winner}>`).join(",")
				: null;

			const Finnish = new ButtonBuilder()
				.setLabel(lang.event_gw_finnish_button_title)
				.setURL(
					"https://media.tenor.com/uO4u0ib3oK0AAAAC/done-and-done-spongebob.gif"
				)
				.setStyle(ButtonStyle.Link);

			const embeds = new EmbedBuilder()
				.setColor(this.options.config.embedColorEnd as ColorResolvable)
				.setTitle(fetch.prize)
				.setImage(fetch.embedImageURL)
				.setDescription(
					lang.event_gw_ended_embed_desc
						.replace(
							"${time1}",
							time(new Date(fetch.expireIn), "R")
						)
						.replace(
							"${time2}",
							time(new Date(fetch.expireIn), "D")
						)
						.replace("${hostedBy}", fetch.hostedBy)
						.replace(
							"${entrieCount}",
							fetch.entries.length.toString()
						)
						.replace(
							"${winners}",
							winners || lang.setjoinroles_var_none
						)
				)
				.setTimestamp()
				.setFooter(
					await client.func.displayBotName.footerBuilder(
						message.guildId!
					)
				);

			await message?.edit({
				embeds: [embeds],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(Finnish)
				]
			});

			if (winners) {
				await message?.reply({
					content: lang.event_gw_reroll_win_msg
						.replace("${winners}", winners.toString())
						.replace("${prize}", fetch.prize)
				});
				return;
			} else {
				await message?.reply({
					content: lang.event_gw_finnish_cannot_msg
				});
				return;
			}
		} catch (e) {
			logger.err(e);
		}
	}

	private selectWinners(fetch: GiveawayFetch, number: number): string[] {
		if (fetch.entries.length === 0) return [];

		const availableMembers = dedupeEntries(
			fetch.entries as string[]
		).filter((entry) => !fetch.winners.includes(entry));

		const winners: string[] = [];

		for (let i = 0; i < number; i++) {
			if (availableMembers.length === 0) break;

			const randomIndex = secureRandomInt(0, availableMembers.length - 1);
			winners.push(availableMembers.splice(randomIndex, 1)[0]);
		}

		return winners;
	}

	public reroll(client: Client, giveawayId: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				const fetch = (await db.GetGiveawayData(giveawayId))!;

				const guild = await client.guilds.fetch(fetch.guildId);
				const channel = await guild.channels.fetch(fetch.channelId);

				const lang = await getLanguageData(guild.id);

				const message = (await (
					channel as BaseGuildTextChannel
				).messages
					.fetch(giveawayId)
					.catch(async () => {
						await this.delete(giveawayId);
						resolve();
						return;
					})) as Message;

				const winner = this.selectWinners(
					{ entries: fetch.entries, winners: fetch.winners },
					fetch.winnerCount
				);

				const winners = winner
					? winner.map((winner: string) => `<@${winner}>`)
					: [];
				const ended = time(new Date(fetch.expireIn), "R");
				const time2 = time(new Date(fetch.expireIn), "D");
				const hostedBy = fetch.hostedBy;
				const entries = fetch.entries.length.toString();

				const embeds = new EmbedBuilder()
					.setColor(
						this.options.config.embedColorEnd as ColorResolvable
					)
					.setTitle(fetch.prize)
					.setImage(fetch.embedImageURL)
					.setDescription(
						lang.event_gw_ended_word
							.replace("${winners}", winners.toString())
							.replace("${ended}", ended)
							.replace("${time2}", time2)
							.replace("${hostedBy}", hostedBy)
							.replace("${entries}", entries)
					)
					.setTimestamp()
					.setFooter(
						await client.func.displayBotName.footerBuilder(
							message.guild?.id!
						)
					);

				await message?.edit({
					embeds: [embeds],
					files: [
						await client.func.displayBotName.footerAttachmentBuilder(
							message.guild!
						)
					]
				});

				if (winner.length > 0 && winner[0] !== "None") {
					await client.func.method.reply(message, {
						content: lang.event_gw_reroll_win_msg
							.replace("${winners}", winners.toString())
							.replace("${prize}", fetch.prize)
					});
				} else {
					await client.func.method.reply(message, {
						content: lang.event_gw_finnish_cannot_msg
					});
				}

				await db.SetWinners(giveawayId, winner || "None");
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	public async listEntries(
		interaction:
			| ChatInputCommandInteraction<"cached">
			| ButtonInteraction<"cached">
			| Message,
		giveawayId: string
	) {
		const fetch = (await db.GetGiveawayData(giveawayId))!;
		const lang = await getLanguageData(fetch.guildId);

		if (interaction.guildId === fetch.guildId) {
			const char: string[] = fetch.entries;

			if (char.length == 0) {
				if (interaction instanceof ChatInputCommandInteraction) {
					await interaction.editReply({
						content: lang.history_no_entries
					});
				} else if (interaction instanceof ButtonInteraction) {
					await interaction.reply({
						content: lang.history_no_entries,
						flags: [1 << 6]
					});
				} else {
					await interaction.edit({
						content: lang.history_no_entries
					});
				}
				return;
			}

			let currentPage = 0;
			const usersPerPage = 10;
			const pages: { title: string; description: string }[] = [];

			for (let i = 0; i < char.length; i += usersPerPage) {
				const pageUsers = char.slice(i, i + usersPerPage);
				const pageContent = pageUsers
					.map((userId, index) => `${i + index + 1}. <@${userId}>`)
					.join("\n");
				pages.push({
					title: lang.event_gw_entries_button_title,
					description: pageContent
				});
			}

			const createEmbed = async () => {
				return new EmbedBuilder()
					.setColor(this.options.config.embedColor as ColorResolvable)
					.setTitle(pages[currentPage].title)
					.setDescription(pages[currentPage].description)
					.setFooter(
						await client.func.displayBotName.footerPaginationBuilder(
							interaction.guildId!,
							lang,
							currentPage + 1,
							pages.length
						)
					)
					.setTimestamp();
			};

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId("previousPage")
					.setLabel("<<<")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("nextPage")
					.setLabel(">>>")
					.setStyle(ButtonStyle.Secondary)
			);
			const components =
				pages.length > 1
					? [row as ActionRowBuilder<ButtonBuilder>]
					: [];

			if (interaction instanceof ChatInputCommandInteraction) {
				var messageEmbed = await interaction.editReply({
					embeds: [await createEmbed()],
					components
				});
			} else if (interaction instanceof ButtonInteraction) {
				await interaction.reply({
					embeds: [await createEmbed()],
					components,
					flags: [1 << 6]
				});
				var messageEmbed = await interaction.fetchReply();
			} else {
				var messageEmbed = (await interaction.reply({
					embeds: [await createEmbed()],
					components
				})) as Message<true>;
			}

			if (pages.length <= 1) {
				return;
			}

			const collector = messageEmbed.createMessageComponentCollector({
				filter: (i) => interaction.member?.user.id === i.user.id,
				time: 60_000 * 15
			});

			collector.on("collect", async (i: ButtonInteraction) => {
				if (i.customId === "previousPage") {
					currentPage =
						(currentPage - 1 + pages.length) % pages.length;
				} else if (i.customId === "nextPage") {
					currentPage = (currentPage + 1) % pages.length;
				}

				await i.update({ embeds: [await createEmbed()] });
			});

			collector.on("end", async () => {
				row.components.forEach((component) => {
					if (component instanceof ButtonBuilder) {
						component.setDisabled(true);
					}
				});

				try {
					await messageEmbed.edit({
						components: [row as ActionRowBuilder<ButtonBuilder>]
					});
				} catch {}
			});
		}
	}

	private async refresh(client: Client) {
		// Passes never overlap: a slow pass would announce winners twice
		if (this.isRefreshing) return;
		this.isRefreshing = true;

		try {
			await this.refreshAll(client);
		} catch (error) {
			logger.err(error);
		} finally {
			this.isRefreshing = false;
		}
	}

	private async refreshAll(client: Client) {
		const drop_all_db = await db.GetAllGiveawaysData();

		for (const giveawayId in drop_all_db) {
			const { giveawayData } = drop_all_db[giveawayId];

			if (!client.inShard(giveawayData.guildId)) continue;

			const now = new Date().getTime();
			const gwExp = new Date(giveawayData.expireIn).getTime();
			const cooldownTime = now - gwExp;

			await db.AvoidDoubleEntries(drop_all_db[giveawayId].giveawayId);

			if (
				now >= gwExp &&
				giveawayData.ended === GiveawayEndedStatus.NOT_ENDED
			) {
				await this.finish(
					client,
					drop_all_db[giveawayId].giveawayId,
					giveawayData.guildId,
					giveawayData.channelId
				);
			}

			if (cooldownTime >= this.options.config.endedGiveawaysLifetime) {
				await this.delete(drop_all_db[giveawayId].giveawayId);
			}
		}
	}

	public getGiveawayData(giveawayId: string): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				const fetch = await db.GetGiveawayData(giveawayId);

				if (fetch) {
					resolve(fetch);
				} else {
					reject(new Error("Giveaway non trouvé"));
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	public async getAllGiveawayData() {
		return await db.GetAllGiveawaysData();
	}

	public delete(giveawayId: string): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			try {
				if (await this.isValid(giveawayId)) {
					await db.DeleteGiveaway(giveawayId);
					resolve(true);
				} else {
					reject(new Error("Giveaway non valide"));
				}
			} catch (error) {
				reject(error);
			}
		});
	}
}
export { GiveawayManager };

/** A giveaway of this guild, or null (unknown id, other guild). */
export async function getGuildGiveaway(
	client: Client,
	guildId: string,
	giveawayId: string
): Promise<Giveaway | null> {
	const giveaway = (await client.giveawaysManager
		.getGiveawayData(giveawayId)
		.catch(() => null)) as Giveaway | null;
	return giveaway && giveaway.guildId === guildId ? giveaway : null;
}

export type GiveawayOptionError =
	"winners" | "duration" | "invites" | "messages" | "roles";

/** The checks of `/gw create`, in its order (the caller words the error). */
export function checkGiveawayOptions(
	client: Client,
	guild: Guild,
	options: {
		winnerCount: number;
		durationMs: number | null | undefined;
		requirement: GiveawayRequirementBody;
	}
): GiveawayOptionError | null {
	const { winnerCount, durationMs, requirement } = options;
	if (isNaN(winnerCount) || parseInt(winnerCount.toString()) <= 0) {
		return "winners";
	}
	if (!durationMs) return "duration";

	const value = requirement.value || "";
	if (requirement.type === "invites" && !client.func.method.isNumber(value)) {
		return "invites";
	}
	if (
		requirement.type === "messages" &&
		!client.func.method.isNumber(value)
	) {
		return "messages";
	}
	if (requirement.type === "roles" && !guild.roles.cache.has(value)) {
		return "roles";
	}
	return null;
}

/** Posts and saves a giveaway like `/gw create` (prize cut, image checked). */
export async function startGiveaway(
	client: Client,
	channel: BaseGuildTextChannel,
	options: {
		winnerCount: number;
		durationMs: number;
		prize: string | null | undefined;
		hostedBy: string;
		imageUrl: string | null | undefined;
		requirement: GiveawayRequirementBody;
	}
): Promise<Message> {
	const imageUrl = options.imageUrl || "";
	return client.giveawaysManager.create(channel, {
		duration: options.durationMs,
		prize: (options.prize || "").substring(0, 256),
		winnerCount: options.winnerCount,
		hostedBy: options.hostedBy,
		embedImageURL: (await client.func.mediaManipulation.isImageUrl(
			imageUrl
		))
			? imageUrl
			: null,
		requirement: options.requirement
	});
}
