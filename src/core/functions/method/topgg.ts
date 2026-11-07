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
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	ActionRowData,
	APIMessageTopLevelComponent,
	JSONEncodable,
	MessageActionRowComponentBuilder,
	MessageActionRowComponentData,
	TopLevelComponentData
} from "discord.js";
import { apiTable } from "../../../Events/client/ready.js";

export async function shouldAdvertiseTheTopggVoteButton(
	authorId: string
): Promise<boolean> {
	return false;
	// const lastVoteTimestamp = (await apiTable.get(`topgg_vote.${authorId}.timestamp`));
	// const isAlreadyNotified = (await apiTable.get(`topgg_vote.${authorId}.notified`) || false);

	// if (isAlreadyNotified) return false;
	// if (!lastVoteTimestamp) return true;

	// const twelveHours = 12 * 60 * 60 * 1000;

	// await apiTable.set(`topgg_vote.${authorId}.notified`, true)

	// return Date.now() - lastVoteTimestamp >= twelveHours;
}

export function generateTopggActionRow(): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(`https://top.gg/bot/${client.user?.id}/vote`)
			.setLabel("Vote for iHorizon")
			.setEmoji(client.iHorizon_Emojis.TOPGG)
	);
}

export type components = readonly (
	| JSONEncodable<APIMessageTopLevelComponent>
	| TopLevelComponentData
	| ActionRowData<
			MessageActionRowComponentData | MessageActionRowComponentBuilder
	  >
	| APIMessageTopLevelComponent
)[];

export async function addTopggButonToTheActualComponents(
	current: components
): Promise<components> {
	const topggActionRow = await generateTopggActionRow();

	if (!current || current.length === 0) {
		return [topggActionRow];
	}

	return [...current, topggActionRow];
}
