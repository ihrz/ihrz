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
	Client,
	PermissionsBitField,
	ChannelType,
	Message,
	GuildTextBasedChannel,
	ClientUser,
	SnowflakeUtil
} from "discord.js";

import { parseMessageCommand } from "../interaction/messageCommandHandler.js";
import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (!message.guild || message.author.bot || !message.channel) return;

		const lang = await client.func.getLanguageData(message.guild.id);
		const guildLocal =
			(await client.db.get(`${message.guild.id}.GUILD.LANG.lang`)) ||
			"en-US";

		if ((await parseMessageCommand(client, message)).success) return;

		if (
			!message.guild ||
			message.author.bot ||
			message.channel.type !== ChannelType.GuildText
		)
			return;

		const baseData = (await client.db.get(
			`${message.guild.id}.USER.${message.author.id}.XP_LEVELING`
		)) as DatabaseStructure.XpLevelingUserSchema;
		const ranksConfig = (await client.db.get(
			`${message.guild.id}.GUILD.XP_LEVELING`
		)) as DatabaseStructure.DbGuildObject["XP_LEVELING"];
		const xpTurn = ranksConfig?.disable;

		if (
			xpTurn === "disable" ||
			ranksConfig?.bypassChannels?.includes(message.channelId)
		)
			return;

		const level = baseData?.level || 1;
		const randomNumber = Math.floor(Math.random() * 3) + 35;

		await client.db.add(
			`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`,
			randomNumber
		);
		await client.db.add(
			`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xptotal`,
			randomNumber
		);

		if (level * 500 < baseData?.xp!) {
			await client.db.add(
				`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`,
				1
			);
			await client.func.method.addCoins(
				message.member!,
				randomNumber *
					(await client.func.economyHelper.getMemberBoost(
						message.member!
					))
			);
			await client.db.sub(
				`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`,
				level * 500
			);

			const newLevel = await client.db.get(
				`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`
			);

			// Check if the rank roles configuration exists
			if (ranksConfig?.ranksRoles) {
				// Find the appropriate role for the user's new level
				const roleToAssign = Object.entries(ranksConfig.ranksRoles)
					// Filter roles that are less than or equal to the user's level
					.filter(([roleLevel]) => parseInt(roleLevel) <= newLevel)
					// Sort them from highest to lowest level
					.sort(
						([levelA], [levelB]) =>
							parseInt(levelB) - parseInt(levelA)
					)?.[0]?.[1]; // Get the highest applicable role

				// If a role to assign was found
				if (roleToAssign) {
					try {
						// Fetch the member from the guild using the message author
						const member =
							message.guild.members.cache.get(
								message.author.id
							) ||
							(await message.guild.members.fetch(
								message.author.id
							));

						// Get the member's current roles
						const currentRoles = member.roles.cache;

						// Check if the member already has the correct role
						const hasCorrectRole = currentRoles.has(roleToAssign);

						// Identify old rank roles that should be removed (excluding the correct one)
						const rolesToRemove = Object.values(
							ranksConfig.ranksRoles
						).filter(
							(role) =>
								currentRoles.has(role) && role !== roleToAssign
						);

						// Remove outdated rank roles, if any
						if (rolesToRemove.length > 0) {
							await member.roles.remove(
								rolesToRemove,
								"Removal of old rank roles"
							);
						}

						// Assign the new rank role only if the member doesn't already have it
						if (!hasCorrectRole) {
							await member.roles.add(
								roleToAssign,
								"Rank Role Assignment"
							);
						}
					} catch {
						// Silently catch errors (e.g., missing permissions or failed fetch)
					}
				}
			}

			if (
				xpTurn === false ||
				!message.channel
					.permissionsFor(client.user as ClientUser)
					?.has(PermissionsBitField.Flags.SendMessages)
			)
				return;

			const xpChan = ranksConfig?.xpchannels!;
			const MsgChannel = message.guild.channels.cache.get(
				xpChan
			) as GuildTextBasedChannel | null;

			let msg = client.func.method.generateCustomMessagePreview(
				ranksConfig?.message || lang.event_xp_level_earn,
				{
					user: message.author,
					guild: message.guild,
					guildLocal: guildLocal,
					ranks: {
						level: newLevel
					}
				}
			);

			if (!xpChan) {
				// if newLevel is 1, then it's a new user
				// so we inform them about the leveling system and how it works
				// and we also inform them about the rank roles
				// and how the ranks module is disableable
				// do it only 1/2 times

				if (newLevel === 1 && Math.random() < 0.5) {
					msg += lang.event_xp_level_additional_info.replace(
						"${client.iHorizon_Emojis.VC_OpenChat}",
						client.iHorizon_Emojis.VC_OpenChat
					);
				}

				client.func.method.channelSend(message, {
					content: msg
				});
				return;
			}

			if (!MsgChannel) return;

			MsgChannel.send({
				content: msg
			});
			return;
		}
	}
};
