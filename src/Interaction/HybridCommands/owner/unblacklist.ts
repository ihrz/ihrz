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
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	GuildMember,
	UserResolvable,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

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

		let tableOwner = client.db.table('OWNER');
		let tableBlacklist = client.db.table('BLACKLIST');

		if (!await tableOwner.get(`${interaction.member.user.id}.owner`)) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_owner });
			return;
		};

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getUser('user');
		} else {

			var member = await client.func.method.user(interaction, args!, 0);
		};

		let fetched = await tableBlacklist.get(`${member?.id}`);
		let guilds = client.guilds.cache.map(guild => guild.id);

		if (!fetched) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_blacklisted.replace("${member.id}", member?.id!) });
			return;
		};

		try {
			let bannedMember = await client.users.fetch(member?.id as UserResolvable);

			if (!bannedMember) {
				await client.func.method.interactionSend(interaction, { content: lang.unblacklist_user_is_not_exist });
				return;
			};

			await tableBlacklist.delete(`${member?.id}`);
			await interaction.guild.members.unban(bannedMember);

			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_command_work.replace(/\${member\.id}/g, member?.id!) });

			let banPromises = guilds.map(async (guildId) => {
				let guild = client.guilds.cache.find(guild => guild.id === guildId);
				if (guild) {
					try {
						await guild.members.unban(bannedMember.id!, "iHorizon Unblacklist");
						return true;
					} catch {
						return false;
					}
				}
				return false;
			});

			let results = await Promise.all(banPromises);
			let successCount = results.filter(result => result).length;

			await client.func.method.channelSend(interaction, { content: `${bannedMember.username} is now unbanned on **${successCount}** server(s) (\`${successCount}/${guilds.length}\`)` });

			return;
		} catch (e) {
			await tableBlacklist.delete(`${member?.id}`);
			await client.func.method.interactionSend(interaction, {
				content: lang.unblacklist_unblacklisted_but_can_unban_him.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
			});
			return;
		};
	},
	permission: null
};