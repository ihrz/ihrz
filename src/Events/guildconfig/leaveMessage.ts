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

import { BaseGuildTextChannel, Client, GuildMember } from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import resolveWelcomerEmbed, {
	WelcomerEmbedVariables
} from "../../core/functions/welcomerEmbed.js";

const GOODBYE_ACCENT_COLOR = 0xed4245;
const GOODBYE_AVATAR_ATTACHMENT_NAME = "goodbye-avatar.png";

export const event: BotEvent = {
	name: "guildMemberRemove",
	run: async (client: Client, member: GuildMember) => {
		const data = await client.func.getLanguageData(member.guild.id);
		const guildLocal =
			(await client.db.get(`${member.guild.id}.GUILD.LANG.lang`)) ||
			"en-US";
		const base = await client.db.get(
			`${member.guild.id}.USER.${member.user.id}.INVITES.BY`
		);
		const lChan = await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.leave`
		);
		const leaveMessage = await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`
		);
		const leaveEmbedId = (await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.leaveEmbedId`
		)) as string | null | undefined;
		const leaveTextEnabled = (await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.leaveTextEnabled`
		)) as boolean | undefined;
		const leaveComponentsEnabled = (await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.leaveComponentsEnabled`
		)) as boolean | undefined;

		const textEnabled = leaveTextEnabled !== false;
		const componentsEnabled = leaveComponentsEnabled !== false;

		if (!lChan || !member.guild.channels.cache.get(lChan)) return;

		async function sendGoodbye(
			channel: BaseGuildTextChannel,
			msg: string,
			variables: WelcomerEmbedVariables
		): Promise<void> {
			const embed = await resolveWelcomerEmbed(leaveEmbedId, variables);
			await member.client.func
				.welcomerMessage(channel, member, {
					message: textEnabled ? msg : null,
					embed,
					useComponents: embed ? false : componentsEnabled,
					accentColor: GOODBYE_ACCENT_COLOR,
					avatarAttachmentName: GOODBYE_AVATAR_ATTACHMENT_NAME
				})
				.catch(() => null);
		}

		let messageContent = "";
		let variables: WelcomerEmbedVariables = {
			user: member.user,
			guild: member.guild,
			guildLocal: guildLocal
		};
		if (base?.inviter) {
			const inviter =
				client.users.cache.get(base.inviter) ||
				(await client.users.fetch(base.inviter));
			const inviterStats = (await client.db.get(
				`${member.guild.id}.USER.${inviter.id}.INVITES`
			)) as DatabaseStructure.InvitesUserData;

			if (inviterStats) {
				if (inviterStats?.invites && inviterStats.invites >= 1) {
					await client.db.sub(
						`${member.guild.id}.USER.${inviter.id}.INVITES.invites`,
						1
					);
				}
				await client.db.add(
					`${member.guild.id}.USER.${inviter.id}.INVITES.leaves`,
					1
				);
			}

			const invitesAmount = await client.db.get(
				`${member.guild.id}.USER.${inviter.id}.INVITES.invites`
			);
			variables = {
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
			};
			messageContent = client.func.method.generateCustomMessagePreview(
				leaveMessage || data.event_goodbye_inviter,
				variables
			);
		} else {
			messageContent = client.func.method.generateCustomMessagePreview(
				leaveMessage || data.event_goodbye_default,
				variables
			);
		}

		try {
			const lChanManager = member.guild.channels.cache.get(
				lChan
			) as BaseGuildTextChannel;
			await sendGoodbye(lChanManager, messageContent, variables);
		} catch (e) {
			try {
				const lChanManager = member.guild.channels.cache.get(
					lChan
				) as BaseGuildTextChannel;
				const fallbackVariables: WelcomerEmbedVariables = {
					user: member.user,
					guild: member.guild,
					guildLocal: guildLocal
				};
				await sendGoodbye(
					lChanManager,
					client.func.method.generateCustomMessagePreview(
						data.event_goodbye_default,
						fallbackVariables
					),
					fallbackVariables
				);
			} catch {}
		}
	}
};
