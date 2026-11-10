/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	BaseGuildTextChannel,
	Channel,
	ChatInputCommandInteraction,
	Client,
	Message
} from "discord.js";

import {
	checkGiveawayOptions,
	startGiveaway
} from "../../../core/modules/giveawaysManager.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const giveawayChannel = interaction.channel! as Channel;

		const opts = client.func.method.options(interaction, args);
		const giveawayNumberWinners = opts.number("winner", 0)!;
		const giveawayDuration = opts.string("time", 1);
		const giveawayRequirement = opts.string("requirement", 2) as
			"none" | "invites" | "messages" | "roles";
		const giveawayPrize = opts.string("prize", 3);
		const giveawayRequirementValue = opts.string("requirement-value", 4);
		const imageUrl =
			interaction instanceof ChatInputCommandInteraction
				? (interaction.options.getString("image") as string)
				: "";

		const giveawayDurationFormated = client.timeCalculator.to_ms(
			giveawayDuration!
		);
		const requirement = {
			type: giveawayRequirement,
			value: giveawayRequirementValue
		};

		const error = checkGiveawayOptions(client, interaction.guild, {
			winnerCount: giveawayNumberWinners as number,
			durationMs: giveawayDurationFormated,
			requirement
		});

		if (error) {
			const content =
				error === "winners"
					? lang.start_is_not_valid
					: error === "duration"
						? lang.start_time_not_valid.replace(
								"${author}",
								interaction.member.user.toString()
							)
						: (error === "invites"
								? lang.start_invalid_invites_req_value
								: error === "messages"
									? lang.start_invalid_messages_req_value
									: lang.start_invalid_roles_req_value
							).replace("${emoji_No}", client.iHorizon_Emojis.No);
			await client.func.method.interactionSend(interaction, { content });
			return;
		}

		await startGiveaway(client, giveawayChannel as BaseGuildTextChannel, {
			winnerCount: giveawayNumberWinners as number,
			durationMs: giveawayDurationFormated,
			prize: giveawayPrize,
			hostedBy: interaction.member.user.id,
			imageUrl,
			requirement
		});

		await client.func.ihorizon_logs(interaction, {
			title: lang.reroll_logs_embed_title,
			description: lang.start_logs_embed_description
				.replace("${authorId}", interaction.member.user.id)
				.replaceAll("${giveawayChannel}", giveawayChannel.toString()!)
		});

		await client.func.method.interactionSend(interaction, {
			content: lang.start_confirmation_command.replaceAll(
				"${giveawayChannel}",
				giveawayChannel.toString()
			)
		});

		return;
	}
};
