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
import { processBatchAsync } from '../../../core/functions/batchProcessor.js';

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
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const tableOwner = client.db.table('OWNER');
		const tableBlacklist = client.db.table('BLACKLIST');

		if (!await tableOwner.get(`${interaction.member.user.id}.owner`)) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_owner });
			return;
		};

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getUser('user');
		} else {

			var member = await client.func.method.user(interaction, args!, 0);
		};

		const fetched = await tableBlacklist.get(`${member?.id}`);
		const guilds = client.guilds.cache.map(guild => guild.id);

		if (!fetched) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_blacklisted.replace("${member.id}", member?.id!) });
			return;
		};

		try {
			const bannedMember = await client.users.fetch(member?.id as UserResolvable);

			if (!bannedMember) {
				await client.func.method.interactionSend(interaction, { content: lang.unblacklist_user_is_not_exist });
				return;
			};

			await tableBlacklist.delete(`${member?.id}`);
			await interaction.guild.members.unban(bannedMember);

			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_command_work.replace(/\${member\.id}/g, member?.id!) });

			const guildObjects = guilds.map(guildId => client.guilds.cache.find(guild => guild.id === guildId)).filter(guild => guild !== undefined);

			// Send immediate response
			await client.func.method.channelSend(interaction, {
				content: lang.batch_unblacklist_process
					.replace("${bannedMember.username}", bannedMember.username)
					.replace("${guildObjects.length}", guildObjects.length.toString())
			});

			// Process unbans in batches asynchronously
			processBatchAsync(
				guildObjects,
				async (guild) => {
					if (guild.members.me?.permissions.has("BanMembers")) {
						try {
							await guild.members.unban(bannedMember.id!, "iHorizon Unblacklist");
							return true;
						} catch {
							return false;
						}
					}
					return false;
				},
				{ batchSize: 10, delay: 100 },
				async (result) => {
					// Send final result when processing is complete
					await client.func.method.channelSend(interaction, {
						content: `✅ ${bannedMember.username} is now unbanned on **${result.success}** server(s) (\`${result.success}/${guildObjects.length}\`)`
					});
				}
			);

			return;
		} catch (e) {
			await tableBlacklist.delete(`${member?.id}`);
			await client.func.method.interactionSend(interaction, {
				content: lang.unblacklist_unblacklisted_but_can_unban_him.replace("${client.iHorizon_Emojis.No}", client.iHorizon_Emojis.No)
			});
			return;
		};
	},
	permission: null
};