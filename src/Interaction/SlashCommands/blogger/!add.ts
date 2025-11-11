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

import {
	ChatInputCommandInteraction,
	Client,
	ChannelType,
	SnowflakeUtil,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const rss = interaction.options.getString("rss") as string;
		const channel = interaction.options.getChannel("channel");

		if (!channel || channel.type !== ChannelType.GuildText) {
			return interaction.reply({ content: lang.blogger_blog_add_invalid_channel, ephemeral: true });
		}

		const validation = await client.blogger.validateRssFeed(rss);

		if (validation.valid) {
			const fetched = await client.db.get(`${interaction.guildId}.BLOGGER`) as DatabaseStructure.BloggerSchema | null;
			const fetchedBlogs = fetched?.blogs || [];

			const blogId = SnowflakeUtil.generate().toString();

			fetchedBlogs.push({
				id: blogId,
				rss: rss,
				channelId: channel.id
			});

			const uniqueArray = fetchedBlogs.filter((value, index, self) =>
				index === self.findIndex((t) => (
					t.rss === value.rss && t.channelId === value.channelId
				))
			) || [];

			await client.db.set(`${interaction.guildId}.BLOGGER.blogs`, uniqueArray);

			await client.func.method.interactionSend(interaction, {
				content: lang.blogger_blog_add_success
					?.replace("${validation.name}", validation.name || "Unknown")
					?.replace("${channel.toString()}", channel.toString())
					?.replace("${blogId}", blogId),
				embeds: [
					await client.blogger.generateBlogsEmbed(interaction.guild)
				]
			});
		} else {
			return interaction.reply({
				content: lang.blogger_blog_add_invalid_rss,
				ephemeral: true
			});
		}
	},
};