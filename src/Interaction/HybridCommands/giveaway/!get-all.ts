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
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	time
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		const giveawayData = await client.giveawaysManager.getAllGiveawayData();
		const filtered = giveawayData.filter((giveaway) => giveaway.giveawayData.guildId === interaction.guildId && !giveaway.giveawayData.ended);

		const embed = new EmbedBuilder()
			.setColor(await client.db.get(`${interaction.guild!.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#2986cc")
			.setTimestamp()
			.setTitle(lang.gw_getall_embed_title
				.replace('${interaction.guild?.name}', interaction.guild.name as string)
			)
			.setAuthor(
				{
					name: (interaction.guild.name as string),
					iconURL: "attachment://guild_icon.png"
				}
			)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

		filtered.forEach(index => {
			const Channel = `<#${index.giveawayData.channelId}>`;
			const MessageURL = `https://discord.com/channels/${interaction.guildId}/${index.giveawayData.channelId}/${index.giveawayId}`;
			const ExpireIn = `${time(new Date(index.giveawayData.expireIn), 'd')}`;

			embed.addFields(
				{
					name: `\`${index.giveawayId}\``,
					value: lang.gw_getall_embed_fields
						.replace('${MessageURL}', MessageURL)
						.replace('${ExpireIn}', ExpireIn)
						.replace('${Channel}', Channel)
				}
			);
		});

		await client.func.method.interactionSend(interaction,
			{
				embeds: [embed],
				files: [
					{
						attachment: (await interaction.client.func.image64.image64(interaction.guild.iconURL() || client.user.displayAvatarURL())) ?? Buffer.from([]),
						name: 'guild_icon.png'
					}, await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)
				],
			}
		);

		return;
	},
};