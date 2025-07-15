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

import { Client, PermissionsBitField, ChannelType, Message, GuildMember } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { axios } from '../../core/functions/axios.js';
import { db } from '../../core/database.js';

/**
 * Apply sanctions to a member based on the configured punishment type
 * @param client Discord client
 * @param message Message that triggered the sanction
 * @param member Guild member to sanction
 * @param LOG Punishment configuration
 * @param table Database table for temporary data
 */
async function applySanction(client: Client, message: Message, member: GuildMember, LOG: DatabaseStructure.PunishPubSchema, table: db): Promise<void> {
	try {
		switch (LOG.punishementType) {
			case 'ban':
				await message.guild!.members.ban(message.author, { reason: "Ban by PUNISHPUB" });
				break;
			case 'kick':
				await message.guild!.members.kick(message.author, "Kick by PunishPub");
				break;
			case 'mute':
				await member?.timeout(40000, 'Timeout by PunishPUB');
				await client.func.method.warnMember(
					message.guild?.members.me!,
					message.member!,
					"Timeout by PunishPUB"
				);
				break;
		}

		// Clear the punishment data after successful sanction application
		await table.set(`${message.guildId}.PUNISH_DATA.${message.author.id}`, {});
	} catch (error) {
		console.error(`Failed to apply sanction to ${message.author.tag}:`, error);
	}
}

/**
 * Check if a message contains links that should be sanctioned
 * @param message Discord message to check
 * @param whitelist Array of whitelisted domains
 * @returns true if the message should be sanctioned, false otherwise
 */
async function shouldSanctionMessage(message: Message, whitelist: string[]): Promise<boolean> {
	const contentLower = message.content.toLowerCase();
	const blacklist = ["https://", "http://", ".gg/"];

	// Check if message contains links
	const links = contentLower.match(/https?:\/\/\S+/g) || [];

	if (links.length > 0) {
		// Check if links are media or whitelisted
		const mediaChecks = await Promise.all(links.map(isMediaLink));
		const whitelistChecks = links.map(url => isWhitelisted(url, whitelist));

		const hasOnlyValidMedia = mediaChecks.every(Boolean);
		const isValidWhitelisted = whitelistChecks.some(Boolean);

		// If all links are media or at least one is whitelisted, don't sanction
		if (hasOnlyValidMedia || isValidWhitelisted) return false;
	}

	// Check if message contains blacklisted terms
	for (const word of blacklist) {
		if (contentLower.includes(word)) {
			return true;
		}
	}

	return false;
}

/**
 * Check if a URL is a media link
 * @param url URL to check
 * @returns true if the URL points to media content
 */
async function isMediaLink(url: string): Promise<boolean> {
	try {
		const response = await axios.head(url, {
			timeout: 5000,
		});

		const contentType = response.headers.get('content-type')?.toLowerCase() || '';
		const mediaTypes = [
			'image/',
			'video/',
			'gif',
		];

		return mediaTypes.some(type => contentType.includes(type));
	} catch (error) {
		return false;
	}
}

/**
 * Check if a URL is whitelisted
 * @param url URL to check
 * @param whitelist Array of whitelisted domains
 * @returns true if the URL is whitelisted
 */
function isWhitelisted(url: string, whitelist: string[]): boolean {
	return whitelist.some(domain => url.includes(domain));
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		// Basic validation checks
		if (!message.guild || !message.channel || !message.member
			|| message.channel.type !== ChannelType.GuildText || message.author.bot
			|| message.author.id === client.user?.id) {
			return;
		}

		// Check if anti-pub is enabled for this guild
		const type = await client.db.get(`${message.guild.id}.GUILD.GUILD_CONFIG.antipub`) as DatabaseStructure.GuildConfigSchema['antipub'];
		if (type === "off" || message.member.permissions.has(
			[
				PermissionsBitField.Flags.Administrator |
				PermissionsBitField.Flags.ManageGuild
			]
		)) return;

		const member = message.guild.members.cache.get(message.author.id);

		if (type === "on") {
			// Get punishment configuration and user data
			const LOG = await client.db.get(`${message.guild.id}.GUILD.PUNISH.PUNISH_PUB`) as DatabaseStructure.PunishPubSchema;
			const table = client.db.table("TEMP");
			const LOGfetched = await table.get(`${message.guild.id}.PUNISH_DATA.${message.author.id}`);

			// Check if user has already reached max flags and should be sanctioned
			if (LOG?.amountMax === LOGfetched?.flags && LOG?.state === "true") {
				await applySanction(client, message, member!, LOG, table);
			}

			try {
				// List of whitelisted domains
				const whitelist = [
					"giphy.com",
					"tenor.com",
					"imgur.com",
					"gyazo.com",
					"ezgif.com",
					"reddit.com",
					"tumblr.com",
					"twitter.com",
					"flickr.com",
					"postimages.org",
					"imagebam.com",
					"x.com",
					"youtube.com",
					"github.com",
					"gilab.com"
				];

				// Check if message should be sanctioned
				const shouldSanction = await shouldSanctionMessage(message, whitelist);

				if (shouldSanction) {
					try {
						// Get current flags count
						let FLAGS_FETCH = await table.get(`${message.guild.id}.PUNISH_DATA.${message.author.id}.flags`);
						FLAGS_FETCH = FLAGS_FETCH || 0;

						// Increment flags count
						const newFlagsCount = FLAGS_FETCH + 1;

						// Delete the message first
						await message.delete();

						// Then update the database with the new flags count
						await table.set(`${message.guild.id}.PUNISH_DATA.${message.author.id}`, { flags: newFlagsCount });

						// Check if we need to apply sanctions immediately after updating
						if (LOG?.amountMax === newFlagsCount && LOG?.state === "true") {
							await applySanction(client, message, member!, LOG, table);
						}
					} catch (error) {
					}
				}
			} catch (error) {
				return;
			}
		}
	},
};
