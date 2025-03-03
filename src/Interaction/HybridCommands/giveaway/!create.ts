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
	BaseGuildTextChannel,
	Channel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	PermissionsBitField,
	TextBasedChannel,
} from 'discord.js';

import { AxiosResponse, axios } from '../../../core/functions/axios.js';
import logger from '../../../core/logger.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


async function isImageUrl(url: string): Promise<boolean> {
	try {
		const response = await axios.head(url);
		const contentType = response.headers.get("content-type");
		return contentType.startsWith("image/");
	} catch (error) {
		return false;
	}
};
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		var giveawayChannel = interaction.channel! as Channel;

		if (interaction instanceof ChatInputCommandInteraction) {
			var giveawayRequirement = interaction.options.getString("requirement") as "none" | "invites" | "messages" | "roles";
			var giveawayRequirementValue = interaction.options.getString("requirement-value");
			var giveawayDuration = interaction.options.getString("time");
			var giveawayNumberWinners = interaction.options.getNumber("winner")!;
			var imageUrl = interaction.options.getString('image') as string;
			var giveawayPrize = interaction.options.getString("prize");
		} else {

			var giveawayNumberWinners = client.func.method.number(args!, 0);
			var giveawayDuration = client.func.method.string(args!, 1);
			var giveawayRequirement = client.func.method.string(args!, 2) as "none" | "invites" | "messages" | "roles";
			var giveawayPrize = client.func.method.string(args!, 3);
			var giveawayRequirementValue = client.func.method.string(args!, 4);
			var imageUrl = ""
		};

		if (isNaN(giveawayNumberWinners as number) || (parseInt(giveawayNumberWinners.toString()) <= 0)) {
			await client.func.method.interactionSend(interaction, { content: lang.start_is_not_valid });
			return;
		};

		let giveawayDurationFormated = client.timeCalculator.to_ms(giveawayDuration!);

		if (!giveawayDurationFormated) {
			await client.func.method.interactionSend(interaction, {
				content: lang.start_time_not_valid
					.replace('${interaction.user}', interaction.member.user.toString())
			});
			return;
		};

		if (giveawayRequirement === "invites" && !client.func.method.isNumber(giveawayRequirementValue || "")) {
			await client.func.method.interactionSend(interaction, {
				content: lang.start_invalid_invites_req_value
					.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
			});
			return;
		} else if (giveawayRequirement === 'messages' && !client.func.method.isNumber(giveawayRequirementValue || "")) {
			await client.func.method.interactionSend(interaction, {
				content: lang.start_invalid_messages_req_value
					.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
			});
			return;
		} else if (giveawayRequirement === "roles" && !interaction.guild.roles.cache.has(giveawayRequirementValue || "")) {
			await client.func.method.interactionSend(interaction, {
				content: lang.start_invalid_roles_req_value
					.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
			});
			return;
		}

		await client.giveawaysManager.create(giveawayChannel as BaseGuildTextChannel, {
			duration: giveawayDurationFormated,
			prize: giveawayPrize as string,
			winnerCount: giveawayNumberWinners as number,
			hostedBy: interaction.member.user.id,
			embedImageURL: await isImageUrl(imageUrl) ? imageUrl : null,
			requirement: { type: giveawayRequirement, value: giveawayRequirementValue }
		});

		await client.func.ihorizon_logs(interaction, {
			title: lang.reroll_logs_embed_title,
			description: lang.start_logs_embed_description
				.replace('${interaction.user.id}', interaction.member.user.id)
				.replace(/\${giveawayChannel}/g, giveawayChannel.toString()!)
		});

		await client.func.method.interactionSend(interaction, {
			content: lang.start_confirmation_command
				.replace(/\${giveawayChannel}/g, giveawayChannel.toString())
		});

		return;
	},
};