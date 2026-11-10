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
	Client,
	ChatInputCommandInteraction,
	Message,
	GuildMember,
	PermissionFlagsBits,
	ChannelType
} from "discord.js";

import logger from "../../../../core/logger.js";
import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import { enableTalkMode } from "../../../../core/modules/voiceModes.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const member = interaction.member as GuildMember;
		const voiceChannel = member.voice.channel;

		if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_talk_not_in_vc
			});
			return;
		}

		const { mutedCount, skippedCount } = await enableTalkMode(
			interaction.guild,
			voiceChannel,
			member,
			lang
		);

		await client.func.method.interactionSend(interaction, {
			content: lang.util_talk_command_work
				.replace("${voiceChannel}", voiceChannel.toString())
				.replace("${mutedCount}", mutedCount.toString())
				.replace("${skippedCount}", skippedCount.toString())
		});
		return;
	}
};
