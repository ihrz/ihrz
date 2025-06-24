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
	EmbedBuilder,
	ChatInputCommandInteraction,
	Role,
	Message
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { processBatchAsync } from '../../../core/functions/batchProcessor.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var action_1 = interaction.options.getString("action");
			var part_of_nickname = interaction.options.getString("nickname")?.toLowerCase();
			var role = interaction.options.getRole('role');
		} else {

			var action_1 = client.func.method.string(args!, 0);
			var part_of_nickname = client.func.method.string(args!, 1)?.toLowerCase();
			var role = client.func.method.role(interaction, args!, 2);
		};

		if (!part_of_nickname || !role) return;
		let a: number = 0;
		let s: number = 0;
		let e: number = 0;

		if (action_1 === 'add') {

			try {
				const members = await interaction.guild.members.fetch();
				const membersToProcess = Array.from(members.values()).filter(member =>
					(
						member.user.globalName?.toLowerCase().includes(part_of_nickname!)
						|| (member.nickname && member.nickname.toLowerCase().includes(part_of_nickname!))
					)
					&& !member.roles.cache.has(role?.id!)
				);

				// Count members that were skipped
				s = members.size - membersToProcess.length;

				// Send immediate response
				const ogInteraction = await client.func.method.interactionSend(interaction, {
					content: lang.batch_massiverole_process.replace("${membersToProcess.length}", membersToProcess.length.toString())
				});

				// Process in batches asynchronously
				processBatchAsync(
					membersToProcess,
					async (member) => {
						try {
							await member.roles.add(role as Role, "[NickRole] Module");
							a++;
							return true;
						} catch {
							e++;
							return false;
						}
					},
					{ batchSize: 10, delay: 150 },
					async (result) => {
						// Continue with embed creation after async processing
						const embed = new EmbedBuilder()
							.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
							.setColor('#007fff')
							.setTimestamp()
							.setThumbnail(interaction.guild!.iconURL())
							.setDescription(lang.nickrole_add_command_work
								.replace('${interaction.user}', interaction.member!.user.toString())
								.replace('${a}', a.toString())
								.replace('${s}', s.toString())
								.replace('${e}', e.toString())
								.replace('${part_of_nickname}', part_of_nickname!)
								.replaceAll('${role}', role?.toString()!)
							);

						await client.func.method.interactionSend(interaction, {
							embeds: [embed],
							files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
						});
					}
				);
				return;
			} catch (error) { }

		} else if (action_1 === 'sub') {
			try {
				const members = await interaction.guild?.members.fetch();
				const membersToProcess = Array.from(members!.values()).filter(member =>
					(
						member.user.globalName?.toLowerCase().includes(part_of_nickname!)
						|| (member.nickname && member.nickname.toLowerCase().includes(part_of_nickname!))
					)
					&& member.roles.cache.has(role?.id!)
				);

				// Count members that were skipped
				s = members!.size - membersToProcess.length;

				// Send immediate response
				const ogInteraction = await client.func.method.interactionSend(interaction, {
					content: lang.batch_unmassiverole_process.replace("${membersToProcess.length}", membersToProcess.length.toString())
				});

				// Process in batches asynchronously
				processBatchAsync(
					membersToProcess,
					async (member) => {
						try {
							await member.roles.remove(role!.id, "[NickRole] Module");
							a++;
							return true;
						} catch {
							e++;
							return false;
						}
					},
					{ batchSize: 10, delay: 150 },
					async (result) => {
						// Continue with embed creation after async processing
						const embed = new EmbedBuilder()
							.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
							.setColor('#007fff')
							.setTimestamp()
							.setThumbnail(interaction.guild!.iconURL())
							.setDescription(lang.nickrole_sub_command_work
								.replace('${interaction.user}', interaction.member!.user.toString())
								.replace('${a}', a.toString())
								.replace('${s}', s.toString())
								.replace('${e}', e.toString())
								.replace('${part_of_nickname}', part_of_nickname!)
								.replaceAll('${role}', role?.toString()!)
							);

						await client.func.method.interactionSend(interaction, {
							embeds: [embed],
							files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
						});
					}
				);
				return;
			} catch (error) { }
		};
		return;
	},
};