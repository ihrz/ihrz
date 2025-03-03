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
	Client,
	EmbedBuilder,
	ChatInputCommandInteraction,
	Message,
	User,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { generateRoleFields } from './economy.js';
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

		var roleData = await client.db.get(`${interaction.guildId}.ECONOMY.buyableRoles`) as DatabaseStructure.EconomyModel["buyableRoles"];
		if (!roleData) {
			roleData = {};
		}

		if (Object.keys(roleData).length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: "There are no buyable roles to list."
			});
			return;
		}

		let embed = new EmbedBuilder()
			.setTitle("Economy System - Buyable Roles")
			.setDescription("All buyable roles are listed below.")
			.setFields(generateRoleFields(roleData, lang))
			.setColor("#0097ff")
			.setTimestamp()
			.setFooter(await client.func.displayBotName.footerBuilder(interaction));

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
	},
};