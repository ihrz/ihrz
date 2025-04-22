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
	ChatInputCommandInteraction,
	Message,
	TextChannel,
	User,
} from 'discord.js';

import { SubCommand } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		try {
			if (!client.user || !interaction.guild || !interaction.channel) return;

			if (interaction instanceof ChatInputCommandInteraction) {
				var messageId = interaction.options.getString('message_id', true);
				var roleId = interaction.options.getRole('role', true).id;
			} else {
				var messageId = client.func.method.string(args!, 0)!;
				var roleId = client.func.method.role(interaction, args!, 1)?.id!;
			}

			const guild = interaction.guild;
			const role = guild.roles.cache.get(roleId);
			if (!role) {
				await client.func.method.interactionSend(interaction, { content: lang.addrolereact_role_not_found });
				return;
			}

			const member = interaction.member;
			if (!member) {
				await client.func.method.interactionSend(interaction, { content: lang.addrolereact_cannot_check_permissions });
				return;
			}

			const highestUserRole = member.roles.highest;

			if (role.position >= highestUserRole.position) {
				await client.func.method.interactionSend(interaction, {
					content: lang.addrolereact_role_too_high
				});
				return;
			}

			const channel = interaction.channel;
			if (!(channel instanceof TextChannel)) {
				await client.func.method.interactionSend(interaction, { content: lang.addrolereact_must_be_text_channel });
				return;
			}

			const message = await channel.messages.fetch(messageId).catch(() => null);
			if (!message) {
				await client.func.method.interactionSend(interaction, { content: lang.addrolereact_message_not_found });
				return;
			}

			const reactions = message.reactions.cache;
			if (reactions.size === 0) {
				await client.func.method.interactionSend(interaction, { content: lang.addrolereact_no_reactions });
				return;
			}

			const replyMessage = await client.func.method.interactionSend(interaction, {
				content: lang.addrolereact_adding_role.replace('{role}', role.name)
			});
			let totalUsersAffected = 0;

			for (const reaction of reactions.values()) {
				const users = await reaction.users.fetch();
				const reactedUsers = users.filter((user: User) => !user.bot);

				client.func.method.interactionSend(replyMessage,
					lang.addrolereact_adding_role_progress
						.replace('{role}', role.name)
						.replace('{count}', reactedUsers.size.toString())
				);

				for (const user of reactedUsers.values()) {
					try {
						const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
						if (member && !member.roles.cache.has(roleId)) {
							await member.roles.add(role, "[RoleReact] Assign role");
							totalUsersAffected++;
						}
					} catch (error) {
					}
				}
			}

			client.func.method.interactionSend(replyMessage,
				lang.addrolereact_role_added
					.replace('{role}', role.name)
					.replace('{count}', totalUsersAffected.toString())
			);
		} catch (error) {
			await client.func.method.interactionSend(interaction, { content: lang.addrolereact_error });
		}
	},
};