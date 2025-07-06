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

import { AuditLogEvent, BaseGuildTextChannel, Client, EmbedBuilder, GuildChannel, PermissionFlagsBits } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { LanguageData } from '../../../types/languageData.js';

function getDiff(
	oldChannel: GuildChannel,
	newChannel: GuildChannel,
	lang: LanguageData
): string {
	let after = "";

	if (oldChannel.name !== newChannel.name) {
		after += `🎫 Nom: ${newChannel.name}\n`;
	}

	const oldPerms = oldChannel.permissionOverwrites.cache;
	const newPerms = newChannel.permissionOverwrites.cache;

	oldPerms.forEach((oldPerm, id) => {
		const newPerm = newPerms.get(id);

		if (newPerm) {
			const target = newPerm.type === 0 ? `<@&${id}>` : `<@${id}>`;

			const removedPerms = oldPerm.allow.toArray().filter(perm => !newPerm.allow.has(perm));
			removedPerms.forEach(perm => {
				after += lang.event_srvLogs_channelUpdate_disabled_for
					.replace("${perm}", perm)
					.replace("${target}", target);
			});

			const addedPerms = newPerm.allow.toArray().filter(perm => !oldPerm.allow.has(perm));
			addedPerms.forEach(perm => {
				after += lang.event_srvLogs_channelUpdate_enabled_for
					.replace("${perm}", perm)
					.replace("${target}", target);
			});

			const removedDeniedPerms = oldPerm.deny.toArray().filter(perm => !newPerm.deny.has(perm));
			removedDeniedPerms.forEach(perm => {
				after += lang.event_srvLogs_channelUpdate_allowed_for
					.replace("${perm}", perm)
					.replace("${target}", target);
			});

			const addedDeniedPerms = newPerm.deny.toArray().filter(perm => !oldPerm.deny.has(perm));
			addedDeniedPerms.forEach(perm => {
				after += lang.event_srvLogs_channelUpdate_unallowed_for
					.replace("${perm}", perm)
					.replace("${target}", target);
			});
		}
	});

	newPerms.forEach((newPerm, id) => {
		if (!oldPerms.has(id)) {
			const target = newPerm.type === 0 ? `<@&${id}>` : `<@${id}>`;
			after += `🛡 Permissions ajoutées pour ${target}:\n`;
			newPerm.allow.toArray().forEach(perm => {
				after += `-    ✅ ${perm}\n`;
			});
			newPerm.deny.toArray().forEach(perm => {
				after += `-    ❌ ${perm}\n`;
			});
		}
	});

	return after;
}

export const event: BotEvent = {
	name: "channelUpdate",
	run: async (client: Client, oldChannel: GuildChannel, newChannel: GuildChannel) => {

		const lang = await client.func.getLanguageData(oldChannel.guildId);

		if (!oldChannel || !oldChannel?.guild) return;

		if (!oldChannel.guild.members.me?.permissions.has([
			PermissionFlagsBits.Administrator
		])) return;

		const fetchedLogs = await newChannel.guild.fetchAuditLogs({
			type: AuditLogEvent.ChannelUpdate,
			limit: 1,
		});

		if (oldChannel.position !== newChannel.position) return;

		const firstEntry = fetchedLogs.entries.first();

		// check if the author is the bot
		if (firstEntry?.executor?.id === client.user?.id) return;

		const someinfo = await client.db.get(`${oldChannel.guildId}.GUILD.SERVER_LOGS.channel`);
		if (!someinfo) return;

		const Msgchannel = oldChannel.guild.channels.cache.get(someinfo);
		if (!Msgchannel) return;

		let changes = getDiff(oldChannel, newChannel, lang);

		if (changes === "") {
			return;
		}

		if (changes.length > 1024) {
			changes = changes.substring(0, 1021) + "...";
		}

		const icon = firstEntry?.executor?.displayAvatarURL();

		const logsEmbed = new EmbedBuilder()
			.setColor(await client.db.get(`${oldChannel.guild.id}.GUILD.GUILD_CONFIG.embed_color.audits-logs`) || "#000000")
			.setAuthor({ name: firstEntry?.executor?.username || lang.var_unknown, iconURL: icon })
			.setDescription(`${newChannel.toString()} are updated`)
			.addFields({ name: lang.event_srvLogs_messageUpdate_footer_2, value: changes });

		logsEmbed.setTimestamp();

		await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
	},
};
