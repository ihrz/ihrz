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
	ChatInputCommandInteraction,
	Client,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const blogId = interaction.options.getString("id") as string;

		if (await client.blogger.blogExist(interaction.guildId, blogId)) {
			const fetched = await client.db.get(`${interaction.guildId}.BLOGGER`) as DatabaseStructure.BloggerSchema | null;
			const fetchedBlogs = fetched?.blogs || [];

			const filteredArray = fetchedBlogs.filter((blog) => blog.id !== blogId);

			await client.db.set(`${interaction.guildId}.BLOGGER.blogs`, filteredArray);

			await client.func.method.interactionSend(interaction, {
				content: lang.blogger_blog_remove_success?.replace("${blogId}", blogId),
				embeds: [
					await client.blogger.generateBlogsEmbed(interaction.guild)
				]
			});
		} else {
			return client.func.method.interactionSend(interaction, {
				content: lang.blogger_blog_remove_not_found,
				ephemeral: true
			});
		}
	},
};