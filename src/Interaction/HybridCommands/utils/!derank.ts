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
	GuildMember,
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
			var member = interaction.options.getMember("member") as GuildMember;
		} else {
			var member = client.func.method.member(interaction, args!, 0) || interaction.member;
		};

		if (!member) {
			await client.func.method.interactionSend(interaction, { content: lang.perm_list_no_user });
			return;
		}

		const rolesToRemove = Array.from(member.roles.cache.values()).filter(role => role.id !== role.guild.roles.everyone.id);

		let good = 0;
		let bad = 0;

		if (rolesToRemove.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.derank_no_role
			});
			return;
		}

		// Send immediate response
		const ogInteraction = await client.func.method.interactionSend(interaction, {
			content: lang.batch_derank_process
				.replace("${rolesToRemove.length}", rolesToRemove.length.toString())
				.replace("${member.user.username}", member.user.username)
		});

		// Process role removal in batches asynchronously
		processBatchAsync(
			rolesToRemove,
			async (role) => {
				try {
					await member.roles.remove(role.id, "[Derank] Module");
					good++;
					return true;
				} catch {
					bad++;
					return false;
				}
			},
			{ batchSize: 5, delay: 100 },
			async (result) => {
				// Send final result when processing is complete
				const embed = new EmbedBuilder()
					.setColor(2829617)
					.setTimestamp()
					.setDescription(lang.derank_msg_desc_embed
						.replace('${good}', good.toString())
						.replace('${bad}', bad.toString())
						.replace('${member.id}', member.id)
					)
					.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

				await client.func.method.interactionSend(interaction, {
					embeds: [embed],
					files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
				});
			}
		);
	},
};