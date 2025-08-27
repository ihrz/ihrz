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

import { SnowflakeUtil, Client, EmbedBuilder, GuildMember, GuildTextBasedChannel } from 'discord.js';

import logger from "../../core/logger.js";
import captcha from "../../core/captcha.js";

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {
		const baseData = await client.db.get(`${member.guild.id}.SECURITY`);
		if (!baseData || baseData?.disable === true) return;

		const data = await client.func.getLanguageData(member.guild.id);
		const channel = member.guild.channels.cache.get(baseData?.channel);
		if (!channel) return;
		const { code, image } = await captcha()

		const memberJoinDate = member.joinedAt;

		const embed = new EmbedBuilder()
			.setColor('#c4001f')
			.setTimestamp()
			.setImage("attachment://captcha.png")
			.setDescription(data.event_security.replace('${member}', member.toString()))
			;

		/**
		 * Why doing this?
		 * On iHorizon Production, we have some ~problems~ 👎
		 * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
		 */
		const nonce = SnowflakeUtil.generate().toString();

		(channel as GuildTextBasedChannel).send({
			content: member.toString(),
			embeds: [embed],
			files: [
				{ name: "captcha.png", attachment: image },
			], enforceNonce: true, nonce: nonce
		}).then(async (msg) => {
			const collector = msg.channel.createMessageCollector({
				filter: (m) => m.author.id === member.id,
				time: (60_00 * 2 + 30_000)
			});

			let passedtest = false;

			collector.on('collect', async (m) => {
				collector.stop();
				await m.delete();

				if (code === m.content) {
					await member.roles.add(baseData?.role, "[Security] Module").catch(() => { })
					await member.roles.remove(baseData?.role2, "[Security] Module").catch(() => { })
					await msg.delete().catch(() => { })

					passedtest = true;
					return;
				} else {
					await msg.delete().catch(() => { })
					await member.kick("Security Process failed").catch(() => { })
					return;
				}
			});

			collector.on('end', async () => {
				if (passedtest) return;

				if (!member.joinedAt && memberJoinDate === member.joinedAt) {
					await member.kick("Security Process failed").catch(() => { })
				}

				await msg.delete().catch(() => { })
			});

		}).catch((error: any) => {
			logger.err(error);
		});
	},
};