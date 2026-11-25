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

import { Client, GuildMember } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import {
	boostChange,
	buildBoostPayload,
	deliverBoostMessage
} from "../../core/modules/boostMessage.js";

/**
 * Boost message (`GUILD.BOOST_MESSAGE`, `/guildconfig set boost-message`):
 * a thank-you when a member boosts, a goodbye when the boost ends — in the
 * configured channel and/or in DM. Same detection as the boost logs.
 */
export const event: BotEvent = {
	name: "guildMemberUpdate",
	run: async (
		client: Client,
		oldMember: GuildMember,
		newMember: GuildMember
	) => {
		const kind = boostChange(oldMember, newMember);
		if (!kind) return;

		try {
			const side = (await client.db.get(
				`${newMember.guild.id}.GUILD.BOOST_MESSAGE.${kind}`
			)) as DatabaseStructure.BoostMessageSide | null;
			if (!side?.enabled) return;

			const [lang, guildLocal] = await Promise.all([
				client.func.getLanguageData(newMember.guild.id),
				client.db.get(`${newMember.guild.id}.GUILD.LANG.lang`)
			]);

			const { payload, plan } = await buildBoostPayload(
				newMember,
				kind,
				side,
				lang,
				(guildLocal as string | null) || "en-US"
			);
			if (!payload) return;

			await deliverBoostMessage(newMember, payload, plan);
		} catch (error) {
			logger.err(error);
		}
	}
};
