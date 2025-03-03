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

import { Client, PermissionsBitField, ChannelType, Message, GuildTextBasedChannel, ClientUser, SnowflakeUtil } from 'discord.js';

import { parseMessageCommand } from '../interaction/messageCommandHandler.js';
import { LanguageData } from '../../../types/languageData.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { getMemberBoost } from '../../Interaction/HybridCommands/economy/economy.js';

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		/**
		 * Why doing this?
		 * On iHorizon Production, we have some ~problems~ 👎
		 * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
		 */
		const nonce = SnowflakeUtil.generate().toString();

		if (!message.guild || message.author.bot || !message.channel) return;

		let lang = await client.func.getLanguageData(message.guild.id);
		let guildLocal = await client.db.get(`${message.guild.id}.GUILD.LANG.lang`) || "en-US";

		if ((await parseMessageCommand(client, message)).success) return;

		if (!message.guild || message.author.bot || message.channel.type !== ChannelType.GuildText) return;

		var baseData = await client.db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING`) as DatabaseStructure.XpLevelingUserSchema;
		var ranksConfig = await client.db.get(`${message.guild.id}.GUILD.XP_LEVELING`) as DatabaseStructure.DbGuildObject['XP_LEVELING'];
		var xpTurn = ranksConfig?.disable;

		if (xpTurn === 'disable' || ranksConfig?.bypassChannels?.includes(message.channelId)) return;

		var level = baseData?.level || 1;
		var randomNumber = Math.floor(Math.random() * 3) + 35;

		await client.db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, randomNumber);
		await client.db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xptotal`, randomNumber);

		if ((level * 500) < baseData?.xp!) {
			await client.db.add(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`, 1);
			await client.func.method.addCoins(message.member!, randomNumber * await getMemberBoost(message.member!))
			await client.db.sub(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, (level * 500));

			let newLevel = await client.db.get(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.level`);

			if (ranksConfig?.ranksRoles) {
				const roleToAssign = Object.entries(ranksConfig.ranksRoles)
					.filter(([roleLevel]) => parseInt(roleLevel) <= newLevel)
					.sort(([levelA], [levelB]) => parseInt(levelB) - parseInt(levelA))[0]?.[1];

				if (roleToAssign) {
					try {
						const member = await message.guild.members.fetch(message.author.id);
						const rolesToRemove = Object.values(ranksConfig.ranksRoles).filter(role => member.roles.cache.has(role));

						if (rolesToRemove.length > 0) {
							await member.roles.remove(rolesToRemove, "Removal of old rank roles");
						}

						await member.roles.add(roleToAssign, "Rank Role Assignment");
					} catch {
					}
				}
			}

			if (xpTurn === false
				|| !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.SendMessages)) return;

			let xpChan = ranksConfig?.xpchannels!;
			let MsgChannel = message.guild.channels.cache.get(xpChan) as GuildTextBasedChannel | null;

			let msg = client.func.method.generateCustomMessagePreview(ranksConfig?.message || lang.event_xp_level_earn,
				{
					user: message.author,
					guild: message.guild,
					guildLocal: guildLocal,
					ranks: {
						level: newLevel
					}
				},
			);

			if (!xpChan) {
				// if newLevel is 1, then it's a new user
				// so we inform them about the leveling system and how it works
				// and we also inform them about the rank roles
				// and how the ranks module is disableable
				// do it only 1/2 times

				if (newLevel === 1 && Math.random() < 0.5) {
					msg += lang.event_xp_level_additional_info
						.replace("${client.iHorizon_Emojis.vc.OpenChat}", client.iHorizon_Emojis.vc.OpenChat)
				}

				client.func.method.channelSend(message, {
					content: msg,
					enforceNonce: true,
					nonce: nonce
				})
				return;
			}

			if (!MsgChannel) return;

			MsgChannel.send({
				content: msg,
				enforceNonce: true,
				nonce: nonce
			});
			return;
		}
	},
};