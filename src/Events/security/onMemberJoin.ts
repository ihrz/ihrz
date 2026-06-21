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
	SnowflakeUtil,
	Client,
	EmbedBuilder,
	GuildMember,
	GuildTextBasedChannel,
	Message
} from "discord.js";

import logger from "../../core/logger.js";
import captcha from "../../core/captcha.js";

import { BotEvent } from "../../../types/event.js";

const MAX_ATTEMPTS = 3;
const COLLECTOR_TIMEOUT_MS = 60_000 * 2 + 30_000; // 2 min 30 s

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {
		if (!member.guild) return;

		const baseData = await client.db.get(`${member.guild.id}.SECURITY`);
		if (!baseData || baseData?.disable === true) return;

		const data = await client.func.getLanguageData(member.guild.id);
		const channel = member.guild.channels.cache.get(baseData?.channel);
		if (!channel) return;
		const { code, image } = await captcha();
		const memberJoinDate = member.joinedAt;
		const expiresAt = Math.floor(
			(Date.now() + COLLECTOR_TIMEOUT_MS) / 1000
		);

		const buildContent = (attemptsLeft: number) =>
			[
				data.event_security.replace("${member}", member.toString()),
				"",
				data.event_security_expiry
					.replace("${timestamp}", `<t:${expiresAt}:R>`)
					.replace("${attempts}", attemptsLeft.toString())
					.replace("{emoji}", client.iHorizon_Emojis.Schedule),
				`-# ${data.event_security_footer}`
			].join("\n");

		const nonce = SnowflakeUtil.generate().toString();
		let msg: Message;

		try {
			msg = await (channel as GuildTextBasedChannel).send({
				content: buildContent(MAX_ATTEMPTS),
				files: [{ name: "captcha.png", attachment: image }],
				enforceNonce: true,
				nonce
			});
		} catch (error: any) {
			console.log(error);
			return;
		}

		let attemptsLeft = MAX_ATTEMPTS;
		let passed = false;

		const collector = (
			msg.channel as GuildTextBasedChannel
		).createMessageCollector({
			filter: (m: Message) => m.author.id === member.id,
			time: COLLECTOR_TIMEOUT_MS
		});

		collector.on("collect", async (m: Message) => {
			await m.delete().catch(() => {});

			if (m.content === code) {
				passed = true;
				collector.stop("passed");
				await member.roles
					.add(baseData?.role, "[Security] Module")
					.catch(() => {});
				await member.roles
					.remove(baseData?.role2, "[Security] Module")
					.catch(() => {});
				await msg.delete().catch(() => {});
				return;
			}

			attemptsLeft--;

			if (attemptsLeft <= 0) {
				collector.stop("failed");
				return;
			}

			await msg
				.edit({ content: buildContent(attemptsLeft) })
				.catch(() => {});
		});

		collector.on("end", async () => {
			if (passed) return;

			if (!member.joinedAt || memberJoinDate === member.joinedAt) {
				await member
					.kick(data.event_security_kick_reason)
					.catch(() => {});
			}

			await msg.delete().catch(() => {});
		});
	}
};
