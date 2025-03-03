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
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	Message,
	User
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { getMemberBoost } from './economy.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
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
			var member: GuildMember = interaction.options.getMember('user') as GuildMember || interaction.member;
		} else {

			var member: GuildMember = client.func.method.member(interaction, args!, 0) || interaction.member;
		};

		var baseData: DatabaseStructure.EconomyUserSchema = await client.db.get(`${interaction.guildId}.USER.${member.id}.ECONOMY`) || { money: 0, bank: 0, ownedRoles: [] };

		var possibleBoost = await getMemberBoost(interaction.member!);
		let totalWallet = (baseData.money || 0) + (baseData.bank || 0);

		let embed = new EmbedBuilder()
			.setColor('#e3c6ff')
			.setTitle(`\`${member.user.username}\`'s Wallet`)
			.setThumbnail(member.displayAvatarURL())
			.setDescription(lang.balance_he_have_wallet
				.replace("${bal}", totalWallet.toString())
				.replace('${user}', member.toString())
				.replace("${client.iHorizon_Emojis.icon.Wallet_Logo}", client.iHorizon_Emojis.icon.Wallet_Logo)
			)
			.addFields(
				{ name: lang.balance_embed_fields1_name, value: `${baseData.bank || 0}${client.iHorizon_Emojis.icon.Coin}`, inline: true },
				{ name: lang.balance_embed_fields2_name, value: `${baseData.money || 0}${client.iHorizon_Emojis.icon.Coin}`, inline: true },
				{ name: lang.var_boost, value: `${possibleBoost}x`, inline: true }
			)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction))
			.setTimestamp()

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
		return;
	},
};
