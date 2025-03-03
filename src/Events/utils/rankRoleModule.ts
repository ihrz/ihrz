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

import { Client, EmbedBuilder, PermissionsBitField, ChannelType, Message, ClientUser, SnowflakeUtil } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { guildPrefix } from '../../core/functions/prefix.js';

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {

		if (!message.guild || message.author.bot || !message.channel) return;

		let lang = await client.func.getLanguageData(message.guild.id);

		if (!message.guild || !message.channel || message.channel.type !== ChannelType.GuildText || message.author.bot
			|| message.author.id === client.user?.id || !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.SendMessages)
			|| !message.channel.permissionsFor((client.user as ClientUser))?.has(PermissionsBitField.Flags.ManageRoles) || message.content !== `<@${client.user?.id}>`) return;

		let dbGet = await client.db.get(`${message.guild.id}.GUILD.RANK_ROLES`) as DatabaseStructure.DbGuildObject['RANK_ROLES'];
		var prefix = (await guildPrefix(client, message.guildId!)).string;
		let text = lang.ping_bot_show_info_msg
			.replace("${prefix}", prefix)
			.replace("${message.author.toString()}", message.author.toString())
			.replace("${client.iHorizon_Emojis.badge.Slash_Bot}", client.iHorizon_Emojis.badge.Slash_Bot)
			;

		if (!dbGet || !dbGet.roles) {
			if (await client.func.helper.coolDown(message, "ping_bot", 7000)) {
				return;
			};
			return await client.func.method.interactionSend(message, { content: text });
		}
		let fetch = message.guild.roles.cache.find((role) => role.id === dbGet.roles);

		/**
		 * Why doing this?
		 * On iHorizon Production, we have some ~problems~ 👎
		 * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
		 */
		const nonce = SnowflakeUtil.generate().toString();

		if (fetch) {
			let target = message.guild.members.cache.get(message.author.id);
			if (target?.roles.cache.has(fetch.id)) return;

			if (dbGet.nicknames) {
				let includeUsername = message.author.username.includes(dbGet.nicknames);
				let includeGlobalname = message.author.globalName ? message.author.globalName.includes(dbGet.nicknames) : false;

				if (!includeUsername && !includeGlobalname) return;
			}

			let embed = new EmbedBuilder()
				.setDescription(lang.event_rank_role
					.replace("${message.author.id}", message.author.id)
					.replace("${fetch.id}", fetch.id)
				)
				.setFooter(await client.func.displayBotName.footerBuilder(message))
				.setTimestamp();

			message.member?.roles.add(fetch).catch(() => { });
			client.func.method.channelSend(message, {
				embeds: [embed],
				files: [await client.func.displayBotName.footerAttachmentBuilder(message)],
				enforceNonce: true,
				nonce
			}).catch(() => { });
		};
	},
};
