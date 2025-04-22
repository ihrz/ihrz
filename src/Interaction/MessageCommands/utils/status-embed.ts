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

import {
	BaseGuildTextChannel,
	Client,
	EmbedBuilder,
	Message,
	time,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


export const command: Command = {
	name: 'status-embed',
	aliases: [],

	description: 'Make a status embed about iHorizon',
	description_localizations: {
		"fr": "Créer un embed par rapport à iHorizon"
	},

	thinking: false,
	category: 'owner',
	type: "PREFIX_IHORIZON_COMMAND",

	permission: null,
	run: async (client: Client, message: Message<true>, lang: LanguageData, options?: string[]) => {
		if (client.owners.includes(message.author.id)) {
			const online = client.iHorizon_Emojis.Online;
			const down = client.iHorizon_Emojis.DND;
			const evaluating = client.iHorizon_Emojis.Invisible;

			const embed = new EmbedBuilder()
				.setColor("#ff40c4")
				.setTitle("iHorizon Status Panel")
				.setDescription("This embed refresh every 1 minutes for showing the latest informations about iHorizon infrastructure")
				.setFooter(await client.func.displayBotName.footerBuilder(message))
				.setFields(
					{
						name: "iHorizon (Public Bot)",
						value: online,
						inline: false
					},
					{
						name: "HorizonGateway (Public/Private API)",
						value: online,
						inline: false
					},
					{
						name: `ClusterManager ${client.config.core.cluster.map((x, _) => "#" + _)}`,
						value: online,
						inline: false
					},
					{
						name: `Lavalink (Music Player)`,
						value: online,
						inline: false
					},
					{
						name: `iHorizon Website`,
						value: online,
						inline: false
					}
				)
				;

			let channelId = message.channelId;
			let content = `**Last update:** ${time(new Date(), "R")}`

			let res = await client.func.method.channelSend(message.channel as BaseGuildTextChannel, {
				content,
				embeds: [embed]
			});

			await client.db.set(`MISC.statusEmbed.${message.guildId}`, {
				message_id: res.id,
				guild_id: res.guildId,
				channel_id: channelId
			});

		} else return;
	},
};
