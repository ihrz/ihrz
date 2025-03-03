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
	BaseGuildTextChannel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	Message,
	PermissionsBitField,
	User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_disable_msg
					.replace('${interaction.user.id}', interaction.member.user.id)
			});
			return;
		};

		if (interaction instanceof ChatInputCommandInteraction) {
			var amount = interaction.options.getNumber("amount") as number;
			var user = interaction.options.getMember("member") as GuildMember;
		} else {

			var amount = client.func.method.number(args!, 0) as number;
			var user = client.func.method.member(interaction, args!, 0) as GuildMember;
		};

		await client.db.sub(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`, amount!);
		let bal = await client.db.get(`${interaction.guildId}.USER.${user.id}.ECONOMY.money`);

		let embed = new EmbedBuilder()
			.setAuthor({ name: lang.removemoney_embed_title, iconURL: (interaction.member.user as User).displayAvatarURL() })
			.addFields({ name: lang.removemoney_embed_fields, value: `${amount}$` },
				{ name: lang.removemoney_embed_second_fields, value: `${bal}$` })
			.setColor("#bc0116")
			.setTimestamp()

		await client.func.ihorizon_logs(interaction, {
			title: lang.removemoney_logs_embed_title,
			description: lang.removemoney_logs_embed_description
				.replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
				.replace(/\${amount}/g, amount.toString())
				.replace(/\${user\.user\.id}/g, user.id)
		});

		await client.func.method.interactionSend(interaction, { embeds: [embed] });
		return;
	},
};