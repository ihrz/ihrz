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

import { BaseGuildTextChannel, Client, DMChannel, Message } from 'discord.js';
import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (!message.guild || message.author.bot || !message.channel) return;

		// Handles all messages and checks whether they contain a resolvable link
		if (
			message.author.bot
			|| await client.db.get(`${message.guildId}.UTILS.git_lines`) === false
		) {
			return;
		}

		let { botMsg, toDelete, lang } = await client.githubLinesManager.handleMessage(message);

		if (botMsg !== null) {
			if (!await client.db.has(`${message.guildId}.UTILS.git_lines`) && (Math.floor(Math.random() * 8) === 0)) {
				botMsg += lang.git_lines_borred_warning.replace("${client.iHorizon_Emojis.VC_OpenChat}", client.iHorizon_Emojis.VC_OpenChat);
			}

			const sentmsg = await (message.channel as BaseGuildTextChannel).send(botMsg);

			if (toDelete) {
				setTimeout(() => sentmsg.delete().catch(() => null), 5000); // errors ignored - someone else deleted
			} else if (
				sentmsg.channel.partial ||
				sentmsg.channel instanceof DMChannel ||
				(sentmsg.guild?.members.me && sentmsg.channel.permissionsFor(sentmsg.guild.members.me).has("AddReactions"))
			) {
				const botReaction = await sentmsg.react("🗑️");

				const collector = sentmsg.createReactionCollector({
					filter: (reaction, user): boolean => reaction.emoji.name === "🗑️" && user.id === message.author.id,
					time: 15_000
				});
				collector.on("collect", () => {
					sentmsg.delete().catch(() => null); // error ignored - someone else deleted
				});
				collector.on("end", () => {
					botReaction.users.remove().catch(() => null); // error ignored - someone else removed
				});
			}
		}
	},
};