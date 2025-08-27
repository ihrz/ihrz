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

import { Client, EmbedBuilder, ChatInputCommandInteraction, User, Message } from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import logger from '../../../core/logger.js';
import { SubCommand } from '../../../../types/command.js';
import { love } from '../../../core/images.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
			await client.func.method.interactionSend(interaction, { content: lang.fun_category_disable });
			return;
		};
		if (interaction instanceof ChatInputCommandInteraction) {
			var user1 = interaction.options.getUser("user1") || interaction.user;
			var user2 = interaction.options.getUser("user2") || interaction.guild?.members.cache.random()?.user as User;
		} else {

			var user1 = await client.func.method.user(interaction, args!, 0) || interaction.author;
			var user2 = await client.func.method.user(interaction, args!, 1) || interaction.guild?.members.cache.random()?.user as User;
		}

		try {
			const loveResult = await love(user1.displayAvatarURL({ extension: 'png', size: 512 }), user2.displayAvatarURL({ extension: 'png', size: 512 }));
			const always100: Array<string> = client.config.command.alway100;

			const found = always100.find(element => {
				if (
					element === `${user1.id}x${user2.id}`
					||
					element === `${user2.id}x${user1.id}`
				) {
					return true;
				}
				return false;
			});

			let randomNumber: number;
			if (found) {
				randomNumber = 100;
			} else {
				randomNumber = Math.floor(Math.random() * 101);
			}

			const embed = new EmbedBuilder()
				.setColor(await client.db.get(`${interaction.guild!.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#FFC0CB")
				.setTitle("💕")
				.setImage(`attachment://love.png`)
				.setDescription(lang.love_embed_description
					.replace('${user1.username}', user1.username)
					.replace('${user2.username}', user2.username)
					.replace('${randomNumber}', randomNumber.toString())
				)
				.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
				.setTimestamp();

			await client.func.method.interactionSend(interaction, {
				embeds: [embed],
				files: [
					{ attachment: loveResult, name: 'love.png' },
					await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction),
				]
			});
		} catch (error: any) {
			logger.err(error);
			await client.func.method.interactionSend(interaction, { content: lang.love_command_error });
		}
	},
};
