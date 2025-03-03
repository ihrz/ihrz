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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
} from 'discord.js';

import { format } from '../../../core/functions/date_and_time.js';

import { LanguageData } from '../../../../types/languageData.js';

import { Command } from '../../../../types/command.js';


const ITEMS_PER_PAGE = 5;

interface BotData {
	Bot: {
		Id: string;
		Name: string;
	};
	ExpireIn: number;
	PowerOff?: boolean;
	Cluster?: string;
}

function createListEmbed(
	botList: Array<{ userId: string; botCode: string; data: BotData; }>,
	page: number,
	totalPages: number
): EmbedBuilder {
	const startIdx = (page - 1) * ITEMS_PER_PAGE;
	const currentPageItems = botList.slice(startIdx, startIdx + ITEMS_PER_PAGE);

	const embed = new EmbedBuilder()
		.setColor('#2B2D31')
		.setTitle('🤖 OwnIHRZ Bots List')
		.setDescription(`Showing page ${page} of ${totalPages}`)
		.setTimestamp();

	currentPageItems.forEach(({ userId, botCode, data }) => {
		const status = data.PowerOff ? '🔴 Offline' : '🟢 Online';
		const expireDate = format(new Date(data.ExpireIn), 'ddd, MMM DD YYYY');

		const fieldValue = [
			`📝 **Bot Id:** ${data.Bot.Id} (<@${data.Bot.Id}>)`,
			`👤 **Owner:** <@${userId}>`,
			`📛 **Name:** \`${data.Bot.Name}\``,
			`⚡ **Status:** ${status}`,
			`⏰ **Expires:** \`${expireDate}\``,
			`🔷 **Cluster:** \`${data.Cluster || 'Unknown'}\``
		].join('\n');

		embed.addFields({
			name: `Bot Code: ${botCode}`,
			value: fieldValue,
			inline: false
		});
	});

	embed.setFooter({
		text: `Total Bots: ${botList.length} • Page ${page}/${totalPages}`
	});

	return embed;
}

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		let action_to_do = interaction.options.getString('action');
		let id_to_bot = interaction.options.getString('id');

		if (!client.owners.includes(interaction.user.id)) {
			await interaction.editReply({ content: client.iHorizon_Emojis.icon.No_Logo });
			return;
		};

		let tableOWNIHRZ = client.db.table("OWNIHRZ")
		let ownihrzClusterData = await tableOWNIHRZ.get('CLUSTER');

		// Working with Cluster
		if (action_to_do === 'shutdown') {
			if (!id_to_bot) {
				await interaction.editReply({
					content: `${interaction.user}, you have forgot the ID of the bot!`
				})
			};

			for (let userId in ownihrzClusterData as any) {
				let botData = ownihrzClusterData[userId];
				for (let botId in botData) {
					if (botId === id_to_bot) {
						let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);

						if (fetch.PowerOff) {
							await interaction.editReply({ content: `OwnIHRZ of <@${userId}>, is already shutdown...` });
							return;
						}

						await interaction.editReply({
							content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now shutdown.\nNow, the bot container can't be Power On when iHorizon-Prod booting...`,
						});

						return await client.ownihrz.ShutDown(fetch.Cluster, id_to_bot, true);
					}
				}
			}

			// Working with Cluster
		} else if (action_to_do === 'poweron') {
			if (!id_to_bot) {
				await interaction.editReply({
					content: `${interaction.user}, you have forgot the ID of the bot!`
				})
			};

			for (let userId in ownihrzClusterData as any) {
				let botData = ownihrzClusterData[userId];
				for (let botId in botData) {
					if (botId === id_to_bot) {
						let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);

						if (!fetch.PowerOff) {
							await interaction.editReply({ content: `OwnIHRZ of <@${userId}>, is already up...` });
							return;
						}

						await interaction.editReply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now Power On.\nNow, the bot container can be Power On when iHorizon-Prod booting...` });
						return await client.ownihrz.PowerOn(fetch.Cluster, id_to_bot);
					}
				}
			}
		} else if (action_to_do === 'delete') {

			for (let userId in ownihrzClusterData as any) {
				let botData = ownihrzClusterData[userId];
				for (let botId in botData) {
					if (botId === id_to_bot) {
						let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);

						await interaction.editReply({
							content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now deleted.\nThe bot container has been entierly erased...`,
						});
						return await client.ownihrz.Delete(fetch.Cluster, id_to_bot);
					}
				}
			}
		} else if (action_to_do === 'ls') {
			const tableOWNIHRZ = client.db.table("OWNIHRZ");
			const ownihrzClusterData = await tableOWNIHRZ.get('CLUSTER');

			const botList: Array<{ userId: string; botCode: string; data: BotData; }> = [];

			for (const userId in ownihrzClusterData) {
				const botData = ownihrzClusterData[userId];
				for (const botCode in botData) {
					botList.push({
						userId,
						botCode,
						data: botData[botCode],
					});
				}
			}

			const totalPages = Math.ceil(botList.length / ITEMS_PER_PAGE);
			let currentPage = 1;

			const getButtons = (currentPage: number) => {
				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId('first')
						.setLabel('⏪ First')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage === 1),
					new ButtonBuilder()
						.setCustomId('previous')
						.setLabel('◀️ Previous')
						.setStyle(ButtonStyle.Primary)
						.setDisabled(currentPage === 1),
					new ButtonBuilder()
						.setCustomId('next')
						.setLabel('Next ▶️')
						.setStyle(ButtonStyle.Primary)
						.setDisabled(currentPage === totalPages),
					new ButtonBuilder()
						.setCustomId('last')
						.setLabel('Last ⏩')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(currentPage === totalPages)
				);
				return row;
			};

			const embed = createListEmbed(botList, currentPage, totalPages);
			const message = await interaction.editReply({
				embeds: [embed],
				components: [getButtons(currentPage)],
			});

			const collector = message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300000
			});

			collector.on('collect', async (i) => {
				if (i.user.id !== interaction.user.id) {
					await i.reply({
						content: "You cannot use these buttons.",
						ephemeral: true
					});
					return;
				}

				switch (i.customId) {
					case 'first':
						currentPage = 1;
						break;
					case 'previous':
						currentPage = Math.max(1, currentPage - 1);
						break;
					case 'next':
						currentPage = Math.min(totalPages, currentPage + 1);
						break;
					case 'last':
						currentPage = totalPages;
						break;
				}

				const newEmbed = createListEmbed(botList, currentPage, totalPages);
				await i.update({
					embeds: [newEmbed],
					components: [getButtons(currentPage)]
				});
			});

			collector.on('end', async () => {
				try {
					await message.edit({
						components: [] // Remove buttons when collector expires
					});
				} catch (error) {
					console.error('Failed to remove buttons:', error);
				}
			});

			return;

		} else if (action_to_do === 'add-expire') {

			for (let userId in ownihrzClusterData as any) {
				for (let botId in ownihrzClusterData[userId]) {
					if (botId === id_to_bot) {
						let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);
						let time = interaction.options.getString('time') || '0d';

						if (!client.timeCalculator.to_ms(time)) {
							await interaction.editReply({ content: `Invalid time format!` });
							return;
						}

						client.ownihrz.Change_Time(fetch.Cluster, id_to_bot, {
							method: "add",
							ms: client.timeCalculator.to_ms(time)!
						})

						let ExpireIn = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`);
						let expire: string | null = null;

						if (ExpireIn !== null) {
							expire = format(new Date(ExpireIn + client.timeCalculator.to_ms(time)!), 'ddd, MMM DD YYYY');
						}

						await interaction.editReply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!` });
						return;
					}
				}
			};
		} else if (action_to_do === 'sub-expire') {

			for (let userId in ownihrzClusterData as any) {
				for (let botId in ownihrzClusterData[userId]) {
					if (botId === id_to_bot) {
						let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);
						let time = interaction.options.getString('time') || '0d';

						if (!client.timeCalculator.to_ms(time)) {
							await interaction.editReply({ content: `Invalid time format!` });
							return;
						}

						client.ownihrz.Change_Time(fetch.Cluster, id_to_bot, {
							method: "sub",
							ms: client.timeCalculator.to_ms(time)!
						})

						let ExpireIn = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`);
						let expire: string | null = null;

						if (ExpireIn !== null) {
							expire = format(new Date(ExpireIn - client.timeCalculator.to_ms(time)!), 'ddd, MMM DD YYYY');
						}

						await interaction.editReply({
							content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`,
						});
						return;
					}
				}
			};
		}

		return;
	},
};