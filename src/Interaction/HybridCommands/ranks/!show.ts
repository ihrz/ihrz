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

import {
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	Message,
	User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getMember("user") as GuildMember || interaction.member;
		} else {

			var user = client.func.method.member(interaction, args!, 0) || interaction.member;
		};

		let baseData = await client.db.get(`${interaction.guildId}.USER.${user.id}.XP_LEVELING`);
		var level = baseData?.level || 0;
		var currentxp = baseData?.xp || 0;

		var xpNeeded = level * 500 + 500;
		var expNeededForLevelUp = xpNeeded - currentxp;

		var htmlContent = client.htmlfiles['ranksCard'];

		htmlContent = htmlContent
			.replace('AVATAR_URL', user.displayAvatarURL({ extension: 'png', size: 128 }))
			.replace('USERNAME', user.user.globalName || user.displayName)
			.replace('LEVEL', level)
			.replace('PROGRESS_PERCENT', String((currentxp / xpNeeded) * 100))
			.replace('CURRENT_XP', currentxp)
			.replace('XP_NEEDED', String(xpNeeded))
			.replace('XP_REMAINING', String(expNeededForLevelUp))
			.replace('TOTAL_XP', currentxp)
			.replace('{level}', lang.var_level)
			.replace('{xp_total}', lang.level_xp_total)
			.replace('{needed_xp}', lang.level_xp_needed_for_new_level)
			;

		const image = await client.func.html2png(htmlContent, {
			elementSelector: '.card',
			omitBackground: true,
			selectElement: true,
		});

		const attachment = new AttachmentBuilder(image, { name: 'image.png' });

		let nivEmbed = new EmbedBuilder()
			.setTitle(lang.level_embed_title
				.replace('${user.username}', String(user.user.globalName || user.displayName))
			)
			.setColor('#0014a8')
			.addFields(
				{
					name: lang.level_embed_fields1_name, value: lang.level_embed_fields1_value
						.replace('${currentxp}', currentxp)
						.replace('${xpNeeded}', xpNeeded.toString()), inline: true
				},
				{
					name: lang.level_embed_fields2_name, value: lang.level_embed_fields2_value
						.replace('${level}', level), inline: true
				}
			)
			.setImage("attachment://image.png")
			.setDescription(lang.level_embed_description.replace('${expNeededForLevelUp}', expNeededForLevelUp.toString())
			)
			.setTimestamp()
			.setThumbnail(user.avatarURL({ forceStatic: false, size: 4096 }))
			.setFooter(await client.func.displayBotName.footerBuilder(interaction));

		await client.func.method.interactionSend(interaction, {
			embeds: [nivEmbed],
			allowedMentions: { repliedUser: false },
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction), attachment]
		});
		return;
	},
};