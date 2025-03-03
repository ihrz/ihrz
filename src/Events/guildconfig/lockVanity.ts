/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { AuditLogEvent, Client, Guild, Message, SnowflakeUtil } from 'discord.js';

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
	name: "guildUpdate",
	run: async (client: Client, oldGuild: Guild, newGuild: Guild) => {
		// // Check if the VanityURL have changed
		// if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;

		// // Get the audit logs for more informations about this
		// const fetchedLogs = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate });

		// // Get the good logs by filter with the last entries and the specific update
		// let filteredLog = fetchedLogs.entries
		//     .filter(x => x.targetType === "Guild" && x.actionType === "Update").first();

		// // The changes Object needed
		// const fetchVanityChange = filteredLog?.changes.find(x => x.key === "vanity_url_code");

		// // The author of this changement
		// const author = filteredLog?.executor;

		// // If the author are the guild owner pass
		// if (author?.id === newGuild.ownerId) return;

		// // Re-set the VanityURL to the old code
		// const req = await fetch(`https://discord.com/api/v9/guilds/${newGuild.id}/vanity-url`, {
		//     method: "PATCH",
		//     headers: {
		//         "Accept": "*/*",
		//         "Content-Type": "application/json",
		//         "Authorization": `${await client.db.get(`${newGuild.id}.UTILS.selfbot_token`)}`
		//     },
		//     body: JSON.stringify({ code: fetchVanityChange?.old })
		// });

		// const data = await req.json();

		// console.log(data)
		// // If not, sanction them
		// const member = newGuild.members.cache.get(author?.id!);

		// if (member?.bannable) {
		//     await member.ban({ reason: "[LockVanity] Have tried to change the vanity url !" })
		// } else {
		//     // Bot try to derank the member if are not bannable
		//     await member?.roles.set([]);
		// }
	},
};