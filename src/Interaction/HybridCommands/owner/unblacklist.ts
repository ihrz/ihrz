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
	Client,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	UserResolvable,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';
import { blacklistTable, ownerTable } from '../../../Events/client/ready.js';

export const command: Command = {
	name: 'unblacklist',

	description: 'The user you want to unblacklist (Only Owner of ihorizon)!',
	description_localizations: {
		"fr": "Enlever un utilisateur de la liste noir.(Seulement pour les dev)"
	},

	options: [
		{
			name: 'user',
			type: ApplicationCommandOptionType.User,

			description: 'The user you want to unblacklist (Only Owner of ihorizon)',
			description_localizations: {
				"fr": "L'utilisateur que vous souhaitez supprimer de la liste noire (uniquement propriétaire d'ihorizon)"
			},

			required: true,

			permission: null
		}
	],

	aliases: ["unbl"],

	thinking: false,
	category: 'owner',
	type: ApplicationCommandType.ChatInput,
	permission: null,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (!await ownerTable.get(`${interaction.member.user.id}.owner`)) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_owner });
			return;
		};

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getUser('user');
		} else {
			var member = await client.func.method.user(interaction, args!, 0);
		};

		const fetched = await blacklistTable.get(`${member?.id}`);

		if (!fetched) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_blacklisted.replace("${member.id}", member?.id!) });
			return;
		};

		if (String(fetched.reason).toLowerCase().includes("transphobia")) {
			await client.func.method.interactionSend(interaction, client.iHorizon_Emojis.No + " | **Transphobia is a dangerous behavior, and in this case, it was even directed towards project staff. I will not remove him from the blacklist.**")
			return;
		}

		// Function to broadcast unban across all shards
		async function broadcastUnbanAcrossShards(userId: string, username: string) {
			const results = await client.shard?.broadcastEval(
				async (c, { userId, username }) => {
					const guilds = c.guilds.cache.filter(g =>
						g.members.me?.permissions.has("BanMembers") && g.memberCount <= 500
					);
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
									await guild.members.unban(userId, "iHorizon Unblacklist").catch(() => { })
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
				{ context: { userId, username } }
			);

			// Sum up results from all shards
			const totalSuccess = results?.reduce((acc, curr) => acc + curr.successCount, 0) || 0;
			const totalGuilds = results?.reduce((acc, curr) => acc + curr.totalGuilds, 0) || 0;

			return { totalSuccess, totalGuilds };
		}

		try {
			const bannedMember = await client.users.fetch(member?.id as UserResolvable).catch(() => null);

			if (!bannedMember) {
				await client.func.method.interactionSend(interaction, { content: lang.unblacklist_user_is_not_exist });
				return;
			};

			await blacklistTable.delete(`${member?.id}`);
			await interaction.guild.members.unban(bannedMember);

			await client.func.method.interactionSend(interaction, {
				content: lang.unblacklist_command_work.replace(/\${member\.id}/g, member?.id!)
			});

			// Send immediate response
			await client.func.method.channelSend(interaction, {
				content: lang.batch_unblacklist_process
					.replace("${bannedMember.username}", bannedMember.username)
					.replace("${guildObjects.length}", "all shards")
			});

			// Process unbans across all shards asynchronously
			setImmediate(async () => {
				const { totalSuccess, totalGuilds } = await broadcastUnbanAcrossShards(
					bannedMember.id,
					bannedMember.username
				);
				let score = `${totalSuccess}/${totalGuilds}`;


				// Send final result when processing is complete
				await client.func.method.channelSend(interaction, {
					content: lang.unblacklist_command_work_across_all_shard
						.replace("${bannedMember.username}", bannedMember.username)
						.replace("${totalSuccess}", totalSuccess.toString())
						.replace("${score}", score)
				});
			});

			return;
		} catch (e) {
			await blacklistTable.delete(`${member?.id}`);
			await client.func.method.interactionSend(interaction, {
				content: lang.unblacklist_unblacklisted_but_can_unban_him.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
			});
			return;
		};
	},
};