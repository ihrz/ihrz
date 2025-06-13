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

import { Client, EmbedBuilder, ApplicationCommandType, UserContextMenuCommandInteraction } from 'discord.js';
import { AnotherCommand } from '../../../types/anotherCommand.js';

import Jimp from 'jimp';

import logger from '../../core/logger.js';

export const command: AnotherCommand = {
	name: "Estimate the love",
	type: ApplicationCommandType.User,
	thinking: false,
	permission: null,
	run: async (client: Client, interaction: UserContextMenuCommandInteraction) => {
		const lang = await client.func.getLanguageData(interaction.guildId);
		const user1 = interaction.user;
		const user2 = interaction.targetUser;

		const profileImageSize = 512;
		const canvasWidth = profileImageSize * 3;
		const canvasHeight = profileImageSize;

		try {
			const [profileImage1, profileImage2, heartEmoji] = await Promise.all([
				Jimp.read(user1.displayAvatarURL({ extension: 'png', size: 512 })),
				Jimp.read(user2.displayAvatarURL({ extension: 'png', size: 512 })),
				Jimp.read(process.cwd() + "/src/assets/heart.png")
			]);

			profileImage1.resize(profileImageSize, profileImageSize);
			profileImage2.resize(profileImageSize, profileImageSize);
			heartEmoji.resize(profileImageSize, profileImageSize);

			const combinedImage = new Jimp(canvasWidth, canvasHeight);

			combinedImage.blit(profileImage1, 0, 0);
			combinedImage.blit(heartEmoji, profileImageSize, profileImageSize / 2 - heartEmoji.bitmap.height / 2);
			combinedImage.blit(profileImage2, profileImageSize * 2, 1);

			const buffer = await combinedImage.getBufferAsync(Jimp.MIME_PNG);
			const always100: Array<string> = client.config.command.alway100;

			const found = always100.find(element => {
				if (
					element === `${user1?.id}x${user2?.id}`
					||
					element === `${user2?.id}x${user1?.id}`
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
			};

			const embed = new EmbedBuilder()
				.setColor("#FFC0CB")
				.setTitle("💕")
				.setImage(`attachment://love.png`)
				.setDescription(lang.love_embed_description
					.replace('${user1.username}', user1.globalName!)
					.replace('${user2.username}', user2?.globalName!)
					.replace('${randomNumber}', randomNumber.toString())
				)
				.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
				.setTimestamp();

			await interaction.reply({
				embeds: [embed],
				files: [{ attachment: buffer, name: 'love.png' }, await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
		} catch (error: any) {
			logger.err(error);
			await interaction.reply({ content: lang.love_command_error });
		}
	},
};
