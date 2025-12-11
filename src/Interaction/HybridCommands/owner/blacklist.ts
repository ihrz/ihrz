/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	Client,
	EmbedBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ChatInputCommandInteraction,
	GuildMember,
	ApplicationCommandType,
	Message,
	User
} from 'discord.js'

import { format } from '../../../core/functions/date_and_time.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { blacklistTable } from '../../../Events/client/ready.js';

export const command: Command = {
	name: 'blacklist',

	description: 'Add a user to the blacklist!',
	description_localizations: {
		"fr": "Ajoutez un utilisateur à la liste noir"
	},

	options: [
		{
			name: 'user',
			type: ApplicationCommandOptionType.User,

			description: 'The user you want to blacklist...',
			description_localizations: {
				"fr": "L'utilisateur que vous voulez blacklist"
			},

			required: false,

			permission: null
		},
		{
			name: 'reason',
			type: ApplicationCommandOptionType.String,

			description: 'The reason why you want to blacklist this member',
			description_localizations: {
				"fr": "La raison de pourquoi vous voulez le mettre dans la liste-noire"
			},

			required: false,

			permission: null
		}
	],

	aliases: ["bl"],

	thinking: false,
	category: 'owner',
	type: ApplicationCommandType.ChatInput,
	permission: null,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (!client.func.ownerHelper.isBotOwner(interaction.member.user.id)) {
			await client.func.method.interactionSend(interaction, { content: lang.blacklist_not_owner });
			return;
		};

		const blacklistedUsers = await blacklistTable.all();

		if (interaction instanceof ChatInputCommandInteraction) {
			var targetUser = interaction.options.getUser('user', false);
			var reason = "iHorizon Project Blacklist - " + (interaction.options.getString('reason') || 'blacklisted!');
		} else {
			var targetUser = (await client.func.method.user(interaction, args!, 0));
			var reason = "iHorizon Project Blacklist - " + (client.func.method.longString(args!, 1) || 'blacklisted!');
		};

		const member = targetUser ? interaction.guild.members.cache.get(targetUser?.id) : null;

		if (client.func.ownerHelper.isBotDev(member?.id!)) {
			await client.func.method.interactionSend(interaction, { content: lang.unowner_cant_unowner_creator });
			return;
		};

		if (!member && !targetUser) {
			if (!blacklistedUsers.length) {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_no_one_blacklist
						.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No),
					flags: [1 << 6]
				});
				return;
			};

			let currentPage = 0;
			const usersPerPage = 5;
			const pages: { title: string; description: string; }[] = [];

			for (let i = 0; i < blacklistedUsers.length; i += usersPerPage) {
				const pageUsers = blacklistedUsers.slice(i, i + usersPerPage);
				const pageContent = pageUsers.map(userObj => {
					return `<@${userObj.id}>\n├─ ${userObj.value.createdAt !== undefined ? format(new Date(userObj.value.createdAt), 'MMM DD YYYY') : lang.profil_unknown}\n├─ \`${userObj.value.reason || lang.blacklist_var_no_reason}\`\n├─ By ${userObj.value.owner || lang.profil_unknown}`;
				}).join('\n');

				pages.push({
					title: lang.blacklist_embed_title
						.replace('${i / usersPerPage + 1}', (i / usersPerPage + 1).toString()),
					description: pageContent,
				});
			}

			const createEmbed = () => {
				return new EmbedBuilder()
					.setColor("#2E2EFE")
					.setTitle(pages[currentPage]?.title)
					.setDescription(pages[currentPage]?.description)
					.setFooter({
						text: lang.history_embed_footer_text
							.replace('${currentPage + 1}', (currentPage + 1).toString())
							.replace('${pages.length}', pages.length.toString()),
						iconURL: "attachment://footer_icon.png"
					})
					.setTimestamp();
			};

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('previousPage')
					.setLabel('<<<')
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId('nextPage')
					.setLabel('>>>')
					.setStyle(ButtonStyle.Secondary)
			);

			const messageEmbed = await client.func.method.interactionSend(interaction, {
				embeds: [createEmbed()],
				components: [row],
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});

			const collector = messageEmbed.createMessageComponentCollector({
				filter: async (i) => {
					await i.deferUpdate(); return interaction.member?.user.id === i.user.id;
				},
				time: 60_000 * 16 // 16 minutes
			});

			collector.on('collect', (interaction: { customId: string; }) => {
				if (interaction.customId === 'previousPage') {
					currentPage = (currentPage - 1 + pages.length) % pages.length;
				} else if (interaction.customId === 'nextPage') {
					currentPage = (currentPage + 1) % pages.length;
				}

				messageEmbed.edit({ embeds: [createEmbed()] });
			});

			collector.on('end', () => {
				row.components.forEach((component) => {
					if (component instanceof ButtonBuilder) {
						component.setDisabled(true);
					}
				});
				messageEmbed.edit({ components: [row] });
			});
			return;
		};

		// Function to broadcast ban across all shards
		async function broadcastBanAcrossShards(userId: string, reason: string) {
			// Get total guild count across all shards
			const results = await client.shard?.broadcastEval(
				async (c, { userId, reason }) => {
					const guilds = c.guilds.cache.filter(g => g.memberCount <= 500);
					let successCount = 0;
					const totalGuilds = guilds.size;

					const batchSize = 10;
					const delay = 100;
					const guildIds = Array.from(guilds.keys());

					for (let i = 0; i < guildIds.length; i += batchSize) {
						const batch = guildIds.slice(i, i + batchSize);

						const batchPromises = batch.map(async (guildId) => {
							const guild = c.guilds.cache.get(guildId);
							if (guild) {
								try {
									await guild.members.ban(userId, { reason });
									return true;
								} catch {
									return false;
								}
							}
							return false;
						});

						const batchResults = await Promise.all(batchPromises);
						successCount += batchResults.filter(r => r).length;

						if (i + batchSize < guildIds.length) {
							await new Promise(resolve => setTimeout(resolve, delay));
						}
					}

					return { successCount, totalGuilds };
				},
				{ context: { userId, reason } }
			);

			// Sum up results from all shards
			const totalSuccess = results?.reduce((acc, curr) => acc + curr.successCount, 0) || 0;
			const totalGuilds = results?.reduce((acc, curr) => acc + curr.totalGuilds, 0) || 0;

			return { totalSuccess, totalGuilds };
		}

		if (member) {
			if (member.user.id === client.user.id) {
				await client.func.method.interactionSend(interaction, { content: lang.blacklist_bot_lol });
				return;
			};

			const fetched = await blacklistTable.get(`${member.user.id}`);

			if (fetched && reason) {
				await blacklistTable.set(`${member.user.id}.reason`, reason);
				await client.func.method.interactionSend(interaction, {
					content: lang.var_succes
				})
				return;
			} else if (fetched) {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_already_blacklisted
						.replace(/\${member\.user\.username}/g, member.user.globalName || member.user.username)
				});
				return;
			};

			await blacklistTable.set(`${member.user.id}`, {
				blacklisted: true,
				reason,
				owner: interaction.member.user.id,
				createdAt: new Date().getTime()
			});

			await member.ban({ reason, deleteMessageSeconds: client.timeCalculator.to_ms("30d") }).then(async () => {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_command_work
						.replace(/\${member\.user\.username}/g, String(member?.user.globalName || member?.user.username))
				});
			}).catch(async () => {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_blacklisted_but_can_ban_him
						.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
				});
			});

			// Immediate response to user
			await client.func.method.channelSend(interaction, {
				content: lang.batch_ban_process
					.replace("${member.user.username}", member.user.username)
					.replace("${guilds.length}", "all shards")
			});

			// Asynchronous background processing across all shards
			setImmediate(async () => {
				const { totalSuccess, totalGuilds } = await broadcastBanAcrossShards(member.user.id, reason);
				let score = `${totalSuccess}/${totalGuilds}`;
				let username = member?.user.username;

				// Final notification
				await client.func.method.channelSend(interaction, {
					content: lang.blacklist_command_work_shard
						.replace("{score}", score)
						.replace("{username}", username)
						.replace("${totalSuccess}", totalSuccess.toString())
				});
			});

		} else if (targetUser) {

			if (targetUser.id === client.user.id) {
				await client.func.method.interactionSend(interaction, { content: lang.blacklist_bot_lol });
				return;
			};

			const fetched = await blacklistTable.get(`${targetUser.id}`);

			if (fetched) {
				await client.func.method.interactionSend(interaction, {
					content: lang.blacklist_already_blacklisted
						.replace(/\${member\.user\.username}/g, targetUser.globalName || targetUser.username)
				});
				return;
			}

			await blacklistTable.set(`${targetUser.id}`, {
				blacklisted: true,
				reason,
				owner: interaction.member.user.id,
				createdAt: new Date().getTime()
			});

			await client.func.method.interactionSend(interaction, {
				content: lang.blacklist_command_work
					.replace(/\${member\.user\.username}/g, targetUser.globalName || targetUser.username)
			});

			// Immediate response to user
			await client.func.method.channelSend(interaction, {
				content: lang.batch_ban_process
					.replace("${member.user.username}", targetUser.globalName || targetUser.username)
					.replace("${guilds.length}", "all shards")
			});

			// Asynchronous background processing across all shards
			setImmediate(async () => {
				const { totalSuccess, totalGuilds } = await broadcastBanAcrossShards(targetUser!.id, reason);
				let username = String(targetUser?.globalName || targetUser?.username);
				let score = `${totalSuccess}/${totalGuilds}`;

				// Final notification
				await client.func.method.channelSend(interaction, {
					content: lang.blacklist_command_work_shard
						.replace("{score}", score)
						.replace("{username}", username)
						.replace("${totalSuccess}", totalSuccess.toString())
				});
			});
		}
	},
};