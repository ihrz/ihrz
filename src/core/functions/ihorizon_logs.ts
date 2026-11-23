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

// The iHorizon logs channel (created by /guildconfig setup): ~60 commands log what they did there with a title
// and a description. Posted as a Components V2 log card (logCard.ts: accent, `## emoji title`, the bot name and
// the time, no pings), and only in a channel @everyone cannot see (hasIhorizonLogs.ts).

import { Guild } from "discord.js";

import { sendLogCard } from "../modules/logCard.js";
import { findIhorizonLogsChannel } from "./hasIhorizonLogs.js";

export default async function send(
	// An interaction, a message, or anything with the guild (dashboard actions).
	interaction: { guild?: Guild | null },
	embed: {
		title: string;
		description: string;
	}
): Promise<void> {
	try {
		const guild = interaction.guild;
		const channel = findIhorizonLogsChannel(guild);
		if (!guild || !channel) return;

		await sendLogCard(channel, {
			kind: "info",
			emoji: guild.client.iHorizon_Emojis?.Logs,
			title: embed.title,
			description: embed.description
		});
	} catch {}
}
