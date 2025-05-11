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

import { Client, GuildMember, SnowflakeUtil } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {
		if (!member.guild || member.user.bot) return;

		let baseData = await client.db.get(`${member.guild.id}.GUILD.BLOCK_NEW_ACCOUNT`) as DatabaseStructure.BlockNewAccountSchema;
		let joinCount = await client.db.get(`${member.guild.id}.USER.${member.id}.BLOCK_NEW_ACCOUNT`) || 0;

		joinCount++;

		await client.db.set(`${member.guild.id}.USER.${member.id}.BLOCK_NEW_ACCOUNT`, joinCount);

		if (!baseData) return;

		const accountCreationDate = member.user.createdAt;
		const currentTime = Date.now();
		const accountAge = currentTime - accountCreationDate.getTime();

		if (baseData.maxJoin && joinCount >= baseData.maxJoin) {
			member.ban({ reason: "[TooNewAccount] User join too much." })
				.catch(() => { })
				.then(() => { });
		} else if (accountAge < baseData.req) {
			member.kick("[TooNewAccount] Account is too new")
				.catch(() => { })
				.then(() => { });
		}
	},
};