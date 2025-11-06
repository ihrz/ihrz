/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { BaseGuildTextChannel, Client, EmbedBuilder, MessageReaction, User, TextChannel, Message } from 'discord.js';
import { BotEvent } from '../../../../types/event.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

export const event: BotEvent = {
	name: "messageReactionRemove",
	run: async (client: Client, reaction: MessageReaction, user: User) => {
		try {
			// Fetch partial reaction and message if needed
			if (reaction.partial) {
				await reaction.fetch().catch(() => null);
			}

			if (reaction.message.partial) {
				await reaction.message.fetch().catch(() => null);
			}

			// Guard clauses
			if (!reaction.message.guild || user.bot) return;
			if (reaction.emoji.name !== "💀") return;


			// Avoid to handle bot's message
			if (reaction.message.author?.bot) return;

			const guildId = reaction.message.guild.id;
			const baseData: DatabaseStructure.SkullboardConfigSchema = await client.db.get(`${guildId}.GUILD.SKULLBOARD`);

			// Check if skullboard is enabled and configured
			if (!baseData || baseData.enabled === "no" || !baseData.channel) return;

			// Get skullboard data
			const skullboardDataPath = `${guildId}.GUILD.SKULLBOARD_DATA`;
			let skullboardData: DatabaseStructure.StarboardDataSchema = await client.db.get(skullboardDataPath) || [];

			// Check if this message is in skullboard
			const existingEntry = skullboardData.find(
				entry => entry.messageId === reaction.message.id && entry.channelId === reaction.message.channelId
			);

			if (!existingEntry) return;

			const skullboardChannel = reaction.message.guild.channels.cache.get(baseData.channel) ||
				await reaction.message.guild.channels.fetch(baseData.channel).catch(() => null);

			if (!skullboardChannel || !(skullboardChannel instanceof TextChannel)) {
				return;
			}

			const skullboardMessage = await skullboardChannel.messages.fetch(existingEntry.number).catch(() => null);
			if (!skullboardMessage) return;

			const reactionCount = reaction.count || 0;

			// If reaction count is below threshold, delete the skullboard message
			if (reactionCount < baseData.threshold) {
				try {
					await skullboardMessage.delete();

					// Remove from database
					skullboardData = skullboardData.filter(
						entry => !(entry.messageId === reaction.message.id && entry.channelId === reaction.message.channelId)
					);
					await client.db.set(skullboardDataPath, skullboardData);
				} catch (error) {
					console.error('Error deleting skullboard message:', error);
				}
			} else {
				// Update the skullboard message with new count
				try {
					const lang = await client.func.getLanguageData(guildId);
					const messageURL = client.func.getMessageURL(guildId, reaction.message.channelId, reaction.message.id);

					const embed = new EmbedBuilder()
						.setColor("#2b2d31")
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

					const content = `💀 **${reactionCount}** | <#${reaction.message.channelId}>`;

					await skullboardMessage.edit({
						content,
						embeds: [embed],
						files: [await client.func.displayBotName.footerAttachmentBuilder(reaction.message.guild)]
					});
				} catch (error) {
					console.error('Error updating skullboard message:', error);
				}
			}
		} catch (error) {
			console.error('Error in messageReactionRemove skullboard event:', error);
		}
	},
};