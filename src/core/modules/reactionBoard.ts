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
	Client,
	EmbedBuilder,
	MessageReaction,
	TextChannel,
	User
} from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

/**
 * What really differs between the starboard and the skullboard. Everything
 * else (guards, threshold, in-flight guard, embed layout, language keys) is
 * shared.
 */
export interface ReactionBoardConfig {
	/** Reaction emoji that feeds the board. */
	emoji: string;
	/** Embed color. */
	color: `#${string}`;
	/** Key under `<guildId>.GUILD`: the config is `<dbKey>`, the posts are `<dbKey>_DATA`. */
	dbKey: "STARBOARD" | "SKULLBOARD";
	/** Name used in log messages only. */
	label: string;
	/**
	 * Add handler order: true fetches the partial reaction and message before
	 * the guild check (starboard), false checks the guild first and fetches
	 * only once the board channel is known to be usable (skullboard).
	 */
	fetchPartialsFirst: boolean;
	/**
	 * Remove handler: true looks the board message up in the channel cache
	 * before fetching it (starboard), false always fetches it (skullboard).
	 */
	cacheBoardMessage: boolean;
}

export interface ReactionBoard {
	onAdd: (
		client: Client,
		reaction: MessageReaction,
		user: User
	) => Promise<void>;
	onRemove: (
		client: Client,
		reaction: MessageReaction,
		user: User
	) => Promise<void>;
}

async function buildEmbed(
	client: Client,
	reaction: MessageReaction,
	color: `#${string}`
) {
	const guildId = reaction.message.guild!.id;
	const lang = await client.func.getLanguageData(guildId);
	const messageURL = client.func.getMessageURL(
		guildId,
		reaction.message.channelId,
		reaction.message.id
	);

	const embed = new EmbedBuilder()
		.setColor(color)
		.setAuthor({
			name: reaction.message.author?.tag || lang.var_unknown,
			iconURL: reaction.message.author?.displayAvatarURL() || undefined
		})
		.setDescription(
			reaction.message.content?.substring(0, 2000) || lang.var_none
		)
		.addFields({
			name: lang.var_original_message,
			value: `[${lang.var_click_here}](${messageURL})`
		})
		.setTimestamp(reaction.message.createdAt)
		.setFooter(await client.func.displayBotName.footerBuilder(guildId));

	// Add image if present
	const attachment = reaction.message.attachments.first();
	if (attachment && attachment.contentType?.startsWith("image/")) {
		embed.setImage(attachment.url);
	}

	return { embed, lang };
}

/**
 * Builds the messageReactionAdd / messageReactionRemove handlers of one
 * board. Each board owns its own in-flight sets: they are not shared between
 * the starboard and the skullboard.
 */
