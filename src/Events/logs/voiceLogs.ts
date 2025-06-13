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

import { EmbedBuilder, Client, VoiceState, BaseGuildTextChannel } from 'discord.js';

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {

		const data = await client.func.getLanguageData(oldState.guild.id);

		if (!oldState || !oldState.guild) return;

		const someinfo = await client.db.get(`${oldState.guild.id}.GUILD.SERVER_LOGS.voice`);
		if (!someinfo) return;

		const Msgchannel = oldState.guild.channels.cache.get(someinfo);
		if (!Msgchannel) return;

		const Ouser = oldState.id
		const OchannelID = oldState.channelId
		const Ostatus = { selfDeaf: oldState.selfDeaf, selfMute: oldState.selfMute };

		const user = newState.id
		const channelID = newState.channelId
		const status = { selfDeaf: newState.selfDeaf, selfMute: newState.selfMute };

		const targetUser = await client.users.fetch(user);

		if (targetUser.id === client.user?.id) return;

		const iconURL = targetUser.displayAvatarURL();

		let logsEmbed = new EmbedBuilder()
			.setColor(await client.db.get(`${newState.guild?.id}.GUILD.GUILD_CONFIG.embed_color.audits-logs`) || "#000000")
			.setAuthor({ name: targetUser.username, iconURL: iconURL })
			.setTimestamp();

		// JOIN/LEAVE
		if (user && !channelID) {
			logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_description
				.replace("${targetUser.id}", targetUser.id)
				.replace("${OchannelID}", OchannelID?.toString()!)
			);
			await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
			return;
		};

		if (Ouser && !OchannelID) {
			logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_2_description
				.replace("${targetUser.id}", targetUser.id)
				.replace("${channelID}", channelID?.toString()!)
			);
			await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
			return;
		};

		// MUTE CASQUE
		if (!Ostatus.selfDeaf && status.selfDeaf) {
			logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_3_description
				.replace("${targetUser.id}", targetUser.id)
				.replace("${channelID}", channelID?.toString()!)
			);
			await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
			return;
		};

		if (Ostatus.selfDeaf && !status.selfDeaf) {
			logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_4_description
				.replace("${targetUser.id}", targetUser.id)
				.replace("${channelID}", channelID?.toString()!)
			);
			await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
			return;
		};

		// MUTE MICRO
		if (!Ostatus.selfMute && status.selfMute) {
			logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_5_description
				.replace("${targetUser.id}", targetUser.id)
				.replace("${channelID}", channelID?.toString()!)
			);
			await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
			return;
		};

		if (Ostatus.selfMute && !status.selfMute) {
			logsEmbed.setDescription(data.event_srvLogs_voiceStateUpdate_6_description
				.replace("${targetUser.id}", targetUser.id)
				.replace("${channelID}", channelID?.toString()!)
			);
			await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed] }).catch(() => { });
			return;
		};
	},
};