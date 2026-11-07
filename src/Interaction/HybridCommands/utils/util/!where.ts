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

import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		const opts = client.func.method.options(interaction, args);
		const member = opts.member("member", 0);

		if (!member) {
			await client.func.method.interactionSend(interaction, {
				content: lang.ban_dont_found_member
			});
			return;
		}

		const member_is_connected = member?.voice.channel ? true : false;

		if (!member_is_connected) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_not_in_vc
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const voice = member.voice;
		const yesNo = (value: boolean | null) =>
			value ? `${e.Yes} ${lang.var_yes}` : `${e.No} ${lang.var_no}`;

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: member.displayColor || ACCENT.success,
				emoji: e.Voice_Channel,
				title: lang.where_card_title.replace(
					"${member}",
					member.displayName
				),
				thumbnail: member.displayAvatarURL({
					size: 256,
					forceStatic: false
				}),
				fields: [
					{
						emoji: e.VC_Limit,
						label: lang.where_label_member,
						value: member.toString()
					},
					{
						emoji: e.VC_Name,
						label: lang.where_label_channel,
						value: voice.channel!.toString()
					}
				],
				blocks: [
					[
						`${e.Streaming} **${lang.where_label_stream}** : ${yesNo(voice.streaming)}`,
						`${e.Camera} **${lang.where_label_video}** : ${yesNo(voice.selfVideo)}`,
						`${e.Mute} **${lang.where_label_mute}** : ${yesNo(voice.selfMute)}`,
						`${e.Deaf} **${lang.where_label_deaf}** : ${yesNo(voice.selfDeaf)}`
					].join("\n")
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
