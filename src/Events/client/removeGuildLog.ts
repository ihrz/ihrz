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

import { BaseGuildTextChannel, Client, Guild, EmbedBuilder } from 'discord.js';

import logger from "../../core/logger.js";

import { BotEvent } from '../../../types/event.js';
import { getShardStats } from '../../Interaction/HybridCommands/bot/botinfo.js';

export const event: BotEvent = {
	name: "guildDelete",
	run: async (client: Client, guild: Guild) => {

		try {
			let i: string = '';

			if (guild.name === undefined) return;

			let owner1 = client.config.owner.ownerid1;
			let owner2 = client.config.owner.ownerid2;

			if (guild.vanityURLCode) { i = 'discord.gg/' + guild.vanityURLCode; }

			const stats = await getShardStats(client);
			const shard_guild = await client.func.shard_helper.getGuildData(client, guild.id);

			let embed = new EmbedBuilder()
				.setColor(await client.db.get(`${guild?.id}.GUILD.GUILD_CONFIG.embed_color.owner`) || "#ff0505")
				.setTimestamp(guild.joinedTimestamp)
				.setDescription(`**A guild removed ${client.user?.username!} !**`)
				.addFields({ name: "🏷️・Server Name", value: `\`${guild.name}\``, inline: true },
					{ name: "🆔・Server ID", value: `\`${guild.id}\``, inline: true },
					{ name: "🌐・Server Region", value: `\`${guild.preferredLocale}\``, inline: true },
					{ name: "👤・Member Count", value: `\`${shard_guild?.memberCount || "idk"}\` members`, inline: true },
					// { name: "🪝・Vanity URL", value: `\`${i || 'None'}\``, inline: true },
					{ name: "🍻・New guilds total", value: stats.guilds.toString(), inline: true },
					{ name: "🥛・New members total", value: `${stats.users} members`, inline: true },
				)
				.setThumbnail(guild.iconURL())
				.setTimestamp(guild.joinedTimestamp)
				.setFooter({ text: 'iHorizon ・ Joined at', iconURL: "attachment://footer_icon.png" })

			await (client.users.cache.get(owner1))?.send({
				embeds: [embed],
				files: [await client.func.displayBotName.footerAttachmentBuilder(guild)]
			});

			await (client.users.cache.get(owner2))?.send({
				embeds: [embed],
				files: [await client.func.displayBotName.footerAttachmentBuilder(guild)]
			});
		} catch (error: any) {
			logger.err(error);
		}
	},
};
