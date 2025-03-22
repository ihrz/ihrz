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
	PermissionsBitField,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../../types/database_structure.js';
import { SubCommand } from '../../../../../types/command.js';


export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;



		let all_members: DatabaseStructure.UtilsPermsUserData = await client.db.get(`${interaction.guildId}.UTILS.USER_PERMS`) || {};
		let all_roles: DatabaseStructure.UtilsRoleData = await client.db.get(`${interaction.guildId}.UTILS.roles`) || {};
		let allUsers: { group: number, userId: string }[] = [];

		Object.entries(all_roles).forEach(([perm, userId]) => {
			allUsers.push({ userId, group: parseInt(perm) });
		});

		Object.entries(all_members).forEach(([userId, perm]) => {
			allUsers.push({ userId, group: perm });
		});

		let itemsPerPage = 10;
		let currentPage = 0;
		let totalPages = Math.max(1, Math.ceil(allUsers.length / itemsPerPage));

		const generateEmbed = (page: number) => {
			let embed = new EmbedBuilder()
				.setTitle(lang.perm_list_embed_title)
				.setColor("#475387");

			let startIndex = page * itemsPerPage;
			let endIndex = Math.min(startIndex + itemsPerPage, allUsers.length);

			let groupedUsers: { [key: number]: string[] } = {};

			for (let i = startIndex; i < endIndex; i++) {
				let { group, userId } = allUsers[i];
				let user = interaction.guild.roles.cache.get(userId)?.toString() || interaction.guild.members.cache.get(userId)?.toString();

				if (!groupedUsers[group]) {
					groupedUsers[group] = [];
				}
				if (user) {
					groupedUsers[group].push(user);
				}
			}

			Object.entries(groupedUsers).forEach(([group, users]) => {
				embed.addFields({
					name: `Perm ${group}`,
					value: users.join("\n") || lang.perm_list_no_user
				});
			});

			embed.setFooter({
				text: lang.prevnames_embed_footer_text.replace("${currentPage + 1}", String(page + 1))
					.replace("${pages.length}", String(totalPages))
			});
			return embed;
		};


		const generateButtons = (page: number) => {
			return new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('previous')
						.setLabel('<<')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page === 0),
					new ButtonBuilder()
						.setCustomId('next')
						.setLabel('>>')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page === totalPages - 1)
				);
		};

		let message = await client.func.method.interactionSend(interaction, {
			embeds: [generateEmbed(currentPage)],
			components: [generateButtons(currentPage)],
			withResponse: true,
		});

		const collector = message.createMessageComponentCollector({
			time: 60_000 * 5,
		});

		collector.on('collect', async i => {
			if (i.customId === 'previous') {
				currentPage--;
			} else if (i.customId === 'next') {
				currentPage++;
			}

			await i.update({
				embeds: [generateEmbed(currentPage)],
				components: [generateButtons(currentPage)]
			});
		});

		collector.on('end', async () => {
			await message.edit({
				components: []
			});
		});
	},
};
