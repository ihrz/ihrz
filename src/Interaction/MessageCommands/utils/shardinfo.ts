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
	BaseGuildTextChannel,
	Client,
	EmbedBuilder,
	Message,
	time,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: 'shardinfo',
	aliases: [],

	description: '...',
	description_localizations: {
		"fr": "..."
	},

	thinking: false,
	category: 'owner',
	type: "PREFIX_IHORIZON_COMMAND",

	permission: null,
	run: async (client: Client, message: Message<true>, lang: LanguageData, options?: string[]) => {
		if (client.owners.includes(message.author.id)) {
			// Comprehensive guild analysis with all 3 methods
			const guildStats = {
				total: client.guilds.cache.size,
				available: 0,
				unavailable: 0,
				withMemberCount: 0,
				withApproximateOnly: 0,
				withNoMemberData: 0,
				totalMembers: 0,
				categorizedGuilds: {
					unavailable: [] as Array<{ name: string, id: string, reason: string }>,
					noMemberData: [] as Array<{ name: string, id: string, available: boolean }>,
					usingApproximate: [] as Array<{ name: string, id: string, memberCount: number | null, approximateMemberCount: number | null }>
				}
			};

			client.guilds.cache.forEach(guild => {
				// Method 3: Check if guild is available first
				if (!guild.available) {
					guildStats.unavailable++;
					guildStats.categorizedGuilds.unavailable.push({
						name: guild.name,
						id: guild.id,
						reason: 'Guild unavailable'
					});
					return; // Skip unavailable guilds
				}

				guildStats.available++;

				// Method 2: Use approximateMemberCount as fallback
				let memberCount = 0;
				if (guild.memberCount && typeof guild.memberCount === 'number' && !isNaN(guild.memberCount)) {
					memberCount = guild.memberCount;
					guildStats.withMemberCount++;
				} else if (guild.approximateMemberCount && typeof guild.approximateMemberCount === 'number' && !isNaN(guild.approximateMemberCount)) {
					memberCount = guild.approximateMemberCount;
					guildStats.withApproximateOnly++;
					guildStats.categorizedGuilds.usingApproximate.push({
						name: guild.name,
						id: guild.id,
						memberCount: guild.memberCount,
						approximateMemberCount: guild.approximateMemberCount
					});
				} else {
					// Method 1: Filter out completely problematic guilds
					guildStats.withNoMemberData++;
					guildStats.categorizedGuilds.noMemberData.push({
						name: guild.name,
						id: guild.id,
						available: guild.available
					});
					return; // Skip guilds with no member data
				}

				guildStats.totalMembers += memberCount;
			});

			let msg = `**Shard Information (Advanced)**
Process PID: ${process.pid}
Server on this shard: ${client.inShard(message.guildId) ? "✅ Yes" : "❌ No"}
Shard count: ${client.shard?.count}
Shard IDs: ${client.shard?.ids}

**Guild Statistics**
Total guilds: ${guildStats.total}
├─ Available: ${guildStats.available}
├─ Unavailable: ${guildStats.unavailable}
├─ With exact member count: ${guildStats.withMemberCount}
├─ Using approximate count: ${guildStats.withApproximateOnly}
└─ No member data: ${guildStats.withNoMemberData}

**Member Count**
Total members: ${guildStats.totalMembers.toLocaleString()}`;

			// Add details for problematic cases
			if (guildStats.categorizedGuilds.unavailable.length > 0) {
				msg += `\n\n**Unavailable Guilds (first 3):**`;
				guildStats.categorizedGuilds.unavailable.slice(0, 3).forEach(guild => {
					msg += `\n- ${guild.name} (${guild.id})`;
				});
			}

			if (guildStats.categorizedGuilds.usingApproximate.length > 0) {
				msg += `\n\n**Using Approximate Count (first 3):**`;
				guildStats.categorizedGuilds.usingApproximate.slice(0, 3).forEach(guild => {
					msg += `\n- ${guild.name}: exact=${guild.memberCount}, approx=${guild.approximateMemberCount}`;
				});
			}

			if (guildStats.categorizedGuilds.noMemberData.length > 0) {
				msg += `\n\n**No Member Data (first 3):**`;
				guildStats.categorizedGuilds.noMemberData.slice(0, 3).forEach(guild => {
					msg += `\n- ${guild.name} (available: ${guild.available})`;
				});
			}

			const embed = new EmbedBuilder()
				.setTitle('Advanced Shard Information')
				.setDescription(msg)
				.setColor('#00ff00')
				.setTimestamp();

			message.reply({ embeds: [embed] });
		} else return;
	},
};