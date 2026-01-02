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

import { Client, GuildMember, PermissionFlagsBits } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { blacklistTable } from './ready.js';

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {

		if (member.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
			const data = await blacklistTable.get(`${member.user.id}`);

			if (data?.blacklisted === true) {
				await member.send({ content: "You have been banned, because you are blacklisted from iHorizon. \nReason: \`" + data.reason + '\`' })
					.catch(() => { })
				member.ban({ reason: `OWNIHRZ Project Punishement - Blacklist | Reason: ${data.reason}` })
					.catch(() => { })
					.then(() => { });
			}

			const data2 = await client.db.get(`${member.guild.id}.BLACKLIST.${member.id}`);

			if (data2?.blacklisted === true) {
				await member.send({ content: "You have been banned, because you are blacklisted from this server. \nReason: \`" + data2?.reason + '\`' })
					.catch(() => { })
				member.ban({ reason: `Blacklist | Reason: ${data2?.reason}` })
					.catch(() => { })
					.then(() => { });
			}
		}
	},
};
