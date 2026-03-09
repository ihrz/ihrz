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

import { BaseGuildTextChannel, Client, EmbedBuilder, MessageReaction, User, TextChannel, Message } from 'discord.js';
import { BotEvent } from '../../../../types/event.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

export const event: BotEvent = {
	name: "messageReactionAdd",
	run: async (client: Client, reaction: MessageReaction, user: User) => {
		try {
			// Guard clauses
			if (!reaction.message.guild || user.bot) return;
			if (reaction.emoji.name !== "💀") return;

			// Avoid to handle bot's message
			if (reaction.message.author?.bot) return;

			const guildId = reaction.message.guild.id;
			const baseData: DatabaseStructure.SkullboardConfigSchema = await client.db.get(`${guildId}.GUILD.SKULLBOARD`);

			// Check if skullboard is enabled and configured
			if (!baseData || baseData.enabled === "no" || !baseData.channel) return;
			if (!reaction.count || reaction.count < baseData.threshold) return;


			// Get skullboard channel
			const skullboardChannel = reaction.message.guild.channels.cache.get(baseData.channel) ||
				await reaction.message.guild.channels.fetch(baseData.channel).catch(() => null);

			// Get skullboard data
			const skullboardDataPath = `${guildId}.GUILD.SKULLBOARD_DATA`;
			let skullboardData: DatabaseStructure.StarboardDataSchema = await client.db.get(skullboardDataPath) || [];

			if (!skullboardChannel || !(skullboardChannel instanceof TextChannel)) {
				return;
			}

			// Fetch partial reaction and message if needed
			if (reaction.partial) {
				await reaction.fetch().catch(() => null);
			}

			if (reaction.message.partial) {
				await reaction.message.fetch().catch(() => null);
			}


			// Check if this message is already in skullboard
			const existingEntry = skullboardData.find(
				entry => entry.messageId === reaction.message.id && entry.channelId === reaction.message.channelId
			);

			const lang = await client.func.getLanguageData(guildId);
			const messageURL = client.func.getMessageURL(guildId, reaction.message.channelId, reaction.message.id);

			// Prepare embed with dark/death theme
			const embed = new EmbedBuilder()
				.setColor("#2b2d31") // Dark gray color for skull theme
				.setAuthor({
					name: reaction.message.author?.tag || lang.var_unknown,
					iconURL: reaction.message.author?.displayAvatarURL() || undefined
				})
				.setDescription(reaction.message.content?.substring(0, 2000) || lang.var_none)
				.addFields({
					name: lang.var_original_message,
					value: `[${lang.var_click_here}](${messageURL})`
				})
				.setTimestamp(reaction.message.createdAt)
				.setFooter(await client.func.displayBotName.footerBuilder(guildId));

			// Add image if present
			const attachment = reaction.message.attachments.first();
			if (attachment && attachment.contentType?.startsWith('image/')) {
				embed.setImage(attachment.url);
			}

			const content = `💀 **${reaction.count}** | <#${reaction.message.channelId}>`;

			if (existingEntry) {
				// Update existing skullboard message
				try {
					const skullboardMessage = await skullboardChannel.messages.fetch(existingEntry.number).catch(() => null);

					if (skullboardMessage) {
						await skullboardMessage.edit({
							content,
							embeds: [embed],
							files: [await client.func.displayBotName.footerAttachmentBuilder(reaction.message.guild)]
						});
					} else {
						// If skullboard message was deleted, create a new one and update database
						const newSkullboardMessage = await skullboardChannel.send({
							content,
							embeds: [embed],
							files: [await client.func.displayBotName.footerAttachmentBuilder(reaction.message.guild)]
						});

						// Update database with new message ID
						skullboardData = skullboardData.map(entry =>
							entry.messageId === reaction.message.id && entry.channelId === reaction.message.channelId
								? { ...entry, number: newSkullboardMessage.id }
								: entry
						);
						await client.db.set(skullboardDataPath, skullboardData);
					}
				} catch (error) {
					console.error('Error updating skullboard message:', error);
				}
			} else {
				// Create new skullboard message
				try {
					const skullboardMessage = await skullboardChannel.send({
						content,
						embeds: [embed],
						files: [await client.func.displayBotName.footerAttachmentBuilder(reaction.message.guild)]
					});

					// Create thread if enabled
					if (baseData.createThread) {
						await skullboardMessage.startThread({
							name: '💀 ' + lang.var_s_message.replace("{nickname}", reaction.message.author?.username || lang.var_unknown),
							autoArchiveDuration: 1440
						}).catch(() => null);
					}

					// Add to database
					const newEntry: DatabaseStructure.StarboardData = {
						channelId: reaction.message.channelId,
						messageId: reaction.message.id,
						number: skullboardMessage.id,
						author: reaction.message.author?.id || 'unknown'
					};

					skullboardData.push(newEntry);
					await client.db.set(skullboardDataPath, skullboardData);
				} catch (error) {
					console.error('Error creating skullboard message:', error);
				}
			}
		} catch (error) {
			console.error('Error in messageReactionAdd skullboard event:', error);
		}
	},
};