/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { BaseGuildTextChannel, Client, Guild, EmbedBuilder } from 'discord.js';

import logger from "../../core/logger.js";

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
	name: "guildDelete",
	run: async (client: Client, guild: Guild) => {

		try {
			let i: string = '';

			if (guild.name === undefined) return;

			if (guild.vanityURLCode) { i = 'discord.gg/' + guild.vanityURLCode; }

			let usersize = client.guilds.cache.reduce((a, b) => a + b.memberCount, 0);

			let embed = new EmbedBuilder()
				.setColor("#ff0505")
				.setDescription(`**A guild removed iHorizon !**`)
				.addFields({ name: "🏷️・Server Name", value: `\`${guild.name}\``, inline: true },
					{ name: "🆔・Server ID", value: `\`${guild.id}\``, inline: true },
					{ name: "🌐・Server Region", value: `\`${guild.preferredLocale}\``, inline: true },
					{ name: "👤・MemberCount", value: `\`${guild.memberCount}\` members`, inline: true },
					{ name: "🪝・Vanity URL", value: `\`${i || 'None'}\``, inline: true },
					{ name: "🍻・New guilds total", value: client.guilds.cache.size.toString(), inline: true },
					{ name: "🥛・New members total", value: `${usersize} members`, inline: true },
				)
				.setThumbnail(guild.iconURL())
				.setTimestamp(guild.joinedTimestamp)
				.setFooter({ text: 'iHorizon ・ Joined at', iconURL: "attachment://footer_icon.png" })

			let channel = client.channels.cache.get(client.config.core.guildLogsChannelID);

			return (channel as BaseGuildTextChannel).send({ embeds: [embed], files: [await client.func.displayBotName.footerAttachmentBuilder(guild)] });
		} catch (error: any) {
			logger.err(error);
		}
	},
};