export function createReactionBoard(
	config: ReactionBoardConfig
): ReactionBoard {
	const { emoji, color, dbKey, label } = config;

	// Messages being posted or updated right now: concurrent reactions at the
	// threshold would otherwise both read the data before either writes it.
	const inFlight = new Set<string>();
	// A reaction that arrived during a pass: one more pass runs right after it,
	// so the posted count always ends up right (several reactions, one pass).
	const pending = new Set<string>();

	async function fetchPartials(reaction: MessageReaction) {
		if (reaction.partial) {
			await reaction.fetch().catch(() => null);
		}

		if (reaction.message.partial) {
			await reaction.message.fetch().catch(() => null);
		}
	}

	async function resolveChannel(reaction: MessageReaction, id: string) {
		const guild = reaction.message.guild!;
		const channel =
			guild.channels.cache.get(id) ||
			(await guild.channels.fetch(id).catch(() => null));
		return channel instanceof TextChannel ? channel : null;
	}

	async function onAdd(
		client: Client,
		reaction: MessageReaction,
		user: User
	): Promise<void> {
		let flightKey: string | null = null;

		try {
			// Guard clauses
			if (user.bot || reaction.emoji.name !== emoji) return;

			if (config.fetchPartialsFirst) {
				await fetchPartials(reaction);
			}

			if (!reaction.message.guild) return;

			// Avoid to handle bot's message
			if (reaction.message.author?.bot) return;

			const guildId = reaction.message.guild.id;
			const baseData: DatabaseStructure.StarboardConfigSchema | null =
				await client.db.get(`${guildId}.GUILD.${dbKey}`);

			// Check if the board is enabled and configured
			if (!baseData || baseData.enabled === "no" || !baseData.channel)
				return;
			if (
				!reaction.count ||
				reaction.count < Math.max(2, baseData.threshold || 2)
			)
				return;

			flightKey = `${guildId}.${reaction.message.channelId}.${reaction.message.id}`;
			if (inFlight.has(flightKey)) {
				pending.add(flightKey);
				flightKey = null;
				return;
			}
			inFlight.add(flightKey);

			// Get board data
			const dataPath = `${guildId}.GUILD.${dbKey}_DATA`;
			let boardData: DatabaseStructure.StarboardDataSchema =
				(await client.db.get(dataPath)) || [];

			// Get board channel
			const boardChannel = await resolveChannel(
				reaction,
				baseData.channel
			);
			if (!boardChannel) return;

			if (!config.fetchPartialsFirst) {
				await fetchPartials(reaction);
			}

			// Check if this message is already in the board
			const existingEntry = boardData.find(
				(entry) =>
					entry.messageId === reaction.message.id &&
					entry.channelId === reaction.message.channelId
			);

			const { embed, lang } = await buildEmbed(client, reaction, color);

			const content = `${emoji} **${reaction.count}** | <#${reaction.message.channelId}>`;

			if (existingEntry) {
				// Update existing board message
				try {
					const boardMessage = await boardChannel.messages
						.fetch(existingEntry.number)
						.catch(() => null);

					if (boardMessage) {
						await boardMessage.edit({
							content,
							embeds: [embed],
							files: [
								await client.func.displayBotName.footerAttachmentBuilder(
									reaction.message.guild
								)
							]
						});
					} else {
						// If the board message was deleted, create a new one and update database
						const newBoardMessage = await boardChannel.send({
							content,
							embeds: [embed],
							files: [
								await client.func.displayBotName.footerAttachmentBuilder(
									reaction.message.guild
								)
							]
						});

						// Update database with new message ID
						boardData = boardData.map((entry) =>
							entry.messageId === reaction.message.id &&
							entry.channelId === reaction.message.channelId
								? { ...entry, number: newBoardMessage.id }
								: entry
						);
						await client.db.set(dataPath, boardData);
					}
				} catch (error) {
					logger.err(`Error updating ${label} message:`, error);
				}
			} else {
				// Create new board message
				try {
					const boardMessage = await boardChannel.send({
						content,
						embeds: [embed],
						files: [
							await client.func.displayBotName.footerAttachmentBuilder(
								reaction.message.guild
							)
						]
					});

					// Create thread if enabled
					if (baseData.createThread) {
						await boardMessage
							.startThread({
								name:
									`${emoji} ` +
									lang.var_s_message.replace(
										"{nickname}",
										reaction.message.author?.username ||
											lang.var_unknown
									),
								autoArchiveDuration: 1440
							})
							.catch(() => null);
					}

					// Add to database
					const newEntry: DatabaseStructure.StarboardData = {
						channelId: reaction.message.channelId,
						messageId: reaction.message.id,
						number: boardMessage.id,
						author: reaction.message.author?.id || "unknown"
					};

					boardData.push(newEntry);
					await client.db.set(dataPath, boardData);
				} catch (error) {
					logger.err(`Error creating ${label} message:`, error);
				}
			}
		} catch (error) {
			logger.err(`Error in messageReactionAdd ${label} event:`, error);
		} finally {
			if (flightKey) {
				inFlight.delete(flightKey);
				if (pending.delete(flightKey)) {
					void onAdd(client, reaction, user);
				}
			}
		}
	}

	async function onRemove(
		client: Client,
		reaction: MessageReaction,
		user: User
	): Promise<void> {
		try {
			// Guard clauses
			if (user.bot || reaction.emoji.name !== emoji) return;

			await fetchPartials(reaction);

			if (!reaction.message.guild) return;

			// Avoid to handle bot's message
			if (reaction.message.author?.bot) return;

			const guildId = reaction.message.guild.id;
			const baseData: DatabaseStructure.StarboardConfigSchema | null =
				await client.db.get(`${guildId}.GUILD.${dbKey}`);

			// Check if the board is enabled and configured
			if (!baseData || baseData.enabled === "no" || !baseData.channel)
				return;

			// Get board data
			const dataPath = `${guildId}.GUILD.${dbKey}_DATA`;
			let boardData: DatabaseStructure.StarboardDataSchema =
				(await client.db.get(dataPath)) || [];

			// Check if this message is in the board
			const existingEntry = boardData.find(
				(entry) =>
					entry.messageId === reaction.message.id &&
					entry.channelId === reaction.message.channelId
			);

			if (!existingEntry) return;

			const boardChannel = await resolveChannel(
				reaction,
				baseData.channel
			);
			if (!boardChannel) return;

			const boardMessage = config.cacheBoardMessage
				? boardChannel.messages.cache.get(existingEntry.number) ||
					(await boardChannel.messages
						.fetch(existingEntry.number)
						.catch(() => null))
				: await boardChannel.messages
						.fetch(existingEntry.number)
						.catch(() => null);
			if (!boardMessage) return;

			const reactionCount = reaction.count || 0;

			// If reaction count is below threshold, delete the board message
			if (reactionCount < baseData.threshold) {
				try {
					await boardMessage.delete();

					// Remove from database
					boardData = boardData.filter(
						(entry) =>
							!(
								entry.messageId === reaction.message.id &&
								entry.channelId === reaction.message.channelId
							)
					);
					await client.db.set(dataPath, boardData);
				} catch (error) {
					logger.err(`Error deleting ${label} message:`, error);
				}
			} else {
				// Update the board message with new count
				try {
					const { embed } = await buildEmbed(client, reaction, color);

					const content = `${emoji} **${reactionCount}** | <#${reaction.message.channelId}>`;

					await boardMessage.edit({
						content,
						embeds: [embed],
						files: [
							await client.func.displayBotName.footerAttachmentBuilder(
								reaction.message.guild
							)
						]
					});
				} catch (error) {
					logger.err(`Error updating ${label} message:`, error);
				}
			}
		} catch (error) {
			logger.err(`Error in messageReactionRemove ${label} event:`, error);
		}
	}

	return { onAdd, onRemove };
}

export const starboard = createReactionBoard({
	emoji: "⭐",
	color: "#ffac33",
	dbKey: "STARBOARD",
	label: "starboard",
	fetchPartialsFirst: true,
	cacheBoardMessage: true
});

export const skullboard = createReactionBoard({
	emoji: "💀",
	color: "#2b2d31",
	dbKey: "SKULLBOARD",
	label: "skullboard",
	fetchPartialsFirst: false,
	cacheBoardMessage: false
});
