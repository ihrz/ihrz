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

import { Client, GuildMember, BaseGuildTextChannel, SnowflakeUtil } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export const event: BotEvent = {
	name: "guildMemberRemove",
	run: async (client: Client, member: GuildMember) => {

		const nonce = SnowflakeUtil.generate().toString();
		const data = await client.func.getLanguageData(member.guild.id);
		const guildLocal = await client.db.get(`${member.guild.id}.GUILD.LANG.lang`) || "en-US";
		const base = await client.db.get(`${member.guild.id}.USER.${member.user.id}.INVITES.BY`);
		const lChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`);
		const leaveMessage = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`);

		let messageContent = '';
		if (base?.inviter) {
			const inviter = await client.users.fetch(base.inviter);
			const inviterStats = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES`) as DatabaseStructure.InvitesUserData;

			if (inviterStats) {
				if (inviterStats?.invites && inviterStats.invites >= 1) {
					await client.db.sub(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`, 1);
				}
				await client.db.add(`${member.guild.id}.USER.${inviter.id}.INVITES.leaves`, 1);
			}

			const invitesAmount = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`);
			messageContent = client.func.method.generateCustomMessagePreview(
				leaveMessage || data.event_goodbye_inviter,
				{
					user: member.user,
					guild: member.guild,
					guildLocal: guildLocal,
					inviter: {
						user: {
							username: inviter.username,
							mention: inviter.toString()
						},
						invitesAmount
					}
				}
			);
		} else {
			messageContent = client.func.method.generateCustomMessagePreview(
				leaveMessage || data.event_goodbye_default,
				{
					user: member.user,
					guild: member.guild,
					guildLocal: guildLocal,
				}
			);
		}

		if (!lChan || !member.guild.channels.cache.get(lChan)) return;

		try {
			const lChanManager = member.guild.channels.cache.get(lChan) as BaseGuildTextChannel;
			await lChanManager.send({
				content: messageContent,
				enforceNonce: true,
				nonce: nonce
			}).catch(() => false);
		} catch (e) {
			try {
				const lChanManager = member.guild.channels.cache.get(lChan) as BaseGuildTextChannel;
				await lChanManager.send({
					content: client.func.method.generateCustomMessagePreview(
						data.event_goodbye_default,
						{
							user: member.user,
							guild: member.guild,
							guildLocal: guildLocal,
						}
					),
					enforceNonce: true,
					nonce: nonce
				}).catch(() => { });
			} catch {
			}
		}
	},
};