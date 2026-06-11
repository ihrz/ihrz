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

import { BaseGuildTextChannel, ChannelType, Client, Message } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

import { scheduleStickyChannelRefresh } from "../../core/modules/stickyMessageManager.js";

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (
			!message.guild ||
			!message.channel ||
			message.author.bot ||
			message.webhookId
		)
			return;
		if (message.channel.type !== ChannelType.GuildText) return;

		const stickyConfig = (await client.db.get(
			`${message.guild.id}.STICKY.${message.channelId}`
		)) as DatabaseStructure.StickyChannelConfig | null;

		if (!stickyConfig?.enabled) return;

		scheduleStickyChannelRefresh(
			client,
			message.channel as BaseGuildTextChannel
		);
	}
};
