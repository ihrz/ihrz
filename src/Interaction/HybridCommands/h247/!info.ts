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

import { ChatInputCommandInteraction, Client, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";
import { getH247Data } from "../../../core/modules/h247Manager.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";

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

		const h247Data = await getH247Data(client, interaction.guild.id);
		const isActive = !!h247Data?.enabled;

		const e = client.iHorizon_Emojis;

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: isActive ? ACCENT.success : ACCENT.danger,
				emoji: e.Voice_Channel,
				title: lang.h247_info_embed_title,
				description: lang.h247_info_embed_description,
				thumbnail: interaction.guild.iconURL({ size: 256 }),
				fields: [
					{
						emoji: isActive ? e.Yes : e.No,
						label: lang.h247_info_field_status,
						value: isActive ? lang.var_enabled : lang.var_disabled
					},
					isActive &&
						h247Data && {
							emoji: e.Player_Headphones,
							label: lang.var_voice_channel,
							value: `<#${h247Data.voiceChannelId}>`
						}
				],
				blocks: [
					`${e.Documentation} **${lang.h247_info_field_howto}**\n${lang.h247_info_howto_value}`
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
	}
};
